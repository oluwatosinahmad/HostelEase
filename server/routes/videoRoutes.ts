import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * Validates whether video dimensions meet the 4K UHD standard.
 * 4K UHD: 3840 x 2160
 * DCI 4K: 4096 x 2160
 * Vertical 4K (Mobile Portrait): 2160 x 3840 or 2160 x 4096
 * Ultrawide 4K: 3840 x 1600+
 */
export function is4KResolution(width?: number, height?: number): boolean {
  if (!width || !height || typeof width !== 'number' || typeof height !== 'number') {
    return false;
  }
  const w = Math.round(width);
  const h = Math.round(height);

  // Standard landscape 4K UHD (3840x2160) or DCI 4K (4096x2160)
  if (w >= 3840 && h >= 2160) return true;
  // Vertical 4K for mobile walkthroughs (2160x3840)
  if (w >= 2160 && h >= 3840) return true;
  // Ultrawide 4K (3840x1600 or 5120x2160)
  if (w >= 3840 && h >= 1600) return true;
  // Square/high-density 4K
  if (w >= 2160 && h >= 2160) return true;

  return false;
}

// =============================================================================
// 1. AGENT: 4K VIDEO UPLOAD & REGISTRATION
// POST /api/provider/videos or POST /api/videos/upload
// =============================================================================
const handleVideoUpload = (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      propertyId,
      videoUrl,
      thumbnailUrl,
      width,
      height,
      fileSize,
      duration,
      caption
    } = req.body;

    if (!propertyId || !videoUrl) {
      return res.status(400).json({ error: 'Property ID and video URL are required' });
    }

    // 1. Verify property exists
    const property = db.prepare('SELECT id, title, provider_id FROM properties WHERE id = ?').get(propertyId) as any;
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // 2. Verify agent authorization (JWT agent must own property unless ADMIN)
    const isOwner = property.provider_id === agentId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You are not authorized to upload videos for this property'
      });
    }

    // 3. Strict 4K Dimension Validation
    const parsedWidth = parseInt(width, 10);
    const parsedHeight = parseInt(height, 10);
    const parsedSize = parseInt(fileSize, 10) || 0;
    const parsedDuration = parseFloat(duration) || 0;

    if (!is4KResolution(parsedWidth, parsedHeight)) {
      return res.status(400).json({
        error: `Video resolution ${parsedWidth || 0}x${parsedHeight || 0} is below the required 4K UHD standard (minimum 3840x2160 or 2160x3840 for vertical tour). Please provide an authentic 4K recording.`
      });
    }

    const resolution = `${parsedWidth}x${parsedHeight} (4K UHD)`;
    const videoId = `vid-4k-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 4. Insert into four_k_videos table with status PENDING
    db.prepare(`
      INSERT INTO four_k_videos (
        id, agent_id, property_id, video_url, thumbnail_url,
        width, height, resolution, file_size, duration,
        status, uploaded_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'), datetime('now'))
    `).run(
      videoId,
      agentId,
      propertyId,
      videoUrl,
      thumbnailUrl || null,
      parsedWidth,
      parsedHeight,
      resolution,
      parsedSize,
      parsedDuration
    );

    // 5. Update property status
    try {
      db.prepare(`
        UPDATE properties
        SET video_tour_url = ?, video_verification_status = 'PENDING_AUDIT'
        WHERE id = ?
      `).run(videoUrl, propertyId);
    } catch (e) {
      console.warn('Failed to update property status:', e);
    }

    // Also mirror to property_media with is_verified = 0
    try {
      const existingMedia = db.prepare(`
        SELECT id FROM property_media 
        WHERE property_id = ? AND (media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH')
      `).get(propertyId) as any;

      if (existingMedia) {
        db.prepare(`
          UPDATE property_media
          SET url = ?, thumbnail_url = COALESCE(?, thumbnail_url), is_verified = 0, caption = ?
          WHERE id = ?
        `).run(videoUrl, thumbnailUrl || null, caption || `${property.title} 4K Walkthrough Tour`, existingMedia.id);
      } else {
        const mediaId = `media-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        db.prepare(`
          INSERT INTO property_media (id, property_id, media_type, category, url, thumbnail_url, caption, is_cover, is_verified)
          VALUES (?, ?, 'VIDEO', 'VIDEO_WALKTHROUGH', ?, ?, ?, 0, 0)
        `).run(mediaId, propertyId, videoUrl, thumbnailUrl || null, caption || `${property.title} 4K Walkthrough Tour`);
      }
    } catch (e) {
      console.warn('Failed to mirror to property_media:', e);
    }

    const insertedVideo = db.prepare(`
      SELECT v.*, p.title as propertyTitle, p.address as propertyAddress
      FROM four_k_videos v
      JOIN properties p ON v.property_id = p.id
      WHERE v.id = ?
    `).get(videoId);

    return res.status(201).json({
      success: true,
      message: '4K video tour uploaded successfully and queued for admin verification',
      video: insertedVideo
    });
  } catch (err: any) {
    console.error('Error uploading 4K video:', err);
    return res.status(500).json({ error: err.message || 'Failed to register 4K video' });
  }
};

router.post('/', authenticate, requireRole('PROVIDER', 'ADMIN'), handleVideoUpload);
router.post('/upload', authenticate, requireRole('PROVIDER', 'ADMIN'), handleVideoUpload);
router.post('/upload-4k', authenticate, requireRole('PROVIDER', 'ADMIN'), handleVideoUpload);

// =============================================================================
// 2. AGENT: GET MY 4K VIDEOS
// GET /api/provider/videos
// =============================================================================
router.get('/', authenticate, requireRole('PROVIDER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const videos = db.prepare(`
      SELECT v.id, v.agent_id as agentId, v.property_id as propertyId,
             v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl,
             v.width, v.height, v.resolution, v.file_size as fileSize, v.duration,
             v.status, v.uploaded_at as uploadedAt, v.verified_at as verifiedAt,
             v.verified_by as verifiedBy, v.rejection_reason as rejectionReason,
             v.created_at as createdAt,
             p.title as propertyTitle, p.address as propertyAddress, p.cover_image as propertyCover
      FROM four_k_videos v
      JOIN properties p ON v.property_id = p.id
      WHERE v.agent_id = ?
      ORDER BY v.created_at DESC
    `).all(agentId);

    const counts = {
      total: videos.length,
      pending: videos.filter((v: any) => v.status === 'PENDING').length,
      verified: videos.filter((v: any) => v.status === 'VERIFIED').length,
      rejected: videos.filter((v: any) => v.status === 'REJECTED').length
    };

    return res.json({ videos, counts, stats: counts });
  } catch (err: any) {
    console.error('Error fetching agent 4K videos:', err);
    return res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// =============================================================================
// 3. ADMIN: GET 4K VIDEOS QUEUE WITH FILTERING & STATS
// GET /api/admin/videos or GET /api/videos/admin
// =============================================================================
export const handleAdminGetVideos = (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusFilter = (req.query.status as string || 'ALL').toUpperCase();

    const allVideos = db.prepare(`
      SELECT v.id, v.agent_id as agentId, v.property_id as propertyId,
             v.video_url as videoUrl, v.video_url as url, v.thumbnail_url as thumbnailUrl,
             v.width, v.height, v.resolution, v.file_size as fileSize, v.duration,
             v.status, v.uploaded_at as uploadedAt, v.verified_at as verifiedAt,
             v.verified_by as verifiedBy, v.rejection_reason as rejectionReason,
             v.rejection_reason as verificationNotes,
             v.created_at as createdAt,
             CASE WHEN v.status = 'VERIFIED' THEN 1 ELSE 0 END as isVerified,
             p.title as propertyTitle, p.address as propertyAddress, p.cover_image as propertyCover,
             COALESCE(u.full_name, 'Verified Agent') as providerName,
             COALESCE(u.email, 'agent@hostelease.ng') as providerEmail,
             COALESCE(u.phone, '08012345678') as providerPhone
      FROM four_k_videos v
      JOIN properties p ON v.property_id = p.id
      LEFT JOIN users u ON v.agent_id = u.id
      ORDER BY v.created_at DESC
    `).all() as any[];

    // Include legacy property_media videos if not already represented
    const existingPropIds = new Set(allVideos.map(v => v.propertyId));
    const legacyVideos = db.prepare(`
      SELECT pm.id, pm.property_id as propertyId, pm.url, pm.url as videoUrl, pm.thumbnail_url as thumbnailUrl,
             pm.caption, pm.is_verified as isVerified, pm.verification_notes as verificationNotes,
             pm.created_at as createdAt,
             CASE WHEN pm.is_verified = 1 THEN 'VERIFIED' 
                  WHEN pm.verification_notes IS NOT NULL THEN 'REJECTED' 
                  ELSE 'PENDING' END as status,
             '3840x2160 (4K UHD)' as resolution,
             3840 as width, 2160 as height,
             15000000 as fileSize,
             60 as duration,
             p.title as propertyTitle, p.address as propertyAddress,
             COALESCE(u.full_name, 'Verified Agent') as providerName,
             COALESCE(u.email, 'agent@hostelease.ng') as providerEmail,
             COALESCE(u.phone, '08012345678') as providerPhone
      FROM property_media pm
      JOIN properties p ON pm.property_id = p.id
      LEFT JOIN users u ON p.provider_id = u.id
      WHERE (pm.media_type = 'VIDEO' OR pm.category = 'VIDEO_WALKTHROUGH' OR LOWER(pm.url) LIKE '%.mp4%' OR LOWER(pm.url) LIKE '%.webm%')
      ORDER BY pm.created_at DESC
    `).all() as any[];

    for (const leg of legacyVideos) {
      if (!existingPropIds.has(leg.propertyId)) {
        allVideos.push(leg);
        existingPropIds.add(leg.propertyId);
      }
    }

    const counts = {
      total: allVideos.length,
      pending: allVideos.filter(v => v.status === 'PENDING').length,
      verified: allVideos.filter(v => v.status === 'VERIFIED').length,
      rejected: allVideos.filter(v => v.status === 'REJECTED').length
    };

    let filtered = allVideos;
    if (statusFilter !== 'ALL' && ['PENDING', 'VERIFIED', 'REJECTED'].includes(statusFilter)) {
      filtered = allVideos.filter(v => v.status === statusFilter);
    }

    return res.json({ videos: filtered, counts });
  } catch (err: any) {
    console.error('Error fetching admin 4K video queue:', err);
    return res.status(500).json({ error: 'Failed to fetch 4K video queue' });
  }
};

// =============================================================================
// 4. ADMIN: VERIFY 4K VIDEO
// POST /api/admin/videos/:id/verify
// =============================================================================
export const handleAdminVerifyVideo = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminUser = req.user?.id ? (db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id) as any) : null;
  const verifiedBy = adminUser ? adminUser.id : null;

  try {
    const video = db.prepare(`
      SELECT v.*, p.title as property_title, p.provider_id
      FROM four_k_videos v
      JOIN properties p ON v.property_id = p.id
      WHERE v.id = ?
    `).get(id) as any;

    if (!video) {
      // Check property_media fallback
      const media = db.prepare(`
        SELECT pm.*, p.title as property_title, p.provider_id
        FROM property_media pm
        JOIN properties p ON pm.property_id = p.id
        WHERE pm.id = ?
      `).get(id) as any;

      if (!media) {
        return res.status(404).json({ error: 'Video tour not found' });
      }

      // Update property_media
      db.prepare(`UPDATE property_media SET is_verified = 1, verification_notes = NULL WHERE id = ?`).run(id);
      db.prepare(`UPDATE properties SET has_4k_video = 1, video_tour_url = ?, video_verification_status = 'APPROVED' WHERE id = ?`).run(media.url, media.property_id);

      return res.json({ success: true, message: 'Video verified successfully', status: 'VERIFIED', isVerified: 1 });
    }

    // Update four_k_videos
    db.prepare(`
      UPDATE four_k_videos
      SET status = 'VERIFIED',
          verified_at = datetime('now'),
          verified_by = ?,
          rejection_reason = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(verifiedBy, id);

    // Update properties table
    db.prepare(`
      UPDATE properties
      SET has_4k_video = 1,
          video_tour_url = ?,
          video_verification_status = 'APPROVED',
          video_verification_notes = NULL
      WHERE id = ?
    `).run(video.video_url, video.property_id);

    // Mirror to property_media
    try {
      const existingMedia = db.prepare(`
        SELECT id FROM property_media 
        WHERE property_id = ? AND (media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH')
      `).get(video.property_id) as any;

      if (existingMedia) {
        db.prepare(`
          UPDATE property_media
          SET url = ?, thumbnail_url = COALESCE(?, thumbnail_url), is_verified = 1, verification_notes = NULL
          WHERE id = ?
        `).run(video.video_url, video.thumbnail_url, existingMedia.id);
      } else {
        const mediaId = `media-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        db.prepare(`
          INSERT INTO property_media (id, property_id, media_type, category, url, thumbnail_url, caption, is_cover, is_verified)
          VALUES (?, ?, 'VIDEO', 'VIDEO_WALKTHROUGH', ?, ?, 'Verified 4K Tour', 0, 1)
        `).run(mediaId, video.property_id, video.video_url, video.thumbnail_url);
      }
    } catch (e) {
      console.warn('Failed to mirror verified video to property_media:', e);
    }

    // Send in-app notification to the agent
    const notifId = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const notifTitle = '🎉 4K Video Tour Verified!';
    const notifMessage = `Your 4K video tour for "${video.property_title}" has been approved by admin and is now live with the 4K Verified Tour badge for all students.`;

    try {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
        VALUES (?, ?, ?, ?, 'VIDEO_VERIFICATION', 0, ?)
      `).run(notifId, video.agent_id, notifTitle, notifMessage, '/provider?tab=videos');
    } catch {}

    return res.json({
      success: true,
      message: '4K video tour verified successfully',
      status: 'VERIFIED',
      isVerified: 1
    });
  } catch (err: any) {
    console.error('Error verifying 4K video:', err);
    return res.status(500).json({ error: 'Failed to verify video' });
  }
};

// =============================================================================
// 5. ADMIN: REJECT 4K VIDEO
// POST /api/admin/videos/:id/reject
// =============================================================================
export const handleAdminRejectVideo = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const rejectionReason = (req.body.rejectionReason || req.body.reason || req.body.notes || '').trim();

  if (!rejectionReason) {
    return res.status(400).json({ error: 'Rejection reason is required to give feedback to the agent.' });
  }

  try {
    const video = db.prepare(`
      SELECT v.*, p.title as property_title, p.provider_id
      FROM four_k_videos v
      JOIN properties p ON v.property_id = p.id
      WHERE v.id = ?
    `).get(id) as any;

    if (!video) {
      // Check property_media fallback
      const media = db.prepare(`
        SELECT pm.*, p.title as property_title, p.provider_id
        FROM property_media pm
        JOIN properties p ON pm.property_id = p.id
        WHERE pm.id = ?
      `).get(id) as any;

      if (!media) {
        return res.status(404).json({ error: 'Video tour not found' });
      }

      db.prepare(`UPDATE property_media SET is_verified = 0, verification_notes = ? WHERE id = ?`).run(rejectionReason, id);
      db.prepare(`UPDATE properties SET video_verification_status = 'REJECTED', video_verification_notes = ? WHERE id = ?`).run(rejectionReason, media.property_id);

      return res.json({ success: true, message: 'Video rejected with feedback', status: 'REJECTED', isVerified: 0, rejectionReason });
    }

    // Update four_k_videos
    db.prepare(`
      UPDATE four_k_videos
      SET status = 'REJECTED',
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(rejectionReason, id);

    // Update properties table
    db.prepare(`
      UPDATE properties
      SET video_verification_status = 'REJECTED',
          video_verification_notes = ?
      WHERE id = ?
    `).run(rejectionReason, video.property_id);

    // Mirror to property_media
    try {
      db.prepare(`
        UPDATE property_media
        SET is_verified = 0, verification_notes = ?
        WHERE property_id = ? AND (media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH')
      `).run(rejectionReason, video.property_id);
    } catch {}

    // Send in-app notification to the agent
    const notifId = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const notifTitle = '⚠️ 4K Video Tour Rejected';
    const notifMessage = `Your video tour for "${video.property_title}" was rejected. Feedback: ${rejectionReason}`;

    try {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
        VALUES (?, ?, ?, ?, 'VIDEO_VERIFICATION', 0, ?)
      `).run(notifId, video.agent_id, notifTitle, notifMessage, '/provider?tab=videos');
    } catch {}

    return res.json({
      success: true,
      message: '4K video tour rejected with feedback',
      status: 'REJECTED',
      isVerified: 0,
      rejectionReason
    });
  } catch (err: any) {
    console.error('Error rejecting 4K video:', err);
    return res.status(500).json({ error: 'Failed to reject video' });
  }
};

// =============================================================================
// 6. AGENT: DELETE 4K VIDEO
// DELETE /api/provider/videos/:id or DELETE /api/videos/:id
// =============================================================================
export const handleDeleteVideo = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  const userRole = req.user?.role;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const video = db.prepare('SELECT * FROM four_k_videos WHERE id = ?').get(id) as any;

    if (!video) {
      // Fallback check property_media
      const media = db.prepare('SELECT * FROM property_media WHERE id = ?').get(id) as any;
      if (!media) {
        return res.status(404).json({ error: 'Video record not found' });
      }

      // Check ownership on fallback
      const prop = db.prepare('SELECT provider_id FROM properties WHERE id = ?').get(media.property_id) as any;
      if (userRole !== 'ADMIN' && prop?.provider_id !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized: You can only delete videos belonging to your own hostels' });
      }

      db.prepare('DELETE FROM property_media WHERE id = ?').run(id);
      return res.json({ success: true, message: 'Video removed successfully' });
    }

    // Strict ownership verification: Agent can ONLY delete their own video!
    if (userRole !== 'ADMIN' && video.agent_id !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete 4K videos belonging to your account' });
    }

    db.transaction(() => {
      // Delete from four_k_videos
      db.prepare('DELETE FROM four_k_videos WHERE id = ?').run(id);

      // Clean up property_media if matching url
      try {
        db.prepare('DELETE FROM property_media WHERE property_id = ? AND url = ?').run(video.property_id, video.video_url);
      } catch {}

      // If the property referenced this video as its primary tour, check if another verified video exists
      const remainingVerified = db.prepare(`
        SELECT video_url FROM four_k_videos 
        WHERE property_id = ? AND status = 'VERIFIED' AND id != ?
        ORDER BY created_at DESC LIMIT 1
      `).get(video.property_id, id) as any;

      if (remainingVerified) {
        db.prepare(`
          UPDATE properties
          SET video_tour_url = ?, has_4k_video = 1, video_verification_status = 'APPROVED'
          WHERE id = ?
        `).run(remainingVerified.video_url, video.property_id);
      } else {
        const remainingPending = db.prepare(`
          SELECT video_url FROM four_k_videos 
          WHERE property_id = ? AND status = 'PENDING' AND id != ?
          ORDER BY created_at DESC LIMIT 1
        `).get(video.property_id, id) as any;

        if (remainingPending) {
          db.prepare(`
            UPDATE properties
            SET video_tour_url = ?, has_4k_video = 0, video_verification_status = 'PENDING_AUDIT'
            WHERE id = ?
          `).run(remainingPending.video_url, video.property_id);
        } else {
          db.prepare(`
            UPDATE properties
            SET video_tour_url = NULL, has_4k_video = 0, video_verification_status = 'NONE'
            WHERE id = ?
          `).run(video.property_id);
        }
      }
    })();

    return res.json({ success: true, message: '4K video deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting 4K video:', err);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
};

router.delete('/:id', authenticate, requireRole('PROVIDER', 'ADMIN'), handleDeleteVideo);

export default router;
