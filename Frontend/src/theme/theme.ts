import { createTheme } from '@shopify/restyle';
import { I18nManager } from 'react-native';

const palette = {
  white: '#FFFFFF',
  black: '#000000',
  primary: '#185ADC',
  secondary: '#34C759',
  danger: '#E7000B',
  warning: '#FF9500',
  info: '#5AC8FA',
  grayLight: '#FAFAFA',
  gray: '#E2E0DC',
  grayDark: '#333333',
};

export const theme = createTheme({
  colors: {
    mainBackground: palette.white,
    cardBackground: palette.grayLight,
    primary: palette.primary,
    secondary: palette.secondary,
    danger: palette.danger,
    warning: palette.warning,
    info: palette.info,
    text: "#000000",
    textSecondary: "#000000B8",
    border: palette.gray,
    buttonBackground: palette.primary,
    buttonText: palette.white,
    inputBackground: palette.white,
    inputBorder: palette.gray,
    inputText: palette.grayDark,
  },
  spacing: {
    none: 0,
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 40,
    xxl: 64,
  },
  borderRadius: {
    none: 0,
    s: 4,
    m: 8,
    l: 16,
    xl: 32,
  },
  textVariants: {
    defaults: {
      fontSize: 16,
      color: 'text',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'text',
    },
    subheader: {
      fontSize: 14,
      fontWeight: '400',
      color: 'textSecondary',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: 'text',
    },
    button: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'buttonText',
    },
    caption: {
      fontSize: 12,
      color: 'textSecondary',
    },
  },
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
  RTLMirror: {
    transform: [{ scaleX: !I18nManager.isRTL ? -1 : 1 }],
  },
});

export type Theme = typeof theme;