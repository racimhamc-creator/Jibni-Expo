import { Socket } from 'socket.io';
import { DriverPoolService } from './driverPool.service.js';
import { RideMatchingService } from './rideMatching.service.js';
import { PushNotificationService } from './pushNotification.service.js';
import { getIO, joinUserRoom } from './socketManager.service.js';
import { Profile } from '../models/Profile.js';
import { Ride } from '../models/Ride.js';
import { User } from '../models/User.js';
import { getDirections } from '../utils/maps.js';
import { fraudDetectionService } from './fraudDetection.service.js';

/**
 * Calculate distance using Haversine formula (fallback when Google Maps fails)
 * Returns distance in meters
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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

/**
 * Estimate ETA based on distance
 * Returns ETA in seconds (assuming 50 km/h average speed on open road)
 */
function estimateEtaSeconds(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  const speedKmh = 50; // Average speed for towing
  const hours = distanceKm / speedKmh;
  return Math.ceil(hours * 3600);
}

interface LocationData {
  lat: number;
  lng: number;
  heading?: number;
}

interface RideRequestData {
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

export const setupSocketHandlers = (socket: Socket): void => {
  const { userId, role } = socket.data;
  const io = getIO();

  // Join user to appropriate rooms
  joinUserRoom(socket);

  console.log(`🔌 Socket connected: ${userId} (${role}) - ${socket.id}`);
  
  // Log warning if client tries to connect as driver
  if (role === 'client') {
    console.log(`⚠️  User ${userId} is a CLIENT - cannot receive driver requests`);
  } else if (role === 'driver') {
    console.log(`✅ User ${userId} is a DRIVER - ready for ride requests`);
  }

  // ==================== DRIVER EVENTS ====================

  if (role === 'driver') {
    console.log(`🚗 REGISTERING DRIVER EVENTS for ${userId} - start_ride handler ready`);
    
    // Driver comes online
    socket.on('driver_online', async (data: { 
      location: LocationData; 
      vehicleType?: string;
      fcmToken?: string;
    }) => {
      try {
        console.log(`📥 Driver ${userId} going online with location:`, data.location);
        
        // Get driver profile for vehicle type and FCM token
        const profile = await Profile.findOne({ userId });
        
        const vehicleType = data.vehicleType || profile?.vehicleType || 'car';
        console.log(`🚗 Driver vehicle type: ${vehicleType} (requested: ${data.vehicleType}, profile: ${profile?.vehicleType})`);
        
        // Use FCM token from data (if provided) or from profile
        const fcmToken = data.fcmToken || profile?.fcmToken;
        
        await DriverPoolService.addDriver(
          userId,
          socket.id,
          data.location,
          vehicleType,
          fcmToken
        );
        
        // Also save FCM token to Profile if provided (for push notifications when offline)
        if (data.fcmToken && data.fcmToken !== profile?.fcmToken) {
          await Profile.findOneAndUpdate(
            { userId },
            { fcmToken: data.fcmToken },
            { upsert: true }
          );
          console.log(`✅ FCM token saved to profile for driver ${userId}`);
        }
        
        // Join driver-specific room for receiving ride updates
        socket.join(`driver:${userId}`);

        socket.emit('driver_online_confirmed', { status: 'online' });
        console.log(`🟢 Driver ${userId} is now ONLINE in pool`);
        console.log(`📊 Pool stats:`, DriverPoolService.getStats());
      } catch (error) {
        console.error('❌ Error setting driver online:', error);
        socket.emit('error', { message: 'Failed to set online status' });
      }
    });

    // Driver location update (heartbeat)
    socket.on('location_update', async (data: LocationData) => {
      try {
        console.log(`📍 Location update from driver ${userId}:`, data);
        await DriverPoolService.updateLocation(userId, data);
        
        // Forward location to client if on active ride
        await RideMatchingService.forwardDriverLocation(userId, data);

        // Fraud Detection: Check for suspicious activity during active rides
        const activeRide = await Ride.findOne({
          $or: [
            { driverId: userId, status: 'accepted' },
            { driverId: userId, status: 'in_progress' }
          ]
        });

        if (activeRide) {
          // Get client's latest location from profile
          const clientProfile = await Profile.findOne({ userId: activeRide.clientId }) as any;
          if (clientProfile?.location) {
            try {
              const alerts = await fraudDetectionService.processLocationUpdate({
                missionId: activeRide.rideId,
                clientId: activeRide.clientId.toString(),
                driverId: userId,
                clientLocation: clientProfile.location,
                driverLocation: data,
              });

              if (alerts && alerts.length > 0) {
                console.log(`⚠️ Fraud alerts detected for ride ${activeRide.rideId}:`, alerts.length);
              }
            } catch (fraudError) {
              console.error('Fraud detection error:', fraudError);
            }
          }
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    // Client location update (for fraud detection)
    socket.on('client_location_update', async (data: LocationData) => {
      try {
        console.log(`📍 Client location update from user ${userId}:`, data);
        
        // Update client's location in profile
        await Profile.findOneAndUpdate(
          { userId },
          { location: data },
          { new: true }
        );

        // Check if client is on an active ride
        const activeRide = await Ride.findOne({
          clientId: userId,
          status: { $in: ['accepted', 'in_progress'] }
        });

        if (activeRide && activeRide.driverId) {
          const driverInfo = await DriverPoolService.getDriver(activeRide.driverId.toString());
          if (driverInfo && driverInfo.location) {
            try {
              const alerts = await fraudDetectionService.processLocationUpdate({
                missionId: activeRide.rideId,
                clientId: userId,
                driverId: activeRide.driverId.toString(),
                clientLocation: data,
                driverLocation: driverInfo.location,
              });

              if (alerts && alerts.length > 0) {
                console.log(`⚠️ Fraud alerts detected for ride ${activeRide.rideId}:`, alerts.length);
              }
            } catch (fraudError) {
              console.error('Fraud detection error:', fraudError);
            }
          }
        }
      } catch (error) {
        console.error('Error updating client location:', error);
      }
    });

    // Driver accepts ride
    socket.on('accept_ride', async (data: { rideId: string }) => {
      try {
        const result = await RideMatchingService.handleDriverAccept(
          data.rideId,
          userId
        );
    
        if (!result.success) {
          socket.emit('ride_accept_failed', {
            rideId: data.rideId,
            message: result.message,
          });
        }
        // ✅ Remove the ride_accepted_confirmed emission here
        // The rideMatching.service.ts will emit it with full data
      } catch (error) {
        console.error('Error accepting ride:', error);
        socket.emit('error', { message: 'Failed to accept ride' });
      }
    });

    // Driver rejects ride
    socket.on('reject_ride', async (data: { rideId: string }) => {
      try {
        await RideMatchingService.handleDriverReject(data.rideId, userId);
        socket.emit('ride_rejected_confirmed', { rideId: data.rideId });
      } catch (error) {
        console.error('Error rejecting ride:', error);
        socket.emit('error', { message: 'Failed to reject ride' });
      }
    });

    // Driver cancels ride after acceptance
    socket.on('driver_cancel_ride', async (data: { rideId: string; reason?: string }) => {
      try {
        await RideMatchingService.handleDriverCancel(data.rideId);
        socket.emit('ride_cancelled_confirmed', { rideId: data.rideId });
      } catch (error) {
        console.error('Error cancelling ride:', error);
        socket.emit('error', { message: 'Failed to cancel ride' });
      }
    });

    // Driver marks as arrived at pickup
    socket.on('driver_arrived', async (data: { rideId: string }) => {
      try {
        io.to(`ride:${data.rideId}`).emit('driver_arrived', {
          rideId: data.rideId,
          driverId: userId,
          timestamp: Date.now(),
        });
        
        // Send push notification to client (always)
        const ride = await Ride.findOne({ rideId: data.rideId });
        if (ride) {
          try {
            await PushNotificationService.sendToClient(ride.clientId.toString(), {
              title: '📍 Driver Arrived!',
              body: 'Your driver has arrived at the pickup location.',
              data: { 
                rideId: data.rideId, 
                type: 'driver_arrived',
                pickupLat: ride.pickupLocation.lat,
                pickupLng: ride.pickupLocation.lng,
              },
            });
            console.log(`📱 Push sent to client ${ride.clientId}: Driver arrived`);
          } catch (error) {
            console.error(`❌ Failed to send driver_arrived push:`, error);
          }
        }
      } catch (error) {
        console.error('Error marking driver arrived:', error);
      }
    });

    // Driver starts the ride
    socket.on('start_ride', async (data: { rideId: string }) => {
      console.log(`🚀🚀🚀 START_RIDE EVENT RECEIVED from driver ${userId}:`, data);
      console.log(`🚀🚀🚀 Inside start_ride handler, looking for ride:`, data.rideId);
      try {
        const ride = await Ride.findOne({ rideId: data.rideId });
        console.log(`🚀🚀🚀 Ride found:`, ride ? 'YES' : 'NO', ride?.rideId);
        if (ride) {
          ride.status = 'in_progress';
          ride.startedAt = new Date();
          await ride.save();
          
          console.log(`🚀 Ride ${data.rideId} started - status: in_progress`);
          
          // Get driver current location
          const driver = DriverPoolService.getDriver(userId);
          
          // Calculate distance and ETA from client pickup to destination
          let clientToDestDistance = ride.distance?.clientToDestination || 0;
          let clientToDestEta = ride.eta?.clientToDestination || 600;
          
          console.log(`🚀 DEBUG Start Ride - Initial values from DB:`, {
            clientToDestDistance: `${clientToDestDistance}m (${(clientToDestDistance/1000).toFixed(2)}km)`,
            clientToDestEta: `${clientToDestEta}s (${Math.ceil(clientToDestEta/60)}min)`,
          });
          
          // Calculate real distance using Google Maps API (or haversine fallback)
          try {
            console.log(`🚀 DEBUG Getting directions from pickup to destination:`);
            console.log(`   Pickup:`, ride.pickupLocation);
            console.log(`   Destination:`, ride.destinationLocation);
            
            const distanceData = await getDirections(
              ride.pickupLocation,
              ride.destinationLocation
            );
            
            if (distanceData) {
              console.log(`🚀 DEBUG Google Maps result:`, {
                distanceMeters: distanceData.distance,
                distanceKm: (distanceData.distance / 1000).toFixed(2),
                durationSeconds: distanceData.duration,
                durationMinutes: Math.ceil(distanceData.duration / 60),
              });
              clientToDestDistance = distanceData.distance;
              clientToDestEta = distanceData.duration;
            }
          } catch (error) {
            console.error('❌ Google Maps API failed, using haversine calculation:', error);
            
            // Fallback: Calculate straight-line distance using haversine formula
            clientToDestDistance = calculateDistanceMeters(
              ride.pickupLocation.lat,
              ride.pickupLocation.lng,
              ride.destinationLocation.lat,
              ride.destinationLocation.lng
            );
            clientToDestEta = estimateEtaSeconds(clientToDestDistance);
            
            console.log(`🚀 DEBUG Haversine fallback calculation:`, {
              distanceMeters: clientToDestDistance,
              distanceKm: (clientToDestDistance / 1000).toFixed(2),
              durationSeconds: clientToDestEta,
              durationMinutes: Math.ceil(clientToDestEta / 60),
            });
          }
          
          // Notify client with full ride data
          // Backend sends distance in meters and eta in seconds
          const rideStartedData = {
            rideId: data.rideId,
            driverId: userId,
            timestamp: Date.now(),
            pickupLocation: ride.pickupLocation,
            destinationLocation: ride.destinationLocation,
            pricing: ride.pricing,
            distance: {
              driverToClient: ride.distance?.driverToClient || 0,
              clientToDestination: clientToDestDistance, // meters
            },
            eta: {
              driverToClient: ride.eta?.driverToClient || 0,
              clientToDestination: clientToDestEta, // seconds
            },
          };
          
          console.log(`🚀 DEBUG Sending ride_started event:`, {
            rideId: data.rideId,
            distance: {
              driverToClient: ride.distance?.driverToClient,
              clientToDestination: clientToDestDistance,
              clientToDestinationKm: (clientToDestDistance / 1000).toFixed(2),
            },
            eta: {
              driverToClient: ride.eta?.driverToClient,
              clientToDestination: clientToDestEta,
              clientToDestinationMin: Math.ceil(clientToDestEta / 60),
            },
          });
          
          console.log(`🚀 DEBUG Emitting ride_started to:
            - ride:${data.rideId}
            - client:${ride.clientId}  
            - user:${ride.clientId} (fallback)`);
          
          io.to(`ride:${data.rideId}`).emit('ride_started', rideStartedData);
          io.to(`client:${ride.clientId}`).emit('ride_started', rideStartedData);
          io.to(`user:${ride.clientId}`).emit('ride_started', rideStartedData);  // Fallback - all users join this room on connect
          
          // Send push notification to client
          try {
            await PushNotificationService.sendToClient(ride.clientId.toString(), {
              title: '🚗 Ride Started!',
              body: `Heading to ${ride.destinationLocation.address || 'destination'}`,
              data: {
                rideId: data.rideId,
                type: 'ride_started',
                destinationLat: ride.destinationLocation.lat,
                destinationLng: ride.destinationLocation.lng,
                eta: rideStartedData.eta?.clientToDestination,
              },
            });
            console.log(`📱 Push sent to client ${ride.clientId}: Ride started`);
          } catch (error) {
            console.error(`❌ Failed to send ride_started push:`, error);
          }
        } else {
          console.error(`❌🚀 Ride not found: ${data.rideId}`);
        }
      } catch (error) {
        console.error('❌🚀 Error starting ride:', error);
      }
    });

    // Driver requests ride completion (asks client to confirm first)
    socket.on('request_complete_ride', async (data: { rideId: string }) => {
      try {
        const ride = await Ride.findOne({ rideId: data.rideId });
        if (ride && ride.status === 'in_progress') {
          console.log(`🏁 Driver ${userId} requesting ride completion for ${data.rideId}`);
          
          // Notify client only (not the ride room which includes the driver)
          const completionRequestData = {
            rideId: data.rideId,
            driverId: userId,
            timestamp: Date.now(),
          };
          io.to(`client:${ride.clientId}`).emit('ride_completion_requested', completionRequestData);
          io.to(`user:${ride.clientId}`).emit('ride_completion_requested', completionRequestData);

          // Send push notification to client
          try {
            await PushNotificationService.sendToClient(ride.clientId.toString(), {
              title: '🏁 Ride Completion',
              body: 'The driver has marked the ride as complete. Please confirm.',
              data: {
                rideId: data.rideId,
                type: 'ride_completion_requested',
              },
            });
            console.log(`📱 Push sent to client ${ride.clientId}: Completion confirmation request`);
          } catch (error) {
            console.error(`❌ Failed to send completion request push:`, error);
          }
        }
      } catch (error) {
        console.error('Error requesting ride completion:', error);
      }
    });

    // Driver completes the ride (direct / force complete)
    socket.on('complete_ride', async (data: { rideId: string }) => {
      try {
        await DriverPoolService.markBusy(userId, false);
        
        const ride = await Ride.findOne({ rideId: data.rideId });
        if (ride) {
          ride.status = 'completed';
          ride.completedAt = new Date();
          await ride.save();

          // Clear fraud detection state for this ride
          fraudDetectionService.clearMissionState(data.rideId);
          console.log(`🧹 Cleared fraud detection state for ride ${data.rideId}`);
        }
        
        io.to(`ride:${data.rideId}`).emit('ride_completed', {
          rideId: data.rideId,
          driverId: userId,
          timestamp: Date.now(),
        });
        
        // Also emit to client room directly
        if (ride) {
          io.to(`client:${ride.clientId}`).emit('ride_completed', {
            rideId: data.rideId,
            driverId: userId,
            timestamp: Date.now(),
          });
          
          // Send push notification to client
          try {
            await PushNotificationService.sendToClient(ride.clientId.toString(), {
              title: '✅ Ride Completed!',
              body: `You have arrived at ${ride.destinationLocation.address || 'your destination'}`,
              data: {
                rideId: data.rideId,
                type: 'ride_completed',
                price: ride.pricing?.totalPrice,
              },
            });
            console.log(`📱 Push sent to client ${ride.clientId}: Ride completed`);
          } catch (error) {
            console.error(`❌ Failed to send ride_completed push:`, error);
          }
        }
      } catch (error) {
        console.error('Error completing ride:', error);
      }
    });
  }

  // ==================== CLIENT EVENTS ====================

  if (role === 'client') {
    // Client requests a ride
    socket.on('request_ride', async (data: RideRequestData) => {
      console.log(`📥🚗 REQUEST_RIDE received from client ${userId}:`, {
        pickup: data.pickupLocation,
        destination: data.destinationLocation,
        vehicleType: data.vehicleType,
      });
      try {
        const rideId = RideMatchingService.generateRideId();
        
        await RideMatchingService.createRideRequest(rideId, {
          clientId: userId,
          ...data,
        });
        
        // Join client to ride room so they receive all updates
        socket.join(`ride:${rideId}`);
        socket.join(`client:${userId}`);

        socket.emit('ride_request_created', { rideId, status: 'searching' });
        console.log(`🚗 New ride request: ${rideId} from client ${userId}`);
      } catch (error) {
        console.error('Error creating ride request:', error);
        socket.emit('error', { message: 'Failed to create ride request' });
      }
    });

    // Client cancels ride
    socket.on('client_cancel_ride', async (data: { rideId: string; reason?: string }) => {
      try {
        await RideMatchingService.handleClientCancel(data.rideId, data.reason);
        socket.emit('ride_cancelled_confirmed', { rideId: data.rideId });
      } catch (error) {
        console.error('Error cancelling ride:', error);
        socket.emit('error', { message: 'Failed to cancel ride' });
      }
    });

    // Client confirms ride completion
    socket.on('confirm_complete_ride', async (data: { rideId: string }) => {
      try {
        const ride = await Ride.findOne({ rideId: data.rideId });
        if (ride && ride.status === 'in_progress') {
          console.log(`✅ Client ${userId} confirmed ride completion for ${data.rideId}`);
          
          // Mark ride as completed
          ride.status = 'completed';
          ride.completedAt = new Date();
          await ride.save();

          // Clear fraud detection state
          fraudDetectionService.clearMissionState(data.rideId);

          // Mark driver as available
          if (ride.driverId) {
            await DriverPoolService.markBusy(ride.driverId.toString(), false);
          }

          const completionData = {
            rideId: data.rideId,
            driverId: ride.driverId?.toString(),
            clientConfirmed: true,
            timestamp: Date.now(),
          };

          // Notify both parties
          io.to(`ride:${data.rideId}`).emit('ride_completed', completionData);
          if (ride.driverId) {
            io.to(`driver:${ride.driverId}`).emit('ride_completed', completionData);
          }
          io.to(`client:${ride.clientId}`).emit('ride_completed', completionData);
          io.to(`user:${ride.clientId}`).emit('ride_completed', completionData);

          // Send push notification to driver
          if (ride.driverId) {
            try {
              await PushNotificationService.sendToDriver(ride.driverId.toString(), {
                title: '✅ Ride Completed!',
                body: 'The client has confirmed the ride completion.',
                data: {
                  rideId: data.rideId,
                  type: 'ride_completed',
                  price: ride.pricing?.totalPrice,
                },
              });
            } catch (error) {
              console.error(`❌ Failed to send completion push to driver:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error confirming ride completion:', error);
      }
    });

    // Client denies ride completion
    socket.on('deny_complete_ride', async (data: { rideId: string }) => {
      try {
        const ride = await Ride.findOne({ rideId: data.rideId });
        if (ride && ride.status === 'in_progress') {
          console.log(`❌ Client ${userId} denied ride completion for ${data.rideId}`);
          
          // Notify driver that client denied
          if (ride.driverId) {
            io.to(`driver:${ride.driverId}`).emit('ride_completion_denied', {
              rideId: data.rideId,
              clientId: userId,
              timestamp: Date.now(),
            });
          }
          io.to(`ride:${data.rideId}`).emit('ride_completion_denied', {
            rideId: data.rideId,
            clientId: userId,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Error denying ride completion:', error);
      }
    });

    // Get active ride status
    socket.on('get_active_ride', async () => {
      try {
        const ride = await RideMatchingService.getClientActiveRide(userId);
        socket.emit('active_ride_status', ride);
      } catch (error) {
        console.error('Error getting active ride:', error);
        socket.emit('error', { message: 'Failed to get active ride' });
      }
    });
  }

  // ==================== COMMON EVENTS ====================

  // Update FCM token
  socket.on('update_fcm_token', async (data: { token: string }) => {
    try {
      await PushNotificationService.updateToken(userId, data.token);
      socket.emit('fcm_token_updated', { success: true });
    } catch (error) {
      console.error('Error updating FCM token:', error);
      socket.emit('error', { message: 'Failed to update FCM token' });
    }
  });

  // Join ride room (for both driver and client)
  socket.on('join_ride_room', (data: { rideId: string }) => {
    socket.join(`ride:${data.rideId}`);
    console.log(`👥 User ${userId} joined ride room ${data.rideId}`);
  });

  // Leave ride room
  socket.on('leave_ride_room', (data: { rideId: string }) => {
    socket.leave(`ride:${data.rideId}`);
    console.log(`👋 User ${userId} left ride room ${data.rideId}`);
  });

  // ==================== DISCONNECT HANDLER ====================

  socket.on('disconnect', async (reason) => {
    console.log(`🔌 Socket disconnected: ${userId} - ${reason}`);

    if (role === 'driver') {
      // Remove from driver pool
      await DriverPoolService.removeDriverBySocket(socket.id);
      
      // Handle active ride disconnection
      await RideMatchingService.handleDriverDisconnect(userId);
    }
  });
};
