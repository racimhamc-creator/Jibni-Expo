import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, ImageBackground, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, Text as RNText } from 'react-native';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeAlgerianPhoneNumber } from '../../utils/phoneUtils';

interface LoginScreenProps {
  onSendOtp: (phoneNumber: string) => void;
}

// Simple Logo component without SVG
const LogoSvgComponent = ({ style }: { style?: any }) => (
  <View style={[style, { alignItems: 'center', justifyContent: 'center', marginBottom: 20 }]}>
    <View style={styles.logoCircle}>
      <RNText style={styles.logoLetter}>D</RNText>
    </View>
  </View>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onSendOtp }) => {
  const { t, isRTL } = useLanguage();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length === 0) {
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      return;
    }

    // Set loading state
    setIsLoading(true);

    // Normalize phone number to +213 format before sending
    const normalizedPhone = normalizeAlgerianPhoneNumber(phone);
    console.log('📱 Phone normalized:', { original: phone, normalized: normalizedPhone });
    
    try {
      await onSendOtp(normalizedPhone);
    } finally {
      // Stop loading regardless of result
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ImageBackground
        source={require('../../assets/login_background_image.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.spacer} />
          <View style={styles.card}>
            <LogoSvgComponent style={styles.logo} />
            <Text translationKey="welcome" style={styles.title} />
            <Text translationKey="enterPhone" style={styles.subtitle} />

            <View style={styles.phoneContainer}>
              <Text style={styles.countryCode}>+213</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder={t('phoneNumber')}
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button, 
                (phone.length < 8 || isLoading) && styles.buttonDisabled
              ]}
              onPress={handleSendOtp}
              disabled={phone.length < 8 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text translationKey="sendOtp" style={styles.buttonText} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 32,
    minHeight: '100%',
  },
  spacer: {
    flex: 1,
    minHeight: 200,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#000000B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E0DC',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  countryCode: {
    backgroundColor: '#F7F6F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderRightWidth: 1,
    borderRightColor: '#E2E0DC',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D1DEF8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
