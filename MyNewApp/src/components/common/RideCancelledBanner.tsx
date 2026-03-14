import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface RideCancelledBannerProps {
  visible: boolean;
  language?: Language;
  message?: string;
  onDismiss?: () => void;
  rideDetails?: {
    reason?: string;
    timestamp?: string;
    driverName?: string;
    pickupLocation?: string;
  };
}

const RideCancelledBanner: React.FC<RideCancelledBannerProps> = ({
  visible,
  language = 'ar',
  message,
  onDismiss,
  rideDetails,
}) => {
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  
  // Animation values
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after 5 seconds if not manually dismissed
      const timer = setTimeout(() => {
        if (onDismiss) handleDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const getCancellationReason = (reason?: string) => {
    if (reason) return reason;
    const reasons = [
      'Driver was taking too long',
      'Changed my mind',
      'Found another ride',
      'Wrong pickup location',
      'App issue',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!visible) return null;

  const finalMessage = message || getTranslation('rideCancelled', language);
  const cancelReason = rideDetails?.reason || getCancellationReason();
  const cancelTime = rideDetails?.timestamp || getCurrentTime();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <BlurView intensity={8} tint="dark" style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#fef2f2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Animated Warning Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconRing}>
                <View style={styles.iconRingInner}>
                  <MaterialCommunityIcons 
                    name="close-circle" 
                    size={64} 
                    color="#DC2626" 
                  />
                </View>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons 
                    name="alert" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </View>
              </View>
              <View style={[styles.pulse, styles.pulse1]} />
              <View style={[styles.pulse, styles.pulse2]} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { fontFamily }]}>
              {finalMessage}
            </Text>
            
            {/* Subtitle */}
            <Text style={[styles.subtitle, { fontFamily }]}>
              Your ride request has been cancelled
            </Text>

            {/* Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text style={[styles.detailText, { fontFamily }]}>
                  {cancelTime}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                <Text style={[styles.detailText, { fontFamily, flex: 1 }]}>
                  Reason: {cancelReason}
                </Text>
              </View>

              {rideDetails?.driverName && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    <Text style={[styles.detailText, { fontFamily }]}>
                      Driver: {rideDetails.driverName}
                    </Text>
                  </View>
                </>
              )}

              {rideDetails?.pickupLocation && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text style={[styles.detailText, { fontFamily, flex: 1 }]}>
                      {rideDetails.pickupLocation}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={[styles.primaryButtonText, { fontFamily }]}>
                    {getTranslation('ok', language)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  // Handle request new ride
                  handleDismiss();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { fontFamily }]}>
                  Request New Ride
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FECACA',
  },
  iconRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
  },
  pulse1: {
    animationName: {
      '0%': { transform: [{ scale: 1 }], opacity: 0.7 },
      '100%': { transform: [{ scale: 1.5 }], opacity: 0 },
    },
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
  pulse2: {
    animationName: {
      '0%': { transform: [{ scale: 1 }], opacity: 0.7 },
      '100%': { transform: [{ scale: 2 }], opacity: 0 },
    },
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationDelay: '0.5s',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RideCancelledBanner;