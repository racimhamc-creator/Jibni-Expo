import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  requestMission,
  acceptMission,
  rejectMission,
  completeMission,
  cancelMission,
  getActiveMission,
  getMissionHistory,
} from '../controllers/mission.controller.js';

const router = Router();

router.use(authenticate);

router.post('/request', requestMission);
router.post('/:id/accept', acceptMission);
router.post('/:id/reject', rejectMission);
router.post('/:id/complete', completeMission);
router.post('/:id/cancel', cancelMission);
router.get('/active', getActiveMission);
router.get('/history', getMissionHistory);

export default router;
