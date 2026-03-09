import React from 'react';
import { TouchableOpacity, View, Dimensions, StyleSheet, Text, Platform, Linking } from 'react-native';

const { width: deviceWidth } = Dimensions.get('window');

interface AcceptedMissionSectionProps {
  onCallClient: () => void;
  onCancel: () => void;
  clientPhone?: string;
  destination?: string;
}

const AcceptedMissionSection: React.FC<AcceptedMissionSectionProps> = ({
  onCallClient,
  onCancel,
  clientPhone = '+213 555 123 456',
  destination = 'Destination address',
}) => {
  const handleCall = () => {
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone.replace(/\s/g, '')}`);
    }
    onCallClient();
  };

  return (
    <View
      style={[
        styles.container,
        { bottom: (Platform.OS === 'ios' ? 34 : 20) + 53 }
      ]}
    >
      <View style={styles.dragHandle} />
      
      <Text style={styles.title}>Active Mission</Text>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Destination:</Text>
        <Text style={styles.value}>{destination}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Client:</Text>
        <Text style={styles.value}>{clientPhone}</Text>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.callButton]}
          onPress={handleCall}
        >
          <Text style={styles.callButtonText}>📞 Call Client</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 24,
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    color: '#000000B8',
    width: 100,
  },
  value: {
    fontSize: 14,
    color: '#000000E0',
    flex: 1,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#34C759',
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AcceptedMissionSection;
