import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

// Car icon SVG component
const CarIcon: React.FC<{ color?: string; size?: number }> = ({ 
  color = '#185ADC', 
  size = 24 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 17h14l-1-7H6l-1 7zM5 17l-1-1M19 17l1-1M7 13h10M9 10h6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.2}
    />
    <Path
      d="M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
      fill={color}
      fillOpacity={0.3}
    />
  </Svg>
);

// Truck icon SVG component
const TruckIcon: React.FC<{ color?: string; size?: number }> = ({ 
  color = '#185ADC', 
  size = 24 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 3h15v11H1V3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.2}
    />
    <Path
      d="M16 8h4l2 4v2h-6V8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.2}
    />
    <Path
      d="M5 19a2 2 0 100-4 2 2 0 000 4zM19 19a2 2 0 100-4 2 2 0 000 4z"
      stroke={color}
      strokeWidth={2}
      fill={color}
      fillOpacity={0.3}
    />
  </Svg>
);

// Motorcycle icon SVG component
const MotoIcon: React.FC<{ color?: string; size?: number }> = ({ 
  color = '#185ADC', 
  size = 24 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 19a3 3 0 100-6 3 3 0 000 6zM19 19a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      fill={color}
      fillOpacity={0.2}
    />
    <Path
      d="M5 16h14"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      fill={color}
    />
    <Path
      d="M12 16V10M9 10h6M9 10L7 8M15 10L17 8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface OrbitingVehicleProps {
  radius: number;
  duration: number;
  delay: number;
  size?: number;
  iconType?: 'car' | 'truck' | 'moto';
  direction?: 'clockwise' | 'counterclockwise';
  startAngle?: number; // Starting angle in degrees (0-360)
}

// Orbiting vehicle component
const OrbitingVehicle: React.FC<OrbitingVehicleProps> = ({
  radius,
  duration,
  delay,
  size = 24,
  iconType = 'car',
  direction = 'clockwise',
  startAngle = 0,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [duration, delay]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'clockwise' 
      ? [`${startAngle}deg`, `${startAngle + 360}deg`] 
      : [`${startAngle}deg`, `${startAngle - 360}deg`],
  });

  const IconComponent = iconType === 'truck' ? TruckIcon : iconType === 'moto' ? MotoIcon : CarIcon;

  return (
    <Animated.View
      style={[
        styles.orbitContainer,
        {
          width: radius * 2,
          height: radius * 2,
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <View
        style={[
          styles.vehicleWrapper,
          {
            top: 0,
            left: radius - size / 2,
            transform: [{ 
              rotate: direction === 'clockwise' 
                ? `-${startAngle + 360}deg` 
                : `${startAngle - 360}deg` 
            }],
          },
        ]}
      >
        <View style={styles.vehicleIconContainer}>
          <IconComponent size={size} />
        </View>
      </View>
    </Animated.View>
  );
};

// Animated radar pulse component
const RadarPulse: React.FC<{ delay: number; size: number }> = ({ delay, size }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Animated.View
      style={[
        styles.radarPulse,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

interface SearchingForDriverProps {
  visible: boolean;
  onCancel: () => void;
  language?: Language;
}

const SearchingForDriver: React.FC<SearchingForDriverProps> = ({
  visible,
  onCancel,
  language = 'ar',
}) => {
  if (!visible) return null;

  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  const title = getTranslation('searchingForDriver', language);
  const subtitle = getTranslation('pleaseWait', language);
  const cancelText = getTranslation('cancelSearch', language);
  const youText = getTranslation('you', language);

  // Radar sizes
  const radarSize = 280;
  const centerSize = 50;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Title */}
        <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>

        {/* Radar Animation Container */}
        <View style={styles.radarContainer}>
          {/* Static circles (orbits) */}
          <View style={[styles.orbitCircle, { width: radarSize * 0.35, height: radarSize * 0.35 }]} />
          <View style={[styles.orbitCircle, { width: radarSize * 0.6, height: radarSize * 0.6 }]} />
          <View style={[styles.orbitCircle, { width: radarSize * 0.85, height: radarSize * 0.85 }]} />

          {/* Radar pulses */}
          <RadarPulse delay={0} size={radarSize * 0.6} />
          <RadarPulse delay={700} size={radarSize * 0.6} />
          <RadarPulse delay={1400} size={radarSize * 0.6} />

          {/* Orbiting vehicles - each starts at a different angle */}
          <OrbitingVehicle
            radius={radarSize * 0.175}
            duration={8000}
            delay={0}
            size={28}
            iconType="moto"
            direction="clockwise"
            startAngle={0}
          />
          <OrbitingVehicle
            radius={radarSize * 0.3}
            duration={12000}
            delay={0}
            size={32}
            iconType="car"
            direction="counterclockwise"
            startAngle={72}
          />
          <OrbitingVehicle
            radius={radarSize * 0.425}
            duration={15000}
            delay={0}
            size={36}
            iconType="truck"
            direction="clockwise"
            startAngle={144}
          />
          <OrbitingVehicle
            radius={radarSize * 0.3}
            duration={10000}
            delay={0}
            size={26}
            iconType="car"
            direction="clockwise"
            startAngle={216}
          />
          <OrbitingVehicle
            radius={radarSize * 0.425}
            duration={18000}
            delay={0}
            size={30}
            iconType="moto"
            direction="counterclockwise"
            startAngle={288}
          />

          {/* Center "You" marker */}
          <View style={[styles.centerMarker, { width: centerSize, height: centerSize }]}>
            <View style={styles.centerMarkerInner}>
              <Text style={[styles.centerMarkerText, { fontFamily }]}>{youText}</Text>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={[styles.cancelButton, isRTL && styles.cancelButtonRTL]} onPress={onCancel}>
          <Text style={[styles.cancelButtonText, { fontFamily }]}>{cancelText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    zIndex: 10000,
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dragHandle: {
    height: 2,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 106,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#185ADC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#00000080',
    textAlign: 'center',
    marginBottom: 32,
  },
  radarContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  orbitCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#185ADC20',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  radarPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#185ADC30',
    backgroundColor: '#185ADC08',
  },
  orbitContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleWrapper: {
    position: 'absolute',
  },
  vehicleIconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerMarkerInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#185ADC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  centerMarkerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    width: deviceWidth - 48,
    height: 56,
    backgroundColor: '#E8EEFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonRTL: {
    flexDirection: 'row-reverse',
  },
  cancelButtonText: {
    color: '#185ADC',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchingForDriver;
