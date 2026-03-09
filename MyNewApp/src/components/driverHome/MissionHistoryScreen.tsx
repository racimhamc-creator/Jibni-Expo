import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getTranslation } from '../../utils/translations';
import { api } from '../../services/api';

const { width: deviceWidth } = Dimensions.get('window');

// Location Pin Icon
const LocationPinIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} fill="white" />
    <Path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// Dotted Line between locations
const DottedLine: React.FC = () => (
  <View style={styles.dottedLine}>
    <View style={styles.dot} />
    <View style={styles.dot} />
    <View style={styles.dot} />
  </View>
);

interface Mission {
  _id: string;
  rideId: string;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  destinationLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  pricing: {
    totalPrice: number;
    currency: string;
  };
  completedAt?: string;
  vehicleType?: string;
  createdAt?: string;
}

interface MissionHistoryScreenProps {
  language?: Language;
  onBack: () => void;
}

const MissionHistoryScreen: React.FC<MissionHistoryScreenProps> = ({
  language = 'ar',
  onBack,
}) => {
  const lang = language;
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/rides/completed');
      console.log('📜 Completed rides:', response);
      setMissions(response.data || []);
    } catch (err) {
      console.error('Error fetching missions:', err);
      setError('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string, fallbackDate?: string) => {
    const dateStr = dateString || fallbackDate;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getVehicleImage = (vehicleType?: string) => {
    switch (vehicleType) {
      case 'moto':
        return require('../../assets/Oval.png');
      case 'truck':
      case 'camion':
        return require('../../assets/camion.png');
      case 'van':
        return require('../../assets/wallet.png');
      case 'car':
      default:
        return require('../../assets/blue_location.png');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backArrow}>{lang === 'ar' ? '←' : '→'}</Text>
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <LocationPinIcon />
            <Text style={styles.logoText}>DEPANINI</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#185ADC" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{lang === 'ar' ? '←' : '→'}</Text>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <LocationPinIcon />
          <Text style={styles.logoText}>JIBNI</Text>
        </View>
        <TouchableOpacity onPress={fetchMissions} style={styles.refreshButton}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[styles.title, lang === 'ar' && styles.arabicText]}>
        {getTranslation('activityLog', lang)}:
      </Text>

      {/* Mission List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {missions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {getTranslation('noMissionsYet', lang)}
            </Text>
          </View>
        ) : (
          missions.map((mission, index) => (
            <View key={mission._id || index} style={styles.missionCard}>
              {/* Left Side - Price and Date */}
              <View style={styles.leftSection}>
                <Text style={styles.price}>
                  {mission.pricing?.totalPrice || 0} {mission.pricing?.currency || 'DZD'}
                </Text>
                <Text style={styles.date}>
                  {formatDate(mission.completedAt, mission.createdAt)}
                </Text>
              </View>

              {/* Center - Route Info */}
              <View style={styles.centerSection}>
                <View style={styles.routeRow}>
                  <Text style={[styles.routeText, lang === 'ar' && styles.arabicText]}>
                    {getTranslation('from', lang)}
                  </Text>
                  <LocationPinIcon color="#185ADC" />
                </View>
                <DottedLine />
                <View style={styles.routeRow}>
                  <Text style={[styles.routeText, lang === 'ar' && styles.arabicText]}>
                    {getTranslation('to', lang)}
                  </Text>
                  <LocationPinIcon color="#22C55E" />
                </View>
              </View>

              {/* Right Side - Vehicle Image */}
              <View style={styles.rightSection}>
                <Image
                  source={getVehicleImage(mission.vehicleType)}
                  style={styles.vehicleImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#185ADC',
    fontWeight: '600',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#185ADC',
  },
  placeholder: {
    width: 40,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 20,
    color: '#185ADC',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  arabicText: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  missionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    justifyContent: 'center',
    minWidth: 80,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#185ADC',
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  centerSection: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
  },
  dottedLine: {
    height: 24,
    width: 2,
    marginRight: 9,
    marginVertical: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#185ADC',
    borderStyle: 'dotted',
    justifyContent: 'space-between',
  },
  dot: {
    width: 2,
    height: 2,
    backgroundColor: '#185ADC',
    borderRadius: 1,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  vehicleImage: {
    width: 50,
    height: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default MissionHistoryScreen;
