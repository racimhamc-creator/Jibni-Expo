import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

interface BannedScreenProps {
  language?: Language;
  onContactSupport?: () => void;
  phoneNumber?: string;
}

const BannedScreen: React.FC<BannedScreenProps> = ({
  language = 'ar',
  onContactSupport,
  phoneNumber = '+213540619106',
}) => {
  const isRTL = language === 'ar';
  const fontFamily = getFontFamily(language);

  const handleWhatsAppPress = () => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    
    const message = isRTL 
      ? 'مرحباً، لقد تم حظر حسابي وأحتاج إلى المساعدة.'
      : language === 'fr'
      ? 'Bonjour, mon compte a été suspendu et j\'ai besoin d\'aide.'
      : 'Hello, my account has been banned and I need assistance.';
    
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Ionicons name="location-sharp" size={32} color="#667eea" />
        <Text style={[styles.logoText, { fontFamily }]}>DEPANINI</Text>
      </View>

      {/* Ban Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="remove-circle" size={48} color="#ef4444" />
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, isRTL && styles.textRTL, { fontFamily }]}>
        {getTranslation('accountBanned', language)}
      </Text>

      {/* Description */}
      <Text style={[styles.description, isRTL && styles.textRTL, { fontFamily }]}>
        {getTranslation('bannedDescription', language)}
      </Text>

      {/* WhatsApp Button */}
      <TouchableOpacity 
        style={styles.whatsappButton}
        onPress={handleWhatsAppPress}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="logo-whatsapp" 
          size={24} 
          color="#25D366" 
          style={[styles.whatsappIcon, isRTL && styles.iconRTL]}
        />
        <Text style={[styles.whatsappText, isRTL && styles.textRTL, { fontFamily }]}>
          {getTranslation('contactViaWhatsApp', language)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginLeft: 8,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  whatsappIcon: {
    marginRight: 10,
  },
  iconRTL: {
    marginRight: 0,
    marginLeft: 10,
  },
  whatsappText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
  },
});

export default BannedScreen;
