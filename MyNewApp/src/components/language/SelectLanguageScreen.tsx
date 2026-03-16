import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';

type LanguageOption = {
  id: 'fr' | 'en' | 'ar';
  name: string;
  flag: string;
};

const languages: LanguageOption[] = [
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'ar', name: 'العربية', flag: '🇩🇿' },
];

interface SelectLanguageScreenProps {
  onLanguageSelect: (language: 'fr' | 'en' | 'ar') => void;
}

const SelectLanguageScreen: React.FC<SelectLanguageScreenProps> = ({ onLanguageSelect }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en' | 'ar' | null>(null);

  const handleSelectLanguage = () => {
    if (selectedLanguage) {
      onLanguageSelect(selectedLanguage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <RNText style={styles.logoLetter}>D</RNText>
        </View>
        <RNText style={styles.logoText}>Depanini</RNText>
      </View>

      <View style={styles.languageBox}>
        <RNText style={styles.title}>Select Language</RNText>
        <RNText style={styles.subtitle}>اختر لغتك</RNText>

        <View style={styles.languageOptions}>
          {languages.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.languageOption,
                selectedLanguage === item.id && styles.languageOptionSelected,
              ]}
              onPress={() => setSelectedLanguage(item.id)}
            >
              <RNText style={styles.flag}>{item.flag}</RNText>
              <RNText style={styles.languageName}>{item.name}</RNText>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selectedLanguage && styles.buttonDisabled]}
          onPress={handleSelectLanguage}
          disabled={!selectedLanguage}
        >
          <RNText style={styles.buttonText}>Continue / متابعة</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#185ADC',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#185ADC',
    fontSize: 48,
    fontWeight: 'bold',
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 24,
  },
  languageBox: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#000000B8',
    marginBottom: 24,
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  languageOption: {
    width: 82,
    borderWidth: 1,
    borderColor: '#D1DEF8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  languageOptionSelected: {
    borderColor: '#185ADC',
    borderWidth: 2,
  },
  flag: {
    fontSize: 34,
    marginBottom: 12,
  },
  languageName: {
    fontSize: 14,
    color: '#000000CC',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#185ADC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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

export default SelectLanguageScreen;