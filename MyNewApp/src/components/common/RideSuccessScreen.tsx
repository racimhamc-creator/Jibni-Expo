/**
 * RideSuccessScreen Component
 * 
 * Displays the ride completion success screen with ride summary and rating.
 * This is shown after a ride is completed, replacing the ActiveRideBottomSheet
 * and DriverActiveMissionSheet.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface LocationData {
  address?: string;
  lat?: number;
  lng?: number;
}

interface RideSuccessScreenProps {
  visible: boolean;
  rideData: {
    pickupLocation?: LocationData;
    destinationLocation?: LocationData;
    price?: number;
    distance?: number | { value?: number; text?: string; clientToDestination?: number; driverToClient?: number };
    driverName?: string;
    driverRating?: number;
    pricing?: { total?: number; totalPrice?: number };
  } | null;
  language?: 'ar' | 'fr' | 'en';
  onClose: () => void;
}

const RideSuccessScreen: React.FC<RideSuccessScreenProps> = ({
  visible,
  rideData,
  language = 'ar',
  onClose,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !rideData) return null;

  const isRTL = language === 'ar';
  const fontFamily = language === 'ar' ? 'Cairo' : undefined;

  const translations = {
    rideCompleted: {
      ar: 'تم إكمال الرحلة!',
      fr: 'Course terminée!',
      en: 'Ride Completed!',
    },
    rideCompletedSuccessfully: {
      ar: 'تم الوصول إلى الوجهة بنجاح',
      fr: 'Arrivée à destination réussie',
      en: 'Successfully arrived at destination',
    },
    from: { ar: 'من', fr: 'De', en: 'From' },
    to: { ar: 'إلى', fr: 'À', en: 'To' },
    distance: { ar: 'المسافة', fr: 'Distance', en: 'Distance' },
    price: { ar: 'السعر', fr: 'Prix', en: 'Price' },
    km: { ar: 'كم', fr: 'km', en: 'km' },
    da: { ar: 'دج', fr: 'DA', en: 'DA' },
    close: { ar: 'إغلاق', fr: 'Fermer', en: 'Close' },
  };

  const t = (key: keyof typeof translations) => translations[key][language];

  const formatAddress = (location?: LocationData) => {
    if (!location?.address) return '---';
    return location.address.length > 40
      ? location.address.substring(0, 40) + '...'
      : location.address;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Green Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={48} color="#4CAF50" />
        </View>
        <Text style={[styles.successTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('rideCompleted')}
        </Text>
        <Text style={[styles.successSubtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('rideCompletedSuccessfully')}
        </Text>
      </View>

      {/* Ride Summary */}
      <View style={[styles.summaryContainer, isRTL && styles.summaryContainerRTL]}>
        {/* From */}
        <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
          <Ionicons name="location" size={20} color="#4CAF50" />
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { fontFamily }]}>{t('from')}</Text>
            <Text style={[styles.summaryValue, { fontFamily }]}>
              {formatAddress(rideData.pickupLocation)}
            </Text>
          </View>
        </View>

        {/* To */}
        <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
          <Ionicons name="location" size={20} color="#F44336" />
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { fontFamily }]}>{t('to')}</Text>
            <Text style={[styles.summaryValue, { fontFamily }]}>
              {formatAddress(rideData.destinationLocation)}
            </Text>
          </View>
        </View>

        {/* Distance & Price */}
        <View style={[styles.statsRow, isRTL && styles.statsRowRTL]}>
          <View style={styles.statItem}>
            <Ionicons name="navigate" size={20} color="#666" />
            <Text style={[styles.statValue, { fontFamily }]}>
              {(() => {
                // Try to get distance from various possible locations in the data
                const dist = rideData.distance;
                if (typeof dist === 'number') return dist.toFixed(1);
                if (dist?.clientToDestination) return (dist.clientToDestination / 1000).toFixed(1);
                if (dist?.value) return (dist.value / 1000).toFixed(1);
                return '0.0';
              })()} {t('km')}
            </Text>
            <Text style={[styles.statLabel, { fontFamily }]}>{t('distance')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash" size={20} color="#4CAF50" />
            <Text style={[styles.statValue, { fontFamily, color: '#4CAF50' }]}>
              {(() => {
                // Try to get price from various possible locations in the data
                if (typeof rideData.price === 'number') return rideData.price;
                if (rideData.pricing?.totalPrice) return rideData.pricing.totalPrice;
                if (rideData.pricing?.total) return rideData.pricing.total;
                return 0;
              })()} {t('da')}
            </Text>
            <Text style={[styles.statLabel, { fontFamily }]}>{t('price')}</Text>
          </View>
        </View>
      </View>

      {/* Close Button */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { fontFamily }]}>{t('close')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  successHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#F5F5F5',
    margin: 16,
    borderRadius: 12,
  },
  summaryContainerRTL: {
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryRowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  statsRowRTL: {
    flexDirection: 'row-reverse',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  ratingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  ratingButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  thankYouContainer: {
    padding: 40,
    alignItems: 'center',
  },
  closeButtonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default RideSuccessScreen;
