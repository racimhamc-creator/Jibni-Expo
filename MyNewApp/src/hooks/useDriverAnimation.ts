import { useState, useEffect, useRef } from 'react';
import { LocationCoord } from '../services/directions';
import { calculateDistance, findClosestPointOnRoute, calculateHeading, getTotalRouteDistance, getPositionAtProgress } from '../utils/routeUtils';

interface DriverAnimationOptions {
  routeCoordinates: LocationCoord[];
  driverLocation: { latitude: number; longitude: number };
  speed?: number; // meters per second
  updateInterval?: number; // milliseconds
}

interface AnimatedPosition {
  latitude: number;
  longitude: number;
  heading: number;
  progress: number; // 0-1 along the route
}

export function useDriverAnimation({
  routeCoordinates,
  driverLocation,
  speed = 10, // Default 10 m/s (~36 km/h)
  updateInterval = 1000, // Default 1 second
}: DriverAnimationOptions) {
  const [animatedPosition, setAnimatedPosition] = useState<AnimatedPosition | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  // Calculate initial position and progress when driver location or route changes
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length < 2 || !driverLocation) {
      setAnimatedPosition(null);
      setIsAnimating(false);
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Find closest point on route to current driver location
    const closestPoint = findClosestPointOnRoute(driverLocation, routeCoordinates);
    if (!closestPoint) {
      setAnimatedPosition(null);
      return;
    }

    // Calculate initial heading based on route direction
    let heading = 0;
    if (closestPoint.index < routeCoordinates.length - 1) {
      const next = routeCoordinates[closestPoint.index + 1];
      heading = calculateHeading(closestPoint.point, next);
    }

    setAnimatedPosition({
      latitude: closestPoint.point.latitude,
      longitude: closestPoint.point.longitude,
      heading,
      progress: closestPoint.index / (routeCoordinates.length - 1),
    });

    progressRef.current = closestPoint.index / (routeCoordinates.length - 1);
    setIsAnimating(true);

    // Start animation loop
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    animationRef.current = setInterval(() => {
      progressRef.current += (speed * updateInterval) / 1000 / getTotalRouteDistance(routeCoordinates);
      
      if (progressRef.current >= 1) {
        progressRef.current = 1;
        setIsAnimating(false);
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      }

      const position = getPositionAtProgress(routeCoordinates, progressRef.current);
      if (position) {
        // Calculate heading for current segment
        let heading = 0;
        const currentIndex = Math.floor(progressRef.current * (routeCoordinates.length - 1));
        if (currentIndex < routeCoordinates.length - 1) {
          heading = calculateHeading(routeCoordinates[currentIndex], routeCoordinates[currentIndex + 1]);
        }
        
        setAnimatedPosition({
          ...position,
          heading,
          progress: progressRef.current,
        });
      }
    }, updateInterval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [routeCoordinates, driverLocation, speed, updateInterval]);

  return {
    animatedPosition,
    isAnimating,
  };
}

// Helper functions are now in routeUtils.ts
