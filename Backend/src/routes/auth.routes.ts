import { Router } from 'express';
import {
  sendOTPController,
  verifyOTPController,
  refreshTokenController,
  logoutController,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/send-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);
router.post('/refresh-token', refreshTokenController);
router.post('/logout', logoutController);

export default router;
