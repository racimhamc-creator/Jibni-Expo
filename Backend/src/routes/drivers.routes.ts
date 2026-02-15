import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { DriverPoolService } from '../services/driverPool.service.js';
import { Profile } from '../models/Profile.js';

const router = Router();

// Get available drivers near pickup location (for clients)
router.post('/available', authenticate, requireRole(['client']), async (req, res) => {
  try {
    const { pickupLocation, destinationLocation, vehicleType } = req.body;
    
    if (!pickupLocation?.lat || !pickupLocation?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location (lat, lng) is required',
      });
    }

    // ✅ NEW: Validate destination location for accurate pricing
    if (!destinationLocation?.lat || !destinationLocation?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Destination location (lat, lng) is required for pricing',
      });
    }

    // Get available drivers from pool
    const availableDrivers = DriverPoolService.getAvailableDrivers(
      pickupLocation.lat,
      pickupLocation.lng,
      vehicleType
    );

    // Get driver profiles for additional info
    const driverIds = availableDrivers.map(d => d.driverId);
    const profiles = await Profile.find({ userId: { $in: driverIds } });
    
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

    // ✅ Calculate pickup→destination distance ONCE (same for all drivers)
    const rideDistance = calculateDistance(
      pickupLocation.lat,
      pickupLocation.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );

    // ✅ Calculate price based on actual ride distance (not driver distance)
    const ridePrice = calculatePrice(rideDistance, vehicleType);

    console.log(`💰 Calculated price for ${rideDistance.toFixed(1)}km ride: ${ridePrice} DZD`);

    // Calculate distance and ETA for each driver (how far they are from pickup)
    const driversWithInfo = availableDrivers.map(driver => {
      const driverToPickupDistance = calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        driver.location.lat,
        driver.location.lng
      );
      
      // Calculate ETA (assume 30 km/h average speed in city)
      const etaMinutes = Math.ceil((driverToPickupDistance / 30) * 60);
      
      const profile = profileMap.get(driver.driverId);
      
      return {
        driverId: driver.driverId,
        distance: parseFloat(driverToPickupDistance.toFixed(1)), // km (driver to pickup)
        distanceValue: driverToPickupDistance,
        time: etaMinutes.toString(),
        timeValue: etaMinutes,
        price: ridePrice, // ✅ Same price for all drivers (based on ride distance)
        vehicleType: driver.vehicleType,
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        location: driver.location,
      };
    });

    // Sort by distance (closest first)
    driversWithInfo.sort((a, b) => a.distanceValue - b.distanceValue);

    // Limit to top 5 drivers
    const topDrivers = driversWithInfo.slice(0, 5);

    console.log(`📍 Found ${topDrivers.length} available drivers near pickup`);

    res.json({
      success: true,
      data: topDrivers,
    });
  } catch (error: any) {
    console.error('Error getting available drivers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get available drivers',
    });
  }
});

// Get driver's current status (for driver app)
router.get('/status', authenticate, requireRole(['driver']), async (req, res) => {
  try {
    const driverId = req.userId;
    const driver = DriverPoolService.getDriver(driverId);
    
    res.json({
      success: true,
      data: {
        isOnline: driver?.isOnline || false,
        isBusy: driver?.isBusy || false,
        location: driver?.location || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get driver status',
    });
  }
});

// Helper function to calculate distance using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

// Helper function to calculate price
// Uses Algeria towing formula: base_fare (1500) + (distance_km * 50)
function calculatePrice(distance: number, vehicleType?: string): number {
    // Algeria towing MVP pricing
    const BASE_FARE = 4000; // 4000 DZD hook-up fee
    const PRICE_PER_KM = 120; // 120 DZD per km (heavy equipment)
    const MINIMUM_FARE = 4000; // Minimum 4000 DZD
  
  // Calculate total
  const calculatedPrice = BASE_FARE + (distance * PRICE_PER_KM);
  const finalPrice = Math.max(calculatedPrice, MINIMUM_FARE);
  
  // Round to nearest integer
  return Math.round(finalPrice);
}

export default router;
