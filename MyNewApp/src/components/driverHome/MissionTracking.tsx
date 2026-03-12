import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

type MissionStatus = 'new_request' | 'accepted' | 'on_the_way' | 'withdrawal' | 'arriving' | 'in_progress';

interface MissionTrackingProps {
  visible: boolean;
  status?: MissionStatus;
  onAccept?: () => void;
  onReject?: () => void;
  onCallClient?: () => void;
  onWithdraw?: () => void;
  onConfirmArrival?: () => void;
  onClose?: () => void; // Generic close/cancel handler
  language?: Language;
  rideData?: {
    rideId: string;
    pickupLocation: { address: string; lat: number; lng: number };
    destinationLocation: { address: string; lat: number; lng: number };
    distance: { driverToClient: number; clientToDestination: number };
    eta: { driverToClient: number; clientToDestination: number };
    pricing: { basePrice: number; distancePrice: number; totalPrice: number };
    timeout: number;
  };
}

// Location Pin Icon
const LocationPinIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.2} />
    <Path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Wallet Icon
const WalletIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 11a2 2 0 100 4 2 2 0 000-4z"
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

// Phone Icon
const PhoneIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.1}
    />
  </Svg>
);

// Close Icon
const CloseIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MissionTracking: React.FC<MissionTrackingProps> = ({
  visible,
  status = 'new_request',
  onAccept,
  onReject,
  onCallClient,
  onWithdraw,
  onConfirmArrival,
  onClose,
  language = 'ar',
  rideData,
}) => {
  const [countdown, setCountdown] = useState(rideData?.timeout || 15);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  
  // Use real data from rideData or defaults
  const price = rideData?.pricing?.totalPrice || 3000;
  const distance = rideData?.distance?.driverToClient?.toFixed(1) || '3.4';
  const time = rideData?.eta?.driverToClient?.toString() || '10';
  const pickupLocation = rideData?.pickupLocation?.address || 'Pickup location';
  const destination = rideData?.destinationLocation?.address || 'Destination';

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Countdown for new request - auto reject when timeout
  useEffect(() => {
    if (status === 'new_request') {
      // Reset countdown when new request comes
      setCountdown(rideData?.timeout || 60);
    }
  }, [status, rideData?.rideId]);
  
  useEffect(() => {
    if (status === 'new_request' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Auto reject when countdown reaches 0
            onReject?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, countdown, onReject]);

  const formatPrice = (p: number) => {
    return isRTL ? p.toLocaleString('ar-DZ') : p.toLocaleString('en-US');
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'new_request':
        return getTranslation('newRequestWaiting', language);
      case 'accepted':
      case 'on_the_way':
        return getTranslation('driverOnTheWayTitle', language);
      case 'withdrawal':
        return getTranslation('withdrawalOperation', language);
      case 'arriving':
        return getTranslation('remainingToArrive', language).replace('{amount}', '200');
      default:
        return '';
    }
  };

  const getStatusSubtitle = () => {
    switch (status) {
      case 'new_request':
        return getTranslation('newRequestDescription', language);
      case 'accepted':
      case 'on_the_way':
        return getTranslation('withdrawalOperation', language);
      case 'withdrawal':
        return '';
      case 'arriving':
        return '';
      default:
        return '';
    }
  };

  if (!visible) return null;

  const dz = getTranslation('dz', language);
  const min = getTranslation('min', language);
  const km = getTranslation('km', language);

  // New Request UI (First image)
  if (status === 'new_request') {
    return (
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.dragHandle} />
          
          {/* Status Header */}
          <View style={[styles.statusHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[
              styles.countdownBadge, 
              countdown <= 10 && { backgroundColor: '#FF4444' }
            ]}>
              <Text style={[
                styles.countdownText,
                countdown <= 10 && { color: '#FFFFFF' }
              ]}>
                {countdown}s
              </Text>
            </View>
            <Text style={[styles.statusTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {getStatusTitle()}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {getStatusSubtitle()}
          </Text>

          {/* Route Info */}
          <View style={styles.routeContainer}>
            {/* Pickup Location */}
            <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <LocationPinIcon />
              <Text style={[styles.locationLabel, { fontFamily }]}>
                {getTranslation('pickupLocation', language)}
              </Text>
            </View>
            <Text style={[styles.locationValue, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {pickupLocation}
            </Text>

            {/* Distance & Time */}
            <View style={[styles.distanceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.distanceText, { fontFamily }]}>
                {time} {min}, {distance} {km}
              </Text>
            </View>

            {/* Destination */}
            <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <LocationPinIcon />
              <Text style={[styles.locationLabel, { fontFamily }]}>
                {getTranslation('destination', language)}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <WalletIcon />
            <Text style={[styles.priceLabel, { fontFamily }]}>
              {getTranslation('price', language)}: {formatPrice(price)} {dz}
            </Text>
          </View>

          {/* Accept Button */}
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={[styles.acceptButtonText, { fontFamily }]}>
              {getTranslation('accept', language)}
            </Text>
          </TouchableOpacity>

          {/* Reject Button */}
          <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
            <Text style={[styles.rejectButtonText, { fontFamily }]}>
              {getTranslation('reject', language)}
            </Text>
            <CloseIcon color="#FF4444" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // On the way / Withdrawal / Arriving UI (Images 2-5)
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.dragHandle} />
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.timeBadge, { fontFamily }]}>{time}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {getStatusTitle()}
            </Text>
            {status === 'accepted' && (
              <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                {getTranslation('withdrawalOperation', language)}
              </Text>
            )}
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeContainer}>
          {/* Current/Pickup Location */}
          <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <LocationPinIcon />
            <Text style={[styles.locationLabel, { fontFamily }]}>
              {status === 'withdrawal' || status === 'arriving' 
                ? getTranslation('pickupLocation', language)
                : getTranslation('currentLocation', language)}
            </Text>
          </View>
          
          <View style={styles.locationDetails}>
            <Text style={[styles.locationValue, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {pickupLocation}
            </Text>
            <Text style={[styles.distanceText, { fontFamily }]}>
              {time} {min}, {distance} {km}
            </Text>
          </View>

          {/* Destination */}
          <View style={[styles.locationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <LocationPinIcon />
            <Text style={[styles.locationLabel, { fontFamily }]}>
              {getTranslation('destination', language)}
            </Text>
          </View>
          <Text style={[styles.locationValue, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {destination}
          </Text>
        </View>

        {/* Price */}
        <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <WalletIcon />
          <Text style={[styles.priceLabel, { fontFamily }]}>
            {getTranslation('price', language)}: {formatPrice(price)} {dz}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Close/Cancel Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              if (status === 'withdrawal' || status === 'arriving') {
                onWithdraw?.();
              } else if (status === 'accepted') {
                onClose?.(); // Use onClose for accepted status
              }
              // For new_request, onReject handles it
            }}
          >
            <CloseIcon color="#185ADC" />
          </TouchableOpacity>

          {/* Main Action Button */}
          {status === 'arriving' || status === 'withdrawal' ? (
            <TouchableOpacity style={styles.confirmArrivalButton} onPress={onConfirmArrival}>
              <Text style={[styles.confirmArrivalText, { fontFamily }]}>
                {getTranslation('confirmArrival', language)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.callButton} onPress={onCallClient}>
              <Text style={[styles.callButtonText, { fontFamily }]}>
                {getTranslation('callClient', language)}
              </Text>
              <PhoneIcon />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    zIndex: 10001,
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 24,
  },
  dragHandle: {
    height: 2,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 106,
    alignSelf: 'center',
    marginBottom: 24,
  },
  // New Request Styles
  statusHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownBadge: {
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  countdownText: {
    color: '#FF4444',
    fontSize: 20,
    fontWeight: '700',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#185ADC',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#00000099',
    marginBottom: 20,
    lineHeight: 20,
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 14,
    color: '#000000CC',
    marginHorizontal: 8,
  },
  locationValue: {
    fontSize: 14,
    color: '#185ADC',
    marginBottom: 8,
  },
  distanceRow: {
    marginVertical: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#185ADC',
  },
  locationDetails: {
    marginBottom: 12,
  },
  priceRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
    color: '#185ADC',
    marginHorizontal: 8,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#185ADC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  rejectButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  // On the way styles
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timeBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    color: '#00000099',
    marginRight: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#00000099',
    marginTop: 4,
  },
  actionRow: {
    marginTop: 16,
    gap: 12,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8EEFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#185ADC',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEFB',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#185ADC',
    gap: 8,
  },
  callButtonText: {
    color: '#185ADC',
    fontSize: 15,
    fontWeight: '500',
  },
  confirmArrivalButton: {
    flex: 1,
    backgroundColor: '#185ADC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmArrivalText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MissionTracking;
