import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header, Text } from '@/src/components/ui';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');

const ImageModal: React.FC<{
  setIsModalVisible: (visible: boolean) => void;
  setPhoto: (photo: any) => void;
  setDrivingLicenceImage: (photo: any) => void;
  setGreyCardImage: (photo: any) => void;
  setShowSheet: (showSheet: string | false) => void;
  isModalVisible: boolean;
  photo: any;
  showSheet: string | false;
}> = ({
  setDrivingLicenceImage,
  setIsModalVisible,
  setPhoto,
  setGreyCardImage,
  setShowSheet,
  showSheet,
  photo,
  isModalVisible,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const closeModal = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setPhoto('');
      setShowSheet(false);
    }, 300);
  };

  const selectPhoto = () => {
    if (showSheet == 'drivingLicence') {
      setDrivingLicenceImage(photo);
    } else if (showSheet == 'greyCard') {
      setGreyCardImage(photo);
    }
    
    setIsModalVisible(false);
    setTimeout(() => {
      setPhoto('');
      setShowSheet(false);
    }, 300);
  };

  return (
    <Modal
      visible={isModalVisible}
      statusBarTranslucent
      onRequestClose={closeModal}
      animationType="fade"
      transparent={false}
    >
      <View
        style={{
          zIndex: 9999,
        }}
      >
        <Header onPress={closeModal} />
      </View>
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          {photo?.uri && (
            <BlastedImage
              source={{ uri: photo.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={selectPhoto}
            activeOpacity={0.8}
          >
            <Text color={'primary'} fontWeight={700} fontSize={14}>
              {t('becomeDriver.sendPic') || 'Send Photo'}
            </Text>
            <BlastedImage
              source={require('@/src/assets/send.png')}
              style={{
                height: 24,
                width: 24,
                marginStart: 8,
              }}
            />
          </TouchableOpacity>
          
          <View style={styles.infoContainer}>
            <BlastedImage
              source={require('@/src/assets/info-circle.png')}
              style={{
                height: 24,
                width: 24,
                marginEnd: 10,
              }}
            />
            <Text variant={'body'} fontSize={14} flex={1}>
              {t('becomeDriver.confirmInfos') || 'Please confirm the information is correct'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60, // Space for header
  },
  image: {
    width: deviceWidth,
    height: deviceHeight * 0.5,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sendButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#D1DEF8',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.mainBackground,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
});

export default ImageModal;
