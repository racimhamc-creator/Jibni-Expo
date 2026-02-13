import { create } from 'zustand';
import { Mission, MissionRequest } from '@/types/mission';

interface MissionState {
  activeMission: Mission | null;
  missionHistory: Mission[];
  setActiveMission: (mission: Mission | null) => void;
  addMissionToHistory: (mission: Mission) => void;
  requestMission: (data: MissionRequest) => Promise<void>;
  clearActiveMission: () => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  activeMission: null,
  missionHistory: [],

  setActiveMission: (mission: Mission | null) => {
    set({ activeMission: mission });
  },

  addMissionToHistory: (mission: Mission) => {
    set((state) => ({
      missionHistory: [mission, ...state.missionHistory],
    }));
  },

  requestMission: async (data: MissionRequest) => {
    // This will be handled by the API service
    // The store just manages state
  },

  clearActiveMission: () => {
    set({ activeMission: null });
  },
}));
