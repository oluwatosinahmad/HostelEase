import db from '../server/db';
import fs from 'fs';
import path from 'path';

function exportData() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
  console.log('Available tables in SQLite:', tables);

  const users = tables.includes('users') ? db.prepare('SELECT * FROM users').all().map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    passwordHash: u.password_hash,
    avatarUrl: u.avatar_url || '',
    isActive: u.is_active === 1,
    status: u.account_status || 'ACTIVE',
    accountStatus: u.account_status || 'ACTIVE',
    department: u.department || '',
    level: u.level || '',
    matricNo: u.matric_no || '',
    gender: u.gender || '',
    isSuperAdmin: u.role === 'ADMIN' || u.role === 'SUPER_ADMIN',
    emailVerified: u.email_verified !== undefined ? u.email_verified : 1,
    createdAt: u.created_at,
    updated_at: u.updated_at
  })) : [];

  // Helper statements for formatting properties
  const getPriceStmt = db.prepare('SELECT * FROM prices WHERE property_id = ? ORDER BY rent_amount ASC LIMIT 1');
  const getCoverMediaStmt = db.prepare('SELECT url, caption FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1');
  const getFallbackMediaStmt = db.prepare('SELECT url, caption FROM property_media WHERE property_id = ? ORDER BY display_order ASC LIMIT 1');
  const getVideoMediaStmt = db.prepare("SELECT url, thumbnail_url, caption, category FROM property_media WHERE property_id = ? AND (media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH' OR url LIKE '%.mp4' OR url LIKE '%.webm') LIMIT 1");
  const getKeyAmenitiesStmt = db.prepare('SELECT a.key, a.name, a.icon FROM property_amenities pa JOIN amenities a ON pa.amenity_id = a.id WHERE pa.property_id = ? AND pa.is_available = 1 LIMIT 6');
  const getAreaStmt = db.prepare('SELECT id, name, slug, landmark FROM areas WHERE id = ?');
  const getAllMediaStmt = db.prepare('SELECT id, url, caption, media_type, category, is_cover FROM property_media WHERE property_id = ? ORDER BY is_cover DESC, display_order ASC');

  const properties = tables.includes('properties') ? db.prepare('SELECT * FROM properties').all().map((p: any) => {
    const price = getPriceStmt.get(p.id) as any;
    const coverMedia = (getCoverMediaStmt.get(p.id) || getFallbackMediaStmt.get(p.id)) as any;
    const videoMedia = getVideoMediaStmt.get(p.id) as any;
    const keyAmenities = getKeyAmenitiesStmt.all(p.id);
    const area = p.area_id ? getAreaStmt.get(p.area_id) as any : null;
    const mediaItems = getAllMediaStmt.all(p.id) as any[];

    const videoUrl = videoMedia ? videoMedia.url : (p.video_tour_url || null);
    const hasVideo = Boolean(videoUrl || p.has_4k_video);
    const isBooked = p.availability_status === 'BOOKED' || p.availability_status === 'FULLY_OCCUPIED';

    const mediaList: any[] = mediaItems.map(m => ({
      id: m.id,
      url: m.url,
      caption: m.caption,
      mediaType: m.media_type,
      category: m.category,
      isCover: Boolean(m.is_cover)
    }));

    if (coverMedia && !mediaList.some(m => m.isCover)) {
      mediaList.unshift({
        id: `media-${p.id}-cover`,
        url: coverMedia.url,
        caption: coverMedia.caption || 'Hostel Front View',
        mediaType: 'IMAGE',
        category: 'EXTERIOR',
        isCover: true
      });
    }
    if (videoUrl && !mediaList.some(m => m.mediaType === 'VIDEO')) {
      mediaList.push({
        id: videoMedia?.id || `media-${p.id}-video`,
        url: videoUrl,
        caption: videoMedia?.caption || '4K Virtual Inspection Walkthrough',
        mediaType: 'VIDEO',
        category: 'VIDEO_WALKTHROUGH',
        isCover: false
      });
    }

    return {
      ...p,
      // camelCase aliases for full frontend compatibility
      nearbyLandmark: p.nearby_landmark,
      distanceFromCampusKm: p.distance_from_campus_km,
      propertyType: p.property_type,
      genderPreference: p.gender_preference || 'ANY',
      totalRooms: p.total_rooms,
      verificationStatus: p.verification_status || 'APPROVED',
      availabilityStatus: isBooked ? 'BOOKED' : (p.availability_status || 'AVAILABLE'),
      bookingStatus: isBooked ? 'BOOKED' : 'AVAILABLE',
      isBooked,
      activeBookingCount: isBooked ? 1 : 0,
      isDemo: Boolean(p.is_demo),
      isFeatured: Boolean(p.is_featured),
      has4KVideo: hasVideo,
      videoTourUrl: videoUrl,
      videoVerificationStatus: hasVideo ? 'APPROVED' : 'NONE',
      videoVerificationNotes: p.video_verification_notes,
      media: mediaList,
      coverImage: coverMedia ? coverMedia.url : (p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80'),
      coverImageCaption: coverMedia ? coverMedia.caption : null,
      area: area ? {
        id: area.id,
        name: area.name,
        slug: area.slug,
        landmark: area.landmark
      } : {
        id: p.area_id || 'area-under-g',
        name: p.area_name || 'Under G (LAUTECH)',
        slug: 'under-g',
        landmark: 'Campus Gate'
      },
      priceSummary: price ? {
        period: price.period || 'YEARLY',
        rentAmount: price.rent_amount,
        serviceCharge: price.service_charge || 0,
        agencyFee: price.agency_fee || 0,
        cautionFee: price.caution_fee || 0,
        otherMandatoryCharges: price.other_mandatory_charges || 0,
        legalFee: price.legal_fee || 0,
        totalMandatoryCost: price.total_mandatory_cost || price.rent_amount,
        totalRefundableCost: price.total_refundable_cost || 0,
        isNegotiable: Boolean(price.is_negotiable)
      } : {
        period: 'YEARLY',
        rentAmount: 180000,
        serviceCharge: 0,
        agencyFee: 0,
        cautionFee: 15000,
        otherMandatoryCharges: 0,
        legalFee: 0,
        totalMandatoryCost: 195000,
        totalRefundableCost: 15000,
        isNegotiable: false
      },
      keyAmenities: keyAmenities.length > 0 ? keyAmenities : [
        { key: 'water', name: 'Running Water', icon: 'droplet' },
        { key: 'electricity', name: 'Prepaid Meter', icon: 'zap' },
        { key: 'security', name: 'Fenced & Gated', icon: 'shield' }
      ],
      amenities: p.amenities ? (typeof p.amenities === 'string' ? JSON.parse(p.amenities) : p.amenities) : [],
      images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [],
      rules: p.rules ? (typeof p.rules === 'string' ? JSON.parse(p.rules) : p.rules) : [],
      bills_included: p.bills_included ? (typeof p.bills_included === 'string' ? JSON.parse(p.bills_included) : p.bills_included) : [],
      security_features: p.security_features ? (typeof p.security_features === 'string' ? JSON.parse(p.security_features) : p.security_features) : []
    };
  }) : [];

  const areas = tables.includes('areas') ? db.prepare('SELECT * FROM areas').all() : [];
  const bookings = tables.includes('bookings') ? db.prepare('SELECT * FROM bookings').all() : [];
  const fourKVideos = tables.includes('four_k_videos') ? db.prepare(`
    SELECT v.*, p.title as propertyTitle, p.address as propertyAddress, p.cover_image as propertyCover,
           COALESCE(u.full_name, 'Verified Agent') as providerName,
           COALESCE(u.email, 'agent@hostelease.ng') as providerEmail,
           COALESCE(u.phone, '08012345678') as providerPhone,
           CASE WHEN v.status = 'VERIFIED' THEN 1 ELSE 0 END as isVerified
    FROM four_k_videos v
    LEFT JOIN properties p ON v.property_id = p.id
    LEFT JOIN users u ON v.agent_id = u.id
    ORDER BY v.created_at DESC
  `).all() : [];

  const savedProperties = tables.includes('saved_properties') ? db.prepare('SELECT * FROM saved_properties').all() : [];
  const inspectionRequests = tables.includes('inspection_requests') ? db.prepare('SELECT * FROM inspection_requests').all() : [];
  const reviews = tables.includes('reviews') ? db.prepare('SELECT * FROM reviews').all() : [];
  const communityQuestions = tables.includes('community_questions') ? db.prepare('SELECT * FROM community_questions').all() : [];
  const maintenanceTickets = tables.includes('maintenance_tickets') ? db.prepare('SELECT * FROM maintenance_tickets').all() : [];

  const outDir = path.resolve('src/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    version: '2026.10',
    exportedAt: new Date().toISOString(),
    users,
    properties,
    areas,
    bookings,
    four_k_videos: fourKVideos,
    saved_properties: savedProperties,
    inspection_requests: inspectionRequests,
    reviews,
    community_questions: communityQuestions,
    maintenance_tickets: maintenanceTickets
  };

  fs.writeFileSync(path.join(outDir, 'initialDataSnapshot.json'), JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Snapshot exported successfully:
  - Users: ${users.length}
  - Properties: ${properties.length}
  - 4K Videos: ${fourKVideos.length}
  - Saved Properties: ${savedProperties.length}
  - Areas: ${areas.length}
  - Bookings: ${bookings.length}
  - Inspections: ${inspectionRequests.length}`);
}

exportData();
