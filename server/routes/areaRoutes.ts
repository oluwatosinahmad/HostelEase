import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. List all LAUTECH accommodation areas
router.get('/', (req, res: Response) => {
  try {
    const areas = db.prepare(`
      SELECT a.*, 
             COUNT(p.id) as property_count,
             MIN(pr.rent_amount) as min_rent,
             MAX(pr.rent_amount) as max_rent
      FROM areas a
      LEFT JOIN properties p ON a.id = p.area_id AND p.verification_status = 'APPROVED'
      LEFT JOIN prices pr ON p.id = pr.property_id
      WHERE a.is_active = 1
      GROUP BY a.id
      ORDER BY a.approx_distance_min_km ASC
    `).all();

    return res.json({
      areas: areas.map((a: any) => ({
        id: a.id,
        universityId: a.university_id,
        name: a.name,
        slug: a.slug,
        description: a.description,
        landmark: a.landmark,
        approxDistanceMinKm: a.approx_distance_min_km,
        approxDistanceMaxKm: a.approx_distance_max_km,
        centerLat: a.center_lat,
        centerLng: a.center_lng,
        propertyCount: a.property_count || 0,
        minRent: a.min_rent,
        maxRent: a.max_rent
      }))
    });
  } catch (err) {
    console.error('Fetch areas error:', err);
    return res.status(500).json({ error: 'Failed to retrieve accommodation areas' });
  }
});

// 2. Admin Create Area
router.post('/', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, slug, description, landmark, approxDistanceMinKm, approxDistanceMaxKm, centerLat, centerLng } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const areaId = `area-${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  try {
    db.prepare(`
      INSERT INTO areas (
        id, university_id, name, slug, description, landmark,
        approx_distance_min_km, approx_distance_max_km, center_lat, center_lng, is_active
      ) VALUES (?, 'lautech-ogbomoso', ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      areaId,
      name.trim(),
      slug.trim().toLowerCase(),
      description || null,
      landmark || null,
      parseFloat(approxDistanceMinKm) || 0.5,
      parseFloat(approxDistanceMaxKm) || 2.5,
      centerLat ? parseFloat(centerLat) : null,
      centerLng ? parseFloat(centerLng) : null
    );

    return res.status(201).json({ message: 'Accommodation area created successfully', areaId });
  } catch (err) {
    console.error('Create area error:', err);
    return res.status(500).json({ error: 'Failed to create accommodation area' });
  }
});

export default router;
