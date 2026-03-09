import React from 'react';
import { StyleSheet, View } from 'react-native';

// Import MapView components conditionally
let MapView: any = null;
let Polyline: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Polyline = maps.Polyline || (maps.default && maps.default.Polyline);
} catch (error) {
  console.warn('react-native-maps not available');
}

import { LocationCoord } from '../../services/directions';

interface RoutePolylineProps {
  coordinates: LocationCoord[];
  strokeColor?: string;
  strokeWidth?: number;
  pattern?: number[];
  isVisible: boolean;
}

const RoutePolyline: React.FC<RoutePolylineProps> = ({
  coordinates,
  strokeColor = '#185ADC',
  strokeWidth = 4,
  pattern = [1, 0], // Solid line by default
  isVisible,
}) => {
  if (!isVisible || !MapView || !Polyline || !coordinates || coordinates.length < 2) {
    return null;
  }

  // Convert coordinates to the format expected by react-native-maps
  const polylineCoords = coordinates.map(coord => ({
    latitude: coord.latitude,
    longitude: coord.longitude,
  }));

  return (
    <View style={styles.container}>
      <Polyline
        coordinates={polylineCoords}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        pattern={pattern}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default RoutePolyline;
