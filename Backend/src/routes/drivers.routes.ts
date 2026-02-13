import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { DriverPoolService } from '../services/driverPool.service.js';
import { Profile } from '../models/Profile.js';

const router = Router();

// Get available drivers near pickup location (for clients)
router.post('/available', authenticate, requireRole(['client']), async (req, res) => {
  try {
    const { pickupLocation, vehicleType } = req.body;
    
    if (!pickupLocation?.lat || !pickupLocation?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location (lat, lng) is required',
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

    // Calculate distance and ETA for each driver
    const driversWithInfo = availableDrivers.map(driver => {
      const distance = calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        driver.location.lat,
        driver.location.lng
      );
      
      // Calculate ETA (assume 30 km/h average speed in city)
      const etaMinutes = Math.ceil((distance / 30) * 60);
      
      const profile = profileMap.get(driver.driverId);
      
      return {
        driverId: driver.driverId,
        distance: parseFloat(distance.toFixed(1)), // km
        distanceValue: distance,
        time: etaMinutes.toString(),
        timeValue: etaMinutes,
        price: calculatePrice(distance, vehicleType),
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
function calculatePrice(distance: number, vehicleType?: string): number {
  // Base price
  let basePrice = 500; // 500 DZD base
  
  // Per km rate based on vehicle type
  const perKmRate = {
    moto: 100,
    car: 150,
    truck: 300,
    van: 250,
  };
  
  const rate = perKmRate[vehicleType as keyof typeof perKmRate] || 150;
  
  // Calculate total (base + distance * rate)
  const total = basePrice + (distance * rate);
  
  // Round to nearest 100
  return Math.ceil(total / 100) * 100;
}

export default router;
