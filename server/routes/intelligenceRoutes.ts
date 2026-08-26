import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest, requireRole, requirePermission } from '../middleware/auth.js';
import { SmartMatchingService } from '../services/smartMatchingService.js';
import { NaturalLanguageSearchService } from '../services/naturalLanguageSearchService.js';
import { ReviewIntelligenceService } from '../services/reviewIntelligenceService.js';
import { ListingQualityService } from '../services/listingQualityService.js';
import { SupplyDemandService } from '../services/supplyDemandService.js';

const router = Router();

// =============================================================================
// 1. STUDENT PREFERENCES & RANKED PRIORITIES
// =============================================================================

// Get Student Housing Preferences
router.get('/preferences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = SmartMatchingService.getStudentProfile(userId);
  res.json({ preferences: profile });
});

// Update Student Housing Preferences
router.put('/preferences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    minBudget = 100000,
    maxBudget = 200000,
    monthlyLivingBudget = 35000,
    paymentStylePreference = 'FULL_YEAR',
    preferredAreas = ['Under G', 'Adenike'],
    preferredRoomTypes = ['SINGLE', 'SHARED_2'],
    maxDistanceMinutes = 15,
    maxDistanceKm = 2.0,
    rankedPriorities = ['PRICE', 'DISTANCE', 'ELECTRICITY', 'SECURITY', 'WATER', 'INTERNET', 'QUIETNESS'],
    importanceElectricity = 4,
    importanceWater = 4,
    importanceSecurity = 5,
    importanceInternet = 3,
    importanceQuietness = 3,
    targetOccupancy = 1,
    preferredMoveInDate,
    notificationPreferences = { priceAlerts: true, availabilityAlerts: true, recommendations: true }
  } = req.body;

  try {
    db.transaction(() => {
      // 1. Upsert Student Preferences
      const existing = db.prepare('SELECT id FROM student_preferences WHERE user_id = ?').get(userId) as any;
      const prefId = existing?.id || `sp-${crypto.randomUUID()}`;

      db.prepare(`
        INSERT INTO student_preferences (
          id, user_id, min_budget, max_budget, monthly_living_budget, payment_style_preference,
          preferred_areas_json, preferred_locations_json, preferred_room_types_json,
          max_distance_minutes, max_distance_km, ranked_priorities_json,
          importance_electricity, importance_water, importance_security,
          importance_internet, importance_quietness, target_occupancy,
          preferred_move_in_date, notification_preferences_json, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, datetime('now')
        )
        ON CONFLICT(user_id) DO UPDATE SET
          min_budget = excluded.min_budget,
          max_budget = excluded.max_budget,
          monthly_living_budget = excluded.monthly_living_budget,
          payment_style_preference = excluded.payment_style_preference,
          preferred_areas_json = excluded.preferred_areas_json,
          preferred_locations_json = excluded.preferred_locations_json,
          preferred_room_types_json = excluded.preferred_room_types_json,
          max_distance_minutes = excluded.max_distance_minutes,
          max_distance_km = excluded.max_distance_km,
          ranked_priorities_json = excluded.ranked_priorities_json,
          importance_electricity = excluded.importance_electricity,
          importance_water = excluded.importance_water,
          importance_security = excluded.importance_security,
          importance_internet = excluded.importance_internet,
          importance_quietness = excluded.importance_quietness,
          target_occupancy = excluded.target_occupancy,
          preferred_move_in_date = excluded.preferred_move_in_date,
          notification_preferences_json = excluded.notification_preferences_json,
          updated_at = datetime('now')
      `).run(
        prefId,
        userId,
        minBudget,
        maxBudget,
        monthlyLivingBudget,
        paymentStylePreference,
        JSON.stringify(preferredAreas),
        JSON.stringify(preferredAreas),
        JSON.stringify(preferredRoomTypes),
        maxDistanceMinutes,
        maxDistanceKm,
        JSON.stringify(rankedPriorities),
        importanceElectricity,
        importanceWater,
        importanceSecurity,
        importanceInternet,
        importanceQuietness,
        targetOccupancy,
        preferredMoveInDate || null,
        JSON.stringify(notificationPreferences)
      );

      // 2. Add to Preference Audit History
      db.prepare(`
        INSERT INTO student_preference_history (id, user_id, preferences_json, change_reason)
        VALUES (?, ?, ?, ?)
      `).run(
        `sph-${crypto.randomUUID()}`,
        userId,
        JSON.stringify(req.body),
        'Student updated housing and priority preferences'
      );
    })();

    const updatedProfile = SmartMatchingService.getStudentProfile(userId);
    res.json({
      message: 'Housing preferences and priorities saved successfully',
      preferences: updatedProfile
    });
  } catch (err: any) {
    console.error('Failed to update preferences:', err);
    res.status(500).json({ error: err.message || 'Failed to save preferences' });
  }
});

// =============================================================================
// 2. SMART MATCHING & "BEST FOR YOU" ENGINE
// =============================================================================

// Get Smart Matches & Alternatives for current student
router.post('/smart-match', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const result = SmartMatchingService.getSmartRecommendations(userId);
  res.json(result);
});

// =============================================================================
// 3. NATURAL LANGUAGE SEARCH PARSER & INTERPRETER
// =============================================================================

// Natural Language Search query executor
router.post('/nl-search', (req: AuthenticatedRequest, res: Response) => {
  const { query = '' } = req.body;
  const userId = req.user?.id;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query cannot be empty' });
  }

  const result = NaturalLanguageSearchService.search(query, userId);
  res.json(result);
});

// =============================================================================
// 4. TRUE COST ESTIMATOR
// =============================================================================

// Get True Cost breakdown for specific property
router.get('/true-cost/:propertyId', (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as any;

  if (!prop) {
    return res.status(404).json({ error: 'Hostel property not found' });
  }

  const price = prop.price || prop.price_per_year || 0;
  const caution = prop.caution_deposit || 0;
  const service = prop.service_charge || 0;
  const agency = prop.agency_fee || prop.legal_fee || 0;
  const platformFee = 2500;
  const totalKnownCost = price + caution + service + agency + platformFee;

  const distanceKm = prop.distance_from_campus || prop.distance_km || 1.2;
  const estimatedDailyTransport = prop.estimated_transport_daily || (distanceKm > 1.5 ? 400 : distanceKm > 0.8 ? 200 : 0);
  const estimatedAnnualTransport = estimatedDailyTransport * 180; // 180 school days
  const totalEstimatedCostWithTransport = totalKnownCost + estimatedAnnualTransport;

  res.json({
    propertyId,
    title: prop.title,
    area: prop.area,
    distanceKm,
    knownCosts: {
      rentPerYear: price,
      cautionDeposit: caution,
      serviceCharge: service,
      agencyLegalFee: agency,
      platformEscrowFee: platformFee,
      totalKnownCost
    },
    estimatedCosts: {
      dailyCampusCommuteEstimated: estimatedDailyTransport,
      academicSessionCommuteEstimated: estimatedAnnualTransport,
      schoolDaysCount: 180
    },
    totalTrueCost: totalEstimatedCostWithTransport,
    costExplanation: `Known initial payment is ₦${totalKnownCost.toLocaleString()}. Estimated local transport to LAUTECH adds approximately ₦${estimatedAnnualTransport.toLocaleString()} over 180 school days.`
  });
});

// =============================================================================
// 5. PRICE & AVAILABILITY ALERTS
// =============================================================================

// Subscribe to Price Alert
router.post('/alerts/price', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  const prop = db.prepare(`
    SELECT p.id, COALESCE(pr.rent_amount, 150000) as price
    FROM properties p
    LEFT JOIN prices pr ON pr.property_id = p.id
    WHERE p.id = ?
  `).get(propertyId) as any;

  if (!prop) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const currentPrice = prop.price || 150000;
  const alertId = `pa-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO property_price_alerts (id, user_id, property_id, initial_price, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(alertId, userId, propertyId, currentPrice);

  res.status(201).json({
    message: 'Price change alert active. You will be notified if the landlord changes the price.',
    alertId
  });
});

// Subscribe to Availability Alert
router.post('/alerts/availability', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { propertyId, preferredRoomType } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  const alertId = `aa-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO property_availability_alerts (id, user_id, property_id, preferred_room_type, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(alertId, userId, propertyId, preferredRoomType || null);

  res.status(201).json({
    message: 'Availability alert active. You will be notified instantly when a space becomes vacant.',
    alertId
  });
});

// Get My Active Alerts
router.get('/alerts/my', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const priceAlerts = db.prepare(`
    SELECT pa.*, p.title as property_title, COALESCE(pr.rent_amount, 150000) as current_price, a.name as area
    FROM property_price_alerts pa
    JOIN properties p ON p.id = pa.property_id
    LEFT JOIN areas a ON p.area_id = a.id
    LEFT JOIN prices pr ON pr.property_id = p.id
    WHERE pa.user_id = ? AND pa.is_active = 1
  `).all(userId) as any[];

  const availabilityAlerts = db.prepare(`
    SELECT aa.*, p.title as property_title, a.name as area
    FROM property_availability_alerts aa
    JOIN properties p ON p.id = aa.property_id
    LEFT JOIN areas a ON p.area_id = a.id
    WHERE aa.user_id = ? AND aa.is_active = 1
  `).all(userId) as any[];

  res.json({
    priceAlerts,
    availabilityAlerts
  });
});

// =============================================================================
// 6. SMART SHORTLIST ORGANIZER & COMPARISON
// =============================================================================

// Organize / Tag Shortlisted Hostel
router.post('/shortlist/organize', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { propertyId, tag = 'TOP_CHOICE', personalNotes, priorityRank = 1 } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  const tagId = `tag-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO shortlist_tags (id, user_id, property_id, tag, personal_notes, priority_rank, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, property_id) DO UPDATE SET
      tag = excluded.tag,
      personal_notes = excluded.personal_notes,
      priority_rank = excluded.priority_rank,
      updated_at = datetime('now')
  `).run(tagId, userId, propertyId, tag, personalNotes || null, priorityRank);

  res.json({ message: 'Shortlist organization updated', tag });
});

// AI Smart Comparison across student's saved properties
router.post('/shortlist/smart-compare', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = SmartMatchingService.getStudentProfile(userId);

  // Fetch student's saved properties
  const saved = db.prepare(`
    SELECT p.*, st.tag, st.personal_notes
    FROM saved_properties sp
    JOIN properties p ON p.id = sp.property_id
    LEFT JOIN shortlist_tags st ON st.property_id = p.id AND st.user_id = sp.user_id
    WHERE sp.user_id = ?
  `).all(userId) as any[];

  if (saved.length === 0) {
    return res.json({
      summary: 'You have not saved any hostels yet.',
      bestForPrice: null,
      bestForDistance: null,
      bestForElectricity: null,
      bestVerified: null,
      items: []
    });
  }

  const evaluated = saved.map(p => {
    const evaluation = SmartMatchingService.evaluateProperty(p, profile);
    return {
      ...evaluation,
      tag: p.tag || 'TOP_CHOICE',
      personalNotes: p.personal_notes
    };
  });

  // Find best candidates
  const bestForPrice = [...evaluated].sort((a, b) => a.pricePerYear - b.pricePerYear)[0];
  const bestForDistance = [...evaluated].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const bestForElectricity = [...evaluated].sort((a, b) => (b.powerRating || 0) - (a.powerRating || 0))[0];
  const bestVerified = evaluated.find(e => e.verificationStatus === 'APPROVED') || evaluated[0];

  res.json({
    summary: `Compared ${evaluated.length} hostels on your shortlist based on your ₦${profile.maxBudget?.toLocaleString()} budget and ranked priorities.`,
    bestForPrice: { id: bestForPrice?.propertyId, title: bestForPrice?.propertyTitle, price: bestForPrice?.pricePerYear },
    bestForDistance: { id: bestForDistance?.propertyId, title: bestForDistance?.propertyTitle, walkMinutes: bestForDistance?.estimatedWalkMinutes },
    bestForElectricity: { id: bestForElectricity?.propertyId, title: bestForElectricity?.propertyTitle, powerRating: bestForElectricity?.powerRating },
    bestVerified: { id: bestVerified?.propertyId, title: bestVerified?.propertyTitle },
    items: evaluated
  });
});

// =============================================================================
// 7. RECOMMENDATION FEEDBACK
// =============================================================================

router.post('/feedback', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { propertyId, isHelpful, rejectionReasons = [], feedbackText } = req.body;

  if (!propertyId || typeof isHelpful !== 'boolean') {
    return res.status(400).json({ error: 'Property ID and isHelpful boolean are required' });
  }

  db.prepare(`
    INSERT INTO recommendation_feedbacks (id, user_id, property_id, is_helpful, rejection_reasons_json, feedback_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `rf-${crypto.randomUUID()}`,
    userId,
    propertyId,
    isHelpful ? 1 : 0,
    JSON.stringify(rejectionReasons),
    feedbackText || null
  );

  res.json({ message: 'Thank you! Your feedback helps refine accommodation recommendations.' });
});

// =============================================================================
// 8. REVIEW INTELLIGENCE SUMMARY
// =============================================================================

router.get('/reviews/summary/:propertyId', (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  const summary = ReviewIntelligenceService.getReviewSummary(propertyId);
  res.json(summary);
});

// =============================================================================
// 9. PROVIDER LISTING QUALITY SCORE
// =============================================================================

router.get('/provider/quality/:propertyId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  try {
    const evaluation = ListingQualityService.evaluateQuality(propertyId);
    res.json(evaluation);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// =============================================================================
// 10. ADMIN SUPPLY-DEMAND INSIGHTS & DUPLICATE FLAGS
// =============================================================================

router.get(
  '/admin/supply-demand',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const supplyDemand = SupplyDemandService.getSupplyDemandInsights();
    const stressMetrics = SupplyDemandService.getStressReductionMetrics();

    res.json({
      supplyDemand,
      stressMetrics
    });
  }
);

router.get(
  '/admin/duplicate-flags',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const flags = ListingQualityService.scanForDuplicateListings();
    res.json({ duplicateFlags: flags });
  }
);

export default router;
