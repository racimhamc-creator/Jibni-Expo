import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface ClientMarkerProps {
  location: {
    latitude: number;
    longitude: number;
  };
  isVisible: boolean;
}

const ClientMarker: React.FC<ClientMarkerProps> = ({
  location,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.markerContainer}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
        {/* Outer circle with pulse effect */}
        <Circle
          cx="12"
          cy="12"
          r="8"
          stroke="#34C759"
          strokeWidth="2"
          fill="#34C759"
          fillOpacity={0.2}
        />
        
        {/* Inner circle */}
        <Circle
          cx="12"
          cy="12"
          r="4"
          fill="#34C759"
        />
        
        {/* Person icon */}
        <Path
          d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6ZM12 12C10.9 12 8 12.6 8 14V16H16V14C16 12.6 13.1 12 12 12Z"
          fill="white"
        />
      </Svg>
      <View style={styles.shadowDot} />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  shadowDot: {
    position: 'absolute',
    bottom: -2,
    width: 10,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 5,
  },
});

export default ClientMarker;
