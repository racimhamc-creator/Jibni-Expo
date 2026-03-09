import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Path, Circle } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

interface DemoMissionModalProps {
  visible: boolean;
  onClose: () => void;
  language?: Language;
}

// Location Pin Icon
const LocationPinIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#185ADC', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

// Star Icon
const StarIcon: React.FC<{ filled?: boolean; color?: string; size?: number }> = ({ 
  filled = true, 
  color = '#FFB800', 
  size = 16 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
  </Svg>
);

// Phone Icon
const PhoneIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#185ADC', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
const CloseIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#185ADC', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DemoMissionModal: React.FC<DemoMissionModalProps> = ({
  visible,
  onClose,
  language = 'ar',
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';

  // Demo data for realistic mission
  const missionData = {
    driverName: 'أحمد محمد',
    driverRating: 4.8,
    driverReviews: 324,
    vehicleType: 'Toyota Camry',
    vehicleColor: 'أبيض',
    vehiclePlate: 'أ-12345',
    pickupLocation: 'شارع الحرير، الجزائر العاصمة',
    destinationLocation: 'مطار هواري بومدين الدولي',
    distance: 12.5,
    estimatedTime: 25,
    price: 1850,
    status: 'on_the_way', // Can be: 'driving', 'waiting', 'arrived'
    progress: 0.65, // 65% complete
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const dz = getTranslation('dz', language);
  const min = getTranslation('min', language);
  const km = getTranslation('km', language);

  // Map coordinates for demo
  const pickupCoords = { latitude: 36.7538, longitude: 3.0588 };
  const destinationCoords = { latitude: 36.6911, longitude: 3.1737 };
  const driverCoords = { 
    latitude: pickupCoords.latitude + (destinationCoords.latitude - pickupCoords.latitude) * missionData.progress,
    longitude: pickupCoords.longitude + (destinationCoords.longitude - pickupCoords.longitude) * missionData.progress 
  };

  const getStatusText = () => {
    switch (missionData.status) {
      case 'driving':
        return isRTL ? 'السائق في الطريق' : 'Driver on the way';
      case 'waiting':
        return isRTL ? 'في انتظارك' : 'Waiting for you';
      case 'arrived':
        return isRTL ? 'وصل السائق' : 'Driver has arrived';
      default:
        return isRTL ? 'السائق في الطريق' : 'Driver on the way';
    }
  };

  const getStatusColor = () => {
    switch (missionData.status) {
      case 'driving':
        return '#185ADC';
      case 'waiting':
        return '#FFB800';
      case 'arrived':
        return '#00C851';
      default:
        return '#185ADC';
    }
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={[styles.statusText, { fontFamily }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: (pickupCoords.latitude + destinationCoords.latitude) / 2,
              longitude: (pickupCoords.longitude + destinationCoords.longitude) / 2,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={pickupCoords}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.pickupMarker}>
                <LocationPinIcon color="#185ADC" size={24} />
              </View>
            </Marker>

            {/* Destination Marker */}
            <Marker
              coordinate={destinationCoords}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.destinationMarker}>
                <LocationPinIcon color="#FF4444" size={24} />
              </View>
            </Marker>

            {/* Driver Marker */}
            <Marker
              coordinate={driverCoords}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.driverMarker}>
                <View style={styles.driverIcon}>
                  <Text style={styles.driverIconText}>🚗</Text>
                </View>
              </View>
            </Marker>

            {/* Route Line */}
            <Polyline
              coordinates={[pickupCoords, driverCoords, destinationCoords]}
              strokeColor="#185ADC"
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          </MapView>

          {/* Map Overlay Info */}
          <View style={styles.mapOverlay}>
            <View style={[styles.mapInfoCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.mapInfoItem}>
                <Text style={[styles.mapInfoLabel, { fontFamily }]}>{missionData.distance} {km}</Text>
                <Text style={[styles.mapInfoSublabel, { fontFamily }]}>{isRTL ? 'المسافة' : 'Distance'}</Text>
              </View>
              <View style={styles.mapInfoDivider} />
              <View style={styles.mapInfoItem}>
                <Text style={[styles.mapInfoLabel, { fontFamily }]}>{missionData.estimatedTime} {min}</Text>
                <Text style={[styles.mapInfoSublabel, { fontFamily }]}>{isRTL ? 'الوقت' : 'Time'}</Text>
              </View>
              <View style={styles.mapInfoDivider} />
              <View style={styles.mapInfoItem}>
                <Text style={[styles.mapInfoLabel, { fontFamily }]}>{missionData.price} {dz}</Text>
                <Text style={[styles.mapInfoSublabel, { fontFamily }]}>{isRTL ? 'السعر' : 'Price'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={[styles.driverInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>أ</Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={[styles.driverName, { fontFamily }]}>{missionData.driverName}</Text>
              <View style={[styles.ratingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      filled={star <= Math.floor(missionData.driverRating)}
                      color="#FFB800"
                      size={14}
                    />
                  ))}
                </View>
                <Text style={[styles.ratingText, { fontFamily }]}>
                  {missionData.driverRating} ({missionData.driverReviews})
                </Text>
              </View>
              <Text style={[styles.vehicleInfo, { fontFamily }]}>
                {missionData.vehicleType} • {missionData.vehicleColor} • {missionData.vehiclePlate}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeSection}>
          <View style={styles.routeItem}>
            <View style={[styles.routePoint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointIcon, { backgroundColor: '#185ADC' }]}>
                <LocationPinIcon color="white" size={16} />
              </View>
              <View style={styles.pointContent}>
                <Text style={[styles.pointLabel, { fontFamily }]}>{isRTL ? 'نقطة الانطلاق' : 'Pickup'}</Text>
                <Text style={[styles.pointAddress, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {missionData.pickupLocation}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.routeDots}>
    <View style={styles.routeDotsInner}>
      <View style={styles.routeDot} />
      <View style={styles.routeDot} />
      <View style={styles.routeDot} />
    </View>
  </View>

          <View style={styles.routeItem}>
            <View style={[styles.routePoint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pointIcon, { backgroundColor: '#FF4444' }]}>
                <LocationPinIcon color="white" size={16} />
              </View>
              <View style={styles.pointContent}>
                <Text style={[styles.pointLabel, { fontFamily }]}>{isRTL ? 'الوجهة' : 'Destination'}</Text>
                <Text style={[styles.pointAddress, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                  {missionData.destinationLocation}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={styles.callButton}>
            <PhoneIcon color="white" size={20} />
            <Text style={[styles.callButtonText, { fontFamily }]}>
              {isRTL ? 'اتصال' : 'Call'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.trackButton}>
            <Text style={[styles.trackButtonText, { fontFamily }]}>
              {isRTL ? 'تتبع الرحلة' : 'Track Trip'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 10002,
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  destinationMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  driverIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverIconText: {
    fontSize: 14,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  mapInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  mapInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185ADC',
  },
  mapInfoSublabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mapInfoDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  driverSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  driverInfo: {
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },
  routeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  routeItem: {
    marginBottom: 8,
  },
  routePoint: {
    alignItems: 'flex-start',
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pointContent: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  routeDots: {
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginVertical: 4,
  },
  routeDotsInner: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#185ADC',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#185ADC',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    flex: 2,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#185ADC',
  },
  trackButtonText: {
    color: '#185ADC',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DemoMissionModal;
