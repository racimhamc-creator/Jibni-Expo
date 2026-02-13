import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import BlastedImage from 'react-native-blasted-image';
import Box from './Box';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';

interface HeaderProps {
  onPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <Box
      flexDirection={'row'}
      style={{
        paddingTop: insets.top + 16,
      }}
    >
      <TouchableOpacity
        style={{
          height: 40,
          width: 40,
          justifyContent: 'center',
          alignItems: 'center',
          marginStart: 16,
          ...theme.RTLMirror,
        }}
        onPress={onPress}
      >
        <BlastedImage
          source={require('@/src/assets/arrow-right.png')}
          style={{
            height: 24,
            width: 24,
          }}
        />
      </TouchableOpacity>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
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
      </View>
      <View
        style={{
          height: 40,
          width: 40,
          justifyContent: 'center',
          alignItems: 'center',
          marginStart: 16,
        }}
      />
    </Box>
  );
};

export default Header;
