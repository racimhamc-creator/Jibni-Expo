import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View, StyleSheet, TextInput, Keyboard, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { api } from '../../services/api';
import { storage } from '../../services/storage';
import { wilayas, getWilayaName } from './Wilayas';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';

interface BecomeDriverScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onViewTerms?: () => void;
}

const BecomeDriverScreen: React.FC<BecomeDriverScreenProps> = ({ onBack, onSuccess, onViewTerms }) => {
  const { t, language, isRTL } = useLanguage();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [drivingLicenceImage, setDrivingLicenceImage] = useState<any>(null);
  const [greyCardImage, setGreyCardImage] = useState<any>(null);
  const [hasAcceptedConditions, setHasAcceptedConditions] = useState<boolean>(false);
  const [showSheet, setShowSheet] = useState<string | false>(false);
  const [isWilayasBottomsheetVisible, setIsWilayasBottomsheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const isAlreadyRequested = user?.isDriverRequested || false;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await storage.getUser();
        setUser(userData);
        
        // Register FCM token when loading user
        try {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
            });
            await api.updateFCMToken(tokenData.data);
            console.log('✅ FCM token registered from BecomeDriverScreen');
          }
        } catch (fcmError) {
          console.log('ℹ️ Could not register FCM token:', fcmError);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const handleOpenPicker = async () => {
    const currentType = showSheet;
    setShowSheet(false);
    Keyboard.dismiss();

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied'), t('enableGalleryAccess'));
        return;
      }

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
        }
      }, 600);
    } catch (error) {
      Alert.alert(t('error'), t('couldNotOpenGallery'));
    }
  };

  const uploadImage = async (imageUri: string, fieldName: string): Promise<string> => {
    const formData = new FormData();
    
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    formData.append('file', {
      uri: imageUri,
      name: `${fieldName}.${fileType}`,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
    } as any);

    const response = await api.uploadFile({
      uri: imageUri,
      name: `${fieldName}.${fileType}`,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
    });
    return response.url;
  };

  const handleBecomeDriver = async () => {
    if (isLoading || isAlreadyRequested) return;
    setIsLoading(true);
    try {
      let drivingLicenseUrl = '';
      let grayCardUrl = '';

      if (drivingLicenceImage?.uri) {
        drivingLicenseUrl = await uploadImage(drivingLicenceImage.uri, 'drivingLicense');
      }

      if (greyCardImage?.uri) {
        grayCardUrl = await uploadImage(greyCardImage.uri, 'grayCard');
      }

      const response = await api.requestDriver({
        firstName: firstname,
        lastName: lastname,
        wilaya: wilaya ? wilayas[wilaya] : undefined,
        city: wilaya ? wilayas[wilaya] : undefined,
        drivingLicense: drivingLicenseUrl ? { url: drivingLicenseUrl, number: '' } : undefined,
        grayCard: grayCardUrl ? { url: grayCardUrl, number: '' } : undefined,
      });

      if (response.status === 'success') {
        const currentUser = await storage.getUser();
        if (currentUser) {
          await storage.setUser({ ...currentUser, isDriverRequested: true });
        }
        setRequestSent(true);
      }
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('anErrorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const isCanSendRequest = !!(firstname.trim() && lastname.trim() && wilaya !== null && greyCardImage && drivingLicenceImage && hasAcceptedConditions && !isAlreadyRequested);

  if (requestSent) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('back')}</Text>
        </TouchableOpacity>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text translationKey="requestSent" style={styles.successTitle} />
          <Text translationKey="analyzingProfile" style={styles.successText} />
          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={onSuccess}
          >
            <Text translationKey="backToHome" style={styles.backToHomeButtonText} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← {t('back')}</Text>
      </TouchableOpacity>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text translationKey="becomeDriver" style={styles.title} />
        
        {isAlreadyRequested && (
          <View style={styles.warningBox}>
            <Text translationKey="requestUnderReview" style={styles.warningTitle} />
            <Text translationKey="requestBeingReviewed" style={styles.warningText} />
          </View>
        )}

        <Text translationKey="firstName" style={styles.label} />
        <TextInput
          style={[styles.input, isAlreadyRequested && styles.inputDisabled]}
          placeholder={t('enterFirstName')}
          value={firstname}
          onChangeText={(v) => {
            if (!isAlreadyRequested && /^[a-zA-Z\s]*$/.test(v)) {
              setFirstname(v);
            }
          }}
          editable={!isAlreadyRequested}
        />

        <Text translationKey="lastName" style={styles.label} />
        <TextInput
          style={[styles.input, isAlreadyRequested && styles.inputDisabled]}
          placeholder={t('enterLastName')}
          value={lastname}
          onChangeText={(v) => {
            if (!isAlreadyRequested && /^[a-zA-Z\s]*$/.test(v)) {
              setLastname(v);
            }
          }}
          editable={!isAlreadyRequested}
        />

        <Text translationKey="wilaya" style={styles.label} />
        <TouchableOpacity
          onPress={() => {
            if (!isAlreadyRequested) {
              setIsWilayasBottomsheetVisible(true);
              Keyboard.dismiss();
            }
          }}
          disabled={isAlreadyRequested}
        >
          <View style={[styles.input, styles.wilayaInput, isAlreadyRequested && styles.inputDisabled]}>
            <Text style={[styles.wilayaText, !wilaya && styles.wilayaPlaceholder]}>
              {wilaya ? getWilayaName(wilaya, language) : t('selectWilaya')}
            </Text>
            <Text style={styles.arrowDown}>▼</Text>
          </View>
        </TouchableOpacity>

        <Text translationKey="drivingLicence" style={styles.label} />
        {drivingLicenceImage?.uri ? (
          <Image source={{ uri: drivingLicenceImage.uri }} style={styles.imagePreview} />
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, isAlreadyRequested && styles.uploadButtonDisabled]}
            onPress={() => !isAlreadyRequested && setShowSheet('drivingLicence')}
            disabled={isAlreadyRequested}
          >
            <Text style={styles.uploadIcon}>📷</Text>
            <Text translationKey="uploadDrivingLicence" style={styles.uploadText} />
          </TouchableOpacity>
        )}

        <Text translationKey="greyCard" style={styles.label} />
        {greyCardImage?.uri ? (
          <Image source={{ uri: greyCardImage.uri }} style={styles.imagePreview} />
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, isAlreadyRequested && styles.uploadButtonDisabled]}
            onPress={() => !isAlreadyRequested && setShowSheet('greyCard')}
            disabled={isAlreadyRequested}
          >
            <Text style={styles.uploadIcon}>📷</Text>
            <Text translationKey="uploadGreyCard" style={styles.uploadText} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.checkboxContainer, isRTL && styles.checkboxContainerRTL, isAlreadyRequested && styles.checkboxDisabled]}
          onPress={() => !isAlreadyRequested && setHasAcceptedConditions(!hasAcceptedConditions)}
          disabled={isAlreadyRequested}
        >
          <View style={[styles.checkbox, hasAcceptedConditions && styles.checkboxChecked]}>
            {hasAcceptedConditions && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text 
            translationKey="acceptTerms" 
            style={[styles.checkboxText, isRTL && styles.checkboxTextRTL]} 
            onPress={onViewTerms}
          >
            {t('acceptTerms')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, (!isCanSendRequest || isAlreadyRequested) && styles.submitButtonDisabled]}
          onPress={handleBecomeDriver}
          disabled={!isCanSendRequest || isAlreadyRequested || isLoading}
        >
          {isLoading ? (
            <Text translationKey="loading" style={styles.submitButtonText} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isAlreadyRequested ? t('requestPending') : t('sendRequest')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showSheet && (
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.bottomSheetTitle}>
              {showSheet === 'drivingLicence' ? t('uploadDrivingLicence') : t('uploadGreyCard')}
            </Text>
            <TouchableOpacity
              style={styles.bottomSheetButton}
              onPress={handleOpenPicker}
            >
              <Text translationKey="uploadFromGallery" style={styles.bottomSheetButtonText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomSheetCloseButton}
              onPress={() => setShowSheet(false)}
            >
              <Text translationKey="cancel" style={styles.bottomSheetCloseText} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isWilayasBottomsheetVisible && (
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.wilayaSheet}>
            <Text translationKey="selectWilaya" style={styles.bottomSheetTitle} />
            <ScrollView style={styles.wilayaList}>
              {Array.from({ length: 58 }, (_, i) => i + 1).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setWilaya(item);
                    setIsWilayasBottomsheetVisible(false);
                  }}
                  style={[
                    styles.wilayaItem,
                    wilaya === item && styles.wilayaItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.wilayaItemText,
                      wilaya === item && styles.wilayaItemTextSelected,
                    ]}
                  >
                    {getWilayaName(item, language)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.bottomSheetCloseButton}
              onPress={() => setIsWilayasBottomsheetVisible(false)}
            >
              <Text translationKey="cancel" style={styles.bottomSheetCloseText} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#185ADC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#185ADC',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E0DC',
    borderRadius: 8,
    padding: 14,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  wilayaInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wilayaText: {
    fontSize: 16,
    color: '#000',
  },
  wilayaPlaceholder: {
    color: '#999',
  },
  arrowDown: {
    fontSize: 12,
    color: '#185ADC',
  },
  uploadButton: {
    height: 152,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EEFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1DEF8',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 14,
    color: '#185ADC',
  },
  imagePreview: {
    height: 152,
    width: '100%',
    borderRadius: 8,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 44,
  },
  checkboxContainerRTL: {
    flexDirection: 'row-reverse',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#185ADC',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#185ADC',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 16,
    color: '#185ADC',
    textDecorationLine: 'underline',
  },
  checkboxTextRTL: {
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#185ADC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1DEF8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  bottomSheetButton: {
    backgroundColor: '#D1DEF8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#185ADC',
  },
  bottomSheetButtonText: {
    fontSize: 16,
    color: '#185ADC',
    fontWeight: '600',
  },
  bottomSheetCloseButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  bottomSheetCloseText: {
    fontSize: 16,
    color: '#666',
  },
  wilayaSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  wilayaList: {
    maxHeight: 400,
  },
  wilayaItem: {
    padding: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E0DC',
  },
  wilayaItemSelected: {
    backgroundColor: '#E8EEFB',
  },
  wilayaItemText: {
    fontSize: 16,
    color: '#000000E0',
  },
  wilayaItemTextSelected: {
    color: '#185ADC',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 53,
  },
  successIcon: {
    fontSize: 48,
    color: '#185ADC',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#185ADC',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#000000E0',
    textAlign: 'center',
    marginBottom: 32,
  },
  backToHomeButton: {
    backgroundColor: '#E8EEFB',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  backToHomeButtonText: {
    color: '#185ADC',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BecomeDriverScreen;
