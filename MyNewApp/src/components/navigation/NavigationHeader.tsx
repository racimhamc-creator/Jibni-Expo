import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteStep } from '../../services/directions';

// Re-export for convenience
export type NavigationStep = RouteStep;

interface NavigationHeaderProps {
  currentStep: RouteStep | null;
  nextStep?: RouteStep | null;
  language?: 'en' | 'fr' | 'ar';
}

// Helper: Strip HTML tags from instruction
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

// Helper: Map maneuver to MaterialCommunityIcons name
const getManeuverIcon = (maneuver?: string): string => {
  if (!maneuver) return 'arrow-up';
  
  const maneuverMap: Record<string, string> = {
    // Google Routes API v2 uppercase maneuvers
    'TURN_LEFT': 'arrow-left',
    'TURN_RIGHT': 'arrow-right',
    'TURN_SHARP_LEFT': 'arrow-left-bold',
    'TURN_SHARP_RIGHT': 'arrow-right-bold',
    'TURN_SLIGHT_LEFT': 'arrow-top-left',
    'TURN_SLIGHT_RIGHT': 'arrow-top-right',
    'STRAIGHT': 'arrow-up',
    'CONTINUE': 'arrow-up',
    'UTURN_LEFT': 'arrow-u-left-top',
    'UTURN_RIGHT': 'arrow-u-right-top',
    'ROUNDABOUT_LEFT': 'rotate-left',
    'ROUNDABOUT_RIGHT': 'rotate-right',
    'ROUNDABOUT_CENTER': 'rotate-360',
    'MERGE': 'merge',
    'MERGE_LEFT': 'arrow-top-left',
    'MERGE_RIGHT': 'arrow-top-right',
    'FORK_LEFT': 'arrow-split-vertical',
    'FORK_RIGHT': 'arrow-split-vertical',
    'FORK_MIDDLE': 'arrow-up-bold',
    'RAMP_LEFT': 'arrow-top-left-bold-box',
    'RAMP_RIGHT': 'arrow-top-right-bold-box',
    'RAMP_SLIGHT_LEFT': 'arrow-top-left',
    'RAMP_SLIGHT_RIGHT': 'arrow-top-right',
    'KEEP_LEFT': 'arrow-left-top',
    'KEEP_RIGHT': 'arrow-right-top',
    'KEEP_STRAIGHT': 'arrow-up',
    'DEPART': 'arrow-up-circle',
    'DESTINATION': 'flag-checkered',
    'DESTINATION_WAYPOINT': 'flag-variant',
    'NAME_CHANGE': 'road-variant',
    
    // Legacy lowercase maneuvers
    'turn-left': 'arrow-left',
    'turn-right': 'arrow-right',
    'turn-sharp-left': 'arrow-left-bold',
    'turn-sharp-right': 'arrow-right-bold',
    'turn-slight-left': 'arrow-top-left',
    'turn-slight-right': 'arrow-top-right',
    'roundabout-left': 'rotate-left',
    'roundabout-right': 'rotate-right',
    'uturn-left': 'arrow-u-left-top',
    'uturn-right': 'arrow-u-right-top',
    'straight': 'arrow-up',
    'continue': 'arrow-up',
    'merge': 'merge',
    'fork-left': 'arrow-split-vertical',
    'fork-right': 'arrow-split-vertical',
    'ramp-left': 'arrow-top-left-bold-box',
    'ramp-right': 'arrow-top-right-bold-box',
    'keep-left': 'arrow-left-top',
    'keep-right': 'arrow-right-top',
    'depart': 'flag-checkered',
    'arrive': 'map-marker-check',
  };
  
  return maneuverMap[maneuver.toUpperCase()] || maneuverMap[maneuver.toLowerCase()] || 'arrow-up';
};

// Helper: Format distance for Algeria (meters/km)
const formatDistance = (distanceText: string, language: string): string => {
  if (!distanceText) return '';
  
  // Convert English units to French/Arabic if needed
  if (language === 'fr' || language === 'ar') {
    return distanceText
      .replace('km', language === 'ar' ? 'كم' : 'km')
      .replace('m', language === 'ar' ? 'م' : 'm')
      .replace('mi', language === 'ar' ? 'ميل' : 'mi');
  }
  return distanceText;
};

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentStep,
  nextStep,
  language = 'en',
}) => {
  const isRTL = language === 'ar' || I18nManager.isRTL;
  
  if (!currentStep) {
    return null;
  }

  // Debug logging
  console.log('🧭 NavigationHeader Data:', {
    instruction: currentStep.instruction,
    maneuver: currentStep.maneuver,
    distance: currentStep.distance,
    distanceMeters: currentStep.distanceMeters,
    distanceToManeuver: currentStep.distanceToManeuver,
    location: currentStep.location,
  });

  const instruction = stripHtmlTags(currentStep.instruction || '');
  
  // Use distanceToManeuver if available (real-time), otherwise use step distance
  const distanceMeters = currentStep.distanceToManeuver ?? currentStep.distanceMeters ?? 0;
  const distance = distanceMeters < 1000 
    ? `${Math.round(distanceMeters)}m` 
    : `${(distanceMeters / 1000).toFixed(1)}km`;
  
  const iconName = getManeuverIcon(currentStep.maneuver || 'straight');
  
  // Get next step info
  const nextInstruction = nextStep ? stripHtmlTags(nextStep.instruction) : null;
  const nextIcon = nextStep ? getManeuverIcon(nextStep.maneuver) : null;

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Main Banner */}
      <View style={styles.banner}>
        {/* Left: Large Maneuver Icon */}
        <View style={[styles.iconContainer, isRTL && styles.iconContainerRTL]}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={48}
            color="#FFFFFF"
          />
        </View>

        {/* Middle: Instruction & Distance */}
        <View style={[styles.textContainer, isRTL && styles.textContainerRTL]}>
          <Text 
            style={[styles.instruction, isRTL && styles.textRTL]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {instruction}
          </Text>
          <Text style={[styles.distance, isRTL && styles.textRTL]}>
            {distance}
          </Text>
        </View>
      </View>

      {/* Next Step Preview (Optional) */}
      {nextStep && nextInstruction && (
        <View style={[styles.nextStepContainer, isRTL && styles.nextStepContainerRTL]}>
          <Text style={[styles.nextStepLabel, isRTL && styles.textRTL]}>
            {language === 'ar' ? 'ثم' : language === 'fr' ? 'Puis' : 'Then'}
          </Text>
          <MaterialCommunityIcons
            name={nextIcon as any}
            size={16}
            color="#FFFFFF"
            style={styles.nextStepIcon}
          />
          <Text 
            style={[styles.nextStepText, isRTL && styles.textRTL]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {nextInstruction}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  containerRTL: {
    // RTL adjustments if needed
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F5135', // Dark green like Google Maps
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '95%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainerRTL: {
    alignItems: 'flex-end',
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  distance: {
    color: '#A7F3D0', // Light green
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
  // Next Step Styles
  nextStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 81, 53, 0.9)', // Slightly transparent
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    width: '85%',
  },
  nextStepContainerRTL: {
    flexDirection: 'row-reverse',
  },
  nextStepLabel: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  nextStepIcon: {
    marginRight: 6,
  },
  nextStepText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
});

export default NavigationHeader;