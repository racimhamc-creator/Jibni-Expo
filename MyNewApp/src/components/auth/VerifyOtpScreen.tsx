import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';

const MaxDelayToRequestCode = 60;

interface VerifyOtpScreenProps {
  phone: string;
  onVerifyOtp: (code: string) => void;
  onResendOtp: () => void;
  onBack: () => void;
}

const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({
  phone,
  onVerifyOtp,
  onResendOtp,
  onBack,
}) => {
  const { t } = useLanguage();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [secondsBeforeNextCodeRequest, setSecondsBeforeNextCodeRequest] = useState(MaxDelayToRequestCode);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsBeforeNextCodeRequest((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 4).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 4) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + digits.length - 1, 3);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 4) {
      return;
    }
    setIsLoading(true);
    try {
      await onVerifyOtp(code);
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isRequestingCode || secondsBeforeNextCodeRequest > 0) {
      return;
    }
    setIsRequestingCode(true);
    await onResendOtp();
    setSecondsBeforeNextCodeRequest(MaxDelayToRequestCode);
    setIsRequestingCode(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← {t('back')}</Text>
      </TouchableOpacity>

      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔐</Text>
      </View>

      <Text translationKey="verifyOtp" style={styles.title} />
      <Text style={styles.subtitle}>
        {t('enterOtp')} {phone}
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpInput}
            value={digit}
            onChangeText={(text) => handleOtpChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <Text translationKey="didntReceiveCode" style={styles.resendText} />
      {secondsBeforeNextCodeRequest > 0 ? (
        <Text style={styles.resendTimer}>
          {t('resendIn')} {formatTime(secondsBeforeNextCodeRequest)}
        </Text>
      ) : (
        <TouchableOpacity onPress={handleResendOtp} disabled={isRequestingCode}>
          <Text translationKey="resendOtp" style={styles.resendLink} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, (isLoading || otp.join('').length !== 4) && styles.buttonDisabled]}
        onPress={handleVerifyOtp}
        disabled={isLoading || otp.join('').length !== 4}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>
            {t('verifyOtp')}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 48,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#185ADC',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#185ADC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#F7F6F5',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resendText: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    marginTop: 8,
  },
  resendTimer: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
    marginTop: 4,
  },
  resendLink: {
    fontSize: 12,
    color: '#185ADC',
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
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

export default VerifyOtpScreen;
