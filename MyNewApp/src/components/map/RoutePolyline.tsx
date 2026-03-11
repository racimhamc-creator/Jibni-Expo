import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';

// Import MapView components conditionally
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Polyline = maps.Polyline || (maps.default && maps.default.Polyline);
  Marker = maps.Marker || (maps.default && maps.default.Marker);
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
  zIndex?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

const RoutePolyline: React.FC<RoutePolylineProps> = ({
  coordinates,
  strokeColor = '#185ADC',
  strokeWidth = 4,
  pattern = [1, 0],
  isVisible,
  zIndex = 1,
  lineCap = 'round',
  lineJoin = 'round',
}) => {
  const polylineRef = useRef<any>(null);

  // Debug logging to identify why polyline isn't showing
  console.log('🐛 RoutePolyline Debug:');
  console.log('  - isVisible:', isVisible);
  console.log('  - MapView:', !!MapView);
  console.log('  - Polyline:', !!Polyline);
  console.log('  - coordinates:', !!coordinates, coordinates?.length);
  console.log('  - coordinates.length < 2:', !coordinates || coordinates.length < 2);
  console.log('  - Should render:', !!(isVisible && MapView && Polyline && coordinates && coordinates.length >= 2));

  if (!isVisible || !MapView || !Polyline || !coordinates || coordinates.length < 2) {
    console.log('🐛 RoutePolyline: Returning null - conditions not met');
    return null;
  }

  // Convert coordinates to the format expected by react-native-maps
  const polylineCoords = coordinates.map(coord => ({
    latitude: coord.latitude,
    longitude: coord.longitude,
  }));

  // Add debug markers at turns for development
  const debugMarkers = __DEV__ ? (
    <>
      {coordinates.map((coord, index) => {
        // Only show every 10th point to avoid clutter
        if (index % 10 !== 0) return null;
        return (
          <Marker
            key={`debug-${index}`}
            coordinate={{
              latitude: coord.latitude,
              longitude: coord.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.debugMarker} />
          </Marker>
        );
      })}
    </>
  ) : null;

  return (
    <View style={styles.container}>
      {console.log('🐛 RoutePolyline: About to render Polyline with', polylineCoords.length, 'points')}
      <Polyline
        ref={polylineRef}
        coordinates={polylineCoords}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        lineCap={lineCap}
        lineJoin={lineJoin}
        pattern={pattern}
        zIndex={zIndex}
        // iOS specific optimizations
        lineDashPhase={pattern[0] === 1 && pattern[1] === 0 ? undefined : 0}
        lineDashPattern={pattern[0] === 1 && pattern[1] === 0 ? undefined : pattern}
      />
      {console.log('🐛 RoutePolyline: Polyline rendered successfully')}
      {debugMarkers}
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
    ...Platform.select({
      ios: {
        // iOS specific optimizations
        pointerEvents: 'none',
      },
    }),
  },
  debugMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'red',
  },
});

export default RoutePolyline;