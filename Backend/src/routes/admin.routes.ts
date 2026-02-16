import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Mission } from '../models/Mission.js';
import { Ride } from '../models/Ride.js';
import { sendDriverApprovalNotification, sendDriverRejectionNotification } from '../services/notification.service.js';

const router = Router();

// Admin routes - require authentication
// TODO: Add admin role check middleware
// For now, we'll make it optional for development - you can add authentication later
// router.use(authenticate);

// Get all users with their profiles
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, role, banned } = req.query;
    
    // Build query
    const query: any = {};
    if (role) query.role = role;
    if (banned !== undefined) {
      // Need to check profile for banned status
      const bannedProfiles = await Profile.find({ banned: banned === 'true' }).select('userId');
      const bannedUserIds = bannedProfiles.map(p => p.userId.toString());
      query._id = { $in: bannedUserIds };
    }
    
    // Search by phone number or name
    let userIds: string[] = [];
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      const matchingProfiles = await Profile.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { city: searchRegex },
        ]
      }).select('userId');
      
      const matchingUsers = await User.find({
        phoneNumber: searchRegex
      }).select('_id');
      
      userIds = [
        ...matchingProfiles.map(p => p.userId.toString()),
        ...matchingUsers.map(u => u._id.toString())
      ];
      
      if (userIds.length > 0) {
        query._id = { ...(query._id || {}), $in: userIds };
      }
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const total = await User.countDocuments(query);
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));
    
    const profiles = await Profile.find({
      userId: { $in: users.map(u => u._id) }
    });
    
    // Get mission counts
    const userIdsList = users.map(u => u._id.toString());
    const missionCounts = await Mission.aggregate([
      { $match: { clientId: { $in: userIdsList } } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } }
    ]);
    
    // Combine users with their profiles
    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const missionCount = missionCounts.find(m => m._id === user._id.toString())?.count || 0;
      
      return {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        isDriverRequested: user.isDriverRequested,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: profile?.email,
        avatar: profile?.avatar,
        city: profile?.city || '',
        wilaya: profile?.city || '',
        vehicleType: profile?.vehicleType,
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        openToWork: profile?.openToWork || false,
        engaged: profile?.engaged || false,
        banned: profile?.banned || false,
        totalMissions: missionCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasMissions: missionCount > 0,
      };
    });

    res.json({
      status: 'success',
      data: {
        users: usersWithProfiles,
        pagination: {
          page: parseInt(page as string),
          pages: Math.ceil(total / parseInt(limit as string)),
          total,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch users' 
    });
  }
});

// Get all driver requests (users who requested to become drivers)
router.get('/driver-requests', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewed, approved, page = 1, limit = 20 } = req.query;
    
    // Find users who either:
    // 1. Have isDriverRequested = true (pending)
    // 2. Are now drivers (approved)
    // 3. Were rejected (we track this separately)
    
    const query: any = {
      $or: [
        { isDriverRequested: true },
        { role: 'driver' }
      ]
    };
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const total = await User.countDocuments(query);
    
    const users = await User.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));
    
    const profiles = await Profile.find({
      userId: { $in: users.map(u => u._id) }
    });

    const requests = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const isReviewed = user.role === 'driver' || !user.isDriverRequested;
      const isApproved = user.role === 'driver';
      
      return {
        _id: user._id,
        userId: user._id,
        phoneNumber: user.phoneNumber,
        submittedAt: user.updatedAt,
        reviewed: isReviewed,
        approved: isApproved,
        rejectionReason: null, // TODO: Track rejection reason
        profile: {
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
          phoneNumber: user.phoneNumber,
          city: profile?.city || '',
          wilaya: profile?.city || '',
          role: user.role,
          drivingLicense: profile?.drivingLicense?.url || null,
          grayCard: profile?.vehicleCard?.url || null,
          licenceId: profile?.drivingLicense?.number || null,
          grayCardId: profile?.vehicleCard?.number || null,
        },
      };
    });
    
    // Filter by status if requested
    let filteredRequests = requests;
    if (reviewed === 'true') filteredRequests = requests.filter(r => r.reviewed);
    if (reviewed === 'false') filteredRequests = requests.filter(r => !r.reviewed);
    if (approved === 'true') filteredRequests = requests.filter(r => r.approved);
    if (approved === 'false') filteredRequests = requests.filter(r => r.reviewed && !r.approved);

    res.json({
      status: 'success',
      data: {
        requests: filteredRequests,
        pagination: {
          page: parseInt(page as string),
          pages: Math.ceil(total / parseInt(limit as string)),
          total: filteredRequests.length,
        }
      },
      pending: requests.filter(r => !r.reviewed).length,
      approved: requests.filter(r => r.approved).length,
      rejected: requests.filter(r => r.reviewed && !r.approved).length,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch driver requests' 
    });
  }
});

// Approve driver request
router.post('/driver-requests/:userId/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { licenceId, grayCardId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
      return;
    }

    if (user.role === 'driver') {
      res.status(400).json({ 
        status: 'error',
        message: 'User is already a driver' 
      });
      return;
    }

    if (!user.isDriverRequested) {
      res.status(400).json({ 
        status: 'error',
        message: 'User has not requested to become a driver' 
      });
      return;
    }

    // Update user role to driver
    user.role = 'driver';
    user.isDriverRequested = false; // Reset request flag
    await user.save();

    // Update profile with license and card IDs if provided
    const profile = await Profile.findOne({ userId });
    if (profile) {
      if (licenceId && profile.drivingLicense) {
        profile.drivingLicense.number = licenceId;
      }
      if (grayCardId && profile.vehicleCard) {
        profile.vehicleCard.number = grayCardId;
      }
      profile.role = 'driver';
      await profile.save();
    }

    // Send push notification to the driver
    try {
      console.log(`📱 Sending driver approval notification to user ${userId}`);
      const notificationResult = await sendDriverApprovalNotification(userId);
      console.log(`✅ Driver approval notification result:`, notificationResult);
    } catch (error) {
      console.error('⚠️ Failed to send driver approval notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({
      status: 'success',
      message: 'Driver request approved successfully',
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to approve driver request' 
    });
  }
});

// Reject driver request
router.post('/driver-requests/:userId/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      res.status(400).json({ 
        status: 'error',
        message: 'Rejection reason is required' 
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
      return;
    }

    if (user.role === 'driver') {
      res.status(400).json({ 
        status: 'error',
        message: 'User is already a driver' 
      });
      return;
    }

    // Reset driver request flag
    user.isDriverRequested = false;
    await user.save();

    // TODO: Store rejection reason in a separate collection or add to User model
    // For now, we'll just reset the flag

    // Send push notification to the user
    try {
      await sendDriverRejectionNotification(userId, rejectionReason);
      console.log(`✅ Driver rejection notification sent to user ${userId}`);
    } catch (error) {
      console.error('⚠️ Failed to send driver rejection notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({
      status: 'success',
      message: 'Driver request rejected successfully',
      rejectionReason,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to reject driver request' 
    });
  }
});

// Get all drivers with stats
router.get('/drivers', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drivers = await User.find({ role: 'driver' }).sort({ createdAt: -1 });
    const profiles = await Profile.find();
    
    // Get mission stats for each driver
    const driverIds = drivers.map(d => d._id.toString());
    const missions = await Mission.find({ 
      driverId: { $in: driverIds },
      status: 'completed'
    });
    
    const driversWithStats = drivers.map(driver => {
      const profile = profiles.find(p => p.userId.toString() === driver._id.toString());
      const driverMissions = missions.filter(m => m.driverId?.toString() === driver._id.toString());
      const totalRevenue = driverMissions.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
      
      return {
        _id: driver._id,
        phoneNumber: driver.phoneNumber,
        role: driver.role,
        isVerified: driver.isVerified,
        isDriverRequested: driver.isDriverRequested,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: profile?.email,
        avatar: profile?.avatar,
        city: profile?.city || '',
        wilaya: profile?.city || '',
        vehicleType: profile?.vehicleType,
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        openToWork: profile?.openToWork || false,
        engaged: profile?.engaged || false,
        banned: profile?.banned || false,
        totalRevenue,
        totalMissions: driverMissions.length,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
      };
    });

    res.json({
      status: 'success',
      data: { drivers: driversWithStats },
      total: driversWithStats.length,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch drivers' 
    });
  }
});

// Get driver rankings
router.get('/drivers/rankings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type = 'top_revenue', limit = 10 } = req.query;
    
    const drivers = await User.find({ role: 'driver' });
    const profiles = await Profile.find();
    const missions = await Mission.find({ status: 'completed' });
    
    const driverStats = drivers.map(driver => {
      const profile = profiles.find(p => p.userId.toString() === driver._id.toString());
      const driverMissions = missions.filter(m => m.driverId?.toString() === driver._id.toString());
      const totalRevenue = driverMissions.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
      
      return {
        _id: driver._id,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phoneNumber: driver.phoneNumber,
        totalRevenue,
        totalMissions: driverMissions.length,
        rating: profile?.rating || 0,
        openToWork: profile?.openToWork || false,
      };
    });
    
    // Sort based on type
    let sorted = driverStats;
    switch (type) {
      case 'top_revenue':
        sorted = driverStats.sort((a, b) => b.totalRevenue - a.totalRevenue);
        break;
      case 'lowest_revenue':
        sorted = driverStats.sort((a, b) => a.totalRevenue - b.totalRevenue);
        break;
      case 'top_rated':
        sorted = driverStats.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest_rated':
        sorted = driverStats.sort((a, b) => a.rating - b.rating);
        break;
      case 'most_active':
        sorted = driverStats.sort((a, b) => b.totalMissions - a.totalMissions);
        break;
      case 'least_active':
        sorted = driverStats.sort((a, b) => a.totalMissions - b.totalMissions);
        break;
    }
    
    const rankings = sorted.slice(0, parseInt(limit as string));

    res.json({
      status: 'success',
      data: { rankings },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch driver rankings' 
    });
  }
});

// Ban/Unban user
router.patch('/users/:userId/ban', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { banned, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
      return;
    }

    // Update profile ban status
    const profile = await Profile.findOne({ userId });
    if (profile) {
      profile.banned = banned;
      await profile.save();
    }

    res.json({
      status: 'success',
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        banned,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update ban status' 
    });
  }
});

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const pendingDriverRequests = await User.countDocuments({ isDriverRequested: true });
    const bannedProfiles = await Profile.countDocuments({ banned: true });
    const totalMissions = await Mission.countDocuments();
    
    // Missions by status
    const missionsByStatus = await Mission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Total revenue from completed missions
    const revenueResult = await Mission.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    
    // Top drivers
    const topDrivers = await User.find({ role: 'driver' }).limit(5);
    const topDriverProfiles = await Profile.find({ userId: { $in: topDrivers.map(d => d._id) } });
    const topDriverMissions = await Mission.find({ driverId: { $in: topDrivers.map(d => d._id) } });
    
    const topDriversWithStats = topDrivers.map(driver => {
      const profile = topDriverProfiles.find(p => p.userId.toString() === driver._id.toString());
      const missions = topDriverMissions.filter(m => m.driverId?.toString() === driver._id.toString());
      return {
        _id: driver._id,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phoneNumber: driver.phoneNumber,
        rating: profile?.rating || 0,
        totalRevenue: missions.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0),
      };
    });
    
    // Recent missions
    const recentMissions = await Mission.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    // Add client and driver info
    const userIds = [...new Set([
      ...recentMissions.map(m => m.clientId?.toString()),
      ...recentMissions.map(m => m.driverId?.toString()).filter(Boolean)
    ])];
    const [recentProfiles, recentUsers] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }),
      User.find({ _id: { $in: userIds } }).select('phoneNumber'),
    ]);
    
    const missionsWithUsers = recentMissions.map(mission => {
      const clientProfile = recentProfiles.find(p => p.userId.toString() === mission.clientId?.toString());
      const driverProfile = recentProfiles.find(p => p.userId.toString() === mission.driverId?.toString());
      const clientUser = recentUsers.find(u => u._id.toString() === mission.clientId?.toString());
      const driverUser = recentUsers.find(u => u._id.toString() === mission.driverId?.toString());
      
      // Transform to frontend-compatible format
      return {
        _id: mission._id,
        missionId: mission.missionId,
        clientId: mission.clientId,
        driverId: mission.driverId,
        status: mission.status,
        pickup: {
          address: mission.pickupLocation?.address || '',
          wilaya: '',
          coordinates: {
            lat: mission.pickupLocation?.lat || 0,
            lng: mission.pickupLocation?.lng || 0,
          },
        },
        dropoff: {
          address: mission.destinationLocation?.address || '',
          wilaya: '',
          coordinates: {
            lat: mission.destinationLocation?.lat || 0,
            lng: mission.destinationLocation?.lng || 0,
          },
        },
        vehicleType: 'car',
        price: mission.pricing?.totalPrice || 0,
        distance: mission.distance?.clientToDestination || 0,
        duration: mission.eta?.clientToDestination || 0,
        scheduledAt: mission.requestedAt,
        completedAt: mission.completedAt,
        cancelledAt: mission.cancelledAt,
        cancellationReason: mission.cancelledBy ? `Cancelled by ${mission.cancelledBy}` : undefined,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        client: clientProfile ? {
          firstName: clientProfile.firstName,
          lastName: clientProfile.lastName,
          phoneNumber: clientUser?.phoneNumber,
        } : undefined,
        driver: driverProfile ? {
          firstName: driverProfile.firstName,
          lastName: driverProfile.lastName,
          phoneNumber: driverUser?.phoneNumber,
        } : undefined,
      };
    });

    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalClients,
        totalDrivers,
        pendingDriverRequests,
        bannedUsers: bannedProfiles,
        totalMissions,
        totalRevenue,
        missionsByStatus,
        topDrivers: topDriversWithStats,
        recentMissions: missionsWithUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch stats' 
    });
  }
});

// Get all missions
router.get('/missions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;
    
    const query: any = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }
    
    // Handle search - find matching missions by ID or address
    let missionIds: string[] = [];
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      
      // Search in missionId or addresses (using actual DB field names)
      const matchingMissions = await Mission.find({
        $or: [
          { missionId: searchRegex },
          { 'pickupLocation.address': searchRegex },
          { 'destinationLocation.address': searchRegex },
        ]
      }).select('_id');
      
      // Also search by user name
      const matchingProfiles = await Profile.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
        ]
      }).select('userId');
      
      const profileUserIds = matchingProfiles.map(p => p.userId.toString());
      
      const userMissions = await Mission.find({
        $or: [
          { clientId: { $in: profileUserIds } },
          { driverId: { $in: profileUserIds } },
        ]
      }).select('_id');
      
      missionIds = [
        ...matchingMissions.map(m => m._id.toString()),
        ...userMissions.map(m => m._id.toString())
      ];
      
      if (missionIds.length > 0) {
        query._id = { $in: missionIds };
      }
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const total = await Mission.countDocuments(query);
    
    let missions = await Mission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();
    
    // Add client and driver info - fetch all profiles and users in one query
    const userIds = [...new Set([
      ...missions.map(m => m.clientId?.toString()),
      ...missions.map(m => m.driverId?.toString()).filter(Boolean)
    ])];
    
    const [profiles, users] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }),
      User.find({ _id: { $in: userIds } }).select('phoneNumber'),
    ]);
    
    // Format missions with frontend-compatible structure
    const missionsWithUsers = missions.map(mission => {
      const clientProfile = profiles.find(p => p.userId.toString() === mission.clientId?.toString());
      const driverProfile = profiles.find(p => p.userId.toString() === mission.driverId?.toString());
      const clientUser = users.find(u => u._id.toString() === mission.clientId?.toString());
      const driverUser = users.find(u => u._id.toString() === mission.driverId?.toString());
      
      // Transform to frontend-compatible format
      return {
        _id: mission._id,
        missionId: mission.missionId,
        clientId: mission.clientId,
        driverId: mission.driverId,
        status: mission.status,
        // Transform pickupLocation -> pickup
        pickup: {
          address: mission.pickupLocation?.address || '',
          wilaya: '', // Not stored separately, could parse from address
          coordinates: {
            lat: mission.pickupLocation?.lat || 0,
            lng: mission.pickupLocation?.lng || 0,
          },
        },
        // Transform destinationLocation -> dropoff
        dropoff: {
          address: mission.destinationLocation?.address || '',
          wilaya: '', // Not stored separately
          coordinates: {
            lat: mission.destinationLocation?.lat || 0,
            lng: mission.destinationLocation?.lng || 0,
          },
        },
        vehicleType: 'car', // Default, not stored in mission
        price: mission.pricing?.totalPrice || 0,
        distance: mission.distance?.clientToDestination || 0,
        duration: mission.eta?.clientToDestination || 0,
        scheduledAt: mission.requestedAt,
        completedAt: mission.completedAt,
        cancelledAt: mission.cancelledAt,
        cancellationReason: mission.cancelledBy ? `Cancelled by ${mission.cancelledBy}` : undefined,
        rating: undefined, // Not stored yet
        notes: undefined,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        client: clientProfile ? {
          firstName: clientProfile.firstName,
          lastName: clientProfile.lastName,
          phoneNumber: clientUser?.phoneNumber,
        } : undefined,
        driver: driverProfile ? {
          firstName: driverProfile.firstName,
          lastName: driverProfile.lastName,
          phoneNumber: driverUser?.phoneNumber,
        } : undefined,
      };
    });

    res.json({
      status: 'success',
      data: {
        missions: missionsWithUsers,
        pagination: {
          page: parseInt(page as string),
          pages: Math.ceil(total / parseInt(limit as string)),
          total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch missions' 
    });
  }
});

// Get mission by ID
router.get('/missions/:missionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { missionId } = req.params;
    
    const mission = await Mission.findById(missionId).lean();
    if (!mission) {
      res.status(404).json({ status: 'error', message: 'Mission not found' });
      return;
    }
    
    const [clientProfile, driverProfile, clientUser, driverUser] = await Promise.all([
      Profile.findOne({ userId: mission.clientId }),
      mission.driverId ? Profile.findOne({ userId: mission.driverId }) : null,
      User.findById(mission.clientId).select('phoneNumber'),
      mission.driverId ? User.findById(mission.driverId).select('phoneNumber') : null,
    ]);

    // Transform to frontend-compatible format
    const transformedMission = {
      _id: mission._id,
      missionId: mission.missionId,
      clientId: mission.clientId,
      driverId: mission.driverId,
      status: mission.status,
      pickup: {
        address: mission.pickupLocation?.address || '',
        wilaya: '',
        coordinates: {
          lat: mission.pickupLocation?.lat || 0,
          lng: mission.pickupLocation?.lng || 0,
        },
      },
      dropoff: {
        address: mission.destinationLocation?.address || '',
        wilaya: '',
        coordinates: {
          lat: mission.destinationLocation?.lat || 0,
          lng: mission.destinationLocation?.lng || 0,
        },
      },
      vehicleType: 'car',
      price: mission.pricing?.totalPrice || 0,
      distance: mission.distance?.clientToDestination || 0,
      duration: mission.eta?.clientToDestination || 0,
      scheduledAt: mission.requestedAt,
      completedAt: mission.completedAt,
      cancelledAt: mission.cancelledAt,
      cancellationReason: mission.cancelledBy ? `Cancelled by ${mission.cancelledBy}` : undefined,
      rating: undefined,
      notes: undefined,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
      client: clientProfile ? {
        firstName: clientProfile.firstName,
        lastName: clientProfile.lastName,
        phoneNumber: clientUser?.phoneNumber,
      } : undefined,
      driver: driverProfile ? {
        firstName: driverProfile.firstName,
        lastName: driverProfile.lastName,
        phoneNumber: driverUser?.phoneNumber,
      } : undefined,
    };

    res.json({
      status: 'success',
      data: {
        mission: transformedMission,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch mission' 
    });
  }
});

// Update mission
router.put('/missions/:missionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { missionId } = req.params;
    const updateData = req.body;
    
    const mission = await Mission.findByIdAndUpdate(
      missionId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!mission) {
      res.status(404).json({ status: 'error', message: 'Mission not found' });
      return;
    }

    res.json({
      status: 'success',
      message: 'Mission updated successfully',
      data: { mission },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update mission' 
    });
  }
});

// Delete mission (Ride or Mission)
router.delete('/missions/:missionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { missionId } = req.params;
    
    // Try to delete from Ride collection first
    let ride = await Ride.findByIdAndDelete(missionId);
    if (ride) {
      res.json({
        status: 'success',
        message: 'Mission deleted successfully',
      });
      return;
    }
    
    // Try Mission collection as fallback
    let mission = await Mission.findByIdAndDelete(missionId);
    if (mission) {
      res.json({
        status: 'success',
        message: 'Mission deleted successfully',
      });
      return;
    }

    res.status(404).json({ status: 'error', message: 'Mission not found' });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete mission' 
    });
  }
});

// Get reports (placeholder)
router.get('/reports', async (req: AuthRequest, res: Response): Promise<void> => {
  // TODO: Implement reports collection
  res.json({
    status: 'success',
    data: { reports: [], pagination: { page: 1, pages: 1, total: 0 } },
  });
});

// Update report status (placeholder)
router.patch('/reports/:reportId', async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    status: 'success',
    message: 'Report updated',
  });
});

// Get fraud cases (placeholder)
router.get('/fraud', async (req: AuthRequest, res: Response): Promise<void> => {
  // TODO: Implement fraud detection collection
  res.json({
    status: 'success',
    data: { cases: [], pagination: { page: 1, pages: 1, total: 0 } },
  });
});

// Update fraud case (placeholder)
router.patch('/fraud/:caseId', async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    status: 'success',
    message: 'Fraud case updated',
  });
});

export default router;
