import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

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
}

const ActiveRideBottomSheet: React.FC<ActiveRideBottomSheetProps> = ({
  visible,
  rideData,
  driverLocation,
  language = 'ar',
  onCallDriver,
  onCancel,
}) => {
  if (!visible || !rideData) return null;

  // DEBUG: Log received data
  // console.log('🎨 ActiveRideBottomSheet - rideData:', JSON.stringify(rideData, null, 2)); // Hidden to reduce console flood
  console.log('🎨 ActiveRideBottomSheet - eta:', rideData.eta);
  console.log('🎨 ActiveRideBottomSheet - distance:', rideData.distance);

  const lang = language as Language;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  const rideStatus = rideData.status || 'accepted';
  
  // Helper function to check if address looks like coordinates
  const isCoordinateString = (str: string): boolean => {
    if (!str) return false;
    // Check if string matches pattern like "36.7538, 3.0588" or "36.7538,3.0588"
    return /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(str.trim());
  };
  
  // Helper function to format address - show placeholder if it's just coordinates
  const formatAddress = (address: string | undefined, fallback: string): string => {
    if (!address || address.trim() === '') {
      return fallback;
    }
    if (isCoordinateString(address)) {
      return fallback;
    }
    return address;
  };
  
  const pickupAddress = formatAddress(rideData.pickupLocation?.address, getTranslation('currentLocation', lang));
  const destinationAddress = formatAddress(rideData.destinationLocation?.address, getTranslation('destination', lang));
  const price = rideData.pricing?.totalPrice || 3000;
  
  const isDriverEnRoute = rideStatus === 'accepted';
  const isDriverArrived = rideStatus === 'driver_arrived' || rideStatus === 'arriving';
  const isInProgress = rideStatus === 'in_progress';
  const isCompleted = rideStatus === 'completed';
  
  // Before ride starts: eta is in minutes, distance is in km (from DB)
  // After ride starts (ride_started event): eta is in seconds, distance is in meters
  // So we need to convert when ride is in progress
  let etaMinutes: number;
  let distanceKm: number;
  
  if (isInProgress) {
    // ride_started sends seconds and meters - convert to min/km
    const etaSeconds = rideData.eta?.clientToDestination ?? 600;
    const distanceMeters = rideData.distance?.clientToDestination ?? 3000;
    etaMinutes = Math.ceil(etaSeconds / 60);
    distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
  } else if (isDriverEnRoute || isDriverArrived) {
    // Driver is en route to pickup - show driverToClient (distance & time to reach client)
    etaMinutes = rideData.eta?.driverToClient ?? 5;
    distanceKm = rideData.distance?.driverToClient ?? 0;
  } else {
    // Fallback
    etaMinutes = rideData.eta?.clientToDestination ?? 5;
    distanceKm = rideData.distance?.clientToDestination ?? 0;
  }
  
  console.log('🎨 ActiveRideBottomSheet - calculated:', { etaMinutes, distanceKm, isInProgress, isCompleted });

  const getTitle = () => {
    if (isCompleted) return getTranslation('rideCompleted', lang);
    if (isInProgress) return getTranslation('rideInProgress', lang);
    if (isDriverArrived) return getTranslation('driverArrived', lang);
    return getTranslation('driverOnTheWay', lang);
  };

  // Success/Completed View
  if (isCompleted) {
    return (
      <View style={[styles.container, { backgroundColor: '#f0fdf4' }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        {/* Success Animation */}
        <View style={styles.successContainer}>
          <View style={styles.checkmarkCircle}>
            <CheckmarkIcon />
          </View>
          <Text style={[styles.successTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {getTranslation('rideCompleted', lang)}
          </Text>
          <Text style={[styles.successSubtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {getTranslation('rideCompletedSuccessfully', lang)}
          </Text>
          
          {/* Ride Summary */}
          <View style={[styles.summaryContainer, isRTL && styles.summaryContainerRTL]}>
            <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
              <Text style={[styles.summaryLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                {getTranslation('from', lang)}
              </Text>
              <Text style={[styles.summaryValue, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
              <Text style={[styles.summaryLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                {getTranslation('to', lang)}
              </Text>
              <Text style={[styles.summaryValue, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {destinationAddress}
              </Text>
            </View>
            <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
              <Text style={[styles.summaryLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                {getTranslation('price', lang)}
              </Text>
              <Text style={[styles.summaryValueHighlight, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                {price} {getTranslation('dz', lang)}
              </Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeSuccessButton} onPress={onCancel}>
            <Text style={[styles.closeSuccessButtonText, { fontFamily }]}>
              {getTranslation('close', lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Drag Handle */}
      <View style={styles.dragHandle} />

      {/* Header */}
<View style={[styles.header, isRTL && styles.headerRTL]}>
  {isRTL ? (
    // In RTL, swap the order: title first (on right), timer second (on left)
    <>
      <Text style={[styles.title, { fontFamily, textAlign: 'right' }]}>{getTitle()}</Text>
      <Text style={[styles.timer, { fontFamily, textAlign: 'left' }]}>{etaMinutes} {getTranslation('min', lang)}</Text>
    </>
  ) : (
    // In LTR, keep normal order: timer on left, title on right
    <>
      <Text style={[styles.timer, { fontFamily, textAlign: 'left' }]}>{etaMinutes} {getTranslation('min', lang)}</Text>
      <Text style={[styles.title, { fontFamily, textAlign: 'right' }]}>{getTitle()}</Text>
    </>
  )}
</View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Route Info */}
      <View style={styles.routeContainer}>
        {/* Pickup Location - Client's current location */}
        <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
          <View style={styles.locationIconContainer}>
            <LocationPinIcon color={isInProgress ? "#22C55E" : "#185ADC"} filled={!isInProgress} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationLabel, { fontFamily }]} numberOfLines={1}>
              {lang === 'ar' ? 'موقعك الحالي:' : lang === 'fr' ? 'Votre position:' : 'Your location:'}
            </Text>
            <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{pickupAddress}</Text>
            {!isInProgress && (
              <Text style={[styles.locationDetails, { fontFamily }]}>
                {etaMinutes} {getTranslation('min', lang)}, {distanceKm}{getTranslation('km', lang)}
              </Text>
            )}
          </View>
        </View>

        {/* Dotted Line */}
        <DottedLine />

        {/* Destination */}
        <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
          <View style={styles.locationIconContainer}>
            <LocationPinIcon color="#185ADC" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationLabel, { fontFamily }]} numberOfLines={1}>
              {lang === 'ar' ? 'الوجهة:' : lang === 'fr' ? 'Destination:' : 'Destination:'}
            </Text>
            <Text style={[styles.locationAddress, { fontFamily }]} numberOfLines={1}>{destinationAddress}</Text>
            {isInProgress && (
              <Text style={[styles.locationDetails, { fontFamily }]}>
                {etaMinutes} {getTranslation('min', lang)}, {distanceKm}{getTranslation('km', lang)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Price */}
      <View style={[styles.priceContainer, isRTL && styles.priceContainerRTL]}>
        <Text style={[styles.priceLabel, { fontFamily }]}>{getTranslation('price', lang)}: {price} {getTranslation('dz', lang)}</Text>
        <WalletIcon />
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionRow, isRTL && styles.actionRowRTL]}>
        {/* Cancel Button - disabled when ride is in progress */}
        <TouchableOpacity 
          style={[styles.cancelButton, isInProgress && styles.cancelButtonDisabled]} 
          onPress={onCancel}
          disabled={isInProgress}
        >
          <CloseIcon color={isInProgress ? '#999' : '#fff'} />
        </TouchableOpacity>

        {/* Call Driver Button */}
        <TouchableOpacity style={styles.callButton} onPress={onCallDriver}>
          <Text style={[styles.callButtonText, { fontFamily }]}>{getTranslation('callDriver', lang)}</Text>
          <PhoneIcon />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10001,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timer: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  locationIconContainer: {
    marginLeft: 12,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
    textAlign: 'right',
  },
  locationAddress: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 2,
  },
  locationDetails: {
    fontSize: 13,
    color: '#185ADC',
    textAlign: 'right',
  },
  dottedLine: {
    height: 30,
    width: 2,
    marginRight: 35,
    marginLeft: 'auto',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#185ADC',
    borderStyle: 'dotted',
  },
  dot: {
    width: 3,
    height: 3,
    backgroundColor: '#185ADC',
    borderRadius: 1.5,
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185ADC',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
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
    borderWidth: 1,
    borderColor: '#185ADC',
    backgroundColor: '#E8F0FE',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185ADC',
  },
  // Success/Completed styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#22c55e',
    marginBottom: 24,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  summaryValueHighlight: {
    fontSize: 18,
    color: '#185ADC',
    fontWeight: '700',
  },
  closeSuccessButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  closeSuccessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // RTL Styles
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  routeContainerRTL: {
    flexDirection: 'row-reverse',
  },
  locationRowRTL: {
    flexDirection: 'row-reverse',
  },
  priceContainerRTL: {
    flexDirection: 'row-reverse',
  },
  actionRowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryContainerRTL: {
    alignItems: 'flex-end',
  },
  summaryRowRTL: {
    flexDirection: 'row-reverse',
  },
});

export default ActiveRideBottomSheet;