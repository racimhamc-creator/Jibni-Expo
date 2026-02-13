import React from 'react';
import {
  ActivityIndicator,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/src/theme';
import Text from './Text';
import Box from './Box';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, keyof Theme['colors']> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
};

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled,
  buttonStyle = {},
  textStyle = {},
  ...rest
}) => {
  const theme = useTheme<Theme>();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      <Box
        height={64}
        justifyContent={'center'}
        paddingHorizontal="l"
        borderRadius={theme.borderRadius.m}
        alignItems="center"
        style={{
          backgroundColor: disabled
            ? theme.colors.inputBorder
            : theme.colors[variantStyles[variant]],
          opacity: disabled || loading ? 0.6 : 1,
          ...buttonStyle,
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.buttonText} />
        ) : (
          <Text
            variant="button"
            style={[disabled && { color: '#00000066' }, textStyle]}
          >
            {label}
          </Text>
        )}
      </Box>
    </TouchableOpacity>
  );
};

export default Button;