/**
 * useDriverSimulation Hook
 * 
 * React hook for managing driver simulation state and lifecycle.
 * 
 * IMPORTANT: This simulation feeds fake GPS updates into the EXISTING
 * production pipeline. Simulated locations go through:
 * - snapDriverToRoad()
 * - animatedDriverPositionRef
 * - Camera follow logic
 * 
 * This ensures the simulation behaves EXACTLY like real GPS updates.
 * 
 * Usage:
 * const { 
 *   isSimulating, 
 *   simulationProgress,
 *   simulationRoute,
 *   simulatedDriverLocation, // Feed this to your existing driver location pipeline
 *   startSimulation, 
 *   stopSimulation,
 * } = useDriverSimulation();
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DriverSimulation,
  SimulationConfig,
  LocationCoord,
  createSimulation,
  DEFAULT_SIMULATION_CONFIG,
} from '../services/driverSimulation';

export interface UseDriverSimulationReturn {
  // State
  isSimulating: boolean;
  isPaused: boolean;
  simulationProgress: number;
  simulationRoute: LocationCoord[] | null;
  simulationHeading: number;
  
  // Simulated driver location - feed this to existing pipeline
  // This mimics trackedDriverLocation from real GPS
  simulatedDriverLocation: LocationCoord | null;
  
  // Actions
  startSimulation: (config?: Partial<SimulationConfig>) => Promise<boolean>;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
}

/**
 * Hook for managing driver simulation
 * 
 * The simulated location is exposed as `simulatedDriverLocation` which should
 * be used IN PLACE OF real GPS location. Pass this to your existing:
 * - snapDriverToRoad() function
 * - Driver marker coordinate logic
 * - Camera follow effects
 */
export function useDriverSimulation(): UseDriverSimulationReturn {
  const simulationRef = useRef<DriverSimulation | null>(null);
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationRoute, setSimulationRoute] = useState<LocationCoord[] | null>(null);
  const [simulationHeading, setSimulationHeading] = useState(0);
  
  // This mimics trackedDriverLocation from real GPS
  // Feed this to your existing driver location pipeline
  const [simulatedDriverLocation, setSimulatedDriverLocation] = useState<LocationCoord | null>(null);

  /**
   * Start the simulation with optional custom config
   */
  const startSimulation = useCallback(async (
    config: Partial<SimulationConfig> = {}
  ): Promise<boolean> => {
    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create new simulation with merged config
    const fullConfig: SimulationConfig = {
      ...DEFAULT_SIMULATION_CONFIG,
      ...config,
    };

    simulationRef.current = createSimulation(fullConfig);

    // Initialize and fetch route
    const initialized = await simulationRef.current.initialize();
    
    if (!initialized) {
      console.error('❌ Simulation: Failed to initialize');
      return false;
    }

    // Get the route for display
    const route = simulationRef.current.getRoute();
    setSimulationRoute(route);

    // Start the simulation
    simulationRef.current.start(
      (position, progress) => {
        // This is called every simulation tick
        // This mimics a real GPS update - feed this to your existing pipeline
        setSimulatedDriverLocation(position);
        setSimulationProgress(progress);
        
        // Update heading from simulation state
        const state = simulationRef.current?.getState();
        if (state) {
          setSimulationHeading(state.heading);
        }
      },
      () => {
        // On complete
        console.log('✅ Simulation: Completed');
        setIsSimulating(false);
        setIsPaused(false);
      }
    );

    setIsSimulating(true);
    setIsPaused(false);
    
    console.log('🎮 Simulation: Started successfully');
    return true;
  }, []);

  /**
   * Stop the simulation
   */
  const stopSimulation = useCallback(() => {
    simulationRef.current?.stop();
    setIsSimulating(false);
    setIsPaused(false);
    setSimulationProgress(0);
    setSimulatedDriverLocation(null);
    setSimulationHeading(0);
    setSimulationRoute(null);
    console.log('🎮 Simulation: Stopped and reset');
  }, []);

  /**
   * Pause the simulation
   */
  const pauseSimulation = useCallback(() => {
    simulationRef.current?.pause();
    setIsPaused(true);
  }, []);

  /**
   * Resume the simulation
   */
  const resumeSimulation = useCallback(() => {
    simulationRef.current?.resume();
    setIsPaused(false);
  }, []);

  /**
   * Reset the simulation
   */
  const resetSimulation = useCallback(() => {
    simulationRef.current?.reset();
    setSimulationProgress(0);
    setIsPaused(false);
    
    // Get initial position
    const state = simulationRef.current?.getState();
    if (state?.currentPosition) {
      setSimulatedDriverLocation(state.currentPosition);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      simulationRef.current?.stop();
    };
  }, []);

  /**
   * SimulationMarkers component
   * Renders start and end markers for the simulation
   */
  const SimulationMarkers: React.FC = useCallback(() => {
    // This is a placeholder - actual implementation will be in SimulationControls
    // We return null here as the markers are rendered by the parent component
    return null;
  }, []);

  return {
    // State
    isSimulating,
    isPaused,
    simulationProgress,
    simulationRoute,
    simulationHeading,
    
    // Simulated driver location - feed this to existing pipeline
    simulatedDriverLocation,
    
    // Actions
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
  };
}

export default useDriverSimulation;
