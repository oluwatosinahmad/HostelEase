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

// 3. Chunked / Resumable Video Upload Endpoint
const CHUNKS_DIR = path.resolve(UPLOADS_DIR, 'temp_chunks');
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

router.post(
  '/chunk',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  upload.single('chunk'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uploadId, chunkIndex, totalChunks, fileName, fileType, thumbnailDataUrl } = req.body;

      if (!uploadId || chunkIndex === undefined || totalChunks === undefined) {
        return res.status(400).json({ error: 'Missing chunk metadata (uploadId, chunkIndex, totalChunks)' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No chunk file provided' });
      }

      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
      const cIndex = parseInt(chunkIndex, 10);
      const tChunks = parseInt(totalChunks, 10);

      const sessionDir = path.join(CHUNKS_DIR, safeUploadId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Move uploaded chunk to sessionDir/chunk_<cIndex>
      const chunkDest = path.join(sessionDir, `chunk_${cIndex}`);
      fs.copyFileSync(req.file.path, chunkDest);
      try {
        fs.unlinkSync(req.file.path);
      } catch {}

      // Check how many chunks exist
      const existingChunks = fs.readdirSync(sessionDir).filter(f => f.startsWith('chunk_'));

      if (existingChunks.length >= tChunks) {
        // All chunks received, assemble file
        const ext = path.extname(fileName || 'video.mp4').toLowerCase() || '.mp4';
        const finalFilename = `${crypto.randomUUID()}${ext}`;
        const finalFilePath = path.join(UPLOADS_DIR, finalFilename);

        const writeStream = fs.createWriteStream(finalFilePath);
        for (let i = 0; i < tChunks; i++) {
          const partPath = path.join(sessionDir, `chunk_${i}`);
          if (fs.existsSync(partPath)) {
            const data = fs.readFileSync(partPath);
            writeStream.write(data);
          }
        }
        writeStream.end();

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        const stats = fs.statSync(finalFilePath);

        // Handle thumbnail if provided
        let thumbnailUrl: string | null = null;
        if (thumbnailDataUrl && typeof thumbnailDataUrl === 'string' && thumbnailDataUrl.includes('base64,')) {
          try {
            const base64Data = thumbnailDataUrl.split('base64,')[1];
            const thumbFilename = `thumb_${finalFilename.replace(/\.[^/.]+$/, "")}.jpg`;
            const thumbFilePath = path.join(UPLOADS_DIR, thumbFilename);
            fs.writeFileSync(thumbFilePath, Buffer.from(base64Data, 'base64'));
            thumbnailUrl = `/uploads/${thumbFilename}`;
          } catch (e) {
            console.warn('Failed to save thumbnail data:', e);
          }
        }

        // Clean up temporary session directory
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('Failed to remove temp chunk session directory:', e);
        }

        return res.status(201).json({
          completed: true,
          file: {
            url: `/uploads/${finalFilename}`,
            filename: finalFilename,
            originalName: fileName || finalFilename,
            mimeType: fileType || 'video/mp4',
            mediaType: 'VIDEO',
            size: stats.size,
            thumbnailUrl
          }
        });
      }

      // Incomplete upload, return progress
      return res.status(200).json({
        completed: false,
        chunkIndex: cIndex,
        receivedChunks: existingChunks.length,
        totalChunks: tChunks
      });
    } catch (err: any) {
      console.error('Error handling chunk upload:', err);
      return res.status(500).json({ error: err.message || 'Chunk upload failed' });
    }
  }
);

export default router;
