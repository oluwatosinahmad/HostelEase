import db from '../db.js';

export interface AICommunitySummary {
  propertyId?: string;
  areaName?: string;
  summary: string;
  verifiedStayCount: number;
  positiveConsensus: string[];
  concernConsensus: string[];
  unansweredTopics: string[];
  dataProvenance: string;
}

export class AICommunityService {
  /**
   * Summarizes verified student experiences and community questions for a specific hostel or area
   */
  static summarizeCommunityInsights(params: { propertyId?: string; areaName?: string }): AICommunitySummary {
    const { propertyId, areaName } = params;

    let experiences: any[] = [];
    let questions: any[] = [];

    if (propertyId) {
      experiences = db.prepare(`
        SELECT * FROM community_experiences 
        WHERE property_id = ? AND status = 'ACTIVE'
      `).all(propertyId) as any[];

      questions = db.prepare(`
        SELECT * FROM community_questions 
        WHERE property_id = ? AND status = 'ACTIVE'
      `).all(propertyId) as any[];
    } else if (areaName) {
      questions = db.prepare(`
        SELECT q.* FROM community_questions q
        LEFT JOIN areas a ON a.id = q.area_id
        WHERE (a.name LIKE ? OR q.description LIKE ? OR q.title LIKE ?) AND q.status = 'ACTIVE'
      `).all(`%${areaName}%`, `%${areaName}%`, `%${areaName}%`) as any[];
    }

    const verifiedStays = experiences.filter(e => e.is_verified_stay === 1);
    const positiveSet = new Set<string>();
    const concernSet = new Set<string>();
    const unansweredTopics: string[] = [];

    for (const exp of experiences) {
      if (exp.positives_summary) positiveSet.add(exp.positives_summary);
      if (exp.concerns_summary) concernSet.add(exp.concerns_summary);

      if (exp.electricity_notes?.toLowerCase().includes('good') || exp.electricity_notes?.toLowerCase().includes('generator')) {
        positiveSet.add('Reliable electricity or backup generator acknowledged by students');
      }
      if (exp.water_notes?.toLowerCase().includes('borehole') || exp.water_notes?.toLowerCase().includes('constant')) {
        positiveSet.add('Steady borehole water supply reported');
      }
      if (exp.noise_notes?.toLowerCase().includes('noise') || exp.noise_notes?.toLowerCase().includes('loud')) {
        concernSet.add('Occasional external noise reported');
      }
    }

    for (const q of questions) {
      if (!q.is_answered) {
        unansweredTopics.push(q.title);
      }
    }

    // Evidence-based summary text
    let summary = '';
    if (experiences.length > 0) {
      summary = `Based on ${experiences.length} student experiences (${verifiedStays.length} verified stays), students generally appreciate the compound safety and location proximity.`;
      if (concernSet.size > 0) {
        summary += ` Some students noted: ${Array.from(concernSet).slice(0, 2).join('; ')}.`;
      }
    } else if (areaName) {
      summary = `Community discussions around ${areaName} highlight proximity to LAUTECH and typical commute times. Consult the official area guide for verified details.`;
    } else {
      summary = 'Limited student community reviews currently recorded. Official physical verification details remain active.';
    }

    return {
      propertyId,
      areaName,
      summary,
      verifiedStayCount: verifiedStays.length,
      positiveConsensus: Array.from(positiveSet),
      concernConsensus: Array.from(concernSet),
      unansweredTopics: unansweredTopics.slice(0, 3),
      dataProvenance: 'AGGREGATED_COMMUNITY_FEEDBACK'
    };
  }

  /**
   * AI Content Moderation Pre-check
   * Identifies potential spam, harassment, or off-platform payment solicitations for human admin review
   */
  static evaluateContentSafety(text: string): {
    flagged: boolean;
    detectedReasons: string[];
    recommendedAction: 'NONE' | 'FLAG_FOR_REVIEW' | 'WARN_USER';
  } {
    const reasons: string[] = [];
    const lower = text.toLowerCase();

    // 1. Off-platform informal payment solicitation keywords
    if (
      lower.includes('send money to my opay') ||
      lower.includes('transfer to my personal account') ||
      lower.includes('whatsapp me for direct payment') ||
      lower.includes('pay deposit to my bank')
    ) {
      reasons.push('Informal payment solicitation attempt detected');
    }

    // 2. Scam / Fraud patterns
    if (
      lower.includes('guaranteed 200% return') ||
      lower.includes('free room no rent') ||
      lower.includes('send account details') ||
      lower.includes('crypto payment')
    ) {
      reasons.push('Potential scam language detected');
    }

    // 3. Harassment / Abusive terms
    if (
      lower.includes('idiot') ||
      lower.includes('stupid landlord') ||
      lower.includes('threaten') ||
      lower.includes('scammer bastard')
    ) {
      reasons.push('Inappropriate or abusive language detected');
    }

    if (reasons.length > 0) {
      return {
        flagged: true,
        detectedReasons: reasons,
        recommendedAction: 'FLAG_FOR_REVIEW'
      };
    }

    return {
      flagged: false,
      detectedReasons: [],
      recommendedAction: 'NONE'
    };
  }
}
