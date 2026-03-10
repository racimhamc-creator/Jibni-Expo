import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

interface SimulationBannerProps {
  onStopSimulation: () => void;
}

const SimulationBanner: React.FC<SimulationBannerProps> = ({ onStopSimulation }) => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
      <View style={styles.banner}>
        <View style={styles.content}>
          <Text style={styles.icon}>🎬</Text>
          <Text style={styles.title}>SIMULATION MODE</Text>
          <Text style={styles.subtitle}>Testing ride flow</Text>
        </View>
        <TouchableOpacity 
          style={styles.stopButton} 
          onPress={onStopSimulation}
        >
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  stopButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stopButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SimulationBanner;
