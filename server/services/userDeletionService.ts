import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { securityAuditService } from './securityAuditService.js';

export interface UserDeletionSummary {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'STUDENT' | 'PROVIDER' | 'ADMIN';
  accountStatus: string;
  businessName?: string;
  createdAt: string;

  // Specific counts
  hostelsCount: number;
  roomsCount: number;
  mediaCount: number;
  imagesCount: number;
  videosCount: number;
  bookingsCount: number;
  inspectionsCount: number;
  conversationsCount: number;
  messagesCount: number;
  notificationsCount: number;
  savedHostelsCount?: number;
  reviewsCount?: number;
  payoutsCount?: number;
  verificationDocsCount?: number;
}

export interface UserDeletionResult {
  success: boolean;
  message: string;
  deletedUserId: string;
  deletedRole: string;
  deletedFullName: string;
  deletedHostelsCount: number;
  deletedMediaFilesCount: number;
  deletedBookingsCount: number;
  deletedInspectionsCount: number;
  deletedConversationsCount: number;
  deletedNotificationsCount: number;
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Safely removes a file from local storage if it resides inside uploads/
 */
function removeLocalFileIfPresent(fileUrlOrPath?: string | null): boolean {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;
  try {
    let filename = fileUrlOrPath;
    if (filename.startsWith('/uploads/')) {
      filename = filename.replace('/uploads/', '');
    } else if (filename.startsWith('uploads/')) {
      filename = filename.replace('uploads/', '');
    } else if (filename.includes('/uploads/')) {
      filename = filename.substring(filename.indexOf('/uploads/') + 9);
    } else if (filename.includes('\\uploads\\')) {
      filename = filename.substring(filename.indexOf('\\uploads\\') + 9);
    } else {
      // Not a local uploads file (could be unsplash or external CDN)
      return false;
    }

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const fullPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (err) {
    console.warn(`[UserDeletionService] Could not remove file ${fileUrlOrPath}:`, err);
  }
  return false;
}

export const userDeletionService = {
  /**
   * Generates dynamic pre-deletion count summary from the database
   */
  getUserDeletionSummary(userId: string): UserDeletionSummary {
    const user = db.prepare('SELECT id, full_name, email, phone, role, account_status, created_at FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const isProvider = user.role === 'PROVIDER';
    const isStudent = user.role === 'STUDENT';

    let businessName: string | undefined = undefined;
    if (isProvider) {
      const pProfile = db.prepare('SELECT business_name FROM provider_profiles WHERE user_id = ?').get(userId) as any;
      businessName = pProfile?.business_name;
    }

    let hostelsCount = 0;
    let roomsCount = 0;
    let mediaCount = 0;
    let imagesCount = 0;
    let videosCount = 0;
    let bookingsCount = 0;
    let inspectionsCount = 0;
    let conversationsCount = 0;
    let messagesCount = 0;
    let notificationsCount = 0;
    let savedHostelsCount = 0;
    let reviewsCount = 0;
    let payoutsCount = 0;
    let verificationDocsCount = 0;

    // Notifications count (applies to both)
    notificationsCount = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?').get(userId) as any)?.c || 0;

    if (isProvider) {
      // Find all property IDs owned by this landlord
      const properties: { id: string }[] = db.prepare('SELECT id FROM properties WHERE provider_id = ?').all(userId) as any[];
      hostelsCount = properties.length;
      const propIds = properties.map(p => p.id);

      if (propIds.length > 0) {
        const placeholders = propIds.map(() => '?').join(',');

        roomsCount = (db.prepare(`SELECT COUNT(*) as c FROM rooms WHERE property_id IN (${placeholders})`).get(...propIds) as any)?.c || 0;

        const mediaRows: any[] = db.prepare(`SELECT media_type FROM property_media WHERE property_id IN (${placeholders})`).all(...propIds);
        mediaCount = mediaRows.length;
        imagesCount = mediaRows.filter(m => m.media_type === 'IMAGE').length;
        videosCount = mediaRows.filter(m => m.media_type === 'VIDEO').length;

        bookingsCount = (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE provider_id = ? OR property_id IN (${placeholders})`).get(userId, ...propIds) as any)?.c || 0;
        inspectionsCount = (db.prepare(`SELECT COUNT(*) as c FROM inspection_requests WHERE property_id IN (${placeholders})`).get(...propIds) as any)?.c || 0;
        
        const convRows: any[] = db.prepare(`SELECT id FROM conversations WHERE provider_id = ? OR property_id IN (${placeholders})`).all(userId, ...propIds);
        conversationsCount = convRows.length;
        if (convRows.length > 0) {
          const convPlaceholders = convRows.map(() => '?').join(',');
          messagesCount = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id IN (${convPlaceholders})`).get(...convRows.map(c => c.id)) as any)?.c || 0;
        }
      } else {
        bookingsCount = (db.prepare('SELECT COUNT(*) as c FROM bookings WHERE provider_id = ?').get(userId) as any)?.c || 0;
        const convRows: any[] = db.prepare('SELECT id FROM conversations WHERE provider_id = ?').all(userId);
        conversationsCount = convRows.length;
        if (convRows.length > 0) {
          const convPlaceholders = convRows.map(() => '?').join(',');
          messagesCount = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id IN (${convPlaceholders})`).get(...convRows.map(c => c.id)) as any)?.c || 0;
        }
      }

      payoutsCount = (db.prepare('SELECT COUNT(*) as c FROM provider_payout_accounts WHERE provider_id = ?').get(userId) as any)?.c || 0;
      verificationDocsCount = (db.prepare('SELECT COUNT(*) as c FROM verification_documents WHERE provider_id = ?').get(userId) as any)?.c || 0;

    } else if (isStudent) {
      savedHostelsCount = (db.prepare('SELECT COUNT(*) as c FROM saved_properties WHERE user_id = ?').get(userId) as any)?.c || 0;
      bookingsCount = (db.prepare('SELECT COUNT(*) as c FROM bookings WHERE student_id = ?').get(userId) as any)?.c || 0;
      inspectionsCount = (db.prepare('SELECT COUNT(*) as c FROM inspection_requests WHERE student_id = ?').get(userId) as any)?.c || 0;
      reviewsCount = (db.prepare('SELECT COUNT(*) as c FROM reviews WHERE student_id = ?').get(userId) as any)?.c || 0;

      const convRows: any[] = db.prepare('SELECT id FROM conversations WHERE student_id = ?').all(userId);
      conversationsCount = convRows.length;
      if (convRows.length > 0) {
        const convPlaceholders = convRows.map(() => '?').join(',');
        messagesCount = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE conversation_id IN (${convPlaceholders})`).get(...convRows.map(c => c.id)) as any)?.c || 0;
      }
    }

    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      accountStatus: user.account_status || 'ACTIVE',
      businessName,
      createdAt: user.created_at,
      hostelsCount,
      roomsCount,
      mediaCount,
      imagesCount,
      videosCount,
      bookingsCount,
      inspectionsCount,
      conversationsCount,
      messagesCount,
      notificationsCount,
      savedHostelsCount,
      reviewsCount,
      payoutsCount,
      verificationDocsCount
    };
  },

  /**
   * Permanently deletes a user and ALL dependent records in an atomic transaction.
   * If landlord: deletes all owned hostels, rooms, media, bookings, inspections, chats, and disk files.
   * If student: deletes student bookings, inspections, chats, saved hostels, and private records, while preserving landlord hostels.
   */
  deleteUserPermanently(userId: string, adminId: string, adminReason?: string): UserDeletionResult {
    const targetUser = db.prepare('SELECT id, full_name, email, role, avatar_url FROM users WHERE id = ?').get(userId) as any;
    if (!targetUser) {
      throw new Error(`User with ID ${userId} does not exist`);
    }

    if (userId === adminId) {
      throw new Error('Administrators cannot delete their own account.');
    }

    if (targetUser.role === 'ADMIN') {
      throw new Error('Admin accounts cannot be deleted through this interface. Contact platform governance.');
    }

    const isProvider = targetUser.role === 'PROVIDER';
    const isStudent = targetUser.role === 'STUDENT';

    // 1. Gather all file paths for physical deletion after database commit
    const filesToDelete: (string | null | undefined)[] = [];
    if (targetUser.avatar_url) filesToDelete.push(targetUser.avatar_url);

    let deletedHostelsCount = 0;
    let deletedMediaCount = 0;
    let deletedBookingsCount = 0;
    let deletedInspectionsCount = 0;
    let deletedConversationsCount = 0;
    let deletedNotificationsCount = 0;

    // 2. Perform Atomic Database Cascade Deletion
    db.transaction(() => {
      if (isProvider) {
        // Collect Landlord properties
        const properties: { id: string }[] = db.prepare('SELECT id FROM properties WHERE provider_id = ?').all(userId) as any[];
        deletedHostelsCount = properties.length;
        const propIds = properties.map(p => p.id);

        // Collect all booking IDs for this landlord or these properties
        let bookingIds: string[] = [];
        if (propIds.length > 0) {
          const propPlaceholders = propIds.map(() => '?').join(',');
          const bRows: { id: string }[] = db.prepare(
            `SELECT id FROM bookings WHERE provider_id = ? OR property_id IN (${propPlaceholders})`
          ).all(userId, ...propIds) as any[];
          bookingIds = bRows.map(b => b.id);
        } else {
          const bRows: { id: string }[] = db.prepare('SELECT id FROM bookings WHERE provider_id = ?').all(userId) as any[];
          bookingIds = bRows.map(b => b.id);
        }
        deletedBookingsCount = bookingIds.length;

        // Collect property media & verification document files for disk removal
        if (propIds.length > 0) {
          const propPlaceholders = propIds.map(() => '?').join(',');
          const mediaRows: { url: string; thumbnail_url: string }[] = db.prepare(
            `SELECT url, thumbnail_url FROM property_media WHERE property_id IN (${propPlaceholders})`
          ).all(...propIds) as any[];
          deletedMediaCount = mediaRows.length;
          mediaRows.forEach(m => {
            if (m.url) filesToDelete.push(m.url);
            if (m.thumbnail_url) filesToDelete.push(m.thumbnail_url);
          });
        }

        const docRows: { file_url: string }[] = db.prepare('SELECT file_url FROM verification_documents WHERE provider_id = ?').all(userId) as any[];
        docRows.forEach(d => {
          if (d.file_url) filesToDelete.push(d.file_url);
        });

        // 3. Foreign Key Order: Clear restrictive financial & booking child tables
        if (bookingIds.length > 0) {
          const bPlaceholders = bookingIds.map(() => '?').join(',');

          // Collect move_in_photos files for disk removal
          const photoRows: { photo_url: string }[] = db.prepare(
            `SELECT photo_url FROM move_in_photos WHERE booking_id IN (${bPlaceholders})`
          ).all(...bookingIds) as any[];
          photoRows.forEach(pr => { if (pr.photo_url) filesToDelete.push(pr.photo_url); });

          // Payment records linked to bookings
          const paymentRows: { id: string }[] = db.prepare(
            `SELECT id FROM payments WHERE booking_id IN (${bPlaceholders})`
          ).all(...bookingIds) as any[];
          const paymentIds = paymentRows.map(p => p.id);

          if (paymentIds.length > 0) {
            const pPlaceholders = paymentIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM payment_attempts WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM payment_disputes WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM payment_reconciliations WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM refunds WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM financial_ledger WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
          }

          // Refunds linked to bookings
          db.prepare(`DELETE FROM refunds WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM financial_ledger WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM payments WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);

          // Move-in lifecycle tables
          db.prepare(`DELETE FROM move_in_photos WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM move_in_condition_reports WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM move_in_issues WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM move_out_records WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM booking_move_in_checklists WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM move_in_records WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM booking_status_history WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM rule_acknowledgements WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);
          db.prepare(`DELETE FROM community_experiences WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);

          // Disputes linked to bookings
          db.prepare(`
            DELETE FROM dispute_messages WHERE dispute_id IN (
              SELECT id FROM disputes WHERE booking_id IN (${bPlaceholders})
            )
          `).run(...bookingIds);
          db.prepare(`DELETE FROM disputes WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);

          // Payouts linked to bookings
          db.prepare(`DELETE FROM provider_payouts WHERE booking_id IN (${bPlaceholders})`).run(...bookingIds);

          // Delete bookings
          db.prepare(`DELETE FROM bookings WHERE id IN (${bPlaceholders})`).run(...bookingIds);
        }

        // Direct provider financial rows
        db.prepare('DELETE FROM provider_payouts WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM payout_requests WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_payout_accounts WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM payments WHERE provider_id = ?').run(userId);

        // Delete property-specific dependents
        if (propIds.length > 0) {
          const propPlaceholders = propIds.map(() => '?').join(',');

          db.prepare(`DELETE FROM payments WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM move_in_records WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM move_in_issues WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM move_out_records WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM community_experiences WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM disputes WHERE property_id IN (${propPlaceholders})`).run(...propIds);

          // Inspections
          const inspRows: { id: string }[] = db.prepare(
            `SELECT id FROM inspection_requests WHERE property_id IN (${propPlaceholders})`
          ).all(...propIds) as any[];
          deletedInspectionsCount = inspRows.length;
          if (inspRows.length > 0) {
            const inspPlaceholders = inspRows.map(() => '?').join(',');
            db.prepare(`DELETE FROM inspection_status_history WHERE inspection_id IN (${inspPlaceholders})`).run(...inspRows.map(i => i.id));
            db.prepare(`DELETE FROM inspection_requests WHERE id IN (${inspPlaceholders})`).run(...inspRows.map(i => i.id));
          }

          // Rooms and Bedspaces
          const roomRows: { id: string }[] = db.prepare(`SELECT id FROM rooms WHERE property_id IN (${propPlaceholders})`).all(...propIds) as any[];
          if (roomRows.length > 0) {
            const rPlaceholders = roomRows.map(() => '?').join(',');
            db.prepare(`DELETE FROM bedspaces WHERE room_id IN (${rPlaceholders})`).run(...roomRows.map(r => r.id));
            db.prepare(`DELETE FROM prices WHERE room_id IN (${rPlaceholders})`).run(...roomRows.map(r => r.id));
            db.prepare(`DELETE FROM price_history WHERE room_id IN (${rPlaceholders})`).run(...roomRows.map(r => r.id));
            db.prepare(`DELETE FROM rooms WHERE id IN (${rPlaceholders})`).run(...roomRows.map(r => r.id));
          }

          db.prepare(`DELETE FROM prices WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM price_history WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_amenities WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_media WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_availability_alerts WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_price_alerts WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_quality_scores WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM property_status_history WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM listing_reports WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM reviews WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM duplicate_listing_flags WHERE property_id IN (${propPlaceholders}) OR flagged_duplicate_property_id IN (${propPlaceholders})`).run(...propIds, ...propIds);
          db.prepare(`DELETE FROM featured_listings WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM saved_properties WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM recently_viewed WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM recently_viewed_hostels WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM shortlist_tags WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM recommendation_feedbacks WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM provider_inspection_schedules WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM hostel_rules_config WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM listing_refreshes WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM provider_digital_services WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM provider_team_roles WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM verification_reviews WHERE property_id IN (${propPlaceholders})`).run(...propIds);
          db.prepare(`DELETE FROM verification_documents WHERE property_id IN (${propPlaceholders})`).run(...propIds);

          // Conversations and Messages
          const convRows: { id: string }[] = db.prepare(
            `SELECT id FROM conversations WHERE provider_id = ? OR property_id IN (${propPlaceholders})`
          ).all(userId, ...propIds) as any[];
          deletedConversationsCount = convRows.length;
          if (convRows.length > 0) {
            const convPlaceholders = convRows.map(() => '?').join(',');
            db.prepare(`DELETE FROM messages WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
            db.prepare(`DELETE FROM communication_reports WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
            db.prepare(`DELETE FROM conversations WHERE id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
          }

          // Delete properties
          db.prepare(`DELETE FROM properties WHERE id IN (${propPlaceholders})`).run(...propIds);
        } else {
          // No properties, but delete any provider-only conversations
          const convRows: { id: string }[] = db.prepare('SELECT id FROM conversations WHERE provider_id = ?').all(userId) as any[];
          deletedConversationsCount = convRows.length;
          if (convRows.length > 0) {
            const convPlaceholders = convRows.map(() => '?').join(',');
            db.prepare(`DELETE FROM messages WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
            db.prepare(`DELETE FROM communication_reports WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
            db.prepare(`DELETE FROM conversations WHERE id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
          }
        }

        // Provider auxiliary data
        db.prepare('DELETE FROM provider_inspection_schedules WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM price_history WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM featured_listings WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM hostel_rules_config WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM listing_refreshes WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_digital_services WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_quick_replies WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_subscriptions WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_team_roles WHERE provider_id = ? OR user_id = ?').run(userId, userId);
        db.prepare('DELETE FROM verification_reviews WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM verification_documents WHERE provider_id = ?').run(userId);
        db.prepare('DELETE FROM provider_profiles WHERE user_id = ?').run(userId);

      } else if (isStudent) {
        // Collect Student's bookings
        const bRows: { id: string; room_id?: string; bedspace_id?: string }[] = db.prepare(
          'SELECT id, room_id, bedspace_id FROM bookings WHERE student_id = ?'
        ).all(userId) as any[];
        deletedBookingsCount = bRows.length;
        const bIds = bRows.map(b => b.id);

        if (bIds.length > 0) {
          const bPlaceholders = bIds.map(() => '?').join(',');

          // Delete payments & financial records for student's bookings
          const paymentRows: { id: string }[] = db.prepare(`SELECT id FROM payments WHERE booking_id IN (${bPlaceholders})`).all(...bIds) as any[];
          const paymentIds = paymentRows.map(p => p.id);
          if (paymentIds.length > 0) {
            const pPlaceholders = paymentIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM payment_attempts WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM payment_disputes WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM payment_reconciliations WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM refunds WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
            db.prepare(`DELETE FROM financial_ledger WHERE payment_id IN (${pPlaceholders})`).run(...paymentIds);
          }

          db.prepare(`DELETE FROM refunds WHERE booking_id IN (${bPlaceholders})`).run(...bIds);
          db.prepare(`DELETE FROM financial_ledger WHERE booking_id IN (${bPlaceholders})`).run(...bIds);
          db.prepare(`DELETE FROM payments WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);

          // Move-in records
          db.prepare(`DELETE FROM move_in_photos WHERE booking_id IN (${bPlaceholders}) OR uploader_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM move_in_condition_reports WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM move_in_issues WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM move_out_records WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM booking_move_in_checklists WHERE booking_id IN (${bPlaceholders}) OR user_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM move_in_records WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM booking_status_history WHERE booking_id IN (${bPlaceholders}) OR actor_id = ?`).run(...bIds, userId);
          db.prepare(`DELETE FROM rule_acknowledgements WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);

          // Disputes
          db.prepare(`
            DELETE FROM dispute_messages WHERE dispute_id IN (
              SELECT id FROM disputes WHERE booking_id IN (${bPlaceholders}) OR student_id = ?
            )
          `).run(...bIds, userId);
          db.prepare(`DELETE FROM disputes WHERE booking_id IN (${bPlaceholders}) OR student_id = ?`).run(...bIds, userId);

          // Delete bookings
          db.prepare(`DELETE FROM bookings WHERE id IN (${bPlaceholders})`).run(...bIds);
        }

        // Student Inspections
        const inspRows: { id: string }[] = db.prepare('SELECT id FROM inspection_requests WHERE student_id = ?').all(userId) as any[];
        deletedInspectionsCount = inspRows.length;
        if (inspRows.length > 0) {
          const inspPlaceholders = inspRows.map(() => '?').join(',');
          db.prepare(`DELETE FROM inspection_status_history WHERE inspection_id IN (${inspPlaceholders}) OR actor_id = ?`).run(...inspRows.map(i => i.id), userId);
          db.prepare(`DELETE FROM inspection_requests WHERE id IN (${inspPlaceholders})`).run(...inspRows.map(i => i.id));
        }

        // Student Reviews
        db.prepare('DELETE FROM reviews WHERE student_id = ?').run(userId);

        // Saved & Search history
        db.prepare('DELETE FROM saved_properties WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM saved_searches WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM search_history WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM student_search_history WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM recently_viewed WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM recently_viewed_hostels WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM shortlist_tags WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM recommendation_feedbacks WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM property_availability_alerts WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM property_price_alerts WHERE user_id = ?').run(userId);

        // AI chats & logs
        db.prepare(`
          DELETE FROM ai_feedback WHERE student_id = ? OR message_id IN (
            SELECT id FROM ai_messages WHERE conversation_id IN (
              SELECT id FROM ai_conversations WHERE student_id = ?
            )
          )
        `).run(userId, userId);
        db.prepare(`
          DELETE FROM ai_messages WHERE conversation_id IN (
            SELECT id FROM ai_conversations WHERE student_id = ?
          )
        `).run(userId);
        db.prepare('DELETE FROM ai_conversations WHERE student_id = ?').run(userId);
        db.prepare('DELETE FROM ai_usage_logs WHERE student_id = ?').run(userId);

        // Roommate system
        db.prepare('DELETE FROM roommate_messages WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
        db.prepare('DELETE FROM roommate_requests WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
        db.prepare('DELETE FROM roommate_profiles WHERE user_id = ?').run(userId);

        // Community interactions
        db.prepare('DELETE FROM community_answers WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM community_reactions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM community_experiences WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM community_questions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM community_reports WHERE reporter_id = ?').run(userId);

        // Student conversations
        const convRows: { id: string }[] = db.prepare('SELECT id FROM conversations WHERE student_id = ?').all(userId) as any[];
        deletedConversationsCount = convRows.length;
        if (convRows.length > 0) {
          const convPlaceholders = convRows.map(() => '?').join(',');
          db.prepare(`DELETE FROM messages WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
          db.prepare(`DELETE FROM communication_reports WHERE conversation_id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
          db.prepare(`DELETE FROM conversations WHERE id IN (${convPlaceholders})`).run(...convRows.map(c => c.id));
        }

        // Student preferences & profile
        db.prepare('DELETE FROM student_notification_preferences WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM student_preference_history WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM student_preferences WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM student_profiles WHERE user_id = ?').run(userId);
      }

      // 4. Common account cleanup for all deleted users (notifications, tickets, invoices, blocks, notes)
      const notifRow = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?').get(userId) as any;
      deletedNotificationsCount = notifRow?.c || 0;
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM notification_logs WHERE user_id = ?').run(userId);

      db.prepare(`
        DELETE FROM support_ticket_messages WHERE sender_id = ? OR ticket_id IN (
          SELECT id FROM support_tickets WHERE user_id = ?
        )
      `).run(userId, userId);
      db.prepare('DELETE FROM support_tickets WHERE user_id = ?').run(userId);

      db.prepare('DELETE FROM communication_reports WHERE reporter_id = ? OR reported_user_id = ?').run(userId, userId);
      db.prepare('DELETE FROM listing_reports WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?').run(userId, userId);
      db.prepare('DELETE FROM platform_invoices WHERE user_id = ?').run(userId);
      db.prepare("DELETE FROM admin_internal_notes WHERE entity_type = 'USER' AND entity_id = ?").run(userId);

      // 5. Record Administrative Audit Log
      const auditDetails = {
        deletedUser: {
          id: targetUser.id,
          fullName: targetUser.full_name,
          email: targetUser.email,
          role: targetUser.role
        },
        actionReason: adminReason || 'Permanent account deletion requested by administrator in Hostel Ease Admin Portal',
        recordsRemoved: {
          hostels: deletedHostelsCount,
          media: deletedMediaCount,
          bookings: deletedBookingsCount,
          inspections: deletedInspectionsCount,
          conversations: deletedConversationsCount,
          notifications: deletedNotificationsCount
        },
        timestamp: new Date().toISOString()
      };

      securityAuditService.log({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: isProvider ? 'PERMANENT_DELETE_LANDLORD_ACCOUNT' : 'PERMANENT_DELETE_STUDENT_ACCOUNT',
        targetType: 'USER',
        targetId: userId,
        severity: 'CRITICAL',
        details: auditDetails
      });

      // 6. Delete user record
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    })();

    // 7. Post-transaction physical file cleanup
    let physicallyDeletedFiles = 0;
    for (const f of filesToDelete) {
      if (removeLocalFileIfPresent(f)) {
        physicallyDeletedFiles++;
      }
    }

    return {
      success: true,
      message: `${targetUser.role === 'PROVIDER' ? 'Landlord' : 'Student'} account and all associated records permanently deleted.`,
      deletedUserId: targetUser.id,
      deletedRole: targetUser.role,
      deletedFullName: targetUser.full_name,
      deletedHostelsCount,
      deletedMediaFilesCount: physicallyDeletedFiles,
      deletedBookingsCount,
      deletedInspectionsCount,
      deletedConversationsCount,
      deletedNotificationsCount
    };
  }
};
