import db from '../db.js';
import crypto from 'crypto';

export interface ParsedSearchFilters {
  maxPrice?: number;
  minPrice?: number;
  areas?: string[];
  roomType?: string;
  genderPreference?: string;
  requiresElectricity?: boolean;
  requiresWater?: boolean;
  requiresSecurity?: boolean;
  requiresInternet?: boolean;
  requiresQuiet?: boolean;
  maxDistanceMinutes?: number;
}

export interface NLSearchResult {
  query: string;
  structuredFilters: ParsedSearchFilters;
  needsClarification: boolean;
  clarificationQuestion?: string;
  resultsCount: number;
  properties: any[];
  interpretationText: string;
}

export class NaturalLanguageSearchService {
  private static KNOWN_AREAS = [
    'under g',
    'adenike',
    'stadium',
    'isale general',
    'aroma',
    'high school',
    'yoaco',
    'odo-oba',
    'general',
    'care taker',
    'apake',
    'lautech gate'
  ];

  /**
   * Parses natural language input into structured filter parameters
   */
  static parseQuery(queryText: string): ParsedSearchFilters {
    const text = queryText.toLowerCase().replace(/,/g, '').trim();
    const filters: ParsedSearchFilters = {};

    // 1. Extract Price / Budget Constraints
    // Patterns: "under 200k", "under ₦200000", "below 150000", "less than 180k", "200000 budget", "max 250k"
    const priceKMatch = text.match(/(?:under|below|less than|max|within|around)?\s*(?:₦|n|ngn)?\s*(\d{2,3})\s*k(?:\s*budget)?/i);
    const priceFullMatch = text.match(/(?:under|below|less than|max|within|around)?\s*(?:₦|n|ngn)?\s*(\d{5,7})/i);

    if (priceKMatch) {
      filters.maxPrice = parseInt(priceKMatch[1], 10) * 1000;
    } else if (priceFullMatch) {
      filters.maxPrice = parseInt(priceFullMatch[1], 10);
    } else if (text.includes('cheap') || text.includes('affordable') || text.includes('budget')) {
      filters.maxPrice = 160000; // Sensible default ceiling for "cheap" around LAUTECH
    }

    // 2. Extract Area / Neighborhood
    const matchedAreas: string[] = [];
    for (const area of this.KNOWN_AREAS) {
      if (text.includes(area)) {
        // Capitalize for display
        const formattedArea = area.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        matchedAreas.push(formattedArea);
      }
    }
    if (matchedAreas.length > 0) {
      filters.areas = matchedAreas;
    }

    // 3. Extract Room Type & Occupancy
    if (text.includes('single') || text.includes('1 room') || text.includes('one person') || text.includes('self contain') || text.includes('self-contain')) {
      filters.roomType = 'SINGLE';
    } else if (text.includes('2-person') || text.includes('2 person') || text.includes('shared 2') || text.includes('two person') || text.includes('roommate')) {
      filters.roomType = 'SHARED_2';
    } else if (text.includes('4-person') || text.includes('4 person') || text.includes('shared 4') || text.includes('four person')) {
      filters.roomType = 'SHARED_4';
    }

    // 4. Extract Gender Specifics
    if (text.includes('female') || text.includes('girls') || text.includes('women')) {
      filters.genderPreference = 'FEMALE_ONLY';
    } else if (text.includes('male') || text.includes('boys') || text.includes('men')) {
      filters.genderPreference = 'MALE_ONLY';
    }

    // 5. Extract Amenities & Priorities
    if (text.includes('electricity') || text.includes('light') || text.includes('power') || text.includes('generator') || text.includes('solar') || text.includes('inverter')) {
      filters.requiresElectricity = true;
    }
    if (text.includes('water') || text.includes('borehole') || text.includes('running water')) {
      filters.requiresWater = true;
    }
    if (text.includes('security') || text.includes('safe') || text.includes('fenced') || text.includes('gateman')) {
      filters.requiresSecurity = true;
    }
    if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet')) {
      filters.requiresInternet = true;
    }
    if (text.includes('quiet') || text.includes('peaceful') || text.includes('study')) {
      filters.requiresQuiet = true;
    }

    // 6. Proximity / Walk Time
    if (text.includes('close') || text.includes('near') || text.includes('walking distance') || text.includes('trekable')) {
      filters.maxDistanceMinutes = 12;
    }

    return filters;
  }

  /**
   * Search database using structured filters and log zero-result events for supply-gap analytics
   */
  static search(queryText: string, userId?: string): NLSearchResult {
    const filters = this.parseQuery(queryText);
    const trimmed = queryText.trim().toLowerCase();

    // Determine if query is overly vague
    let needsClarification = false;
    let clarificationQuestion: string | undefined;

    if (
      trimmed.length <= 4 ||
      trimmed === 'hostel' ||
      trimmed === 'hostels' ||
      trimmed === 'find me a hostel' ||
      trimmed === 'i need a room'
    ) {
      needsClarification = true;
      clarificationQuestion = 'What is your maximum annual budget (e.g. ₦150,000 or ₦200,000)?';
    }

    // Construct SQL Query
    let sql = `
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
    `;
    const params: any[] = [];

    if (filters.maxPrice) {
      sql += ' AND (pr.rent_amount <= ? OR pr.total_mandatory_cost <= ?)';
      params.push(filters.maxPrice, filters.maxPrice);
    }

    if (filters.areas && filters.areas.length > 0) {
      const areaClauses = filters.areas.map(() => '(a.name LIKE ? OR p.address LIKE ?)').join(' OR ');
      sql += ` AND (${areaClauses})`;
      filters.areas.forEach(a => {
        params.push(`%${a}%`, `%${a}%`);
      });
    }

    if (filters.requiresElectricity) {
      sql += " AND (p.power_rating_avg >= 3.5 OR p.description LIKE '%electricity%' OR p.description LIKE '%generator%' OR p.description LIKE '%solar%' OR p.description LIKE '%light%')";
    }

    if (filters.requiresWater) {
      sql += " AND (p.water_rating_avg >= 3.5 OR p.description LIKE '%water%' OR p.description LIKE '%borehole%')";
    }

    if (filters.requiresSecurity) {
      sql += " AND (p.security_rating_avg >= 4.0 OR p.description LIKE '%security%' OR p.description LIKE '%fenced%' OR p.description LIKE '%gate%')";
    }

    sql += ' ORDER BY p.verification_status DESC, pr.rent_amount ASC LIMIT 25';

    const properties = db.prepare(sql).all(...params) as any[];

    // Build natural interpretation text
    const interpretationParts: string[] = [];
    if (filters.maxPrice) interpretationParts.push(`under ₦${filters.maxPrice.toLocaleString()}`);
    if (filters.areas && filters.areas.length > 0) interpretationParts.push(`in ${filters.areas.join(', ')}`);
    if (filters.requiresElectricity) interpretationParts.push(`with reliable power`);
    if (filters.requiresWater) interpretationParts.push(`with reliable water`);
    if (filters.requiresSecurity) interpretationParts.push(`with good security`);

    const interpretationText = interpretationParts.length > 0
      ? `Showing verified hostels ${interpretationParts.join(' ')}`
      : 'Showing all verified hostels around LAUTECH';

    // Log search event for Supply-Demand & Zero-Result Analytics
    try {
      db.prepare(`
        INSERT INTO search_events (
          id, user_id, query_text, parsed_filters_json, results_count,
          is_zero_result, requested_location, requested_max_budget, requested_room_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `se-${crypto.randomUUID()}`,
        userId || null,
        queryText,
        JSON.stringify(filters),
        properties.length,
        properties.length === 0 ? 1 : 0,
        filters.areas ? filters.areas.join(', ') : null,
        filters.maxPrice || null,
        filters.roomType || null
      );
    } catch (err) {
      console.warn('Failed to log search event:', err);
    }

    return {
      query: queryText,
      structuredFilters: filters,
      needsClarification,
      clarificationQuestion,
      resultsCount: properties.length,
      properties,
      interpretationText
    };
  }
}
