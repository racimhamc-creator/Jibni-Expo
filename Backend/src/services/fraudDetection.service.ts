import { Fraud, IFraud } from '../models/Fraud';
import { Mission } from '../models/Mission';
import { User } from '../models/User';
import mongoose from 'mongoose';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationUpdate {
  missionId: string;
  clientId: string;
  driverId: string;
  clientLocation: Coordinates;
  driverLocation: Coordinates;
}

interface FraudAlert {
  type: string;
  message: string;
  timestamp: Date;
  location?: Coordinates;
}

class FraudDetectionService {
  private readonly ALERT_THRESHOLD = 3;
  private readonly CLIENT_MOVE_THRESHOLD = 200;
  private readonly MAX_DISTANCE_METERS = 10000;
  private readonly STALLED_DISTANCE_THRESHOLD = 500;
  private readonly MEET_DISTANCE_THRESHOLD = 100;

  private missionState: Map<string, {
    prevClientCoords: Coordinates | null;
    prevDriverCoords: Coordinates | null;
    prevDistance: number | null;
    clientMoveDistance: number;
    driverMoveDistance: number;
    alerts: FraudAlert[];
    met: boolean;
    lastUpdate: number;
  }> = new Map();

  calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000;
    const lat1 = coord1.lat * Math.PI / 180;
    const lat2 = coord2.lat * Math.PI / 180;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async processLocationUpdate(update: LocationUpdate): Promise<FraudAlert[]> {
    const { missionId, clientLocation, driverLocation } = update;
    const key = `${missionId}:${update.clientId}:${update.driverId}`;

    let state = this.missionState.get(key);
    if (!state) {
      state = {
        prevClientCoords: null,
        prevDriverCoords: null,
        prevDistance: null,
        clientMoveDistance: 0,
        driverMoveDistance: 0,
        alerts: [],
        met: false,
        lastUpdate: Date.now(),
      };
    }

    const alerts: FraudAlert[] = [];

    if (state.prevClientCoords) {
      const clientMoveDistance = this.calculateHaversineDistance(
        state.prevClientCoords,
        clientLocation
      );

      if (clientMoveDistance > this.CLIENT_MOVE_THRESHOLD) {
        const alert: FraudAlert = {
          type: 'client_moved',
          message: `Client moved ${Math.round(clientMoveDistance)}m since last update`,
          timestamp: new Date(),
          location: clientLocation,
        };
        alerts.push(alert);
        state.alerts.push(alert);
        state.clientMoveDistance += clientMoveDistance;
      }
    }

    if (state.prevDriverCoords) {
      const driverMoveDistance = this.calculateHaversineDistance(
        state.prevDriverCoords,
        driverLocation
      );
      state.driverMoveDistance += driverMoveDistance;
    }

    const currentDistance = this.calculateHaversineDistance(
      clientLocation,
      driverLocation
    );

    if (currentDistance > this.MAX_DISTANCE_METERS) {
      const alert: FraudAlert = {
        type: 'distance_too_far',
        message: `Distance between client and driver is ${Math.round(currentDistance)}m (${(currentDistance / 1000).toFixed(1)}km) - suspicious!`,
        timestamp: new Date(),
        location: clientLocation,
      };
      alerts.push(alert);
      state.alerts.push(alert);
    }

    if (!state.met && state.prevDistance !== null) {
      const distanceDiff = Math.abs(currentDistance - state.prevDistance);
      if (distanceDiff <= this.STALLED_DISTANCE_THRESHOLD && currentDistance > this.MEET_DISTANCE_THRESHOLD) {
        const alert: FraudAlert = {
          type: 'stalled_distance',
          message: `Distance remained stable at ${Math.round(currentDistance)}m - no progress toward meeting`,
          timestamp: new Date(),
          location: clientLocation,
        };
        alerts.push(alert);
        state.alerts.push(alert);
      }
    }

    if (!state.met && currentDistance <= this.MEET_DISTANCE_THRESHOLD) {
      state.met = true;
    }

    if (alerts.length > 0) {
      const riskScore = this.calculateRiskScore(state.alerts);
      
      let fraudCase = await Fraud.findOne({ missionId: new mongoose.Types.ObjectId(missionId) });

      if (fraudCase) {
        fraudCase.alerts = [...fraudCase.alerts, ...alerts];
        fraudCase.riskScore = riskScore;
        if (riskScore >= 70) {
          fraudCase.status = 'confirmed';
        }
        await fraudCase.save();
      } else if (state.alerts.length >= this.ALERT_THRESHOLD) {
        await Fraud.create({
          missionId: new mongoose.Types.ObjectId(missionId),
          clientId: new mongoose.Types.ObjectId(update.clientId),
          driverId: new mongoose.Types.ObjectId(update.driverId),
          alerts: state.alerts,
          riskScore,
          status: riskScore >= 70 ? 'confirmed' : 'pending',
          description: `Detected ${state.alerts.length} suspicious activities during mission`,
          evidence: state.alerts.map(a => a.message).join('; '),
          viewed: false,
        });
      }
    }

    state.prevClientCoords = clientLocation;
    state.prevDriverCoords = driverLocation;
    state.prevDistance = currentDistance;
    state.lastUpdate = Date.now();

    this.missionState.set(key, state);

    return alerts;
  }

  private calculateRiskScore(alerts: FraudAlert[]): number {
    let score = 0;

    for (const alert of alerts) {
      switch (alert.type) {
        case 'distance_too_far':
          score += 30;
          break;
        case 'client_moved':
          score += 20;
          break;
        case 'stalled_distance':
          score += 15;
          break;
        default:
          score += 10;
      }
    }

    return Math.min(100, score);
  }

  async getFraudCases(filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, page = 1, limit = 20 } = filters;
    
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const [cases, total] = await Promise.all([
      Fraud.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('clientId', 'firstName lastName phoneNumber')
        .populate('driverId', 'firstName lastName phoneNumber')
        .populate('missionId'),
      Fraud.countDocuments(query),
    ]);

    return {
      cases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFraudCaseById(caseId: string) {
    return Fraud.findById(caseId)
      .populate('clientId', 'firstName lastName phoneNumber email')
      .populate('driverId', 'firstName lastName phoneNumber email')
      .populate('missionId');
  }

  async updateFraudCase(caseId: string, status: string, action?: string) {
    const fraudCase = await Fraud.findById(caseId);
    if (!fraudCase) {
      throw new Error('Fraud case not found');
    }

    fraudCase.status = status as IFraud['status'];
    await fraudCase.save();

    if (action === 'ban' && fraudCase.clientId) {
      await User.findByIdAndUpdate(fraudCase.clientId, { isBanned: true });
    }

    return fraudCase;
  }

  async markAsViewed(caseId: string) {
    return Fraud.findByIdAndUpdate(caseId, { viewed: true }, { new: true });
  }

  clearMissionState(missionId: string) {
    for (const key of this.missionState.keys()) {
      if (key.startsWith(missionId)) {
        this.missionState.delete(key);
      }
    }
  }

  getMissionState(missionId: string) {
    const states = [];
    for (const [key, state] of this.missionState.entries()) {
      if (key.startsWith(missionId)) {
        states.push({ key, ...state });
      }
    }
    return states;
  }
}

export const fraudDetectionService = new FraudDetectionService();
