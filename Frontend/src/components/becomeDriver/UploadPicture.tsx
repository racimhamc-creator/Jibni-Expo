import React from 'react';
import { Dimensions, Keyboard, TouchableOpacity } from 'react-native';
import { Text } from '@/src/components/ui';
import BlastedImage from 'react-native-blasted-image';

const { width: deviceWidth } = Dimensions.get('window');

const UploadPicture: React.FC<{
  placeholder: string;
  picturePath?: any;
  title?: string;
  setShowSheet: (show: boolean) => void;
  disabled?: boolean;
}> = ({ placeholder, picturePath, title, setShowSheet, disabled = false }) => {
  return (
    <>
      {title && (
        <Text
          variant={'body'}
          style={{
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      )}
      {picturePath?.uri ? (
        <BlastedImage
          source={{ uri: picturePath.uri }}
          style={{
            height: 152,
            width: deviceWidth - 32,
            borderRadius: 8,
          }}
        />
      ) : (
        <TouchableOpacity
          style={{
            height: 152,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#E8EEFB',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#D1DEF8',
            opacity: disabled ? 0.5 : 1,
          }}
          onPress={() => {
            if (!disabled) {
              setShowSheet(true);
              Keyboard.dismiss();
            }
          }}
          disabled={disabled}
        >
          <BlastedImage
            source={require('@/src/assets/gallery-export.png')}
            style={{
              height: 24,
              width: 24,
            }}
          />
          <Text
            variant={'subheader'}
            style={{
              color: '#185ADC',
              marginTop: 12,
            }}
          >
            {placeholder}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default UploadPicture;
