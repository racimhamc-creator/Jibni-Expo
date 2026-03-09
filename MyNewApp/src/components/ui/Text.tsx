import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { translations } from '@/src/utils/translations';

type TranslationKey = keyof typeof translations;

interface TextProps extends RNTextProps {
  translationKey?: TranslationKey;
  children?: React.ReactNode;
}

const Text: React.FC<TextProps> = ({ translationKey, children, style, ...props }) => {
  const { t, language, isRTL, fontFamily } = useLanguage();

  let content = children;
  
  if (translationKey) {
    try {
      content = t(translationKey);
    } catch (error) {
      console.warn(`Translation error for key "${translationKey}":`, error);
      content = translationKey;
    }
  }

  return (
    <RNText 
      style={[
        isRTL && language === 'ar' && styles.rtl,
        { fontFamily },
        style,
      ]} 
      {...props}
    >
      {content}
    </RNText>
  );
};

const styles = StyleSheet.create({
  rtl: {
    writingDirection: 'rtl',
  },
});

export default Text;
