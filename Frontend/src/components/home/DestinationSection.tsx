import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Text } from '@/src/components/ui';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';
// Temporarily disable animation until reanimated is properly configured
// import Animated, { SlideInDown } from 'react-native-reanimated';

const { width: deviceWidth } = Dimensions.get('window');

const DestinationSection: React.FC<{ 
  onSelectAddress: () => void;
  selectedDestination?: string;
}> = ({
  onSelectAddress,
  selectedDestination,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 1000);
  }, []);

  return (
    visible && (
      <View
        // Temporarily using View instead of Animated.View until reanimated is configured
        // entering={SlideInDown}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 53,
          width: deviceWidth - 32,
          backgroundColor: 'white',
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 32,
          borderRadius: 33,
          marginHorizontal: 16,
        }}
      >
        <View
          style={{
            height: 2,
            backgroundColor: '#00000033',
            borderRadius: 2,
            width: 106,
            alignSelf: 'center',
          }}
        />
        <Text
          variant={'header'}
          fontWeight={600}
          style={{
            marginTop: 18,
          }}
        >
          {t('home.whereUWannaGo') || 'Where do you want to go?'}
        </Text>
        <Text variant={'subheader'}>
          {t('home.fillDestination') || 'Fill in your destination'}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginTop: 16,
            paddingVertical: 14,
          }}
          onPress={onSelectAddress}
        >
          <Text
            variant={'subheader'}
            style={{
              color: selectedDestination ? '#000000E0' : '#00000080',
              flex: 1,
            }}
          >
            {selectedDestination || t('home.destination') || 'Destination'}
          </Text>
          <BlastedImage
            source={require('@/src/assets/arrow-left.png')}
            style={{
              height: 24,
              width: 24,
              ...theme.RTLMirror,
            }}
          />
        </TouchableOpacity>
      </View>
    )
  );
};

export default DestinationSection;
