import db from './db.js';

export function runMigrations() {
  console.log('🔄 Running Hostel Ease database migrations (Phase 1 & Phase 2)...');

  db.transaction(() => {
    // 1. Universities table
    db.exec(`
      CREATE TABLE IF NOT EXISTS universities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'Nigeria',
        main_campus_lat REAL,
        main_campus_lng REAL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 2. Areas table
    db.exec(`
      CREATE TABLE IF NOT EXISTS areas (
        id TEXT PRIMARY KEY,
        university_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        landmark TEXT,
        approx_distance_min_km REAL NOT NULL DEFAULT 0.5,
        approx_distance_max_km REAL NOT NULL DEFAULT 2.5,
        center_lat REAL,
        center_lng REAL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_areas_university ON areas(university_id);
    `);

    // 3. Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL CHECK(role IN ('STUDENT', 'PROVIDER', 'ADMIN')),
        is_active INTEGER NOT NULL DEFAULT 1,
        avatar_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // 4. Student Profiles
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        university_id TEXT NOT NULL,
        matric_no TEXT,
        department TEXT,
        level TEXT,
        gender TEXT CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
      );
    `);

    // Recreate Provider Profiles to ensure full column and check compatibility
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        business_name TEXT,
        address TEXT,
        provider_type TEXT NOT NULL DEFAULT 'HOSTEL_OWNER',
        id_type TEXT,
        bio TEXT,
        preferred_contact_method TEXT NOT NULL DEFAULT 'ANY',
        verification_status TEXT NOT NULL DEFAULT 'PENDING',
        phone_verified INTEGER NOT NULL DEFAULT 0,
        admin_feedback TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_verif ON provider_profiles(verification_status);
    `);

    // 6. Properties table (Ensuring DRAFT and PENDING_REVIEW support)
    db.exec(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        university_id TEXT NOT NULL,
        area_id TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        address TEXT NOT NULL,
        nearby_landmark TEXT,
        latitude REAL,
        longitude REAL,
        distance_from_campus_km REAL NOT NULL,
        property_type TEXT NOT NULL CHECK(property_type IN ('SELF_CONTAIN', 'SINGLE_ROOM', 'FLAT', 'SHARED_BEDSPACE')),
        gender_preference TEXT NOT NULL DEFAULT 'ANY' CHECK(gender_preference IN ('ANY', 'MALE_ONLY', 'FEMALE_ONLY')),
        total_rooms INTEGER NOT NULL DEFAULT 1,
        verification_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        availability_status TEXT NOT NULL DEFAULT 'AVAILABLE',
        is_demo INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        admin_feedback_notes TEXT,
        rejection_reason TEXT,
        completeness_score INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
        FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_id);
      CREATE INDEX IF NOT EXISTS idx_properties_university ON properties(university_id);
      CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(verification_status, availability_status);
      CREATE INDEX IF NOT EXISTS idx_properties_provider ON properties(provider_id);
    `);

    // 7. Rooms table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        room_name TEXT NOT NULL,
        room_type TEXT NOT NULL CHECK(room_type IN ('SELF_CONTAIN', 'SINGLE_ROOM', 'FLAT', 'SHARED_BEDSPACE')),
        max_occupants INTEGER NOT NULL DEFAULT 1,
        quantity_total INTEGER NOT NULL DEFAULT 1,
        quantity_available INTEGER NOT NULL DEFAULT 1,
        occupied_count INTEGER NOT NULL DEFAULT 0,
        is_ensuite INTEGER NOT NULL DEFAULT 1,
        is_furnished INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
    `);

    // 8. Bedspaces table
    db.exec(`
      CREATE TABLE IF NOT EXISTS bedspaces (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        bedspace_number TEXT NOT NULL,
        is_occupied INTEGER NOT NULL DEFAULT 0,
        price_override REAL,
        gender_preference TEXT NOT NULL DEFAULT 'ANY',
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bedspaces_room ON bedspaces(room_id);
    `);

    // 9. Prices table
    db.exec(`
      CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        room_id TEXT,
        period TEXT NOT NULL DEFAULT 'YEARLY',
        rent_amount REAL NOT NULL,
        service_charge REAL NOT NULL DEFAULT 0,
        agency_fee REAL NOT NULL DEFAULT 0,
        caution_fee REAL NOT NULL DEFAULT 0,
        other_mandatory_charges REAL NOT NULL DEFAULT 0,
        legal_fee REAL NOT NULL DEFAULT 0,
        optional_charges REAL NOT NULL DEFAULT 0,
        is_negotiable INTEGER NOT NULL DEFAULT 0,
        total_mandatory_cost REAL NOT NULL,
        total_refundable_cost REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prices_property ON prices(property_id);
    `);

    // 10. Price History table
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        room_id TEXT,
        provider_id TEXT NOT NULL,
        previous_rent REAL NOT NULL,
        new_rent REAL NOT NULL,
        previous_total_mandatory REAL NOT NULL,
        new_total_mandatory REAL NOT NULL,
        change_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_price_history_prop ON price_history(property_id);
    `);

    // 11. Property Status History table
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_status_history (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        admin_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_status_history_prop ON property_status_history(property_id);
    `);

    // 12. Amenities catalog
    db.exec(`
      CREATE TABLE IF NOT EXISTS amenities (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'BASIC',
        icon TEXT NOT NULL,
        description TEXT
      );
    `);

    // 13. Property Amenities mapping
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_amenities (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        amenity_id TEXT NOT NULL,
        is_available INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE,
        UNIQUE(property_id, amenity_id)
      );
      CREATE INDEX IF NOT EXISTS idx_prop_amenities_prop ON property_amenities(property_id);
    `);

    // 14. Property Media table
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_media (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'IMAGE',
        category TEXT NOT NULL DEFAULT 'EXTERIOR',
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_cover INTEGER NOT NULL DEFAULT 0,
        is_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prop_media_prop ON property_media(property_id);
    `);

    // 15. Verification Documents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_documents (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        property_id TEXT,
        document_type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        admin_feedback TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_verif_docs_provider ON verification_documents(provider_id);
    `);

    // 16. Saved Properties
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        UNIQUE(user_id, property_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_properties(user_id);
    `);

    // 17. Inspection Requests table
    db.exec(`
      CREATE TABLE IF NOT EXISTS inspection_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        inspection_type TEXT NOT NULL,
        preferred_date TEXT NOT NULL,
        preferred_time TEXT NOT NULL,
        proposed_alternative_date TEXT,
        proposed_alternative_time TEXT,
        student_phone TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        provider_response TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_inspections_student ON inspection_requests(student_id);
      CREATE INDEX IF NOT EXISTS idx_inspections_property ON inspection_requests(property_id);
    `);

    // 18. Listing Reports table
    db.exec(`
      CREATE TABLE IF NOT EXISTS listing_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        admin_action_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_reports_property ON listing_reports(property_id);
    `);

    // 19. In-App Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        link_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
    `);

    // 20. Audit Logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
    `);

    // 21. Reviews table
    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        clean_rating INTEGER CHECK(clean_rating BETWEEN 1 AND 5),
        security_rating INTEGER CHECK(security_rating BETWEEN 1 AND 5),
        water_rating INTEGER CHECK(water_rating BETWEEN 1 AND 5),
        electricity_rating INTEGER CHECK(electricity_rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL,
        is_verified_stay INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);
    `);

    // 22. Search History (Phase 3)
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        query TEXT NOT NULL,
        filters_json TEXT,
        result_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_search_hist_user ON search_history(user_id);
    `);

    // 23. Recently Viewed Hostels (Phase 3)
    db.exec(`
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        property_id TEXT NOT NULL,
        viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        UNIQUE(user_id, property_id)
      );
      CREATE INDEX IF NOT EXISTS idx_recent_view_user ON recently_viewed(user_id, viewed_at);
    `);

    // Performance Composite Indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_properties_disc_comp ON properties(verification_status, availability_status, property_type, area_id);
      CREATE INDEX IF NOT EXISTS idx_properties_dist ON properties(distance_from_campus_km);
    `);

    // Saved property price & availability tracking columns
    function addColumnIfMissing(table: string, column: string, definition: string) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      if (!columns.some(col => col.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    }

    // Ensure audit_logs security columns exist
    addColumnIfMissing('audit_logs', 'severity', "TEXT NOT NULL DEFAULT 'LOW'");
    addColumnIfMissing('audit_logs', 'actor_email', 'TEXT');
    addColumnIfMissing('audit_logs', 'user_agent', 'TEXT');
    // 24. Conversations table (Phase 4)
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        last_message_text TEXT,
        last_message_at TEXT DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(property_id, student_id, provider_id)
      );
      CREATE INDEX IF NOT EXISTS idx_conv_student ON conversations(student_id);
      CREATE INDEX IF NOT EXISTS idx_conv_provider ON conversations(provider_id);
      CREATE INDEX IF NOT EXISTS idx_conv_property ON conversations(property_id);
    `);

    // 25. Messages table (Phase 4)
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'TEXT',
        content TEXT NOT NULL,
        metadata_json TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_msg_unread ON messages(conversation_id, is_read);
    `);

    // 26. Inspection Status History (Phase 4)
    db.exec(`
      CREATE TABLE IF NOT EXISTS inspection_status_history (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (inspection_id) REFERENCES inspection_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_insp_hist_insp ON inspection_status_history(inspection_id);
    `);

    // 27. Communication & User Moderation Reports (Phase 4)
    db.exec(`
      CREATE TABLE IF NOT EXISTS communication_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reported_user_id TEXT NOT NULL,
        conversation_id TEXT,
        reason TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        admin_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comm_reports_user ON communication_reports(reported_user_id);
    `);

    // 28. Bookings table (Phase 5)
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        booking_reference TEXT NOT NULL UNIQUE,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        bedspace_id TEXT,
        move_in_date TEXT NOT NULL,
        academic_session TEXT NOT NULL DEFAULT '2026/2027',
        duration_months INTEGER NOT NULL DEFAULT 12,
        rent_amount REAL NOT NULL,
        service_charge REAL NOT NULL DEFAULT 0,
        agency_fee REAL NOT NULL DEFAULT 0,
        caution_deposit REAL NOT NULL DEFAULT 0,
        other_charges REAL NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED_BY_STUDENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED', 'COMPLETED')),
        expires_at TEXT NOT NULL,
        cancellation_reason TEXT,
        decline_reason TEXT,
        special_requests TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
        FOREIGN KEY (bedspace_id) REFERENCES bedspaces(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(booking_reference);
      CREATE INDEX IF NOT EXISTS idx_bookings_bedspace_active ON bookings(bedspace_id, status);
      CREATE INDEX IF NOT EXISTS idx_bookings_room_active ON bookings(room_id, status);
    `);

    // 29. Booking Status History table (Phase 5)
    db.exec(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_booking_hist_booking ON booking_status_history(booking_id);
    `);

    // 30. Payments Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        payment_reference TEXT NOT NULL UNIQUE,
        booking_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        amount REAL NOT NULL,
        platform_fee REAL NOT NULL DEFAULT 0,
        provider_amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'NGN',
        payment_provider TEXT NOT NULL DEFAULT 'TEST_GATEWAY',
        provider_transaction_reference TEXT,
        payment_method TEXT NOT NULL DEFAULT 'CARD',
        channel TEXT DEFAULT 'WEB',
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
        paid_at TEXT,
        verified_at TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(payment_reference);
      CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
      CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    `);

    // 31. Payment Attempts Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_attempts (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        attempt_reference TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'INITIALIZED',
        gateway_response TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_pay_attempts_pay ON payment_attempts(payment_id);
      CREATE INDEX IF NOT EXISTS idx_pay_attempts_ref ON payment_attempts(attempt_reference);
    `);

    // 32. Payment Webhook Events Table (Phase 6 - Idempotent event store)
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_id TEXT,
        signature TEXT,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PROCESSED',
        error_message TEXT,
        processed_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_events_prov ON payment_webhook_events(provider, event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_eid ON payment_webhook_events(event_id);
    `);

    // 33. Refunds Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS refunds (
        id TEXT PRIMARY KEY,
        refund_reference TEXT NOT NULL UNIQUE,
        payment_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
        initiated_by TEXT NOT NULL,
        approved_by TEXT,
        provider_refund_reference TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
        FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS idx_refunds_pay ON refunds(payment_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_ref ON refunds(refund_reference);
      CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
    `);

    // 34. Financial Ledger Table (Phase 6 - Immutable financial audit trail)
    db.exec(`
      CREATE TABLE IF NOT EXISTS financial_ledger (
        id TEXT PRIMARY KEY,
        payment_id TEXT,
        booking_id TEXT,
        refund_id TEXT,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('PAYMENT_RECEIVED', 'PLATFORM_FEE_DEDUCTED', 'PROVIDER_EARNING_CREDITED', 'REFUND_DEBITED', 'PAYOUT_PROCESSED')),
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'NGN',
        debit_account TEXT NOT NULL,
        credit_account TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_pay ON financial_ledger(payment_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_booking ON financial_ledger(booking_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_type ON financial_ledger(entry_type);
    `);

    // 35. Platform Fee Configs Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS platform_fee_configs (
        id TEXT PRIMARY KEY,
        fee_name TEXT NOT NULL,
        fee_type TEXT NOT NULL DEFAULT 'FIXED' CHECK(fee_type IN ('FIXED', 'PERCENTAGE')),
        fee_value REAL NOT NULL DEFAULT 2500,
        is_active INTEGER NOT NULL DEFAULT 1,
        min_fee REAL,
        max_fee REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Seed default platform fee config if not exists
    const defaultFee = db.prepare('SELECT id FROM platform_fee_configs WHERE is_active = 1').get();
    if (!defaultFee) {
      db.prepare(`
        INSERT INTO platform_fee_configs (id, fee_name, fee_type, fee_value, is_active, min_fee, max_fee)
        VALUES ('fee-default', 'Standard Student Platform Service Fee', 'FIXED', 2500, 1, 1000, 5000)
      `).run();
    }

    // 36. Payment Disputes Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_disputes (
        id TEXT PRIMARY KEY,
        dispute_reference TEXT NOT NULL UNIQUE,
        booking_id TEXT NOT NULL,
        payment_id TEXT,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
        resolution_notes TEXT,
        resolved_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_disputes_booking ON payment_disputes(booking_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_status ON payment_disputes(status);
    `);

    // 37. Provider Payout Accounts Table (Phase 6)
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_payout_accounts (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        bank_code TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_name TEXT NOT NULL,
        is_verified INTEGER NOT NULL DEFAULT 0,
        is_primary INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_payout_acc_prov ON provider_payout_accounts(provider_id);
    `);

    // 38. Student Preferences Table (Phase 7 - Personalization & Budget Profile)
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        min_budget REAL NOT NULL DEFAULT 100000,
        max_budget REAL NOT NULL DEFAULT 250000,
        preferred_areas_json TEXT NOT NULL DEFAULT '[]',
        preferred_room_types_json TEXT NOT NULL DEFAULT '[]',
        preferred_facilities_json TEXT NOT NULL DEFAULT '[]',
        max_distance_km REAL NOT NULL DEFAULT 2.5,
        gender_preference TEXT NOT NULL DEFAULT 'ANY' CHECK(gender_preference IN ('ANY', 'MALE_ONLY', 'FEMALE_ONLY')),
        preferred_move_in_date TEXT,
        is_move_in_flexible INTEGER NOT NULL DEFAULT 1,
        academic_session TEXT NOT NULL DEFAULT '2026/2027',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_student_pref_user ON student_preferences(user_id);
    `);

    // 39. Recently Viewed Hostels Table (Phase 7)
    db.exec(`
      CREATE TABLE IF NOT EXISTS recently_viewed_hostels (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        UNIQUE(user_id, property_id)
      );
      CREATE INDEX IF NOT EXISTS idx_rec_view_user_time ON recently_viewed_hostels(user_id, viewed_at);
    `);

    // 40. Student Search History Table (Phase 7)
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_search_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query_text TEXT NOT NULL,
        filter_criteria_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_search_hist_user ON student_search_history(user_id, created_at);
    `);

    // 41. Student Notification Preferences Table (Phase 7)
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        inspection_reminders INTEGER NOT NULL DEFAULT 1,
        availability_alerts INTEGER NOT NULL DEFAULT 1,
        price_alerts INTEGER NOT NULL DEFAULT 1,
        recommendation_alerts INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON student_notification_preferences(user_id);
    `);

    // =========================================================================
    // PHASE 8: AI ACCOMMODATION ASSISTANT TABLES
    // =========================================================================
    // 42. AI Conversations Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Accommodation Inquiry',
        context_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK(context_type IN ('GENERAL', 'HOSTEL_DETAILS', 'SEARCH', 'INSPECTION', 'BOOKING', 'COMPARISON')),
        context_property_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (context_property_id) REFERENCES properties(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_conv_student ON ai_conversations(student_id, updated_at DESC);
    `);

    // 43. AI Messages Table (Conversational turns with structured UI data & tool calls)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL CHECK(sender IN ('USER', 'AI', 'SYSTEM')),
        content TEXT NOT NULL,
        structured_data TEXT,
        tool_calls TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id, created_at ASC);
    `);

    // 44. AI Feedback Table (Student rating on AI helpfulness)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        rating TEXT NOT NULL CHECK(rating IN ('HELPFUL', 'UNHELPFUL')),
        comment TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (message_id) REFERENCES ai_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ai_feed_msg ON ai_feedback(message_id);
      CREATE INDEX IF NOT EXISTS idx_ai_feed_student ON ai_feedback(student_id);
    `);

    // 45. AI Usage & Safety Monitoring Logs (Admin aggregation & Rate-limiting analysis)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        endpoint TEXT NOT NULL,
        query_text TEXT,
        tool_name TEXT,
        status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR', 'FALLBACK', 'RATE_LIMITED', 'SAFETY_FLAG')),
        error_message TEXT,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_student ON ai_usage_logs(student_id);
    `);

    // =========================================================================
    // PHASE 9: PROVIDER PORTAL & HOSTEL MANAGEMENT TABLES
    // =========================================================================
    // 46. Provider Inspection Schedules Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_inspection_schedules (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        property_id TEXT,
        day_of_week TEXT NOT NULL CHECK(day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
        is_available INTEGER NOT NULL DEFAULT 1,
        start_time TEXT NOT NULL DEFAULT '10:00 AM',
        end_time TEXT NOT NULL DEFAULT '04:00 PM',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prov_sched_prov ON provider_inspection_schedules(provider_id);
    `);

    // 47. Provider Quick Replies Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_quick_replies (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message_text TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL',
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_quick_replies_prov ON provider_quick_replies(provider_id);
    `);

    // 48. Provider Team Roles & Access Control Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_team_roles (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('OWNER', 'MANAGER', 'STAFF')),
        property_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_team_roles_prov ON provider_team_roles(provider_id);
      CREATE INDEX IF NOT EXISTS idx_team_roles_user ON provider_team_roles(user_id);
    `);

    // 49. Admin Profiles & RBAC Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        admin_role TEXT NOT NULL DEFAULT 'ADMIN' CHECK(admin_role IN ('SUPER_ADMIN', 'ADMIN', 'VERIFICATION_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'MODERATION_ADMIN')),
        department TEXT,
        permissions_json TEXT NOT NULL DEFAULT '[]',
        is_super_admin INTEGER NOT NULL DEFAULT 0,
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(admin_role);
    `);

    // 50. Verification Reviews & Audit History Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_reviews (
        id TEXT PRIMARY KEY,
        property_id TEXT,
        provider_id TEXT,
        admin_id TEXT NOT NULL,
        checklist_json TEXT NOT NULL DEFAULT '{}',
        decision TEXT NOT NULL CHECK(decision IN ('APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED', 'SUSPENDED')),
        notes TEXT,
        valid_until TEXT,
        next_review_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_verif_reviews_prop ON verification_reviews(property_id);
      CREATE INDEX IF NOT EXISTS idx_verif_reviews_prov ON verification_reviews(provider_id);
    `);

    // 51. Support Tickets Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        ticket_code TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('BOOKING', 'PAYMENT', 'HOSTEL', 'PROVIDER', 'INSPECTION', 'ACCOUNT', 'TECHNICAL', 'SAFETY', 'OTHER')),
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED')),
        priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        assigned_admin_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    `);

    // 52. Support Ticket Messages Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL CHECK(sender_type IN ('USER', 'ADMIN')),
        message TEXT NOT NULL,
        attachments_json TEXT DEFAULT '[]',
        is_internal_note INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_support_msgs_ticket ON support_ticket_messages(ticket_id);
    `);

    // 53. Platform Announcements Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS platform_announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        target_audience TEXT NOT NULL DEFAULT 'ALL' CHECK(target_audience IN ('ALL', 'STUDENTS', 'PROVIDERS')),
        priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL', 'IMPORTANT', 'CRITICAL')),
        is_published INTEGER NOT NULL DEFAULT 1,
        starts_at TEXT,
        expires_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_announcements_pub ON platform_announcements(is_published, target_audience);
    `);

    // 54. System Health Events Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_health_events (
        id TEXT PRIMARY KEY,
        service_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('HEALTHY', 'WARNING', 'CRITICAL')),
        error_code TEXT,
        message TEXT NOT NULL,
        details_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_health_events_srv ON system_health_events(service_name, created_at);
    `);

    // 55. Admin Internal Notes Table (Phase 10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_internal_notes (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        admin_id TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_admin_notes_entity ON admin_internal_notes(entity_type, entity_id);
    `);

    // 56. Disputes Table (Phase 11)
    db.exec(`
      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        dispute_code TEXT NOT NULL UNIQUE,
        booking_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('HOSTEL_NOT_AS_DESCRIBED', 'PROVIDER_ISSUE', 'PAYMENT_ISSUE', 'BOOKING_ISSUE', 'REFUND_ISSUE', 'INSPECTION_ISSUE', 'SAFETY_ISSUE', 'OTHER')),
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_json TEXT DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION', 'ESCALATED', 'RESOLVED', 'CLOSED')),
        resolution_type TEXT CHECK(resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND', 'NO_ACTION', 'PROVIDER_WARNING', 'LISTING_SUSPENDED', 'OTHER')),
        resolution_notes TEXT,
        refund_amount REAL DEFAULT 0,
        resolved_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_disputes_booking ON disputes(booking_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_student ON disputes(student_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_provider ON disputes(provider_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    `);

    // 57. Dispute Messages Table (Phase 11)
    db.exec(`
      CREATE TABLE IF NOT EXISTS dispute_messages (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_role TEXT NOT NULL CHECK(sender_role IN ('STUDENT', 'PROVIDER', 'ADMIN')),
        message TEXT NOT NULL,
        evidence_json TEXT DEFAULT '[]',
        is_internal_note INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dispute_msgs_disp ON dispute_messages(dispute_id);
    `);

    // 58. Booking Move-In Checklists Table (Phase 11)
    db.exec(`
      CREATE TABLE IF NOT EXISTS booking_move_in_checklists (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        checklist_json TEXT NOT NULL DEFAULT '{}',
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_move_in_booking ON booking_move_in_checklists(booking_id);
    `);

    // =========================================================================
    // PHASE 12: MOVE-IN & POST-BOOKING EXPERIENCE TABLES
    // =========================================================================

    // 59. Move-In Records Table (Central student move-in lifecycle)
    db.exec(`
      CREATE TABLE IF NOT EXISTS move_in_records (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL UNIQUE,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        bedspace_id TEXT,
        move_in_date TEXT NOT NULL,
        scheduled_arrival_time TEXT,
        status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK(status IN ('NOT_STARTED', 'PREPARING', 'READY', 'MOVE_IN_DAY', 'ARRIVED', 'MOVED_IN', 'COMPLETED', 'CANCELLED')),
        arrival_confirmed_at TEXT,
        accepted_at TEXT,
        post_move_in_rating TEXT,
        post_move_in_feedback TEXT,
        move_in_instructions TEXT,
        key_collection_point TEXT,
        emergency_contact_phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_movein_rec_booking ON move_in_records(booking_id);
      CREATE INDEX IF NOT EXISTS idx_movein_rec_student ON move_in_records(student_id);
      CREATE INDEX IF NOT EXISTS idx_movein_rec_provider ON move_in_records(provider_id);
      CREATE INDEX IF NOT EXISTS idx_movein_rec_status ON move_in_records(status);
    `);

    // 60. Move-In Condition Reports Table (Room inspection by tenant)
    db.exec(`
      CREATE TABLE IF NOT EXISTS move_in_condition_reports (
        id TEXT PRIMARY KEY,
        move_in_record_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        overall_condition TEXT NOT NULL DEFAULT 'GOOD' CHECK(overall_condition IN ('GOOD', 'MINOR_ISSUES', 'MAJOR_ISSUES', 'NOT_AS_DESCRIBED')),
        room_checks_json TEXT NOT NULL DEFAULT '{}',
        comments TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (move_in_record_id) REFERENCES move_in_records(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_condition_rep_rec ON move_in_condition_reports(move_in_record_id);
      CREATE INDEX IF NOT EXISTS idx_condition_rep_booking ON move_in_condition_reports(booking_id);
    `);

    // 61. Move-In Photos Table (Timestamped room condition proof)
    db.exec(`
      CREATE TABLE IF NOT EXISTS move_in_photos (
        id TEXT PRIMARY KEY,
        move_in_record_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        uploader_id TEXT NOT NULL,
        uploader_role TEXT NOT NULL DEFAULT 'STUDENT' CHECK(uploader_role IN ('STUDENT', 'PROVIDER', 'ADMIN')),
        photo_url TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL',
        caption TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (move_in_record_id) REFERENCES move_in_records(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_movein_photos_rec ON move_in_photos(move_in_record_id);
      CREATE INDEX IF NOT EXISTS idx_movein_photos_booking ON move_in_photos(booking_id);
    `);

    // 62. Move-In Issues Table (Discovered problems & provider response)
    db.exec(`
      CREATE TABLE IF NOT EXISTS move_in_issues (
        id TEXT PRIMARY KEY,
        issue_code TEXT NOT NULL UNIQUE,
        move_in_record_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('ELECTRICITY', 'WATER', 'ROOM', 'FURNITURE', 'SECURITY', 'CLEANLINESS', 'BATHROOM', 'INTERNET', 'OTHER')),
        severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_FOR_STUDENT', 'RESOLVED', 'ESCALATED', 'CLOSED')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_json TEXT DEFAULT '[]',
        provider_response TEXT,
        provider_action_date TEXT,
        student_confirmed_resolved INTEGER NOT NULL DEFAULT 0,
        escalated_dispute_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (move_in_record_id) REFERENCES move_in_records(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (escalated_dispute_id) REFERENCES disputes(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_movein_issues_rec ON move_in_issues(move_in_record_id);
      CREATE INDEX IF NOT EXISTS idx_movein_issues_booking ON move_in_issues(booking_id);
      CREATE INDEX IF NOT EXISTS idx_movein_issues_status ON move_in_issues(status);
      CREATE INDEX IF NOT EXISTS idx_movein_issues_prov ON move_in_issues(provider_id);
    `);

    // 63. Hostel Rules Configuration Table (Versioned rules configured by landlord)
    db.exec(`
      CREATE TABLE IF NOT EXISTS hostel_rules_config (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        rules_json TEXT NOT NULL DEFAULT '[]',
        move_in_instructions TEXT,
        key_collection_point TEXT,
        emergency_contact_phone TEXT,
        effective_date TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rules_prop_ver ON hostel_rules_config(property_id, version);
    `);

    // 64. Rule Acknowledgements Table (Student versioned acknowledgement timestamp)
    db.exec(`
      CREATE TABLE IF NOT EXISTS rule_acknowledgements (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        rule_version INTEGER NOT NULL DEFAULT 1,
        acknowledged_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rule_ack_booking ON rule_acknowledgements(booking_id);
    `);

    // 65. Move-Out Records Table (Move-out checklist, confirmation, caution deposit tracking)
    db.exec(`
      CREATE TABLE IF NOT EXISTS move_out_records (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL UNIQUE,
        student_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        move_out_date TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'STUDENT_CONFIRMED', 'PROVIDER_CONFIRMED', 'COMPLETED')),
        checklist_json TEXT NOT NULL DEFAULT '{}',
        deposit_paid REAL NOT NULL DEFAULT 0,
        deposit_deduction REAL NOT NULL DEFAULT 0,
        deposit_deduction_reason TEXT,
        deposit_refund_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(deposit_refund_status IN ('PENDING', 'APPROVED', 'REFUNDED', 'DISPUTED')),
        student_confirmed_at TEXT,
        provider_confirmed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_moveout_booking ON move_out_records(booking_id);
    `);

    // Add Phase 12 columns to bookings
    addColumnIfMissing('bookings', 'scheduled_arrival_time', 'TEXT');
    addColumnIfMissing('bookings', 'move_in_status', "TEXT NOT NULL DEFAULT 'NOT_STARTED'");
    addColumnIfMissing('bookings', 'move_in_instructions', 'TEXT');
    addColumnIfMissing('bookings', 'caution_deposit_deduction', 'REAL DEFAULT 0');
    addColumnIfMissing('bookings', 'caution_deposit_deduction_reason', 'TEXT');

    // Add Phase 11 columns to bookings
    addColumnIfMissing('bookings', 'cancellation_fee', 'REAL DEFAULT 0');
    addColumnIfMissing('bookings', 'expected_refund_amount', 'REAL DEFAULT 0');
    addColumnIfMissing('bookings', 'cancellation_reason_type', 'TEXT');
    addColumnIfMissing('bookings', 'alternative_hostel_ids_json', "TEXT DEFAULT '[]'");

    // Add Phase 10 columns to users
    addColumnIfMissing('users', 'account_status', "TEXT NOT NULL DEFAULT 'ACTIVE'");
    addColumnIfMissing('users', 'status_reason', 'TEXT');
    addColumnIfMissing('users', 'suspended_at', 'TEXT');
    addColumnIfMissing('users', 'restricted_at', 'TEXT');

    // Add Phase 10 columns to properties
    addColumnIfMissing('properties', 'verified_by', 'TEXT');
    addColumnIfMissing('properties', 'verification_expires_at', 'TEXT');
    addColumnIfMissing('properties', 'next_review_at', 'TEXT');
    addColumnIfMissing('properties', 'verification_checklist_json', "TEXT DEFAULT '{}'");

    // Add Phase 9 columns to provider_profiles
    addColumnIfMissing('provider_profiles', 'onboarding_completed', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing('provider_profiles', 'onboarding_step', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing('provider_profiles', 'business_reg_no', 'TEXT');
    addColumnIfMissing('provider_profiles', 'management_type', "TEXT DEFAULT 'DIRECT_OWNER'");
    addColumnIfMissing('provider_profiles', 'office_location', 'TEXT');

    // Add Phase 9 columns to properties
    addColumnIfMissing('properties', 'rules_json', "TEXT DEFAULT '[]'");
    addColumnIfMissing('properties', 'landmark_notes', 'TEXT');

    // Add Phase 6 columns to bookings
    addColumnIfMissing('bookings', 'payment_status', "TEXT NOT NULL DEFAULT 'UNPAID'");
    addColumnIfMissing('bookings', 'paid_at', 'TEXT');

    // Phase 4 Inspection Columns
    addColumnIfMissing('inspection_requests', 'room_id', 'TEXT');
    addColumnIfMissing('inspection_requests', 'virtual_meeting_url', 'TEXT');
    addColumnIfMissing('inspection_requests', 'private_student_notes', 'TEXT');
    addColumnIfMissing('inspection_requests', 'feedback_rating', 'INTEGER');
    addColumnIfMissing('inspection_requests', 'feedback_comment', 'TEXT');
    addColumnIfMissing('inspection_requests', 'reschedule_reason', 'TEXT');
    addColumnIfMissing('inspection_requests', 'cancellation_reason', 'TEXT');

    // Phase 7 User Columns
    addColumnIfMissing('users', 'department', 'TEXT');
    addColumnIfMissing('users', 'level', 'TEXT');
    addColumnIfMissing('users', 'matric_no', 'TEXT');
    addColumnIfMissing('users', 'gender', "TEXT DEFAULT 'ANY'");

    // Ensure all properties have valid coordinates around LAUTECH
    db.exec(`
      UPDATE properties
      SET latitude = 8.1438, longitude = 4.2638
      WHERE latitude IS NULL OR longitude IS NULL OR latitude < 7.0;
    `);

    // =========================================================================
    // PHASE 13 — STUDENT INTELLIGENCE & STRESS-REDUCTION ENGINE TABLES
    // =========================================================================

    // 1. Student Preferences Profile & Ranked Priorities
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        max_budget REAL,
        monthly_living_budget REAL,
        payment_style_preference TEXT DEFAULT 'FULL_YEAR',
        preferred_locations_json TEXT DEFAULT '[]',
        preferred_room_types_json TEXT DEFAULT '[]',
        target_occupancy INTEGER DEFAULT 1,
        target_move_in_date TEXT,
        max_distance_minutes INTEGER DEFAULT 15,
        ranked_priorities_json TEXT DEFAULT '["PRICE","DISTANCE","ELECTRICITY","SECURITY","WATER","INTERNET","QUIETNESS"]',
        importance_electricity INTEGER DEFAULT 4,
        importance_water INTEGER DEFAULT 4,
        importance_security INTEGER DEFAULT 5,
        importance_internet INTEGER DEFAULT 3,
        importance_quietness INTEGER DEFAULT 3,
        notification_preferences_json TEXT DEFAULT '{"priceAlerts":true,"availabilityAlerts":true,"recommendations":true,"bookingUpdates":true}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_stud_pref_user ON student_preferences(user_id);
    `);

    // 2. Student Preference Audit History
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_preference_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        preferences_json TEXT NOT NULL,
        change_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_stud_pref_hist_user ON student_preference_history(user_id);
    `);

    // 3. Saved Searches & Search Alerts
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        query_text TEXT,
        filters_json TEXT NOT NULL,
        alert_enabled INTEGER NOT NULL DEFAULT 1,
        last_results_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
    `);

    // 4. Search Events & Zero-Result Telemetry (Aggregated for Supply Gap Analytics)
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        query_text TEXT,
        parsed_filters_json TEXT,
        results_count INTEGER NOT NULL DEFAULT 0,
        is_zero_result INTEGER NOT NULL DEFAULT 0,
        requested_location TEXT,
        requested_max_budget REAL,
        requested_room_type TEXT,
        session_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_search_events_zero ON search_events(is_zero_result);
      CREATE INDEX IF NOT EXISTS idx_search_events_created ON search_events(created_at);
    `);

    // 5. Price & Availability Alerts
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_price_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        initial_price REAL NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_notified_price REAL,
        last_notified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON property_price_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_price_alerts_prop ON property_price_alerts(property_id);

      CREATE TABLE IF NOT EXISTS property_availability_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        preferred_room_type TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_notified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_avail_alerts_user ON property_availability_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_avail_alerts_prop ON property_availability_alerts(property_id);
    `);

    // 6. Property Quality Score & Improvement Suggestions (Provider View)
    db.exec(`
      CREATE TABLE IF NOT EXISTS property_quality_scores (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL UNIQUE,
        overall_score INTEGER NOT NULL DEFAULT 70,
        score_breakdown_json TEXT NOT NULL,
        recommendations_json TEXT NOT NULL,
        calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prop_quality_prop ON property_quality_scores(property_id);
    `);

    // 7. Duplicate Listing & Suspicious Activity Flags (Admin View)
    db.exec(`
      CREATE TABLE IF NOT EXISTS duplicate_listing_flags (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        flagged_duplicate_property_id TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'RESOLVED_NOT_DUPLICATE', 'RESOLVED_MERGED', 'RESOLVED_SUSPENDED')),
        admin_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (flagged_duplicate_property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dup_flags_prop ON duplicate_listing_flags(property_id);
    `);

    // 8. Recommendation Feedback (Helpful Yes/No & Reasons)
    db.exec(`
      CREATE TABLE IF NOT EXISTS recommendation_feedbacks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        is_helpful INTEGER NOT NULL,
        rejection_reasons_json TEXT,
        feedback_text TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rec_fb_prop ON recommendation_feedbacks(property_id);
    `);

    // 9. Shortlist Categorization Tags (Top Choice, Maybe, Need to Inspect, Best Value)
    db.exec(`
      CREATE TABLE IF NOT EXISTS shortlist_tags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        tag TEXT NOT NULL DEFAULT 'TOP_CHOICE' CHECK(tag IN ('TOP_CHOICE', 'MAYBE', 'NEED_TO_INSPECT', 'BEST_VALUE', 'BACKUP')),
        personal_notes TEXT,
        priority_rank INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        UNIQUE(user_id, property_id)
      );
      CREATE INDEX IF NOT EXISTS idx_shortlist_tags_user ON shortlist_tags(user_id);
    `);

    // Phase 13 student_preferences column additions
    addColumnIfMissing('student_preferences', 'monthly_living_budget', 'REAL');
    addColumnIfMissing('student_preferences', 'payment_style_preference', "TEXT DEFAULT 'FULL_YEAR'");
    addColumnIfMissing('student_preferences', 'preferred_locations_json', "TEXT DEFAULT '[]'");
    addColumnIfMissing('student_preferences', 'target_occupancy', 'INTEGER DEFAULT 1');
    addColumnIfMissing('student_preferences', 'max_distance_minutes', 'INTEGER DEFAULT 15');
    addColumnIfMissing('student_preferences', 'ranked_priorities_json', `TEXT DEFAULT '["PRICE","DISTANCE","ELECTRICITY","SECURITY","WATER","INTERNET","QUIETNESS"]'`);
    addColumnIfMissing('student_preferences', 'importance_electricity', 'INTEGER DEFAULT 4');
    addColumnIfMissing('student_preferences', 'importance_water', 'INTEGER DEFAULT 4');
    addColumnIfMissing('student_preferences', 'importance_security', 'INTEGER DEFAULT 5');
    addColumnIfMissing('student_preferences', 'importance_internet', 'INTEGER DEFAULT 3');
    addColumnIfMissing('student_preferences', 'importance_quietness', 'INTEGER DEFAULT 3');
    addColumnIfMissing('student_preferences', 'notification_preferences_json', `TEXT DEFAULT '{"priceAlerts":true,"availabilityAlerts":true,"recommendations":true,"bookingUpdates":true}'`);

    // Phase 13 property column additions
    addColumnIfMissing('properties', 'estimated_transport_daily', 'REAL DEFAULT 300');
    addColumnIfMissing('properties', 'power_rating_avg', 'REAL DEFAULT 4.0');
    addColumnIfMissing('properties', 'water_rating_avg', 'REAL DEFAULT 4.0');
    addColumnIfMissing('properties', 'security_rating_avg', 'REAL DEFAULT 4.5');
    addColumnIfMissing('properties', 'internet_rating_avg', 'REAL');
    addColumnIfMissing('properties', 'quietness_rating_avg', 'REAL DEFAULT 4.0');
    addColumnIfMissing('properties', 'repeated_complaint_signal', 'TEXT');

    // Phase 13 review sentiment columns
    addColumnIfMissing('reviews', 'sentiment_likes_json', "TEXT DEFAULT '[]'");
    addColumnIfMissing('reviews', 'sentiment_concerns_json', "TEXT DEFAULT '[]'");

    // =========================================================================
    // PHASE 14: STUDENT COMMUNITY & ROOMMATE SUPPORT TABLES
    // =========================================================================

    // 1. Community Questions
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_questions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL' CHECK(category IN ('GENERAL', 'AREAS', 'INSPECTIONS', 'SCAMS_SAFETY', 'FACILITIES', 'COSTS')),
        property_id TEXT,
        area_id TEXT,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'HIDDEN', 'RESOLVED', 'FLAGGED')),
        is_answered INTEGER NOT NULL DEFAULT 0,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
        FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comm_q_user ON community_questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_comm_q_cat ON community_questions(category, status);
      CREATE INDEX IF NOT EXISTS idx_comm_q_prop ON community_questions(property_id);
    `);

    // 2. Community Answers
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_answers (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        author_role TEXT NOT NULL DEFAULT 'STUDENT' CHECK(author_role IN ('STUDENT', 'PROVIDER', 'ADMIN')),
        content TEXT NOT NULL,
        is_verified_stay INTEGER NOT NULL DEFAULT 0,
        is_verified_student INTEGER NOT NULL DEFAULT 0,
        is_official_guide INTEGER NOT NULL DEFAULT 0,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        unhelpful_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'HIDDEN', 'FLAGGED')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (question_id) REFERENCES community_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comm_a_q ON community_answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_comm_a_user ON community_answers(user_id);
    `);

    // 3. Community Reactions (Helpful / Unhelpful)
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_reactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('QUESTION', 'ANSWER', 'EXPERIENCE', 'GUIDE')),
        entity_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL CHECK(reaction_type IN ('HELPFUL', 'UNHELPFUL')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, entity_type, entity_id)
      );
      CREATE INDEX IF NOT EXISTS idx_comm_react_entity ON community_reactions(entity_type, entity_id);
    `);

    // 4. Hostel Experiences (Structured Multi-Dimensional Student Reviews)
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_experiences (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        booking_id TEXT,
        is_verified_stay INTEGER NOT NULL DEFAULT 0,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        academic_session TEXT NOT NULL DEFAULT '2026/2027',
        duration_months INTEGER DEFAULT 12,
        electricity_notes TEXT,
        water_notes TEXT,
        cleanliness_notes TEXT,
        security_notes TEXT,
        internet_notes TEXT,
        noise_notes TEXT,
        location_notes TEXT,
        facilities_notes TEXT,
        value_notes TEXT,
        overall_experience TEXT NOT NULL,
        positives_summary TEXT,
        concerns_summary TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'HIDDEN', 'FLAGGED')),
        helpful_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comm_exp_prop ON community_experiences(property_id, status);
      CREATE INDEX IF NOT EXISTS idx_comm_exp_user ON community_experiences(user_id);
    `);

    // 5. Optional Roommate Profiles
    db.exec(`
      CREATE TABLE IF NOT EXISTS roommate_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_name TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'ANY' CHECK(gender IN ('MALE', 'FEMALE', 'ANY')),
        department TEXT,
        level TEXT,
        budget_min REAL NOT NULL DEFAULT 80000,
        budget_max REAL NOT NULL DEFAULT 180000,
        preferred_areas_json TEXT NOT NULL DEFAULT '["Under G", "Adenike"]',
        preferred_room_type TEXT NOT NULL DEFAULT 'SHARED_2' CHECK(preferred_room_type IN ('SINGLE_ROOM', 'SHARED_2', 'SHARED_3', 'SHARED_4', 'FLAT')),
        move_in_month TEXT NOT NULL DEFAULT 'September',
        study_environment TEXT NOT NULL DEFAULT 'QUIET' CHECK(study_environment IN ('QUIET', 'COLLABORATIVE', 'FLEXIBLE')),
        cleanliness_expectation TEXT NOT NULL DEFAULT 'VERY_CLEAN' CHECK(cleanliness_expectation IN ('VERY_CLEAN', 'MODERATE', 'RELAXED')),
        sleep_schedule TEXT NOT NULL DEFAULT 'REGULAR' CHECK(sleep_schedule IN ('EARLY_BIRD', 'NIGHT_OWL', 'REGULAR')),
        visitor_preference TEXT NOT NULL DEFAULT 'OCCASIONAL' CHECK(visitor_preference IN ('NO_VISITORS', 'OCCASIONAL', 'WEEKENDS_ONLY', 'FLEXIBLE')),
        about_me TEXT,
        roommate_preferences_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_roommate_user ON roommate_profiles(user_id, is_active);
    `);

    // 6. Roommate Requests & Mutual Matching
    db.exec(`
      CREATE TABLE IF NOT EXISTS roommate_requests (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'ENDED', 'CANCELLED')),
        message TEXT,
        compatibility_score INTEGER NOT NULL DEFAULT 85,
        compatibility_breakdown_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rm_req_pair ON roommate_requests(sender_id, receiver_id);
    `);

    // 7. Mutual Roommate Chat Messages
    db.exec(`
      CREATE TABLE IF NOT EXISTS roommate_messages (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (request_id) REFERENCES roommate_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rm_msg_req ON roommate_messages(request_id);
    `);

    // 8. User Blocks
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id TEXT PRIMARY KEY,
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(blocker_id, blocked_id)
      );
      CREATE INDEX IF NOT EXISTS idx_blocks_pair ON user_blocks(blocker_id, blocked_id);
    `);

    // 9. Community & Roommate Reports
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('QUESTION', 'ANSWER', 'EXPERIENCE', 'ROOMMATE_PROFILE', 'ROOMMATE_CHAT', 'POST', 'GUIDE')),
        entity_id TEXT NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('SPAM', 'SCAM', 'HARASSMENT', 'FALSE_INFORMATION', 'IMPERSONATION', 'INAPPROPRIATE_CONTENT', 'OTHER')),
        description TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'RESOLVED', 'DISMISSED', 'ACTION_TAKEN')),
        admin_notes TEXT,
        action_taken TEXT,
        resolved_by TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comm_rep_status ON community_reports(status);
    `);

    // 10. Official Accommodation Guides
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_guides (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL CHECK(category IN ('FINDING_ACCOMMODATION', 'INSPECTION_CHECKLIST', 'MOVE_IN_AUDIT', 'DAMAGE_DOCUMENTATION', 'SCAM_PREVENTION', 'COST_COMPARISON', 'AREA_GUIDE')),
        content_markdown TEXT NOT NULL,
        author_id TEXT NOT NULL,
        is_verified_guide INTEGER NOT NULL DEFAULT 1,
        read_time_minutes INTEGER NOT NULL DEFAULT 3,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_comm_guides_slug ON community_guides(slug);
    `);

    // 11. Area Information Guides (with Data Provenance)
    db.exec(`
      CREATE TABLE IF NOT EXISTS area_guides (
        id TEXT PRIMARY KEY,
        area_name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        walking_minutes_to_campus INTEGER NOT NULL DEFAULT 10,
        bike_minutes_to_campus INTEGER NOT NULL DEFAULT 4,
        estimated_daily_transport REAL NOT NULL DEFAULT 200,
        power_reliability_summary TEXT,
        water_reliability_summary TEXT,
        security_summary TEXT,
        popular_landmarks_json TEXT DEFAULT '[]',
        nearby_services_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_area_guides_name ON area_guides(area_name);
    `);

    // =========================================================================
    // SEED INITIAL PHASE 14 GUIDES & COMMUNITY DATA
    // =========================================================================

    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get() as any;
    const adminId = adminUser?.id || 'user-admin-1';

    // Seed Official Guides
    const officialGuides = [
      {
        id: 'guide-finding-accommodation-lautech',
        title: 'Complete Guide to Finding Accommodation Around LAUTECH',
        slug: 'finding-accommodation-lautech',
        category: 'FINDING_ACCOMMODATION',
        content_markdown: `### Finding Accommodation Around LAUTECH (Ogbomoso)
Finding a good hostel around LAUTECH requires understanding the key student neighborhoods and checking vital utilities:

1. **Understand Key Neighborhoods**:
   - **Under G**: Very close to campus, within 5–12 mins walk. Highly in demand, active student community.
   - **Adenike**: Popular, quiet residential area, ~12–18 mins walk or 5 mins bike ride.
   - **Stadium Area**: Great for commercial access and fitness, ~15 mins walk.
   - **Isale General / Aroma**: More affordable options with established markets nearby.

2. **Vital Utilities to Inquire About**:
   - **Water**: Inquire whether borehole pumping is on solar or a generator schedule.
   - **Electricity**: Check which feeder line the compound is on and generator running hours.
   - **Security**: Look for high perimeter fencing, security gates, and street lighting.

3. **Payment Protection**:
   - Never pay cash to random middlemen or unverified agents on the street.
   - Always pay through Hostel Ease verified escrow protection to keep your funds secure until physical confirmation.`,
        read_time_minutes: 4
      },
      {
        id: 'guide-inspection-checklist',
        title: 'Comprehensive Pre-Payment Inspection Checklist',
        slug: 'inspection-checklist',
        category: 'INSPECTION_CHECKLIST',
        content_markdown: `### What to Check During Your Physical Hostel Inspection
Never pay rent before inspecting the property or completing a verified video walkthrough.

#### 1. Room Interior
- Check window latches, burglar bars, and door locks for structural firmness.
- Test wall sockets and ceiling fan wiring.
- Check wall paint for signs of dampness, mold, or roof leakages.

#### 2. Water & Bathroom
- Turn on the bathroom tap and flush the toilet to check water pressure.
- Inquire about backup water storage tanks and borehole pumping frequency.

#### 3. Compound & Safety
- Confirm compound gate closing hours and presence of a security guard or compound supervisor.
- Check nighttime lighting along the access road leading to the main street.`,
        read_time_minutes: 3
      },
      {
        id: 'guide-scam-prevention',
        title: 'How to Identify & Avoid Student Accommodation Scams in Ogbomoso',
        slug: 'scam-prevention-lautech',
        category: 'SCAM_PREVENTION',
        content_markdown: `### Common Accommodation Scams & How to Protect Yourself

1. **The "Pay Now to Reserve Space" Street Agent**:
   - *Scam*: An unauthorized agent demands non-refundable deposit into a personal account before showing you the room.
   - *Defense*: Only reserve space through Hostel Ease authorized booking channels where funds are held in escrow.

2. **Double-Letting Rooms**:
   - *Scam*: A departing student collects rent from a fresher pretending to be the landlord's agent.
   - *Defense*: Verify landlord ownership and ensure the room is officially allocated on the platform.

3. **Hidden Surcharges**:
   - *Scam*: Landlords demanding unmentioned extra fees after you move in.
   - *Defense*: Review the **True Cost Estimator** on Hostel Ease before making any payment.`,
        read_time_minutes: 4
      },
      {
        id: 'guide-damage-documentation',
        title: 'Documenting Room Conditions & Move-In Inventory',
        slug: 'damage-documentation-move-in',
        category: 'DAMAGE_DOCUMENTATION',
        content_markdown: `### Protecting Your Caution Deposit with Move-In Inventory
Your caution deposit is refundable upon move-out provided no unauthorized structural damage occurred.

1. **Photo & Video Audit**:
   - Take clear photos of existing wall marks, tile chips, or window defects on move-in day.
   - Upload them to your **Phase 12 Move-In Hub** inspection log.

2. **Written Confirmation**:
   - Get the caretaker or landlord to acknowledge pre-existing issues on your move-in condition checklist.
   - This prevents deduction from your caution fee when vacating at the end of your session.`,
        read_time_minutes: 3
      }
    ];

    for (const g of officialGuides) {
      db.prepare(`
        INSERT OR IGNORE INTO community_guides (
          id, title, slug, category, content_markdown, author_id, is_verified_guide, read_time_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(g.id, g.title, g.slug, g.category, g.content_markdown, adminId, g.read_time_minutes);
    }

    // Seed Area Guides
    const areaGuides = [
      {
        id: 'ag-under-g',
        area_name: 'Under G',
        description: 'Prime student hub located immediately adjacent to LAUTECH main gates. Walking distance to lecture theatres and cafes.',
        walking_minutes_to_campus: 8,
        bike_minutes_to_campus: 3,
        estimated_daily_transport: 0,
        power_reliability_summary: 'Connected to commercial feeder line with backup generator schedules in most lodges.',
        water_reliability_summary: 'Dedicated borehole systems with overhead storage tanks in 90%+ of registered lodges.',
        security_summary: 'Active neighborhood vigilante patrols, gated compounds, and well-lit commercial streets.',
        popular_landmarks_json: '["Bovas Station", "Under G Main Junction", "Senate Building Gate"]',
        nearby_services_json: '["Food Canteens", "Cybercafes & Printing Hubs", "Mini Marts", "Laundry"]'
      },
      {
        id: 'ag-adenike',
        area_name: 'Adenike',
        description: 'Popular residential student area offering quiet study environments, modern self-contain apartments, and organized student communities.',
        walking_minutes_to_campus: 15,
        bike_minutes_to_campus: 5,
        estimated_daily_transport: 200,
        power_reliability_summary: 'Fair public grid stability with widespread solar inverter setups.',
        water_reliability_summary: 'Deep boreholes with regular pumping schedules.',
        security_summary: 'Fenced student lodges with lockable security gates.',
        popular_landmarks_json: '["Adenike Mosque", "Old Stadium Junction", "Alabi Avenue"]',
        nearby_services_json: '["Pharmacies", "Grocery Stores", "Barber & Salons", "Tech Hubs"]'
      },
      {
        id: 'ag-stadium',
        area_name: 'Stadium',
        description: 'Vibrant neighborhood near Ogbomoso stadium with easy access to transport shuttles and open sports grounds.',
        walking_minutes_to_campus: 16,
        bike_minutes_to_campus: 5,
        estimated_daily_transport: 200,
        power_reliability_summary: 'Moderate grid power supplemented by compound generators.',
        water_reliability_summary: 'Consistent borehole water supply.',
        security_summary: 'Gated compound communities with designated caretakers.',
        popular_landmarks_json: '["Ogbomoso Township Stadium", "Stadium Gate", "Express Junction"]',
        nearby_services_json: '["Fitness Centers", "Supermarkets", "Bike Parks", "Restaurants"]'
      },
      {
        id: 'ag-isale-general',
        area_name: 'Isale General',
        description: 'Budget-friendly area near General Hospital with low cost of living and fresh produce markets.',
        walking_minutes_to_campus: 25,
        bike_minutes_to_campus: 8,
        estimated_daily_transport: 400,
        power_reliability_summary: 'Standard municipal electricity supply.',
        water_reliability_summary: 'Borehole and well-water storage systems.',
        security_summary: 'Established residential community with traditional neighborhood security.',
        popular_landmarks_json: '["State Hospital Ogbomoso", "General Market", "Isale General Post Office"]',
        nearby_services_json: '["General Hospital", "Fresh Food Market", "Affordable Eateries", "Pharmacies"]'
      }
    ];

    for (const ag of areaGuides) {
      db.prepare(`
        INSERT OR IGNORE INTO area_guides (
          id, area_name, description, walking_minutes_to_campus, bike_minutes_to_campus,
          estimated_daily_transport, power_reliability_summary, water_reliability_summary,
          security_summary, popular_landmarks_json, nearby_services_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ag.id, ag.area_name, ag.description, ag.walking_minutes_to_campus, ag.bike_minutes_to_campus,
        ag.estimated_daily_transport, ag.power_reliability_summary, ag.water_reliability_summary,
        ag.security_summary, ag.popular_landmarks_json, ag.nearby_services_json
      );
    }

    // Seed Sample Community Questions
    const sampleStudent = db.prepare("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1").get() as any;
    const studentId = sampleStudent?.id || 'user-student-1';

    const sampleQuestions = [
      {
        id: 'cq-1',
        user_id: studentId,
        title: 'Which areas around LAUTECH are best for regular electricity and quiet study?',
        description: 'I am a 300L engineering student looking for a peaceful environment with good light or generator backup. Considering Under G vs Adenike. Any advice?',
        category: 'AREAS',
        is_anonymous: 0
      },
      {
        id: 'cq-2',
        user_id: studentId,
        title: 'What critical things should I inspect before making full payment on a hostel?',
        description: 'Going for physical inspection this weekend. What specific water, electrical, and security items should I look for?',
        category: 'INSPECTIONS',
        is_anonymous: 0
      },
      {
        id: 'cq-3',
        user_id: studentId,
        title: 'How do caution deposit refunds usually work when moving out at the end of the session?',
        description: 'Does the landlord refund the full caution fee or are there common deductions students should know about?',
        category: 'COSTS',
        is_anonymous: 1
      }
    ];

    for (const q of sampleQuestions) {
      db.prepare(`
        INSERT OR IGNORE INTO community_questions (
          id, user_id, title, description, category, is_anonymous, is_answered, view_count
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 42)
      `).run(q.id, q.user_id, q.title, q.description, q.category, q.is_anonymous);
    }

    // Seed Sample Answers
    const sampleAnswers = [
      {
        id: 'ca-1',
        question_id: 'cq-1',
        user_id: studentId,
        author_role: 'STUDENT',
        content: 'Adenike is generally much quieter than Under G if study focus is your priority. Under G is closer to campus (8 mins walk) but can be noisier on weekends. For electricity, look for lodges with a dedicated solar inverter or clear generator hours.',
        is_verified_stay: 1,
        is_verified_student: 1,
        helpful_count: 14,
        unhelpful_count: 0
      },
      {
        id: 'ca-2',
        question_id: 'cq-2',
        user_id: adminId,
        author_role: 'ADMIN',
        content: 'Hostel Ease Official Inspection Guide: (1) Turn on all bathroom taps to test borehole pressure; (2) Inspect window latches and door locks; (3) Check for ceiling or wall dampness; (4) Confirm the compound gate security schedule. Document any pre-existing defects in your Move-In Hub.',
        is_verified_stay: 0,
        is_verified_student: 0,
        helpful_count: 28,
        unhelpful_count: 0
      }
    ];

    for (const a of sampleAnswers) {
      db.prepare(`
        INSERT OR IGNORE INTO community_answers (
          id, question_id, user_id, author_role, content, is_verified_stay, is_verified_student, helpful_count, unhelpful_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        a.id, a.question_id, a.user_id, a.author_role, a.content,
        a.is_verified_stay, a.is_verified_student, a.helpful_count, a.unhelpful_count
      );
    }

    // =========================================================================
    // PHASE 15: COMPLETE OPERATIONS TABLES
    // =========================================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_payouts (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        booking_id TEXT NOT NULL,
        gross_amount REAL NOT NULL,
        platform_fee REAL NOT NULL DEFAULT 0,
        caution_escrow REAL NOT NULL DEFAULT 0,
        net_payout REAL NOT NULL,
        payout_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payout_status IN ('PENDING', 'PROCESSING', 'PAID', 'HELD', 'FAILED')),
        payout_reference TEXT,
        bank_name TEXT,
        account_number TEXT,
        account_name TEXT,
        processed_by TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        paid_at TEXT,
        FOREIGN KEY (provider_id) REFERENCES users(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      );
      CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider ON provider_payouts(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_payouts_status ON provider_payouts(payout_status);

      CREATE TABLE IF NOT EXISTS operational_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK(category IN ('VERIFICATION', 'BOOKING', 'MOVE_IN', 'DISPUTE', 'REFUND', 'MAINTENANCE', 'SUPPORT', 'COMPLIANCE')),
        priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        assigned_to TEXT,
        related_entity_type TEXT,
        related_entity_id TEXT,
        due_date TEXT,
        resolved_at TEXT,
        resolution_notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_op_tasks_status ON operational_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_op_tasks_priority ON operational_tasks(priority);

      CREATE TABLE IF NOT EXISTS listing_refreshes (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        last_confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'NEEDS_REVIEW', 'EXPIRED')),
        next_review_due TEXT NOT NULL,
        confirmed_price REAL,
        confirmed_available_rooms INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (provider_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_listing_refreshes_status ON listing_refreshes(status);

      CREATE TABLE IF NOT EXISTS payment_reconciliations (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        provider_reference TEXT NOT NULL,
        gateway_status TEXT NOT NULL,
        expected_amount REAL NOT NULL,
        settled_amount REAL NOT NULL,
        discrepancy REAL NOT NULL DEFAULT 0,
        reconciled_by TEXT,
        status TEXT NOT NULL DEFAULT 'RECONCILED' CHECK(status IN ('RECONCILED', 'DISCREPANCY_FLAGGED', 'REFUND_REQUIRED')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      );

      CREATE TABLE IF NOT EXISTS notification_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK(channel IN ('IN_APP', 'SMS', 'EMAIL', 'WHATSAPP')),
        event_type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        message TEXT NOT NULL,
        delivery_status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK(delivery_status IN ('SENT', 'DELIVERED', 'FAILED', 'PENDING')),
        read_status INTEGER NOT NULL DEFAULT 0,
        error_details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON notification_logs(user_id);
    `);

    // Seed Initial Phase 15 Operational Tasks
    const sampleOpTasks = [
      {
        id: 'opt-1',
        title: 'Verify Physical Inspection for Emerald Heights',
        description: 'Field officer visited Under G. Water borehole and dedicated prepaid meter confirmed.',
        category: 'VERIFICATION',
        priority: 'HIGH',
        status: 'RESOLVED',
        assigned_to: 'Admin Officer (Ibrahim)',
        related_entity_type: 'HOSTEL',
        related_entity_id: 'prop-underg-1'
      },
      {
        id: 'opt-2',
        title: 'Review Move-In Checkin for Peace Haven Room 104',
        description: 'Student marked minor faucet leakage during Move-in. Landlord promised plumbing fix within 24h.',
        category: 'MOVE_IN',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assigned_to: 'Support Staff (Kemi)',
        related_entity_type: 'BOOKING',
        related_entity_id: 'book-102'
      },
      {
        id: 'opt-3',
        title: 'Process Provider Payout for Scholars Court',
        description: 'Student completed successful check-in. Net payout ₦304,000 cleared for disbursement.',
        category: 'REFUND',
        priority: 'MEDIUM',
        status: 'PENDING',
        assigned_to: 'Finance Admin (Tayo)',
        related_entity_type: 'PAYOUT',
        related_entity_id: 'payout-101'
      }
    ];

    for (const t of sampleOpTasks) {
      db.prepare(`
        INSERT OR IGNORE INTO operational_tasks (
          id, title, description, category, priority, status, assigned_to, related_entity_type, related_entity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(t.id, t.title, t.description, t.category, t.priority, t.status, t.assigned_to, t.related_entity_type, t.related_entity_id);
    }
  })();

  console.log('✅ Hostel Ease database migrations completed successfully.');
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
}
