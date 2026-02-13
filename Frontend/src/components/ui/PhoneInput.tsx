import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import Box from './Box';
import Svg, { G, Rect, Path, Defs, ClipPath } from 'react-native-svg';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

function FlagSvgComponent(props: any) {
  return (
    <Svg
      width={38}
      height={29}
      viewBox="0 0 38 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <G filter="url(#filter0_dd_81_1661)">
        <G clipPath="url(#clip0_81_1661)">
          <Rect x={2} y={1} width={33.6} height={24} rx={2.61224} fill="#fff" />
          <Path
            d="M32.4 1H5.2A3.2 3.2 0 002 4.2v17.6A3.2 3.2 0 005.2 25h27.2a3.2 3.2 0 003.2-3.2V4.2A3.2 3.2 0 0032.4 1z"
            fill="#fff"
          />
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2 1h16v24H2V1z"
            fill="#249F58"
          />
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22.883 17.42a7.2 7.2 0 110-8.842A6.247 6.247 0 0019.2 7.401c-3.312 0-6 2.507-6 5.6 0 3.093 2.688 5.6 6 5.6 1.389 0 2.667-.44 3.683-1.18z"
            fill="#F93939"
          />
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22.8 13l1.6-.8.8-1.6.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8z"
            fill="#F93939"
          />
        </G>
      </G>
      <Defs>
        <ClipPath id="clip0_81_1661">
          <Rect x={2} y={1} width={33.6} height={24} rx={2.61224} fill="#fff" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}

interface PhoneInputProps extends TextInputProps {
  value: string;
  onChangeText: (data: { phone: string; isValid: boolean }) => void;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  placeholder,
  style,
  ...props
}) => {
  const onChangePhone = (v: string) => {
    // Remove all non-digit characters for validation
    const digitsOnly = v.replace(/\D/g, '');
    
    // Lenient validation: accept any phone number with at least 8 digits
    // This allows numbers like 0655854120 (Algerian format)
    const isValid = digitsOnly.length >= 8;
    
    // Return the cleaned phone number (digits only) or original if user is still typing
    onChangeText({
      phone: v, // Keep original format for display, backend will clean it
      isValid: isValid,
    });
  };
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingHorizontal="l"
      borderRadius={8}
      backgroundColor="mainBackground"
      borderWidth={1}
      style={{
        height: 72,
        borderColor: '#185ADC3D',
        direction: 'ltr' 
      }}
    >
      <FlagSvgComponent />
      <TextInput
        value={value}
        onChangeText={onChangePhone}
        placeholder={placeholder || '+213xxxxxxxxx'}
        style={[
          {
            flex: 1,
            fontSize: 16,
            color: '#333',
            paddingVertical: 0,
            marginStart: 10,
            height: 70,
            backgroundColor: 'transparent',
          },
          style,
        ]}
        keyboardType="phone-pad"
        {...props}
      />
    </Box>
  );
};

export default PhoneInput;