import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MapPickerScreen from './MapPickerScreen';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';
import { searchPlaces, getPlaceDetails as getGooglePlaceDetails, PlacePrediction } from '../../services/placesService';

// Simple debounce hook
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

  return debouncedValue;
};

const LocationSvgComponent: React.FC<{ strokeColor?: string }> = ({ strokeColor = '#185ADC' }) => {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13.43a3.12 3.12 0 100-6.24 3.12 3.12 0 000 6.24z"
        stroke={strokeColor}
        strokeWidth={1.5}
      />
      <Path
        d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.194 5.194 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke={strokeColor}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

function MapSvgComponent(props: any) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
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

interface AddressAutocompleteScreenProps {
  onSelect: (destination: { lat: number; lng: number; placeDescription: string }) => void;
  onBack: () => void;
  language?: 'fr' | 'en' | 'ar';
}

const AddressAutocompleteScreen: React.FC<AddressAutocompleteScreenProps> = ({ onSelect, onBack, language = 'ar' }) => {
  const [currentPosition, setCurrentPosition] = useState<any>('');
  const [destination, setDestination] = useState<any>('');
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedInput, setSelectedInput] = useState<'destination' | 'clientPosition'>();
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isTypingDestination, setIsTypingDestination] = useState(false);
  const debouncedValue = useDebounce(searchValue, 300);
  
  const fontFamily = getFontFamily(language);
  const boldFontFamily = getFontFamily(language, 'bold');
  const isRTL = language === 'ar';
  
  const t = (key: string) => getTranslation(key as any, language);

  const fetchPlaces = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      console.log('🔍 AddressAutocomplete: Searching Google Places for:', query);
      const predictions = await searchPlaces(query);
      console.log('🔍 AddressAutocomplete: Got', predictions.length, 'predictions from Google');
      setSuggestions(predictions);
    } catch (error) {
      console.error('🔍 AddressAutocomplete: Google Places search failed:', error);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const getPlaceDetails = async (placeId: string, placeDescription: string) => {
    if (isSelectingSuggestion) {
      return;
    }
    setIsSelectingSuggestion(placeId);
    try {
      console.log('📍 AddressAutocomplete: Getting details for place_id:', placeId);
      const placeDetails = await getGooglePlaceDetails(placeId);
      
      if (placeDetails) {
        console.log('📍 AddressAutocomplete: Got place details:', {
          name: placeDetails.name,
          address: placeDetails.address,
          lat: placeDetails.lat,
          lng: placeDetails.lng,
        });
        
        if (selectedInput === 'destination') {
          setDestination({
            lat: placeDetails.lat,
            lng: placeDetails.lng,
            placeDescription: placeDetails.address,
          });
        } else {
          setCurrentPosition({
            lat: placeDetails.lat,
            lng: placeDetails.lng,
            placeDescription: placeDetails.address,
          });
        }
        
        setSearchValue(placeDescription);
        setIsTypingDestination(false);
        setSuggestions([]);
        setShowMapPicker(false);
        
        // Call onSelect with the new destination
        onSelect({
          lat: placeDetails.lat,
          lng: placeDetails.lng,
          placeDescription: placeDetails.address,
        });
      }
    } catch (error) {
      console.error('📍 AddressAutocomplete: Failed to get place details:', error);
    } finally {
      setIsSelectingSuggestion(null);
    }
  };

  useEffect(() => {
    if (debouncedValue.length >= 2) {
      fetchPlaces(debouncedValue);
    } else {
      setSearching(false);
      setSuggestions([]);
    }
  }, [debouncedValue]);

  const selectAddress = () => {
    if (!destination?.lat || !destination?.lng) {
      Alert.alert('Error', 'Please select a destination address');
      return;
    }

    // Directly proceed without vehicle selector
    onSelect({
      lat: destination.lat,
      lng: destination.lng,
      placeDescription: destination.placeDescription,
    });
  };

  const ChooseFromMap = () => {
    setShowMapPicker(true);
  };

  const handleMapLocationSelected = (location: { lat: number; lng: number; placeDescription: string }) => {
    setDestination(location);
    setShowMapPicker(false);
    setIsTypingDestination(false);
    setSuggestions([]);
  };

  const handleDestinationChange = (text: string) => {
    setSearchValue(text);
    setIsTypingDestination(text.length > 0);
    if (!destination?.lat || !destination?.lng) {
      setDestination(text);
    }
  };

  const handleDestinationFocus = () => {
    setSelectedInput('destination');
    if (!destination?.placeDescription) {
      setSearchValue('');
    }
    setIsTypingDestination(true);
  };

  const handleSuggestionPress = (item: any) => {
    getPlaceDetails(item.place_id, item.description);
  };

  // Get display value for destination input
  const getDestinationDisplayValue = () => {
    if (typeof destination === 'object' && destination?.placeDescription) {
      return destination.placeDescription;
    }
    if (typeof destination === 'string') {
      return destination;
    }
    if (selectedInput === 'destination' && searchValue) {
      return searchValue;
    }
    return '';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { fontFamily }]}>{isRTL ? '→' : '←'} {t('back')}</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isRTL && styles.scrollContentRTL]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Position Field */}
        <Text style={[styles.label, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{t('currentPosition')}</Text>
        <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
          <LocationSvgComponent />
          <TextInput
            style={[styles.input, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('currentPosition')}
            placeholderTextColor="#999"
            value={
              String(
                currentPosition?.placeDescription ||
                currentPosition ||
                (selectedInput === 'clientPosition' && searchValue) ||
                ''
              )
            }
            onFocus={() => {
              setSelectedInput('clientPosition');
              setSearchValue('');
              setIsTypingDestination(false);
            }}
            onChangeText={(v) => {
              setSearchValue(v);
              if (!currentPosition?.lat || !currentPosition?.lng) {
                setCurrentPosition(v);
              }
            }}
          />
          <View style={[styles.dashedLine, isRTL && styles.dashedLineRTL]} />
        </View>

        {/* Destination Field */}
        <Text style={[styles.label, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{t('destination')}</Text>
        <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
          <LocationSvgComponent />
          <TextInput
            style={[styles.input, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('whereToGo')}
            placeholderTextColor="#999"
            value={getDestinationDisplayValue()}
            onChangeText={handleDestinationChange}
            onFocus={handleDestinationFocus}
            autoFocus={true}
          />
        </View>

        {/* Suggestions List - Appears directly under destination field when typing */}
        {isTypingDestination && (
          <View style={styles.suggestionsContainer}>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#185ADC" />
                <Text style={[styles.loadingText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{t('searching')}</Text>
              </View>
            )}

            {!isSearching && suggestions.length === 0 && searchValue.length >= 2 && (
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{t('noResultsFound')}</Text>
              </View>
            )}

            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item?.place_id || index}
                style={[
                  styles.suggestionItem,
                  index === 0 && styles.firstSuggestionItem,
                  index === suggestions.length - 1 && styles.lastSuggestionItem,
                ]}
                onPress={() => handleSuggestionPress(item)}
              >
                {item.place_id === isSelectingSuggestion ? (
                  <ActivityIndicator size="small" color="#185ADC" />
                ) : (
                  <LocationSvgComponent strokeColor="#185ADC" />
                )}
                <View style={[styles.suggestionTextContainer, isRTL && styles.suggestionTextContainerRTL]}>
                  <Text style={[styles.suggestionMainText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  <Text style={[styles.suggestionSubText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {item.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Open in Map Button - Always show */}
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={[styles.mapButton, isRTL && styles.mapButtonRTL]} onPress={ChooseFromMap}>
            <MapSvgComponent />
            <Text style={[styles.mapButtonText, { fontFamily }]}>{t('openInMap')}</Text>
          </TouchableOpacity>
        </>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.button,
          !destination?.lat && styles.buttonDisabled,
        ]}
        onPress={selectAddress}
        disabled={Boolean(!destination?.lat)}
      >
        <Text style={[styles.buttonText, { fontFamily: boldFontFamily, textAlign: 'center' }]}>{t('searchForDrivers')}</Text>
      </TouchableOpacity>

      {/* Map Picker Modal */}
      <Modal
        visible={showMapPicker}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MapPickerScreen
          onSelectLocation={handleMapLocationSelected}
          onBack={() => setShowMapPicker(false)}
          initialLocation={destination?.lat ? { lat: destination.lat, lng: destination.lng } : undefined}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    paddingTop: 48,
  },
  backButtonText: {
    fontSize: 16,
    color: '#185ADC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  scrollContentRTL: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#000000B8',
    marginBottom: 6,
    marginTop: 22,
    marginStart: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EDEBE8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#185ADC',
  },
  dashedLine: {
    height: 72,
    borderLeftWidth: 1,
    borderColor: '#185ADC',
    position: 'absolute',
    top: 35,
    left: 11,
    borderStyle: 'dashed',
  },
  dashedLineRTL: {
    height: 72,
    borderLeftWidth: 1,
    borderColor: '#185ADC',
    position: 'absolute',
    top: 35,
    right: 11,
    left: 'auto',
    borderStyle: 'dashed',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E0DC',
    marginVertical: 16,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E0DC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  firstSuggestionItem: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTextContainerRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  suggestionMainText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  suggestionSubText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  noResultsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#999',
    fontSize: 14,
  },
  mapButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E8EEFB',
    gap: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  mapButtonRTL: {
    flexDirection: 'row-reverse',
  },
  mapButtonText: {
    color: '#185ADC',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1DEF8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddressAutocompleteScreen;
