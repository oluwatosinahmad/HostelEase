import { Router, Response } from 'express';
import db from '../db';
import { optionalAuthenticate, authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to format property row with rooms, prices, media, amenities
function formatPropertySummary(p: any, savedPropertyIds: Set<string> = new Set()) {
  // Get price summary
  const price = db.prepare(`
    SELECT * FROM prices WHERE property_id = ? ORDER BY rent_amount ASC LIMIT 1
  `).get(p.id) as any;

  // Get cover media
  const coverMedia = db.prepare(`
    SELECT * FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1
  `).get(p.id) as any || db.prepare(`
    SELECT * FROM property_media WHERE property_id = ? ORDER BY display_order ASC LIMIT 1
  `).get(p.id) as any;

  // Get key amenities
  const keyAmenities = db.prepare(`
    SELECT a.key, a.name, a.icon, a.category 
    FROM property_amenities pa
    JOIN amenities a ON pa.amenity_id = a.id
    WHERE pa.property_id = ? AND pa.is_available = 1
    LIMIT 6
  `).all(p.id);

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    address: p.address,
    nearbyLandmark: p.nearby_landmark,
    latitude: p.latitude,
    longitude: p.longitude,
    distanceFromCampusKm: p.distance_from_campus_km,
    propertyType: p.property_type,
    genderPreference: p.gender_preference,
    totalRooms: p.total_rooms,
    verificationStatus: p.verification_status,
    availabilityStatus: p.availability_status,
    isDemo: Boolean(p.is_demo),
    isFeatured: Boolean(p.is_featured),
    createdAt: p.created_at,
    area: {
      id: p.area_id,
      name: p.area_name,
      slug: p.area_slug,
      landmark: p.area_landmark
    },
    coverImage: coverMedia ? coverMedia.url : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    coverImageCaption: coverMedia ? coverMedia.caption : null,
    priceSummary: price ? {
      period: price.period,
      rentAmount: price.rent_amount,
      serviceCharge: price.service_charge,
      agencyFee: price.agency_fee,
      cautionFee: price.caution_fee,
      otherMandatoryCharges: price.other_mandatory_charges,
      legalFee: price.legal_fee,
      totalMandatoryCost: price.total_mandatory_cost,
      totalRefundableCost: price.total_refundable_cost,
      isNegotiable: Boolean(price.is_negotiable)
    } : null,
    keyAmenities,
    isSaved: savedPropertyIds.has(p.id)
  };
}

// 1. Search and Filter Hostels
router.get('/', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      areaId,
      minPrice,
      maxPrice,
      maxDistance,
      roomType,
      genderPreference,
      availability,
      verifiedOnly,
      amenities: requiredAmenities,
      sortBy = 'recommended',
      page = '1',
      limit = '12'
    } = req.query;

    let query = `
      SELECT p.*, a.name as area_name, a.slug as area_slug, a.landmark as area_landmark
      FROM properties p
      JOIN areas a ON p.area_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter only approved properties for public search (or all if specifically querying)
    query += ` AND p.verification_status = 'APPROVED'`;

    // Keyword search
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.nearby_landmark LIKE ? OR a.name LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    // Area filter
    if (areaId && areaId !== 'all') {
      query += ` AND (p.area_id = ? OR a.slug = ?)`;
      params.push(areaId, areaId);
    }

    // Distance filter
    if (maxDistance) {
      query += ` AND p.distance_from_campus_km <= ?`;
      params.push(parseFloat(maxDistance as string));
    }

    // Room type filter
    if (roomType && roomType !== 'all') {
      query += ` AND p.property_type = ?`;
      params.push(roomType);
    }

    // Gender preference filter
    if (genderPreference && genderPreference !== 'ANY') {
      query += ` AND (p.gender_preference = ? OR p.gender_preference = 'ANY')`;
      params.push(genderPreference);
    }

    // Availability status
    if (availability && availability !== 'all') {
      query += ` AND p.availability_status = ?`;
      params.push(availability);
    }

    // Price range filters
    if (minPrice) {
      query += ` AND EXISTS (SELECT 1 FROM prices pr WHERE pr.property_id = p.id AND pr.rent_amount >= ?)`;
      params.push(parseFloat(minPrice as string));
    }
    if (maxPrice) {
      query += ` AND EXISTS (SELECT 1 FROM prices pr WHERE pr.property_id = p.id AND pr.rent_amount <= ?)`;
      params.push(parseFloat(maxPrice as string));
    }

    // Amenities filtering
    if (requiredAmenities) {
      const amenityKeys = Array.isArray(requiredAmenities) 
        ? requiredAmenities as string[] 
        : (requiredAmenities as string).split(',').map(s => s.trim()).filter(Boolean);

      for (const amKey of amenityKeys) {
        query += ` AND EXISTS (
          SELECT 1 FROM property_amenities pa 
          JOIN amenities am ON pa.amenity_id = am.id 
          WHERE pa.property_id = p.id AND am.key = ? AND pa.is_available = 1
        )`;
        params.push(amKey);
      }
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        query += ` ORDER BY (SELECT MIN(rent_amount) FROM prices WHERE property_id = p.id) ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY (SELECT MAX(rent_amount) FROM prices WHERE property_id = p.id) DESC`;
        break;
      case 'distance_asc':
        query += ` ORDER BY p.distance_from_campus_km ASC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'recommended':
      default:
        query += ` ORDER BY p.is_featured DESC, p.distance_from_campus_km ASC, p.created_at DESC`;
        break;
    }

    // Execute query
    const allMatching = db.prepare(query).all(...params);
    const totalCount = allMatching.length;

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 12));
    const offset = (pageNum - 1) * limitNum;
    const paginated = allMatching.slice(offset, offset + limitNum);

    // Get saved properties for current user if logged in
    const savedPropertyIds = new Set<string>();
    if (req.user) {
      const savedRows = db.prepare('SELECT property_id FROM saved_properties WHERE user_id = ?').all(req.user.id) as any[];
      savedRows.forEach(r => savedPropertyIds.add(r.property_id));
    }

    const results = paginated.map(p => formatPropertySummary(p, savedPropertyIds));

    return res.json({
      properties: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err) {
    console.error('Fetch properties error:', err);
    return res.status(500).json({ error: 'Failed to retrieve properties' });
  }
});

// 2. Featured Hostels for Homepage
router.get('/featured', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const properties = db.prepare(`
      SELECT p.*, a.name as area_name, a.slug as area_slug, a.landmark as area_landmark
      FROM properties p
      JOIN areas a ON p.area_id = a.id
      WHERE p.verification_status = 'APPROVED' AND p.is_featured = 1
      ORDER BY p.distance_from_campus_km ASC
      LIMIT 6
    `).all();

    const savedPropertyIds = new Set<string>();
    if (req.user) {
      const savedRows = db.prepare('SELECT property_id FROM saved_properties WHERE user_id = ?').all(req.user.id) as any[];
      savedRows.forEach(r => savedPropertyIds.add(r.property_id));
    }

    return res.json({
      properties: properties.map(p => formatPropertySummary(p, savedPropertyIds))
    });
  } catch (err) {
    console.error('Featured hostels error:', err);
    return res.status(500).json({ error: 'Failed to fetch featured hostels' });
  }
});

// 3. Recently Added Hostels
router.get('/recent', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const properties = db.prepare(`
      SELECT p.*, a.name as area_name, a.slug as area_slug, a.landmark as area_landmark
      FROM properties p
      JOIN areas a ON p.area_id = a.id
      WHERE p.verification_status = 'APPROVED'
      ORDER BY p.created_at DESC
      LIMIT 6
    `).all();

    const savedPropertyIds = new Set<string>();
    if (req.user) {
      const savedRows = db.prepare('SELECT property_id FROM saved_properties WHERE user_id = ?').all(req.user.id) as any[];
      savedRows.forEach(r => savedPropertyIds.add(r.property_id));
    }

    return res.json({
      properties: properties.map(p => formatPropertySummary(p, savedPropertyIds))
    });
  } catch (err) {
    console.error('Recent hostels error:', err);
    return res.status(500).json({ error: 'Failed to fetch recent hostels' });
  }
});

// 4. Get Single Property Details (Full detailed breakdown)
router.get('/:id', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const property = db.prepare(`
      SELECT p.*, a.name as area_name, a.slug as area_slug, a.landmark as area_landmark,
             u.full_name as provider_name, u.phone as provider_phone,
             pp.business_name as provider_business_name, pp.verification_status as provider_verification_status
      FROM properties p
      JOIN areas a ON p.area_id = a.id
      JOIN users u ON p.provider_id = u.id
      LEFT JOIN provider_profiles pp ON u.id = pp.user_id
      WHERE p.id = ? OR p.slug = ?
    `).get(id, id) as any;

    if (!property) {
      return res.status(404).json({ error: 'Property listing not found' });
    }

    // Fetch rooms
    const rooms = db.prepare(`
      SELECT * FROM rooms WHERE property_id = ?
    `).all(property.id);

    // Fetch price breakdown records
    const prices = db.prepare(`
      SELECT * FROM prices WHERE property_id = ?
    `).all(property.id);

    // Fetch categorized media
    const media = db.prepare(`
      SELECT * FROM property_media 
      WHERE property_id = ? 
      ORDER BY is_cover DESC, display_order ASC
    `).all(property.id);

    // Fetch all amenities
    const amenities = db.prepare(`
      SELECT a.id, a.key, a.name, a.category, a.icon, a.description, pa.is_available, pa.notes
      FROM property_amenities pa
      JOIN amenities a ON pa.amenity_id = a.id
      WHERE pa.property_id = ?
    `).all(property.id);

    // Check if saved by current user
    let isSaved = false;
    if (req.user) {
      const saved = db.prepare('SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?').get(req.user.id, property.id);
      isSaved = Boolean(saved);
    }

    // Fetch legitimate reviews if any
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as student_name
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      WHERE r.property_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
    `).all(property.id);

    return res.json({
      property: {
        id: property.id,
        title: property.title,
        slug: property.slug,
        description: property.description,
        address: property.address,
        nearbyLandmark: property.nearby_landmark,
        latitude: property.latitude,
        longitude: property.longitude,
        distanceFromCampusKm: property.distance_from_campus_km,
        propertyType: property.property_type,
        genderPreference: property.gender_preference,
        totalRooms: property.total_rooms,
        verificationStatus: property.verification_status,
        availabilityStatus: property.availability_status,
        isDemo: Boolean(property.is_demo),
        isFeatured: Boolean(property.is_featured),
        createdAt: property.created_at,
        updatedAt: property.updated_at,
        area: {
          id: property.area_id,
          name: property.area_name,
          slug: property.area_slug,
          landmark: property.area_landmark
        },
        provider: {
          name: property.provider_name,
          businessName: property.provider_business_name,
          phone: property.provider_phone,
          verificationStatus: property.provider_verification_status
        },
        rooms: rooms.map((r: any) => ({
          id: r.id,
          name: r.room_name,
          type: r.room_type,
          maxOccupants: r.max_occupants,
          quantityTotal: r.quantity_total,
          quantityAvailable: r.quantity_available,
          isEnsuite: Boolean(r.is_ensuite),
          isFurnished: Boolean(r.is_furnished)
        })),
        prices: prices.map((pr: any) => ({
          id: pr.id,
          roomId: pr.room_id,
          period: pr.period,
          rentAmount: pr.rent_amount,
          serviceCharge: pr.service_charge,
          agencyFee: pr.agency_fee,
          cautionFee: pr.caution_fee,
          otherMandatoryCharges: pr.other_mandatory_charges,
          legalFee: pr.legal_fee,
          isNegotiable: Boolean(pr.is_negotiable),
          totalMandatoryCost: pr.total_mandatory_cost,
          totalRefundableCost: pr.total_refundable_cost,
          notes: pr.notes
        })),
        media: media.map((m: any) => ({
          id: m.id,
          mediaType: m.media_type,
          category: m.category,
          url: m.url,
          thumbnailUrl: m.thumbnail_url,
          caption: m.caption,
          displayOrder: m.display_order,
          isCover: Boolean(m.is_cover),
          isVerified: Boolean(m.is_verified)
        })),
        amenities: amenities.map((am: any) => ({
          id: am.id,
          key: am.key,
          name: am.name,
          category: am.category,
          icon: am.icon,
          description: am.description,
          isAvailable: Boolean(am.is_available),
          notes: am.notes
        })),
        reviews,
        isSaved
      }
    });
  } catch (err) {
    console.error('Fetch property detail error:', err);
    return res.status(500).json({ error: 'Failed to retrieve property details' });
  }
});

// 5. Save a Property to Shortlist
router.post('/:id/save', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    db.prepare(`
      INSERT OR REPLACE INTO saved_properties (id, user_id, property_id, notes, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(`saved-${req.user.id}-${id}`, req.user.id, id, notes || null);

    return res.json({ message: 'Hostel saved to your shortlist', isSaved: true });
  } catch (err) {
    console.error('Save property error:', err);
    return res.status(500).json({ error: 'Failed to save hostel' });
  }
});

// 6. Remove Property from Shortlist
router.delete('/:id/save', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?').run(req.user.id, id);
    return res.json({ message: 'Hostel removed from your shortlist', isSaved: false });
  } catch (err) {
    console.error('Unsave property error:', err);
    return res.status(500).json({ error: 'Failed to unsave hostel' });
  }
});

export default router;
