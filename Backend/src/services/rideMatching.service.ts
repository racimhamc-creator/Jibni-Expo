import { Ride, RideStatus } from '../models/Ride.js';
import { User } from '../models/User.js';
import { DriverPoolService } from './driverPool.service.js';
import { PushNotificationService } from './pushNotification.service.js';
import { getIO } from './socketManager.service.js';
import { calculatePricing, calculateComprehensivePricing, getDistanceDuration } from './pricing.service.js';

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

const MATCHING_TIMEOUT = 60000; // 60 seconds per driver
const MAX_MATCHING_DRIVERS = 5; // Try up to 5 drivers

export class RideMatchingService {
  /**
   * Create a new ride request and start matching
   * Price is calculated on backend using Algeria towing formula
   */
  static async createRideRequest(
    rideId: string,
    data: RideRequestData
  ): Promise<void> {
    // Calculate actual trip distance from pickup to destination
    const tripDistanceResult = await getDistanceDuration(
      data.pickupLocation.lat,
      data.pickupLocation.lng,
      data.destinationLocation.lat,
      data.destinationLocation.lng
    );
    
    const tripDistanceKm = tripDistanceResult.distance / 1000;
    const tripEtaMinutes = Math.ceil(tripDistanceResult.duration / 60);

    console.log(`📏 Trip distance calculated for ride ${rideId}:`, {
      distanceMeters: tripDistanceResult.distance,
      distanceKm: tripDistanceKm.toFixed(2),
      etaMinutes: tripEtaMinutes,
    });

    // Calculate initial price estimate (without driver location)
    // Final price will be calculated when driver is matched
    const initialPricing = calculateComprehensivePricing(
      0, // No pickup distance yet
      tripDistanceResult.distance, // in meters
      new Date()
    );

    console.log(`💰 Initial price estimate for ride ${rideId}:`, {
      base: initialPricing.basePrice,
      distance: initialPricing.distancePrice,
      total: initialPricing.totalPrice,
      distanceKm: initialPricing.distanceKm,
    });

    // Create ride in database with calculated distance and pricing
    const ride = new Ride({
      rideId,
      clientId: data.clientId,
      status: 'searching',
      pickupLocation: data.pickupLocation,
      destinationLocation: data.destinationLocation,
      vehicleType: data.vehicleType,
      pricing: {
        basePrice: initialPricing.basePrice,
        distancePrice: initialPricing.distancePrice,
        weekendSurcharge: initialPricing.weekendSurcharge,
        nightSurcharge: initialPricing.nightSurcharge,
        totalPrice: initialPricing.totalPrice,
        currency: initialPricing.currency,
      },
      distance: {
        clientToDestination: tripDistanceKm,
        driverToClient: 0,
      },
      eta: {
        clientToDestination: tripEtaMinutes,
        driverToClient: 0,
      },
      matchedDrivers: [],
      currentDriverIndex: 0,
    });

    await ride.save();
    
    // Return initial price estimate to client
    const io = getIO();
    io.to(`client:${data.clientId}`).emit('ride_pricing_calculated', {
      rideId,
      pricing: initialPricing,
      status: 'searching',
      note: 'Final price may vary based on driver location',
    });

    // Notify client that search has started
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

    // Calculate driver-specific ETA and distance
    const driverLocation = driver.location;
    
    // DEBUG: Log actual coordinates being compared
    console.log('📍 DEBUG Driver Location:', {
      driverId: driver.driverId,
      lat: driverLocation.lat,
      lng: driverLocation.lng,
    });
    console.log('📍 DEBUG Pickup Location (Client):', {
      lat: ride.pickupLocation.lat,
      lng: ride.pickupLocation.lng,
    });
    
    const distanceToPickupMeters = this.calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      ride.pickupLocation.lat,
      ride.pickupLocation.lng
    );
    const distanceToPickupKm = distanceToPickupMeters / 1000;
    
    // DEBUG: Log calculated distance
    console.log(`📏 DEBUG Calculated Distance: ${distanceToPickupMeters}m (${distanceToPickupKm.toFixed(2)}km)`);
   
    const etaToPickup = Math.ceil((distanceToPickupKm / 30) * 60); // Rough estimate: 30km/h avg

    // Update ride with matched driver info including driverToClient (in km)
    ride.matchedDrivers = [...(ride.matchedDrivers || []), driverId];
    ride.currentDriverIndex = (ride.currentDriverIndex ?? 0) + 1;
    ride.distance = {
      ...ride.distance,
      driverToClient: parseFloat(distanceToPickupKm.toFixed(1)),
    };
    ride.eta = {
      ...ride.eta,
      driverToClient: etaToPickup,
    };

    // Recalculate pricing with actual driver location
    const finalPricing = calculateComprehensivePricing(
      distanceToPickupMeters,
      ride.distance.clientToDestination * 1000, // Convert km to meters
      new Date()
    );

    // Update ride with final pricing
    ride.pricing = {
      basePrice: finalPricing.basePrice,
      distancePrice: finalPricing.distancePrice,
      weekendSurcharge: finalPricing.weekendSurcharge,
      nightSurcharge: finalPricing.nightSurcharge,
      totalPrice: finalPricing.totalPrice,
      currency: finalPricing.currency,
    };

    await ride.save();

    console.log(`💰 Final price calculated for ride ${rideId} with driver ${driverId}:`, {
      base: finalPricing.basePrice,
      distance: finalPricing.distancePrice,
      weekend: finalPricing.weekendSurcharge,
      night: finalPricing.nightSurcharge,
      total: finalPricing.totalPrice,
      pickupDistanceKm: finalPricing.pickupDistanceKm,
    });

    // Notify client of final pricing
    const io = getIO();
    io.to(`client:${ride.clientId}`).emit('ride_pricing_updated', {
      rideId,
      pricing: finalPricing,
      driverId,
      pickupEta: etaToPickup,
    });
    const driverSocketId = DriverPoolService.getSocketId(driverId);

    // Prepare ride request data for driver
    const rideRequestData = {
      rideId: ride.rideId,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      distance: {
        driverToClient: parseFloat(distanceToPickupKm.toFixed(1)),
        clientToDestination: ride.distance.clientToDestination,
        tripDistanceKm: ride.distance.clientToDestination, // Explicit trip distance
      },
      eta: {
        driverToClient: etaToPickup,
        clientToDestination: ride.eta.clientToDestination,
      },
      pricing: ride.pricing,
      vehicleType: ride.vehicleType,
      timeout: MATCHING_TIMEOUT / 1000, // seconds
      tripInfo: {
        distanceKm: ride.distance.clientToDestination,
        durationMinutes: ride.eta.clientToDestination,
        estimatedEarnings: ride.pricing.totalPrice,
      },
    };

    // Send request to driver via socket if connected
// Send request to driver via socket if connected
let socketDelivered = false;
if (driverSocketId) {
  io.to(driverSocketId).emit('ride_request', rideRequestData);
  socketDelivered = true;
  console.log(`📤 Ride request sent to driver ${driverId} via socket`);
}

// ✅ ALWAYS send push notification as backup (even if socket delivered)
// This ensures driver gets notified if app is closed/backgrounded
await PushNotificationService.sendToDriver(driverId, {
  title: 'New Ride Request! 🚗',
  body: `Trip: ${ride.distance.clientToDestination.toFixed(1)}km | Earnings: ${ride.pricing.totalPrice} DZD`,
  data: { 
    rideId, 
    type: 'ride_request',
    // Include essential ride info for when user taps notification
    pickupLat: ride.pickupLocation.lat,
    pickupLng: ride.pickupLocation.lng,
    destinationLat: ride.destinationLocation.lat,
    destinationLng: ride.destinationLocation.lng,
    pricing: ride.pricing.totalPrice,
    tripDistanceKm: ride.distance.clientToDestination,
    tripEtaMinutes: ride.eta.clientToDestination,
  },
});
console.log(`📱 Push notification sent to driver ${driverId} (socket: ${socketDelivered ? 'yes' : 'no'})`);
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

    // Send push notification to client (always, regardless of socket connection)
    // This ensures the client gets notified even when app is in background or closed
    try {
      console.log(`📱 Sending 'driver_found' push to client ${ride.clientId}`);
      await PushNotificationService.sendToClient(ride.clientId.toString(), {
        title: '🚗 Driver Found!',
        body: `Your driver is on the way to ${ride.pickupLocation.address || 'your location'}`,
        data: { 
          rideId, 
          type: 'driver_found',
          driverId,
          driverPhone,
          pickupLat: ride.pickupLocation.lat,
          pickupLng: ride.pickupLocation.lng,
          destinationLat: ride.destinationLocation.lat,
          destinationLng: ride.destinationLocation.lng,
          eta: ride.eta?.driverToClient,
          price: ride.pricing?.totalPrice,
        },
      });
      console.log(`✅ Push sent to client ${ride.clientId}`);
    } catch (error) {
      console.error(`❌ Failed to send push to client ${ride.clientId}:`, error);
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
    
    // Check distance to client - auto-arrival detection
    if (ride.status === 'accepted') {
      // DEBUG: Log coordinates before calculation
      console.log(`📍 DEBUG Forward - Driver Coords:`, {
        lat: location.lat,
        lng: location.lng,
      });
      console.log(`📍 DEBUG Forward - Pickup Coords:`, {
        lat: ride.pickupLocation.lat,
        lng: ride.pickupLocation.lng,
      });
      
      const distanceToClientMeters = this.calculateDistance(
        location.lat,
        location.lng,
        ride.pickupLocation.lat,
        ride.pickupLocation.lng
      );
      
      console.log(`📏 Distance to client: ${distanceToClientMeters.toFixed(1)}m`);
      
      // ✅ Auto-arrival when within 15 meters (GPS may not be precise to 10m)
      const ARRIVAL_THRESHOLD_METERS = 15;
      
      if (distanceToClientMeters <= ARRIVAL_THRESHOLD_METERS) {
        console.log(`🚗 Auto-arrival detected! Driver within ${ARRIVAL_THRESHOLD_METERS}m of client`);
        
        // Update ride status
        ride.status = 'driver_arrived';
        ride.driverArrivedAt = new Date();
        await ride.save();
        
        // Notify via ride room
        io.to(`ride:${ride.rideId}`).emit('driver_arrived', {
          rideId: ride.rideId,
          driverId,
          message: 'Driver arrived at pickup location',
        });
        
        // Also notify driver directly
        io.to(`driver:${driverId}`).emit('driver_arrived', {
          rideId: ride.rideId,
          message: 'You have arrived at the client location',
        });
        
        // Also notify client directly
        io.to(`client:${ride.clientId}`).emit('driver_arrived', {
          rideId: ride.rideId,
          driverId,
          message: 'Your driver has arrived!',
        });
        
        console.log(`📱 Sending arrival notifications`);
      }
    }
    
    // ✅ Auto-complete detection - when driver reaches destination during ride
    if (ride.status === 'in_progress') {
      const distanceToDestinationMeters = this.calculateDistance(
        location.lat,
        location.lng,
        ride.destinationLocation.lat,
        ride.destinationLocation.lng
      );
      
      console.log(`📏 Distance to destination: ${distanceToDestinationMeters.toFixed(1)}m`);
      
      // Auto-complete when within 15 meters of destination (GPS may not be precise)
      const COMPLETION_THRESHOLD_METERS = 15;
      
      if (distanceToDestinationMeters <= COMPLETION_THRESHOLD_METERS) {
        console.log(`🎉 Auto-complete detected! Driver within ${COMPLETION_THRESHOLD_METERS}m of destination`);
        
        // Update ride status
        ride.status = 'completed';
        ride.completedAt = new Date();
        await ride.save();
        
        // Mark driver as available again
        await DriverPoolService.markBusy(driverId, false);
        
        // Notify via ride room
        io.to(`ride:${ride.rideId}`).emit('ride_completed', {
          rideId: ride.rideId,
          driverId,
          message: 'Ride completed successfully!',
          totalPrice: ride.pricing.totalPrice,
        });
        
        // Also notify driver directly
        io.to(`driver:${driverId}`).emit('ride_completed', {
          rideId: ride.rideId,
          message: 'Ride completed successfully!',
          totalPrice: ride.pricing.totalPrice,
        });
        
        // Also notify client directly
        io.to(`client:${ride.clientId}`).emit('ride_completed', {
          rideId: ride.rideId,
          driverId,
          message: 'Ride completed successfully!',
          totalPrice: ride.pricing.totalPrice,
        });
        
        console.log(`📱 Sending completion notifications`);
      }
    }
    
    // Emit to ride room so both client and any interested parties receive updates
    io.to(`ride:${ride.rideId}`).emit('driver_location_update', {
      rideId: ride.rideId,
      driverId,
      location,
      distance: ride.status === 'accepted' ? 
        this.calculateDistance(location.lat, location.lng, ride.pickupLocation.lat, ride.pickupLocation.lng) : 
        undefined,
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
    const R = 6371000; // Earth's radius in METERS
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns distance in METERS
  }
}
