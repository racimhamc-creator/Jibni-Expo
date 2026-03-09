import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Language, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

// Translation Dictionary
const translations = {
  ar: {
    title: "لم نعثر على سائقين بالقرب منك حاليًا",
    subtitle: "يرجى الاتصال بنا على الرقم أدناه وسنرسل إليك شاحنة سحب في أقرب وقت ممكن:",
    phoneNumber: "+213699999999",
    footer: "نعتذر على الإزعاج، وشكرًا لتفهمك.",
    button: "الاتصال بالرقم",
  },
  en: {
    title: "No drivers found near you currently",
    subtitle: "Please call us at the number below and we will send a tow truck to you as soon as possible:",
    phoneNumber: "+213699999999",
    footer: "We apologize for the inconvenience, and thank you for your understanding.",
    button: "Call Number",
  },
  fr: {
    title: "Aucun chauffeur trouvé à proximité",
    subtitle: "Veuillez nous appeler au numéro ci-dessous et nous vous enverrons une dépanneuse dès que possible :",
    phoneNumber: "+213699999999",
    footer: "Nous nous excusons pour la gêne occasionnée et vous remercions de votre compréhension.",
    button: "Appeler le numéro",
  },
};

interface DriverNotFoundProps {
  visible: boolean;
  onClose?: () => void;
  language?: 'en' | 'fr' | 'ar';
}

const CloseIcon: React.FC<{ color?: string; size?: number }> = ({
  color = '#666666',
  size = 24,
}) => (
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

const DriverNotFound: React.FC<DriverNotFoundProps> = ({
  visible,
  onClose,
  language = 'ar',
}) => {
  if (!visible) return null;

  const t = translations[language];
  const isRTL = language === 'ar';
  const fontFamily = getFontFamily(language);
  const boldFontFamily = getFontFamily(language, 'bold');

  const handleCall = () => {
    Linking.openURL(`tel:${t.phoneNumber}`);
  };

  const handleOverlayPress = () => {
    onClose?.();
  };

  return (
    <Pressable style={styles.overlay} onPress={handleOverlayPress}>
      <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <CloseIcon size={22} />
        </TouchableOpacity>

        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        {/* Main Title */}
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', fontFamily: boldFontFamily }]}>
          {t.title}
        </Text>

        {/* Subtitle Instruction */}
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left', fontFamily }]}>
          {t.subtitle}
        </Text>

        {/* Phone Number Display */}
        <Text style={[styles.phoneText, { fontFamily: boldFontFamily }]}>{t.phoneNumber}</Text>

        {/* Apology Footer */}
        <Text style={[styles.footerText, { textAlign: isRTL ? 'right' : 'left', fontFamily }]}>
          {t.footer}
        </Text>

        {/* Light Blue Action Button */}
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Text style={[styles.callButtonText, { fontFamily: boldFontFamily }]}>{t.button}</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-end',
    zIndex: 10000,
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingHorizontal: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dragHandle: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    width: 90,
    alignSelf: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#185ADC',
    marginBottom: 12,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  phoneText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#185ADC',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  callButton: {
    width: '100%',
    height: 65,
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: '#185ADC',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DriverNotFound;