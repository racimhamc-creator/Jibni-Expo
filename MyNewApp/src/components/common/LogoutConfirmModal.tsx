import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Language = 'ar' | 'fr' | 'en';

interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  language?: Language;
}

// Logout Door Icon
const LogoutIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      stroke="#EF4444"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 17l5-5-5-5"
      stroke="#EF4444"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 12H9"
      stroke="#EF4444"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  language = 'ar',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      slideAnim.setValue(40);
    }
  }, [visible]);

  const isRTL = language === 'ar';

  const title = language === 'ar'
    ? 'تسجيل الخروج'
    : language === 'fr'
      ? 'Déconnexion'
      : 'Log Out';

  const message = language === 'ar'
    ? 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟'
    : language === 'fr'
      ? 'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?'
      : 'Are you sure you want to log out of your account?';

  const confirmText = language === 'ar'
    ? 'نعم، تسجيل الخروج'
    : language === 'fr'
      ? 'Oui, se déconnecter'
      : 'Yes, Log Out';

  const cancelText = language === 'ar'
    ? 'إلغاء'
    : language === 'fr'
      ? 'Annuler'
      : 'Cancel';

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
          {/* Red accent bar */}
          <View style={styles.accentBar} />

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <LogoutIcon />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, isRTL && styles.textRTL]}>
            {message}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={[styles.buttonRow, isRTL && styles.buttonRowRTL]}>
            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            {/* Confirm Logout */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}>
                <Path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M16 17l5-5-5-5M21 12H9"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.confirmButtonText}>
                {confirmText}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: SCREEN_WIDTH - 56,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: {
    height: 4,
    backgroundColor: '#EF4444',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  textRTL: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 24,
    marginHorizontal: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  buttonRowRTL: {
    flexDirection: 'row-reverse',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default LogoutConfirmModal;
