import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || 'google';
} catch (error) {
  console.warn('react-native-maps not available');
}

interface MapPickerScreenProps {
  onSelectLocation: (location: { lat: number; lng: number; placeDescription: string }) => void;
  onBack: () => void;
  initialLocation?: { lat: number; lng: number };
}

const MapPickerScreen: React.FC<MapPickerScreenProps> = ({ 
  onSelectLocation, 
  onBack,
  initialLocation 
}) => {
  const [centerCoordinate, setCenterCoordinate] = useState({
    latitude: initialLocation?.lat || 36.7538,
    longitude: initialLocation?.lng || 3.0588,
  });
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSelected, setHasSelected] = useState(!!initialLocation);
  const mapRef = useRef<any>(null);

  const reverseGeocode = async (lat: number, lng: number, placeName?: string) => {
    setIsLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setAddress(placeName || `Location at ${lat.toFixed(4)}`);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        // We try to find a more specific name if possible, otherwise formatted_address
        const result = data.results[0];
        setAddress(placeName || result.formatted_address);
      } else {
        setAddress(placeName || "Selected Location");
      }
    } catch (error) {
      setAddress("Location selected (No Connection)");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelection = (latitude: number, longitude: number, placeName?: string) => {
    const newCoord = { latitude, longitude };
    setCenterCoordinate(newCoord);
    setHasSelected(true);
    
    // Zoom in slightly if the user is currently zoomed out too far
    mapRef.current?.animateCamera({
      center: newCoord,
      zoom: 15, // Smooth zoom to a street level
    }, { duration: 400 });

    reverseGeocode(latitude, longitude, placeName);
  };

  const handleConfirm = () => {
    if (hasSelected) {
      onSelectLocation({
        lat: centerCoordinate.latitude,
        lng: centerCoordinate.longitude,
        placeDescription: address,
      });
    }
  };

  if (!MapView) return <View style={styles.container}><Text>Error Loading Map</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Destination</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          tappable={true}
          initialRegion={{
            latitude: centerCoordinate.latitude,
            longitude: centerCoordinate.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          // Fix for the "Must zoom in" problem: Use both onPress and onPoiClick
          onPress={(e: any) => handleSelection(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          onPoiClick={(e: any) => handleSelection(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, e.nativeEvent.name)}
        >
          {hasSelected && (
            <Marker 
              key={`${centerCoordinate.latitude}-${centerCoordinate.longitude}`}
              coordinate={centerCoordinate}
              pinColor="#185ADC"
              tracksViewChanges={false} // Optimization for smoothness
            />
          )}
        </MapView>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.addressContainer}>
          <Text style={styles.label}>SELECTED ADDRESS</Text>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#185ADC" />
              <Text style={styles.loadingText}>Identifying place...</Text>
            </View>
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address || "Tap any spot or shop on the map"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, (!hasSelected || isLoading) && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={!hasSelected || isLoading}
        >
          <Text style={styles.confirmButtonText}>Confirm Destination</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff'
  },
  backButtonText: { color: '#185ADC', fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  bottomPanel: { 
    padding: 24, 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  label: { fontSize: 11, color: '#999', marginBottom: 8, fontWeight: '700', letterSpacing: 0.5 },
  addressContainer: { marginBottom: 20, minHeight: 50 },
  addressText: { fontSize: 16, color: '#1A1A1A', fontWeight: '500', lineHeight: 22 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { marginLeft: 10, color: '#666', fontSize: 14 },
  confirmButton: { 
    backgroundColor: '#185ADC', 
    padding: 18, 
    borderRadius: 14, 
    alignItems: 'center',
    shadowColor: '#185ADC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  disabledButton: { backgroundColor: '#E0E7FF', shadowOpacity: 0 },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});

export default MapPickerScreen;