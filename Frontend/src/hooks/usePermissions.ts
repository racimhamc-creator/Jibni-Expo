import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AppState,
  Linking,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

const androidVersion = Platform.Version as number;

export const usePermissions = () => {
  const { t } = useTranslation();

  // Start with all permissions as false - they will be checked on mount
  const [permissions, setPermissions] = useState(
    androidVersion > 28
      ? {
          location: false,
          notification: false,
          backgroundLocation: false,
        }
      : {
          location: false,
          notification: false,
        },
  );

  const [needsAllowPermission, setNeedsAllowPermissions] = useState(false);

  const checkNotificationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      callback(true);
    } else {
      callback(false);
    }
  };

  const checkFineLocationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      callback(true);
    } else {
      callback(false);
    }
  };

  const checkBackgroundLocationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    if (androidVersion <= 28) {
      callback(true); // Not required for Android <= 9
      return;
    }
    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status === 'granted') {
      callback(true);
    } else {
      callback(false);
    }
  };

  const checkAllPermissions = async () => {
    let _permissions = {
      location: true,
      notification: true,
      backgroundLocation: true,
    };

    await checkNotificationPermission(granted => {
      _permissions = {
        ..._permissions,
        notification: granted,
      };
    });

    await checkFineLocationPermission(granted => {
      _permissions = {
        ..._permissions,
        location: granted,
      };
    });

    // request permission only in android > 9
    if (androidVersion > 28) {
      await checkBackgroundLocationPermission(granted => {
        _permissions = {
          ..._permissions,
          backgroundLocation: granted,
        };
      });
    }

    setPermissions(_permissions);
    setNeedsAllowPermissions(
      Object.values(_permissions).some(item => item === false),
    );
  };

  const onRequestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissions(prev => ({
        ...prev,
        notification: true,
      }));
    } else {
      openSettingFormPermission();
    }
  };

  const onRequestFineLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermissions(prev => ({
        ...prev,
        location: true,
      }));
    } else {
      openSettingFormPermission();
    }
  };

  const onRequestBackgroundLocation = async () => {
    if (androidVersion <= 28) {
      // Not required for Android <= 9
      setPermissions(prev => ({
        ...prev,
        backgroundLocation: true,
      }));
      return;
    }
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status === 'granted') {
      setPermissions(prev => ({
        ...prev,
        backgroundLocation: true,
      }));
    } else {
      openSettingFormPermission();
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkAllPermissions();
  }, []);

  const openSettingFormPermission = () => {
    Alert.alert('', t(`openSettingsPromptMessage`) || 'Please enable permissions in settings', [
      // The "Yes" button
      {
        text: t(`openSettingsPromptButton`) || 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
      // The "No" button
      {
        text: t('close') || 'Close',
      },
    ]);
  };

  // Gallery/Media Library permission helper
  const ensureGalleryReadingAndContinue = async (
    callback: (granted: boolean) => void,
  ) => {
    try {
      console.log('🔐 Requesting gallery permissions...');
      // Request permissions using expo-image-picker
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Gallery permission status:', status);
      
      if (status === 'granted') {
        callback(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to upload images',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        callback(false);
      }
    } catch (error) {
      console.error('❌ Permission error:', error);
      callback(false);
    }
  };

  return {
    permissions,
    needsAllowPermission,
    setNeedsAllowPermissions,
    checkAllPermissions,
    onRequestFineLocation,
    onRequestNotificationPermission,
    onRequestBackgroundLocation,
    ensureGalleryReadingAndContinue, // Add gallery permission helper
  };
};
