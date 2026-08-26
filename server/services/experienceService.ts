import db from '../db.js';
import crypto from 'crypto';
import { CommunityService } from './communityService.js';

export interface HostelExperienceItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  authorName: string;
  isVerifiedStay: boolean;
  isAnonymous: boolean;
  academicSession: string;
  durationMonths: number;
  electricityNotes?: string;
  waterNotes?: string;
  cleanlinessNotes?: string;
  securityNotes?: string;
  internetNotes?: string;
  noiseNotes?: string;
  locationNotes?: string;
  facilitiesNotes?: string;
  valueNotes?: string;
  overallExperience: string;
  positivesSummary?: string;
  concernsSummary?: string;
  helpfulCount: number;
  createdAt: string;
}

export class ExperienceService {
  /**
   * Post a structured hostel experience
   */
  static postExperience(data: {
    propertyId: string;
    userId: string;
    isAnonymous?: boolean;
    academicSession?: string;
    durationMonths?: number;
    electricityNotes?: string;
    waterNotes?: string;
    cleanlinessNotes?: string;
    securityNotes?: string;
    internetNotes?: string;
    noiseNotes?: string;
    locationNotes?: string;
    facilitiesNotes?: string;
    valueNotes?: string;
    overallExperience: string;
    positivesSummary?: string;
    concernsSummary?: string;
  }) {
    const {
      propertyId,
      userId,
      isAnonymous = false,
      academicSession = '2026/2027',
      durationMonths = 12,
      electricityNotes,
      waterNotes,
      cleanlinessNotes,
      securityNotes,
      internetNotes,
      noiseNotes,
      locationNotes,
      facilitiesNotes,
      valueNotes,
      overallExperience,
      positivesSummary,
      concernsSummary
    } = data;

    if (!overallExperience || overallExperience.trim().length < 15) {
      throw new Error('Please provide an overall experience description (at least 15 characters)');
    }

    // Verify property exists
    const prop = db.prepare('SELECT id, title FROM properties WHERE id = ?').get(propertyId) as any;
    if (!prop) {
      throw new Error('Hostel property not found');
    }

    // Check if user has a verified booking
    const booking = db.prepare(`
      SELECT id FROM bookings 
      WHERE student_id = ? AND property_id = ? AND status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
      LIMIT 1
    `).get(userId, propertyId) as any;

    const isVerifiedStay = Boolean(booking) ? 1 : 0;
    const expId = `exp-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO community_experiences (
        id, property_id, user_id, booking_id, is_verified_stay, is_anonymous,
        academic_session, duration_months, electricity_notes, water_notes,
        cleanliness_notes, security_notes, internet_notes, noise_notes,
        location_notes, facilities_notes, value_notes, overall_experience,
        positives_summary, concerns_summary, status, helpful_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'ACTIVE', 0
      )
    `).run(
      expId,
      propertyId,
      userId,
      booking?.id || null,
      isVerifiedStay,
      isAnonymous ? 1 : 0,
      academicSession,
      durationMonths,
      electricityNotes || null,
      waterNotes || null,
      cleanlinessNotes || null,
      securityNotes || null,
      internetNotes || null,
      noiseNotes || null,
      locationNotes || null,
      facilitiesNotes || null,
      valueNotes || null,
      overallExperience.trim(),
      positivesSummary || null,
      concernsSummary || null
    );

    return this.getExperienceDetail(expId);
  }

  /**
   * Get single experience detail
   */
  static getExperienceDetail(expId: string) {
    const r = db.prepare(`
      SELECT e.*, p.title as property_title, u.full_name as author_name
      FROM community_experiences e
      JOIN properties p ON p.id = e.property_id
      JOIN users u ON u.id = e.user_id
      WHERE e.id = ?
    `).get(expId) as any;

    if (!r) throw new Error('Experience not found');

    return {
      id: r.id,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      userId: r.user_id,
      authorName: r.is_anonymous ? 'Anonymous Student' : r.author_name,
      isVerifiedStay: Boolean(r.is_verified_stay),
      isAnonymous: Boolean(r.is_anonymous),
      academicSession: r.academic_session,
      durationMonths: r.duration_months,
      electricityNotes: r.electricity_notes,
      waterNotes: r.water_notes,
      cleanlinessNotes: r.cleanliness_notes,
      securityNotes: r.security_notes,
      internetNotes: r.internet_notes,
      noiseNotes: r.noise_notes,
      locationNotes: r.location_notes,
      facilitiesNotes: r.facilities_notes,
      valueNotes: r.value_notes,
      overallExperience: r.overall_experience,
      positivesSummary: r.positives_summary,
      concernsSummary: r.concerns_summary,
      helpfulCount: r.helpful_count || 0,
      createdAt: r.created_at
    };
  }

  /**
   * Get all experiences for a specific hostel listing or across community
   */
  static getExperiences(propertyId?: string, limit = 20) {
    let sql = `
      SELECT e.*, p.title as property_title, u.full_name as author_name
      FROM community_experiences e
      JOIN properties p ON p.id = e.property_id
      JOIN users u ON u.id = e.user_id
      WHERE e.status = 'ACTIVE'
    `;
    const params: any[] = [];

    if (propertyId) {
      sql += ' AND e.property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY e.is_verified_stay DESC, e.helpful_count DESC, e.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      userId: r.user_id,
      authorName: r.is_anonymous ? 'Anonymous Student' : r.author_name,
      isVerifiedStay: Boolean(r.is_verified_stay),
      isAnonymous: Boolean(r.is_anonymous),
      academicSession: r.academic_session,
      durationMonths: r.duration_months,
      electricityNotes: r.electricity_notes,
      waterNotes: r.water_notes,
      cleanlinessNotes: r.cleanliness_notes,
      securityNotes: r.security_notes,
      internetNotes: r.internet_notes,
      noiseNotes: r.noise_notes,
      locationNotes: r.location_notes,
      facilitiesNotes: r.facilities_notes,
      valueNotes: r.value_notes,
      overallExperience: r.overall_experience,
      positivesSummary: r.positives_summary,
      concernsSummary: r.concerns_summary,
      helpfulCount: r.helpful_count || 0,
      createdAt: r.created_at
    }));
  }

  /**
   * Get comprehensive Student Insights for a specific hostel listing
   */
  static getHostelStudentInsights(propertyId: string) {
    const experiences = this.getExperiences(propertyId, 10);
    const { questions } = CommunityService.getQuestions({ propertyId, limit: 5 });

    // Aggregate positives and concerns
    const positives: string[] = [];
    const concerns: string[] = [];

    for (const exp of experiences) {
      if (exp.positivesSummary) positives.push(exp.positivesSummary);
      if (exp.concernsSummary) concerns.push(exp.concernsSummary);
    }

    // Fallback based on verified data if community notes are sparse
    if (positives.length === 0) {
      positives.push('Physical compound verification completed');
      positives.push('Transparent mandatory pricing');
    }
    if (concerns.length === 0) {
      concerns.push('Inquire with caretaker about power generator scheduling during exams');
    }

    return {
      propertyId,
      totalExperiencesCount: experiences.length,
      verifiedStayCount: experiences.filter(e => e.isVerifiedStay).length,
      commonPositives: Array.from(new Set(positives)),
      commonConcerns: Array.from(new Set(concerns)),
      recentExperiences: experiences,
      relevantQuestions: questions
    };
  }
}
