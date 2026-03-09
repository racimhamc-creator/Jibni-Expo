import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated checkmark icon
const CompletionIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="11" stroke="#185ADC" strokeWidth={1.5} fill="#EEF2FF" />
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill="#185ADC"
      opacity={0.15}
    />
    <Path
      d="M17 8L10.5 15.5L7 12"
      stroke="#185ADC"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Question mark badge
const QuestionBadge: React.FC = () => (
  <View style={styles.questionBadge}>
    <Text style={styles.questionBadgeText}>?</Text>
  </View>
);

interface RideCompletionConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onDeny: () => void;
  language?: Language;
  rideData?: {
    pickupAddress?: string;
    destinationAddress?: string;
    price?: number;
  } | null;
}

const RideCompletionConfirmModal: React.FC<RideCompletionConfirmModalProps> = ({
  visible,
  onConfirm,
  onDeny,
  language = 'ar',
  rideData,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for icon
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Translations
  const title = language === 'ar' 
    ? 'هل وصلت إلى وجهتك؟' 
    : language === 'fr' 
      ? 'Êtes-vous arrivé à destination ?' 
      : 'Have you arrived at your destination?';

  const subtitle = language === 'ar'
    ? 'يرجى تأكيد أن الرحلة قد اكتملت بنجاح'
    : language === 'fr'
      ? 'Veuillez confirmer que le trajet est bien terminé'
      : 'Please confirm the ride has been completed successfully';

  const driverRequestText = language === 'ar'
    ? 'السائق أكد إكمال الرحلة'
    : language === 'fr'
      ? 'Le chauffeur a confirmé la fin du trajet'
      : 'The driver has confirmed ride completion';

  const yesText = language === 'ar' ? 'نعم، تم الوصول' : language === 'fr' ? 'Oui, je suis arrivé' : 'Yes, I arrived';
  const noText = language === 'ar' ? 'لا، لم أصل بعد' : language === 'fr' ? 'Non, pas encore' : 'No, not yet';

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Top accent line */}
          <View style={styles.accentLine} />

          {/* Icon with pulse */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <CompletionIcon />
            <QuestionBadge />
          </Animated.View>

          {/* Driver notification badge */}
          <View style={[styles.driverBadge, isRTL && styles.driverBadgeRTL]}>
            <View style={styles.driverBadgeDot} />
            <Text style={[styles.driverBadgeText, { fontFamily }]}>{driverRequestText}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'center' }]}>
            {title}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'center' }]}>
            {subtitle}
          </Text>

          {/* Ride info summary */}
          {rideData && (
            <View style={styles.rideSummary}>
              {rideData.destinationAddress && (
                <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                  <View style={[styles.summaryDot, { backgroundColor: '#185ADC' }]} />
                  <Text style={[styles.summaryText, { fontFamily }]} numberOfLines={1}>
                    {rideData.destinationAddress}
                  </Text>
                </View>
              )}
              {rideData.price && (
                <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                  <View style={[styles.summaryDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.summaryText, { fontFamily, color: '#22C55E', fontWeight: '600' }]}>
                    {rideData.price} {getTranslation('dz', language)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 6L9 17l-5-5"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.confirmButtonText, { fontFamily }]}>{yesText}</Text>
            </TouchableOpacity>

            {/* Deny Button */}
            <TouchableOpacity
              style={styles.denyButton}
              onPress={onDeny}
              activeOpacity={0.85}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.denyButtonText, { fontFamily }]}>{noText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  accentLine: {
    width: '100%',
    height: 4,
    backgroundColor: '#185ADC',
    marginBottom: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#C7D2FE',
  },
  questionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  questionBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  driverBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  driverBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  driverBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  rideSummary: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryRowRTL: {
    flexDirection: 'row-reverse',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  confirmButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  denyButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  denyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default RideCompletionConfirmModal;
