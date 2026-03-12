import React, { useRef, useEffect, useCallback, useState } from 'react';
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

// Bottom sheet configuration
const COLLAPSED_HEIGHT = 110; // Height of just the header that remains visible

// New Chevron/Arrow Icon for Toggle
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

// Location Pin Icon
const LocationPinIcon: React.FC<{ color?: string; filled?: boolean }> = ({ 
  color = '#185ADC',
  filled = false 
}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle 
      cx="12" 
      cy="12" 
      r="4" 
      stroke={color} 
      strokeWidth={2} 
      fill={filled ? color : 'white'} 
    />
    {!filled && (
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </Svg>
);

// Dotted Line between locations
const DottedLine: React.FC = () => (
  <View style={styles.dottedLine}>
    <View style={styles.dot} />
    <View style={styles.dot} />
    <View style={styles.dot} />
    <View style={styles.dot} />
  </View>
);

// Phone Icon
const PhoneIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke="#185ADC"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// Close X Icon
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

// Wallet/Price Icon
const WalletIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 7v12a2 2 0 0 0 2 2h16v-5"
      stroke="#185ADC"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M16 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
      fill="#185ADC"
    />
  </Svg>
);

// Checkmark/Success Icon
const CheckmarkIcon: React.FC = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#22C55E" />
    <Path
      d="M8 12l3 3 5-6"
      stroke="white"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface ActiveRideBottomSheetProps {
  visible: boolean;
  rideData: {
    rideId: string;
    status?: string;
    driverId?: string;
    pickupLocation: { lat: number; lng: number; address: string };
    destinationLocation: { lat: number; lng: number; address: string };
    distance?: { driverToClient: number; clientToDestination: number };
    eta?: { driverToClient: number; clientToDestination: number };
    pricing?: { totalPrice: number };
    driverPhone?: string;
  } | null;
  driverLocation?: { lat: number; lng: number } | null;
  language?: Language;
  onCallDriver: () => void;
  onCancel: () => void;
  autoCollapse?: boolean;
}

const ActiveRideBottomSheet: React.FC<ActiveRideBottomSheetProps> = ({
  visible,
  rideData,
  driverLocation,
  language = 'ar',
  onCallDriver,
  onCancel,
  autoCollapse = true,
}) => {
  if (!visible || !rideData) return null;

  const lang = language as Language;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  const rideStatus = rideData.status || 'accepted';
  
  // State
  const [isExpanded, setIsExpanded] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const hasAutoCollapsed = useRef(false);

  // Measure the translation: we want the modal to move down by exactly the height of the hidden content
  const collapsedTranslateY = contentHeight;

  // Animation effect when isExpanded changes
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isExpanded ? 0 : collapsedTranslateY,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isExpanded, collapsedTranslateY]);

  // Auto-collapse logic
  useEffect(() => {
    if (contentHeight > 0 && autoCollapse && !hasAutoCollapsed.current && 
        (rideStatus === 'accepted' || rideStatus === 'in_progress' || rideStatus === 'driver_arriving')) {
      hasAutoCollapsed.current = true;
      setIsExpanded(false);
    }
  }, [rideStatus, autoCollapse, contentHeight]);

  const toggleSheet = () => setIsExpanded(!isExpanded);

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && contentHeight !== height) {
      setContentHeight(height);
    }
  };

  const isCoordinateString = (str: string): boolean => {
    if (!str) return false;
    return /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(str.trim());
  };
  
  const formatAddress = (address: string | undefined, fallback: string): string => {
    if (!address || address.trim() === '' || isCoordinateString(address)) {
      return fallback;
    }
    return address;
  };
  
  const pickupAddress = formatAddress(rideData.pickupLocation?.address, getTranslation('currentLocation', lang));
  const destinationAddress = formatAddress(rideData.destinationLocation?.address, getTranslation('destination', lang));
  const price = rideData.pricing?.totalPrice || 0;
  
  const isDriverEnRoute = rideStatus === 'accepted';
  const isDriverArrived = rideStatus === 'driver_arrived' || rideStatus === 'arriving';
  const isInProgress = rideStatus === 'in_progress';
  const isCompleted = rideStatus === 'completed';
  
  let etaMinutes: number;
  let distanceKm: number;
  
  if (isInProgress) {
    const etaSeconds = rideData.eta?.clientToDestination ?? 600;
    const distanceMeters = rideData.distance?.clientToDestination ?? 3000;
    etaMinutes = Math.ceil(etaSeconds / 60);
    distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
  } else if (isDriverEnRoute || isDriverArrived) {
    etaMinutes = rideData.eta?.driverToClient ?? 5;
    distanceKm = rideData.distance?.driverToClient ?? 0;
  } else {
    etaMinutes = rideData.eta?.clientToDestination ?? 5;
    distanceKm = rideData.distance?.clientToDestination ?? 0;
  }

  const getTitle = () => {
    if (isCompleted) return getTranslation('rideCompleted', lang);
    if (isInProgress) return getTranslation('rideInProgress', lang);
    if (isDriverArrived) return getTranslation('driverArrived', lang);
    return getTranslation('driverOnTheWay', lang);
  };

  if (isCompleted) {
    return (
      <Animated.View style={[styles.container, { backgroundColor: '#f0fdf4', transform: [{ translateY }] }]}>
        <View style={styles.successContainer}>
          <View style={styles.checkmarkCircle}>
            <CheckmarkIcon />
          </View>
          <Text style={[styles.successTitle, { fontFamily }]}>{getTranslation('rideCompleted', lang)}</Text>
          <Text style={[styles.successSubtitle, { fontFamily }]}>{getTranslation('rideCompletedSuccessfully', lang)}</Text>
          
          <View style={[styles.summaryContainer, isRTL && styles.summaryContainerRTL]}>
             {/* Original summary logic */}
             <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                <Text style={styles.summaryLabel}>{getTranslation('from', lang)}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{pickupAddress}</Text>
             </View>
             <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                <Text style={styles.summaryLabel}>{getTranslation('to', lang)}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{destinationAddress}</Text>
             </View>
             <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                <Text style={styles.summaryLabel}>{getTranslation('price', lang)}</Text>
                <Text style={styles.summaryValueHighlight}>{price} {getTranslation('dz', lang)}</Text>
             </View>
          </View>

          <TouchableOpacity style={styles.closeSuccessButton} onPress={onCancel}>
            <Text style={[styles.closeSuccessButtonText, { fontFamily }]}>{getTranslation('close', lang)}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      
      {/* Header Area acting as the Toggle Button */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={toggleSheet} 
        style={[styles.headerContainer, isRTL && styles.headerContainerRTL]}
      >
        <ChevronIcon expanded={isExpanded} />
        
        <View style={[styles.headerInfo, isRTL && styles.headerInfoRTL]}>
          <Text style={[styles.title, { fontFamily }]}>{getTitle()}</Text>
          <Text style={[styles.timer, { fontFamily }]}>{etaMinutes} {getTranslation('min', lang)}</Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Content Area */}
      <View style={styles.contentContainer} onLayout={onContentLayout}>
        <View style={styles.divider} />

        <View style={styles.routeContainer}>
          <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
            <View style={styles.locationIconContainer}>
              <LocationPinIcon color={isInProgress ? "#22C55E" : "#185ADC"} filled={!isInProgress} />
            </View>
            <View style={[styles.locationTextContainer, isRTL ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}]}>
              <Text style={[styles.locationLabel, { fontFamily }]}>{isRTL ? 'موقعك الحالي:' : 'Your location:'}</Text>
              <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{pickupAddress}</Text>
              {!isInProgress && (
                <Text style={[styles.locationDetails, { fontFamily }]}>
                  {etaMinutes} {getTranslation('min', lang)}, {distanceKm}{getTranslation('km', lang)}
                </Text>
              )}
            </View>
          </View>

          <DottedLine />

          <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
            <View style={styles.locationIconContainer}>
              <LocationPinIcon color="#185ADC" />
            </View>
            <View style={[styles.locationTextContainer, isRTL ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}]}>
              <Text style={[styles.locationLabel, { fontFamily }]}>{isRTL ? 'الوجهة:' : 'Destination:'}</Text>
              <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{destinationAddress}</Text>
              {isInProgress && (
                <Text style={[styles.locationDetails, { fontFamily }]}>
                  {etaMinutes} {getTranslation('min', lang)}, {distanceKm}{getTranslation('km', lang)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.priceContainer, isRTL && styles.priceContainerRTL]}>
          <Text style={[styles.priceLabel, { fontFamily }]}>{getTranslation('price', lang)}: {price} {getTranslation('dz', lang)}</Text>
          <WalletIcon />
        </View>

        <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
          <TouchableOpacity 
            style={[styles.cancelButton, isInProgress && styles.cancelButtonDisabled]} 
            onPress={onCancel}
            disabled={isInProgress}
          >
            <CloseIcon color={isInProgress ? '#999' : '#185ADC'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.callButton} onPress={onCallDriver}>
            <Text style={[styles.callButtonText, { fontFamily }]}>{getTranslation('callDriver', lang)}</Text>
            <PhoneIcon />
          </TouchableOpacity>
        </View>
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
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10001,
  },
  headerContainer: {
    height: COLLAPSED_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContainerRTL: {
    flexDirection: 'row-reverse',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfoRTL: {
    flexDirection: 'row-reverse',
  },
  contentContainer: {
    width: '100%',
  },
  timer: {
    fontSize: 14,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 20,
  },
  routeContainer: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationRowRTL: {
    flexDirection: 'row-reverse',
  },
  locationIconContainer: {
    marginTop: 4,
  },
  locationTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  locationDetails: {
    fontSize: 13,
    color: '#185ADC',
    marginTop: 2,
  },
  dottedLine: {
    height: 30,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    backgroundColor: '#cbd5e1',
    borderRadius: 1.5,
    marginVertical: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  priceContainerRTL: {
    flexDirection: 'row-reverse',
  },
  priceLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#185ADC',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionRowRTL: {
    flexDirection: 'row-reverse',
  },
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonDisabled: {
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  callButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#185ADC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#22c55e',
    marginBottom: 20,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryRowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  summaryValueHighlight: {
    fontSize: 18,
    color: '#185ADC',
    fontWeight: '800',
  },
  closeSuccessButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSuccessButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default ActiveRideBottomSheet;