import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { Profile } from '../models/Profile.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload driver documents
router.post(
  '/driver-documents',
  authenticate,
  upload.fields([
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'vehicleCard', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { licenceNumber, vehicleCardNumber } = req.body;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const updateData: any = {};

      if (files.drivingLicense?.[0]) {
        updateData.drivingLicense = {
          url: `${baseUrl}/uploads/${files.drivingLicense[0].filename}`,
          number: licenceNumber || '',
        };
      }

      if (files.vehicleCard?.[0]) {
        updateData.vehicleCard = {
          url: `${baseUrl}/uploads/${files.vehicleCard[0].filename}`,
          number: vehicleCardNumber || '',
        };
      }

      // Update profile
      await Profile.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true }
      );

      res.json({
        status: 'success',
        message: 'Documents uploaded successfully',
        data: updateData,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload documents',
      });
    }
  }
);

// Upload single image (avatar, etc.)
router.post(
  '/image',
  authenticate,
  upload.single('image'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
        return;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      res.json({
        status: 'success',
        message: 'Image uploaded successfully',
        data: { url: imageUrl },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload image',
      });
    }
  }
);

export default router;
