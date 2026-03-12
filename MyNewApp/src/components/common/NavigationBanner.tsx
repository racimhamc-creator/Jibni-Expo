import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NavigationBannerProps {
  instruction: string;
  distance: string;
  isVisible: boolean;
  maneuver?: string;
}

// Map maneuver to icon
const getManeuverIcon = (m?: string): string => {
  if (!m) return "⬆️";
  if (m.includes("left")) return "⬅️";
  if (m.includes("right")) return "➡️";
  if (m.includes("straight") || m.includes("continue")) return "⬆️";
  if (m.includes("roundabout")) return "🔄";
  if (m.includes("merge")) return "↗️";
  if (m.includes("uturn")) return "↩️";
  if (m.includes("arrive")) return "🏁";
  return "⬆️";
};

export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  instruction,
  distance,
  isVisible,
  maneuver,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.navigationBanner}>
      <View style={styles.navigationBannerContent}>
        <Text style={styles.navigationIcon}>{getManeuverIcon(maneuver)}</Text>
        <View style={styles.navigationTextContainer}>
          <Text style={styles.navigationInstruction}>{instruction}</Text>
          <Text style={styles.navigationDistance}>{distance}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationBanner: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: "#185ADC",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navigationIcon: {
    fontSize: 32,
  },
  navigationTextContainer: {
    flex: 1,
    flexDirection: "column",
  },
  navigationInstruction: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  navigationDistance: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FEC846",
    marginTop: 4,
  },
});

export default NavigationBanner;
