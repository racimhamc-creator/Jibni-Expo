import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Mission } from '../models/Mission.js';
import { Ride } from '../models/Ride.js';
import { Profile } from '../models/Profile.js';
import { findNearbyDrivers } from '../services/location.service.js';
import { calculatePricing } from '../services/pricing.service.js';
import { getDirections } from '../utils/maps.js';
import mongoose from 'mongoose';

export const requestMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driverId, pickupLocation, destinationLocation } = req.body;
    const clientId = req.userId;

    if (!driverId || !pickupLocation || !destinationLocation) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Calculate distances and ETAs
    const driverToClient = await getDirections(
      { lat: 0, lng: 0 }, // TODO: Get driver location from Redis
      pickupLocation
    );
    
    const clientToDestination = await getDirections(
      pickupLocation,
      destinationLocation
    );

    // Calculate pricing
    const distanceKm = clientToDestination.distance / 1000;
    const pricing = await calculatePricing(
      0, // driverLat - not used in this controller
      0, // driverLng - not used in this controller
      pickupLocation.lat,
      pickupLocation.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );

    // Generate mission ID
    const missionId = `mission:${clientId}:${driverId}:${Date.now()}`;

    // Create mission
    const mission = await Mission.create({
      missionId,
      clientId,
      driverId,
      status: 'pending',
      pickupLocation,
      destinationLocation,
      pricing,
      distance: {
        clientToDestination: clientToDestination.distance,
        driverToClient: driverToClient.distance,
      },
      eta: {
        clientToDestination: clientToDestination.duration,
        driverToClient: driverToClient.duration,
      },
      requestedAt: new Date(),
    });

    res.json(mission);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to request mission' });
  }
};

export const acceptMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driverId = req.userId;

    const mission = await Mission.findOne({ missionId: id });
    if (!mission) {
      res.status(404).json({ message: 'Mission not found' });
      return;
    }

    if (mission.driverId.toString() !== driverId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    if (mission.status !== 'pending') {
      res.status(400).json({ message: 'Mission cannot be accepted' });
      return;
    }

    mission.status = 'accepted';
    mission.acceptedAt = new Date();
    await mission.save();

    // Update driver profile
    await Profile.findOneAndUpdate(
      { userId: driverId },
      { engaged: true }
    );

    res.json(mission);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to accept mission' });
  }
};

export const rejectMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driverId = req.userId;

    const mission = await Mission.findOne({ missionId: id });
    if (!mission) {
      res.status(404).json({ message: 'Mission not found' });
      return;
    }

    if (mission.driverId.toString() !== driverId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    mission.status = 'cancelled';
    mission.cancelledAt = new Date();
    mission.cancelledBy = 'driver';
    await mission.save();

    res.json({ message: 'Mission rejected' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to reject mission' });
  }
};

export const completeMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driverId = req.userId;

    const mission = await Mission.findOne({ missionId: id });
    if (!mission) {
      res.status(404).json({ message: 'Mission not found' });
      return;
    }

    if (mission.driverId.toString() !== driverId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    if (mission.status !== 'accepted' && mission.status !== 'in_progress') {
      res.status(400).json({ message: 'Mission cannot be completed' });
      return;
    }

    mission.status = 'completed';
    mission.completedAt = new Date();
    await mission.save();

    // Update driver profile
    await Profile.findOneAndUpdate(
      { userId: driverId },
      { engaged: false }
    );

    res.json(mission);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to complete mission' });
  }
};

export const cancelMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const role = req.role;

    const mission = await Mission.findOne({ missionId: id });
    if (!mission) {
      res.status(404).json({ message: 'Mission not found' });
      return;
    }

    const isClient = mission.clientId.toString() === userId;
    const isDriver = mission.driverId.toString() === userId;

    if (!isClient && !isDriver) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    mission.status = 'cancelled';
    mission.cancelledAt = new Date();
    mission.cancelledBy = role === 'client' ? 'client' : 'driver';
    await mission.save();

    // Update driver profile if driver cancelled
    if (isDriver) {
      await Profile.findOneAndUpdate(
        { userId },
        { engaged: false }
      );
    }

    res.json(mission);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to cancel mission' });
  }
};

export const getActiveMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const role = req.role;

    console.log('🔍 getActiveMission userId:', userId, 'role:', role);

    let result = null;

    if (role === 'client') {
      // Clients still use Mission collection
      const query = { clientId: userId, status: { $in: ['pending', 'accepted', 'in_progress'] } };
      result = await Mission.findOne(query).sort({ createdAt: -1 });
    } else {
      // Drivers query Ride collection (new system)
      const ride = await Ride.findOne({ 
        driverId: new mongoose.Types.ObjectId(userId), 
        status: { $in: ['searching', 'assigned', 'accepted', 'driver_arrived', 'in_progress'] } 
      }).sort({ createdAt: -1 });

      console.log('🔍 Ride query driverId:', userId);
      console.log('🔍 Found ride:', ride ? {
        rideId: ride.rideId,
        driverId: ride.driverId?.toString(),
        status: ride.status
      } : null);

      if (ride) {
        // Map Ride fields to Mission-like shape for frontend compatibility
        result = {
          missionId: ride.rideId,
          clientId: ride.clientId,
          driverId: ride.driverId,
          status: ride.status === 'searching' ? 'pending' :
                  ride.status === 'assigned' ? 'pending' :
                  ride.status === 'accepted' ? 'accepted' :
                  ride.status === 'driver_arrived' ? 'accepted' :
                  ride.status === 'in_progress' ? 'in_progress' : ride.status,
          pickupLocation: ride.pickupLocation,
          destinationLocation: ride.destinationLocation,
          pricing: ride.pricing,
          distance: {
            clientToDestination: ride.distance.clientToDestination,
            driverToClient: ride.distance.driverToClient || 0,
          },
          eta: {
            clientToDestination: ride.eta.clientToDestination,
            driverToClient: ride.eta.driverToClient || 0,
          },
          requestedAt: ride.requestedAt,
          acceptedAt: ride.acceptedAt,
          startedAt: ride.startedAt,
          completedAt: ride.completedAt,
          cancelledAt: ride.cancelledAt,
          cancelledBy: ride.cancelledBy,
          createdAt: ride.createdAt,
          updatedAt: ride.updatedAt,
        };
      }
    }

    console.log('🔍 getActiveMission result:', result ? result.missionId || result._id : null);
    res.json(result || null);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get active mission' });
  }
};

export const getMissionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const role = req.role;

    const query = role === 'client'
      ? { clientId: userId }
      : { driverId: userId };

    const missions = await Mission.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get mission history' });
  }
};
