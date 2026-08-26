import db from '../db';
import crypto from 'crypto';

export interface AISearchCriteria {
  minBudget?: number;
  maxBudget?: number;
  areaName?: string;
  areaId?: string;
  maxDistanceKm?: number;
  roomType?: string;
  genderPreference?: string;
  requiredFacilities?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

export interface AIResponsePayload {
  message: string;
  structuredData?: {
    type: 'HOSTEL_LIST' | 'HOSTEL_COMPARISON' | 'INSPECTION_CHECKLIST' | 'SCAM_ALERT' | 'ACTION_CONFIRMATION' | 'DASHBOARD_SUMMARY' | 'CLARIFYING_QUESTION';
    properties?: any[];
    comparison?: any;
    checklist?: any;
    scamAssessment?: any;
    actionPrompt?: {
      actionType: 'SAVE_HOSTEL' | 'REQUEST_INSPECTION' | 'VIEW_BOOKING' | 'PAY_NOW' | 'APPLY_FILTERS';
      title: string;
      description: string;
      payload: any;
      confirmLabel: string;
      cancelLabel: string;
    };
    suggestedQueries?: string[];
  };
  toolCallsExecuted?: string[];
}

export class AIAssistantService {
  // -------------------------------------------------------------------------
  // 1. TOOL: Search Hostels with Real Database Records
  // -------------------------------------------------------------------------
  static searchHostels(criteria: AISearchCriteria, studentId?: string) {
    const params: any[] = [];
    let query = `
      SELECT DISTINCT p.id, p.title, p.address, p.distance_from_campus_km, p.property_type,
             p.gender_preference, p.verification_status, p.availability_status,
             (SELECT pm.url FROM property_media pm WHERE pm.property_id = p.id AND pm.is_cover = 1 LIMIT 1) as cover_image,
             p.total_rooms, p.latitude, p.longitude, p.updated_at,
             a.name as area_name,
             pp.rent_amount, pp.service_charge, pp.caution_fee, pp.agency_fee, pp.other_mandatory_charges,
             (COALESCE(pp.rent_amount, 0) + COALESCE(pp.service_charge, 0) + COALESCE(pp.caution_fee, 0) + COALESCE(pp.agency_fee, 0) + COALESCE(pp.other_mandatory_charges, 0)) as total_mandatory_cost
      FROM properties p
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN prices pp ON p.id = pp.property_id
      LEFT JOIN rooms r ON p.id = r.property_id
      WHERE p.verification_status = 'APPROVED'
    `;

    if (criteria.minBudget) {
      query += ` AND pp.rent_amount >= ?`;
      params.push(criteria.minBudget);
    }
    if (criteria.maxBudget) {
      query += ` AND pp.rent_amount <= ?`;
      params.push(criteria.maxBudget);
    }
    if (criteria.areaName) {
      query += ` AND LOWER(a.name) LIKE ?`;
      params.push(`%${criteria.areaName.toLowerCase()}%`);
    } else if (criteria.areaId && criteria.areaId !== 'all') {
      query += ` AND p.area_id = ?`;
      params.push(criteria.areaId);
    }
    if (criteria.maxDistanceKm) {
      query += ` AND p.distance_from_campus_km <= ?`;
      params.push(criteria.maxDistanceKm);
    }
    if (criteria.genderPreference && criteria.genderPreference !== 'ANY') {
      query += ` AND (p.gender_preference = ? OR p.gender_preference = 'ANY')`;
      params.push(criteria.genderPreference);
    }
    if (criteria.roomType && criteria.roomType !== 'all') {
      query += ` AND (p.property_type = ? OR r.room_type = ?)`;
      params.push(criteria.roomType, criteria.roomType);
    }

    query += ` ORDER BY p.verification_status = 'APPROVED' DESC, p.distance_from_campus_km ASC LIMIT ?`;
    params.push(criteria.limit || 6);

    const rows = db.prepare(query).all(...params) as any[];

    // Fetch key amenities for returned properties
    return rows.map(p => {
      const amenities = db.prepare(`
        SELECT a.name, a.icon, a.category 
        FROM property_amenities pa
        JOIN amenities a ON pa.amenity_id = a.id
        WHERE pa.property_id = ?
        LIMIT 6
      `).all(p.id) as any[];

      // Check available bedspaces
      const bedspaceCount = db.prepare(`
        SELECT COUNT(*) as available_count
        FROM bedspaces b
        JOIN rooms r ON b.room_id = r.id
        WHERE r.property_id = ? AND b.is_occupied = 0 AND b.status = 'AVAILABLE'
      `).get(p.id) as any;

      return {
        id: p.id,
        title: p.title,
        address: p.address,
        areaName: p.area_name || 'LAUTECH Off-Campus',
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        rentAmount: p.rent_amount || 0,
        totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0,
        availableBedspaces: bedspaceCount?.available_count || 0,
        amenities: amenities.map(a => a.name),
        updatedAt: p.updated_at
      };
    });
  }

  // -------------------------------------------------------------------------
  // 2. TOOL: Get Complete Verified Hostel Details
  // -------------------------------------------------------------------------
  static getHostelDetails(propertyId: string) {
    const prop = db.prepare(`
      SELECT p.*, a.name as area_name, u.full_name as provider_name, u.phone as provider_phone,
             pp.rent_amount, pp.service_charge, pp.caution_fee, pp.agency_fee, pp.other_mandatory_charges,
             pp.is_negotiable, pp.period
      FROM properties p
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN users u ON p.provider_id = u.id
      LEFT JOIN prices pp ON p.id = pp.property_id
      WHERE p.id = ?
    `).get(propertyId) as any;

    if (!prop) return null;

    const rooms = db.prepare(`SELECT * FROM rooms WHERE property_id = ?`).all(propertyId) as any[];
    const amenities = db.prepare(`
      SELECT a.name, a.category, a.icon, pa.is_available
      FROM property_amenities pa
      JOIN amenities a ON pa.amenity_id = a.id
      WHERE pa.property_id = ?
    `).all(propertyId) as any[];

    const totalMandatory = (prop.rent_amount || 0) + (prop.service_charge || 0) + 
                           (prop.caution_fee || 0) + (prop.agency_fee || 0) + 
                           (prop.other_mandatory_charges || 0);

    return {
      id: prop.id,
      title: prop.title,
      description: prop.description,
      address: prop.address,
      areaName: prop.area_name,
      distanceFromCampusKm: prop.distance_from_campus_km,
      propertyType: prop.property_type,
      genderPreference: prop.gender_preference,
      verificationStatus: prop.verification_status,
      availabilityStatus: prop.availability_status,
      coverImage: (db.prepare(`SELECT url FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1`).get(prop.id) as any)?.url || null,
      providerName: prop.provider_name,
      providerPhone: prop.provider_phone,
      pricing: {
        rentAmount: prop.rent_amount || 0,
        serviceCharge: prop.service_charge || 0,
        cautionDeposit: prop.caution_fee || 0,
        agencyFee: prop.agency_fee || 0,
        otherCharges: prop.other_mandatory_charges || 0,
        totalMandatoryCost: totalMandatory,
        isNegotiable: Boolean(prop.is_negotiable),
        period: prop.period || 'per year'
      },
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.room_name,
        type: r.room_type,
        maxOccupants: r.max_occupants,
        quantityTotal: r.quantity_total,
        quantityAvailable: r.quantity_available,
        isEnsuite: Boolean(r.is_ensuite),
        isFurnished: Boolean(r.is_furnished)
      })),
      amenities: amenities.map(a => ({ name: a.name, category: a.category, icon: a.icon })),
      updatedAt: prop.updated_at
    };
  }

  // -------------------------------------------------------------------------
  // 3. TOOL: Compare Multiple Hostels Side-by-Side
  // -------------------------------------------------------------------------
  static compareHostels(propertyIds: string[]) {
    const validIds = propertyIds.slice(0, 4);
    const properties = validIds.map(id => this.getHostelDetails(id)).filter(Boolean) as any[];

    if (properties.length === 0) return null;

    // Analyze differences
    const cheapest = [...properties].sort((a, b) => a.pricing.rentAmount - b.pricing.rentAmount)[0];
    const closest = [...properties].sort((a, b) => a.distanceFromCampusKm - b.distanceFromCampusKm)[0];
    const mostAmenities = [...properties].sort((a, b) => b.amenities.length - a.amenities.length)[0];

    return {
      properties,
      insights: {
        cheapest: { id: cheapest.id, title: cheapest.title, rentAmount: cheapest.pricing.rentAmount },
        closest: { id: closest.id, title: closest.title, distanceKm: closest.distanceFromCampusKm },
        mostEquipped: { id: mostAmenities.id, title: mostAmenities.title, amenityCount: mostAmenities.amenities.length }
      }
    };
  }

  // -------------------------------------------------------------------------
  // 4. TOOL: Get Authenticated Student Context
  // -------------------------------------------------------------------------
  static getStudentContext(studentId: string) {
    // 1. Preferences
    const preferences = db.prepare(`SELECT * FROM student_preferences WHERE user_id = ?`).get(studentId) as any;

    // 2. Saved Properties
    const saved = db.prepare(`
      SELECT p.id, p.title, p.distance_from_campus_km, pp.rent_amount,
             (SELECT pm.url FROM property_media pm WHERE pm.property_id = p.id AND pm.is_cover = 1 LIMIT 1) as cover_image
      FROM saved_properties sp
      JOIN properties p ON sp.property_id = p.id
      LEFT JOIN prices pp ON p.id = pp.property_id
      WHERE sp.user_id = ?
    `).all(studentId) as any[];

    // 3. Bookings
    const bookings = db.prepare(`
      SELECT b.id, b.booking_reference, b.status, b.payment_status, b.move_in_date, b.total_cost,
             p.id as property_id, p.title as property_title, r.room_name as room_name
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.student_id = ?
      ORDER BY b.created_at DESC
    `).all(studentId) as any[];

    // 4. Inspections
    const inspections = db.prepare(`
      SELECT ir.id, ir.inspection_type, ir.preferred_date, ir.preferred_time, ir.status,
             p.id as property_id, p.title as property_title
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.student_id = ?
      ORDER BY ir.created_at DESC
    `).all(studentId) as any[];

    // 5. Payments
    const payments = db.prepare(`
      SELECT py.id, py.payment_reference, py.amount, py.status, py.paid_at, py.created_at,
             b.booking_reference, p.title as property_title
      FROM payments py
      JOIN bookings b ON py.booking_id = b.id
      JOIN properties p ON b.property_id = p.id
      WHERE py.student_id = ?
      ORDER BY py.created_at DESC
    `).all(studentId) as any[];

    return {
      preferences: preferences ? {
        minBudget: preferences.min_budget,
        maxBudget: preferences.max_budget,
        preferredAreas: JSON.parse(preferences.preferred_areas_json || '[]'),
        maxDistanceKm: preferences.max_distance_km
      } : null,
      savedHostels: saved,
      bookings,
      inspections,
      payments
    };
  }

  // -------------------------------------------------------------------------
  // 5. TOOL: Generate Categorized Inspection Checklist
  // -------------------------------------------------------------------------
  static generateInspectionChecklist(propertyId?: string) {
    let propTitle = 'Hostel';
    let propDetails: any = null;
    if (propertyId) {
      propDetails = this.getHostelDetails(propertyId);
      if (propDetails) propTitle = propDetails.title;
    }

    return {
      propertyTitle: propTitle,
      propertyId: propertyId || null,
      categories: [
        {
          name: 'Room & Ventilation',
          icon: 'Bed',
          checks: [
            'Test windows to ensure they open, close, and latch securely for cross-ventilation.',
            'Inspect the door lock mechanism, hinges, and deadbolt integrity.',
            'Check for active wall dampness, roof leak stains, or mold on the ceiling.',
            'Test all electric wall sockets and ceiling lamp fixtures with a phone charger.'
          ]
        },
        {
          name: 'Water Supply & Plumbing',
          icon: 'Droplets',
          checks: [
            'Turn on bathroom and kitchen taps to verify water pressure and cleanliness.',
            'Ask the landlord/caretaker: Is water pumped via electric borehole, well, or tanker?',
            'Confirm the water pumping schedule and whether there is an overhead reservoir storage tank.',
            'Inspect bathroom drainage to confirm water drains freely without pooling.'
          ]
        },
        {
          name: 'Electricity & Backup Power',
          icon: 'Zap',
          checks: [
            'Ask current residents about the feeder line reliability in this LAUTECH neighborhood.',
            'Confirm if the hostel uses a dedicated prepaid meter or shared billing system.',
            'Ask about generator / inverter usage policies and fueling cost distribution.'
          ]
        },
        {
          name: 'Security & Safety',
          icon: 'ShieldCheck',
          checks: [
            'Check perimeter wall height, barbed wire, and main gate locking schedule at night.',
            'Confirm if there is a resident security guard or night caretaker.',
            'Examine the lighting in surrounding access roads and walkways for night safety.'
          ]
        },
        {
          name: 'Financial Transparency',
          icon: 'Receipt',
          checks: [
            'Verify that the total rent matches the listed Hostel Ease figures exactly.',
            'Confirm what happens to the caution deposit at move-out (refundable terms).',
            'Ensure all payments are recorded on Hostel Ease to guarantee platform escrow protection.'
          ]
        }
      ]
    };
  }

  // -------------------------------------------------------------------------
  // 6. TOOL: Scam & Risk Assessment
  // -------------------------------------------------------------------------
  static evaluateScamRisk(userPrompt: string) {
    const lower = userPrompt.toLowerCase();
    const flags: string[] = [];

    if (lower.includes('outside') || lower.includes('direct transfer') || lower.includes('personal account') || lower.includes('pay to my account') || lower.includes('whatsapp') || lower.includes('transfer') || lower.includes('wire')) {
      flags.push('Requesting direct payment or off-platform communication outside Hostel Ease escrow protection.');
    }
    if (lower.includes('before inspection') || lower.includes('before i can inspect') || lower.includes('before i inspect') || lower.includes('pay before') || lower.includes('commitment fee') || lower.includes('booking fee before') || lower.includes('transfer') && lower.includes('before')) {
      flags.push('Demanding upfront payment, booking fee, or "viewing fee" before physical or virtual tour.');
    }
    if (lower.includes('hurry') || lower.includes('pay now or lose it') || lower.includes('another student is paying')) {
      flags.push('Applying excessive urgency/pressure to force immediate financial commitment.');
    }
    if (lower.includes('refuse inspection') || lower.includes('cannot see the room') || lower.includes('key is with someone else')) {
      flags.push('Refusing or delaying reasonable physical or live video inspection.');
    }

    const isHighRisk = flags.length > 0;

    return {
      isHighRisk,
      warningFlags: flags,
      advice: isHighRisk
        ? '⚠️ Caution: This behavior exhibits critical accommodation warning signs and possible scam tactics. On Hostel Ease, NEVER make direct off-platform bank transfers or pay before inspecting. Always inspect the hostel physically or via verified live video first, and pay exclusively through Hostel Ease to guarantee verified receipts and escrow refund protections.'
        : '✅ Standard Safety Rule: Always request a physical or virtual inspection before reserving, verify the provider profile, and make all payments through the Hostel Ease secure gateway.'
    };
  }

  // -------------------------------------------------------------------------
  // 7. ACTION EXECUTOR: Execute Confirmed User Action
  // -------------------------------------------------------------------------
  static executeConfirmedAction(actionType: string, payload: any, studentId: string) {
    if (actionType === 'SAVE_HOSTEL') {
      const { propertyId } = payload;
      if (!propertyId) throw new Error('Missing propertyId');
      
      const existing = db.prepare(`SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?`).get(studentId, propertyId);
      if (!existing) {
        const id = `saved-${crypto.randomUUID()}`;
        db.prepare(`INSERT INTO saved_properties (id, user_id, property_id) VALUES (?, ?, ?)`).run(id, studentId, propertyId);
      }
      return { success: true, message: 'Hostel successfully saved to your shortlist!' };
    }

    if (actionType === 'REQUEST_INSPECTION') {
      const { propertyId, inspectionType = 'PHYSICAL', preferredDate, preferredTime = '10:00 AM', notes } = payload;
      if (!propertyId || !preferredDate) throw new Error('Property and preferred date are required');

      const prop = db.prepare(`SELECT title, provider_id FROM properties WHERE id = ?`).get(propertyId) as any;
      if (!prop) throw new Error('Property not found');

      const inspectionId = `insp-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO inspection_requests (id, student_id, property_id, inspection_type, preferred_date, preferred_time, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(inspectionId, studentId, propertyId, inspectionType, preferredDate, preferredTime, notes || 'Requested via AI Accommodation Assistant');

      return { 
        success: true, 
        inspectionId, 
        message: `Inspection request submitted for ${prop.title} on ${preferredDate} at ${preferredTime}. The landlord has been notified.` 
      };
    }

    throw new Error(`Unsupported action type: ${actionType}`);
  }

  // -------------------------------------------------------------------------
  // 8. NATURAL LANGUAGE PROCESSOR & HYBRID ASSISTANT ENGINE
  // -------------------------------------------------------------------------
  static async processStudentQuery(
    prompt: string,
    studentId: string,
    context?: { propertyId?: string; contextType?: string }
  ): Promise<AIResponsePayload> {
    const lower = prompt.toLowerCase();
    const toolCallsExecuted: string[] = [];

    // Check Save / Bookmark Action Request
    if (lower.includes('save') || lower.includes('shortlist') || lower.includes('bookmark')) {
      let targetProp: any = null;
      if (context?.propertyId) {
        targetProp = this.getHostelDetails(context.propertyId);
      } else {
        const allProps = db.prepare("SELECT * FROM properties WHERE verification_status = 'APPROVED'").all() as any[];
        targetProp = allProps.find(p => lower.includes(p.title.toLowerCase())) || allProps[0];
      }
      if (targetProp) {
        toolCallsExecuted.push('saveHostel');
        return {
          message: `I found **${targetProp.title}**. Would you like me to save it to your personal shortlist?`,
          structuredData: {
            type: 'ACTION_CONFIRMATION',
            actionPrompt: {
              actionType: 'SAVE_HOSTEL',
              title: `Save ${targetProp.title} to Shortlist`,
              description: `This will keep ${targetProp.title} pinned on your dashboard for quick access and price tracking.`,
              payload: { propertyId: targetProp.id },
              confirmLabel: 'Yes, Save to Shortlist',
              cancelLabel: 'Cancel'
            },
            suggestedQueries: [
              'Show my saved hostels',
              'Compare my saved hostels',
              'Give me an inspection checklist'
            ]
          },
          toolCallsExecuted
        };
      }
    }

    // Check Scam / Safety Inquiry
    if (
      lower.includes('scam') || lower.includes('outside') || lower.includes('suspicious') ||
      lower.includes('pay before') || lower.includes('direct transfer') || lower.includes('agent asking') ||
      lower.includes('whatsapp') || lower.includes('transfer') || lower.includes('is that safe') || lower.includes('is this safe')
    ) {
      toolCallsExecuted.push('evaluateScamRisk');
      const assessment = this.evaluateScamRisk(prompt);
      return {
        message: assessment.advice,
        structuredData: {
          type: 'SCAM_ALERT',
          scamAssessment: assessment,
          suggestedQueries: [
            'How does Hostel Ease protect my payment?',
            'How do I schedule a verified inspection?',
            'Show me verified hostels under ₦200k'
          ]
        },
        toolCallsExecuted
      };
    }

    // Check Inspection Checklist inquiry
    if (
      lower.includes('checklist') || lower.includes('what to check') || lower.includes('what should i check') ||
      lower.includes('prepare for inspection') || lower.includes('questions to ask') || lower.includes('inspecting')
    ) {
      toolCallsExecuted.push('generateInspectionChecklist');
      const checklist = this.generateInspectionChecklist(context?.propertyId);
      return {
        message: `Here is a comprehensive accommodation inspection checklist for your upcoming visit to ${checklist.propertyTitle}. Use these practical checks to ensure the room, power, water, and security meet your standards before paying rent:`,
        structuredData: {
          type: 'INSPECTION_CHECKLIST',
          checklist,
          suggestedQueries: [
            'Find verified hostels near LAUTECH Under G',
            'What are the mandatory fees for hostels?',
            'What do I do next on my dashboard?'
          ]
        },
        toolCallsExecuted
      };
    }

    // Check Comparison inquiry
    if (
      lower.includes('compare') || lower.includes('difference between') || lower.includes('which one is better') ||
      lower.includes('cheapest hostels') || lower.includes('closest to lautech')
    ) {
      toolCallsExecuted.push('searchHostels');
      toolCallsExecuted.push('compareHostels');

      const allProps = db.prepare("SELECT * FROM properties WHERE verification_status = 'APPROVED'").all() as any[];
      const mentionedProps = allProps.filter(p => lower.includes(p.title.toLowerCase()));

      let propertiesToCompare: any[] = [];
      if (mentionedProps.length >= 2) {
        propertiesToCompare = mentionedProps;
      } else {
        propertiesToCompare = this.searchHostels({ limit: 3 }, studentId);
      }

      const comparison = this.compareHostels(propertiesToCompare.map(p => p.id));

      if (comparison) {
        const titles = comparison.properties.map(p => p.title).join(' and ');
        return {
          message: `I've prepared a side-by-side comparison of **${titles}**. Here is an honest breakdown of pricing, proximity to campus gates, and verified amenities:`,
          structuredData: {
            type: 'HOSTEL_COMPARISON',
            comparison,
            properties: comparison.properties,
            suggestedQueries: [
              'Give me an inspection checklist for these hostels',
              'Show me hostels under ₦150,000',
              'Are these hostels verified by Hostel Ease?'
            ]
          },
          toolCallsExecuted
        };
      }
    }

    // Check Contextual Single Property Inquiry (if propertyId provided or property title mentioned)
    let singlePropTargetId = context?.propertyId;
    if (!singlePropTargetId) {
      const allApproved = db.prepare("SELECT id, title FROM properties WHERE verification_status = 'APPROVED'").all() as any[];
      const found = allApproved.find(p => lower.includes(p.title.toLowerCase()));
      if (found && (lower.includes('fee') || lower.includes('rule') || lower.includes('detail') || lower.includes('price') || lower.includes('about') || lower.includes('available') || lower.includes('facility') || lower.includes('where') || lower.includes('what'))) {
        singlePropTargetId = found.id;
      }
    }

    if (singlePropTargetId && (context?.contextType === 'HOSTEL_DETAILS' || lower.includes('this hostel') || lower.includes('fee') || lower.includes('rule') || lower.includes('rent') || lower.includes('available') || lower.includes('facilities') || lower.includes('how far') || lower.includes('cost') || lower.includes('what'))) {
      toolCallsExecuted.push('getHostelDetails');
      const details = this.getHostelDetails(singlePropTargetId);

      if (details) {
        let answer = `**${details.title}** is located in **${details.areaName}**, approximately **${details.distanceFromCampusKm}km** from the LAUTECH campus.\n\n`;
        answer += `• **Annual Rent:** ₦${details.pricing.rentAmount.toLocaleString()}\n`;
        answer += `• **Total Initial Cost (Rent + Fees):** ₦${details.pricing.totalMandatoryCost.toLocaleString()}\n`;
        answer += `• **Verification Status:** ${details.verificationStatus === 'APPROVED' ? '✅ Verified by Hostel Ease' : '⏳ Pending Verification'}\n`;
        answer += `• **Availability:** ${details.availabilityStatus} (Updated on ${new Date(details.updatedAt).toLocaleDateString('en-GB')})\n`;
        answer += `• **Key Facilities:** ${details.amenities.map((a: any) => a.name).join(', ') || 'Standard accommodation amenities'}`;

        return {
          message: answer,
          structuredData: {
            type: 'HOSTEL_LIST',
            properties: [details],
            actionPrompt: {
              actionType: 'REQUEST_INSPECTION',
              title: `Schedule Inspection for ${details.title}`,
              description: `Would you like to book a free physical or virtual tour with the landlord?`,
              payload: {
                propertyId: details.id,
                inspectionType: 'PHYSICAL',
                preferredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                preferredTime: '11:00 AM'
              },
              confirmLabel: 'Yes, Schedule Inspection',
              cancelLabel: 'Not Now'
            },
            suggestedQueries: [
              'Give me an inspection checklist for this hostel',
              'Compare this with other hostels nearby',
              'Are there hidden charges?'
            ]
          },
          toolCallsExecuted
        };
      }
    }

    // Check Student Dashboard & Personal State inquiries
    if (
      lower.includes('my booking') || lower.includes('my inspection') || lower.includes('my payment') ||
      lower.includes('what do i need to do') || lower.includes('what next') || lower.includes('saved hostels') ||
      lower.includes('my status')
    ) {
      toolCallsExecuted.push('getStudentContext');
      const ctx = this.getStudentContext(studentId);

      let statusMsg = `Here is your current Hostel Ease status summary:\n\n`;
      statusMsg += `• **Active / Pending Bookings:** ${ctx.bookings.length}\n`;
      statusMsg += `• **Scheduled Inspections:** ${ctx.inspections.length}\n`;
      statusMsg += `• **Saved Hostels on Shortlist:** ${ctx.savedHostels.length}\n`;
      statusMsg += `• **Payment Transactions:** ${ctx.payments.length}\n\n`;

      if (ctx.bookings.some(b => b.status === 'CONFIRMED' && b.payment_status !== 'PAID')) {
        const unpaid = ctx.bookings.find(b => b.status === 'CONFIRMED' && b.payment_status !== 'PAID');
        statusMsg += `⚠️ **Urgent Action:** You have a confirmed reservation for **${unpaid.property_title}** awaiting payment (₦${unpaid.total_cost.toLocaleString()}).`;
      } else if (ctx.inspections.some(i => i.status === 'CONFIRMED')) {
        const insp = ctx.inspections.find(i => i.status === 'CONFIRMED');
        statusMsg += `📅 **Upcoming Tour:** You have an inspection scheduled for **${insp.property_title}** on ${insp.preferred_date} at ${insp.preferred_time}.`;
      } else if (ctx.savedHostels.length > 0) {
        statusMsg += `💡 You have **${ctx.savedHostels.length}** saved hostels in your shortlist. Would you like me to compare them for you?`;
      } else {
        statusMsg += `Ready to start? Tell me your preferred budget and location around LAUTECH (e.g. Under G, Adenike, Stadium) to see top matches.`;
      }

      return {
        message: statusMsg,
        structuredData: {
          type: 'DASHBOARD_SUMMARY',
          suggestedQueries: [
            'Find hostels under ₦180k near Under G',
            'Compare my saved hostels',
            'Give me questions to ask during my inspection'
          ]
        },
        toolCallsExecuted
      };
    }

    // Natural Language Search & Structured Query Parser
    const criteria: AISearchCriteria = {};

    // 1. Budget extraction
    const budgetMatch = lower.match(/(?:₦|n|ngn)?\s*(\d{2,3})k\b/) || lower.match(/(?:₦|n|ngn)?\s*(\d{5,6})\b/);
    if (budgetMatch) {
      let num = parseInt(budgetMatch[1]);
      if (num < 1000) num = num * 1000;
      criteria.maxBudget = num;
      if (lower.includes('between') || lower.includes('from')) {
        criteria.minBudget = Math.max(50000, num - 50000);
      }
    }

    // 2. Area extraction
    const areas = ['under g', 'adenike', 'stadium', 'caretaker', 'aroje', 'high school', 'general', 'randa', 'isale general'];
    for (const a of areas) {
      if (lower.includes(a)) {
        criteria.areaName = a;
        break;
      }
    }

    // 3. Proximity / Distance extraction
    if (lower.includes('close') || lower.includes('near') || lower.includes('walking distance') || lower.includes('gate')) {
      criteria.maxDistanceKm = 1.5;
    }

    // 4. Gender preference
    if (lower.includes('female') || lower.includes('girl') || lower.includes('ladies')) {
      criteria.genderPreference = 'FEMALE_ONLY';
    } else if (lower.includes('male') || lower.includes('guy') || lower.includes('boys')) {
      criteria.genderPreference = 'MALE_ONLY';
    }

    // 5. Room Type
    if (lower.includes('self contain') || lower.includes('self-contain') || lower.includes('studio') || lower.includes('single')) {
      criteria.roomType = 'SELF_CONTAIN';
    } else if (lower.includes('flat') || lower.includes('apartment') || lower.includes('2 bedroom')) {
      criteria.roomType = 'FLAT';
    }

    // 6. Verified only
    if (lower.includes('verified') || lower.includes('trusted') || lower.includes('approved')) {
      criteria.verifiedOnly = true;
    }

    // Execute Search Tool
    toolCallsExecuted.push('searchHostels');
    const matchedProperties = this.searchHostels(criteria, studentId);

    if (matchedProperties.length === 0) {
      // Broaden search if exact filters produced 0 matches
      const fallbackProperties = this.searchHostels({ limit: 4 }, studentId);
      return {
        message: `I couldn't find an exact match for your specific search criteria right now, but here are some of the closest available verified accommodations near LAUTECH campus:`,
        structuredData: {
          type: 'HOSTEL_LIST',
          properties: fallbackProperties,
          suggestedQueries: [
            'Show me hostels under ₦200,000',
            'Find hostels near LAUTECH Under G',
            'Give me an inspection checklist'
          ]
        },
        toolCallsExecuted
      };
    }

    // Build intelligent response
    let reply = `I found **${matchedProperties.length}** approved hostels around LAUTECH matching your requirements`;
    if (criteria.maxBudget) reply += ` within **₦${criteria.maxBudget.toLocaleString()}**`;
    if (criteria.areaName) reply += ` in **${criteria.areaName.toUpperCase()}**`;
    reply += `:\n\n`;

    matchedProperties.slice(0, 3).forEach((p, idx) => {
      reply += `${idx + 1}. **${p.title}** — ₦${p.rentAmount.toLocaleString()} (${p.distanceFromCampusKm}km from gate, ${p.areaName})\n`;
    });

    reply += `\nWould you like me to compare their facilities, schedule a free inspection, or save them to your shortlist?`;

    return {
      message: reply,
      structuredData: {
        type: 'HOSTEL_LIST',
        properties: matchedProperties,
        suggestedQueries: [
          'Compare these hostels for me',
          'What are the mandatory fees?',
          'Give me an inspection checklist for these hostels'
        ]
      },
      toolCallsExecuted
    };
  }

  // -------------------------------------------------------------------------
  // Instance wrapper methods for convenience & testability
  // -------------------------------------------------------------------------
  async chat(
    studentId: string,
    prompt: string,
    context?: { propertyId?: string; contextType?: string }
  ) {
    const startTime = Date.now();
    const result = await AIAssistantService.processStudentQuery(prompt, studentId, context);
    
    // Log usage for analytics
    db.prepare(`
      INSERT INTO ai_usage_logs (id, student_id, endpoint, query_text, tool_name, status, latency_ms)
      VALUES (?, ?, '/api/ai/chat', ?, ?, 'SUCCESS', ?)
    `).run(
      `log-${crypto.randomUUID()}`,
      studentId,
      prompt.slice(0, 200),
      result.toolCallsExecuted ? result.toolCallsExecuted.join(',') : 'none',
      Date.now() - startTime
    );

    return {
      response: result.message,
      structuredData: result.structuredData,
      toolsUsed: result.toolCallsExecuted
    };
  }

  async executeConfirmedAction(studentId: string, actionType: string, payload: any) {
    return AIAssistantService.executeConfirmedAction(actionType, payload, studentId);
  }

  async recordFeedback(messageId: string, studentId: string, rating: 'HELPFUL' | 'UNHELPFUL', comment?: string) {
    const id = `fb-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO ai_feedback (id, message_id, student_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, messageId, studentId, rating, comment || null);
    return { success: true, message: 'Feedback recorded' };
  }

  async getAdminStats() {
    const totalQueries = (db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs`).get() as any)?.count || 0;
    const rateLimitedCount = (db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs WHERE status = 'RATE_LIMITED'`).get() as any)?.count || 0;
    const successCount = (db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs WHERE status = 'SUCCESS'`).get() as any)?.count || 0;
    const successRate = totalQueries > 0 ? Math.round((successCount / totalQueries) * 100) : 100;

    const toolExecutions = db.prepare(`
      SELECT tool_name, COUNT(*) as count
      FROM ai_usage_logs
      WHERE tool_name IS NOT NULL AND tool_name != 'none'
      GROUP BY tool_name
      ORDER BY count DESC
    `).all() as any[];

    const feedbackCounts = db.prepare(`
      SELECT rating, COUNT(*) as count
      FROM ai_feedback
      GROUP BY rating
    `).all() as any[];

    const recentLogs = db.prepare(`
      SELECT id, endpoint, query_text, tool_name, status, latency_ms, created_at
      FROM ai_usage_logs
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as any[];

    return {
      totalQueries,
      successRate,
      rateLimitedCount,
      toolExecutions,
      feedbackCounts,
      recentLogs
    };
  }
}

export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;

