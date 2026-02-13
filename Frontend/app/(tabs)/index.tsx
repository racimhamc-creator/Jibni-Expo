import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Box, Text } from '@/src/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';
import DestinationSection from '@/src/components/home/DestinationSection';
import DriverSection from '@/src/components/home/DriverSection';
import { useAuthStore } from '@/stores/authStore';
import * as Location from 'expo-location';

// Conditionally import MapView and Marker - fallback if not available
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Marker = maps.Marker || (maps.default && maps.default.Marker);
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || 'google';
} catch (error) {
  console.warn('react-native-maps not available, using placeholder');
}

const HomeScreen: React.FC = () => {
  const mapRef = useRef<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);

  // Initialize with Algeria coordinates as fallback
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.0339,
    longitude: 1.6596,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>('');

  const handleSelectAddress = () => {
    // Navigate to address autocomplete screen
    router.push('/(tabs)/address-autocomplete');
  };

  const handleBecomeDriver = () => {
    // Navigate to become driver screen
    router.push('/(tabs)/become-driver');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Get user's current location on mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        // Check if location permission is granted
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Location permission not granted');
          setLocationPermissionGranted(false);
          return;
        }

        setLocationPermissionGranted(true);

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation(location);

        // Update map region to center on user location
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setMapRegion(newRegion);

        // Center map on user location if map is ready
        if (mapRef.current && isMapReady) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermissionGranted(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Center map on user location when map becomes ready and we have location
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
      const region = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        mapRef.current?.animateToRegion(region, 1000);
      }, 300);
    }
  }, [isMapReady, userLocation]);

  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      {/* Top Bar with Profile Icon */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 0,
          right: 0,
          zIndex: 9999,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ width: 40 }} />
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 20 }}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {MapView ? (
        <MapView
          ref={mapRef}
          onMapReady={() => {
            setIsMapReady(true);
            if (mapRef.current && mapRegion) {
              setTimeout(() => {
                mapRef.current?.animateToRegion(mapRegion, 1000);
              }, 300);
            }
          }}
          initialRegion={mapRegion}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
          }}
        >
          {/* Custom User Position Marker */}
          {userLocation && Marker && (
            <Marker
              coordinate={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Your Location"
              description="You are here"
              image={require('@/src/assets/userPosition.png')}
            />
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E8EEFB', justifyContent: 'center', alignItems: 'center' }]}>
          <Text variant="body" color="text">
            {t('home.mapLoading') || 'Map loading...'}
          </Text>
          <Text variant="body" fontSize={12} color="text" marginTop="s">
            {t('home.installMaps') || 'Please install react-native-maps'}
          </Text>
        </View>
      )}

      {/* Driver Section (Top) */}
      <DriverSection handleBecomeDriver={handleBecomeDriver} />

      {/* Destination Section (Bottom) */}
      <DestinationSection 
        onSelectAddress={handleSelectAddress}
        selectedDestination={selectedDestination}
      />
    </Box>
  );
};

export default HomeScreen;
