import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Language, getFontFamily } from '../../utils/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Warning icon
const WarningIcon: React.FC = () => (
  <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="11" fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1} />
    <Path
      d="M12 8v4M12 16h.01"
      stroke="#D97706"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface DriverReconfirmModalProps {
  visible: boolean;
  onForceComplete: () => void;
  onCancel: () => void;
  language?: Language;
}

const DriverReconfirmModal: React.FC<DriverReconfirmModalProps> = ({
  visible,
  onForceComplete,
  onCancel,
  language = 'ar',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Shake animation for attention
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
      }, 400);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.95);
      shakeAnim.setValue(0);
    }
  }, [visible]);

  const title = language === 'ar'
    ? 'العميل لم يؤكد الوصول'
    : language === 'fr'
      ? 'Le client n\'a pas confirmé l\'arrivée'
      : 'Client did not confirm arrival';

  const message = language === 'ar'
    ? 'العميل أخبرنا أنه لم يصل بعد إلى الوجهة.\nهل أنت متأكد أن الرحلة اكتملت فعلاً؟'
    : language === 'fr'
      ? 'Le client nous a informé qu\'il n\'est pas encore arrivé à destination.\nÊtes-vous sûr que le trajet est terminé ?'
      : 'The client informed us they haven\'t arrived at the destination yet.\nAre you sure the ride is actually completed?';

  const warningNote = language === 'ar'
    ? '⚠️ إتمام الرحلة بدون موافقة العميل قد يؤثر على تقييمك'
    : language === 'fr'
      ? '⚠️ Terminer le trajet sans l\'accord du client peut affecter votre évaluation'
      : '⚠️ Completing without client agreement may affect your rating';

  const forceText = language === 'ar' ? 'نعم، الرحلة اكتملت' : language === 'fr' ? 'Oui, trajet terminé' : 'Yes, ride is complete';
  const cancelText = language === 'ar' ? 'لا، متابعة الرحلة' : language === 'fr' ? 'Non, continuer le trajet' : 'No, continue ride';

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
                { translateX: shakeAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Warning accent */}
          <View style={styles.warningAccent} />

          {/* Icon */}
          <View style={styles.iconContainer}>
            <WarningIcon />
          </View>

          {/* Client denied badge */}
          <View style={[styles.deniedBadge, isRTL && styles.deniedBadgeRTL]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6l12 12"
                stroke="#DC2626"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.deniedBadgeText, { fontFamily }]}>
              {language === 'ar' ? 'رفض العميل التأكيد' : language === 'fr' ? 'Client a refusé' : 'Client denied'}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'center' }]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { fontFamily, textAlign: isRTL ? 'right' : 'center' }]}>
            {message}
          </Text>

          {/* Warning note */}
          <View style={styles.warningBox}>
            <Text style={[styles.warningText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {warningNote}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* Cancel - continue ride (primary action) */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.continueButtonText, { fontFamily }]}>{cancelText}</Text>
            </TouchableOpacity>

            {/* Force complete (secondary/dangerous action) */}
            <TouchableOpacity
              style={styles.forceButton}
              onPress={onForceComplete}
              activeOpacity={0.85}
            >
              <Text style={[styles.forceButtonText, { fontFamily }]}>{forceText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
  warningAccent: {
    width: '100%',
    height: 4,
    backgroundColor: '#F59E0B',
    marginBottom: 24,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  deniedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deniedBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  deniedBadgeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  warningBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  continueButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#185ADC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#185ADC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  forceButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  forceButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default DriverReconfirmModal;
