import React from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/src/components/ui';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { theme } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const RequestSentSuccessfully: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const handleBackToHome = () => {
    router.back();
  };
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 53,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <BlastedImage
          source={require('@/src/assets/request-sent.png')}
          style={{
            height: 48,
            width: 48,
          }}
        />
        <Text variant={'header'} color={'primary'} marginTop={'l'}>
          {t('becomeDriver.requestSent') || 'Request Sent'}
        </Text>
        <Text
          variant="body"
          marginTop={'s'}
          style={{ color: '#000000E0', textAlign: 'center' }}
        >
          {t('becomeDriver.requestSentWarning') || 'We are analyzing your profile'}
        </Text>
      </View>
      <Button
        label={t('becomeDriver.backToHome') || 'Back to Home'}
        onPress={handleBackToHome}
        buttonStyle={{
          backgroundColor: '#E8EEFB',
        }}
        textStyle={{
          color: theme.colors.primary,
        }}
      />
    </View>
  );
};

export default RequestSentSuccessfully;
