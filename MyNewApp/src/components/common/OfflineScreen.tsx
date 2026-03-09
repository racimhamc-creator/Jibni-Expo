import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getTranslation } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

// DEPANINI Logo Icon
const LogoIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      fill="#185ADC"
    />
    <Circle cx="12" cy="9" r="2.5" fill="white" />
  </Svg>
);

// WiFi Off Icon (No connection)
const WifiOffIcon: React.FC = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"
      stroke="#E07A3E"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Refresh/Retry Icon
const RefreshIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
      stroke="#185ADC"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface OfflineScreenProps {
  language?: Language;
  onRetry: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({
  language = 'ar',
  onRetry,
}) => {
  const lang = language;

  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <LogoIcon />
        <Text style={styles.logoText}>DEPANINI</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Offline Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <WifiOffIcon />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, lang === 'ar' && styles.arabicText]}>
          {getTranslation('noInternetConnection', lang)}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, lang === 'ar' && styles.arabicText]}>
          {getTranslation('checkConnection', lang)}
        </Text>
      </View>

      {/* Retry Button */}
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={[styles.retryText, lang === 'ar' && styles.arabicText]}>
          {getTranslation('retryConnection', lang)}
        </Text>
        <RefreshIcon />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#185ADC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#E07A3E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: deviceWidth - 80,
  },
  arabicText: {
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#185ADC',
  },
});

export default OfflineScreen;
