import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');

// The exact height that stays visible at the bottom when collapsed
const COLLAPSED_HEIGHT = 100; 

// The Arrow Icon (Chevron)
const ChevronIcon: React.FC<{ expanded: boolean; color?: string }> = ({ expanded, color = '#185ADC' }) => {
  const rotation = useRef(new Animated.Value(expanded ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotateData = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: rotateData }] }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9l6 6 6-6"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

// Icons (Kept your original SVG code)
const LocationPinIcon: React.FC<{ color?: string; filled?: boolean }> = ({ color = '#185ADC', filled = false }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} fill={filled ? color : 'white'} />
    {!filled && <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
  </Svg>
);

const DottedLine: React.FC = () => (
  <View style={styles.dottedLine}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
);

const PhoneIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#185ADC" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
);

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M18 6L6 18M6 6l12 12" stroke="#185ADC" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
);

const WalletIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 7v12a2 2 0 0 0 2 2h16v-5" stroke="#185ADC" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M16 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="#185ADC" /></Svg>
);

interface DriverActiveMissionSheetProps {
  visible: boolean;
  rideData: any;
  language?: Language;
  onCallClient: () => void;
  onCancel: () => void;
  onStartRide?: () => void;
  onCompleteRide?: () => void;
  missionStatus?: string;
  isWaitingForClientConfirm?: boolean;
}

const DriverActiveMissionSheet: React.FC<DriverActiveMissionSheetProps> = ({
  visible,
  rideData,
  language = 'ar',
  onCallClient,
  onCancel,
  onStartRide,
  onCompleteRide,
  missionStatus = 'accepted',
  isWaitingForClientConfirm = false,
}) => {
  if (!visible || !rideData) return null;

  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed as requested
  const [contentHeight, setContentHeight] = useState(0);
  const translateY = useRef(new Animated.Value(500)).current; 

  // Smooth Animation
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isExpanded ? 0 : contentHeight,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isExpanded, contentHeight]);

  const toggleSheet = () => setIsExpanded(!isExpanded);

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) setContentHeight(height);
  };

  const lang = language as Language;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  
  const pickupAddress = rideData.pickupLocation?.address || "";
  const destinationAddress = rideData.destinationLocation?.address || "";
  const price = rideData.pricing?.totalPrice || 0;
  const isRideInProgress = missionStatus === 'in_progress';
  const isRideStarted = missionStatus === 'arriving' || missionStatus === 'in_progress';

  let etaMinutes = isRideInProgress ? Math.ceil((rideData.eta?.clientToDestination ?? 600) / 60) : (rideData.eta?.driverToClient ?? 5);

  const getTitle = () => {
    if (isRideInProgress) return getTranslation('rideInProgress', lang);
    if (missionStatus === 'arriving') return getTranslation('driverArrived', lang);
    return getTranslation('driverOnTheWay', lang);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      
      {/* HEADER: ALWAYS VISIBLE & ACTS AS TOGGLE */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={toggleSheet} 
        style={[styles.headerToggle, isRTL && styles.headerToggleRTL]}
      >
        <ChevronIcon expanded={isExpanded} />
        
        <View style={[styles.headerTextContainer, isRTL && styles.headerTextContainerRTL]}>
          <Text style={[styles.title, { fontFamily }]}>{getTitle()}</Text>
          <Text style={[styles.timer, { fontFamily }]}>{etaMinutes} {getTranslation('min', lang)}</Text>
        </View>
      </TouchableOpacity>

      {/* EXPANDABLE CONTENT */}
      <View onLayout={onContentLayout} style={styles.expandableContent}>
        <View style={styles.divider} />

        <View style={styles.routeContainer}>
          <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
            <LocationPinIcon color={isRideInProgress ? "#22C55E" : "#185ADC"} filled={!isRideInProgress} />
            <View style={[styles.locationInfo, isRTL ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}]}>
              <Text style={[styles.locationLabel, { fontFamily }]}>{isRTL ? 'موقع الالتقاط:' : 'Pickup:'}</Text>
              <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{pickupAddress}</Text>
            </View>
          </View>
          
          <DottedLine />

          <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
            <LocationPinIcon color="#185ADC" />
            <View style={[styles.locationInfo, isRTL ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}]}>
              <Text style={[styles.locationLabel, { fontFamily }]}>{isRTL ? 'الوجهة:' : 'Destination:'}</Text>
              <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{destinationAddress}</Text>
            </View>
          </View>

          {isRideInProgress && (
            <View style={styles.tripMetricsRow}>
              <Text style={[styles.tripMetricsText, { fontFamily }]}>
                {rideData.tripEtaMinutes ? `${rideData.tripEtaMinutes} ${getTranslation('min', lang)}` : '--'} • {rideData.tripDistanceKm ? `${rideData.tripDistanceKm.toFixed(1)} ${getTranslation('km', lang)}` : '--'}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.priceRow, isRTL && styles.priceRowRTL]}>
          <Text style={[styles.priceText, { fontFamily }]}>{price} {getTranslation('dz', lang)}</Text>
          <WalletIcon />
        </View>

        <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
          <TouchableOpacity 
            style={[styles.smallBtn, isRideInProgress && styles.btnDisabled]} 
            onPress={onCancel} 
            disabled={isRideInProgress}
          >
            <CloseIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={onCallClient}>
            <Text style={[styles.callBtnText, { fontFamily }]}>{getTranslation('callClient', lang)}</Text>
            <PhoneIcon />
          </TouchableOpacity>
        </View>

        {/* Status Actions */}
        {isRideStarted && onStartRide && missionStatus !== 'in_progress' && (
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#22C55E' }]} onPress={onStartRide}>
            <Text style={[styles.mainBtnText, { fontFamily }]}>{getTranslation('startRide', lang)}</Text>
          </TouchableOpacity>
        )}

        {missionStatus === 'in_progress' && onCompleteRide && (
          <TouchableOpacity 
            style={[styles.mainBtn, { backgroundColor: '#185ADC' }, isWaitingForClientConfirm && { opacity: 0.6 }]} 
            onPress={onCompleteRide}
            disabled={isWaitingForClientConfirm}
          >
            <Text style={[styles.mainBtnText, { fontFamily }]}>
              {isWaitingForClientConfirm ? (isRTL ? 'في انتظار التأكيد...' : 'Waiting...') : getTranslation('completeRide', lang)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 9999,
  },
  headerToggle: {
    height: COLLAPSED_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerToggleRTL: {
    flexDirection: 'row-reverse',
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainerRTL: {
    flexDirection: 'row-reverse',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  timer: { fontSize: 14, color: '#6b7280' },
  expandableContent: {
    width: '100%',
  },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 20 },
  routeContainer: { marginBottom: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationRowRTL: { flexDirection: 'row-reverse' },
  locationInfo: { flex: 1, marginHorizontal: 10 },
  locationLabel: { fontSize: 12, color: '#94a3b8' },
  locationAddress: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  dottedLine: { height: 25, width: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 3, height: 3, backgroundColor: '#cbd5e1', borderRadius: 1.5, marginVertical: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  priceRowRTL: { flexDirection: 'row-reverse' },
  priceText: { fontSize: 18, fontWeight: '800', color: '#185ADC' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  actionRowRTL: { flexDirection: 'row-reverse' },
  smallBtn: { width: 50, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#185ADC', justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  callBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#E8F0FE', borderWidth: 1, borderColor: '#185ADC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  callBtnText: { fontSize: 16, fontWeight: '700', color: '#185ADC' },
  mainBtn: { height: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  mainBtnText: { fontSize: 17, fontWeight: '700', color: 'white' },
});

export default DriverActiveMissionSheet;