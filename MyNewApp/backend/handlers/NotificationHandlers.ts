// Socket Handlers with Language-Based Notifications
// This would be implemented in your Node.js/Express backend

import { sendNotificationToUserId } from '../services/NotificationService';
import { User } from '../models/User';

// Client ride notifications
export const handleRideAccepted = async (data: {
  rideId: string;
  clientId: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
}) => {
  try {
    console.log('🚗 Ride accepted, notifying client:', data.clientId);
    console.log('🔍 DEBUG: Fetching fresh user from database for clientId:', data.clientId);
    
    // Fetch user fresh from database to get latest language preference
    const freshUser = await User.findById(data.clientId);
    console.log('🔍 DEBUG: Fresh user from database:', {
      _id: freshUser?._id,
      language: freshUser?.language,
      fcmToken: freshUser?.fcmToken ? 'present' : 'missing'
    });
    
    if (!freshUser) {
      console.error('❌ User not found in database:', data.clientId);
      return;
    }
    
    // Send notification in client's preferred language
    const result = await sendNotificationToUserId(
      data.clientId, 
      'rideAccepted', 
      {
        rideId: data.rideId,
        driverId: data.driverId,
        driverName: data.driverName || 'Your driver',
        driverPhone: data.driverPhone
      }
    );
    
    if (result.success) {
      console.log(`✅ Ride accepted notification sent to client ${data.clientId}`);
    } else {
      console.error(`❌ Failed to send ride accepted notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRideAccepted:', error);
  }
};

export const handleDriverArrived = async (data: {
  rideId: string;
  clientId: string;
  driverId: string;
}) => {
  try {
    console.log('📍 Driver arrived, notifying client:', data.clientId);
    
    const result = await sendNotificationToUserId(
      data.clientId, 
      'driverArrived', 
      {
        rideId: data.rideId,
        driverId: data.driverId
      }
    );
    
    if (result.success) {
      console.log(`✅ Driver arrived notification sent to client ${data.clientId}`);
    } else {
      console.error(`❌ Failed to send driver arrived notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleDriverArrived:', error);
  }
};

export const handleRideStarted = async (data: {
  rideId: string;
  clientId: string;
  driverId: string;
  pickupLocation?: any;
  destinationLocation?: any;
  eta?: any;
  distance?: any;
}) => {
  try {
    console.log('🚀 Ride started, notifying client:', data.clientId);
    
    const result = await sendNotificationToUserId(
      data.clientId, 
      'rideStarted', 
      {
        rideId: data.rideId,
        driverId: data.driverId,
        eta: data.eta,
        distance: data.distance
      }
    );
    
    if (result.success) {
      console.log(`✅ Ride started notification sent to client ${data.clientId}`);
    } else {
      console.error(`❌ Failed to send ride started notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRideStarted:', error);
  }
};

export const handleRideCompleted = async (data: {
  rideId: string;
  clientId: string;
  driverId: string;
  price?: number;
}) => {
  try {
    console.log('✅ Ride completed, notifying client:', data.clientId);
    
    const result = await sendNotificationToUserId(
      data.clientId, 
      'rideCompleted', 
      {
        rideId: data.rideId,
        driverId: data.driverId,
        price: data.price
      }
    );
    
    if (result.success) {
      console.log(`✅ Ride completed notification sent to client ${data.clientId}`);
    } else {
      console.error(`❌ Failed to send ride completed notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRideCompleted:', error);
  }
};

export const handleRideCancelledByDriver = async (data: {
  rideId: string;
  clientId: string;
  driverId: string;
  reason?: string;
}) => {
  try {
    console.log('🚫 Ride cancelled by driver, notifying client:', data.clientId);
    
    const result = await sendNotificationToUserId(
      data.clientId, 
      'rideCancelledByDriver', 
      {
        rideId: data.rideId,
        driverId: data.driverId,
        reason: data.reason
      }
    );
    
    if (result.success) {
      console.log(`✅ Ride cancellation notification sent to client ${data.clientId}`);
    } else {
      console.error(`❌ Failed to send ride cancellation notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRideCancelledByDriver:', error);
  }
};

// Driver notifications
export const handleRideRequest = async (data: {
  rideId: string;
  driverId: string;
  clientId: string;
  pickupLocation: any;
  destinationLocation: any;
  pricing: any;
  clientName?: string;
}) => {
  try {
    console.log('📨 New ride request, notifying driver:', data.driverId);
    
    const result = await sendNotificationToUserId(
      data.driverId, 
      'rideRequest', 
      {
        rideId: data.rideId,
        clientId: data.clientId,
        pickupAddress: data.pickupLocation?.address,
        destinationAddress: data.destinationLocation?.address,
        price: data.pricing?.totalPrice,
        clientName: data.clientName
      }
    );
    
    if (result.success) {
      console.log(`✅ Ride request notification sent to driver ${data.driverId}`);
    } else {
      console.error(`❌ Failed to send ride request notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRideRequest:', error);
  }
};

export const handleDriverApproval = async (data: {
  driverId: string;
  approved: boolean;
  reason?: string;
}) => {
  try {
    console.log(`${data.approved ? '🎉' : '❌'} Driver ${data.approved ? 'approved' : 'rejected'}, notifying driver:`, data.driverId);
    
    const notificationKey = data.approved ? 'driverApproved' : 'driverRejected';
    
    const result = await sendNotificationToUserId(
      data.driverId, 
      notificationKey, 
      {
        approved: data.approved,
        reason: data.reason
      }
    );
    
    if (result.success) {
      console.log(`✅ Driver ${data.approved ? 'approval' : 'rejection'} notification sent to driver ${data.driverId}`);
    } else {
      console.error(`❌ Failed to send driver ${data.approved ? 'approval' : 'rejection'} notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleDriverApproval:', error);
  }
};

// General notifications
export const handlePaymentReceived = async (data: {
  userId: string;
  amount: number;
  rideId: string;
}) => {
  try {
    console.log('💰 Payment received, notifying user:', data.userId);
    
    const result = await sendNotificationToUserId(
      data.userId, 
      'paymentReceived', 
      {
        amount: data.amount,
        rideId: data.rideId
      }
    );
    
    if (result.success) {
      console.log(`✅ Payment notification sent to user ${data.userId}`);
    } else {
      console.error(`❌ Failed to send payment notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handlePaymentReceived:', error);
  }
};

export const handleRatingReceived = async (data: {
  userId: string;
  rating: number;
  rideId: string;
  fromUser?: string;
}) => {
  try {
    console.log('⭐ Rating received, notifying user:', data.userId);
    
    const result = await sendNotificationToUserId(
      data.userId, 
      'ratingReceived', 
      {
        rating: data.rating,
        rideId: data.rideId,
        fromUser: data.fromUser
      }
    );
    
    if (result.success) {
      console.log(`✅ Rating notification sent to user ${data.userId}`);
    } else {
      console.error(`❌ Failed to send rating notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleRatingReceived:', error);
  }
};

export const handleAccountBanned = async (data: {
  userId: string;
  reason?: string;
}) => {
  try {
    console.log('🚫 Account banned, notifying user:', data.userId);
    
    const result = await sendNotificationToUserId(
      data.userId, 
      'accountBanned', 
      {
        reason: data.reason
      }
    );
    
    if (result.success) {
      console.log(`✅ Account ban notification sent to user ${data.userId}`);
    } else {
      console.error(`❌ Failed to send account ban notification: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error in handleAccountBanned:', error);
  }
};

// Socket event mapping
export const socketNotificationHandlers = {
  // Client events
  'ride_accepted': handleRideAccepted,
  'driver_arrived': handleDriverArrived,
  'ride_started': handleRideStarted,
  'ride_completed': handleRideCompleted,
  'ride_cancelled_by_driver': handleRideCancelledByDriver,
  
  // Driver events
  'ride_request': handleRideRequest,
  'driver_approved': handleDriverApproval,
  'driver_rejected': handleDriverApproval,
  
  // General events
  'payment_received': handlePaymentReceived,
  'rating_received': handleRatingReceived,
  'account_banned': handleAccountBanned,
};

// Helper function to register all notification handlers with socket.io
export function registerNotificationHandlers(io: any) {
  Object.entries(socketNotificationHandlers).forEach(([event, handler]) => {
    io.on(event, async (data: any) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error in socket handler for ${event}:`, error);
      }
    });
  });
  
  console.log('🔔 Registered all notification handlers with socket.io');
}
