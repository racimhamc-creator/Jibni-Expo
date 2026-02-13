import React from 'react';
import { Keyboard, TouchableOpacity, View } from 'react-native';
import { Input, Text } from '@/src/components/ui';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';

const InputsSection: React.FC<{
  firstname: string;
  lastname: string;
  wilaya: number | null;
  setFirstname: (name: string) => void;
  setLastname: (name: string) => void;
  setIsWilayasBottomsheetVisible: (visible: boolean) => void;
  disabled?: boolean;
}> = ({
  firstname,
  wilaya,
  setFirstname,
  setIsWilayasBottomsheetVisible,
  lastname,
  setLastname,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Text
        variant={'body'}
        style={{
          marginTop: 38,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.firstname') || 'First Name'}
      </Text>
      <Input
        placeholder={t('becomeDriver.firstnamePlaceholder') || 'Enter your first name'}
        value={firstname}
        onChangeText={v => {
          if (!disabled && /^[a-zA-Z\s]*$/.test(v)) {
            setFirstname(v);
          }
        }}
        editable={!disabled}
      />
      <Text
        variant={'body'}
        style={{
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.lastname') || 'Last Name'}
      </Text>
      <Input
        placeholder={t('becomeDriver.lastnamePlaceholder') || 'Enter your last name'}
        value={lastname}
        onChangeText={v => {
          if (!disabled && /^[a-zA-Z\s]*$/.test(v)) {
            setLastname(v);
          }
        }}
        editable={!disabled}
      />
      <Text
        variant={'body'}
        style={{
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.wilaya') || 'Wilaya'}
      </Text>
      <TouchableOpacity
        onPress={() => {
          if (!disabled) {
            setIsWilayasBottomsheetVisible(true);
            Keyboard.dismiss();
          }
        }}
        disabled={disabled}
      >
        <Input
          placeholder={t('becomeDriver.wilayaPlaceholder') || 'Select your wilaya'}
          editable={false}
          pointerEvents="none"
          value={wilaya ? t(`becomeDriver.wilayas.${wilaya}`) || `Wilaya ${wilaya}` : ''}
          leftView={
            <View
              style={{
                justifyContent: 'center',
              }}
            >
              <BlastedImage
                source={require('@/src/assets/arrow-down.png')}
                style={{
                  width: 24,
                  height: 24,
                }}
              />
            </View>
          }
        />
      </TouchableOpacity>
    </>
  );
};

export default InputsSection;
