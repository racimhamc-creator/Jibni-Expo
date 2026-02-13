import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/src/components/ui';
import BottomSheet from '@/src/components/ui/BottomSheet';
import { useTranslation } from 'react-i18next';
import { theme } from '@/src/theme';

const WILAYAS = Array.from({ length: 58 }, (_, i) => i + 1);

const WilayaPickerSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedWilaya: number | null;
  setSelectedWilaya: (wilaya: number) => void;
}> = ({ visible, onClose, selectedWilaya, setSelectedWilaya }) => {
  const { t } = useTranslation();

  const handleSelect = (wilaya: number) => {
    setSelectedWilaya(wilaya);
    onClose();
  };

  return (
    <BottomSheet isVisible={visible} onClose={onClose}>
      <View style={{ maxHeight: 400 }}>
        <ScrollView>
          {WILAYAS.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => handleSelect(item)}
              style={{
                padding: 16,
                backgroundColor: selectedWilaya === item ? '#E8EEFB' : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: '#E2E0DC',
              }}
            >
              <Text
                style={{
                  color: selectedWilaya === item ? theme.colors.primary : '#000000E0',
                  fontWeight: selectedWilaya === item ? '600' : '400',
                }}
              >
                {t(`becomeDriver.wilayas.${item}`) || `Wilaya ${item}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

export default WilayaPickerSheet;
