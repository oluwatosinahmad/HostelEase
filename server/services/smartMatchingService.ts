import db from '../db.js';

export interface StudentPreferenceProfile {
  userId: string;
  minBudget?: number;
  maxBudget?: number;
  monthlyLivingBudget?: number;
  paymentStylePreference?: string;
  preferredAreas?: string[];
  preferredRoomTypes?: string[];
  maxDistanceMinutes?: number;
  maxDistanceKm?: number;
  rankedPriorities?: string[];
  importanceElectricity?: number; // 1-5
  importanceWater?: number; // 1-5
  importanceSecurity?: number; // 1-5
  importanceInternet?: number; // 1-5
  importanceQuietness?: number; // 1-5
  targetOccupancy?: number;
  preferredMoveInDate?: string;
}

export interface MatchEvaluation {
  propertyId: string;
  propertyTitle: string;
  address: string;
  area: string;
  pricePerYear: number;
  roomType: string;
  verificationStatus: string;
  matchScore: number; // 0 - 100
  positiveReasons: string[];
  negativeWarnings: string[];
  unknownFields: string[];
  affordabilityStatus: 'WITHIN_BUDGET' | 'NEAR_BUDGET' | 'ABOVE_BUDGET';
  affordabilityNote: string;
  trueCost: {
    rentPerYear: number;
    cautionDeposit: number;
    serviceCharge: number;
    agencyLegalFee: number;
    platformFee: number;
    totalKnownCost: number;
    estimatedDailyTransport: number;
    estimatedAnnualTransport: number;
    totalEstimatedCostWithTransport: number;
  };
  distanceKm: number;
  estimatedWalkMinutes: number;
  powerRating: number | null;
  waterRating: number | null;
  securityRating: number | null;
  internetRating: number | null;
  quietnessRating: number | null;
  riskSignals: string[];
  amenities: string[];
  coverImage?: string;
  availableBedspaces: number;
}

export class SmartMatchingService {
  /**
   * Get or load student preference profile from DB
   */
  static getStudentProfile(userId: string): StudentPreferenceProfile {
    const row = db.prepare('SELECT * FROM student_preferences WHERE user_id = ?').get(userId) as any;
    if (!row) {
      return {
        userId,
        minBudget: 100000,
        maxBudget: 200000,
        monthlyLivingBudget: 35000,
        paymentStylePreference: 'FULL_YEAR',
        preferredAreas: ['Under G', 'Adenike', 'Stadium'],
        preferredRoomTypes: ['SINGLE', 'SHARED_2'],
        maxDistanceMinutes: 15,
        maxDistanceKm: 2.0,
        rankedPriorities: ['PRICE', 'DISTANCE', 'ELECTRICITY', 'SECURITY', 'WATER', 'INTERNET', 'QUIETNESS'],
        importanceElectricity: 5,
        importanceWater: 4,
        importanceSecurity: 5,
        importanceInternet: 3,
        importanceQuietness: 4,
        targetOccupancy: 1
      };
    }

    let preferredAreas: string[] = ['Under G', 'Adenike'];
    try {
      preferredAreas = JSON.parse(row.preferred_areas_json || row.preferred_locations_json || '[]');
    } catch { /* default */ }

    let preferredRoomTypes: string[] = ['SINGLE', 'SHARED_2'];
    try {
      preferredRoomTypes = JSON.parse(row.preferred_room_types_json || '[]');
    } catch { /* default */ }

    let rankedPriorities: string[] = ['PRICE', 'DISTANCE', 'ELECTRICITY', 'SECURITY', 'WATER', 'INTERNET', 'QUIETNESS'];
    try {
      rankedPriorities = JSON.parse(row.ranked_priorities_json || '[]');
    } catch { /* default */ }

    return {
      userId,
      minBudget: row.min_budget || 100000,
      maxBudget: row.max_budget || 200000,
      monthlyLivingBudget: row.monthly_living_budget || 35000,
      paymentStylePreference: row.payment_style_preference || 'FULL_YEAR',
      preferredAreas,
      preferredRoomTypes,
      maxDistanceMinutes: row.max_distance_minutes || 15,
      maxDistanceKm: row.max_distance_km || 2.0,
      rankedPriorities,
      importanceElectricity: row.importance_electricity || 4,
      importanceWater: row.importance_water || 4,
      importanceSecurity: row.importance_security || 5,
      importanceInternet: row.importance_internet || 3,
      importanceQuietness: row.importance_quietness || 3,
      targetOccupancy: row.target_occupancy || 1,
      preferredMoveInDate: row.preferred_move_in_date
    };
  }

  /**
   * Evaluates single property match transparently against student profile
   */
  static evaluateProperty(property: any, profile: StudentPreferenceProfile): MatchEvaluation {
    const maxBudget = profile.maxBudget || 200000;
    const price = property.price || property.price_per_year || 0;
    const caution = property.caution_deposit || 0;
    const service = property.service_charge || 0;
    const agency = property.agency_fee || property.legal_fee || 0;
    const platformFee = 2500; // Hostel ease transparent fixed escrow verification fee

    const totalKnownCost = price + caution + service + agency + platformFee;

    // Transport calculation based on distance to LAUTECH
    const distanceKm = property.distance_from_campus || property.distance_km || 1.2;
    const estimatedWalkMinutes = Math.round(distanceKm * 10); // ~10 mins per km
    const estimatedDailyTransport = property.estimated_transport_daily || (distanceKm > 1.5 ? 400 : distanceKm > 0.8 ? 200 : 0);
    const estimatedAnnualTransport = estimatedDailyTransport * 180; // ~180 academic school days per session
    const totalEstimatedCostWithTransport = totalKnownCost + estimatedAnnualTransport;

    const positiveReasons: string[] = [];
    const negativeWarnings: string[] = [];
    const unknownFields: string[] = [];
    const riskSignals: string[] = [];

    let score = 50; // Base score

    // 1. Budget Affordability Evaluation
    let affordabilityStatus: 'WITHIN_BUDGET' | 'NEAR_BUDGET' | 'ABOVE_BUDGET' = 'WITHIN_BUDGET';
    let affordabilityNote = 'Within your entered budget';

    if (price <= maxBudget) {
      const savings = maxBudget - price;
      score += 20;
      positiveReasons.push(`✓ Within your ₦${maxBudget.toLocaleString()} budget (₦${savings.toLocaleString()} under budget)`);
      affordabilityStatus = 'WITHIN_BUDGET';
      affordabilityNote = `₦${savings.toLocaleString()} below your maximum budget`;
    } else if (price <= maxBudget * 1.15) {
      const over = price - maxBudget;
      score += 5;
      negativeWarnings.push(`⚠ ₦${over.toLocaleString()} above your preferred budget of ₦${maxBudget.toLocaleString()}`);
      affordabilityStatus = 'NEAR_BUDGET';
      affordabilityNote = `Slightly above budget by ₦${over.toLocaleString()}`;
    } else {
      const over = price - maxBudget;
      score -= 20;
      negativeWarnings.push(`⚠ ₦${over.toLocaleString()} higher than your entered budget`);
      affordabilityStatus = 'ABOVE_BUDGET';
      affordabilityNote = `Above your preferred budget of ₦${maxBudget.toLocaleString()}`;
    }

    // 2. Location & Campus Proximity Evaluation
    const areaName = property.area || property.address || '';
    const preferredAreas = profile.preferredAreas || [];
    const isPreferredArea = preferredAreas.length === 0 || preferredAreas.some(a => areaName.toLowerCase().includes(a.toLowerCase()));

    if (isPreferredArea) {
      score += 10;
      positiveReasons.push(`✓ Located in your preferred neighborhood (${areaName})`);
    } else {
      negativeWarnings.push(`⚠ Located in ${areaName} (not in your preferred areas list)`);
    }

    if (estimatedWalkMinutes <= (profile.maxDistanceMinutes || 15)) {
      score += 10;
      positiveReasons.push(`✓ Approximately ${estimatedWalkMinutes} mins walk to LAUTECH campus (${distanceKm} km)`);
    } else {
      negativeWarnings.push(`⚠ ${estimatedWalkMinutes} mins walk to LAUTECH gate (longer commute)`);
    }

    // 3. Verification & Trust
    if (property.verification_status === 'APPROVED') {
      score += 10;
      positiveReasons.push(`✓ Verified Property (Physically inspected by Hostel Ease team)`);
    } else {
      negativeWarnings.push(`⚠ Verification in progress — physical inspection strongly recommended`);
    }

    // 4. Electricity & Utilities (Never assume missing data is positive!)
    const powerRating = property.power_rating_avg ?? null;
    const waterRating = property.water_rating_avg ?? null;
    const securityRating = property.security_rating_avg ?? null;
    const internetRating = property.internet_rating_avg ?? null;
    const quietnessRating = property.quietness_rating_avg ?? null;

    if (powerRating !== null) {
      if (powerRating >= 4.0) {
        score += 8;
        positiveReasons.push(`✓ Highly rated electricity supply (${powerRating}★ rating by verified students)`);
      } else if (powerRating < 3.0) {
        score -= 10;
        negativeWarnings.push(`⚠ Electricity rated ${powerRating}★ by past students — check backup power availability`);
        riskSignals.push('Past students noted frequent power outages');
      }
    } else {
      unknownFields.push('Electricity supply history not yet verified');
      negativeWarnings.push('⚠ Power reliability data is currently limited for this listing');
    }

    if (waterRating !== null) {
      if (waterRating >= 4.0) {
        score += 5;
        positiveReasons.push(`✓ Verified water supply setup (${waterRating}★)`);
      } else if (waterRating < 3.0) {
        score -= 8;
        negativeWarnings.push(`⚠ Water supply rating is ${waterRating}★ — inquire about borehole pumping times`);
        riskSignals.push('Water supply availability noted in student reviews');
      }
    } else {
      unknownFields.push('Water supply reliability unconfirmed');
    }

    if (securityRating !== null && securityRating >= 4.0) {
      score += 5;
      positiveReasons.push(`✓ Gated compound with verified security (${securityRating}★)`);
    }

    if (internetRating === null) {
      unknownFields.push('Internet / Wi-Fi availability not reported');
    }

    // 5. Repeated Complaint Signal
    if (property.repeated_complaint_signal) {
      riskSignals.push(`Student Feedback Signal: ${property.repeated_complaint_signal}`);
      negativeWarnings.push(`⚠ Note: ${property.repeated_complaint_signal}`);
      score -= 5;
    }

    // Clamp score strictly between 15% and 99%
    const finalScore = Math.max(15, Math.min(99, Math.round(score)));

    // Parse amenities
    let amenities: string[] = [];
    try {
      amenities = JSON.parse(property.amenities_json || '[]');
    } catch {
      if (typeof property.amenities === 'string') {
        amenities = property.amenities.split(',').map((s: string) => s.trim());
      }
    }

    let images: string[] = [];
    try {
      images = JSON.parse(property.images_json || '[]');
    } catch { /* empty */ }

    return {
      propertyId: property.id,
      propertyTitle: property.title || 'Hostel Listing',
      address: property.address || 'Ogbomoso',
      area: property.area || 'Under G',
      pricePerYear: price,
      roomType: property.room_type || property.property_type || 'Single Room',
      verificationStatus: property.verification_status || 'PENDING',
      matchScore: finalScore,
      positiveReasons,
      negativeWarnings,
      unknownFields,
      affordabilityStatus,
      affordabilityNote,
      trueCost: {
        rentPerYear: price,
        cautionDeposit: caution,
        serviceCharge: service,
        agencyLegalFee: agency,
        platformFee,
        totalKnownCost,
        estimatedDailyTransport,
        estimatedAnnualTransport,
        totalEstimatedCostWithTransport
      },
      distanceKm,
      estimatedWalkMinutes,
      powerRating,
      waterRating,
      securityRating,
      internetRating,
      quietnessRating,
      riskSignals,
      amenities,
      coverImage: images[0] || property.cover_image,
      availableBedspaces: property.available_bedspaces || property.total_rooms || 1
    };
  }

  /**
   * Generates Top Smart Match + 3 Clear Alternatives (Cheaper, Closer, Better Electricity)
   */
  static getSmartRecommendations(userId: string) {
    const profile = this.getStudentProfile(userId);

    // Fetch all active, approved properties with area and pricing
    const properties = db.prepare(`
      SELECT p.*, a.name as area, a.name as area_name,
             COALESCE(pr.rent_amount, 150000) as price,
             COALESCE(pr.rent_amount, 150000) as price_per_year,
             COALESCE(pr.caution_fee, 15000) as caution_deposit,
             COALESCE(pr.service_charge, 10000) as service_charge,
             COALESCE(pr.agency_fee, 0) as agency_fee,
             COALESCE(pr.legal_fee, 0) as legal_fee,
             COALESCE((SELECT COUNT(*) FROM bedspaces b JOIN rooms r ON r.id = b.room_id WHERE r.property_id = p.id AND b.is_occupied = 0), 2) as available_bedspaces
      FROM properties p
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE (p.verification_status = 'APPROVED' OR p.verification_status = 'PENDING_REVIEW' OR p.availability_status = 'AVAILABLE')
      ORDER BY p.created_at DESC
    `).all() as any[];

    if (properties.length === 0) {
      return {
        bestMatch: null,
        alternatives: [],
        allMatches: [],
        studentProfile: profile
      };
    }

    const evaluations = properties.map(p => this.evaluateProperty(p, profile));

    // Sort by matchScore descending
    evaluations.sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = evaluations[0] || null;

    // Build 3 personalized alternatives
    const alternatives: Array<{ type: string; title: string; explanation: string; match: MatchEvaluation }> = [];

    // 1. Cheaper Alternative
    const cheaper = evaluations.find(e => e.propertyId !== bestMatch?.propertyId && e.pricePerYear < (bestMatch?.pricePerYear || 0));
    if (cheaper) {
      const diff = (bestMatch?.pricePerYear || 0) - cheaper.pricePerYear;
      alternatives.push({
        type: 'CHEAPER',
        title: 'Budget-Friendly Alternative',
        explanation: `Saves you ₦${diff.toLocaleString()} per year compared to your top match (${cheaper.matchScore}% Match).`,
        match: cheaper
      });
    }

    // 2. Closer Alternative
    const closer = evaluations.find(e => e.propertyId !== bestMatch?.propertyId && e.estimatedWalkMinutes < (bestMatch?.estimatedWalkMinutes || 10));
    if (closer) {
      alternatives.push({
        type: 'CLOSER',
        title: 'Closest to LAUTECH Campus',
        explanation: `Just ${closer.estimatedWalkMinutes} mins from campus gate (${closer.distanceKm} km) with ${closer.matchScore}% Match.`,
        match: closer
      });
    }

    // 3. Better Electricity Alternative
    const betterPower = evaluations.find(e => 
      e.propertyId !== bestMatch?.propertyId && 
      (e.powerRating || 0) > (bestMatch?.powerRating || 3.5)
    );
    if (betterPower) {
      alternatives.push({
        type: 'BETTER_POWER',
        title: 'Top Rated Electricity',
        explanation: `Electricity rated ${betterPower.powerRating}★ by verified students with stable power supply.`,
        match: betterPower
      });
    }

    return {
      bestMatch,
      alternatives,
      allMatches: evaluations.slice(0, 10),
      studentProfile: profile
    };
  }
}
