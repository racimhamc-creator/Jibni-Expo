import { redisClient } from '../config/redis.js';
import { Profile } from '../models/Profile.js';

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  timestamp: number;
}

interface DriverInfo {
  driverId: string;
  socketId: string;
  location: DriverLocation;
  isOnline: boolean;
  isBusy: boolean;
  vehicleType: string;
  fcmToken?: string;
}

// In-memory driver pool for fast access
const driverPool = new Map<string, DriverInfo>();

// Maps socketId to driverId for quick lookup
const socketToDriver = new Map<string, string>();

export class DriverPoolService {
  /**
   * Add or update driver in the pool
   */
  static async addDriver(
    driverId: string,
    socketId: string,
    location: { lat: number; lng: number; heading?: number },
    vehicleType: string = 'car',
    fcmToken?: string
  ): Promise<void> {
    const driverInfo: DriverInfo = {
      driverId,
      socketId,
      location: {
        ...location,
        timestamp: Date.now(),
      },
      isOnline: true,
      isBusy: false,
      vehicleType,
      fcmToken,
    };

    driverPool.set(driverId, driverInfo);
    socketToDriver.set(socketId, driverId);

    // Also store in Redis for persistence across restarts
    await redisClient.setEx(
      `driver:pool:${driverId}`,
      300, // 5 minutes TTL
      JSON.stringify(driverInfo)
    );
  }

  /**
   * Remove driver from pool
   */
  static async removeDriver(driverId: string): Promise<void> {
    const driver = driverPool.get(driverId);
    if (driver) {
      socketToDriver.delete(driver.socketId);
      driverPool.delete(driverId);
    }
    await redisClient.del(`driver:pool:${driverId}`);
  }

  /**
   * Remove driver by socket ID
   */
  static async removeDriverBySocket(socketId: string): Promise<string | null> {
    const driverId = socketToDriver.get(socketId);
    if (driverId) {
      await this.removeDriver(driverId);
      return driverId;
    }
    return null;
  }

  /**
   * Update driver location
   */
  static async updateLocation(
    driverId: string,
    location: { lat: number; lng: number; heading?: number }
  ): Promise<void> {
    const driver = driverPool.get(driverId);
    if (driver) {
      driver.location = {
        ...location,
        timestamp: Date.now(),
      };
      driverPool.set(driverId, driver);

      // Update in Redis
      await redisClient.setEx(
        `driver:pool:${driverId}`,
        300,
        JSON.stringify(driver)
      );
    }
  }

  /**
   * Mark driver as busy/unavailable
   */
  static async markBusy(driverId: string, isBusy: boolean): Promise<void> {
    const driver = driverPool.get(driverId);
    if (driver) {
      driver.isBusy = isBusy;
      driverPool.set(driverId, driver);

      await redisClient.setEx(
        `driver:pool:${driverId}`,
        300,
        JSON.stringify(driver)
      );
    }
  }

  /**
   * Get driver by ID
   */
  static getDriver(driverId: string): DriverInfo | undefined {
    return driverPool.get(driverId);
  }

  /**
   * Get driver by socket ID
   */
  static getDriverBySocket(socketId: string): DriverInfo | undefined {
    const driverId = socketToDriver.get(socketId);
    if (driverId) {
      return driverPool.get(driverId);
    }
    return undefined;
  }

  /**
   * Get available drivers sorted by distance to pickup
   */
  static getAvailableDrivers(
    pickupLat: number,
    pickupLng: number,
    vehicleType?: string
  ): DriverInfo[] {
    const availableDrivers: DriverInfo[] = [];

    console.log(`🔍 Looking for drivers. Pool size: ${driverPool.size}`);
    console.log(`🚗 Vehicle type filter: ${vehicleType || 'none'}`);

    if (driverPool.size === 0) {
      console.log(`⚠️ Driver pool is empty! Drivers need to go online first.`);
    }

    for (const [id, driver] of driverPool.entries()) {
      const matchesType = !vehicleType || driver.vehicleType === vehicleType;
      console.log(`  Driver ${id}: online=${driver.isOnline}, busy=${driver.isBusy}, type=${driver.vehicleType}, matches=${matchesType}`);
      if (
        driver.isOnline &&
        !driver.isBusy &&
        (!vehicleType || driver.vehicleType === vehicleType)
      ) {
        availableDrivers.push(driver);
      }
    }
    
    console.log(`✅ Found ${availableDrivers.length} available drivers`);

    // Sort by distance to pickup
    availableDrivers.sort((a, b) => {
      const distA = this.calculateDistance(
        pickupLat,
        pickupLng,
        a.location.lat,
        a.location.lng
      );
      const distB = this.calculateDistance(
        pickupLat,
        pickupLng,
        b.location.lat,
        b.location.lng
      );
      return distA - distB;
    });

    return availableDrivers;
  }

  /**
   * Check if driver is online and available
   */
  static isDriverAvailable(driverId: string): boolean {
    const driver = driverPool.get(driverId);
    return !!driver && driver.isOnline && !driver.isBusy;
  }

  /**
   * Get socket ID for driver
   */
  static getSocketId(driverId: string): string | undefined {
    const driver = driverPool.get(driverId);
    return driver?.socketId;
  }

  /**
   * Get all online driver IDs
   */
  static getOnlineDriverIds(): string[] {
    const ids: string[] = [];
    for (const [id, driver] of driverPool.entries()) {
      if (driver.isOnline) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Get all online drivers with their full data
   */
  static getAllOnlineDrivers(): Array<{
    driverId: string;
    isOnline: boolean;
    isBusy: boolean;
    location: { lat: number; lng: number; heading?: number; timestamp?: number };
    vehicleType?: string;
    fcmToken?: string;
  }> {
    const drivers: Array<{
      driverId: string;
      isOnline: boolean;
      isBusy: boolean;
      location: { lat: number; lng: number; heading?: number; timestamp?: number };
      vehicleType?: string;
      fcmToken?: string;
    }> = [];
    
    for (const [id, driver] of driverPool.entries()) {
      if (driver.isOnline) {
        drivers.push({
          driverId: id,
          isOnline: driver.isOnline,
          isBusy: driver.isBusy,
          location: driver.location,
          vehicleType: driver.vehicleType,
          fcmToken: driver.fcmToken
        });
      }
    }
    
    return drivers;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Debug: Get pool stats
   */
  static getStats(): { total: number; online: number; busy: number } {
    let online = 0;
    let busy = 0;
    for (const driver of driverPool.values()) {
      if (driver.isOnline) online++;
      if (driver.isBusy) busy++;
    }
    return {
      total: driverPool.size,
      online,
      busy,
    };
  }
}
