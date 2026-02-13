import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Box, Button, Text } from '@/src/components/ui';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
// import Animated, { SlideInDown } from 'react-native-reanimated';
import { theme } from '@/src/theme';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LanguageOption = {
  id: 'fr' | 'en' | 'ar';
  flag: any; // ImageRequireSource
};

function LogoSvgComponent(props: any) {
  return (
    <Svg
      width={103}
      height={144}
      viewBox="0 0 103 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M47.919.101c22.465-1.413 43.513 12.103 51.247 33.165 8.989 24.48-2.795 46.004-15.648 66.149-9.864 15.456-21.048 30.132-32.32 44.571-.312.079-.417-.199-.592-.364-1.365-1.281-3.392-4.271-4.649-5.89-14.209-18.293-35.805-46.936-43.024-68.596C-8.052 36.184 12.919 2.3 47.919.099V.1zm.96 18.925C21.824 21.16 9.237 54.812 28.52 73.976c-.766 9.136 2.31 17.592 9.936 22.88 17.763 12.312 40.71-3.18 36.38-24.08C93.91 51.89 77.417 16.778 48.879 19.03v-.003z"
        fill="#fff"
      />
      <Path
        d="M66.328 62.872c8.877 8.762 8.607 23.606-1.513 31.254-11.294 8.537-28.442 3.442-32.588-10.206-1.181-3.89-.259-6.695-.843-10.176-.362-2.155-4.535-5.344-1.917-7.607 2.59-2.24 6.853 2.017 8.434 3.964 3.43 4.225 1.076 7.974 3.56 12.25 4.258 7.327 15.485 6.637 18.18-1.543 3.866-11.74-13.469-13.09-14.314-23.639-.257-3.202.46-6.944.488-10.19-2.42.058-5.828.638-6.412-2.57-.307-1.684-.259-7.72-.057-9.526.215-1.916 1.264-3.262 3.233-3.473 5.842-.628 12.738.48 18.695-.01 1.646.036 2.81 1.692 2.985 3.244.208 1.863.242 7.983-.106 9.715-.8 3.979-4.773 2.139-7.454 2.855.41 2.12-.1 4.498.135 6.594.43 3.83 6.694 6.298 9.497 9.067l-.003-.003z"
        fill="#fff"
      />
    </Svg>
  );
}

const languages: LanguageOption[] = [
  {
    id: 'fr',
    flag: require('@/src/assets/fr.png'),
  },
  {
    id: 'en',
    flag: require('@/src/assets/uk.png'),
  },
  {
    id: 'ar',
    flag: require('@/src/assets/algeria.png'),
  },
];

export default function SelectLanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en' | 'ar' | null>(null);
  const [isBoxVisible, setIsBoxVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      setIsBoxVisible(true);
    }, 0);
  }, []);

  const handleSelectLanguage = async () => {
    if (!selectedLanguage) {
      return;
    }
    // Save language preference
    i18n.changeLanguage(selectedLanguage);
    // Store language preference in AsyncStorage
    await AsyncStorage.setItem('@jibni:language', selectedLanguage);
    console.log('Selected language:', selectedLanguage);
    // Navigate to login screen
    router.replace('/(auth)/login');
  };

  return (
    <Box flex={1} backgroundColor={'primary'}>
      <Box flex={1} justifyContent={'center'} alignItems={'center'}>
        <LogoSvgComponent />
        <Text
          marginTop={'l'}
          style={{
            color: 'white',
            fontSize: 24,
            fontWeight: '900',
          }}
        >
          Jibni
        </Text>
      </Box>
      {isBoxVisible && (
        <View
          style={{
            backgroundColor: 'white',
            marginHorizontal: 16,
            padding: 24,
            borderRadius: 12,
            marginBottom: insets.bottom + 24,
          }}
        >
          <Text variant="header" style={{ direction: 'rtl' }}>
            {t('language.selectLanguage') || 'Select Language'}
          </Text>
          <Text
            variant="subheader"
            style={{ fontSize: 16, direction: 'rtl' }}
            marginBottom={'l'}
          >
            {t('language.selectLanguageDescription') || 'Choose your preferred language'}
          </Text>
          <Box
            flexDirection={'row'}
            justifyContent={'space-between'}
            marginBottom={'l'}
            style={{
              direction: 'rtl',
            }}
          >
            {languages.map(item => (
              <TouchableOpacity
                key={item.id}
                style={{
                  width: 82,
                  borderWidth: 1,
                  borderColor:
                    selectedLanguage == item.id
                      ? theme.colors.primary
                      : '#D1DEF8',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 8,
                }}
                onPress={() => setSelectedLanguage(item.id)}
              >
                <BlastedImage
                  source={item.flag}
                  style={{
                    width: 34,
                    height: 24,
                  }}
                />
                <Text
                  variant={'body'}
                  textAlign={'center'}
                  style={{
                    color: '#000000CC',
                    marginTop: 12,
                  }}
                >
                  {t(`language.${item.id}`) || item.id.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </Box>
          <Button
            label={t('continue') || 'Continue'}
            onPress={handleSelectLanguage}
            disabled={!selectedLanguage}
          />
        </View>
      )}
    </Box>
  );
}
