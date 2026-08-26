import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration with secure unique file naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  }
});

// File validation filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type (${file.mimetype}). Allowed: JPG, PNG, WEBP, MP4, WEBM, MOV.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max for videos & high-res photos
  }
});

// 1. Single File Upload (Authenticated Landlord or Admin)
router.post(
  '/',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const fileUrl = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        size: req.file.size
      }
    });
  }
);

// 2. Multiple Files Upload (Authenticated Landlord or Admin)
router.post(
  '/multiple',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  upload.array('files', 15),
  (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = files.map(file => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        mediaType: isVideo ? ('VIDEO' as const) : ('IMAGE' as const),
        size: file.size
      };
    });

    return res.status(201).json({
      message: `${uploaded.length} file(s) uploaded successfully`,
      files: uploaded
    });
  }
);

export default router;
