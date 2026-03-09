import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Dimensions, ActivityIndicator, StyleSheet, Text, Platform, Image, Animated } from 'react-native';
import { Language, getTranslation, getFontFamily } from '../../utils/translations';

const { width: deviceWidth } = Dimensions.get('window');

interface RequestSectionProps {
  request: any;
  isAccepting: boolean;
  isRejecting: boolean;
  setRequest: (param: any) => void;
  onAccept: (missionId: string) => void;
  onReject: (missionId: string) => void;
  language?: Language;
}

const RequestSection: React.FC<RequestSectionProps> = ({
  request,
  isAccepting,
  isRejecting,
  setRequest,
  onAccept,
  onReject,
  language = 'ar',
}) => {
  const [visible, setVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<string | null>(null);
  const [isRequestExpired, setIsRequestExpired] = useState<boolean | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const fontFamily = getFontFamily(language);
  const isRTL = language === 'ar';
  const t = (key: string) => getTranslation(key as any, language);

  const getRemainingTimeToExpire = () => {
    if (request) {
      const jsDate = new Date(request?.createdAt || request?.created_at || Date.now());
      const diff = Math.floor((Date.now() - jsDate.getTime()) / 1000);
      const remainingSeconds = 60 - diff;
      if (remainingSeconds < 0) {
        return null;
      }
      return remainingSeconds < 10
        ? `00:0${remainingSeconds}`
        : `00:${remainingSeconds}`;
    } else {
      return null;
    }
  };

  useEffect(() => {
    if (isRequestExpired) {
      setRequest(null);
    }
  }, [isRequestExpired, setRequest]);

  useEffect(() => {
    if (request) {
      const interval = setInterval(() => {
        const time = getRemainingTimeToExpire();
        setRemainingSeconds(time);
        if (time === null) {
          setIsRequestExpired(true);
          clearInterval(interval);
        } else {
          setIsRequestExpired(false);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!request) {
    return null;
  }

  const getVehicleTypeLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'ECONOMY':
        return 'Economy';
      case 'COMFORT':
        return 'Comfort';
      case 'VAN':
        return 'Van';
      case 'MOTORCYCLE':
        return 'Motorcycle';
      default:
        return 'Economy';
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          bottom: (Platform.OS === 'ios' ? 34 : 20) + 12,
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          })}],
        }
      ]}
    >
        <View style={styles.dragHandle} />
        
        <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
          <Text style={[styles.title, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('requestAwaiting')}
          </Text>
          {remainingSeconds && (
            <View style={styles.countdownBadge}>
              <Text style={[styles.countdownText, { fontFamily }]}>{remainingSeconds}</Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.subtitle, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('clientNeedsHelp')}
        </Text>
        
        <View style={styles.divider} />
        
        {/* Client Location */}
        <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
          <Image
            source={require('../../assets/blue_location.png')}
            style={styles.icon}
          />
          <Text style={[styles.infoText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('pickupLocation')}
            <Text style={styles.highlight}>
              {request.distance ? ` ${request.distance} ${t('km')} ${t('away')}` : ` ${t('away')}`}
            </Text>
          </Text>
        </View>
        
        {/* Destination */}
        <View style={[styles.infoRow, styles.infoRowSpacing, isRTL && styles.infoRowRTL]}>
          <Image
            source={require('../../assets/blue_location.png')}
            style={styles.icon}
          />
          <Text style={[styles.infoText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('destination')}
            <Text style={styles.highlight}>
              {' '}
              {request.destination_address || request.destination || t('unknownDestination')}
            </Text>
          </Text>
        </View>
        
        {/* Price */}
        <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
          <Image
            source={require('../../assets/wallet.png')}
            style={styles.icon}
          />
          <Text style={[styles.infoText, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('price')}
            <Text style={styles.highlight}>
              {' '}
              {request.price || '0'} {t('dz')}
            </Text>
          </Text>
        </View>
        
        {/* Vehicle Type */}
        {request.vehicle_type && (
          <View style={[styles.infoRow, styles.infoRowSpacing, isRTL && styles.infoRowRTL]}>
            <Image
              source={require('../../assets/camion.png')}
              style={styles.icon}
            />
            <Text style={[styles.infoText, { fontFamily }]}>
              {t('vehicleType')}:{' '}
              <Text style={styles.highlight}>
                {getVehicleTypeLabel(request.vehicle_type)}
              </Text>
            </Text>
          </View>
        )}
        
        <View style={styles.divider} />
        
        {/* Accept Button */}
        <TouchableOpacity
          style={[styles.acceptButton, isRTL && styles.acceptButtonRTL]}
          onPress={() => onAccept(request.mission_id || request.id || request._id)}
          disabled={isAccepting || isRejecting}
        >
          {isAccepting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Image
                source={require('../../assets/accept_request.png')}
                style={styles.buttonIcon}
              />
              <Text style={[styles.acceptButtonText, { fontFamily }]}>{t('accept')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Reject Button */}
        <TouchableOpacity
          style={[styles.rejectButton, isRTL && styles.rejectButtonRTL]}
          onPress={() => onReject(request.mission_id || request.id || request._id)}
          disabled={isAccepting || isRejecting}
        >
          {isRejecting ? (
            <ActivityIndicator color="#FF3B30" />
          ) : (
            <>
              <Image
                source={require('../../assets/reject_request.png')}
                style={styles.buttonIcon}
              />
              <Text style={[styles.rejectButtonText, { fontFamily }]}>{t('reject')}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: deviceWidth - 32,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 12,
    paddingBottom: 22,
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
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#185ADC',
    flex: 1,
  },
  countdownBadge: {
    height: 34,
    justifyContent: 'center',
    backgroundColor: '#FFE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  countdownText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#000000B8',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E0DC',
    marginVertical: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRowSpacing: {
    marginTop: 24,
  },
  icon: {
    height: 24,
    width: 24,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#000000E0',
    flex: 1,
  },
  highlight: {
    color: '#185ADC',
    fontWeight: '500',
  },
  acceptButton: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#185ADC',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
rejectButton: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFE2E2',
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginTop: 16,
  },
  rejectButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  // RTL Styles
  headerRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  acceptButtonRTL: {
    flexDirection: 'row-reverse',
  },
  rejectButtonRTL: {
    flexDirection: 'row-reverse',
  },
});

export default RequestSection;
