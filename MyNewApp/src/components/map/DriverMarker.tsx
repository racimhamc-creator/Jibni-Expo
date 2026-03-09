import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface DriverMarkerProps {
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  isVisible: boolean;
  mapRef: any;
}

const DriverMarker: React.FC<DriverMarkerProps> = ({
  location,
  heading = 0,
  isVisible,
  mapRef,
}) => {
  const animatedHeading = useRef(new Animated.Value(heading)).current;
  const [markerCoords, setMarkerCoords] = useState(location);

  // Smooth heading animation
  useEffect(() => {
    Animated.timing(animatedHeading, {
      toValue: heading,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [heading]);

  // Update marker position smoothly
  useEffect(() => {
    if (location.latitude !== markerCoords.latitude || 
        location.longitude !== markerCoords.longitude) {
      setMarkerCoords(location);
    }
  }, [location, markerCoords]);

  if (!isVisible || !mapRef.current) return null;

  const rotate = animatedHeading.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.markerContainer,
        {
          transform: [{ rotate }],
        },
      ]}
    >
      <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L4.5 20.29L12 17L19.5 20.29L12 2Z"
          fill="#185ADC"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <Path
          d="M12 6L9 12L12 10L15 12L12 6Z"
          fill="white"
          opacity={0.8}
        />
      </Svg>
      <View style={styles.shadowDot} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  shadowDot: {
    position: 'absolute',
    bottom: -2,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
});

export default DriverMarker;
