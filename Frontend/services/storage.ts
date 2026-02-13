import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@jibni:token';
const REFRESH_TOKEN_KEY = '@jibni:refreshToken';
const USER_KEY = '@jibni:user';

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
}

export const storage = new StorageService();
