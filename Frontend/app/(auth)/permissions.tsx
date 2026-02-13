import React from 'react';
import { ImageRequireSource, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Box, Button, Text } from '@/src/components/ui';
import Header from '@/src/components/ui/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { theme } from '@/src/theme';
import { useRouter, Redirect, useSegments } from 'expo-router';
import { usePermissions } from '@/src/hooks/usePermissions';

type permissionId = 'location' | 'notification' | 'backgroundLocation';

type permissionItem = {
  id: permissionId;
  icon: ImageRequireSource;
};

const androidVersion = Platform.Version as number;

const PermissionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const {
    permissions,
    onRequestFineLocation,
    onRequestNotificationPermission,
    onRequestBackgroundLocation,
    setNeedsAllowPermissions,
  } = usePermissions();
  const insets = useSafeAreaInsets();
  const [shouldNavigate, setShouldNavigate] = React.useState(false);

  const localPermissions: permissionItem[] =
    androidVersion > 28
      ? [
          {
            id: 'location',
            icon: require('@/src/assets/location.png'),
          },
          {
            id: 'notification',
            icon: require('@/src/assets/notification.png'),
          },
          {
            id: 'backgroundLocation',
            icon: require('@/src/assets/backgroundLocation.png'),
          },
        ]
      : [
          {
            id: 'location',
            icon: require('@/src/assets/location.png'),
          },
          {
            id: 'notification',
            icon: require('@/src/assets/notification.png'),
          },
        ];

  const goback = () => {
    router.back();
  };

  const requestPermission = (id: permissionId) => {
    if (id == 'notification') {
      onRequestNotificationPermission();
    } else if (id == 'location') {
      onRequestFineLocation();
    } else if (id == 'backgroundLocation') {
      onRequestBackgroundLocation();
    }
  };

  const handleContinue = () => {
    setNeedsAllowPermissions(false);
    // Set state to trigger redirect
    setShouldNavigate(true);
  };

  // Use Redirect component for navigation (more reliable with Expo Router)
  if (shouldNavigate) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Box
      flex={1}
      backgroundColor={'mainBackground'}
      style={{
        paddingBottom: insets.bottom + 16,
      }}
    >
      <Header onPress={goback} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
        }}
      >
        <Text
          variant={'header'}
          color={'primary'}
          textAlign={'center'}
          style={{ marginTop: 48, marginBottom: 32 }}
        >
          {t('permissions.screenTitle') || 'Permissions'}
        </Text>
        {localPermissions.map((item, index) => (
          <Box
            key={item.id}
            flexDirection={'row'}
            borderWidth={1}
            borderRadius={8}
            alignItems={'center'}
            style={{
              borderColor: '#D1DEF8',
              paddingHorizontal: 12,
              paddingVertical: 20,
              marginBottom: 16,
            }}
          >
            <BlastedImage
              source={item.icon}
              style={{
                height: 24,
                width: 24,
              }}
            />
            <Text
              variant={'body'}
              flex={1}
              style={{
                marginHorizontal: 8,
              }}
            >
              {t(`permissions.${item.id}`) || item.id}
            </Text>
            <TouchableOpacity
              disabled={permissions[item.id]}
              style={{
                width: 44,
                height: 24,
                backgroundColor: permissions[item.id]
                  ? theme.colors.primary
                  : '#D1DEF8',
                borderRadius: 50,
                alignItems: !permissions[item.id] ? 'flex-start' : 'flex-end',
                justifyContent: 'center',
                padding: 2,
              }}
              onPress={() => requestPermission(item.id)}
            >
              <Box
                backgroundColor={'mainBackground'}
                height={20}
                width={20}
                borderRadius={10}
              />
            </TouchableOpacity>
          </Box>
        ))}
        <Button
          label={t('permissions.createAccount') || 'Continue'}
          onPress={handleContinue}
          disabled={Object.values(permissions).some(item => item === false)}
          style={{
            marginTop: 16,
          }}
        />
      </ScrollView>
    </Box>
  );
};

export default PermissionsScreen;
