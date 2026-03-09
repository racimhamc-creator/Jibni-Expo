import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Dimensions, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

interface AvailabilitySectionProps {
  available: boolean;
  isToggling: boolean;
  onToggleAvailability: () => void;
  onMissionPress?: () => void;
  language?: Language;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  onToggleAvailability,
  available,
  isToggling,
  onMissionPress,
  language = 'ar',
}) => {
  const [visible, setVisible] = useState(false);
  const lang = language;
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { bottom: (Platform.OS === 'ios' ? 34 : 20) + 53 }
      ]}
    >
      <View style={styles.dragHandle} />
      
      <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
        <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{getTranslation('welcome', lang)}</Text>
        <TouchableOpacity onPress={onMissionPress}>
          <Text style={[styles.missionLink, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{getTranslation('missions', lang)}</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{getTranslation('areYouAvailable', lang)}</Text>
      
      <View style={[styles.availabilityRow, isRTL && styles.availabilityRowRTL]}>
        <Text style={[styles.availabilityText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{getTranslation('available', lang)}</Text>
        <TouchableOpacity
          style={[styles.toggle, available && styles.toggleActive]}
          onPress={onToggleAvailability}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <View style={styles.toggleThumb} />
          )}
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.changePhoneButton}>
        <Text style={[styles.changePhoneText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{getTranslation('wantToChangePhone', lang)}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: deviceWidth - 32,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 33,
    marginHorizontal: 16,
    zIndex: 9999,
  },
  dragHandle: {
    height: 2,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 106,
    alignSelf: 'center',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  missionLink: {
    color: '#185ADC',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  subtitle: {
    fontSize: 14,
    color: '#000000B8',
    marginBottom: 16,
  },
  availabilityRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#185ADC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  availabilityRowRTL: {
    flexDirection: 'row-reverse',
  },
  availabilityText: {
    fontSize: 14,
    color: '#000000E0',
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: '#D1DEF8',
    borderRadius: 50,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#185ADC',
    alignItems: 'flex-end',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  changePhoneButton: {
    height: 40,
    justifyContent: 'center',
    marginTop: 8,
  },
  changePhoneText: {
    fontSize: 12,
    color: '#185ADC',
    textDecorationLine: 'underline',
  },
});

export default AvailabilitySection;
