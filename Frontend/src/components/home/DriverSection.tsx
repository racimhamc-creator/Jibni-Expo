import React from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Text } from '@/src/components/ui';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';

const { width: deviceWidth } = Dimensions.get('window');

const DriverSection: React.FC<{ handleBecomeDriver: () => void }> = ({
  handleBecomeDriver,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // TODO: Get user from auth store
  const user = null; // Placeholder - will get from store later

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 31,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <BlastedImage
        source={require('@/src/assets/header_logo.png')}
        style={{
          width: 70,
          height: 24,
          alignSelf: 'center',
        }}
      />
      <View
        style={{
          backgroundColor: user?.requestedToBeServer
            ? '#E8EEFB'
            : theme.colors.primary,
          flexDirection: 'row',
          marginHorizontal: 24,
          paddingStart: 24,
          paddingTop: 16,
          borderRadius: 12,
          width: deviceWidth - 48,
          overflow: 'hidden',
          marginTop: 17,
          minHeight: 150,
        }}
      >
        <BlastedImage
          source={require('@/src/assets/home_wave_1.png')}
          style={{
            position: 'absolute',
            top: 0,
            end: 0,
            height: 69,
            width: 325,
            ...theme.RTLMirror,
          }}
        />
        <BlastedImage
          source={require('@/src/assets/home_wave_2.png')}
          style={{
            position: 'absolute',
            bottom: 0,
            end: 0,
            height: 83,
            width: 305,
            ...theme.RTLMirror,
          }}
        />
        <View
          style={{
            flex: 1,
            zIndex: 999,
            alignItems: 'flex-start',
            paddingBottom: 10,
          }}
        >
          <Text
            variant={'header'}
            color={'mainBackground'}
            fontSize={20}
            fontWeight={500}
            style={[
              {
                flexShrink: 1,
              },
              user?.requestedToBeServer && {
                color: theme.colors.primary,
              },
            ]}
          >
            {user?.requestedToBeServer
              ? t('home.requestSent') || 'Request Sent'
              : t('home.wannaBeDriver') || 'Want to be a driver?'}
          </Text>
          {user?.requestedToBeServer ? (
            <Text
              marginTop={'s'}
              variant={'subheader'}
              adjustsFontSizeToFit
              numberOfLines={6}
              style={{
                flex: 1,
              }}
            >
              {t('home.nowWeAreAnalisingYourProfile') ||
                'We are analyzing your profile'}
            </Text>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: '#FEC846',
                marginTop: 14,
                borderRadius: 12,
                padding: 10,
              }}
              onPress={handleBecomeDriver}
            >
              <Text
                fontWeight={500}
                fontSize={14}
                color={'text'}
                textAlign={'center'}
              >
                {t('home.requestNow') || 'Request Now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View
          style={{
            justifyContent: 'flex-end',
          }}
        >
          <BlastedImage
            source={require('@/src/assets/home_picture.png')}
            style={{
              position: 'absolute',
              bottom: 0,
              end: 0,
              height: 140,
              width: 186,
              ...theme.RTLMirror,
            }}
          />
          <View style={{ width: 186 }} />
        </View>
      </View>
    </View>
  );
};

export default DriverSection;
