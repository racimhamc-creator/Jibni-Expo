import React from 'react';
import { Modal, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isVisible, onClose, children }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => {
            e.stopPropagation();
          }}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {children}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: theme.colors.mainBackground,
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    padding: theme.spacing.l,
    maxHeight: '80%',
  },
});

export default BottomSheet;
