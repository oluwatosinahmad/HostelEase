import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const VERIF_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'verification_documents');
if (!fs.existsSync(VERIF_UPLOADS_DIR)) {
  fs.mkdirSync(VERIF_UPLOADS_DIR, { recursive: true });
}

// Storage configuration with secure unique file naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VERIF_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `verif_${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid document format (${file.mimetype}). Allowed: PDF, JPG, PNG, WEBP.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max per verification document
});

// 1. Upload Private Verification Document (Provider only)
router.post(
  '/documents',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  upload.single('document'),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No verification document provided' });
    }

    const { documentType, propertyId } = req.body;
    if (!documentType) {
      return res.status(400).json({ error: 'documentType is required (e.g. NIN_CARD, PROOF_OF_OWNERSHIP, CAC_CERTIFICATE)' });
    }

    const docId = `doc-${Date.now()}-${crypto.randomUUID().substring(0, 6)}`;
    const fileUrl = `/uploads/verification_documents/${req.file.filename}`;

    db.prepare(`
      INSERT INTO verification_documents (
        id, provider_id, property_id, document_type, file_url, filename, file_size, mime_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      docId,
      req.user!.id,
      propertyId || null,
      documentType,
      fileUrl,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    );

    // Update provider profile status to UNDER_REVIEW
    db.prepare(`
      UPDATE provider_profiles
      SET verification_status = CASE WHEN verification_status = 'PENDING' THEN 'UNDER_REVIEW' ELSE verification_status END,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(req.user!.id);

    // Log to Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, 'UPLOAD_VERIFICATION_DOCUMENT', 'DOCUMENT', ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user!.id,
      req.user!.role,
      docId,
      JSON.stringify({ documentType, filename: req.file.originalname })
    );

    res.status(201).json({
      message: 'Verification document uploaded securely for review',
      document: {
        id: docId,
        documentType,
        filename: req.file.originalname,
        fileUrl,
        status: 'PENDING'
      }
    });
  }
);

// 2. Get Own Verification Documents (Provider)
router.get(
  '/documents',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const docs = db.prepare(`
      SELECT * FROM verification_documents
      WHERE provider_id = ?
      ORDER BY created_at DESC
    `).all(req.user!.id) as any[];

    res.json({
      documents: docs.map(d => ({
        id: d.id,
        documentType: d.document_type,
        fileUrl: d.file_url,
        filename: d.filename,
        fileSize: d.file_size,
        mimeType: d.mime_type,
        status: d.status,
        adminFeedback: d.admin_feedback,
        createdAt: d.created_at
      }))
    });
  }
);

// 3. Admin Secure View of Provider Documents (Admin only - NEVER accessible to students)
router.get(
  '/documents/admin/:providerId',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { providerId } = req.params;
    const docs = db.prepare(`
      SELECT * FROM verification_documents
      WHERE provider_id = ?
      ORDER BY created_at DESC
    `).all(providerId) as any[];

    res.json({
      documents: docs.map(d => ({
        id: d.id,
        providerId: d.provider_id,
        documentType: d.document_type,
        fileUrl: d.file_url,
        filename: d.filename,
        fileSize: d.file_size,
        mimeType: d.mime_type,
        status: d.status,
        adminFeedback: d.admin_feedback,
        createdAt: d.created_at
      }))
    });
  }
);

// 4. Delete Own Verification Document
router.delete(
  '/documents/:id',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const doc = db.prepare('SELECT * FROM verification_documents WHERE id = ?').get(id) as any;

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Ownership check (unless Admin)
    if (req.user!.role !== 'ADMIN' && doc.provider_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this document' });
    }

    db.prepare('DELETE FROM verification_documents WHERE id = ?').run(id);

    res.json({ message: 'Document deleted successfully' });
  }
);

export default router;
