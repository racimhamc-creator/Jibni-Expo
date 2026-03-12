/**
 * NavigationArrowMarker Component
 * 
 * Google Maps style navigation arrow marker with blue circle background
 * and white arrow pointing forward. Used for driver navigation in both
 * simulation and real ride modes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface NavigationArrowMarkerProps {
  heading: number;
  size?: number;
}

export const NavigationArrowMarker: React.FC<NavigationArrowMarkerProps> = ({ 
  heading, 
  size = 48 
}) => {
  const scale = size / 48;
  
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.marker,
          { 
            width: size,
            height: size,
            transform: [{ rotate: `${heading}deg` }] 
          }
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          {/* Outer blue circle with low opacity */}
          <Circle
            cx="24"
            cy="24"
            r="22"
            fill="#2196F3"
            opacity={0.15}
          />
          {/* Blue circle border */}
          <Circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="#2196F3"
            strokeWidth="2"
            opacity={0.4}
          />
          {/* Inner blue circle */}
          <Circle
            cx="24"
            cy="24"
            r="18"
            fill="#2196F3"
            opacity={0.9}
          />
          {/* White arrow */}
          <Path
            d="M24 6L12 34L24 29L36 34L24 6Z"
            fill="white"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Arrow highlight for depth */}
          <Path
            d="M24 8L14 32L24 28L34 32L24 8Z"
            fill="#E3F2FD"
            opacity={0.3}
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NavigationArrowMarker;
