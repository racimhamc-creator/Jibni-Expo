import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
  onClose?: () => void;
  language?: Language;
  rideData?: {
    rideId: string;
    pickupLocation: { address: string; lat: number; lng: number };
    destinationLocation: { address: string; lat: number; lng: number };
    distance: { driverToClient: number; clientToDestination: number };
    eta: { driverToClient: number; clientToDestination: number };
    pricing: { basePrice: number; distancePrice: number; totalPrice: number };
    timeout: number;
    driverLocationName?: string;
    pickupLocationName?: string;
    driverLocationText?: string;
    distanceKm?: number;
    etaMinutes?: number;
    headingDirection?: number;
    tripDistanceKm?: number;
    tripEtaMinutes?: number;
  };
}

// --- Icons ---

const WalletIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M16 11a2 2 0 100 4 2 2 0 000-4z" stroke={color} strokeWidth={2} />
  </Svg>
);

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

const CloseIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// --- Component ---

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
  const [countdown, setCountdown] = useState(rideData?.timeout || 60);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const destPulse = useRef(new Animated.Value(1)).current;

  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';

  const dz = getTranslation('dz', language);
  const min = getTranslation('min', language);
  const km = getTranslation('km', language);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(destPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(destPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  useEffect(() => {
    if (status === 'new_request' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, countdown]);

  useEffect(() => {
    if (countdown === 0 && status === 'new_request' && onReject) {
      onReject();
    }
  }, [countdown, status]);

  if (!visible) return null;

  const priceValue = rideData?.pricing?.totalPrice;
  const formattedPrice = priceValue != null
    ? `${priceValue.toLocaleString(isRTL ? 'ar-DZ' : 'en-US')} ${getTranslation('dz', language)}`
    : getTranslation('calculating', language);
  const driverTime = rideData?.eta?.driverToClient || 0;
  const driverDist = rideData?.distance?.driverToClient?.toFixed(1) || '0.0';
  const fallbackTripTime = rideData?.eta?.clientToDestination
    ? Math.max(1, Math.ceil(rideData.eta.clientToDestination))
    : 0;
  const fallbackTripDist = rideData?.distance?.clientToDestination
    ? parseFloat(rideData.distance.clientToDestination.toFixed(1))
    : 0;
  const tripTime = rideData?.tripEtaMinutes ?? fallbackTripTime;
  const tripDistanceValue = rideData?.tripDistanceKm ?? fallbackTripDist;
  const tripDist = typeof tripDistanceValue === 'number'
    ? tripDistanceValue.toFixed(1)
    : String(tripDistanceValue);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.dragHandle} />

        {/* HEADER */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.timerBadge, countdown <= 10 && styles.timerCritical]}>
            <Text style={[styles.timerText, countdown <= 10 && { color: '#FFF' }]}>{countdown}s</Text>
          </View>
          <View style={[styles.headerText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.title, { fontFamily }]}>{getTranslation('newRequestWaiting', language)}</Text>
            <Text style={[styles.subtitle, { fontFamily }]}>{getTranslation('newRequestDescription', language)}</Text>
          </View>
        </View>

        {/* TIMELINE */}
        <View style={[styles.timelineWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Centralized Line Track */}
          <View style={styles.lineTrack}>
            <View style={styles.verticalLine} />
          </View>

          <View style={[styles.nodesContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            {/* START */}
            <View style={[styles.nodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dotActive} />
              <View style={[styles.nodeInfo, { paddingLeft: isRTL ? 0 : 15, paddingRight: isRTL ? 15 : 0 }]}>
                <Text style={[styles.nodeLabel, { fontFamily }]}>{getTranslation('currentLocation', language)}</Text>
                <Text style={[styles.addressText, { fontFamily }]}>{rideData?.driverLocationName || 'Location...'}</Text>
              </View>
            </View>

            {/* SEGMENT 1 DATA */}
            <View style={[styles.segmentInfo, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.segmentText, { fontFamily }]}>
                {driverTime} {min} • {driverDist} {km}
              </Text>
            </View>

            {/* PICKUP */}
            <View style={[styles.nodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dotOutline} />
              <View style={[styles.nodeInfo, { paddingLeft: isRTL ? 0 : 15, paddingRight: isRTL ? 15 : 0 }]}>
                <Text style={[styles.nodeLabel, { fontFamily }]}>{getTranslation('pickupLocation', language)}</Text>
                <Text style={[styles.addressText, { fontFamily }]}>{rideData?.pickupLocationName || 'Pickup...'}</Text>
              </View>
            </View>

            {/* DESTINATION (Highlighted) */}
            <View style={[styles.nodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 15 }]}>
              <Animated.View style={[styles.dotDest, { transform: [{ scale: destPulse }] }]}>
                <View style={styles.dotDestInner} />
              </Animated.View>
              <View style={[styles.nodeInfo, { paddingLeft: isRTL ? 0 : 15, paddingRight: isRTL ? 15 : 0 }]}>
                <View style={[styles.destHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.nodeLabel, { color: '#FF4444', fontFamily }]}>{getTranslation('destination', language)}</Text>
                  <View style={styles.tripBadge}>
                    <Text style={styles.tripBadgeText}>{tripTime} {min} • {tripDist} {km}</Text>
                  </View>
                </View>
                <Text style={[styles.addressText, styles.destAddressBold, { fontFamily }]}>{rideData?.destinationLocation?.address || 'Destination'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PRICE BAR */}
        <View style={[styles.priceBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <WalletIcon color="#185ADC" />
          <Text style={[styles.priceValue, { fontFamily }]}>
            {formattedPrice}
          </Text>
        </View>

        {/* ACTIONS */}
        <TouchableOpacity style={styles.btnAccept} onPress={onAccept}>
          <Text style={[styles.btnAcceptText, { fontFamily }]}>{getTranslation('accept', language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnReject} onPress={onReject}>
          <Text style={[styles.btnRejectText, { fontFamily }]}>{getTranslation('reject', language)}</Text>
          <CloseIcon color="#FF4444" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  dragHandle: {
    width: 60,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    gap: 15,
  },
  timerBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#185ADC',
  },
  timerCritical: {
    backgroundColor: '#FF4444',
    borderColor: '#FFBABA',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#185ADC',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  // Timeline Logic
  timelineWrapper: {
    marginBottom: 25,
  },
  lineTrack: {
    width: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 10,
  },
  nodesContent: {
    flex: 1,
  },
  nodeRow: {
    alignItems: 'flex-start',
    width: '100%',
  },
  nodeInfo: {
    flex: 1,
    marginTop: -2,
  },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#185ADC',
    marginLeft: -8,
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 2,
  },
  dotOutline: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#185ADC',
    backgroundColor: '#FFF',
    marginLeft: -8,
  },
  dotDest: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF444422',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  dotDestInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ADB5BD',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  segmentInfo: {
    paddingVertical: 10,
    marginLeft: 15,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#185ADC',
    backgroundColor: '#F0F5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  destHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  destAddressBold: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF4444',
  },
  tripBadge: {
    backgroundColor: '#FF444415',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tripBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF4444',
  },
  // Price & Actions
  priceBar: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 12,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#185ADC',
  },
  currency: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  btnAccept: {
    backgroundColor: '#185ADC',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#185ADC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  btnAcceptText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  btnReject: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  btnRejectText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MissionTracking;