import { useState, useEffect, useCallback } from 'react';
import { RouteStep } from '../services/directions';

interface LocationCoord {
  latitude: number;
  longitude: number;
}

interface UseNavigationStepProps {
  driverLocation: LocationCoord | null;
  routeSteps: RouteStep[];
  isNavigating: boolean;
}

interface UseNavigationStepReturn {
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  stepIndex: number;
}

// Calculate distance between two coordinates in meters
const getDistanceFromLatLonInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useNavigationStep = ({
  driverLocation,
  routeSteps,
  isNavigating,
}: UseNavigationStepProps): UseNavigationStepReturn => {
  const [currentStep, setCurrentStep] = useState<RouteStep | null>(null);
  const [nextStep, setNextStep] = useState<RouteStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const findCurrentStep = useCallback(() => {
    if (!driverLocation || !routeSteps || routeSteps.length === 0 || !isNavigating) {
      return;
    }

    const { latitude, longitude } = driverLocation;
    let closestIndex = stepIndex;
    let minDistance = Infinity;

    // Search from current step onwards (don't go backwards)
    for (let i = stepIndex; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      if (!step.location) continue;

      const distance = getDistanceFromLatLonInMeters(
        latitude,
        longitude,
        step.location.lat,
        step.location.lng
      );

      // If we're within 50m of this step, we've reached it
      if (distance < 50 && i > stepIndex) {
        closestIndex = i;
        minDistance = distance;
        console.log('🧭 Navigation: Reached step', i, '-', step.instruction);
        break;
      }

      // Find the closest step ahead
      if (distance < minDistance && i >= stepIndex) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Update state if step changed
    if (closestIndex !== stepIndex || !currentStep) {
      setStepIndex(closestIndex);
      setCurrentStep(routeSteps[closestIndex]);
      
      // Set next step if available
      if (closestIndex < routeSteps.length - 1) {
        setNextStep(routeSteps[closestIndex + 1]);
      } else {
        setNextStep(null);
      }

      console.log('🧭 Navigation: Active step updated', {
        index: closestIndex,
        instruction: routeSteps[closestIndex]?.instruction,
        distance: routeSteps[closestIndex]?.distance,
      });
    }
  }, [driverLocation, routeSteps, isNavigating, stepIndex, currentStep]);

  // Monitor driver location and update current step
  useEffect(() => {
    if (!isNavigating || !driverLocation) {
      return;
    }

    findCurrentStep();
  }, [driverLocation?.latitude, driverLocation?.longitude, isNavigating, findCurrentStep]);

  // Reset when navigation stops
  useEffect(() => {
    if (!isNavigating) {
      setCurrentStep(null);
      setNextStep(null);
      setStepIndex(0);
    }
  }, [isNavigating]);

  // Initialize current step when route steps are first loaded
  useEffect(() => {
    if (routeSteps && routeSteps.length > 0 && isNavigating && !currentStep) {
      setCurrentStep(routeSteps[0]);
      if (routeSteps.length > 1) {
        setNextStep(routeSteps[1]);
      }
      setStepIndex(0);
    }
  }, [routeSteps, isNavigating, currentStep]);

  return { currentStep, nextStep, stepIndex };
};

export default useNavigationStep;
