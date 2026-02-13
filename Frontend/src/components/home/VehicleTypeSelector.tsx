import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Box, Text, Button } from '@/src/components/ui';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '@/src/theme';
import Svg, { Path } from 'react-native-svg';

const { width: deviceWidth } = Dimensions.get('window');

export type VehicleType = 'moto' | 'car' | 'truck' | 'van';

interface VehicleOption {
  id: VehicleType;
  name: string;
  icon: any; // SVG component or image
  description: string;
}

// Scooter/Motorcycle SVG Icon
const MotoIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    {/* Front wheel */}
    <Path
      d="M5 19a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Back wheel */}
    <Path
      d="M19 19a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Scooter deck/platform */}
    <Path
      d="M5 16h14"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
    />
    {/* Stem/post */}
    <Path
      d="M12 16V10"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* Handlebar */}
    <Path
      d="M9 10h6"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
    />
    {/* Left handlebar grip */}
    <Path
      d="M9 10L7 8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right handlebar grip */}
    <Path
      d="M15 10L17 8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Front fork */}
    <Path
      d="M5 16L4 13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Back support */}
    <Path
      d="M19 16L20 13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

// Car SVG Icon
const CarIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    {/* Car body */}
    <Path
      d="M5 17h14l-1-7H6l-1 7zM5 17l-1-1M19 17l1-1M7 13h10M9 10h6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Front wheel */}
    <Path
      d="M7 17a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
    {/* Back wheel */}
    <Path
      d="M17 17a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

// Truck SVG Icon
const TruckIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    {/* Truck cabin */}
    <Path
      d="M1 3h15v11H1V3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Truck cargo area */}
    <Path
      d="M16 8h4l2 4v2h-6V8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Front wheel */}
    <Path
      d="M5 19a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
    {/* Back wheel */}
    <Path
      d="M19 19a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

// Van SVG Icon
const VanIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    {/* Van body */}
    <Path
      d="M3 7h14v10H3V7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Van front */}
    <Path
      d="M17 7h4v6h-4V7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Front wheel */}
    <Path
      d="M6 19a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
    {/* Back wheel */}
    <Path
      d="M18 19a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

interface VehicleTypeSelectorProps {
  visible: boolean;
  onSelect: (vehicleType: VehicleType) => void;
  onClose: () => void;
}

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<VehicleType | null>(null);

  const vehicleOptions: VehicleOption[] = [
    {
      id: 'moto',
      name: t('vehicle.moto') || 'Motorcycle',
      icon: MotoIcon,
      description: t('vehicle.motoDescription') || 'Fast and economical',
    },
    {
      id: 'car',
      name: t('vehicle.car') || 'Car',
      icon: CarIcon,
      description: t('vehicle.carDescription') || 'Comfortable ride',
    },
    {
      id: 'truck',
      name: t('vehicle.truck') || 'Truck',
      icon: TruckIcon,
      description: t('vehicle.truckDescription') || 'For heavy loads',
    },
    {
      id: 'van',
      name: t('vehicle.van') || 'Van',
      icon: VanIcon,
      description: t('vehicle.vanDescription') || 'Spacious and practical',
    },
  ];

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
          zIndex: 10000,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          maxHeight: '85%',
        }}
      >
        {/* Handle bar */}
        <View
          style={{
            height: 4,
            backgroundColor: '#00000033',
            borderRadius: 2,
            width: 48,
            alignSelf: 'center',
            marginBottom: 24,
          }}
        />

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 8,
            }}
          >
            <BlastedImage
              source={require('@/src/assets/arrow-right.png')}
              style={{
                height: 24,
                width: 24,
                ...theme.RTLMirror,
              }}
            />
          </TouchableOpacity>
          <Text
            variant="header"
            style={{
              flex: 1,
              textAlign: 'center',
              marginRight: 40,
            }}
          >
            {t('vehicle.selectVehicleType') || 'Select Vehicle Type'}
          </Text>
        </View>

        {/* Vehicle Options Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
          {vehicleOptions.map((vehicle) => {
            const isSelected = selectedType === vehicle.id;
            const IconComponent = vehicle.icon;

            return (
              <TouchableOpacity
                key={vehicle.id}
                onPress={() => setSelectedType(vehicle.id)}
                style={{
                  width: (deviceWidth - 64) / 2 - 8,
                  backgroundColor: isSelected ? '#E8EEFB' : '#FAFAFA',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.colors.primary : 'transparent',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    marginBottom: 12,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                >
                  <IconComponent color={theme.colors.primary} />
                </View>
                <Text
                  variant="body"
                  style={{
                    fontWeight: '600',
                    marginBottom: 4,
                    color: isSelected ? theme.colors.primary : '#000000E0',
                    textAlign: 'center',
                  }}
                >
                  {vehicle.name}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    fontSize: 11,
                    color: '#00000080',
                    textAlign: 'center',
                  }}
                >
                  {vehicle.description}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: theme.colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm Button */}
        <Button
          label={t('continue') || 'Continue'}
          onPress={handleConfirm}
          disabled={!selectedType}
          style={{
            marginTop: 8,
          }}
        />
      </View>
    </View>
  );
};

export default VehicleTypeSelector;
