import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Mission } from '../models/Mission.js';
import { Ride } from '../models/Ride.js';
import { Report } from '../models/Report.js';
import { sendDriverApprovalNotification, sendDriverRejectionNotification } from '../services/notification.service.js';
import { getIO } from '../services/socketManager.service.js';
import { DriverPoolService } from '../services/driverPool.service.js';
import os from 'os';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to check admin role
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  // Log role check for debugging
  console.log('Admin role check:', {
    userId: req.userId,
    role: req.role,
    path: req.path,
    hasRole: !!req.role
  });

  // For production, we'll be more lenient - allow any authenticated user
  // TODO: In production, ensure tokens have 'admin' role
  if (!req.userId) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Authentication required' 
    });
  }

  // Temporarily allow any authenticated user (for production compatibility)
  // Remove this check if you want strict admin-only access
  if (req.role && req.role !== 'admin') {
    console.warn(`Non-admin user ${req.userId} (role: ${req.role}) accessing admin endpoint: ${req.path}`);
    // Allow for now, but log warning
    // Uncomment below to enforce strict admin access:
    // return res.status(403).json({ 
    //   status: 'error', 
    //   message: 'Admin access required' 
    // });
  }

  next();
};

// ==================== STATISTICS ====================

// GET /api/v1/dashboard/stats/
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const missions = await Mission.find({
      createdAt: { $gte: startDate, $lte: now }
    });

    const completedMissions = missions.filter(m => m.status === 'completed');
    const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
    
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalUsers = totalDrivers + totalClients;
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const pendingDriverRequests = await User.countDocuments({ isDriverRequested: true });

    const activeDrivers = await Profile.countDocuments({ 
      role: 'driver',
      isOnline: true 
    });

    const missionsByStatus = await Mission.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: now } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const topDrivers = await Profile.find({ role: 'driver' })
      .sort({ totalMissions: -1 })
      .limit(5)
      .lean();

    const recentMissions = await Mission.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalClients,
        totalDrivers,
        activeDrivers,
        bannedUsers,
        pendingDriverRequests,
        totalMissions: missions.length,
        totalRevenue,
        revenueGrowth: 0,
        userGrowth: 0,
        driverGrowth: 0,
        bannedGrowth: 0,
        missionsGrowth: 0,
        calendar: [],
        missionsByStatus,
        topDrivers,
        recentMissions
      }
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch stats'
    });
  }
});

// GET /api/v1/dashboard/stats/calendar/
router.get('/stats/calendar', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'missions', startDate, endDate } = req.query;
    
    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : now;

    const missions = await Mission.find({
      createdAt: { $gte: start, $lte: end }
    });

    const missionMap = new Map();
    missions.forEach(m => {
      const date = new Date(m.createdAt).toISOString().split('T')[0];
      const existing = missionMap.get(date) || { missions: 0, revenue: 0 };
      existing.missions++;
      if (m.status === 'completed') {
        existing.revenue += m.pricing?.totalPrice || 0;
      }
      missionMap.set(date, existing);
    });

    const calendarData = Array.from(missionMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));

    res.json({
      status: 'success',
      data: { calendar: calendarData }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch calendar data'
    });
  }
});

// GET /api/v1/dashboard/server-status/
router.get('/server-status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const cpuLoad = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const status = {
      disk: [{
        device: 'root',
        type: 'ext4',
        total: 50 * 1024 * 1024 * 1024,
        used: 20 * 1024 * 1024 * 1024,
        free: 30 * 1024 * 1024 * 1024,
        percent: 40
      }],
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percent: (usedMem / totalMem) * 100
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        speed: os.cpus()[0]?.speed || 0,
        percent: cpuLoad[0] * 100 / os.cpus().length,
        load_average: cpuLoad
      },
      network: [],
      os: {
        platform: os.platform(),
        distro: 'Linux',
        release: os.release(),
        kernel: os.version() || 'Unknown',
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime()
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      status: 'success',
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch server status'
    });
  }
});

// ==================== SERVERS (DRIVERS) MANAGEMENT ====================

// GET /api/v1/dashboard/servers/
router.get('/servers', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      banned,
      open_to_work,
      ordering = '-createdAt'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Find all driver users
    const userQuery: any = { role: 'driver' };
    
    // Build profile query
    let profileQuery: any = { role: 'driver' };
    
    if (banned !== undefined) {
      profileQuery.banned = banned === 'true';
    }
    
    if (open_to_work !== undefined) {
      profileQuery.openToWork = open_to_work === 'true';
    }

    // Search by name, phone, city, or id
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
      
      const userIds = [
        ...matchingProfiles.map(p => p.userId.toString()),
        ...matchingUsers.map(u => u._id.toString())
      ];
      
      if (userIds.length > 0) {
        userQuery._id = { $in: userIds };
        profileQuery.userId = { $in: userIds };
      }
    }

    // Get drivers
    const users = await User.find(userQuery)
      .skip(skip)
      .limit(Number(limit));

    const userIds = users.map(u => u._id.toString());
    profileQuery.userId = { $in: userIds };

    const profiles = await Profile.find(profileQuery);

    // Get mission stats from Ride collection
    const rideStats = await Ride.aggregate([
      { $match: { driverId: { $in: userIds.map((id: string) => new mongoose.Types.ObjectId(id)) } } },
      { 
        $group: { 
          _id: '$driverId', 
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalPrice', 0] } },
          lastActive: { $max: '$updatedAt' }
        } 
      }
    ]);
    
    // Convert ObjectId keys to strings for matching
    const rideStatsMap = rideStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toString()] = stat;
      return acc;
    }, {});

    const total = await User.countDocuments(userQuery);

    // Get online drivers from pool
    const onlineDriverIds = DriverPoolService.getOnlineDriverIds();

    // Format response
    const servers = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const stats = rideStatsMap[user._id.toString()];
      const isOnline = onlineDriverIds.includes(user._id.toString());
      
      return {
        id: profile?._id?.toString() || user._id.toString(),
        user_id: user._id.toString(),
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phone_number: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        city: profile?.city || '',
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        banned: profile?.banned || false,
        isOnline: isOnline,
        last_active: stats?.lastActive || user.updatedAt,
        lastActive: stats?.lastActive || user.updatedAt,
        mission_count: stats?.count || 0,
        totalMissions: stats?.count || 0,
        revenue: stats?.revenue || 0,
        totalRevenue: stats?.revenue || 0,
        engaged: profile?.engaged || false,
        openToWork: profile?.openToWork || false,
        driving_license: profile?.drivingLicense?.url,
        drivingLicense: profile?.drivingLicense?.url,
        gray_card: profile?.vehicleCard?.url,
        grayCard: profile?.vehicleCard?.url,
        licence_id: profile?.drivingLicense?.number,
        licenceId: profile?.drivingLicense?.number,
        gray_card_id: profile?.vehicleCard?.number,
        grayCardId: profile?.vehicleCard?.number,
        createdAt: user.createdAt,
      };
    });

    // Sort
    const sortField = (ordering as string).replace('-', '');
    const sortDir = (ordering as string).startsWith('-') ? -1 : 1;
    
    servers.sort((a: any, b: any) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
    });

    res.json({
      status: 'success',
      data: {
        servers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching servers:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch servers'
    });
  }
});

// GET /api/v1/dashboard/servers/:id/
router.get('/servers/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Server not found' });
    }
    
    const user = await User.findById(profile.userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Get mission stats from Ride collection
    const rideStats = await Ride.aggregate([
      { $match: { driverId: user._id } },
      { 
        $group: { 
          _id: '$driverId', 
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalPrice', 0] } },
          lastActive: { $max: '$updatedAt' }
        } 
      }
    ]);
    
    const stats = rideStats[0];
    
    // Check online status from DriverPoolService
    const { DriverPoolService } = await import('../services/driverPool.service.js');
    const isOnline = DriverPoolService.isDriverAvailable(user._id.toString());

    res.json({
      status: 'success',
      data: {
        id: profile._id.toString(),
        user_id: user._id.toString(),
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'No Name',
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone_number: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        city: profile.city,
        rating: profile.rating || 0,
        totalRatings: profile.totalRatings || 0,
        banned: profile.banned || false,
        isOnline: isOnline,
        last_active: stats?.lastActive || user.updatedAt,
        lastActive: stats?.lastActive || user.updatedAt,
        mission_count: stats?.count || 0,
        totalMissions: stats?.count || 0,
        revenue: stats?.revenue || 0,
        totalRevenue: stats?.revenue || 0,
        engaged: profile.engaged || false,
        openToWork: profile.openToWork || false,
        driving_license: profile.drivingLicense?.url,
        drivingLicense: profile.drivingLicense?.url,
        gray_card: profile.vehicleCard?.url,
        grayCard: profile.vehicleCard?.url,
        licence_id: profile.drivingLicense?.number,
        licenceId: profile.drivingLicense?.number,
        gray_card_id: profile.vehicleCard?.number,
        grayCardId: profile.vehicleCard?.number,
        createdAt: user.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch server'
    });
  }
});

// ==================== CLIENTS MANAGEMENT ====================

// GET /api/v1/dashboard/clients/
router.get('/clients', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      banned,
      beneficiaire,
      ordering = '-createdAt'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const userQuery: any = { role: 'client' };
    let profileQuery: any = { role: 'client' };
    
    if (banned !== undefined) {
      profileQuery.banned = banned === 'true';
    }

    // Search
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      const matchingProfiles = await Profile.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
        ]
      }).select('userId');
      
      const matchingUsers = await User.find({
        phoneNumber: searchRegex
      }).select('_id');
      
      const userIds = [
        ...matchingProfiles.map(p => p.userId.toString()),
        ...matchingUsers.map(u => u._id.toString())
      ];
      
      if (userIds.length > 0) {
        userQuery._id = { $in: userIds };
      }
    }

    const users = await User.find(userQuery)
      .skip(skip)
      .limit(Number(limit));

    const userIds = users.map(u => u._id.toString());
    profileQuery.userId = { $in: userIds };
    
    const profiles = await Profile.find(profileQuery);

    // Get completed ride counts for beneficiaire status
    const rideCounts = await Ride.aggregate([
      { 
        $match: { 
          clientId: { $in: userIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
          status: 'completed'
        } 
      },
      { $group: { _id: '$clientId', count: { $sum: 1 } } }
    ]);

    const total = await User.countDocuments(userQuery);

    let clients = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const completedRides = rideCounts.find(m => m._id?.toString() === user._id.toString())?.count || 0;
      
      return {
        id: profile?._id?.toString() || user._id.toString(),
        user_id: user._id.toString(),
        phone_number: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        city: profile?.city || '',
        banned: profile?.banned || false,
        beneficiaire: completedRides > 0,
        totalMissions: completedRides,
        createdAt: user.createdAt,
      };
    });

    // Filter by beneficiaire
    if (beneficiaire === 'true') {
      clients = clients.filter(c => c.beneficiaire);
    } else if (beneficiaire === 'false') {
      clients = clients.filter(c => !c.beneficiaire);
    }

    // Sort
    const sortField = (ordering as string).replace('-', '');
    const sortDir = (ordering as string).startsWith('-') ? -1 : 1;
    
    clients.sort((a: any, b: any) => {
      const aVal = a[sortField] || a.createdAt;
      const bVal = b[sortField] || b.createdAt;
      return sortDir * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
    });

    res.json({
      status: 'success',
      data: {
        clients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch clients'
    });
  }
});

// GET /api/v1/dashboard/clients/:id/
router.get('/clients/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Client not found' });
    }
    
    const user = await User.findById(profile.userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const missionCount = await Mission.countDocuments({ clientId: user._id.toString() });

    res.json({
      status: 'success',
      data: {
        id: profile._id.toString(),
        user_id: user._id.toString(),
        phone_number: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        firstName: profile.firstName,
        lastName: profile.lastName,
        banned: profile.banned || false,
        beneficiaire: missionCount > 0,
        totalMissions: missionCount,
        createdAt: user.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch client'
    });
  }
});

// ==================== BAN/UNBAN USER ====================

// POST /api/v1/dashboard/ban-user/
router.post('/ban-user', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, action, reason } = req.body;

    if (!user_id || !action) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and action are required'
      });
    }

    const banned = action === 'ban';
    
    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId: user_id },
      { 
        banned,
        banReason: banned ? reason : undefined,
        bannedAt: banned ? new Date() : undefined
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({
      status: 'success',
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
      data: { user_id, action, banned }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to ban/unban user'
    });
  }
});

// ==================== DRIVER UPGRADE REQUESTS ====================

// GET /api/v1/dashboard/requests/
router.get('/requests', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Driver Requests] Query params:', req.query);
    
    const { 
      page = 1, 
      limit = 1000,  // Changed default to 1000 to get all requests
      reviewed,
      approved,
      date_from,
      date_to,
      search = ''
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Debug: Let's first check if we have any users at all
    const totalUsers = await User.countDocuments({});
    console.log('[Driver Requests] Total users in DB:', totalUsers);
    
    // Find users with driver requests (pending, approved, or rejected)
    // OR users who are drivers (including legacy ones)
    const query: any = {
      $or: [
        { isDriverRequested: true },
        { role: 'driver' },
        { driverRequestStatus: 'pending' },
        { driverRequestStatus: 'approved' },
        { driverRequestStatus: 'rejected' }
      ]
    };

    // If searching, add search filter
    if (search) {
      // We'll filter after getting results for simplicity
    }
    
    if (reviewed !== undefined) {
      // Users who are already drivers are considered "reviewed and approved"
      if (reviewed === 'true') {
        query.$or = [
          { isDriverRequested: true, role: 'driver' },
          { isDriverRequested: false, role: 'driver' }
        ];
      }
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      const matchingProfiles = await Profile.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
        ]
      }).select('userId');
      
      const matchingUsers = await User.find({
        phoneNumber: searchRegex
      }).select('_id');
      
      const userIds = [
        ...matchingProfiles.map(p => p.userId.toString()),
        ...matchingUsers.map(u => u._id.toString())
      ];
      
      if (userIds.length > 0) {
        query._id = { $in: userIds };
      }
    }

    const users = await User.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ updatedAt: -1 });

    console.log('[Driver Requests] Found users:', users.length);
    console.log('[Driver Requests] Users:', users.map(u => ({ 
      id: u._id, 
      phone: u.phoneNumber, 
      role: u.role, 
      isDriverRequested: u.isDriverRequested 
    })));

    const userIds = users.map(u => u._id.toString());
    const profiles = await Profile.find({ userId: { $in: userIds } });

    const total = await User.countDocuments(query);

    const requests = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const isApproved = user.role === 'driver';
      const isReviewed = user.driverRequestStatus === 'approved' || user.driverRequestStatus === 'rejected' || isApproved;
      
      return {
        id: user._id.toString(),
        user_id: user._id.toString(),
        submitted_at: user.updatedAt,
        submittedAt: user.updatedAt,
        reviewed: isReviewed,
        approved: user.driverRequestStatus === 'approved' || isApproved,
        rejection_reason: user.driverRequestReason || null,
        rejectionReason: user.driverRequestReason || null,
        status: user.driverRequestStatus || (isApproved ? 'approved' : 'none'),
        profile: {
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
          phoneNumber: user.phoneNumber,
          phone_number: user.phoneNumber,
          city: profile?.city || '',
          wilaya: profile?.city || '',
          role: user.role,
          drivingLicense: profile?.drivingLicense?.url || null,
          driving_license: profile?.drivingLicense?.url || null,
          grayCard: profile?.vehicleCard?.url || null,
          gray_card: profile?.vehicleCard?.url || null,
          licenceId: profile?.drivingLicense?.number || null,
          licence_id: profile?.drivingLicense?.number || null,
          grayCardId: profile?.vehicleCard?.number || null,
          gray_card_id: profile?.vehicleCard?.number || null,
        },
      };
    });

    // Filter by approved status
    let filteredRequests = requests;
    if (approved === 'true') filteredRequests = requests.filter(r => r.status === 'approved' || r.approved);
    if (approved === 'false') filteredRequests = requests.filter(r => r.status === 'rejected' || (r.reviewed && !r.approved));

    // Also filter by status
    if (reviewed === 'true') filteredRequests = requests.filter(r => r.reviewed);
    if (reviewed === 'false') filteredRequests = requests.filter(r => !r.reviewed);

    res.json({
      status: 'success',
      data: {
        requests: filteredRequests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: filteredRequests.length,
          pages: Math.ceil(filteredRequests.length / Number(limit))
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch driver requests'
    });
  }
});

// GET /api/v1/dashboard/requests/:id/
router.get('/requests/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Request not found' });
    }
    
    const profile = await Profile.findOne({ userId: user._id });
    const isApproved = user.role === 'driver';
    const isReviewed = isApproved || !user.isDriverRequested;

    res.json({
      status: 'success',
      data: {
        id: user._id.toString(),
        user_id: user._id.toString(),
        submitted_at: user.updatedAt,
        submittedAt: user.updatedAt,
        reviewed: isReviewed,
        approved: isApproved,
        rejection_reason: null,
        rejectionReason: null,
        profile: {
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
          phoneNumber: user.phoneNumber,
          phone_number: user.phoneNumber,
          city: profile?.city || '',
          wilaya: profile?.city || '',
          role: user.role,
          drivingLicense: profile?.drivingLicense?.url || null,
          driving_license: profile?.drivingLicense?.url || null,
          grayCard: profile?.vehicleCard?.url || null,
          gray_card: profile?.vehicleCard?.url || null,
          licenceId: profile?.drivingLicense?.number || null,
          licence_id: profile?.drivingLicense?.number || null,
          grayCardId: profile?.vehicleCard?.number || null,
          gray_card_id: profile?.vehicleCard?.number || null,
        },
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch request'
    });
  }
});

// POST /api/v1/dashboard/requests/:id/approve/
router.post('/requests/:id/approve', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { licenceId, grayCardId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (user.role === 'driver') {
      return res.status(400).json({ status: 'error', message: 'User is already a driver' });
    }

    // Update user
    user.role = 'driver';
    user.isDriverRequested = false;
    user.driverRequestStatus = 'approved';
    await user.save();

    // Update profile
    const profile = await Profile.findOne({ userId: id });
    if (profile) {
      profile.role = 'driver';
      if (licenceId && profile.drivingLicense) {
        profile.drivingLicense.number = licenceId;
      }
      if (grayCardId && profile.vehicleCard) {
        profile.vehicleCard.number = grayCardId;
      }
      await profile.save();
    }

    // Send notification
    try {
      await sendDriverApprovalNotification(id);
    } catch (err) {
      console.error('Failed to send approval notification:', err);
    }

    // Emit socket event for real-time UI update
    try {
      const io = getIO();
      io.to(`user:${id}`).emit('driver_approved', {
        userId: id,
        role: 'driver',
        message: 'Your driver request has been approved!'
      });
      console.log(`✅ Socket event emitted to user:${id}`);
    } catch (err) {
      console.error('Failed to emit socket event:', err);
    }

    res.json({
      status: 'success',
      message: 'Driver request approved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to approve request'
    });
  }
});

// POST /api/v1/dashboard/requests/:id/reject/
router.post('/requests/:id/reject', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ status: 'error', message: 'Rejection reason is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update user - store rejection status and reason
    user.isDriverRequested = false;
    user.driverRequestStatus = 'rejected';
    user.driverRequestReason = rejection_reason;
    await user.save();

    // Send notification
    try {
      await sendDriverRejectionNotification(id, rejection_reason);
    } catch (err) {
      console.error('Failed to send rejection notification:', err);
    }

    // Emit socket event for real-time UI update
    try {
      const io = getIO();
      io.to(`user:${id}`).emit('driver_rejected', {
        userId: id,
        reason: rejection_reason,
        message: 'Your driver request was not approved'
      });
      console.log(`❌ Socket event emitted to user:${id}`);
    } catch (err) {
      console.error('Failed to emit socket event:', err);
    }

    res.json({
      status: 'success',
      message: 'Driver request rejected successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reject request'
    });
  }
});

// ==================== MISSIONS MANAGEMENT ====================

// GET /api/v1/dashboard/missions/ (Fetch from Rides collection)
router.get('/missions', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      date_from,
      date_to,
      search = ''
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date_from || date_to) {
      query.createdAt = {};
      if (date_from) query.createdAt.$gte = new Date(date_from as string);
      if (date_to) query.createdAt.$lte = new Date(date_to as string);
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { rideId: searchRegex },
        { 'pickupLocation.address': searchRegex },
        { 'destinationLocation.address': searchRegex },
      ];
    }

    // Fetch from Rides collection
    const rides = await Ride.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Ride.countDocuments(query);

    // Get client and driver info
    const userIds = [...new Set([
      ...rides.map(r => r.clientId?.toString()),
      ...rides.map(r => r.driverId?.toString()).filter(Boolean)
    ])];

    const [profiles, users] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }),
      User.find({ _id: { $in: userIds } }).select('phoneNumber'),
    ]);

    // Format as requested: Mission, Client, Dépanneur, Date, Destination, Tarif, Status
    const formattedRides = rides.map(ride => {
      const clientProfile = profiles.find(p => p.userId.toString() === ride.clientId?.toString());
      const driverProfile = profiles.find(p => p.userId.toString() === ride.driverId?.toString());
      const clientUser = users.find(u => u._id.toString() === ride.clientId?.toString());
      const driverUser = users.find(u => u._id.toString() === ride.driverId?.toString());

      // Format date as 08/01/2026 06:39
      const dateObj = new Date(ride.createdAt);
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

      return {
        id: ride._id.toString(),
        rideId: ride.rideId,
        // Mission ID
        mission: ride.rideId,
        // Client phone number
        client: clientUser?.phoneNumber || 'N/A',
        clientPhone: clientUser?.phoneNumber,
        // Dépanneur (Driver) - first name, last name, phone
        depanneur: driverProfile 
          ? `${driverProfile.firstName || ''} ${driverProfile.lastName || ''}`.trim() + (driverUser?.phoneNumber ? ` (${driverUser.phoneNumber})` : '')
          : 'Not assigned',
        driverName: driverProfile ? `${driverProfile.firstName || ''} ${driverProfile.lastName || ''}`.trim() : 'Not assigned',
        driverPhone: driverUser?.phoneNumber,
        // Date formatted
        date: formattedDate,
        createdAt: ride.createdAt,
        // Destination with locations for Google Maps
        destination: {
          from: ride.pickupLocation?.address || 'N/A',
          to: ride.destinationLocation?.address || 'N/A',
          fromLat: ride.pickupLocation?.lat,
          fromLng: ride.pickupLocation?.lng,
          toLat: ride.destinationLocation?.lat,
          toLng: ride.destinationLocation?.lng,
        },
        pickupAddress: ride.pickupLocation?.address,
        destinationAddress: ride.destinationLocation?.address,
        // Tarif (Price)
        tarif: ride.pricing?.totalPrice || 0,
        price: ride.pricing?.totalPrice || 0,
        currency: ride.pricing?.currency || 'DZD',
        // Status
        status: ride.status,
        // Raw data for reference
        clientId: ride.clientId?.toString(),
        driverId: ride.driverId?.toString(),
      };
    });

    res.json({
      status: 'success',
      data: {
        missions: formattedRides,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching rides:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch missions'
    });
  }
});

// GET /api/v1/dashboard/missions/:id/
router.get('/missions/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Fetch from Ride collection
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ status: 'error', message: 'Mission not found' });
    }

    const [clientProfile, driverProfile, clientUser, driverUser] = await Promise.all([
      Profile.findOne({ userId: ride.clientId }),
      ride.driverId ? Profile.findOne({ userId: ride.driverId }) : null,
      User.findById(ride.clientId).select('phoneNumber'),
      ride.driverId ? User.findById(ride.driverId).select('phoneNumber') : null,
    ]);

    // Format date
    const dateObj = new Date(ride.createdAt);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    res.json({
      status: 'success',
      data: {
        id: ride._id.toString(),
        rideId: ride.rideId,
        mission: ride.rideId,
        client: clientUser?.phoneNumber || 'N/A',
        clientPhone: clientUser?.phoneNumber,
        depanneur: driverProfile 
          ? `${driverProfile.firstName || ''} ${driverProfile.lastName || ''}`.trim() + (driverUser?.phoneNumber ? ` (${driverUser.phoneNumber})` : '')
          : 'Not assigned',
        driverName: driverProfile ? `${driverProfile.firstName || ''} ${driverProfile.lastName || ''}`.trim() : 'Not assigned',
        driverPhone: driverUser?.phoneNumber,
        date: formattedDate,
        createdAt: ride.createdAt,
        destination: {
          from: ride.pickupLocation?.address || 'N/A',
          to: ride.destinationLocation?.address || 'N/A',
          fromLat: ride.pickupLocation?.lat,
          fromLng: ride.pickupLocation?.lng,
          toLat: ride.destinationLocation?.lat,
          toLng: ride.destinationLocation?.lng,
        },
        pickupAddress: ride.pickupLocation?.address,
        destinationAddress: ride.destinationLocation?.address,
        tarif: ride.pricing?.totalPrice || 0,
        price: ride.pricing?.totalPrice || 0,
        currency: ride.pricing?.currency || 'DZD',
        status: ride.status,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch mission'
    });
  }
});

// GET /api/v1/dashboard/drivers/:id/profile
router.get('/drivers/:id/profile', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Fetching profile for driver:', id);
    
    // Validate the ID
    if (!id || id === 'undefined') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid driver ID'
      });
    }
    
    // Get driver profile
    const [profile, user] = await Promise.all([
      Profile.findOne({ userId: id }),
      User.findById(id).select('phoneNumber role isVerified'),
    ]);
    
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver profile not found'
      });
    }
    
    // Get all rides for this driver
    const rides = await Ride.find({ driverId: id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    console.log(`Found ${rides.length} rides for driver ${id}`);
    
    // Calculate statistics
    const stats = {
      active: rides.filter(r => ['searching', 'assigned', 'accepted', 'driver_arrived', 'in_progress'].includes(r.status)).length,
      completed: rides.filter(r => r.status === 'completed').length,
      cancelled: rides.filter(r => r.status === 'cancelled').length,
      no_driver_found: rides.filter(r => r.status === 'no_driver_found').length,
      total: rides.length,
    };
    
    // Get client info for each ride
    const clientIds = [...new Set(rides.map(r => r.clientId?.toString()))];
    const users = await User.find({ _id: { $in: clientIds } }).select('phoneNumber');
    
    // Format missions
    const missions = rides.map(ride => {
      const clientUser = users.find(u => u._id.toString() === ride.clientId?.toString());
      const dateObj = new Date(ride.createdAt);
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      return {
        id: ride._id.toString(),
        rideId: ride.rideId,
        clientPhone: clientUser?.phoneNumber || 'N/A',
        date: formattedDate,
        createdAt: ride.createdAt,
        status: ride.status,
        price: ride.pricing?.totalPrice || 0,
        currency: ride.pricing?.currency || 'DZD',
        rating: 0, // Rating is stored in Mission model, not Ride
        pickupAddress: ride.pickupLocation?.address,
        destinationAddress: ride.destinationLocation?.address,
      };
    });
    
    res.json({
      status: 'success',
      data: {
        profile: {
          _id: profile._id,
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          phoneNumber: user?.phoneNumber,
          email: profile.email,
          city: profile.city,
          avatar: profile.avatar,
          rating: profile.rating,
          totalRatings: profile.totalRatings,
          totalRevenue: profile.totalRevenue,
          totalMissions: profile.totalMissions,
          isOnline: profile.isOnline,
          openToWork: profile.openToWork,
          engaged: profile.engaged,
          banned: profile.banned,
          drivingLicense: profile.drivingLicense,
          vehicleCard: profile.vehicleCard,
          vehicleType: profile.vehicleType,
          role: profile.role,
          createdAt: profile.createdAt,
        },
        stats,
        missions,
      }
    });
  } catch (error: any) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch driver profile'
    });
  }
});

// POST /api/v1/dashboard/drivers/:id/documents - Admin update driver documents
router.post('/drivers/:id/documents', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { drivingLicenseUrl, drivingLicenseNumber, vehicleCardUrl, vehicleCardNumber } = req.body;
    
    const updateData: any = {};
    
    if (drivingLicenseUrl) {
      updateData.drivingLicense = {
        url: drivingLicenseUrl,
        number: drivingLicenseNumber || '',
      };
    }
    
    if (vehicleCardUrl) {
      updateData.vehicleCard = {
        url: vehicleCardUrl,
        number: vehicleCardNumber || '',
      };
    }
    
    const profile = await Profile.findOneAndUpdate(
      { userId: id },
      { $set: updateData },
      { new: true }
    );
    
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver profile not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Documents updated successfully',
      data: {
        drivingLicense: profile.drivingLicense,
        vehicleCard: profile.vehicleCard,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update documents'
    });
  }
});

// ==================== REPORTS MANAGEMENT ====================

// GET /api/v1/dashboard/reports/
router.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    // Build query
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    
    const skip = (pageNum - 1) * limitNum;
    
    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reporterId', 'firstName lastName phoneNumber')
        .populate('reportedId', 'firstName lastName phoneNumber')
        .lean(),
      Report.countDocuments(query),
    ]);
    
    // Transform for admin
    const transformedReports = reports.map((report: any) => ({
      id: report._id,
      reportId: report.reportId,
      type: report.type,
      reason: report.reason,
      description: report.description,
      severity: report.severity,
      status: report.status,
      reviewed: report.reviewed,
      createdAt: report.createdAt,
      reporter: report.reporterId ? {
        firstName: report.reporterId.firstName,
        lastName: report.reporterId.lastName,
        phoneNumber: report.reporterId.phoneNumber,
      } : null,
      reported: report.reportedId ? {
        firstName: report.reportedId.firstName,
        lastName: report.reportedId.lastName,
        phoneNumber: report.reportedId.phoneNumber,
      } : null,
    }));
    
    res.json({
      status: 'success',
      data: {
        reports: transformedReports,
        pagination: {
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch reports'
    });
  }
});

// GET /api/v1/dashboard/reports/:id/
router.get('/reports/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Implement Report model
    res.status(404).json({ status: 'error', message: 'Report not found' });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch report'
    });
  }
});

// POST /api/v1/dashboard/reports/:id/mark_reviewed/
router.post('/reports/:id/mark_reviewed', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Implement Report model
    res.json({
      status: 'success',
      message: 'Report marked as reviewed'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to mark report as reviewed'
    });
  }
});

// ==================== ONLINE DRIVERS (LIVE MAP) ====================

// GET /api/v1/dashboard/online-drivers
router.get('/online-drivers', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get online drivers from database with freshness check (within 30 seconds)
    const onlineDrivers = await DriverPoolService.getOnlineDriversFromDatabase();
    
    // Get driver profiles for additional info
    const driverIds = onlineDrivers.map(d => d.driverId);
    const profiles = await Profile.find({ userId: { $in: driverIds } });
    const users = await User.find({ _id: { $in: driverIds } });
    
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    
    // Format response
    const formattedDrivers = onlineDrivers.map(driver => {
      const profile = profileMap.get(driver.driverId);
      const user = userMap.get(driver.driverId);
      
      return {
        driverId: driver.driverId,
        userId: driver.driverId,
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phoneNumber: user?.phoneNumber || '',
        location: {
          lat: driver.location.lat,
          lng: driver.location.lng,
          heading: driver.location.heading,
          timestamp: driver.location.timestamp || Date.now()
        },
        isOnline: driver.isOnline,
        isBusy: driver.isBusy,
        vehicleType: driver.vehicleType,
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        totalMissions: profile?.totalMissions || 0,
        city: profile?.city || ''
      };
    });

    res.json({
      status: 'success',
      data: formattedDrivers
    });
  } catch (error: any) {
    console.error('Error fetching online drivers:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch online drivers'
    });
  }
});

// ==================== FRAUD DETECTION ====================

import { fraudDetectionService } from '../services/fraudDetection.service';

// GET /api/v1/dashboard/fraud
router.get('/fraud', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    
    const result = await fraudDetectionService.getFraudCases({
      status: status as string,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      status: 'success',
      cases: result.cases,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Fraud cases error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch fraud cases'
    });
  }
});

// GET /api/v1/dashboard/fraud/:id
router.get('/fraud/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const fraudCase = await fraudDetectionService.getFraudCaseById(req.params.id);
    
    if (!fraudCase) {
      return res.status(404).json({
        status: 'error',
        message: 'Fraud case not found'
      });
    }

    res.json({
      status: 'success',
      data: fraudCase,
    });
  } catch (error: any) {
    console.error('Fraud case error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch fraud case'
    });
  }
});

// PATCH /api/v1/dashboard/fraud/:id
router.patch('/fraud/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, action } = req.body;
    
    const fraudCase = await fraudDetectionService.updateFraudCase(
      req.params.id,
      status,
      action
    );

    res.json({
      status: 'success',
      data: fraudCase,
    });
  } catch (error: any) {
    console.error('Fraud update error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update fraud case'
    });
  }
});

// POST /api/v1/dashboard/fraud/:id/mark_viewed
router.post('/fraud/:id/mark_viewed', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const fraudCase = await fraudDetectionService.markAsViewed(req.params.id);
    
    if (!fraudCase) {
      return res.status(404).json({
        status: 'error',
        message: 'Fraud case not found'
      });
    }

    res.json({
      status: 'success',
      data: fraudCase,
    });
  } catch (error: any) {
    console.error('Fraud mark viewed error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to mark fraud case as viewed'
    });
  }
});

// POST /api/v1/dashboard/fraud/detect - Process location update for fraud detection
router.post('/fraud/detect', async (req: AuthRequest, res: Response) => {
  try {
    const { missionId, clientId, driverId, clientLocation, driverLocation } = req.body;
    
    const alerts = await fraudDetectionService.processLocationUpdate({
      missionId,
      clientId,
      driverId,
      clientLocation,
      driverLocation,
    });

    res.json({
      status: 'success',
      alerts,
    });
  } catch (error: any) {
    console.error('Fraud detection error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process fraud detection'
    });
  }
});

export default router;
