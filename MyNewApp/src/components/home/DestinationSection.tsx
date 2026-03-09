import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions, Image, Text } from 'react-native';

const { width: deviceWidth } = Dimensions.get('window');

interface DestinationSectionProps {
  onSelectAddress: () => void;
  selectedDestination?: string;
}

const DestinationSection: React.FC<DestinationSectionProps> = ({
  onSelectAddress,
  selectedDestination,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 1000);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.dragHandle} />
      <Text style={styles.title}>Where do you want to go?</Text>
      <Text style={styles.subtitle}>Fill in your destination</Text>
      <TouchableOpacity style={styles.button} onPress={onSelectAddress}>
        <Text style={[styles.text, selectedDestination && styles.textSelected]}>
          {selectedDestination || 'Destination'}
        </Text>
        <Image
          source={require('../../assets/arrow-left.png')}
          style={styles.arrowIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 53,
    width: deviceWidth - 32,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderRadius: 33,
    marginHorizontal: 16,
  },
  dragHandle: {
    height: 2,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 106,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 18,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#000000B8',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#185ADC',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#00000080',
  },
  textSelected: {
    color: '#000000E0',
  },
  arrowIcon: {
    height: 24,
    width: 24,
  },
});

export default DestinationSection;
