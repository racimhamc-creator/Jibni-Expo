import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Box, Text, Header, Input, Button } from '@/src/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/src/theme';
import BlastedImage from 'react-native-blasted-image';
import { api } from '@/services/api';
import Svg, { Path } from 'react-native-svg';

// Star Icon SVG
const StarIcon: React.FC<{ filled?: boolean; size?: number }> = ({ filled = false, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#FEC846' : 'none'}>
    <Path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      stroke="#FEC846"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? '#FEC846' : 'none'}
    />
  </Svg>
);

// Edit Icon
const EditIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#185ADC' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
    updateUser: state.updateUser,
  }));

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await api.getCurrentUser();
        updateUser(userData);
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setPhoneNumber(userData.phoneNumber || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (user) {
      loadProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, []);

  const rating = user?.rating || 0;
  const totalRatings = user?.totalRatings || 0;
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || t('profile.notSet') || 'Not Set';

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await api.updateProfile({ 
        firstName, 
        lastName, 
        phoneNumber 
      });
      updateUser(updatedUser);
      
      Alert.alert(
        t('profile.updateSuccess') || 'Success',
        t('profile.profileUpdated') || 'Profile updated successfully'
      );
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert(
        t('genericError') || 'Error',
        error.message || t('profile.updateError') || 'Failed to update profile'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('profile.logoutConfirm') || 'Logout',
      t('profile.logoutMessage') || 'Are you sure you want to logout?',
      [
        { text: t('close') || 'Cancel', style: 'cancel' },
        {
          text: t('logout') || 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const goBack = () => {
    // Navigate to home screen - ensures we can always go back
    router.push('/(tabs)/');
  };

  if (isLoadingProfile) {
    return (
      <Box flex={1} backgroundColor={'mainBackground'} justifyContent={'center'} alignItems={'center'}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      {/* Modern Header with Gradient */}
      <View
        style={{
          backgroundColor: theme.colors.primary,
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <Header onPress={goBack} />
        <Box alignItems={'center'} marginTop={'l'}>
          {/* Avatar with gradient border */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'white',
              padding: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 56,
                backgroundColor: '#E8EEFB',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {user?.avatar ? (
                <BlastedImage
                  source={{ uri: user.avatar }}
                  style={{ width: 112, height: 112, borderRadius: 56 }}
                />
              ) : (
                <Text style={{ fontSize: 48, color: theme.colors.primary }}>
                  {fullName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </View>
          
          <Text
            variant={'header'}
            style={{
              color: 'white',
              marginTop: 16,
              fontSize: 24,
              fontWeight: 'bold',
            }}
          >
            {fullName}
          </Text>
          
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              marginTop: 8,
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
              {user?.role === 'driver' ? t('profile.driver') || 'Driver' : t('profile.client') || 'Client'}
            </Text>
          </View>
        </Box>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ratings Card (for drivers) */}
        {user?.role === 'driver' && rating > 0 && (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000',
                marginBottom: 12,
              }}
            >
              {t('profile.ratings') || 'Ratings'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <View key={star} style={{ marginRight: 4 }}>
                  <StarIcon filled={star <= Math.round(rating)} size={24} />
                </View>
              ))}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#000',
                  marginLeft: 12,
                }}
              >
                {rating.toFixed(1)}
              </Text>
            </View>
            {totalRatings > 0 && (
              <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                {totalRatings} {t('profile.reviews') || 'reviews'}
              </Text>
            )}
          </View>
        )}

        {/* Personal Information Card */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000',
              }}
            >
              {t('profile.personalInfo') || 'Personal Information'}
            </Text>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#E8EEFB',
                }}
              >
                <EditIcon size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Phone Number */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.phoneNumber') || 'Phone Number'}
            </Text>
            {isEditing ? (
              <Input
                placeholder={t('profile.phoneNumber') || 'Phone Number'}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                containerStyle={{
                  backgroundColor: '#F5F5F5',
                  borderColor: '#E0E0E0',
                }}
              />
            ) : (
              <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>
                {phoneNumber || t('profile.notSet') || 'Not Set'}
              </Text>
            )}
          </View>

          {/* First Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.firstName') || 'First Name'}
            </Text>
            {isEditing ? (
              <Input
                placeholder={t('profile.firstName') || 'First Name'}
                value={firstName}
                onChangeText={setFirstName}
                containerStyle={{
                  backgroundColor: '#F5F5F5',
                  borderColor: '#E0E0E0',
                }}
              />
            ) : (
              <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>
                {firstName || t('profile.notSet') || 'Not Set'}
              </Text>
            )}
          </View>

          {/* Last Name */}
          <View style={{ marginBottom: isEditing ? 20 : 0 }}>
            <Text
              style={{
                fontSize: 12,
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {t('profile.lastName') || 'Last Name'}
            </Text>
            {isEditing ? (
              <Input
                placeholder={t('profile.lastName') || 'Last Name'}
                value={lastName}
                onChangeText={setLastName}
                containerStyle={{
                  backgroundColor: '#F5F5F5',
                  borderColor: '#E0E0E0',
                }}
              />
            ) : (
              <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>
                {lastName || t('profile.notSet') || 'Not Set'}
              </Text>
            )}
          </View>

          {/* Edit Actions */}
          {isEditing && (
            <View
              style={{
                flexDirection: 'row',
                marginTop: 8,
                gap: 12,
              }}
            >
              <Button
                label={t('profile.cancel') || 'Cancel'}
                onPress={() => {
                  setIsEditing(false);
                  setFirstName(user?.firstName || '');
                  setLastName(user?.lastName || '');
                  setPhoneNumber(user?.phoneNumber || '');
                }}
                variant="secondary"
                buttonStyle={{
                  flex: 1,
                  backgroundColor: '#F5F5F5',
                  height: 50,
                }}
                textStyle={{ color: '#666' }}
                disabled={isLoading}
              />
              <Button
                label={t('profile.save') || 'Save'}
                onPress={handleSave}
                loading={isLoading}
                buttonStyle={{
                  flex: 1,
                  height: 50,
                }}
              />
            </View>
          )}
        </View>

        {/* Driver Information Card */}
        {user?.role === 'driver' && (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000',
                marginBottom: 20,
              }}
            >
              {t('profile.driverInfo') || 'Driver Information'}
            </Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: '#666',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                {t('profile.vehicleType') || 'Vehicle Type'}
              </Text>
              <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>
                {user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : t('profile.notSet') || 'Not Set'}
              </Text>
            </View>
            
            <View>
              <Text
                style={{
                  fontSize: 12,
                  color: '#666',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                {t('profile.wilaya') || 'Wilaya'}
              </Text>
              <Text style={{ fontSize: 16, color: '#000', fontWeight: '500' }}>
                {user?.wilaya || t('profile.notSet') || 'Not Set'}
              </Text>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: '#FF3B30',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            marginTop: 8,
            shadowColor: '#FF3B30',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            {t('logout') || 'Logout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Box>
  );
};

export default ProfileScreen;
