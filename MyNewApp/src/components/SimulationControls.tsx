/**
 * SimulationControls Component
 * 
 * UI controls for the driver simulation mode.
 * Renders buttons to start/stop/pause simulation and shows progress.
 * 
 * This component is for development/testing only.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LocationCoord } from '../services/driverSimulation';
import NavigationArrowMarker from './common/NavigationArrowMarker';

export interface SimulationControlsProps {
  isSimulating: boolean;
  isPaused: boolean;
  progress: number; // 0 to 1
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isLoading?: boolean;
}

/**
 * Simulation Controls Component
 */
export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isSimulating,
  isPaused,
  progress,
  onStart,
  onStop,
  onPause,
  onResume,
  isLoading = false,
}) => {
  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Driver Simulation</Text>
        {isSimulating && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.buttonRow}>
        {!isSimulating ? (
          // Start button
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={onStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>▶ Start Simulation</Text>
            )}
          </TouchableOpacity>
        ) : (
          // Active simulation controls
          <>
            {isPaused ? (
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={onResume}
              >
                <Text style={styles.buttonText}>▶ Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.pauseButton]}
                onPress={onPause}
              >
                <Text style={styles.buttonText}>⏸ Pause</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={onStop}
            >
              <Text style={styles.buttonText}>⏹ Stop</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Status */}
      {isSimulating && (
        <Text style={styles.statusText}>
          {isPaused ? '⏸ Paused' : '🚗 Driving...'}
        </Text>
      )}
    </View>
  );
};

/**
 * Simulation Markers Component
 * Renders start and end markers for the simulation route
 */
export interface SimulationMarkersProps {
  startLocation: LocationCoord;
  endLocation: LocationCoord;
  currentPosition: LocationCoord | null;
  heading?: number; // Degrees (0-360) for first-person view
  Marker: any; // react-native-maps Marker component
}



export const SimulationMarkers: React.FC<SimulationMarkersProps> = ({
  startLocation,
  endLocation,
  currentPosition,
  heading = 0,
  Marker,
}) => {
  if (!Marker) return null;

  return (
    <>
      {/* Start Marker (Green) */}
      <Marker
        coordinate={{
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
        }}
        anchor={{ x: 0.5, y: 1 }}
        title="Start"
        description="Simulation start point"
      >
        <View style={styles.startMarker}>
          <Text style={styles.markerText}>🟢</Text>
        </View>
      </Marker>

      {/* End Marker (Red) */}
      <Marker
        coordinate={{
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
        }}
        anchor={{ x: 0.5, y: 1 }}
        title="Destination"
        description="Simulation destination"
      >
        <View style={styles.endMarker}>
          <Text style={styles.markerText}>🔴</Text>
        </View>
      </Marker>

      {/* Current Position Marker (if available) - First Person View */}
      {currentPosition && (
        <Marker
          coordinate={{
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          title="Simulated Driver"
          description="Current simulation position"
          flat={true}
        >
          <NavigationArrowMarker heading={heading} size={48} />
        </Marker>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // Above bottom sheet
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    position: 'absolute',
    right: 8,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  startMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  endMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F44336',
  },
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#185ADC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 20,
  },
  arrowMarkerContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowMarker: {
    width: 48,
    height: 48,
  },
});

export default SimulationControls;
