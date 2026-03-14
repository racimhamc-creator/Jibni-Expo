import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@jibni:token';
const REFRESH_TOKEN_KEY = '@jibni:refreshToken';
const USER_KEY = '@jibni:user';
const LANGUAGE_KEY = '@jibni:language';
const ACTIVE_MISSION_KEY = '@jibni:activeMission';
const ACTIVE_RIDE_STATE_KEY = '@jibni:activeRideState';
const DRIVER_BG_TRACKING_ENABLED_KEY = '@jibni:driverBgTrackingEnabled';

class StorageService {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async removeRefreshToken(): Promise<void> {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async getUser(): Promise<any | null> {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  }

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }

  // Language storage
  async setLanguage(language: string): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  }

  async getLanguage(): Promise<string | null> {
    return AsyncStorage.getItem(LANGUAGE_KEY);
  }

  async removeLanguage(): Promise<void> {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
  }

  // Active mission persistence (for restore on app start)
  async setActiveMission(mission: any | null): Promise<void> {
    console.log('🗂️ storage.setActiveMission called with:', mission);
    if (!mission) {
      console.log('🗂️ storage.setActiveMission: removing key');
      await AsyncStorage.removeItem(ACTIVE_MISSION_KEY);
      return;
    }
    console.log('🗂️ storage.setActiveMission: storing JSON string');
    await AsyncStorage.setItem(ACTIVE_MISSION_KEY, JSON.stringify(mission));
  }

  async getActiveMission(): Promise<any | null> {
    try {
      const mission = await AsyncStorage.getItem(ACTIVE_MISSION_KEY);
      console.log('🗂️ storage.getActiveMission raw value:', mission);
      const parsed = mission ? JSON.parse(mission) : null;
      console.log('🗂️ storage.getActiveMission parsed:', parsed);
      return parsed;
    } catch (e) {
      console.warn('⚠️ storage.getActiveMission error:', e);
      return null;
    }
  }

  async clearActiveMission(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_MISSION_KEY);
  }

  // Active ride state persistence (for restore on app start after app close)
  async setActiveRideState(ride: any | null): Promise<void> {
    console.log('🚗 storage.setActiveRideState called with:', ride);
    if (!ride) {
      console.log('🚗 storage.setActiveRideState: removing key');
      await AsyncStorage.removeItem(ACTIVE_RIDE_STATE_KEY);
      return;
    }
    console.log('🚗 storage.setActiveRideState: storing JSON string');
    await AsyncStorage.setItem(ACTIVE_RIDE_STATE_KEY, JSON.stringify({
      ...ride,
      persistedAt: new Date().toISOString(),
    }));
  }

  async getActiveRideState(): Promise<any | null> {
    try {
      const ride = await AsyncStorage.getItem(ACTIVE_RIDE_STATE_KEY);
      console.log('🚗 storage.getActiveRideState raw value:', ride);
      const parsed = ride ? JSON.parse(ride) : null;
      console.log('🚗 storage.getActiveRideState parsed:', parsed);
      return parsed;
    } catch (e) {
      console.warn('⚠️ storage.getActiveRideState error:', e);
      return null;
    }
  }

  async clearActiveRideState(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_RIDE_STATE_KEY);
  }

  // Driver background tracking toggle persistence
  async setDriverBgTrackingEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(DRIVER_BG_TRACKING_ENABLED_KEY, enabled ? '1' : '0');
  }

  async getDriverBgTrackingEnabled(): Promise<boolean> {
    const v = await AsyncStorage.getItem(DRIVER_BG_TRACKING_ENABLED_KEY);
    return v === '1';
  }
}

export const storage = new StorageService();
