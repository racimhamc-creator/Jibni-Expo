import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, TouchableOpacity, View, Keyboard } from 'react-native';
import { Box, Button, Header, Text } from '@/src/components/ui';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import InputsSection from '@/src/components/becomeDriver/InputsSection';
import UploadPicture from '@/src/components/becomeDriver/UploadPicture';
import * as ImagePicker from 'expo-image-picker';
import ImageModal from '@/src/components/becomeDriver/ImageModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WilayaPickerSheet from '@/src/components/becomeDriver/WilayaPickerSheet';
import RequestSentSuccessfully from '@/src/components/becomeDriver/RequestSentSuccessfully';
import { wilayas } from '@/src/components/becomeDriver/Wilayas';
import { useRouter } from 'expo-router';
import BottomSheet from '@/src/components/ui/BottomSheet';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const BecomeDriverScreen: React.FC = () => {
  const router = useRouter();
  const goback = () => router.back();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [drivingLicenceImage, setDrivingLicenceImage] = useState<any>(null);
  const [greyCardImage, setGreyCardImage] = useState<any>(null);
  const [hasAcceptedConditions, setHasAcceptedConditions] = useState<boolean>(false);

  const [showSheet, setShowSheet] = useState<string | false>(false);
  const [photo, setPhoto] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCanSendRequest, setIsCanSendRequest] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isWilayasBottomsheetVisible, setIsWilayasBottomsheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user already requested to be a driver
  const isAlreadyRequested = user?.isDriverRequested || false;

  const handleOpenPicker = async () => {
    const currentType = showSheet;
    setShowSheet(false);
    Keyboard.dismiss();

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please enable gallery access.');
        return;
      }

      // Allow sheet to close fully
      setTimeout(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const selectedImage = {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            path: asset.uri,
          };

          if (currentType === 'drivingLicence') {
            setDrivingLicenceImage(selectedImage);
          } else if (currentType === 'greyCard') {
            setGreyCardImage(selectedImage);
          }

          setPhoto(selectedImage);
          // Only show modal if needed, otherwise this is enough
          setIsModalVisible(true);
        }
      }, 600);
    } catch (error) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const handleBecomeDriver = async () => {
    if (isLoading || isAlreadyRequested) return;
    setIsLoading(true);
    try {
      const response = await api.requestDriver({
        firstName: firstname,
        lastName: lastname,
        wilaya: wilaya ? wilayas[wilaya] : undefined,
        city: wilaya ? wilayas[wilaya] : undefined,
        drivingLicense: drivingLicenceImage?.uri ? { url: drivingLicenceImage.uri, number: '' } : undefined,
        grayCard: greyCardImage?.uri ? { url: greyCardImage.uri, number: '' } : undefined,
      });

      if (response.status === 'success') {
        const { updateUser } = useAuthStore.getState();
        const currentUser = useAuthStore.getState().user;
        if (currentUser) updateUser({ ...currentUser, isDriverRequested: true });
        setRequestSent(true);
      }
    } catch (err: any) {
      Alert.alert(t('genericError'), err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If user already requested, we'll show the pending status in the form
    // Don't set requestSent to true, as we want to show the form with pending status
  }, [user?.isDriverRequested]);

  useEffect(() => {
    setIsCanSendRequest(
      !!(firstname.trim() && lastname.trim() && wilaya !== null && greyCardImage && drivingLicenceImage && hasAcceptedConditions && !isAlreadyRequested)
    );
  }, [firstname, lastname, wilaya, greyCardImage, drivingLicenceImage, hasAcceptedConditions, isAlreadyRequested]);

  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      <Header onPress={goback} />
      {requestSent ? (
        <RequestSentSuccessfully />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, marginHorizontal: 16, paddingBottom: insets.bottom + 15 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant={'header'} color={'primary'} textAlign={'center'} style={{ marginTop: 58 }}>
            {t('becomeDriver.screenTitle')}
          </Text>
          
          {isAlreadyRequested && (
            <View style={{
              backgroundColor: '#FFF3CD',
              borderColor: '#FFC107',
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              marginTop: 24,
              marginBottom: 16,
            }}>
              <Text variant={'subheader'} color={'text'} style={{ textAlign: 'center', fontWeight: '600' }}>
                {t('becomeDriver.requestPending') || 'Request Under Review'}
              </Text>
              <Text variant={'body'} color={'text'} style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                {t('becomeDriver.requestPendingDescription') || 'Your driver request is being reviewed. We will notify you once it\'s processed.'}
              </Text>
            </View>
          )}

          <InputsSection
            firstname={firstname} lastname={lastname} setLastname={setLastname}
            wilaya={wilaya} setFirstname={setFirstname}
            setIsWilayasBottomsheetVisible={setIsWilayasBottomsheetVisible}
            disabled={isAlreadyRequested}
          />

          <UploadPicture
            placeholder={t('becomeDriver.drivingLicencePlaceholder')}
            picturePath={drivingLicenceImage} 
            setShowSheet={() => !isAlreadyRequested && setShowSheet('drivingLicence')}
            disabled={isAlreadyRequested}
          />

          <UploadPicture
            placeholder={t('becomeDriver.greyCardPlaceholder')}
            picturePath={greyCardImage}
            setShowSheet={() => !isAlreadyRequested && setShowSheet('greyCard')}
            disabled={isAlreadyRequested}
          />

          <TouchableOpacity
            style={{ 
              flexDirection: 'row', 
              marginTop: 24, 
              alignItems: 'center', 
              marginBottom: 44,
              opacity: isAlreadyRequested ? 0.5 : 1
            }}
            onPress={() => !isAlreadyRequested && setHasAcceptedConditions(!hasAcceptedConditions)}
            disabled={isAlreadyRequested}
          >
            <View style={{
              height: 20, width: 20, borderRadius: 4, marginEnd: 8,
              borderWidth: hasAcceptedConditions ? 0 : 1, borderColor: theme.colors.primary 
            }}>
              {hasAcceptedConditions && <BlastedImage source={require('@/src/assets/checked.png')} style={{ height: 20, width: 20 }} />}
            </View>
            <Text variant={'body'} color={'primary'} textDecorationLine={'underline'}>{t('becomeDriver.acceptConditions')}</Text>
          </TouchableOpacity>

          <Button 
            disabled={!isCanSendRequest || isAlreadyRequested} 
            label={isAlreadyRequested ? (t('becomeDriver.requestPending') || 'Request Pending') : t('becomeDriver.sendRequest')} 
            onPress={handleBecomeDriver} 
            loading={isLoading} 
          />
        </ScrollView>
      )}

      <BottomSheet isVisible={!!showSheet} onClose={() => setShowSheet(false)}>
        {/* FIXED: Using standard View instead of Box to avoid theme spacing error */}
        <View style={{ paddingBottom: 20 }}>
          <Text variant={'header'} fontWeight={600}>{t(`becomeDriver.bottomSheetTitle.${showSheet}`)}</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row', backgroundColor: '#D1DEF8', borderRadius: 12, padding: 16, marginTop: 16,
              borderWidth: 1, borderColor: theme.colors.primary
            }}
            onPress={handleOpenPicker}
          >
            <BlastedImage source={require('@/src/assets/gallery-export.png')} style={{ height: 24, width: 24 }} />
            <Text variant={'subheader'} style={{ marginStart: 10 }}>{t('becomeDriver.uploadFromGallery')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <ImageModal
        setDrivingLicenceImage={setDrivingLicenceImage}
        setIsModalVisible={setIsModalVisible}
        setPhoto={setPhoto}
        setGreyCardImage={setGreyCardImage}
        setShowSheet={setShowSheet}
        showSheet={showSheet}
        photo={photo}
        isModalVisible={isModalVisible}
      />

      <WilayaPickerSheet
        visible={isWilayasBottomsheetVisible}
        onClose={() => setIsWilayasBottomsheetVisible(false)}
        selectedWilaya={wilaya}
        setSelectedWilaya={setWilaya}
      />
    </Box>
  );
};

export default BecomeDriverScreen;