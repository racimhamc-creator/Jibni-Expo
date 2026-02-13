import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import Box from '@/src/components/ui/Box';
import BlastedImage from 'react-native-blasted-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LoginCard from '@/src/components/auth/LoginCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';

const { width: deviceWidth } = Dimensions.get('window');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSendOtp = async () => {
    // Remove validation check - let backend handle it
    // Just check if phone is not empty
    if (!phone || phone.trim().length === 0) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      const response = await api.sendOTP(phone);
      
      // Check if user was authenticated directly (no OTP required)
      if (response.status === 'success' && !response.requiresOTP && response.user && response.token && response.refreshToken) {
        // User exists and is verified - authenticate directly
        const { useAuthStore } = await import('@/stores/authStore');
        const { login: loginStore } = useAuthStore.getState();
        
        // Store tokens and user data
        const { storage } = await import('@/services/storage');
        await storage.setToken(response.token);
        await storage.setRefreshToken(response.refreshToken);
        await storage.setUser(response.user);
        
        // Update auth store
        useAuthStore.setState({ 
          user: response.user, 
          token: response.token, 
          isAuthenticated: true, 
          isLoading: false 
        });
        
        // Connect sockets if driver
        const { socketService } = await import('@/services/socket');
        if (response.user.role === 'driver') {
          socketService.connectServer(response.token);
        }
        socketService.connectMissions(response.token);
        
        // Navigate to home
        router.replace('/(tabs)/');
      } else {
        // OTP required - navigate to verify OTP screen
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { phone: phone }
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  return (
    <Box flex={1}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          flex: 1,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
          }}
        >
          <BlastedImage
            source={require('@/src/assets/login_background_image.png')}
            style={{
              width: deviceWidth,
              height: (deviceWidth * 965) / 430,
            }}
          />
        </View>
        <View
          style={{
            flex: 1,
          }}
        />
        <LoginCard phone={phone} setPhone={setPhone} handleSendOtp={handleSendOtp} />
      </KeyboardAwareScrollView>
    </Box>
  );
}