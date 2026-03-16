// Driver Routes with Arrival Validation
// Fully integrated with MongoDB/Mongoose and Firebase Cloud Messaging

import express from 'express';
import { calculateDistance, getArrivalThreshold } from '../utils/distance';
import { sendNotificationToUserId } from '../services/NotificationService';
import { Ride } from '../models/Ride';

const router = express.Router();

// Mock socket.io instance - replace with your actual io instance
// This should be passed from your main server file
let io: any = null;

export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

/**
 * POST /api/driver/arrived
 * Validate driver arrival and update ride status
 * 
 * Request body:
 * {
 *   rideId: string,
 *   driverLat: number,
 *   driverLng: number,
 *   gpsAccuracy: number,
 *   distance?: number,
 *   pickupLat?: number,
 *   pickupLng?: number
 * }
 */
router.post('/driver/arrived', async (req, res) => {
  try {
    const {
      rideId,
      driverLat,
      driverLng,
      gpsAccuracy,
      distance: clientDistance,
      pickupLat,
      pickupLng,
    } = req.body;

    console.log('🚗 Driver arrival request:', {
      rideId,
      driverLat,
      driverLng,
      gpsAccuracy,
      clientDistance,
    });

    // Validate inputs
    if (!rideId || driverLat === undefined || driverLng === undefined) {
      console.warn('⚠️ Missing required params');
      return res.status(400).json({
        success: false,
        reason: 'missing_params',
      });
    }

    // ========================================
    // DATABASE: Fetch ride from database
    // ========================================
    let ride;
    try {
      // Try to find by rideId field first, then by _id
      ride = await Ride.findOne({ rideId });
      
      if (!ride) {
        // Try finding by MongoDB _id
        ride = await Ride.findById(rideId);
      }
      
      console.log('🔍 Database query result:', ride ? `Found ride ${ride.rideId}` : 'Not found');
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      return res.status(500).json({
        success: false,
        reason: 'database_error',
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
    }

    // If ride not found and no pickup coords provided, return error
    if (!ride && (!pickupLat || !pickupLng)) {
      console.warn('⚠️ Ride not found and no pickup coordinates provided');
      return res.status(404).json({
        success: false,
        reason: 'ride_not_found',
      });
    }

    // Use provided pickup coordinates or get from ride
    const pickupLatitude = pickupLat ?? ride?.pickupLocation?.lat;
    const pickupLongitude = pickupLng ?? ride?.pickupLocation?.lng;

    if (pickupLatitude === undefined || pickupLongitude === undefined) {
      console.warn('⚠️ No pickup location available');
      return res.status(400).json({
        success: false,
        reason: 'no_pickup_location',
      });
    }

    // ========================================
    // SERVER-SIDE VALIDATION
    // ========================================
    const serverDistance = calculateDistance(
      driverLat,
      driverLng,
      pickupLatitude,
      pickupLongitude
    );

    const threshold = getArrivalThreshold(gpsAccuracy || 0);

    console.log('🔒 Server validation:');
    console.log('   Client reported distance:', clientDistance, 'm');
    console.log('   Server calculated distance:', serverDistance.toFixed(2), 'm');
    console.log('   GPS accuracy:', gpsAccuracy, 'm');
    console.log('   Threshold:', threshold, 'm');

    if (serverDistance <= threshold) {
      // ✅ VALID - Driver is within threshold
      
      // ========================================
      // DATABASE: Update ride status
      // ========================================
      try {
        if (ride) {
          ride.status = 'driver_arrived';
          ride.arrivedAt = new Date();
          await ride.save();
          console.log('💾 Ride status updated to driver_arrived');
        }
      } catch (updateError) {
        console.error('❌ Failed to update ride status:', updateError);
        // Continue anyway - don't block the response
      }

      // ========================================
      // FCM: Send push notification to passenger
      // ========================================
      const clientId = ride?.clientId;
      
      if (clientId) {
        try {
          console.log('📱 Sending driver arrived notification to client:', clientId);
          
          // Use the existing notification service with 'driverArrived' key
          const notificationResult = await sendNotificationToUserId(
            clientId,
            'driverArrived',
            {
              rideId,
              distance: Math.round(serverDistance),
              type: 'driver_arrived',
            }
          );

          if (notificationResult.success) {
            console.log('✅ Push notification sent successfully');
          } else {
            console.warn('⚠️ Push notification failed:', notificationResult.error);
          }
        } catch (notifyError) {
          console.error('❌ Failed to send notification:', notifyError);
          // Don't fail the whole request if notification fails
        }
      } else {
        console.warn('⚠️ No clientId found for ride:', rideId);
      }

      // ========================================
      // SOCKET: Emit event to both driver and passenger
      // ========================================
      if (io) {
        try {
          // Emit to the ride room
          io.to(rideId).emit('driver_arrived', {
            rideId,
            driverId: ride?.driverId,
            distance: Math.round(serverDistance),
            accuracy: gpsAccuracy,
            timestamp: new Date().toISOString(),
          });
          console.log('📡 Emitted driver_arrived socket event');
        } catch (socketError) {
          console.warn('⚠️ Socket emit failed:', socketError);
        }
      }

      console.log('✅ Driver arrival CONFIRMED for ride:', rideId);

      return res.json({
        success: true,
        validated: true,
        serverDistance: Math.round(serverDistance),
        threshold,
        status: 'driver_arrived',
      });
    } else {
      // ❌ INVALID - Driver too far
      console.warn('⚠️ Driver arrival REJECTED:', {
        serverDistance: serverDistance.toFixed(2),
        threshold,
        diff: (serverDistance - threshold).toFixed(2),
      });

      return res.json({
        success: false,
        reason: 'too_far',
        serverDistance: Math.round(serverDistance),
        threshold,
      });
    }
  } catch (error) {
    console.error('❌ Error in driver/arrived endpoint:', error);
    return res.status(500).json({
      success: false,
      reason: 'server_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
