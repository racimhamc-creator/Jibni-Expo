/**
 * DriverStatusMarker Component
 * 
 * Google Maps style driver marker with different colors based on ride status:
 * - On the way (accepted/driver_arriving): Blue arrow with outer circle
 * - Arrived (driver_arrived): Orange arrow with outer circle  
 * - In progress: Green arrow with outer circle
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface DriverStatusMarkerProps {
  heading: number;
  status: 'accepted' | 'driver_arriving' | 'driver_arrived' | 'in_progress' | 'completed';
  size?: number;
}

export const DriverStatusMarker: React.FC<DriverStatusMarkerProps> = ({ 
  heading, 
  status,
  size = 48 
}) => {
  const scale = size / 48;
  
  // Define colors based on status
  const getStatusColors = () => {
    switch (status) {
      case 'accepted':
      case 'driver_arriving':
        return {
          outer: '#2196F3',      // Blue - on the way
          inner: '#2196F3',
          arrow: 'white',
          highlight: '#E3F2FD'
        };
      case 'driver_arrived':
        return {
          outer: '#FF9800',      // Orange - arrived
          inner: '#FF9800', 
          arrow: 'white',
          highlight: '#FFF3E0'
        };
      case 'in_progress':
        return {
          outer: '#4CAF50',      // Green - in progress
          inner: '#4CAF50',
          arrow: 'white', 
          highlight: '#E8F5E8'
        };
      case 'completed':
        return {
          outer: '#9E9E9E',      // Gray - completed
          inner: '#9E9E9E',
          arrow: 'white',
          highlight: '#F5F5F5'
        };
      default:
        return {
          outer: '#2196F3',      // Default blue
          inner: '#2196F3',
          arrow: 'white',
          highlight: '#E3F2FD'
        };
    }
  };
  
  const colors = getStatusColors();
  
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
          {/* Outer circle with low opacity */}
          <Circle
            cx="24"
            cy="24"
            r="22"
            fill={colors.outer}
            opacity={0.15}
          />
          {/* Circle border */}
          <Circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke={colors.outer}
            strokeWidth="2"
            opacity={0.4}
          />
          {/* Inner circle */}
          <Circle
            cx="24"
            cy="24"
            r="18"
            fill={colors.inner}
            opacity={0.9}
          />
          {/* White arrow */}
          <Path
            d="M24 6L12 34L24 29L36 34L24 6Z"
            fill={colors.arrow}
            stroke={colors.arrow}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Arrow highlight for depth */}
          <Path
            d="M24 8L14 32L24 28L34 32L24 8Z"
            fill={colors.highlight}
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

export default DriverStatusMarker;
