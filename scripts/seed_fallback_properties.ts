import Database from 'better-sqlite3';
import { DEFAULT_PROPERTIES } from '../src/services/offlineFallback';

const db = new Database('./data/hostel_ease.db');

const existingProps = new Set(db.prepare('SELECT id FROM properties').all().map((p: any) => p.id));
console.log(`Current properties in SQLite: ${existingProps.size}`);

const validAreaIds = new Set(db.prepare('SELECT id FROM areas').all().map((a: any) => a.id));

const insertPropStmt = db.prepare(`
  INSERT INTO properties (
    id, provider_id, university_id, area_id, title, slug, description, address, nearby_landmark,
    latitude, longitude, distance_from_campus_km, property_type,
    gender_preference, total_rooms, verification_status,
    availability_status, is_demo, is_featured, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?, datetime('now')
  )
`);

const insertPriceStmt = db.prepare(`
  INSERT INTO prices (
    id, property_id, period, rent_amount, service_charge,
    agency_fee, caution_fee, other_mandatory_charges, legal_fee,
    total_mandatory_cost, total_refundable_cost, is_negotiable
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?
  )
`);

const insertMediaStmt = db.prepare(`
  INSERT INTO property_media (
    id, property_id, url, caption, display_order, is_cover, media_type, category
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

let inserted = 0;
for (const p of DEFAULT_PROPERTIES) {
  if (!existingProps.has(p.id)) {
    const areaId = (p.area?.id && validAreaIds.has(p.area.id)) ? p.area.id : 'area-under-g';
    const providerId = 'user-provider-1';
    const universityId = 'uni-lautech-ogbomoso';

    try {
      insertPropStmt.run(
        p.id,
        providerId,
        universityId,
        areaId,
        p.title,
        p.slug,
        p.description || '',
        p.address || 'Under G, Ogbomoso',
        p.nearbyLandmark || '',
        p.latitude || 8.1458,
        p.longitude || 4.2625,
        p.distanceFromCampusKm || 0.5,
        p.propertyType || 'SELF_CONTAIN',
        p.genderPreference || 'ANY',
        p.totalRooms || 10,
        p.verificationStatus || 'APPROVED',
        p.availabilityStatus || 'AVAILABLE',
        p.isDemo ? 1 : 0,
        p.isFeatured ? 1 : 0,
        p.createdAt || new Date().toISOString()
      );

      const priceId = `price-${p.id}`;
      const rent = p.priceSummary?.rentAmount || 180000;
      const service = p.priceSummary?.serviceCharge || 10000;
      const agency = p.priceSummary?.agencyFee || 20000;
      const caution = p.priceSummary?.cautionFee || 15000;
      const other = p.priceSummary?.otherMandatoryCharges || 10000;
      const total = p.priceSummary?.totalMandatoryCost || (rent + service + agency + caution + other);
      const refund = p.priceSummary?.totalRefundableCost || caution;

      insertPriceStmt.run(
        priceId,
        p.id,
        'YEARLY',
        rent,
        service,
        agency,
        caution,
        other,
        0,
        total,
        refund,
        0
      );

      if (p.coverImage) {
        insertMediaStmt.run(
          `media-${p.id}-cover`,
          p.id,
          p.coverImage,
          'Cover Image',
          1,
          1,
          'IMAGE',
          'EXTERIOR'
        );
      }

      existingProps.add(p.id);
      inserted++;
    } catch (e: any) {
      console.error(`Failed to insert ${p.id}:`, e.message);
    }
  }
}

console.log(`Inserted ${inserted} missing properties into SQLite.`);
console.log(`New total in SQLite: ${db.prepare('SELECT count(*) as count FROM properties').get().count}`);
