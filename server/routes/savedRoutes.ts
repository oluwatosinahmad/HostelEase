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
      JOIN areas a ON p.area_id = a.id
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

      const keyAmenities = db.prepare(`
        SELECT a.key, a.name, a.icon 
        FROM property_amenities pa
        JOIN amenities a ON pa.amenity_id = a.id
        WHERE pa.property_id = ? AND pa.is_available = 1
        LIMIT 4
      `).all(p.id);

      return {
        id: p.id,
        savedId: p.saved_id,
        savedNotes: p.saved_notes,
        savedAt: p.saved_at,
        title: p.title,
        slug: p.slug,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isDemo: Boolean(p.is_demo),
        area: {
          id: p.area_id,
          name: p.area_name,
          slug: p.area_slug,
          landmark: p.area_landmark
        },
        coverImage: coverMedia ? coverMedia.url : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        priceSummary: price ? {
          period: price.period,
          rentAmount: price.rent_amount,
          totalMandatoryCost: price.total_mandatory_cost
        } : null,
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

// Save a property
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { propertyId, notes = '' } = req.body;
  if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });

  try {
    const existing = db.prepare('SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?').get(req.user.id, propertyId) as any;
    if (existing) {
      return res.status(200).json({ success: true, savedId: existing.id, message: 'Property already saved' });
    }

    const savedId = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO saved_properties (id, user_id, property_id, notes, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(savedId, req.user.id, propertyId, notes);

    return res.status(201).json({ success: true, savedId, message: 'Hostel saved to shortlist' });
  } catch (err: any) {
    console.error('Save property error:', err);
    return res.status(500).json({ error: 'Failed to save hostel: ' + err.message });
  }
});

// Unsave a property
router.delete('/:propertyId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { propertyId } = req.params;

  try {
    db.prepare('DELETE FROM saved_properties WHERE user_id = ? AND (property_id = ? OR id = ?)').run(req.user.id, propertyId, propertyId);
    return res.json({ success: true, message: 'Hostel removed from saved list' });
  } catch (err: any) {
    console.error('Remove saved property error:', err);
    return res.status(500).json({ error: 'Failed to remove saved hostel' });
  }
});

export default router;
