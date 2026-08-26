import db from '../db.js';
import crypto from 'crypto';

export interface ListingQualityEvaluation {
  propertyId: string;
  overallScore: number; // 0 - 100
  scoreGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'INCOMPLETE';
  scoreBreakdown: {
    photoQuality: { score: number; max: number; note: string };
    descriptionDetail: { score: number; max: number; note: string };
    pricingClarity: { score: number; max: number; note: string };
    amenitiesCompleteness: { score: number; max: number; note: string };
    rulesAndPolicies: { score: number; max: number; note: string };
    locationPrecision: { score: number; max: number; note: string };
  };
  recommendations: string[];
}

export class ListingQualityService {
  /**
   * Calculates transparent listing quality score and suggestions
   */
  static evaluateQuality(propertyId: string): ListingQualityEvaluation {
    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as any;
    if (!prop) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const recommendations: string[] = [];

    // 1. Photos (Max 25 pts)
    let images: string[] = [];
    try {
      images = JSON.parse(prop.images_json || '[]');
    } catch {
      if (prop.cover_image) images = [prop.cover_image];
    }
    let photoScore = 0;
    let photoNote = '';
    if (images.length >= 5) {
      photoScore = 25;
      photoNote = `${images.length} photos uploaded (Excellent gallery)`;
    } else if (images.length >= 3) {
      photoScore = 18;
      photoNote = `${images.length} photos uploaded (Good, but adding 2 more boosts conversion)`;
      recommendations.push('Upload at least 5 photos showing room interior, bathroom, kitchen, and compound gate');
    } else if (images.length >= 1) {
      photoScore = 10;
      photoNote = `${images.length} photo uploaded (Limited gallery)`;
      recommendations.push('Add more photos of room, toilet, and electricity setup to boost student inquiries');
    } else {
      photoScore = 0;
      photoNote = 'No photos uploaded';
      recommendations.push('Upload high-resolution photos of the room and compound');
    }

    // 2. Description (Max 15 pts)
    const desc = prop.description || '';
    let descScore = 0;
    let descNote = '';
    if (desc.length >= 150) {
      descScore = 15;
      descNote = 'Comprehensive and clear accommodation description';
    } else if (desc.length >= 50) {
      descScore = 10;
      descNote = 'Basic description provided';
      recommendations.push('Expand description with landmark directions, generator hours, and security details');
    } else {
      descScore = 3;
      descNote = 'Very brief description';
      recommendations.push('Provide a thorough description explaining the environment and proximity to LAUTECH');
    }

    // 3. Pricing Clarity & Itemization (Max 20 pts)
    let pricingScore = 0;
    let pricingNote = '';
    if (prop.price && prop.caution_deposit !== undefined && prop.service_charge !== undefined) {
      pricingScore = 20;
      pricingNote = 'Fully itemized pricing (Rent, caution deposit, and service charges)';
    } else if (prop.price) {
      pricingScore = 12;
      pricingNote = 'Base price listed, caution/service charge not itemized';
      recommendations.push('Clearly itemize caution deposit and any service charges to eliminate student hesitation');
    } else {
      pricingScore = 0;
      pricingNote = 'Pricing information incomplete';
      recommendations.push('Enter accurate annual rent pricing');
    }

    // 4. Amenities Completeness (Max 20 pts)
    let amenities: string[] = [];
    try {
      amenities = JSON.parse(prop.amenities_json || '[]');
    } catch {
      if (typeof prop.amenities === 'string') amenities = prop.amenities.split(',');
    }
    let amenityScore = 0;
    let amenityNote = '';
    if (amenities.length >= 6) {
      amenityScore = 20;
      amenityNote = `${amenities.length} amenities verified and tagged`;
    } else if (amenities.length >= 3) {
      amenityScore = 14;
      amenityNote = `${amenities.length} amenities listed`;
      recommendations.push('Specify details for electricity backup (solar/generator), water source, and security');
    } else {
      amenityScore = 5;
      amenityNote = 'Few amenities selected';
      recommendations.push('Tag all available facilities (water, electricity, fenced gate, parking, etc.)');
    }

    // 5. Rules & Policies (Max 10 pts)
    let rules: string[] = [];
    try {
      rules = JSON.parse(prop.rules_json || '[]');
    } catch { /* empty */ }
    let rulesScore = 0;
    let rulesNote = '';
    if (rules.length >= 2 || prop.rules_notes) {
      rulesScore = 10;
      rulesNote = 'Clear hostel guidelines and curfew rules provided';
    } else {
      rulesScore = 4;
      rulesNote = 'No explicit hostel rules specified';
      recommendations.push('Add clear hostel guidelines (curfew, visitor policies, noise rules) for smooth tenancy');
    }

    // 6. Location Precision & Landmarks (Max 10 pts)
    let locScore = 0;
    let locNote = '';
    if (prop.latitude && prop.longitude && prop.area && prop.landmark_notes) {
      locScore = 10;
      locNote = 'Exact GPS pin and landmark directions verified';
    } else if (prop.area && (prop.latitude || prop.address)) {
      locScore = 7;
      locNote = 'Neighborhood specified, landmark details could be improved';
      recommendations.push('Add nearest popular LAUTECH landmark to help students locate the property easily');
    } else {
      locScore = 2;
      locNote = 'Incomplete location address';
      recommendations.push('Provide complete street address and neighborhood area in Ogbomoso');
    }

    const overallScore = photoScore + descScore + pricingScore + amenityScore + rulesScore + locScore;

    let scoreGrade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'INCOMPLETE' = 'GOOD';
    if (overallScore >= 85) scoreGrade = 'EXCELLENT';
    else if (overallScore >= 65) scoreGrade = 'GOOD';
    else if (overallScore >= 40) scoreGrade = 'NEEDS_IMPROVEMENT';
    else scoreGrade = 'INCOMPLETE';

    const evaluation: ListingQualityEvaluation = {
      propertyId,
      overallScore,
      scoreGrade,
      scoreBreakdown: {
        photoQuality: { score: photoScore, max: 25, note: photoNote },
        descriptionDetail: { score: descScore, max: 15, note: descNote },
        pricingClarity: { score: pricingScore, max: 20, note: pricingNote },
        amenitiesCompleteness: { score: amenityScore, max: 20, note: amenityNote },
        rulesAndPolicies: { score: rulesScore, max: 10, note: rulesNote },
        locationPrecision: { score: locScore, max: 10, note: locNote }
      },
      recommendations: recommendations.length > 0 ? recommendations : ['Your listing is complete and verified!']
    };

    // Cache to DB
    try {
      db.prepare(`
        INSERT INTO property_quality_scores (id, property_id, overall_score, score_breakdown_json, recommendations_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(property_id) DO UPDATE SET
          overall_score = excluded.overall_score,
          score_breakdown_json = excluded.score_breakdown_json,
          recommendations_json = excluded.recommendations_json,
          calculated_at = datetime('now')
      `).run(
        `pqs-${crypto.randomUUID()}`,
        propertyId,
        overallScore,
        JSON.stringify(evaluation.scoreBreakdown),
        JSON.stringify(evaluation.recommendations)
      );
    } catch (err) {
      console.warn('Failed to cache quality score:', err);
    }

    return evaluation;
  }

  /**
   * Scans for potential duplicate listings for Admin Review
   */
  static scanForDuplicateListings() {
    const properties = db.prepare(`
      SELECT p.id, p.provider_id, p.title, p.address, a.name as area, p.latitude, p.longitude
      FROM properties p
      LEFT JOIN areas a ON a.id = p.area_id
    `).all() as any[];
    const detectedFlags: any[] = [];

    for (let i = 0; i < properties.length; i++) {
      for (let j = i + 1; j < properties.length; j++) {
        const a = properties[i];
        const b = properties[j];

        let duplicateConfidence = 0;
        const reasons: string[] = [];

        // 1. Identical provider + similar title
        if (a.provider_id === b.provider_id) {
          if (a.title.toLowerCase().trim() === b.title.toLowerCase().trim()) {
            duplicateConfidence += 0.5;
            reasons.push('Identical title from same provider');
          }
        }

        // 2. Matching coordinates (< 20 meters)
        if (a.latitude && b.latitude && a.longitude && b.longitude) {
          const latDiff = Math.abs(a.latitude - b.latitude);
          const lonDiff = Math.abs(a.longitude - b.longitude);
          if (latDiff < 0.0002 && lonDiff < 0.0002) {
            duplicateConfidence += 0.4;
            reasons.push('Matching GPS pin location');
          }
        }

        // 3. Exact matching address & price
        if (a.address && b.address && a.address.toLowerCase().trim() === b.address.toLowerCase().trim()) {
          duplicateConfidence += 0.3;
          reasons.push('Matching physical address');
        }

        if (duplicateConfidence >= 0.6) {
          const flagId = `dup-${crypto.randomUUID()}`;
          try {
            db.prepare(`
              INSERT OR IGNORE INTO duplicate_listing_flags (
                id, property_id, flagged_duplicate_property_id, confidence_score, reason
              ) VALUES (?, ?, ?, ?, ?)
            `).run(flagId, a.id, b.id, duplicateConfidence, reasons.join(', '));
            
            detectedFlags.push({
              flagId,
              propertyA: { id: a.id, title: a.title, area: a.area },
              propertyB: { id: b.id, title: b.title, area: b.area },
              confidence: duplicateConfidence,
              reasons
            });
          } catch { /* ignore existing duplicate records */ }
        }
      }
    }

    return detectedFlags;
  }
}
