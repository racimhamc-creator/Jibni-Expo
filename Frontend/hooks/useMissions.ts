import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Mission, MissionRequest } from '@/types/mission';
import { useMissionStore } from '@/stores/missionStore';

export const useMissions = () => {
  const queryClient = useQueryClient();
  const { setActiveMission } = useMissionStore();

  const { data: activeMission } = useQuery<Mission | null>({
    queryKey: ['missions', 'active'],
    queryFn: () => api.getActiveMission(),
  });

  const { data: missionHistory } = useQuery<Mission[]>({
    queryKey: ['missions', 'history'],
    queryFn: () => api.getMissionHistory(),
  });

  const requestMissionMutation = useMutation({
    mutationFn: (data: MissionRequest) => api.requestMission(data),
    onSuccess: (mission) => {
      setActiveMission(mission);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const acceptMissionMutation = useMutation({
    mutationFn: (missionId: string) => api.acceptMission(missionId),
    onSuccess: (mission) => {
      setActiveMission(mission);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const rejectMissionMutation = useMutation({
    mutationFn: (missionId: string) => api.rejectMission(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const completeMissionMutation = useMutation({
    mutationFn: (missionId: string) => api.completeMission(missionId),
    onSuccess: () => {
      setActiveMission(null);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  const cancelMissionMutation = useMutation({
    mutationFn: (missionId: string) => api.cancelMission(missionId),
    onSuccess: () => {
      setActiveMission(null);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });

  return {
    activeMission,
    missionHistory,
    requestMission: requestMissionMutation.mutate,
    acceptMission: acceptMissionMutation.mutate,
    rejectMission: rejectMissionMutation.mutate,
    completeMission: completeMissionMutation.mutate,
    cancelMission: cancelMissionMutation.mutate,
    isLoading: requestMissionMutation.isPending ||
      acceptMissionMutation.isPending ||
      completeMissionMutation.isPending ||
      cancelMissionMutation.isPending,
  };
};
