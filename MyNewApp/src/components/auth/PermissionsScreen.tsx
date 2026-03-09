import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Linking, Image } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../services/api';
import { storage } from '../../services/storage';

const androidVersion = Platform.Version as number;

type PermissionId = 'location' | 'notification' | 'backgroundLocation';

type PermissionItem = {
  id: PermissionId;
  translationKey: string;
  icon: any;
};

interface PermissionsScreenProps {
  onContinue: () => void;
  onBack: () => void;
}

const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ onContinue, onBack }) => {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<Record<PermissionId, boolean>>(
    androidVersion > 28
      ? {
          location: false,
          notification: false,
          backgroundLocation: false,
        }
      : {
          location: false,
          notification: false,
          backgroundLocation: true,
        }
  );

  const localPermissions: PermissionItem[] =
    androidVersion > 28
      ? [
          {
            id: 'location',
            translationKey: 'locationPermission',
            icon: require('../../assets/location.png'),
          },
          {
            id: 'notification',
            translationKey: 'notificationPermission',
            icon: require('../../assets/notification.png'),
          },
          {
            id: 'backgroundLocation',
            translationKey: 'backgroundLocationPermission',
            icon: require('../../assets/backgroundLocation.png'),
          },
        ]
      : [
          {
            id: 'location',
            translationKey: 'locationPermission',
            icon: require('../../assets/location.png'),
          },
          {
            id: 'notification',
            translationKey: 'notificationPermission',
            icon: require('../../assets/notification.png'),
          },
        ];

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    const newPermissions: Record<PermissionId, boolean> = {
      location: false,
      notification: false,
      backgroundLocation: androidVersion <= 28,
    };

    const notificationStatus = await Notifications.getPermissionsAsync();
    newPermissions.notification = notificationStatus.status === 'granted';

    if (notificationStatus.status === 'granted') {
      await registerPushToken();
    }

    const locationStatus = await Location.getForegroundPermissionsAsync();
    newPermissions.location = locationStatus.status === 'granted';

    if (androidVersion > 28) {
      const backgroundLocationStatus = await Location.getBackgroundPermissionsAsync();
      newPermissions.backgroundLocation = backgroundLocationStatus.status === 'granted';
    }

    setPermissions(newPermissions);
  };

  const registerPushToken = async () => {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      console.log('📱 Expo Push Token:', token);
      
      const authToken = await storage.getToken();
      if (authToken) {
        await api.updateFCMToken(token);
        console.log('✅ FCM token sent to server');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  const requestPermission = async (id: PermissionId) => {
    if (id === 'notification') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissions(prev => ({ ...prev, notification: true }));
        await registerPushToken();
      } else {
        openSettingsPrompt();
      }
    } else if (id === 'location') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermissions(prev => ({ ...prev, location: true }));
        if (androidVersion > 28) {
          checkAllPermissions();
        }
      } else {
        openSettingsPrompt();
      }
    } else if (id === 'backgroundLocation') {
      if (androidVersion <= 28) {
        setPermissions(prev => ({ ...prev, backgroundLocation: true }));
        return;
      }
      
      if (!permissions.location) {
        Alert.alert(
          t('locationRequired'),
          t('enableLocationFirst'),
          [{ text: t('ok') }]
        );
        return;
      }
      
      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        console.log('Background location status:', status);
        if (status === 'granted') {
          setPermissions(prev => ({ ...prev, backgroundLocation: true }));
        } else {
          Alert.alert(
            t('permissionRequired'),
            t('backgroundLocationNeeded'),
            [
              { text: t('openSettings'), onPress: () => Linking.openSettings() },
              { text: t('cancel'), style: 'cancel' }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting background location:', error);
        openSettingsPrompt();
      }
    }
  };

  const openSettingsPrompt = () => {
    Alert.alert('', t('enablePermissionsSettings'), [
      {
        text: t('openSettings'),
        onPress: () => Linking.openSettings(),
      },
      {
        text: t('close'),
      },
    ]);
  };

  const handleContinue = () => {
    onContinue();
  };

  const allPermissionsGranted = Object.values(permissions).every(item => item === true);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← {t('back')}</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text translationKey="permissions" style={styles.title} />

        {localPermissions.map((item) => (
          <View key={item.id} style={styles.permissionItem}>
            <Image source={item.icon} style={styles.permissionIcon} resizeMode="contain" />
            <Text translationKey={item.translationKey} style={styles.permissionText} />
            <TouchableOpacity
              disabled={permissions[item.id]}
              style={[
                styles.toggle,
                permissions[item.id] && styles.toggleActive,
              ]}
              onPress={() => requestPermission(item.id)}
            >
              <View
                style={[
                  styles.toggleThumb,
                  permissions[item.id] && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, !allPermissionsGranted && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!allPermissionsGranted}
        >
          <Text translationKey="continue" style={styles.buttonText} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    paddingTop: 48,
  },
  backButtonText: {
    fontSize: 16,
    color: '#185ADC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#185ADC',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  permissionItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: '#D1DEF8',
    paddingHorizontal: 12,
    paddingVertical: 20,
    marginBottom: 16,
  },
  permissionIcon: {
    height: 24,
    width: 24,
  },
  permissionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginHorizontal: 8,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: '#D1DEF8',
    borderRadius: 50,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#185ADC',
    alignItems: 'flex-end',
  },
  toggleThumb: {
    backgroundColor: 'white',
    height: 20,
    width: 20,
    borderRadius: 10,
  },
  toggleThumbActive: {
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonDisabled: {
    backgroundColor: '#D1DEF8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PermissionsScreen;
