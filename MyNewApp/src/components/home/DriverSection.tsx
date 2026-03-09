import React from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions, Image, Text } from 'react-native';

const { width: deviceWidth } = Dimensions.get('window');

interface DriverSectionProps {
  handleBecomeDriver: () => void;
}

const DriverSection: React.FC<DriverSectionProps> = ({ handleBecomeDriver }) => {
  const user = null; // Placeholder - will get from store later

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/header_logo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      <View style={[styles.card, user?.requestedToBeServer && styles.cardRequested]}>
        <Image
          source={require('../../assets/home_wave_1.png')}
          style={styles.wave1}
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/home_wave_2.png')}
          style={styles.wave2}
          resizeMode="contain"
        />
        <View style={styles.content}>
          <Text style={[styles.title, user?.requestedToBeServer && styles.titleRequested]}>
            {user?.requestedToBeServer ? 'Request Sent' : 'Want to be a driver?'}
          </Text>
          {user?.requestedToBeServer ? (
            <Text style={styles.subtitle}>
              We are analyzing your profile
            </Text>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleBecomeDriver}>
              <Text style={styles.buttonText}>Request Now</Text>
            </TouchableOpacity>
          )}
        </View>
        <Image
          source={require('../../assets/home_picture.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerLogo: {
    width: 70,
    height: 24,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#185ADC',
    flexDirection: 'row',
    marginHorizontal: 24,
    paddingStart: 24,
    paddingTop: 16,
    borderRadius: 12,
    width: deviceWidth - 48,
    overflow: 'hidden',
    marginTop: 17,
    minHeight: 150,
  },
  cardRequested: {
    backgroundColor: '#E8EEFB',
  },
  wave1: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 69,
    width: 325,
  },
  wave2: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 83,
    width: 305,
  },
  content: {
    flex: 1,
    zIndex: 999,
    alignItems: 'flex-start',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: 'white',
    flexShrink: 1,
  },
  titleRequested: {
    color: '#185ADC',
  },
  subtitle: {
    fontSize: 14,
    color: '#000000B8',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FEC846',
    marginTop: 14,
    borderRadius: 12,
    padding: 10,
  },
  buttonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  image: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 140,
    width: 186,
  },
});

export default DriverSection;
