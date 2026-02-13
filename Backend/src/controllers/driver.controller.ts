import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { findNearbyDrivers } from '../services/location.service.js';
import { Profile } from '../models/Profile.js';

export const getNearbyDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    const drivers = await findNearbyDrivers(parseFloat(lat as string), parseFloat(lng as string));
    
    // Enrich with profile data
    const enrichedDrivers = await Promise.all(
      drivers.map(async (driver) => {
        const profile = await Profile.findOne({ userId: driver.driverId, openToWork: true, engaged: false });
        if (profile) {
          return {
            ...driver,
            profile: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatar: profile.avatar,
            },
          };
        }
        return driver;
      })
    );

    res.json(enrichedDrivers);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get nearby drivers' });
  }
};

export const toggleAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { openToWork } = req.body;
    const userId = req.userId;

    if (typeof openToWork !== 'boolean') {
      res.status(400).json({ message: 'openToWork must be a boolean' });
      return;
    }

    await Profile.findOneAndUpdate(
      { userId },
      { openToWork }
    );

    res.json({ message: `Availability ${openToWork ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to toggle availability' });
  }
};

export const registerDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: Handle file uploads (driving license, vehicle card)
    // This would typically use multer middleware
    res.json({ message: 'Driver registration endpoint - file upload handling needed' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to register driver' });
  }
};

export const getDriverStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.json({
      status: profile.role === 'driver' ? 'driver' : 'pending',
      openToWork: profile.openToWork,
      engaged: profile.engaged,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get driver status' });
  }
};
