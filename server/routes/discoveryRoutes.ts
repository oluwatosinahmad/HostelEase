import { Router, Response, Request } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// LAUTECH Campus Reference Landmarks
const LAUTECH_CAMPUS_LANDMARKS = [
  {
    id: 'landmark-main-gate',
    name: 'LAUTECH Main Gate',
    category: 'CAMPUS_GATE',
    lat: 8.1438,
    lng: 4.2638,
    desc: 'Primary entrance to LAUTECH campus, Under G corridor.'
  },
  {
    id: 'landmark-bovas-station',
    name: 'Bovas Fuel Station (Under G)',
    category: 'TRANSIT_HUB',
    lat: 8.1456,
    lng: 4.2642,
    desc: 'Major landmark and commercial student transport pickup point.'
  },
  {
    id: 'landmark-second-gate',
    name: 'LAUTECH 2nd Gate (College Road)',
    category: 'CAMPUS_GATE',
    lat: 8.1405,
    lng: 4.2680,
    desc: 'Direct entrance to College of Health Sciences and Pre-Degree.'
  },
  {
    id: 'landmark-senate-building',
    name: 'LAUTECH Senate Building & Library',
    category: 'ACADEMIC_HUB',
    lat: 8.1445,
    lng: 4.2650,
    desc: 'Central university administrative and senate complex.'
  },
  {
    id: 'landmark-township-stadium',
    name: 'Ogbomoso Township Stadium',
    category: 'RECREATION',
    lat: 8.1389,
    lng: 4.2580,
    desc: 'Stadium Road student activity and sports center.'
  },
  {
    id: 'landmark-adenike-junction',
    name: 'Adenike Junction',
    category: 'TRANSIT_HUB',
    lat: 8.1345,
    lng: 4.2510,
    desc: 'Major shuttle junction connecting Adenike hostels.'
  }
];

// Helper: Smart Natural Language Query Parser
export function parseNaturalLanguageQuery(queryStr: string, allAreas: any[] = []): {
  interpretedFilters: any;
  explanation: string[];
  cleanSearchTerm: string;
} {
  const q = queryStr.toLowerCase().trim();
  const cleanQ = q.replace(/,/g, '');
  const filters: any = {
    facilities: []
  };
  const explanation: string[] = [];

  // 1. Budget extraction (e.g. "under 200k", "under ₦200,000", "below 150000", "max 250k", "cheap", "180k")
  const kMatch = cleanQ.match(/(?:under|below|less than|within|max|around)?\s*(?:₦|naira)?\s*(\d{2,3})\s*k\b/i);
  const fullAmountMatch = cleanQ.match(/(?:under|below|less than|max|for|at)?\s*(?:₦|naira)?\s*(\d{5,7})\b/i);

  if (kMatch) {
    const amount = parseInt(kMatch[1], 10) * 1000;
    filters.maxPrice = amount;
    explanation.push(`Budget cap: Up to ₦${amount.toLocaleString()}`);
  } else if (fullAmountMatch) {
    const amount = parseInt(fullAmountMatch[1], 10);
    filters.maxPrice = amount;
    explanation.push(`Budget cap: Up to ₦${amount.toLocaleString()}`);
  } else if (q.includes('cheap') || q.includes('affordable') || q.includes('budget')) {
    filters.maxPrice = 140000;
    filters.sortBy = 'lowest_price';
    explanation.push('Affordable / budget accommodation prioritized (under ₦140,000)');
  }

  // 2. Distance extraction (e.g. "within 1km", "close to school", "near lautech", "walking distance", "500m")
  const distMatch = q.match(/(?:within|less than|under)?\s*(\d+(?:\.\d+)?)\s*km\b/i);
  const meterMatch = q.match(/(\d{3,4})\s*m(?:eters?)?\b/i);

  if (distMatch) {
    const dist = parseFloat(distMatch[1]);
    filters.maxDistance = dist;
    explanation.push(`Distance: Within ${dist}km of LAUTECH`);
  } else if (meterMatch) {
    const dist = parseFloat(meterMatch[1]) / 1000;
    filters.maxDistance = dist;
    explanation.push(`Distance: Within ${dist}km of LAUTECH`);
  } else if (q.includes('close to school') || q.includes('near campus') || q.includes('near lautech') || q.includes('walking distance') || q.includes('close')) {
    filters.maxDistance = 1.0;
    explanation.push('Proximity: Walking distance within 1.0km of campus');
  }

  // 3. Area matching
  for (const a of allAreas) {
    const areaNameLower = a.name.toLowerCase();
    const areaSlug = a.slug.toLowerCase().replace(/-/g, ' ');
    if (q.includes(areaNameLower) || q.includes(areaSlug) || (a.slug === 'under-g' && (q.includes('under g') || q.includes('underg')))) {
      filters.areaId = a.id;
      explanation.push(`Area: ${a.name}`);
      break;
    }
  }

  // 4. Room Type matching
  if (q.includes('self contain') || q.includes('self-contain') || q.includes('selfcontain') || q.includes('single self')) {
    filters.roomType = 'SELF_CONTAIN';
    explanation.push('Room type: Self-Contain');
  } else if (q.includes('single room') || q.includes('single') || q.includes('room and parlour')) {
    filters.roomType = 'SINGLE_ROOM';
    explanation.push('Room type: Single Room');
  } else if (q.includes('flat') || q.includes('2 bedroom') || q.includes('3 bedroom') || q.includes('apartment')) {
    filters.roomType = 'FLAT';
    explanation.push('Room type: Student Flat');
  } else if (q.includes('bedspace') || q.includes('shared') || q.includes('roommate')) {
    filters.roomType = 'SHARED_BEDSPACE';
    explanation.push('Room type: Shared Bedspace');
  }

  // 5. Gender matching
  if (q.includes('female') || q.includes('girls') || q.includes('ladies') || q.includes('women')) {
    filters.genderPreference = 'FEMALE_ONLY';
    explanation.push('Preference: Female Only');
  } else if (q.includes('male') || q.includes('boys') || q.includes('guys') || q.includes('men')) {
    filters.genderPreference = 'MALE_ONLY';
    explanation.push('Preference: Male Only');
  }

  // 6. Facilities extraction
  if (q.includes('light') || q.includes('electricity') || q.includes('power')) {
    filters.facilities.push('electricity');
    explanation.push('Facility: Constant Electricity');
  }
  if (q.includes('water') || q.includes('borehole') || q.includes('running water')) {
    filters.facilities.push('water');
    explanation.push('Facility: Running Borehole Water');
  }
  if (q.includes('inverter') || q.includes('solar')) {
    filters.facilities.push('inverter');
    explanation.push('Facility: Solar / Inverter Backup');
  }
  if (q.includes('generator') || q.includes('gen')) {
    filters.facilities.push('generator');
    explanation.push('Facility: Standby Generator');
  }
  if (q.includes('wifi') || q.includes('internet')) {
    filters.facilities.push('wifi');
    explanation.push('Facility: Wi-Fi');
  }
  if (q.includes('security') || q.includes('gated') || q.includes('fence')) {
    filters.facilities.push('security');
    explanation.push('Facility: Gated Security');
  }
  if (q.includes('kitchen') || q.includes('cook')) {
    filters.facilities.push('kitchen');
    explanation.push('Facility: Kitchen');
  }

  // 7. Verification matching
  if (q.includes('verified') || q.includes('trusted') || q.includes('genuine')) {
    filters.verifiedOnly = true;
    explanation.push('Trust: Hostel Ease Verified only');
  }

  return {
    interpretedFilters: filters,
    explanation,
    cleanSearchTerm: q
  };
}

// Helper: Calculate Transparent Match Score
export function calculateMatchScore(property: any, preferences: any): { score: number; reasons: string[] } {
  let score = 50; // baseline for approved property
  const reasons: string[] = [];

  const rent = property.rentAmount || property.priceSummary?.rentAmount || 0;
  const dist = property.distanceFromCampusKm || 1.0;

  // 1. Budget evaluation
  if (preferences.maxPrice && preferences.maxPrice > 0) {
    if (rent <= preferences.maxPrice) {
      score += 25;
      reasons.push(`Fits your ₦${Number(preferences.maxPrice).toLocaleString()} budget (Rent: ₦${rent.toLocaleString()})`);
    } else if (rent <= preferences.maxPrice * 1.1) {
      score += 10;
      reasons.push(`Slightly above budget by ${(rent - preferences.maxPrice).toLocaleString()}`);
    } else {
      score -= 20;
    }
  }

  // 2. Distance evaluation
  if (preferences.maxDistance && preferences.maxDistance > 0) {
    if (dist <= preferences.maxDistance) {
      score += 15;
      reasons.push(`Close to campus (${dist}km away, under your ${preferences.maxDistance}km preference)`);
    } else {
      score -= 10;
    }
  } else if (dist <= 0.8) {
    score += 10;
    reasons.push(`Convenient walking distance (${dist}km from LAUTECH main gate)`);
  }

  // 3. Facilities evaluation
  if (Array.isArray(preferences.facilities) && preferences.facilities.length > 0) {
    const propFacilities = property.amenities ? property.amenities.map((a: any) => typeof a === 'string' ? a : a.key) : [];
    const matchedFacilities = preferences.facilities.filter((f: string) => propFacilities.includes(f));
    if (matchedFacilities.length > 0) {
      const facScore = Math.round((matchedFacilities.length / preferences.facilities.length) * 20);
      score += facScore;
      reasons.push(`Has your selected facilities: ${matchedFacilities.join(', ')}`);
    }
  }

  // 4. Verification badge bonus
  if (property.verificationStatus === 'APPROVED') {
    score += 5;
    reasons.push('Verified accommodation inspected for accuracy');
  }

  // 5. Availability state bonus
  if (property.availabilityStatus === 'AVAILABLE') {
    score += 5;
    reasons.push('Vacant and ready for immediate student move-in');
  }

  const finalScore = Math.max(15, Math.min(99, score));
  return { score: finalScore, reasons };
}

// ----------------------------------------------------
// 1. SMART NATURAL LANGUAGE SEARCH
// ----------------------------------------------------
router.post(
  '/smart-search',
  optionalAuthenticate,
  (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const allAreas = db.prepare('SELECT id, name, slug FROM areas').all() as any[];
    const parsed = parseNaturalLanguageQuery(query, allAreas);

    // Build database query based on parsed intents
    let sql = `
      SELECT p.*, a.name as area_name,
             pr.rent_amount, pr.service_charge, pr.agency_fee, pr.caution_fee, pr.total_mandatory_cost,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             (SELECT AVG(rating) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as review_count
      FROM properties p
      JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE p.verification_status = 'APPROVED'
    `;
    const params: any[] = [];

    if (parsed.interpretedFilters.areaId) {
      sql += ' AND p.area_id = ?';
      params.push(parsed.interpretedFilters.areaId);
    }

    if (parsed.interpretedFilters.roomType) {
      sql += ' AND p.property_type = ?';
      params.push(parsed.interpretedFilters.roomType);
    }

    if (parsed.interpretedFilters.genderPreference && parsed.interpretedFilters.genderPreference !== 'ANY') {
      sql += ' AND (p.gender_preference = ? OR p.gender_preference = \'ANY\')';
      params.push(parsed.interpretedFilters.genderPreference);
    }

    if (parsed.interpretedFilters.maxPrice) {
      sql += ' AND pr.rent_amount <= ?';
      params.push(parsed.interpretedFilters.maxPrice);
    }

    if (parsed.interpretedFilters.maxDistance) {
      sql += ' AND p.distance_from_campus_km <= ?';
      params.push(parsed.interpretedFilters.maxDistance);
    }

    if (parsed.interpretedFilters.sortBy === 'lowest_price') {
      sql += ' ORDER BY pr.rent_amount ASC';
    } else {
      sql += ' ORDER BY p.is_featured DESC, p.distance_from_campus_km ASC, p.created_at DESC';
    }

    sql += ' LIMIT 30';

    const properties = db.prepare(sql).all(...params) as any[];

    // Record in search_history if authenticated
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.id) {
      try {
        db.prepare(`
          INSERT INTO search_history (id, user_id, query, filters_json, result_count)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          authReq.user.id,
          query.trim(),
          JSON.stringify(parsed.interpretedFilters),
          properties.length
        );
      } catch (err) {
        console.error('Failed to log search history:', err);
      }
    }

    res.json({
      query,
      interpretedFilters: parsed.interpretedFilters,
      explanation: parsed.explanation,
      resultCount: properties.length,
      properties: properties.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference,
        totalRooms: p.total_rooms,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isFeatured: Boolean(p.is_featured),
        completenessScore: p.completeness_score,
        area: { id: p.area_id, name: p.area_name },
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        priceSummary: {
          rentAmount: p.rent_amount || 0,
          serviceCharge: p.service_charge || 0,
          agencyFee: p.agency_fee || 0,
          cautionFee: p.caution_fee || 0,
          totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0
        },
        avgRating: p.avg_rating ? Math.round(p.avg_rating * 10) / 10 : null,
        reviewCount: p.review_count || 0
      }))
    });
  }
);

// ----------------------------------------------------
// 2. INTERACTIVE MAP MARKERS & CAMPUS REFERENCE PINS
// ----------------------------------------------------
router.get(
  '/map-markers',
  (req: Request, res: Response) => {
    const { areaId, maxPrice, maxDistance, roomType, verifiedOnly, availability } = req.query;

    let sql = `
      SELECT p.id, p.title, p.slug, p.address, p.nearby_landmark, p.latitude, p.longitude,
             p.distance_from_campus_km, p.property_type, p.verification_status, p.availability_status,
             p.is_featured, p.completeness_score, a.id as area_id, a.name as area_name,
             pr.rent_amount, pr.total_mandatory_cost,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
      FROM properties p
      JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE p.verification_status = 'APPROVED'
    `;
    const params: any[] = [];

    if (areaId && areaId !== 'all') {
      sql += ' AND p.area_id = ?';
      params.push(areaId);
    }
    if (roomType && roomType !== 'all') {
      sql += ' AND p.property_type = ?';
      params.push(roomType);
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      sql += ' AND pr.rent_amount <= ?';
      params.push(Number(maxPrice));
    }
    if (maxDistance && !isNaN(Number(maxDistance))) {
      sql += ' AND p.distance_from_campus_km <= ?';
      params.push(Number(maxDistance));
    }
    if (verifiedOnly === 'true') {
      sql += ' AND p.verification_status = \'APPROVED\'';
    }
    if (availability && availability !== 'all') {
      sql += ' AND p.availability_status = ?';
      params.push(availability);
    }

    sql += ' ORDER BY p.distance_from_campus_km ASC';

    const properties = db.prepare(sql).all(...params) as any[];

    res.json({
      campusCenter: {
        name: 'LAUTECH Ogbomoso Campus',
        lat: 8.1438,
        lng: 4.2638,
        zoom: 14
      },
      campusLandmarks: LAUTECH_CAMPUS_LANDMARKS,
      totalCount: properties.length,
      markers: properties.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        address: p.address,
        landmark: p.nearby_landmark,
        lat: p.latitude || 8.1438,
        lng: p.longitude || 4.2638,
        distanceKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        rentAmount: p.rent_amount || 0,
        totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isFeatured: Boolean(p.is_featured),
        completenessScore: p.completeness_score,
        area: { id: p.area_id, name: p.area_name },
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
      }))
    });
  }
);

// ----------------------------------------------------
// 3. 4-HOSTEL SIDE-BY-SIDE COMPARISON MATRIX
// ----------------------------------------------------
router.post(
  '/compare',
  (req: Request, res: Response) => {
    const { propertyIds } = req.body;

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: 'propertyIds array is required' });
    }

    if (propertyIds.length > 4) {
      return res.status(400).json({ error: 'Comparison is limited to a maximum of 4 hostels at a time' });
    }

    const placeholders = propertyIds.map(() => '?').join(',');
    const query = `
      SELECT p.*, a.name as area_name,
             pr.rent_amount, pr.service_charge, pr.agency_fee, pr.caution_fee, pr.other_mandatory_charges, pr.total_mandatory_cost, pr.notes as price_notes,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             (SELECT AVG(rating) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as review_count,
             (SELECT full_name FROM users WHERE id = p.provider_id) as provider_name
      FROM properties p
      JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE p.id IN (${placeholders})
    `;

    const rawProps = db.prepare(query).all(...propertyIds) as any[];

    // Fetch amenities and rooms for each property
    const comparedHostels = rawProps.map(p => {
      const amenities = db.prepare(`
        SELECT a.id, a.key, a.name, a.category, a.icon
        FROM amenities a
        JOIN property_amenities pa ON pa.amenity_id = a.id
        WHERE pa.property_id = ? AND pa.is_available = 1
      `).all(p.id) as any[];

      const rooms = db.prepare(`
        SELECT id, room_name, room_type, max_occupants, quantity_total, quantity_available, is_ensuite
        FROM rooms
        WHERE property_id = ?
      `).all(p.id) as any[];

      const amenityKeys = amenities.map(a => a.key);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isFeatured: Boolean(p.is_featured),
        completenessScore: p.completeness_score,
        area: { id: p.area_id, name: p.area_name },
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        pricing: {
          rentAmount: p.rent_amount || 0,
          serviceCharge: p.service_charge || 0,
          agencyFee: p.agency_fee || 0,
          cautionFee: p.caution_fee || 0,
          otherCharges: p.other_mandatory_charges || 0,
          totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0,
          totalFirstYearEstimated: (p.total_mandatory_cost || p.rent_amount || 0) + (p.caution_fee || 0),
          notes: p.price_notes
        },
        facilitiesMap: {
          electricity: amenityKeys.includes('electricity'),
          water: amenityKeys.includes('water'),
          wifi: amenityKeys.includes('wifi'),
          security: amenityKeys.includes('security'),
          kitchen: amenityKeys.includes('kitchen'),
          generator: amenityKeys.includes('generator'),
          inverter: amenityKeys.includes('inverter'),
          parking: amenityKeys.includes('parking'),
          cctv: amenityKeys.includes('cctv'),
          tiled: amenityKeys.includes('tiled'),
          wardrobe: amenityKeys.includes('wardrobe')
        },
        amenitiesList: amenities,
        roomsList: rooms,
        providerName: p.provider_name || 'Verified Provider',
        rating: {
          avg: p.avg_rating ? Math.round(p.avg_rating * 10) / 10 : 4.5,
          count: p.review_count || 0
        }
      };
    });

    // Compute best value highlights
    let lowestPriceId = '';
    let minPrice = Infinity;
    let closestDistanceId = '';
    let minDistance = Infinity;

    for (const h of comparedHostels) {
      if (h.pricing.rentAmount < minPrice) {
        minPrice = h.pricing.rentAmount;
        lowestPriceId = h.id;
      }
      if (h.distanceFromCampusKm < minDistance) {
        minDistance = h.distanceFromCampusKm;
        closestDistanceId = h.id;
      }
    }

    res.json({
      count: comparedHostels.length,
      hostels: comparedHostels,
      highlights: {
        lowestPriceId,
        closestDistanceId
      }
    });
  }
);

// ----------------------------------------------------
// 4. EXPLAINABLE RECOMMENDATIONS & MATCH SCORING
// ----------------------------------------------------
router.post(
  '/recommendations',
  (req: Request, res: Response) => {
    const { budget, maxDistance, areaId, roomType, facilities, genderPreference } = req.body;

    const query = `
      SELECT p.*, a.name as area_name,
             pr.rent_amount, pr.service_charge, pr.agency_fee, pr.caution_fee, pr.total_mandatory_cost,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             (SELECT AVG(rating) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE property_id = p.id AND status = 'APPROVED') as review_count
      FROM properties p
      JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE p.verification_status = 'APPROVED'
      ORDER BY p.is_featured DESC, p.created_at DESC
    `;

    const allApproved = db.prepare(query).all() as any[];

    // Fetch amenities for scoring
    const scoredList = allApproved.map(p => {
      const amenities = db.prepare(`
        SELECT a.key FROM amenities a
        JOIN property_amenities pa ON pa.amenity_id = a.id
        WHERE pa.property_id = ?
      `).all(p.id) as any[];

      p.amenities = amenities.map(a => a.key);

      const { score, reasons } = calculateMatchScore(
        { ...p, rentAmount: p.rent_amount },
        { maxPrice: budget, maxDistance, areaId, roomType, facilities, genderPreference }
      );

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isFeatured: Boolean(p.is_featured),
        completenessScore: p.completeness_score,
        area: { id: p.area_id, name: p.area_name },
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        priceSummary: {
          rentAmount: p.rent_amount || 0,
          serviceCharge: p.service_charge || 0,
          agencyFee: p.agency_fee || 0,
          cautionFee: p.caution_fee || 0,
          totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0
        },
        avgRating: p.avg_rating ? Math.round(p.avg_rating * 10) / 10 : 4.5,
        reviewCount: p.review_count || 0,
        matchScore: score,
        matchExplanation: reasons.slice(0, 3).join(' • ')
      };
    });

    // Sort by matchScore descending
    scoredList.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      preferences: { budget, maxDistance, areaId, roomType, facilities, genderPreference },
      recommendations: scoredList.slice(0, 12)
    });
  }
);

// ----------------------------------------------------
// 5. SEARCH HISTORY ENDPOINTS
// ----------------------------------------------------
router.get(
  '/search-history',
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const history = db.prepare(`
      SELECT id, query, filters_json, result_count, created_at
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(userId) as any[];

    res.json({
      history: history.map(h => ({
        id: h.id,
        query: h.query,
        filters: h.filters_json ? JSON.parse(h.filters_json) : {},
        resultCount: h.result_count,
        createdAt: h.created_at
      }))
    });
  }
);

router.delete(
  '/search-history',
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    db.prepare('DELETE FROM search_history WHERE user_id = ?').run(userId);
    res.json({ message: 'Search history cleared successfully' });
  }
);

// ----------------------------------------------------
// 6. RECENTLY VIEWED HOSTELS
// ----------------------------------------------------
router.get(
  '/recently-viewed',
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const items = db.prepare(`
      SELECT rv.id as view_id, rv.viewed_at,
             p.id, p.title, p.slug, p.distance_from_campus_km, p.property_type,
             p.verification_status, p.availability_status, a.name as area_name,
             pr.rent_amount, pr.total_mandatory_cost,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
      FROM recently_viewed rv
      JOIN properties p ON p.id = rv.property_id
      JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE rv.user_id = ?
      ORDER BY rv.viewed_at DESC
      LIMIT 8
    `).all(userId) as any[];

    res.json({
      recentViews: items.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        areaName: p.area_name,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        rentAmount: p.rent_amount || 0,
        totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0,
        availabilityStatus: p.availability_status,
        verificationStatus: p.verification_status,
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        viewedAt: p.viewed_at
      }))
    });
  }
);

router.post(
  '/recently-viewed',
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    try {
      db.prepare(`
        INSERT INTO recently_viewed (id, user_id, property_id, viewed_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, property_id) DO UPDATE SET viewed_at = datetime('now')
      `).run(crypto.randomUUID(), userId, propertyId);

      res.json({ message: 'Recorded in recently viewed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record view' });
    }
  }
);

export default router;
