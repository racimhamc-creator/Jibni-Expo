import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { Mission } from '@/types/mission';
import { useMissionStore } from '@/stores/missionStore';

export const useSocket = () => {
  const { token, user } = useAuthStore();
  const { setActiveMission, addMissionToHistory } = useMissionStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!token || !user || initialized.current) return;

    initialized.current = true;

    // Connect to missions namespace
    const missionSocket = socketService.connectMissions(token);

    // Set up mission event handlers
    socketService.onNewMission((mission: Mission) => {
      setActiveMission(mission);
    });

    socketService.onMissionAccepted((mission: Mission) => {
      setActiveMission(mission);
    });

    socketService.onMissionRejected(({ missionId }) => {
      // Handle rejection
      console.log('Mission rejected:', missionId);
    });

    socketService.onMissionCompleted((mission: Mission) => {
      addMissionToHistory(mission);
      setActiveMission(null);
    });

    // Connect to server namespace if driver
    if (user.role === 'driver') {
      socketService.connectServer(token);
    }

    return () => {
      socketService.disconnect();
      initialized.current = false;
    };
  }, [token, user]);
};
