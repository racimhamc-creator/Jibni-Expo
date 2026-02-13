import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  View,
} from 'react-native';
import { Box, Button, Header, Input, Text } from '@/src/components/ui';
import { theme } from '@/src/theme';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import VehicleTypeSelector, { VehicleType } from '@/src/components/home/VehicleTypeSelector';

// Simple debounce hook since use-debounce might not be installed
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
};

const LocationSvgComponent: React.FC<any> = ({ props, strokeColor }) => {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M12 13.43a3.12 3.12 0 100-6.24 3.12 3.12 0 000 6.24z"
        stroke={strokeColor || '#185ADC'}
        strokeWidth={1.5}
      />
      <Path
        d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.194 5.194 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke={strokeColor || '#185ADC'}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

function MapSvgComponent(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M2.29 7.78v9.73c0 1.9 1.35 2.68 2.99 1.74l2.35-1.34c.51-.29 1.36-.32 1.89-.05l5.25 2.63c.53.26 1.38.24 1.89-.05l4.33-2.48c.55-.32 1.01-1.1 1.01-1.74V6.49c0-1.9-1.35-2.68-2.99-1.74l-2.35 1.34c-.51.29-1.36.32-1.89.05L9.52 3.52c-.53-.26-1.38-.24-1.89.05L3.3 6.05c-.56.32-1.01 1.1-1.01 1.73zM8.56 4v13M15.73 6.62V20"
        stroke="#185ADC"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const AddressAutoCompleteScreen: React.FC = () => {
  const [currentPosition, setCurrentPosition] = useState<any>('');
  const [destination, setDestination] = useState<any>('');
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef(searchValue);
  const [debouncedValue] = useDebounce(searchValue, 200);
  const clientPositionRef = useRef(currentPosition);
  const [selectedInput, setSelectedInput] = useState<'destination' | 'clientPosition'>();
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const { t } = useTranslation();

  const goback = () => {
    router.back();
  };

  const ChooseFromMap = () => {
    // TODO: Navigate to map selection screen
    Alert.alert('Info', 'Map selection coming soon');
    // router.push('/(tabs)/choose-from-map');
  };

  useEffect(() => {
    clientPositionRef.current = currentPosition;
  }, [currentPosition]);

  const selectAddress = () => {
    if (!destination?.lat || !destination?.lng) {
      Alert.alert(
        t('addressAutoComplete.error') || 'Error',
        t('addressAutoComplete.selectDestination') || 'Please select a destination address',
      );
      return;
    }

    // Show vehicle type selector instead of going back immediately
    setShowVehicleSelector(true);
  };

  const handleVehicleSelected = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setShowVehicleSelector(false);

    const params = currentPosition?.lat
      ? {
          destinationCoord: {
            lat: destination.lat,
            lng: destination.lng,
          },
          userCoord: {
            lat: currentPosition?.lat,
            lng: currentPosition?.lng,
          },
          vehicleType,
        }
      : {
          destinationCoord: {
            lat: destination.lat,
            lng: destination.lng,
          },
          vehicleType,
        };

    // TODO: Store destination data and navigate back
    console.log('Destination and vehicle selected:', params);
    router.back();
  };

  const fetchPlaces = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      setSearching(true);
      // TODO: Replace with your Google Places API key from environment
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY';
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}&key=${apiKey}&language=en`,
      );
      const data = await res.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
        setSearching(false);
      } else {
        setSearching(false);
      }
    } catch (e) {
      Alert.alert(t('genericError') || 'An error occurred');
      console.log('Places API error:', e);
      setSearching(false);
    }
  };

  const getPlaceDetails = async (placeId: string, placeDescription: string) => {
    if (isSelectingSuggestion) {
      return;
    }
    setIsSelectingSuggestion(placeId);
    try {
      // TODO: Replace with your Google Places API key from environment
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        if (selectedInput == 'destination') {
          setDestination({
            lat,
            lng,
            placeDescription,
          });
        } else {
          setCurrentPosition({
            lat,
            lng,
            placeDescription,
          });
        }
        setSearchValue(placeDescription);
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsSelectingSuggestion(null);
    }
  };

  useEffect(() => {
    searchRef.current = searchValue;
    if (debouncedValue.length >= 3) {
      fetchPlaces(debouncedValue);
    } else {
      setSearching(false);
      setSuggestions([]);
    }
  }, [debouncedValue]);

  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      <Header onPress={goback} />
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingBottom: 30,
          }}
        >
          <Text
            variant={'subheader'}
            color={'text'}
            style={{ marginBottom: 6, marginTop: 22, marginStart: 32 }}
          >
            {t('addressAutoComplete.currentPositionLabel') || 'Current Position'}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LocationSvgComponent />
            <Input
              placeholder={t('addressAutoComplete.currentPosition') || 'Current position'}
              value={
                currentPosition?.placeDescription ||
                currentPosition ||
                (selectedInput == 'clientPosition' && searchValue)
              }
              onFocus={() => {
                setSelectedInput('clientPosition');
                setSearchValue('');
              }}
              onChangeText={v => {
                setSearchValue(v);
                if (!currentPosition?.lat || !currentPosition?.lng) {
                  setCurrentPosition(v);
                }
              }}
              containerStyle={{
                backgroundColor: '#FAFAFA',
                borderColor: '#EDEBE8',
                flex: 1,
              }}
              style={{
                color: theme.colors.primary,
                height: 46,
              }}
              placeholderTextColor={theme.colors.primary}
            />
            <View
              style={{
                height: 72,
                borderLeftWidth: 1,
                borderColor: theme.colors.primary,
                position: 'absolute',
                top: 35,
                left: 11,
                borderStyle: 'dashed',
              }}
            />
          </View>
          <Text
            variant={'subheader'}
            color={'text'}
            style={{ marginBottom: 6, marginTop: 22, marginStart: 32 }}
          >
            {t('addressAutoComplete.destinationLabel') || 'Destination'}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LocationSvgComponent />
            <Input
              placeholder={t('addressAutoComplete.destination') || 'Destination'}
              value={
                destination?.placeDescription ||
                destination ||
                (selectedInput == 'destination' && searchValue)
              }
              onChangeText={v => {
                setSearchValue(v);
                if (!destination?.lat || !destination?.lng) {
                  setDestination(v);
                }
              }}
              onFocus={() => {
                setSelectedInput('destination');
                setSearchValue('');
              }}
              containerStyle={{
                backgroundColor: '#FAFAFA',
                borderColor: '#EDEBE8',
                flex: 1,
              }}
              style={{
                height: 46,
              }}
            />
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: '#E2E0DC',
              marginTop: 32,
              marginBottom: 20,
            }}
          />
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: '#E8EEFB',
              gap: 8,
              alignItems: 'center',
            }}
            onPress={ChooseFromMap}
          >
            <MapSvgComponent />
            <Text
              color={'primary'}
              style={{
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              {t('addressAutoComplete.openInMap') || 'Open in Map'}
            </Text>
          </TouchableOpacity>
          {suggestions.length > 0 && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: '#E2E0DC',
                  marginVertical: 20,
                }}
              />
              <Text variant={'header'}>
                {t('addressAutoComplete.chooseDestinationFromList') || 'Choose destination from list'}
              </Text>
            </>
          )}
          {isSearching && (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
          {suggestions.map((item, index) => (
            <View key={item?.place_id + index}>
              {index > 0 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: '#E2E0DC',
                    marginVertical: 16,
                  }}
                />
              )}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                }}
                onPress={() => {
                  getPlaceDetails(item.place_id, item.description);
                }}
              >
                {item.place_id == isSelectingSuggestion ? (
                  <ActivityIndicator />
                ) : (
                  <LocationSvgComponent strokeColor={'#000000CC'} />
                )}
                <View
                  style={{
                    flex: 1,
                    marginStart: 5,
                  }}
                >
                  <Text variant={'subheader'} style={{ flex: 1 }}>
                    {item.description}
                  </Text>
                  <Text variant={'body'}>
                    {item.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
      <Button
        label={t('continue') || 'Continue'}
        onPress={() => {
          if (!destination?.lat || !destination?.lng) {
            Alert.alert('Error', t('addressAutoComplete.selectDestination') || 'Please select a destination from the suggestions list');
            return;
          }
          selectAddress();
        }}
        disabled={!destination?.lat || (currentPosition && typeof currentPosition !== 'string' && !currentPosition?.lat)}
        style={{
          marginHorizontal: 24,
          marginBottom: insets.bottom + 16,
        }}
      />

      {/* Vehicle Type Selector Modal */}
      <VehicleTypeSelector
        visible={showVehicleSelector}
        onSelect={handleVehicleSelected}
        onClose={() => setShowVehicleSelector(false)}
      />
    </Box>
  );
};

export default AddressAutoCompleteScreen;
