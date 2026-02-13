import React from 'react';
import {
  TextInput,
  TextInputProps,
  ViewProps,
} from 'react-native';
import Text from './Text';
import Box from './Box';

interface InputProps extends TextInputProps {
  error?: string;
  leftView?: React.ReactElement<ViewProps>;
  containerStyle?: ViewProps["style"]
}

const Input: React.FC<InputProps> = ({ error, leftView, style, containerStyle, ...props }) => {
  return (
    <Box
      style={[{
        backgroundColor: '#fff',
        borderColor: '#D1DEF8',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
      },
      containerStyle 
      ]}
    >
      <Box flexDirection={'row'}>
        <TextInput
          style={[
            {
              flex: 1,
              paddingVertical: 12,
              fontSize: 16,
              height: 60,
              color: '#000000A3',
            },
            style,
          ]}
          placeholderTextColor="#999"
          {...props}
        />
        {leftView}
      </Box>
      {error ? (
        <Text variant="caption" color="danger" marginTop="xs">
          {error}
        </Text>
      ) : null}
    </Box>
  );
};

export default Input;