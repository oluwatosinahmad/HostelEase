import bcrypt from 'bcryptjs';
import db from './db.js';
import { runMigrations } from './migrate.js';

export function runSeed() {
  console.log('🌱 Seeding Hostel Ease database with extensive LAUTECH hostels catalog...');

  // Ensure tables and columns exist
  runMigrations();

  const studentPasswordHash = bcrypt.hashSync('Student123!', 10);
  const providerPasswordHash = bcrypt.hashSync('Provider123!', 10);
  const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);

  db.transaction(() => {
    // 0. Clean old records
    db.exec(`
      PRAGMA foreign_keys = OFF;

      DELETE FROM ai_feedback;
      DELETE FROM ai_messages;
      DELETE FROM ai_conversations;
      DELETE FROM ai_usage_logs;
      DELETE FROM student_notification_preferences;
      DELETE FROM student_search_history;
      DELETE FROM student_preferences;
      DELETE FROM recently_viewed_hostels;
      DELETE FROM search_history;
      DELETE FROM recently_viewed;
      DELETE FROM communication_reports;
      DELETE FROM payment_disputes;
      DELETE FROM financial_ledger;
      DELETE FROM refunds;
      DELETE FROM payment_attempts;
      DELETE FROM payment_webhook_events;
      DELETE FROM payments;
      DELETE FROM booking_status_history;
      DELETE FROM bookings;
      DELETE FROM provider_payout_accounts;
      DELETE FROM inspection_status_history;
      DELETE FROM messages;
      DELETE FROM conversations;
      DELETE FROM reviews;
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM listing_reports;
      DELETE FROM inspection_requests;
      DELETE FROM saved_properties;
      DELETE FROM verification_documents;
      DELETE FROM property_media;
      DELETE FROM property_amenities;
      DELETE FROM amenities;
      DELETE FROM price_history;
      DELETE FROM prices;
      DELETE FROM property_status_history;
      DELETE FROM bedspaces;
      DELETE FROM rooms;
      DELETE FROM properties;
      DELETE FROM provider_profiles;
      DELETE FROM student_profiles;
      DELETE FROM users;
      DELETE FROM areas;
      DELETE FROM universities;
      DELETE FROM platform_fee_configs;

      PRAGMA foreign_keys = ON;
    `);

    // 1. Seed University
    const uniId = 'uni-lautech-ogbomoso';
    db.prepare(`
      INSERT INTO universities (id, name, short_name, city, state, country, main_campus_lat, main_campus_lng)
      VALUES (?, ?, ?, ?, ?, 'Nigeria', ?, ?)
    `).run(
      uniId,
      'Ladoke Akintola University of Technology',
      'LAUTECH',
      'Ogbomoso',
      'Oyo State',
      8.1438,
      4.2638
    );

    // 2. Seed All 10 LAUTECH Areas
    const areas = [
      { id: 'area-under-g', name: 'Under G', slug: 'under-g', landmark: 'Main Gate & Bovas Station', min: 0.3, max: 1.2, desc: 'Closest student community to LAUTECH main gate. High concentration of modern self-contains, study cafes, and 24/7 commercial activities.' },
      { id: 'area-stadium-road', name: 'Stadium Road', slug: 'stadium-road', landmark: 'Ogbomoso Township Stadium', min: 0.8, max: 2.0, desc: 'Vibrant student residential zone with excellent transport, food hubs, sports facilities, and steady power supply.' },
      { id: 'area-adenike', name: 'Adenike Area', slug: 'adenike', landmark: 'Adenike Junction & Holy Light', min: 1.0, max: 2.5, desc: 'Popular and affordable student residential district with regular student shuttle and Keke NAPEP access.' },
      { id: 'area-general', name: 'General Area', slug: 'general', landmark: 'Bowen Teaching Hospital / General Hospital', min: 1.5, max: 3.0, desc: 'Peaceful and secure environment highly preferred by medical, nursing, anatomy, and final-year students.' },
      { id: 'area-isale-general', name: 'Isale General', slug: 'isale-general', landmark: 'Isale General Central Mosque', min: 1.8, max: 3.2, desc: 'Budget-friendly area with authentic student lodges, steady borehole water, and affordable food markets.' },
      { id: 'area-caretaker', name: 'Caretaker', slug: 'caretaker', landmark: 'Caretaker Junction & Total Fuel Station', min: 2.0, max: 3.5, desc: 'Well-connected commercial and residential hub with quick bike and bus transit directly to Under G campus gate.' },
      { id: 'area-yoaco', name: 'Yoaco', slug: 'yoaco', landmark: 'Yoaco Filling Station & Ogbomoso High School', min: 2.2, max: 4.0, desc: 'Rapidly developing student residential neighborhood with newly constructed modern lodges and serene study spaces.' },
      { id: 'area-aroje', name: 'Aroje', slug: 'aroje', landmark: 'Aroje Express Road / Ilorin Highway', min: 2.5, max: 4.5, desc: 'Spacious student compounds with high perimeter walls, borehole systems, and ample compound parking.' },
      { id: 'area-college-road', name: 'College Road / 2nd Gate', slug: 'college-road', landmark: 'LAUTECH 2nd Gate / College of Health Sciences', min: 0.5, max: 1.5, desc: 'Convenient walking distance to college lecture halls, science laboratories, and library.' },
      { id: 'area-randa', name: 'Randa', slug: 'randa', landmark: 'Randa Roundabout', min: 2.0, max: 3.8, desc: 'Quiet residential quarter with standard single rooms, flats, and reliable community security.' }
    ];

    const insertArea = db.prepare(`
      INSERT INTO areas (id, university_id, name, slug, description, landmark, approx_distance_min_km, approx_distance_max_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of areas) {
      insertArea.run(a.id, uniId, a.name, a.slug, a.desc, a.landmark, a.min, a.max);
    }

    // 3. Seed Amenities
    const amenities = [
      { id: 'amenity-power', key: 'electricity', name: 'Constant Electricity (Dedicated Line / Transformer)', category: 'POWER', icon: 'zap', desc: 'Connected to reliable student feeder with low outage rate.' },
      { id: 'amenity-water', key: 'water', name: 'Borehole / Running Water', category: 'WATER', icon: 'droplets', desc: 'Overhead tanks and constant water pumping system.' },
      { id: 'amenity-security', key: 'security', name: 'Gated Perimeter & Security Guard', category: 'SECURITY', icon: 'shield', desc: 'Locked compound gate with night security personnel.' },
      { id: 'amenity-wifi', key: 'wifi', name: 'High-Speed Wi-Fi', category: 'INTERNET', icon: 'wifi', desc: 'Unlimited broadband access for academic study.' },
      { id: 'amenity-kitchen', key: 'kitchen', name: 'Private / Shared Kitchen Space', category: 'FACILITY', icon: 'utensils', desc: 'Designated cooking space with sink and ventilation.' },
      { id: 'amenity-generator', key: 'generator', name: 'Standby Generator Backup', category: 'POWER', icon: 'cpu', desc: 'Central generator pumped during evening study hours.' },
      { id: 'amenity-inverter', key: 'inverter', name: 'Solar / Inverter System', category: 'POWER', icon: 'sun', desc: '24/7 solar backup for lighting, fans, and laptop charging.' },
      { id: 'amenity-parking', key: 'parking', name: 'Secure Compound Parking', category: 'FACILITY', icon: 'car', desc: 'Safe parking for cars, bikes, and bicycles.' },
      { id: 'amenity-cctv', key: 'cctv', name: 'CCTV Surveillance', category: 'SECURITY', icon: 'camera', desc: '24/7 security camera coverage around compound perimeter.' },
      { id: 'amenity-waste', key: 'waste', name: 'Regular Waste Disposal', category: 'FACILITY', icon: 'trash-2', desc: 'Scheduled weekly municipal waste collection.' },
      { id: 'amenity-wardrobe', key: 'wardrobe', name: 'Fitted Wardrobe', category: 'FURNITURE', icon: 'box', desc: 'Built-in wooden wardrobe and shelf storage.' },
      { id: 'amenity-tiled', key: 'tiled', name: 'Fully Tiled Flooring', category: 'FACILITY', icon: 'layers', desc: 'Neat ceramic tiles throughout bedroom and bathroom.' }
    ];

    const insertAmenity = db.prepare(`
      INSERT INTO amenities (id, key, name, category, icon, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const am of amenities) {
      insertAmenity.run(am.id, am.key, am.name, am.category, am.icon, am.desc);
    }

    // 4. Seed Core Users & Providers
    const studentId = 'user-student-1';
    const provider1Id = 'user-provider-1';
    const provider2Id = 'user-provider-2';
    const provider3Id = 'user-provider-3';
    const provider4Id = 'user-provider-4';
    const adminId = 'user-admin-1';

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Student (Tunde Adeyemi)
    insertUser.run(
      studentId,
      'student@lautech.edu.ng',
      studentPasswordHash,
      'Tunde Adeyemi',
      '+2348031234567',
      'STUDENT',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
    );
    db.prepare(`
      INSERT INTO student_profiles (id, user_id, university_id, matric_no, department, level, gender)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sp-1', studentId, uniId, '20/47CS/0118', 'Computer Science', '400L', 'MALE');

    // Landlord 1: Chief Adeleke (Verified Landlord)
    insertUser.run(
      provider1Id,
      'provider@hostelease.ng',
      providerPasswordHash,
      'Chief (Alhaji) G. O. Adeleke',
      '+2348039876543',
      'PROVIDER',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    );
    db.prepare(`
      INSERT INTO provider_profiles (id, user_id, business_name, address, provider_type, id_type, bio, preferred_contact_method, verification_status, phone_verified, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      'pp-1',
      provider1Id,
      'Adeleke Heritage Properties Ogbomoso',
      'Plot 12, Stadium Road, Ogbomoso, Oyo State',
      'HOSTEL_OWNER',
      'NIN_CARD',
      'Experienced accommodation provider with 12+ years serving LAUTECH students. We prioritize security, water pumping, and peaceful study environments.',
      'ANY',
      'VERIFIED'
    );

    // Landlord 2: Alhaji Mukaila (Hostel Manager)
    insertUser.run(
      provider2Id,
      'mukaila@ogbomosohousing.ng',
      providerPasswordHash,
      'Alhaji Mukaila Oladapo',
      '+2348051239876',
      'PROVIDER',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
    );
    db.prepare(`
      INSERT INTO provider_profiles (id, user_id, business_name, address, provider_type, id_type, bio, preferred_contact_method, verification_status, phone_verified, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      'pp-2',
      provider2Id,
      'Oladapo Real Estate & Lodge Caretaker',
      'Adenike Junction, Ogbomoso',
      'HOSTEL_MANAGER',
      'DRIVERS_LICENSE',
      'Authorized lodge caretaker for student properties around Adenike and Caretaker areas.',
      'CALL_ONLY',
      'VERIFIED'
    );

    // Landlord 3: Engr. Kayode Adebayo (Property Owner)
    insertUser.run(
      provider3Id,
      'adebayo.lodges@gmail.com',
      providerPasswordHash,
      'Engr. Kayode Adebayo',
      '+2348023456789',
      'PROVIDER',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
    );
    db.prepare(`
      INSERT INTO provider_profiles (id, user_id, business_name, address, provider_type, id_type, bio, preferred_contact_method, verification_status, phone_verified, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      'pp-3',
      provider3Id,
      'Adebayo Prime Student Housing',
      'Under G Expressway, Ogbomoso',
      'PROPERTY_OWNER',
      'PASSPORT',
      'Owner of modern student suites with dedicated transformer connection and solar inverter infrastructure.',
      'WHATSAPP_ONLY',
      'VERIFIED'
    );

    // Landlord 4: Mrs. Funke Balogun (Authorized Representative)
    insertUser.run(
      provider4Id,
      'funke.balogun@hostelease.ng',
      providerPasswordHash,
      'Mrs. Funke Balogun',
      '+2348067890123',
      'PROVIDER',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
    );
    db.prepare(`
      INSERT INTO provider_profiles (id, user_id, business_name, address, provider_type, id_type, bio, preferred_contact_method, verification_status, phone_verified, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).run(
      'pp-4',
      provider4Id,
      'Balogun Student Accommodation Agency',
      'General Hospital Road, Ogbomoso',
      'AUTHORIZED_REP',
      'NIN_CARD',
      'Student accommodation representative connecting medical and general students with high-security lodges.',
      'ANY',
      'VERIFIED'
    );

    // 4b. Single Authorized Platform Owner & Super Admin
    const ownerName = process.env.ADMIN_NAME || 'Oluwatosin Ahmad';
    const ownerEmail = (process.env.ADMIN_EMAIL || 'admin@hostelease.ng').toLowerCase().trim();
    const ownerPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const ownerPasswordHash = bcrypt.hashSync(ownerPassword, 10);

    insertUser.run(
      adminId,
      ownerEmail,
      ownerPasswordHash,
      ownerName,
      '+2348004678353',
      'ADMIN',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
    );

    db.prepare(`
      INSERT INTO admin_profiles (id, user_id, admin_role, permissions_json, is_super_admin)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin-prof-owner', adminId, 'SUPER_ADMIN', JSON.stringify(['*']), 1);

    // Seed Landlord Verification Documents
    const insertDoc = db.prepare(`
      INSERT INTO verification_documents (id, provider_id, document_type, file_url, filename, file_size, mime_type, status, admin_feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertDoc.run('doc-1', provider1Id, 'NIN_CARD', '/uploads/verification_documents/nin_chief_adeleke.pdf', 'nin_chief_adeleke.pdf', 1250000, 'application/pdf', 'APPROVED', 'Verified with NIMC portal.');
    insertDoc.run('doc-2', provider1Id, 'PROOF_OF_OWNERSHIP', '/uploads/verification_documents/deed_adeleke_villa.pdf', 'deed_adeleke_villa.pdf', 3400000, 'application/pdf', 'APPROVED', 'Certificate of Occupancy confirmed.');
    insertDoc.run('doc-3', provider2Id, 'DRIVERS_LICENSE', '/uploads/verification_documents/drivers_lic_mukaila.pdf', 'drivers_lic_mukaila.pdf', 850000, 'application/pdf', 'APPROVED', 'Verified by FRSC database.');
    insertDoc.run('doc-4', provider3Id, 'CAC_REGISTRATION', '/uploads/verification_documents/cac_adebayo.pdf', 'cac_adebayo.pdf', 2100000, 'application/pdf', 'APPROVED', 'CAC Business Registration validated.');

    // ----------------------------------------------------
    // 5. SEED 40 HOSTELS ACROSS ALL 10 LAUTECH LOCATIONS
    // ----------------------------------------------------
    const imagePool = {
      exterior: [
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1540518614846-7ede433c4550?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'
      ],
      video: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-tour-43288-large.mp4'
    };

    // Blueprint for 40 properties: 4 in each of the 10 areas
    // Types: SELF_CONTAIN, SINGLE_ROOM, FLAT, SHARED_BEDSPACE
    const rawProperties: any[] = [];
    const providersList = [provider1Id, provider2Id, provider3Id, provider4Id];

    const typeConfigs = [
      {
        type: 'SELF_CONTAIN',
        titleSuffix: 'Royal Self-Contain Suites',
        rentBase: 220000,
        serv: 15000,
        agency: 15000,
        caution: 15000,
        other: 5000,
        roomsCount: 16,
        descTemplate: 'Modern ensuite self-contain with private bathroom, dedicated prepaid meter, continuous borehole water supply, and solar backup lighting.',
        roomName: 'Executive Ensuite Self-Contain',
        maxOcc: 1
      },
      {
        type: 'SINGLE_ROOM',
        titleSuffix: 'Comfort Single Lodge',
        rentBase: 130000,
        serv: 10000,
        agency: 10000,
        caution: 10000,
        other: 4000,
        roomsCount: 12,
        descTemplate: 'Affordable and neat single room in a peaceful student compound. Features steady water supply, security gate, and study desk space.',
        roomName: 'Standard Single Room',
        maxOcc: 1
      },
      {
        type: 'FLAT',
        titleSuffix: 'Scholars Court 2-Bedroom Flat',
        rentBase: 340000,
        serv: 25000,
        agency: 25000,
        caution: 25000,
        other: 8000,
        roomsCount: 6,
        descTemplate: 'Spacious 2-bedroom student flat ideal for roommates or group study. Includes large sitting parlor, fitted kitchen, and fenced perimeter.',
        roomName: '2-Bedroom Student Flat',
        maxOcc: 4
      },
      {
        type: 'SHARED_BEDSPACE',
        titleSuffix: 'Academics Shared Bedspaces',
        rentBase: 80000,
        serv: 8000,
        agency: 8000,
        caution: 8000,
        other: 3000,
        roomsCount: 20,
        descTemplate: 'Budget-friendly shared bedspace in a secure and tidy student hostel. Includes personal locker, study reading table, and borehole water.',
        roomName: 'Shared Bedspace Room (2 Occupants)',
        maxOcc: 2
      }
    ];

    let propIdx = 1;

    for (let aIdx = 0; aIdx < areas.length; aIdx++) {
      const area = areas[aIdx];

      for (let tIdx = 0; tIdx < typeConfigs.length; tIdx++) {
        const conf = typeConfigs[tIdx];
        const provId = providersList[(aIdx + tIdx) % providersList.length];
        const propId = `prop-${propIdx}`;
        
        // Price variation based on distance & area
        const distanceVariance = (area.min + (tIdx * 0.2)).toFixed(1);
        const distKm = Math.max(0.3, parseFloat(distanceVariance));
        const rentPrice = conf.rentBase + (tIdx === 0 ? (aIdx % 3) * 10000 : (aIdx % 2) * 5000);
        
        const availabilityStates = ['AVAILABLE', 'AVAILABLE', 'LIMITED', 'AVAILABLE'];
        const currentAvail = availabilityStates[(aIdx + tIdx) % availabilityStates.length];
        const isFeatured = (aIdx < 4 && tIdx === 0) ? 1 : 0;

        const extImg = imagePool.exterior[(propIdx - 1) % imagePool.exterior.length];
        const bedImg = imagePool.bedroom[(propIdx - 1) % imagePool.bedroom.length];
        const bathImg = imagePool.bathroom[(propIdx - 1) % imagePool.bathroom.length];
        const kitImg = imagePool.kitchen[(propIdx - 1) % imagePool.kitchen.length];

        const propertyTitle = `${area.name} ${conf.titleSuffix}`;
        const slug = `${area.slug}-${conf.type.toLowerCase().replace(/_/g, '-')}-${propIdx}`;

        rawProperties.push({
          id: propId,
          providerId: provId,
          areaId: area.id,
          title: propertyTitle,
          slug,
          desc: `${conf.descTemplate} Located at ${area.name}, approximately ${distKm}km from LAUTECH campus.`,
          address: `Plot ${propIdx * 3 + 2}, Near ${area.landmark}, ${area.name}, Ogbomoso`,
          landmark: `Opposite ${area.landmark}`,
          lat: 8.1400 + (aIdx * 0.003),
          lng: 4.2600 + (tIdx * 0.002),
          distKm,
          type: conf.type,
          gender: tIdx === 3 ? (aIdx % 2 === 0 ? 'MALE_ONLY' : 'FEMALE_ONLY') : 'ANY',
          roomsCount: conf.roomsCount,
          status: 'APPROVED',
          avail: currentAvail,
          featured: isFeatured,
          score: 100,
          rent: rentPrice,
          service: conf.serv,
          agency: conf.agency,
          caution: conf.caution,
          other: conf.other,
          media: [
            { type: 'IMAGE', cat: 'EXTERIOR', url: extImg, cover: 1, caption: `${propertyTitle} - Front Elevation & Compound` },
            { type: 'IMAGE', cat: 'BEDROOM', url: bedImg, cover: 0, caption: 'Spacious Well-Ventilated Room Interior' },
            { type: 'IMAGE', cat: 'BATHROOM', url: bathImg, cover: 0, caption: 'Neat Tiled Bathroom Facilities' },
            { type: 'IMAGE', cat: 'KITCHEN', url: kitImg, cover: 0, caption: 'Kitchen with Running Tap' },
            { type: 'VIDEO', cat: 'VIDEO_WALKTHROUGH', url: imagePool.video, cover: 0, caption: 'Verified Video Walkthrough Tour' }
          ],
          amenities: ['electricity', 'water', 'security', 'tiled', 'waste', ...(tIdx === 0 || tIdx === 2 ? ['inverter', 'kitchen', 'wardrobe'] : ['generator'])],
          roomName: conf.roomName,
          maxOcc: conf.maxOcc
        });

        propIdx++;
      }
    }

    // Insert prepared properties
    const insertProp = db.prepare(`
      INSERT INTO properties (
        id, provider_id, university_id, area_id, title, slug, description, address, nearby_landmark,
        latitude, longitude, distance_from_campus_km, property_type, gender_preference, total_rooms,
        verification_status, availability_status, is_demo, is_featured, completeness_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const insertPrice = db.prepare(`
      INSERT INTO prices (
        id, property_id, period, rent_amount, service_charge, agency_fee, caution_fee,
        other_mandatory_charges, legal_fee, total_mandatory_cost, total_refundable_cost, notes
      ) VALUES (?, ?, 'YEARLY', ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    const insertPropMedia = db.prepare(`
      INSERT INTO property_media (id, property_id, media_type, category, url, caption, display_order, is_cover, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertPropAmenity = db.prepare(`
      INSERT INTO property_amenities (id, property_id, amenity_id)
      VALUES (?, ?, ?)
    `);

    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBedspace = db.prepare(`
      INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const p of rawProperties) {
      insertProp.run(
        p.id,
        p.providerId,
        uniId,
        p.areaId,
        p.title,
        p.slug,
        p.desc,
        p.address,
        p.landmark,
        p.lat,
        p.lng,
        p.distKm,
        p.type,
        p.gender,
        p.roomsCount,
        p.status,
        p.avail,
        p.featured,
        p.score
      );

      const totalMandatory = p.rent + p.service + p.agency + p.other;
      insertPrice.run(
        `price-${p.id}`,
        p.id,
        p.rent,
        p.service,
        p.agency,
        p.caution,
        p.other,
        totalMandatory,
        p.caution,
        'Full 1-year academic session transparent billing.'
      );

      let mOrder = 1;
      for (const m of p.media) {
        insertPropMedia.run(
          `media-${p.id}-${mOrder}`,
          p.id,
          m.type,
          m.cat,
          m.url,
          m.caption,
          mOrder,
          m.cover
        );
        mOrder++;
      }

      for (const amKey of p.amenities) {
        const amRow = db.prepare('SELECT id FROM amenities WHERE key = ?').get(amKey) as any;
        if (amRow) {
          insertPropAmenity.run(`pa-${p.id}-${amKey}`, p.id, amRow.id);
        }
      }

      // Create 2 room batches per property
      const totalRooms = p.roomsCount;
      const occupiedRooms = p.avail === 'AVAILABLE' ? Math.floor(totalRooms * 0.4) : Math.floor(totalRooms * 0.85);
      const availableRooms = totalRooms - occupiedRooms;

      const roomId = `room-${p.id}-1`;
      insertRoom.run(
        roomId,
        p.id,
        p.roomName,
        p.type,
        p.maxOcc,
        totalRooms,
        availableRooms,
        occupiedRooms,
        p.type === 'SELF_CONTAIN' || p.type === 'FLAT' ? 1 : 0,
        0,
        p.avail
      );

      // Create individual bedspaces
      const bedspaceLimit = Math.min(totalRooms, 6);
      for (let b = 1; b <= bedspaceLimit; b++) {
        const isOcc = b <= Math.floor(bedspaceLimit * (occupiedRooms / totalRooms)) ? 1 : 0;
        insertBedspace.run(
          `bed-${p.id}-${b}`,
          roomId,
          `Room ${b}`,
          isOcc,
          isOcc ? 'OCCUPIED' : 'AVAILABLE'
        );
      }
    }

    // 6. Seed Realistic Student Reviews
    const insertReview = db.prepare(`
      INSERT INTO reviews (id, student_id, property_id, rating, clean_rating, security_rating, water_rating, electricity_rating, comment, is_verified_stay, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'APPROVED')
    `);

    insertReview.run(
      'rev-1',
      studentId,
      'prop-1',
      5,
      5,
      5,
      5,
      4,
      'Chief Adeleke’s lodge is top notch. Running water is always pumped twice daily and the solar backup powers reading lights during nighttime study.',
    );

    insertReview.run(
      'rev-2',
      studentId,
      'prop-2',
      4,
      4,
      5,
      4,
      4,
      'Stadium Road is super convenient for food and printing materials. Very safe compound gate locked at 10 PM.',
    );

    insertReview.run(
      'rev-3',
      studentId,
      'prop-5',
      5,
      5,
      5,
      5,
      5,
      'Under G is literally 5 minutes walk to LAUTECH main gate. Never missed 8 AM lectures.',
    );

    // 7. Seed Sample Inspection Requests
    const insertInsp = db.prepare(`
      INSERT INTO inspection_requests (
        id, student_id, property_id, inspection_type, preferred_date, preferred_time,
        student_phone, notes, status, provider_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertInsp.run(
      'insp-1',
      studentId,
      'prop-1',
      'PHYSICAL',
      '2026-08-28',
      '14:00 (Afternoon)',
      '+2348031234567',
      'Want to check ensuite bathroom and prepaid meter.',
      'CONFIRMED',
      'Confirmed. Meet Chief Adeleke at lodge gate.'
    );
    insertInsp.run(
      'insp-2',
      studentId,
      'prop-2',
      'VIRTUAL',
      '2026-08-29',
      '11:00 (Morning)',
      '+2348031234567',
      'Please show me the compound generator and study desk.',
      'PENDING',
      null
    );

    // 8. Seed Price History
    db.prepare(`
      INSERT INTO price_history (id, property_id, provider_id, previous_rent, new_rent, previous_total_mandatory, new_total_mandatory, change_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ph-1',
      'prop-1',
      provider1Id,
      200000,
      220000,
      235000,
      255000,
      'Annual maintenance and newly installed solar inverter backup system.'
    );

    // 9. Seed In-App Notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertNotif.run(
      'notif-1',
      provider1Id,
      'Hostel Listing Approved! 🎉',
      'Your listing "Adeleke Royal Villa" in Under G has been verified and published to LAUTECH students.',
      'PROPERTY_APPROVED',
      0,
      '/provider/dashboard'
    );
    insertNotif.run(
      'notif-2',
      provider1Id,
      'New Physical Inspection Request 📅',
      'Student Tunde Adeyemi requested a physical inspection for Adeleke Royal Villa on Aug 28.',
      'INSPECTION_REQUEST',
      0,
      '/provider/inspections'
    );

    // 10. Seed Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      'audit-1',
      adminId,
      'ADMIN',
      'APPROVE_PROVIDER',
      'PROVIDER',
      provider1Id,
      JSON.stringify({ note: 'Verified NIN and C of O documents.' })
    );
    insertAudit.run(
      'audit-2',
      adminId,
      'ADMIN',
      'APPROVE_PROPERTY',
      'PROPERTY',
      'prop-1',
      JSON.stringify({ status: 'APPROVED', isFeatured: true })
    );
  })();

  console.log('✅ Hostel Ease database seeded with 40 comprehensive LAUTECH hostels successfully across all 10 areas!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
