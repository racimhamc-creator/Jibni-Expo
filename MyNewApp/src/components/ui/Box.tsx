import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useLanguage } from '@/src/contexts/LanguageContext';

interface BoxProps extends ViewProps {
  children?: React.ReactNode;
}

const Box: React.FC<BoxProps> = ({ children, style, ...props }) => {
  const { isRTL } = useLanguage();

  return (
    <View 
      style={[
        isRTL && styles.rtl,
        style,
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  rtl: {
    direction: 'rtl',
  },
});

export default Box;
