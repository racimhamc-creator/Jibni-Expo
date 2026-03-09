import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ImageBackground, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';

const { width: deviceWidth } = Dimensions.get('window');

function LogoSvgComponent(props: any) {
  return (
    <Svg
      width={58}
      height={80}
      viewBox="0 0 58 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M27.198.056c12.48-.785 24.174 6.724 28.47 18.425 4.995 13.6-1.552 25.558-8.693 36.75-5.48 8.587-11.693 16.74-17.955 24.761-.173.044-.232-.11-.329-.202-.758-.712-1.884-2.373-2.583-3.272-7.894-10.163-19.891-26.076-23.902-38.11C-3.897 20.103 7.754 1.279 27.198.056v.001zm.534 10.514C12.702 11.756 5.708 30.451 16.42 41.098c-.426 5.075 1.282 9.773 5.52 12.711 9.868 6.84 22.616-1.767 20.21-13.378 10.598-11.603 1.435-31.11-14.42-29.86z"
        fill="#185ADC"
      />
      <Path
        d="M37.426 34.93c4.932 4.867 4.781 13.113-.841 17.362-6.274 4.743-15.801 1.913-18.105-5.67-.655-2.161-.143-3.72-.468-5.653-.2-1.197-2.519-2.969-1.064-4.226 1.438-1.244 3.807 1.12 4.685 2.202 1.906 2.348.598 4.43 1.977 6.806 2.366 4.07 8.604 3.687 10.1-.857 2.148-6.522-7.482-7.273-7.952-13.133-.142-1.78.256-3.858.272-5.661-1.344.032-3.238.354-3.563-1.428-.17-.936-.143-4.289-.032-5.292.12-1.065.703-1.813 1.797-1.93 3.245-.348 7.077.266 10.386-.005.914.02 1.561.94 1.658 1.802.116 1.035.135 4.435-.058 5.397-.445 2.21-2.653 1.188-4.142 1.586.228 1.178-.055 2.5.075 3.664.24 2.128 3.72 3.498 5.276 5.036h-.001z"
        fill="#FEC846"
      />
    </Svg>
  );
}

interface LoginScreenProps {
  onSendOtp: (phone: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSendOtp }) => {
  const { t, isRTL } = useLanguage();
  const [phone, setPhone] = useState('');

  const handleSendOtp = () => {
    if (!phone || phone.trim().length === 0) {
      Alert.alert(t('error'), t('enterPhoneNumber'));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      Alert.alert(t('error'), t('enterValidPhone'));
      return;
    }

    onSendOtp(phone);
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
              style={[styles.button, phone.length < 8 && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={phone.length < 8}
            >
              <Text translationKey="sendOtp" style={styles.buttonText} />
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
