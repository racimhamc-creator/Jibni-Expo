import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';
import { socketService } from '@/services/socket';
import { useTranslation } from 'react-i18next';

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const { location, watchPosition } = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const { t } = useTranslation();

  const toggleAvailability = async () => {
    try {
      await api.toggleAvailability(!isOnline);
      setIsOnline(!isOnline);

      if (!isOnline) {
        // Start location tracking
        if (location) {
          const sub = watchPosition((coords) => {
            socketService.sendHeartbeat({
              lat: coords.latitude,
              lng: coords.longitude,
              timestamp: Date.now(),
            });
          });
          setSubscription(sub);
        }
      } else {
        // Stop location tracking
        if (subscription) {
          subscription.remove();
          setSubscription(null);
        }
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('driver.dashboard') || 'Driver Dashboard'}</Text>
      <Text style={styles.subtitle}>
        {t('driver.status') || 'Status'}: {isOnline ? t('driver.online') || 'Online' : t('driver.offline') || 'Offline'}
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isOnline && styles.buttonOnline]}
        onPress={toggleAvailability}
      >
        <Text style={styles.buttonText}>
          {isOnline ? t('driver.goOffline') || 'Go Offline' : t('driver.goOnline') || 'Go Online'}
        </Text>
      </TouchableOpacity>
      
      {/* TODO: Add active mission display, mission requests */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonOnline: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
