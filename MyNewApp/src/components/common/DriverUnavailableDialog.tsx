import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';

interface DriverUnavailableDialogProps {
  visible: boolean;
  onDismiss: () => void;
  language?: 'ar' | 'en' | 'fr';
}

const translations = {
  ar: {
    title: 'السائق غير متاح',
    message: 'قام السائق برفض طلب الرحلة. نحن نبحث عن سائق آخر.',
    ok: 'موافق',
  },
  en: {
    title: 'Driver Unavailable',
    message: 'The driver has declined the ride request. We are searching for another driver.',
    ok: 'OK',
  },
  fr: {
    title: 'Chauffeur Non Disponible',
    message: 'Le chauffeur a refusé la demande de course. Nous cherchons un autre chauffeur.',
    ok: 'OK',
  },
};

export const DriverUnavailableDialog: React.FC<DriverUnavailableDialogProps> = ({
  visible,
  onDismiss,
  language = 'en',
}) => {
  const t = translations[language] || translations.en;
  const isRTL = language === 'ar';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, isRTL && styles.dialogRTL]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚫</Text>
          </View>
          
          <Text style={[styles.title, isRTL && styles.titleRTL]}>
            {t.title}
          </Text>
          
          <Text style={[styles.message, isRTL && styles.messageRTL]}>
            {t.message}
          </Text>
          
          <TouchableOpacity
            style={[styles.button, isRTL && styles.buttonRTL]}
            onPress={onDismiss}
          >
            <Text style={styles.buttonText}>{t.ok}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dialogRTL: {
    alignItems: 'flex-end',
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  titleRTL: {
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  messageRTL: {
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#185ADC',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
    width: '100%',
  },
  buttonRTL: {
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DriverUnavailableDialog;
