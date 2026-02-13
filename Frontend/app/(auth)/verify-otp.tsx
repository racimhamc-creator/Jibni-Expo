import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Box, Button, Text } from '@/src/components/ui';
import Header from '@/src/components/ui/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import OTPTextView from 'react-native-otp-textinput';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/src/theme';
import { DateTime } from 'luxon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

const MaxDelayToRequestCode = 60;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = params.phone as string || '';
  const initialCode = params.code as string || '';

  const [code] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [otpInput, setOtpInput] = useState<string>('');
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [expireIn, setExpireIn] = useState(() =>
    DateTime.now().plus({ seconds: MaxDelayToRequestCode }),
  );
  const [secondsBeforeNextCodeRequest, setSecondsBeforeNextCodeRequest] =
    useState(MaxDelayToRequestCode);
  const input = useRef<OTPTextView>(null);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const now = DateTime.now();
    const diff = Math.floor(expireIn.diff(now, 'seconds').seconds);
    const timer = setTimeout(() => {
      setSecondsBeforeNextCodeRequest(diff >= 0 ? diff : 0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsBeforeNextCodeRequest, expireIn]);

  const handleSendOtp = async () => {
    if (isLoading || isRequestingCode) {
      return;
    }
    setIsRequestingCode(true);
    try {
      const { api } = await import('@/services/api');
      await api.sendOTP(phone);
      setExpireIn(DateTime.now().plus({ seconds: MaxDelayToRequestCode }));
      setSecondsBeforeNextCodeRequest(MaxDelayToRequestCode);
      Alert.alert('Success', 'OTP sent successfully. Check console for code (dev mode).');
    } catch (error: any) {
      Alert.alert(t('genericError') || 'An error occurred', error.message || 'Failed to send OTP');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) {
      return;
    }
    
    if (otpInput.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP code');
      return;
    }

    try {
      setIsLoading(true);
      await login(phone, otpInput);
      // Navigate to permissions screen after successful login
      router.replace('/(auth)/permissions');
    } catch (error: any) {
      Alert.alert(
        t('genericError') || 'Error',
        error.message || 'Invalid OTP. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellTextChange = async (text: string, i: number) => {
    if (i === 0) {
      const clippedText = await Clipboard.getStringAsync();
      if (clippedText.slice(0, 1) === text) {
        input.current?.setValue(clippedText, true);
      }
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <Box
      flex={1}
      backgroundColor={'mainBackground'}
      style={{
        paddingBottom: insets.bottom + 16,
      }}
    >
      <Header onPress={goBack} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{
          flex: 1,
          paddingHorizontal: 24,
        }}
      >
        <BlastedImage
          source={require('@/src/assets/verify_otp.png')}
          style={{
            height: 48,
            width: 48,
            marginTop: 48,
            marginBottom: 24,
            alignSelf: 'center',
          }}
        />
        <Text
          variant={'header'}
          textAlign={'center'}
          color={'primary'}
          marginBottom={'m'}
        >
          {t('verifyOtp.screenTitle') || 'Verify OTP'}
        </Text>
        <Text
          variant={'subheader'}
          fontSize={16}
          color={'text'}
          textAlign={'center'}
          marginBottom={'m'}
        >
          {t('verifyOtp.screenDescription') || `Enter the code sent to ${phone}`}
        </Text>
        <OTPTextView
          ref={input}
          containerStyle={styles.textInputContainer}
          tintColor={'#F7F6F5'}
          offTintColor={'#F7F6F5'}
          textInputStyle={styles.textInput}
          cursorColor={theme.colors.primary}
          handleTextChange={setOtpInput}
          handleCellTextChange={handleCellTextChange}
          inputCount={6}
          keyboardType="numeric"
        />
        <Text
          textAlign={'center'}
          marginTop={'l'}
          variant={'body'}
          fontSize={12}
        >
          {t('verifyOtp.didNotReceiveCode') || "Didn't receive code?"}
        </Text>
        {secondsBeforeNextCodeRequest <= 0 ? (
          <TouchableOpacity onPress={handleSendOtp}>
            {isRequestingCode ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                variant={'body'}
                fontSize={12}
                color={'primary'}
                textDecorationLine={'underline'}
                textAlign={'center'}
                style={{ lineHeight: 30 }}
              >
                {t('verifyOtp.resendCode') || 'Resend Code'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text textAlign={'center'} variant={'body'} fontSize={12}>
            {t('verifyOtp.resendCodeIn') || 'Resend code in'} 00:
            {secondsBeforeNextCodeRequest < 10
              ? '0' + secondsBeforeNextCodeRequest
              : secondsBeforeNextCodeRequest}
          </Text>
        )}
        <Button
          label={t('verifyOtp.checkCode') || 'Verify Code'}
          disabled={isRequestingCode}
          onPress={handleVerifyOtp}
          style={{
            marginTop: 30,
          }}
          loading={isLoading}
        />
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  textInputContainer: {
    marginBottom: 0,
    direction: 'ltr',
  },
  textInput: {
    height: 46,
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#F7F6F5',
    padding: 10,
    fontSize: 16,
    letterSpacing: 5,
    textAlign: 'center',
  },
});
