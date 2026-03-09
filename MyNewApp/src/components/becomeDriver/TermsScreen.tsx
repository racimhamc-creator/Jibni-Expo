import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';

interface TermsScreenProps {
  onBack: () => void;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ onBack }) => {
  const { t, isRTL, fontFamily } = useLanguage();

  const termsSections = [
    {
      title: t('termsSection1'),
      content: t('termsSection1Content'),
    },
    {
      title: t('termsSection2'),
      content: t('termsSection2Content'),
    },
    {
      title: t('termsSection3'),
      content: t('termsSection3Content'),
    },
    {
      title: t('termsSection4'),
      content: t('termsSection4Content'),
    },
    {
      title: t('termsSection5'),
      content: t('termsSection5Content'),
    },
    {
      title: t('termsSection6'),
      content: t('termsSection6Content'),
    },
    {
      title: t('termsSection7'),
      content: t('termsSection7Content'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        {isRTL ? (
          <>
            <View style={styles.placeholder} />
            <Text style={[styles.headerTitle, { fontFamily }]}>{t('termsAndConditions')}</Text>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={[styles.backButtonText, { fontFamily }]}>
                {t('back')} ←
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={[styles.backButtonText, { fontFamily }]}>
                ← {t('back')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily }]}>{t('termsAndConditions')}</Text>
            <View style={styles.placeholder} />
          </>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {termsSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <View style={[styles.validationSection, isRTL && styles.validationSectionRTL]}>
          <Text style={[styles.validationTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('termsValidation')}
          </Text>
          <Text style={[styles.validationContent, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('termsValidationContent')}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontFamily, textAlign: 'center' }]}>
            {t('termsLastUpdated')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#185ADC',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#185ADC',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 24,
  },
  validationSection: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#185ADC',
  },
  validationSectionRTL: {
    alignItems: 'flex-end',
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#185ADC',
    marginBottom: 8,
  },
  validationContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    width: '100%',
  },
});

export default TermsScreen;
