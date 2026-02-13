import { Ride, RideStatus } from '../models/Ride.js';
import { User } from '../models/User.js';
import { DriverPoolService } from './driverPool.service.js';
import { PushNotificationService } from './pushNotification.service.js';
import { getIO } from './socketManager.service.js';

// Store active matching timeout references
const matchingTimeouts = new Map<string, NodeJS.Timeout>();

// Store ride rooms for active rides
const rideRooms = new Map<string, { driverId: string; clientId: string }>();

interface RideRequestData {
  clientId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  vehicleType: 'moto' | 'car' | 'truck' | 'van';
  pricing: {
    basePrice: number;
    distancePrice: number;
    totalPrice: number;
  };
  distance: {
    clientToDestination: number;
  };
  eta: {
    clientToDestination: number;
  };
}

const MATCHING_TIMEOUT = 15000; // 15 seconds per driver
const MAX_MATCHING_DRIVERS = 5; // Try up to 5 drivers

export class RideMatchingService {
  /**
   * Create a new ride request and start matching
   */
  static async createRideRequest(
    rideId: string,
    data: RideRequestData
  ): Promise<void> {
    // Create ride in database
    const ride = new Ride({
      rideId,
      clientId: data.clientId,
      status: 'searching',
      pickupLocation: data.pickupLocation,
      destinationLocation: data.destinationLocation,
      vehicleType: data.vehicleType,
      pricing: {
        ...data.pricing,
        currency: 'DZD',
      },
      distance: data.distance,
      eta: data.eta,
      matchedDrivers: [],
      currentDriverIndex: 0,
    });

    await ride.save();

    // Notify client that search has started
    const io = getIO();
    io.to(`client:${data.clientId}`).emit('ride_searching', {
      rideId,
      status: 'searching',
    });

    // Start matching process
    await this.matchDriver(rideId);
  }

  /**
   * Match a driver to the ride (sequential matching)
   */
  private static async matchDriver(rideId: string): Promise<void> {
    const ride = await Ride.findOne({ rideId });
    if (!ride || ride.status !== 'searching') {
      return;
    }

    // Get available drivers
    const availableDrivers = DriverPoolService.getAvailableDrivers(
      ride.pickupLocation.lat,
      ride.pickupLocation.lng,
      ride.vehicleType
    );

    // Filter out already matched drivers
    const unmatchedDrivers = availableDrivers.filter(
      (d) => !ride.matchedDrivers?.includes(d.driverId)
    );

    console.log(`🎯 Matching ride ${rideId}: ${unmatchedDrivers.length} unmatched drivers available`);
    console.log(`📍 Pickup: ${ride.pickupLocation.lat}, ${ride.pickupLocation.lng}`);
    console.log(`🚗 Vehicle type needed: ${ride.vehicleType}`);

    // If no more drivers available
    if (unmatchedDrivers.length === 0 || (ride.currentDriverIndex ?? 0) >= MAX_MATCHING_DRIVERS) {
      console.log(`❌ No drivers available for ride ${rideId}`);
      await this.handleNoDriverFound(rideId);
      return;
    }

    // Get next closest driver
    const driver = unmatchedDrivers[0];
    const driverId = driver.driverId;

    // Update ride with matched driver
    ride.matchedDrivers = [...(ride.matchedDrivers || []), driverId];
    ride.currentDriverIndex = (ride.currentDriverIndex ?? 0) + 1;
    await ride.save();

    // Get driver's socket
    const io = getIO();
    const driverSocketId = DriverPoolService.getSocketId(driverId);

    // Calculate driver-specific ETA
    const driverLocation = driver.location;
    const distanceToPickup = this.calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      ride.pickupLocation.lat,
      ride.pickupLocation.lng
    );
    const etaToPickup = Math.ceil((distanceToPickup / 30) * 60); // Rough estimate: 30km/h avg

    // Prepare ride request data for driver
    const rideRequestData = {
      rideId: ride.rideId,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      distance: {
        driverToClient: parseFloat(distanceToPickup.toFixed(1)),
        clientToDestination: ride.distance.clientToDestination,
      },
      eta: {
        driverToClient: etaToPickup,
        clientToDestination: ride.eta.clientToDestination,
      },
      pricing: ride.pricing,
      vehicleType: ride.vehicleType,
      timeout: MATCHING_TIMEOUT / 1000, // seconds
    };

    // Send request to driver via socket if connected
    let socketDelivered = false;
    if (driverSocketId) {
      io.to(driverSocketId).emit('ride_request', rideRequestData);
      socketDelivered = true;
      console.log(`📤 Ride request sent to driver ${driverId} via socket`);
    }

    // Send push notification if socket not connected or as backup
    if (!socketDelivered || !driver.isOnline) {
      await PushNotificationService.sendToDriver(driverId, {
        title: 'New Ride Request',
        body: 'You have a new nearby ride request.',
        data: { rideId, type: 'ride_request' },
      });
      console.log(`📱 Push notification sent to driver ${driverId}`);
    }

    // Set timeout for driver response
    const timeoutId = setTimeout(async () => {
      await this.handleDriverTimeout(rideId, driverId);
    }, MATCHING_TIMEOUT);

    matchingTimeouts.set(rideId, timeoutId);
  }

  /**
   * Handle driver accepting a ride
   */
  static async handleDriverAccept(
    rideId: string,
    driverId: string
  ): Promise<{ success: boolean; message?: string }> {
    // Clear any pending timeout
    const timeoutId = matchingTimeouts.get(rideId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      matchingTimeouts.delete(rideId);
    }

    // Atomically update ride status to prevent race conditions
    const ride = await Ride.findOneAndUpdate(
      {
        rideId,
        status: 'searching', // Only accept if still searching
      },
      {
        $set: {
          status: 'accepted',
          driverId: driverId,
          acceptedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!ride) {
      // Ride was already assigned or cancelled
      return { success: false, message: 'Ride no longer available' };
    }

    // Mark driver as busy
    await DriverPoolService.markBusy(driverId, true);

    // Create ride room
    rideRooms.set(rideId, {
      driverId,
      clientId: ride.clientId.toString(),
    });

    const io = getIO();

    // Join driver and client to ride room
    const driverSocketId = DriverPoolService.getSocketId(driverId);
    if (driverSocketId) {
      io.sockets.sockets.get(driverSocketId)?.join(`ride:${rideId}`);
    }

    // Notify both parties
    io.to(`ride:${rideId}`).emit('ride_assigned', {
      rideId,
      status: 'accepted',
      driverId,
      clientId: ride.clientId,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      pricing: ride.pricing,
    });

    // Get client phone number for driver
    const client = await User.findById(ride.clientId).select('phoneNumber');
    const clientPhone = client?.phoneNumber || '';

    // Get driver phone number for client
    const driver = await User.findById(driverId).select('phoneNumber');
    const driverPhone = driver?.phoneNumber || '';

    // Notify client specifically (both old client-specific room and new ride room)
    console.log(`📤 Notifying client ${ride.clientId} about driver found`);
    io.to(`client:${ride.clientId}`).emit('driver_found', {
      rideId,
      driverId,
      driverPhone,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      pricing: ride.pricing,
      eta: ride.eta,
      distance: ride.distance,
      message: 'Driver found and on the way',
    });
    io.to(`ride:${rideId}`).emit('driver_found', {
      rideId,
      driverId,
      driverPhone,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      pricing: ride.pricing,
      eta: ride.eta,
      distance: ride.distance,
      message: 'Driver found and on the way',
    });

    // Notify driver with client phone
    console.log(`📤 Notifying driver ${driverId} about ride accepted`);
    io.to(`driver:${driverId}`).emit('ride_accepted_confirmed', {
      rideId,
      clientId: ride.clientId,
      clientPhone,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      pricing: ride.pricing,
      eta: ride.eta,
      distance: ride.distance,
      status: 'accepted',
    });

    // Send push to client if not connected
    const clientSocketCount = await io.in(`client:${ride.clientId}`).allSockets();
    if (clientSocketCount.size === 0) {
      await PushNotificationService.sendToClient(ride.clientId.toString(), {
        title: 'Driver Found',
        body: 'Your driver is on the way.',
        data: { rideId, type: 'driver_found' },
      });
    }

    console.log(`✅ Ride ${rideId} assigned to driver ${driverId}`);
    return { success: true };
  }

  /**
   * Handle driver rejecting a ride
   */
  static async handleDriverReject(
    rideId: string,
    driverId: string
  ): Promise<void> {
    // Clear timeout
    const timeoutId = matchingTimeouts.get(rideId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      matchingTimeouts.delete(rideId);
    }

    const ride = await Ride.findOne({ rideId });
    if (!ride || ride.status !== 'searching') {
      return;
    }

    console.log(`❌ Driver ${driverId} rejected ride ${rideId}`);

    // Move to next driver
    await this.matchDriver(rideId);
  }

  /**
   * Handle driver timeout
   */
  private static async handleDriverTimeout(
    rideId: string,
    driverId: string
  ): Promise<void> {
    matchingTimeouts.delete(rideId);

    const ride = await Ride.findOne({ rideId });
    if (!ride || ride.status !== 'searching') {
      return;
    }

    console.log(`⏱️ Driver ${driverId} timed out for ride ${rideId}`);

    // Notify driver that timeout occurred
    const io = getIO();
    const driverSocketId = DriverPoolService.getSocketId(driverId);
    if (driverSocketId) {
      io.to(driverSocketId).emit('ride_timeout', { rideId });
    }

    // Move to next driver
    await this.matchDriver(rideId);
  }

  /**
   * Handle no driver found
   */
  private static async handleNoDriverFound(rideId: string): Promise<void> {
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      { $set: { status: 'no_driver_found' } },
      { new: true }
    );

    if (!ride) return;

    const io = getIO();

    // Notify client (both old client-specific room and new ride room)
    io.to(`client:${ride.clientId}`).emit('no_driver_found', {
      rideId,
      message: 'No drivers available at the moment',
    });
    io.to(`ride:${rideId}`).emit('no_driver_found', {
      rideId,
      message: 'No drivers available at the moment',
    });

    // Send push notification
    await PushNotificationService.sendToClient(ride.clientId.toString(), {
      title: 'No Drivers Available',
      body: 'Please try again shortly.',
      data: { rideId, type: 'no_driver_found' },
    });

    console.log(`⚠️ No driver found for ride ${rideId}`);
  }

  /**
   * Handle client cancelling a ride
   */
  static async handleClientCancel(
    rideId: string,
    reason?: string
  ): Promise<void> {
    // Clear any pending timeout
    const timeoutId = matchingTimeouts.get(rideId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      matchingTimeouts.delete(rideId);
    }

    const ride = await Ride.findOneAndUpdate(
      { rideId },
      {
        $set: {
          status: 'cancelled',
          cancelledBy: 'client',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!ride) return;

    const io = getIO();

    // If driver was assigned, notify them
    if (ride.driverId) {
      const driverId = ride.driverId.toString();
      await DriverPoolService.markBusy(driverId, false);

      io.to(`driver:${driverId}`).emit('ride_cancelled_by_client', {
        rideId,
        reason,
      });

      // Send push
      await PushNotificationService.sendToDriver(driverId, {
        title: 'Ride Cancelled',
        body: 'The client has cancelled the ride.',
        data: { rideId, type: 'ride_cancelled' },
      });

      // Clean up room
      rideRooms.delete(rideId);
    }

    // Notify pending drivers if any
    if (ride.matchedDrivers && ride.status === 'searching') {
      for (const driverId of ride.matchedDrivers) {
        const driverSocketId = DriverPoolService.getSocketId(driverId);
        if (driverSocketId) {
          io.to(driverSocketId).emit('ride_cancelled', { rideId });
        }
      }
    }

    console.log(`🚫 Ride ${rideId} cancelled by client`);
  }

  /**
   * Handle driver cancelling after acceptance
   */
  static async handleDriverCancel(rideId: string): Promise<void> {
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      {
        $set: {
          status: 'cancelled',
          cancelledBy: 'driver',
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!ride) return;

    const driverId = ride.driverId?.toString();
    if (driverId) {
      await DriverPoolService.markBusy(driverId, false);
    }

    const io = getIO();

    // Notify client
    io.to(`client:${ride.clientId}`).emit('ride_cancelled_by_driver', {
      rideId,
      message: 'Driver cancelled the ride',
    });

    // Send push to client
    await PushNotificationService.sendToClient(ride.clientId.toString(), {
      title: 'Driver Cancelled',
      body: 'The driver has cancelled. Please request again.',
      data: { rideId, type: 'driver_cancelled' },
    });

    // Clean up room
    rideRooms.delete(rideId);

    console.log(`🚫 Ride ${rideId} cancelled by driver`);
  }

  /**
   * Handle driver disconnect during active ride
   */
  static async handleDriverDisconnect(driverId: string): Promise<void> {
    // Find active ride for this driver
    const ride = await Ride.findOne({
      driverId,
      status: { $in: ['accepted', 'driver_arrived', 'in_progress'] },
    });

    if (ride) {
      const io = getIO();

      // Notify client
      io.to(`client:${ride.clientId}`).emit('driver_disconnected', {
        rideId: ride.rideId,
        message: 'Driver connection lost',
      });

      console.log(`⚠️ Driver ${driverId} disconnected during active ride ${ride.rideId}`);
    }
  }

  /**
   * Forward driver location to client
   */
  static async forwardDriverLocation(
    driverId: string,
    location: { lat: number; lng: number; heading?: number }
  ): Promise<void> {
    // Find active ride for this driver
    const ride = await Ride.findOne({
      driverId,
      status: { $in: ['accepted', 'driver_arrived', 'in_progress'] },
    });

    if (ride) {
      const io = getIO();
      console.log(`📍 Forwarding driver ${driverId} location to ride ${ride.rideId}:`, location);
      // Emit to ride room so both client and any interested parties receive updates
      io.to(`ride:${ride.rideId}`).emit('driver_location_update', {
        rideId: ride.rideId,
        driverId,
        location,
        timestamp: Date.now(),
      });
    } else {
      console.log(`⚠️ No active ride for driver ${driverId} to forward location`);
    }
  }

  /**
   * Get active ride for client
   */
  static async getClientActiveRide(clientId: string): Promise<any> {
    return await Ride.findOne({
      clientId,
      status: { $in: ['searching', 'assigned', 'accepted', 'driver_arrived', 'in_progress'] },
    });
  }

  /**
   * Get active ride for driver
   */
  static async getDriverActiveRide(driverId: string): Promise<any> {
    return await Ride.findOne({
      driverId,
      status: { $in: ['accepted', 'driver_arrived', 'in_progress'] },
    });
  }

  /**
   * Generate unique ride ID
   */
  static generateRideId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RIDE-${timestamp}-${random}`;
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
