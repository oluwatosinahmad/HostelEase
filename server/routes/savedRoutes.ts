import { Router, Response } from 'express';
import db from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all saved properties for logged-in user
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const saved = db.prepare(`
      SELECT sp.id as saved_id, sp.notes as saved_notes, sp.created_at as saved_at,
             p.*, a.name as area_name, a.slug as area_slug, a.landmark as area_landmark
      FROM saved_properties sp
      JOIN properties p ON sp.property_id = p.id
      LEFT JOIN areas a ON p.area_id = a.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `).all(req.user.id) as any[];

    const results = saved.map(p => {
      const price = db.prepare(`
        SELECT * FROM prices WHERE property_id = ? ORDER BY rent_amount ASC LIMIT 1
      `).get(p.id) as any;

      const coverMedia = db.prepare(`
        SELECT url FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1
      `).get(p.id) as any || db.prepare(`
        SELECT url FROM property_media WHERE property_id = ? ORDER BY display_order ASC LIMIT 1
      `).get(p.id) as any;

      const videoMedia = db.prepare(`
        SELECT url FROM property_media WHERE property_id = ? AND media_type = 'VIDEO' LIMIT 1
      `).get(p.id) as any;

      const keyAmenities = db.prepare(`
        SELECT a.key, a.name, a.icon 
        FROM property_amenities pa
        JOIN amenities a ON pa.amenity_id = a.id
        WHERE pa.property_id = ? AND pa.is_available = 1
        LIMIT 6
      `).all(p.id);

      const activeBookingRow = db.prepare(`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE property_id = ? AND status IN ('PENDING', 'CONFIRMED')
      `).get(p.id) as { count: number } | undefined;
      const activeBookingCount = activeBookingRow ? activeBookingRow.count : 0;
      const isBooked = activeBookingCount > 0 || p.availability_status === 'BOOKED' || p.availability_status === 'FULLY_OCCUPIED';
      const effectiveAvailability = isBooked ? 'BOOKED' : (p.availability_status || 'AVAILABLE');
      const videoUrl = videoMedia ? videoMedia.url : (p.video_tour_url || null);
      const hasVideo = Boolean(videoUrl);

      return {
        id: p.id,
        savedId: p.saved_id,
        savedNotes: p.saved_notes,
        savedAt: p.saved_at,
        title: p.title,
        slug: p.slug,
        description: p.description,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference || 'ANY',
        verificationStatus: p.verification_status,
        availabilityStatus: effectiveAvailability,
        bookingStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
        isBooked,
        activeBookingCount,
        isDemo: Boolean(p.is_demo),
        isFeatured: Boolean(p.is_featured),
        has4KVideo: hasVideo,
        videoTourUrl: videoUrl,
        area: {
          id: p.area_id || 'area-default',
          name: p.area_name || 'Under G (LAUTECH)',
          slug: p.area_slug || 'under-g',
          landmark: p.area_landmark || 'Campus Gate'
        },
        coverImage: coverMedia ? coverMedia.url : (p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'),
        priceSummary: price ? {
          period: price.period,
          rentAmount: price.rent_amount,
          totalMandatoryCost: price.total_mandatory_cost || price.rent_amount
        } : (p.rent_amount ? {
          period: 'YEARLY',
          rentAmount: p.rent_amount,
          totalMandatoryCost: p.rent_amount
        } : {
          period: 'YEARLY',
          rentAmount: 180000,
          totalMandatoryCost: 195000
        }),
        keyAmenities,
        isSaved: true
      };
    });

    return res.json({ savedProperties: results });
  } catch (err) {
    console.error('Fetch saved properties error:', err);
    return res.status(500).json({ error: 'Failed to retrieve saved hostels' });
  }
});

// Save a property (supports POST / with body { propertyId } or POST /:propertyId)
const handleSave = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const rawId = req.params.propertyId || req.body?.propertyId;
  const { notes = '' } = req.body || {};
  if (!rawId) return res.status(400).json({ error: 'propertyId is required' });

  try {
    const propRow = db.prepare('SELECT id FROM properties WHERE id = ? OR slug = ?').get(rawId, rawId) as any;
    if (!propRow) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const propertyId = propRow.id;

    const existing = db.prepare('SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?').get(req.user.id, propertyId) as any;
    if (existing) {
      return res.status(200).json({ success: true, savedId: existing.id, isSaved: true, propertyId, message: 'Property already saved' });
    }

    const savedId = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT OR REPLACE INTO saved_properties (id, user_id, property_id, notes, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(savedId, req.user.id, propertyId, notes);

    return res.status(201).json({ success: true, savedId, isSaved: true, propertyId, message: 'Hostel saved to shortlist' });
  } catch (err: any) {
    console.error('Save property error:', err);
    return res.status(500).json({ error: 'Failed to save hostel: ' + err.message });
  }
};

router.post('/', authenticate, handleSave);
router.post('/:propertyId', authenticate, handleSave);

// Unsave a property
router.delete('/:propertyId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { propertyId } = req.params;

  try {
    const propRow = db.prepare('SELECT id FROM properties WHERE id = ? OR slug = ?').get(propertyId, propertyId) as any;
    const targetId = propRow ? propRow.id : propertyId;
    db.prepare('DELETE FROM saved_properties WHERE user_id = ? AND (property_id = ? OR property_id = ? OR id = ?)').run(req.user.id, targetId, propertyId, propertyId);
    return res.json({ success: true, isSaved: false, message: 'Hostel removed from saved list' });
  } catch (err: any) {
    console.error('Remove saved property error:', err);
    return res.status(500).json({ error: 'Failed to remove saved hostel' });
  }
});

export default router;
