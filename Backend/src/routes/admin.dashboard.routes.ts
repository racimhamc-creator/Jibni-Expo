import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Mission } from '../models/Mission.js';
import { Ride } from '../models/Ride.js';
import { Report } from '../models/Report.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);

// Helper to check admin role
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Admin access required' 
    });
  }
  next();
};

// ==================== STATISTICS & ANALYTICS ====================

// Get dashboard stats
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
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
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get missions in period
    const missions = await Mission.find({
      createdAt: { $gte: startDate, $lte: now }
    });

    const completedMissions = missions.filter(m => m.status === 'completed');
    const totalRevenue = completedMissions.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
    
    // Get previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()));
    
    const prevMissions = await Mission.find({
      createdAt: { $gte: prevStartDate, $lt: startDate }
    });
    
    const prevCompleted = prevMissions.filter(m => m.status === 'completed');
    const prevRevenue = prevCompleted.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
    
    // Calculate growth
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Get active drivers count
    const activeDrivers = await Profile.countDocuments({ 
      role: 'driver',
      isOnline: true 
    });

    // Get total drivers
    const totalDrivers = await User.countDocuments({ role: 'driver' });

    // Calculate completion rate
    const completionRate = missions.length > 0 ? (completedMissions.length / missions.length) * 100 : 0;

    // Calculate average rating
    const driverProfiles = await Profile.find({ role: 'driver', rating: { $gt: 0 } });
    const avgRating = driverProfiles.length > 0 
      ? driverProfiles.reduce((sum, p) => sum + (p.rating || 0), 0) / driverProfiles.length 
      : 0;

    // Calculate average price
    const avgPrice = completedMissions.length > 0 
      ? totalRevenue / completedMissions.length 
      : 0;

    // Daily stats for calendar view
    const dailyStats: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayMissions = await Mission.find({
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      const dayCompleted = dayMissions.filter(m => m.status === 'completed');
      const dayRevenue = dayCompleted.reduce((sum, m) => sum + (m.pricing?.totalPrice || 0), 0);
      
      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        missions: dayCompleted.length,
        revenue: dayRevenue,
        rating: 0 // Would need to calculate from ratings
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Status breakdown
    const statusBreakdown = {
      PENDING: missions.filter(m => m.status === 'pending').length,
      ACTIVE: missions.filter(m => m.status === 'accepted' || m.status === 'in_progress').length,
      COMPLETED: completedMissions.length,
      CANCELLED: missions.filter(m => m.status === 'cancelled').length,
      REJECTED: missions.filter(m => m.status === 'rejected').length,
      TIMEOUT: missions.filter(m => m.status === 'timeout').length,
    };

    // Driver rankings
    const driverStats = await Profile.find({ role: 'driver' })
      .select('userId firstName lastName rating totalRevenue totalMissions vehicleType')
      .sort({ totalRevenue: -1 })
      .limit(10);

    const topDrivers = driverStats.slice(0, 3);
    const bottomDrivers = [...driverStats].reverse().slice(0, 3);
    const highestRated = await Profile.findOne({ role: 'driver' }).sort({ rating: -1 });
    const lowestRated = await Profile.findOne({ role: 'driver', rating: { $gt: 0 } }).sort({ rating: 1 });

    // Best/worst days
    const bestDay = dailyStats.reduce((max, day) => day.revenue > max.revenue ? day : max, dailyStats[0]);
    const busiestDay = dailyStats.reduce((max, day) => day.missions > max.missions ? day : max, dailyStats[0]);

    res.json({
      status: 'success',
      data: {
        summary: {
          totalMissions: completedMissions.length,
          totalRevenue,
          averagePrice: avgPrice,
          activeDrivers,
          totalDrivers,
          completionRate,
          averageRating: avgRating,
          revenueGrowth,
        },
        dailyStats,
        statusBreakdown,
        driverRankings: {
          top: topDrivers,
          bottom: bottomDrivers,
          highestRated,
          lowestRated,
        },
        bestDay,
        busiestDay,
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch dashboard stats'
    });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all clients (passengers)
router.get('/users/clients', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      banned, 
      hasMissions 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    let query: any = { role: 'client' };
    
    if (banned !== undefined) {
      query.isBanned = banned === 'true';
    }

    // Search by phone or name
    if (search) {
      const profiles = await Profile.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      }).select('userId');
      
      const userIds = profiles.map(p => p.userId);
      
      query.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { _id: { $in: userIds } }
      ];
    }

    // Get users with mission count
    const users = await User.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const userIds = users.map(u => u._id);
    
    // Get profiles
    const profiles = await Profile.find({ userId: { $in: userIds } });
    
    // Get mission counts
    const missionCounts = await Mission.aggregate([
      { $match: { clientId: { $in: userIds } } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } }
    ]);

    const total = await User.countDocuments(query);

    // Filter by hasMissions if specified
    let filteredUsers = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const missionCount = missionCounts.find(m => m._id.toString() === user._id.toString())?.count || 0;
      
      return {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        profile: profile ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
        } : null,
        missionCount,
      };
    });

    if (hasMissions === 'true') {
      filteredUsers = filteredUsers.filter(u => u.missionCount > 0);
    } else if (hasMissions === 'false') {
      filteredUsers = filteredUsers.filter(u => u.missionCount === 0);
    }

    res.json({
      status: 'success',
      data: {
        users: filteredUsers,
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

// Get all drivers
router.get('/users/drivers', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      banned, 
      isOnline,
      sortBy = 'createdAt'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    let query: any = { role: 'driver' };
    
    if (banned !== undefined) {
      query.isBanned = banned === 'true';
    }

    // Search
    if (search) {
      query.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get drivers
    const users = await User.find(query)
      .skip(skip)
      .limit(Number(limit));

    const userIds = users.map(u => u._id);
    
    // Get profiles
    let profileQuery: any = { userId: { $in: userIds }, role: 'driver' };
    if (search) {
      profileQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    if (isOnline !== undefined) {
      profileQuery.isOnline = isOnline === 'true';
    }
    
    const profiles = await Profile.find(profileQuery);

    // Get mission stats
    const missionStats = await Mission.aggregate([
      { $match: { driverId: { $in: userIds } } },
      { 
        $group: { 
          _id: '$driverId', 
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalPrice' }
        } 
      }
    ]);

    const total = await User.countDocuments(query);

    // Sort
    const sortMap: any = {
      createdAt: (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      rating: (a: any, b: any) => (b.profile?.rating || 0) - (a.profile?.rating || 0),
      revenue: (a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0),
      missions: (a: any, b: any) => (b.missionCount || 0) - (a.missionCount || 0),
    };

    let drivers = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const stats = missionStats.find(m => m._id.toString() === user._id.toString());
      
      return {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        profile: profile ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
          rating: profile.rating,
          totalRatings: profile.totalRatings,
          isOnline: profile.isOnline,
          city: profile.city,
          vehicleType: profile.vehicleType,
        } : null,
        missionCount: stats?.count || 0,
        totalRevenue: stats?.totalRevenue || 0,
      };
    });

    if (sortBy && sortMap[sortBy as string]) {
      drivers.sort(sortMap[sortBy as string]);
    }

    res.json({
      status: 'success',
      data: {
        drivers,
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
      message: error.message || 'Failed to fetch drivers'
    });
  }
});

// Ban/Unban user
router.post('/users/:userId/ban', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { ban = true, reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isBanned: ban,
        banReason: ban ? reason : undefined,
        bannedAt: ban ? new Date() : undefined
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({
      status: 'success',
      message: ban ? 'User banned successfully' : 'User unbanned successfully',
      data: { userId, isBanned: ban }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to ban/unban user'
    });
  }
});

// ==================== MISSION MANAGEMENT ====================

// Get all missions
router.get('/missions', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      status,
      startDate,
      endDate,
      driverId
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    let query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (driverId) {
      query.driverId = driverId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Search by missionId
    if (search) {
      query.missionId = { $regex: search, $options: 'i' };
    }

    const missions = await Mission.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('clientId', 'phoneNumber')
      .populate('driverId', 'phoneNumber');

    const total = await Mission.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        missions,
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
      message: error.message || 'Failed to fetch missions'
    });
  }
});

// Get mission details
router.get('/missions/:missionId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { missionId } = req.params;

    const mission = await Mission.findOne({ missionId })
      .populate('clientId', 'phoneNumber')
      .populate('driverId', 'phoneNumber');

    if (!mission) {
      return res.status(404).json({ status: 'error', message: 'Mission not found' });
    }

    res.json({
      status: 'success',
      data: mission
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch mission details'
    });
  }
});

// ==================== REPORTS & FRAUD ====================

// Get all reports
router.get('/reports', requireAdmin, async (req: AuthRequest, res: Response) => {
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

// Get fraud detection cases
router.get('/fraud', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, viewed } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query: any = {};
    if (viewed !== undefined) {
      query.isViewed = viewed === 'true';
    }

    // Mock fraud data (would need a Fraud model)
    const fraudCases: any[] = [];

    res.json({
      status: 'success',
      data: {
        fraudCases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch fraud cases'
    });
  }
});

export default router;
