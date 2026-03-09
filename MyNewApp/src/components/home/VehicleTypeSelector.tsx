import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

export type VehicleType = 'moto' | 'car' | 'truck' | 'van';

interface VehicleOption {
  id: VehicleType;
  name: string;
  icon: React.FC<{ color?: string }>;
  description: string;
}

// Scooter/Motorcycle SVG Icon
const MotoIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M5 19a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M19 19a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 16h14" stroke={color} strokeWidth={3} strokeLinecap="round" />
    <Path d="M12 16V10" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M9 10h6" stroke={color} strokeWidth={3} strokeLinecap="round" />
    <Path d="M9 10L7 8" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 10L17 8" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 16L4 13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M19 16L20 13" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Car SVG Icon - Sedan style
const CarIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    {/* Car body - sedan shape */}
    <Path
      d="M3 12h18v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.1}
    />
    {/* Car roof/windshield */}
    <Path
      d="M5 12l2-4h10l2 4"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Windows */}
    <Path
      d="M7 12l1.5-3h7L17 12"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.15}
    />
    {/* Front wheel */}
    <Circle cx="7" cy="17" r="2" stroke={color} strokeWidth={1.5} fill="white" />
    {/* Rear wheel */}
    <Circle cx="17" cy="17" r="2" stroke={color} strokeWidth={1.5} fill="white" />
    {/* Headlight */}
    <Path
      d="M19 13h1v2h-1z"
      stroke={color}
      strokeWidth={1}
      fill={color}
      fillOpacity={0.3}
    />
    {/* Taillight */}
    <Path
      d="M3 13h1v2H3z"
      stroke={color}
      strokeWidth={1}
      fill={color}
      fillOpacity={0.3}
    />
  </Svg>
);

// Truck SVG Icon
const TruckIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M1 3h15v11H1V3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 8h4l2 4v2h-6V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 19a2 2 0 100-4 2 2 0 000 4z" stroke={color} strokeWidth={2} />
    <Path d="M19 19a2 2 0 100-4 2 2 0 000 4z" stroke={color} strokeWidth={2} />
  </Svg>
);

// Van SVG Icon
const VanIcon: React.FC<{ color?: string }> = ({ color = '#185ADC' }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7h14v10H3V7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 7h4v6h-4V7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 19a2 2 0 100-4 2 2 0 000 4z" stroke={color} strokeWidth={2} />
    <Path d="M18 19a2 2 0 100-4 2 2 0 000 4z" stroke={color} strokeWidth={2} />
  </Svg>
);

interface VehicleTypeSelectorProps {
  visible: boolean;
  onSelect: (vehicleType: VehicleType) => void;
  onClose: () => void;
  language?: Language;
}

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
  visible,
  onSelect,
  onClose,
  language = 'ar',
}) => {
  const [selectedType, setSelectedType] = useState<VehicleType | null>(null);
  const fontFamily = getFontFamily(language);

  const vehicleOptions: VehicleOption[] = [
    {
      id: 'moto',
      name: language === 'ar' ? 'دراجة نارية' : language === 'fr' ? 'Moto' : 'Motorcycle',
      icon: MotoIcon,
      description: getTranslation('damagedMotorcycle', language),
    },
    {
      id: 'car',
      name: language === 'ar' ? 'سيارة' : language === 'fr' ? 'Voiture' : 'Car',
      icon: CarIcon,
      description: getTranslation('damagedCar', language),
    },
    {
      id: 'truck',
      name: language === 'ar' ? 'شاحنة' : language === 'fr' ? 'Camion' : 'Truck',
      icon: TruckIcon,
      description: getTranslation('damagedTruck', language),
    },
    {
      id: 'van',
      name: language === 'ar' ? 'عربة نقل' : language === 'fr' ? 'Van' : 'Van',
      icon: VanIcon,
      description: getTranslation('damagedVan', language),
    },
  ];

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      setSelectedType(null);
    }
  };

  if (!Boolean(visible)) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Image
              source={require('../../assets/arrow-right.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily }]}>{getTranslation('selectDamagedVehicle', language)}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Vehicle Options Grid */}
        <View style={styles.grid}>
          {vehicleOptions.map((vehicle) => {
            const isSelected = selectedType === vehicle.id;
            const IconComponent = vehicle.icon;

            return (
              <TouchableOpacity
                key={vehicle.id}
                onPress={() => setSelectedType(vehicle.id)}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardSelected,
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                  <IconComponent color="#185ADC" />
                </View>
                <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                  {vehicle.name}
                </Text>
                <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.button, !selectedType && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={Boolean(!selectedType)}
        >
          <Text style={[styles.buttonText, { fontFamily }]}>{getTranslation('continue', language)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  handleBar: {
    height: 4,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 48,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    height: 24,
    width: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  vehicleCard: {
    width: (deviceWidth - 64) / 2 - 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
  },
  vehicleCardSelected: {
    backgroundColor: '#E8EEFB',
    borderColor: '#185ADC',
  },
  iconContainer: {
    marginBottom: 12,
    opacity: 0.6,
  },
  iconContainerSelected: {
    opacity: 1,
  },
  vehicleName: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#000000E0',
    textAlign: 'center',
    fontSize: 16,
  },
  vehicleNameSelected: {
    color: '#185ADC',
  },
  vehicleDescription: {
    fontSize: 11,
    color: '#00000080',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D1DEF8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VehicleTypeSelector;
