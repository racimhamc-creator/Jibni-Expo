import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { DriverPoolService } from '../services/driverPool.service.js';
import { Profile } from '../models/Profile.js';
import { calculatePricing, getDistanceDuration } from '../services/pricing.service.js';

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
    // Using Google Maps API with Haversine fallback
    const rideDistanceResult = await getDistanceDuration(
      pickupLocation.lat,
      pickupLocation.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );
    const rideDistanceKm = rideDistanceResult.distance / 1000;

    // ✅ Calculate price using the actual Algeria towing pricing algorithm
    // (with no driver location yet, pickup distance is 0)
    const pricingResult = await calculatePricing(
      pickupLocation.lat, // driver lat (not available yet)
      pickupLocation.lng, // driver lng (not available yet)
      pickupLocation.lat,
      pickupLocation.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );

    const ridePrice = pricingResult.totalPrice;
    const rideDistanceForDisplay = pricingResult.tripDistanceKm || rideDistanceKm;

    console.log(`💰 Calculated price for ${rideDistanceForDisplay.toFixed(1)}km ride: ${ridePrice} DZD`);
    console.log(`💰 Pricing breakdown: base=${pricingResult.basePrice}, distance=${pricingResult.distancePrice}, weekend=${pricingResult.weekendSurcharge}, night=${pricingResult.nightSurcharge}`);

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
router.get('/status', authenticate, requireRole(['driver']), async (req: AuthRequest, res) => {
  try {
    const driverId = req.userId as string;
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

export default router;
