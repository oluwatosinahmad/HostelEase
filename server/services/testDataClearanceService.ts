import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db.js';

export type ClearanceScope = 
  | 'hostels'
  | 'videos'
  | 'pending'
  | 'users'
  | 'providers'
  | 'bookings'
  | 'verification'
  | 'video_tours'
  | 'disputes'
  | 'all';

export interface ScopeEstimate {
  scope: ClearanceScope;
  scopeLabel: string;
  scopeDescription: string;
  estimatedRecords: number;
  estimatedFiles: number;
  breakdown: { label: string; count: number }[];
  dependenciesNotice: string;
  warning: string;
  requiresPhraseConfirmation?: boolean;
  requiredPhrase?: string;
}

export interface ClearanceResult {
  success: boolean;
  scope: ClearanceScope;
  scopeLabel: string;
  message: string;
  timestamp: string;
  executedBy: {
    id: string;
    email: string;
    name: string;
  };
  deletedRecordsCount: number;
  deletedFilesCount: number;
  categoriesBreakdown: Record<string, number>;
  unlinkedFilesSample: string[];
  preservedEntities: string[];
  auditLogId: string;
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Safely unlinks a file from the local uploads directory.
 * Prevents directory traversal and strictly protects essential files like .gitkeep.
 */
function safeUnlinkUploadFile(fileUrlOrPath?: string | null): boolean {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;
  try {
    let rel = fileUrlOrPath.trim();
    if (rel.startsWith('/uploads/')) {
      rel = rel.substring(9);
    } else if (rel.startsWith('uploads/')) {
      rel = rel.substring(8);
    } else if (rel.includes('/uploads/')) {
      rel = rel.substring(rel.indexOf('/uploads/') + 9);
    } else if (rel.includes('\\uploads\\')) {
      rel = rel.substring(rel.indexOf('\\uploads\\') + 9);
    } else if (!rel.startsWith('http://') && !rel.startsWith('https://') && !rel.startsWith('data:') && !rel.startsWith('blob:')) {
      // Possible direct filename in uploads
      const direct = path.resolve(UPLOADS_DIR, path.basename(rel));
      if (fs.existsSync(direct) && fs.lstatSync(direct).isFile()) {
        if (path.basename(direct) !== '.gitkeep') {
          fs.unlinkSync(direct);
          return true;
        }
      }
      return false;
    } else {
      return false;
    }

    rel = rel.replace(/^[\\\/]+/, '');
    const normalized = path.normalize(rel).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(UPLOADS_DIR, normalized);

    if (fullPath.startsWith(UPLOADS_DIR) && fs.existsSync(fullPath)) {
      const stat = fs.lstatSync(fullPath);
      if (stat.isFile() && path.basename(fullPath) !== '.gitkeep') {
        fs.unlinkSync(fullPath);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[TestDataClearanceService] Could not unlink ${fileUrlOrPath}:`, err);
  }
  return false;
}

/**
 * Recursively cleans files in a directory while preserving directory structure and .gitkeep.
 */
function cleanDirectoryFiles(dirPath: string): number {
  let count = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += cleanDirectoryFiles(full);
    } else if (entry.isFile() && entry.name !== '.gitkeep') {
      try {
        fs.unlinkSync(full);
        count++;
      } catch (e) {
        console.warn(`[TestDataClearanceService] Could not clean ${full}:`, e);
      }
    }
  }
  return count;
}

export const testDataClearanceService = {
  /**
   * Generates a pre-clearance estimation and impact summary for the chosen scope.
   */
  getClearanceEstimate(scope: ClearanceScope): ScopeEstimate {
    switch (scope) {
      case 'hostels': {
        const props = (db.prepare('SELECT count(*) as c FROM properties').get() as any)?.c || 0;
        const rooms = (db.prepare('SELECT count(*) as c FROM rooms').get() as any)?.c || 0;
        const bedspaces = (db.prepare('SELECT count(*) as c FROM bedspaces').get() as any)?.c || 0;
        const prices = (db.prepare('SELECT count(*) as c FROM prices').get() as any)?.c || 0;
        const media = (db.prepare('SELECT count(*) as c FROM property_media').get() as any)?.c || 0;
        const fourKVids = (db.prepare('SELECT count(*) as c FROM four_k_videos').get() as any)?.c || 0;
        const bookings = (db.prepare('SELECT count(*) as c FROM bookings').get() as any)?.c || 0;
        const inspections = (db.prepare('SELECT count(*) as c FROM inspection_requests').get() as any)?.c || 0;

        // Estimate physical files associated with property_media & four_k_videos
        const mediaFiles = (db.prepare("SELECT count(*) as c FROM property_media WHERE url LIKE '%/uploads/%' OR url NOT LIKE 'http%'").get() as any)?.c || 0;

        const totalRecords = props + rooms + bedspaces + prices + media + fourKVids + bookings + inspections;
        return {
          scope: 'hostels',
          scopeLabel: 'Hostel Accommodation Listings',
          scopeDescription: 'Permanently removes all hostel listings, rooms, bedspaces, prices, photo galleries, virtual inspection media, and related bookings/inspections.',
          estimatedRecords: totalRecords,
          estimatedFiles: mediaFiles,
          breakdown: [
            { label: 'Hostel Listings', count: props },
            { label: 'Rooms & Bedspaces', count: rooms + bedspaces },
            { label: 'Prices & Tariffs', count: prices },
            { label: 'Gallery Photos & Videos', count: media + fourKVids },
            { label: 'Linked Bookings & Inspections', count: bookings + inspections },
            { label: 'Physical Storage Files to Delete', count: mediaFiles }
          ],
          dependenciesNotice: 'Deleting hostels cascades through all rooms, pricing, media, bookings, inspections, reviews, and move-in checklists linked to those properties.',
          warning: 'This operation is PERMANENT. All hostel records and actual photo/video files on disk will be unlinked.'
        };
      }

      case 'videos':
      case 'video_tours': {
        const fourKVideos = (db.prepare('SELECT count(*) as c FROM four_k_videos').get() as any)?.c || 0;
        const mediaVideos = (db.prepare("SELECT count(*) as c FROM property_media WHERE media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH' OR url LIKE '%.mp4' OR url LIKE '%.webm'").get() as any)?.c || 0;
        const totalVids = fourKVideos + mediaVideos;
        return {
          scope,
          scopeLabel: '4K Virtual Inspection Walkthrough Videos & Queue',
          scopeDescription: 'Permanently deletes all 4K virtual inspection walkthrough video records and physical video files from disk.',
          estimatedRecords: totalVids,
          estimatedFiles: totalVids,
          breakdown: [
            { label: '4K Walkthrough Video Records', count: fourKVideos },
            { label: 'Property Video Media Items', count: mediaVideos },
            { label: 'Video Files to Delete on Disk', count: totalVids }
          ],
          dependenciesNotice: 'Hostel listings will remain intact, but their 4K video badge will be reset and video URLs cleared.',
          warning: 'This operation permanently unlinks all high-resolution video files (.mp4/.webm) from disk storage.'
        };
      }

      case 'pending': {
        const pendingProps = (db.prepare("SELECT count(*) as c FROM properties WHERE verification_status IN ('PENDING_REVIEW', 'PENDING')").get() as any)?.c || 0;
        const pendingDocs = (db.prepare("SELECT count(*) as c FROM verification_documents WHERE status = 'PENDING'").get() as any)?.c || 0;
        const pendingProviders = (db.prepare("SELECT count(*) as c FROM provider_profiles WHERE verification_status = 'PENDING'").get() as any)?.c || 0;
        const pendingMedia = (db.prepare("SELECT count(*) as c FROM property_media pm JOIN properties p ON pm.property_id = p.id WHERE p.verification_status IN ('PENDING_REVIEW', 'PENDING')").get() as any)?.c || 0;

        return {
          scope: 'pending',
          scopeLabel: 'Pending Approval Queue',
          scopeDescription: 'Permanently purges unapproved/pending hostel listings, pending KYC agent verification documents, and pending provider applications.',
          estimatedRecords: pendingProps + pendingDocs + pendingProviders + pendingMedia,
          estimatedFiles: pendingMedia + pendingDocs,
          breakdown: [
            { label: 'Pending Hostel Listings', count: pendingProps },
            { label: 'Pending Property Media', count: pendingMedia },
            { label: 'Pending KYC Documents', count: pendingDocs },
            { label: 'Pending Provider Profiles', count: pendingProviders }
          ],
          dependenciesNotice: 'Approved listings and verified agent profiles are strictly preserved.',
          warning: 'All pending review requests and attached test submission files will be permanently purged.'
        };
      }

      case 'users': {
        const students = (db.prepare("SELECT count(*) as c FROM users WHERE role = 'STUDENT'").get() as any)?.c || 0;
        const providers = (db.prepare("SELECT count(*) as c FROM users WHERE role = 'PROVIDER'").get() as any)?.c || 0;
        const nonAdminAdmins = (db.prepare("SELECT count(*) as c FROM users WHERE role = 'ADMIN' AND id != 'user-admin-1' AND email NOT IN ('admin@hostelease.ng', 'hostelease.admin@gmail.com', 'oluwatosinahmad@gmail.com')").get() as any)?.c || 0;
        const totalUsers = students + providers + nonAdminAdmins;

        return {
          scope: 'users',
          scopeLabel: 'User Directory (Students & Test Agents)',
          scopeDescription: 'Permanently removes all student and agent accounts, student profiles, preferences, saved hostels, and test activity.',
          estimatedRecords: totalUsers,
          estimatedFiles: totalUsers,
          breakdown: [
            { label: 'Student Accounts & Profiles', count: students },
            { label: 'Provider / Agent Accounts', count: providers },
            { label: 'Test Admin Accounts', count: nonAdminAdmins },
            { label: 'Authorized Admin Account (Preserved)', count: 1 }
          ],
          dependenciesNotice: 'The authorized Super Admin account (admin@hostelease.ng) is strictly preserved.',
          warning: 'Deleting user accounts will cascade to their private profiles, notifications, chat messages, and saved hostels.'
        };
      }

      case 'providers': {
        const provs = (db.prepare("SELECT count(*) as c FROM users WHERE role = 'PROVIDER'").get() as any)?.c || 0;
        const profiles = (db.prepare('SELECT count(*) as c FROM provider_profiles').get() as any)?.c || 0;
        const props = (db.prepare('SELECT count(*) as c FROM properties').get() as any)?.c || 0;

        return {
          scope: 'providers',
          scopeLabel: 'Providers & Housing Hosts Hub',
          scopeDescription: 'Permanently removes all test agent accounts, provider business profiles, verification documents, and provider listings.',
          estimatedRecords: provs + profiles + props,
          estimatedFiles: props * 2,
          breakdown: [
            { label: 'Agent User Accounts', count: provs },
            { label: 'Business & KYC Profiles', count: profiles },
            { label: 'Associated Properties & Listings', count: props }
          ],
          dependenciesNotice: 'Student accounts and the authorized Admin account will not be affected.',
          warning: 'All hostels managed by these providers, along with photos and video walkthroughs, will be permanently removed.'
        };
      }

      case 'bookings': {
        const bookings = (db.prepare('SELECT count(*) as c FROM bookings').get() as any)?.c || 0;
        const bHistory = (db.prepare('SELECT count(*) as c FROM booking_status_history').get() as any)?.c || 0;
        const inspections = (db.prepare('SELECT count(*) as c FROM inspection_requests').get() as any)?.c || 0;
        const moveIns = (db.prepare('SELECT count(*) as c FROM move_in_records').get() as any)?.c || 0;
        const maintenance = (db.prepare('SELECT count(*) as c FROM maintenance_tickets').get() as any)?.c || 0;
        const payments = (db.prepare('SELECT count(*) as c FROM payments').get() as any)?.c || 0;
        const financialLedger = (db.prepare('SELECT count(*) as c FROM financial_ledger').get() as any)?.c || 0;

        const total = bookings + bHistory + inspections + moveIns + maintenance + payments + financialLedger;
        return {
          scope: 'bookings',
          scopeLabel: 'Bookings Oversight & Financial Records',
          scopeDescription: 'Permanently clears all test bookings, inspection appointments, move-in checklists, maintenance tickets, test payments, and financial ledger rows.',
          estimatedRecords: total,
          estimatedFiles: moveIns,
          breakdown: [
            { label: 'Student Bookings', count: bookings },
            { label: 'Booking Status Timelines', count: bHistory },
            { label: 'Physical & Virtual Inspections', count: inspections },
            { label: 'Move-In & Key Delivery Records', count: moveIns },
            { label: 'Maintenance Requests', count: maintenance },
            { label: 'Test Payments & Ledger Records', count: payments + financialLedger }
          ],
          dependenciesNotice: 'All properties will have their occupancy and availability status safely reset to AVAILABLE.',
          warning: 'This operation wipes all test booking agreements, payment records, and move-in verification attachments.'
        };
      }

      case 'verification': {
        const vDocs = (db.prepare('SELECT count(*) as c FROM verification_documents').get() as any)?.c || 0;
        const vReviews = (db.prepare('SELECT count(*) as c FROM verification_reviews').get() as any)?.c || 0;

        return {
          scope: 'verification',
          scopeLabel: 'Verification Center & KYC Documents',
          scopeDescription: 'Permanently removes all uploaded KYC identity cards, CAC business certificates, and verification audit reviews.',
          estimatedRecords: vDocs + vReviews,
          estimatedFiles: vDocs,
          breakdown: [
            { label: 'Uploaded Verification Documents', count: vDocs },
            { label: 'Verification Reviews & Audit History', count: vReviews },
            { label: 'Physical Document Files on Disk', count: vDocs }
          ],
          dependenciesNotice: 'Agent verification status will be safely reset to PENDING / UNVERIFIED.',
          warning: 'All uploaded document images and PDF attachments will be unlinked from storage.'
        };
      }

      case 'disputes': {
        const disputes = (db.prepare('SELECT count(*) as c FROM disputes').get() as any)?.c || 0;
        const reports = (db.prepare('SELECT count(*) as c FROM listing_reports').get() as any)?.c || 0;
        const commReports = (db.prepare('SELECT count(*) as c FROM communication_reports').get() as any)?.c || 0;

        return {
          scope: 'disputes',
          scopeLabel: 'Dispute Cases & Trust Reports',
          scopeDescription: 'Permanently removes all test student grievances, listing misrepresentation reports, and safety escalations.',
          estimatedRecords: disputes + reports + commReports,
          estimatedFiles: 0,
          breakdown: [
            { label: 'Trust & Dispute Cases', count: disputes },
            { label: 'Listing Reports', count: reports },
            { label: 'Communication Safety Reports', count: commReports }
          ],
          dependenciesNotice: 'Dispute timelines and resolution tickets will be permanently expunged.',
          warning: 'All dispute records and resolution logs will be removed.'
        };
      }

      case 'all':
      default: {
        const props = (db.prepare('SELECT count(*) as c FROM properties').get() as any)?.c || 0;
        const users = (db.prepare("SELECT count(*) as c FROM users WHERE role != 'ADMIN'").get() as any)?.c || 0;
        const bookings = (db.prepare('SELECT count(*) as c FROM bookings').get() as any)?.c || 0;
        const media = (db.prepare('SELECT count(*) as c FROM property_media').get() as any)?.c || 0;
        const vids = (db.prepare('SELECT count(*) as c FROM four_k_videos').get() as any)?.c || 0;
        const payments = (db.prepare('SELECT count(*) as c FROM payments').get() as any)?.c || 0;
        const messages = (db.prepare('SELECT count(*) as c FROM messages').get() as any)?.c || 0;
        const notifications = (db.prepare('SELECT count(*) as c FROM notifications').get() as any)?.c || 0;

        // Count disk files in uploads/
        let diskFiles = 0;
        try {
          if (fs.existsSync(UPLOADS_DIR)) {
            const list = fs.readdirSync(UPLOADS_DIR);
            diskFiles = list.filter(f => f !== '.gitkeep').length;
          }
        } catch {}

        const totalEstimate = props + users + bookings + media + vids + payments + messages + notifications;

        return {
          scope: 'all',
          scopeLabel: 'Complete Platform-Wide Test Data Clearance',
          scopeDescription: 'Performs a comprehensive, permanent wipe of all test data across the entire platform: all hostels, rooms, photos, 4K videos, bookings, payments, test accounts, chats, reviews, and uploads.',
          estimatedRecords: totalEstimate,
          estimatedFiles: diskFiles,
          breakdown: [
            { label: 'Hostel Listings & Media', count: props + media + vids },
            { label: 'Test Student & Agent Accounts', count: users },
            { label: 'Bookings & Inspections', count: bookings },
            { label: 'Payments & Financial Ledgers', count: payments },
            { label: 'Conversations & Notifications', count: messages + notifications },
            { label: 'Storage Files on Disk to Unlink', count: diskFiles }
          ],
          dependenciesNotice: 'STRICTLY PRESERVED: Authorized Super Admin (admin@hostelease.ng), LAUTECH University definition, Campus Areas, Master Amenities taxonomy, and Fee Configurations.',
          warning: 'CRITICAL WARNING: This operation is IRREVERSIBLE. It permanently deletes all test data across every single database table and clears all uploaded media files on disk.',
          requiresPhraseConfirmation: true,
          requiredPhrase: 'CLEAR ALL DATA'
        };
      }
    }
  },

  /**
   * Executes permanent, dependency-aware clearance of test data for the given scope.
   */
  executeClearance(scope: ClearanceScope, adminId: string, adminReason?: string): ClearanceResult {
    const adminUser = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(adminId) as any;
    if (!adminUser || adminUser.role !== 'ADMIN') {
      throw new Error('Unauthorized: Only platform Administrators can execute test data clearance.');
    }

    const startTime = Date.now();
    const filesToUnlink: string[] = [];
    const categoriesBreakdown: Record<string, number> = {};
    let totalDeletedRecords = 0;
    let totalDeletedFiles = 0;

    // Helper to collect and unlink files
    const collectFile = (pathOrUrl?: string | null) => {
      if (pathOrUrl && typeof pathOrUrl === 'string') {
        filesToUnlink.push(pathOrUrl);
      }
    };

    // Helper to safely run DELETE and count rows
    const deleteRows = (tableName: string, whereClause: string = '1=1', params: any[] = []): number => {
      try {
        const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE ${whereClause}`);
        const info = stmt.run(...params);
        const count = info.changes || 0;
        if (count > 0) {
          categoriesBreakdown[tableName] = (categoriesBreakdown[tableName] || 0) + count;
          totalDeletedRecords += count;
        }
        return count;
      } catch (err: any) {
        // Table might not exist or schema variation
        console.warn(`[TestDataClearanceService] Notice on deleting from ${tableName}:`, err.message);
        return 0;
      }
    };

    // EXECUTE ATOMIC CLEARANCE TRANSACTION
    db.transaction(() => {
      // Temporarily disable foreign keys during mass dependency-ordered wipe
      db.pragma('foreign_keys = OFF');

      if (scope === 'hostels' || scope === 'all') {
        // Collect all property media, covers, and 4K videos for disk deletion
        const propMedias: any[] = db.prepare('SELECT url, thumbnail_url FROM property_media').all();
        propMedias.forEach(m => {
          collectFile(m.url);
          collectFile(m.thumbnail_url);
        });

        const fourKVids: any[] = db.prepare('SELECT video_url, thumbnail_url FROM four_k_videos').all();
        fourKVids.forEach(v => {
          collectFile(v.video_url);
          collectFile(v.thumbnail_url);
        });

        const propCovers: any[] = db.prepare('SELECT cover_image FROM properties WHERE cover_image IS NOT NULL').all();
        propCovers.forEach(p => collectFile(p.cover_image));

        const moveInPics: any[] = db.prepare('SELECT photo_url FROM move_in_photos').all();
        moveInPics.forEach(mp => collectFile(mp.photo_url));

        // Delete property child tables
        deleteRows('property_media');
        deleteRows('four_k_videos');
        deleteRows('bedspaces');
        deleteRows('rooms');
        deleteRows('prices');
        deleteRows('price_history');
        deleteRows('property_amenities');
        deleteRows('featured_listings');
        deleteRows('property_quality_scores');
        deleteRows('property_status_history');
        deleteRows('property_price_alerts');
        deleteRows('property_availability_alerts');
        deleteRows('duplicate_listing_flags');
        deleteRows('listing_refreshes');
        deleteRows('hostel_rules_config');
        deleteRows('rule_acknowledgements');
        deleteRows('saved_properties');
        deleteRows('recently_viewed');
        deleteRows('recently_viewed_hostels');
        deleteRows('utility_reports');
        deleteRows('split_rent_agreements');
        deleteRows('split_rent_shares');
        deleteRows('move_in_photos');
        deleteRows('move_in_records');
        deleteRows('move_in_condition_reports');
        deleteRows('move_in_issues');
        deleteRows('move_out_records');
        deleteRows('booking_move_in_checklists');
        deleteRows('maintenance_ticket_updates');
        deleteRows('maintenance_tickets');
        deleteRows('inspection_status_history');
        deleteRows('inspection_requests');
        deleteRows('booking_status_history');
        deleteRows('bookings');
        deleteRows('reviews');
        deleteRows('listing_reports');
        deleteRows('communication_reports');
        deleteRows('dispute_messages');
        deleteRows('disputes');
        deleteRows('payment_disputes');
        deleteRows('payments');
        deleteRows('payment_attempts');
        deleteRows('payment_webhook_events');
        deleteRows('financial_ledger');
        deleteRows('platform_invoices');
        deleteRows('platform_withdrawals');
        deleteRows('payout_requests');
        deleteRows('provider_payouts');
        deleteRows('refunds');

        // Delete all properties
        deleteRows('properties');

        // Lock auto-seed permanently
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('auto_seed_disabled', 'true')").run();
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('test_data_cleared', 'true')").run();
      }

      if (scope === 'videos' || scope === 'video_tours') {
        const fourKVids: any[] = db.prepare('SELECT video_url, thumbnail_url FROM four_k_videos').all();
        fourKVids.forEach(v => {
          collectFile(v.video_url);
          collectFile(v.thumbnail_url);
        });

        const mediaVids: any[] = db.prepare("SELECT url, thumbnail_url FROM property_media WHERE media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH' OR url LIKE '%.mp4' OR url LIKE '%.webm'").all();
        mediaVids.forEach(m => {
          collectFile(m.url);
          collectFile(m.thumbnail_url);
        });

        deleteRows('four_k_videos');
        deleteRows('property_media', "media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH' OR url LIKE '%.mp4' OR url LIKE '%.webm'");

        // Reset properties 4K video flags
        db.prepare("UPDATE properties SET has_4k_video = 0, video_tour_url = NULL, video_verification_status = 'NONE'").run();
      }

      if (scope === 'pending') {
        // Collect files for pending properties
        const pendingProps: any[] = db.prepare("SELECT id, cover_image FROM properties WHERE verification_status IN ('PENDING_REVIEW', 'PENDING')").all();
        const pendingPropIds = pendingProps.map(p => p.id);
        pendingProps.forEach(p => collectFile(p.cover_image));

        if (pendingPropIds.length > 0) {
          const placeholders = pendingPropIds.map(() => '?').join(',');
          const mediaRows: any[] = db.prepare(`SELECT url, thumbnail_url FROM property_media WHERE property_id IN (${placeholders})`).all(...pendingPropIds);
          mediaRows.forEach(m => {
            collectFile(m.url);
            collectFile(m.thumbnail_url);
          });

          deleteRows('property_media', `property_id IN (${placeholders})`, pendingPropIds);
          deleteRows('rooms', `property_id IN (${placeholders})`, pendingPropIds);
          deleteRows('prices', `property_id IN (${placeholders})`, pendingPropIds);
          deleteRows('property_amenities', `property_id IN (${placeholders})`, pendingPropIds);
          deleteRows('properties', `id IN (${placeholders})`, pendingPropIds);
        }

        // Collect files for pending verification documents
        const pendingDocs: any[] = db.prepare("SELECT file_url FROM verification_documents WHERE status = 'PENDING'").all();
        pendingDocs.forEach(d => collectFile(d.file_url));
        deleteRows('verification_documents', "status = 'PENDING'");
        deleteRows('provider_profiles', "verification_status = 'PENDING'");
      }

      if (scope === 'users') {
        // Collect avatars
        const userAvatars: any[] = db.prepare("SELECT avatar_url FROM users WHERE role != 'ADMIN' AND avatar_url IS NOT NULL").all();
        userAvatars.forEach(u => collectFile(u.avatar_url));

        // Delete user profiles and child records
        deleteRows('student_profiles');
        deleteRows('student_preferences');
        deleteRows('student_preference_history');
        deleteRows('student_search_history');
        deleteRows('student_notification_preferences');
        deleteRows('provider_profiles');
        deleteRows('provider_payout_accounts');
        deleteRows('provider_inspection_schedules');
        deleteRows('provider_digital_services');
        deleteRows('provider_quick_replies');
        deleteRows('provider_subscriptions');
        deleteRows('provider_team_roles');
        deleteRows('email_verifications');
        deleteRows('password_resets');
        deleteRows('user_presence');
        deleteRows('user_blocks');
        deleteRows('roommate_messages');
        deleteRows('roommate_requests');
        deleteRows('roommate_profiles');
        deleteRows('safewalk_journeys');
        deleteRows('safewalk_contacts');
        deleteRows('ai_messages');
        deleteRows('ai_conversations');
        deleteRows('ai_usage_logs');
        deleteRows('ai_feedback');
        deleteRows('community_reactions');
        deleteRows('community_reports');
        deleteRows('community_answers');
        deleteRows('community_questions');
        deleteRows('community_experiences');
        deleteRows('community_guides');
        deleteRows('messages');
        deleteRows('conversations');
        deleteRows('notifications');
        deleteRows('saved_properties');
        deleteRows('recently_viewed');
        deleteRows('recently_viewed_hostels');

        // Delete non-admin users, strictly preserving authorized admin
        deleteRows('users', "role != 'ADMIN'");
        // Delete test admins if any
        deleteRows('users', "role = 'ADMIN' AND id != 'user-admin-1' AND email NOT IN ('admin@hostelease.ng', 'hostelease.admin@gmail.com', 'oluwatosinahmad@gmail.com')");
      }

      if (scope === 'providers') {
        const provUsers: any[] = db.prepare("SELECT id FROM users WHERE role = 'PROVIDER'").all();
        const provIds = provUsers.map(p => p.id);
        if (provIds.length > 0) {
          const placeholders = provIds.map(() => '?').join(',');
          deleteRows('provider_profiles', `user_id IN (${placeholders})`, provIds);
          deleteRows('provider_payout_accounts', `provider_id IN (${placeholders})`, provIds);
          deleteRows('provider_inspection_schedules', `provider_id IN (${placeholders})`, provIds);
          deleteRows('provider_digital_services', `provider_id IN (${placeholders})`, provIds);
          deleteRows('provider_quick_replies', `provider_id IN (${placeholders})`, provIds);
          deleteRows('provider_subscriptions', `provider_id IN (${placeholders})`, provIds);
          deleteRows('users', `id IN (${placeholders})`, provIds);
        }
      }

      if (scope === 'bookings') {
        deleteRows('booking_status_history');
        deleteRows('booking_move_in_checklists');
        deleteRows('move_in_photos');
        deleteRows('move_in_records');
        deleteRows('move_in_condition_reports');
        deleteRows('move_in_issues');
        deleteRows('move_out_records');
        deleteRows('maintenance_ticket_updates');
        deleteRows('maintenance_tickets');
        deleteRows('inspection_status_history');
        deleteRows('inspection_requests');
        deleteRows('split_rent_agreements');
        deleteRows('split_rent_shares');
        deleteRows('bookings');
        deleteRows('payments');
        deleteRows('payment_attempts');
        deleteRows('payment_webhook_events');
        deleteRows('financial_ledger');
        deleteRows('platform_invoices');
        deleteRows('platform_withdrawals');
        deleteRows('payout_requests');
        deleteRows('provider_payouts');
        deleteRows('refunds');

        // Reset properties availability
        db.prepare("UPDATE properties SET availability_status = 'AVAILABLE'").run();
        db.prepare("UPDATE rooms SET quantity_available = quantity_total, occupied_count = 0").run();
        db.prepare("UPDATE bedspaces SET is_occupied = 0").run();
      }

      if (scope === 'verification') {
        const vDocs: any[] = db.prepare('SELECT file_url FROM verification_documents').all();
        vDocs.forEach(d => collectFile(d.file_url));
        deleteRows('verification_documents');
        deleteRows('verification_reviews');
        db.prepare("UPDATE provider_profiles SET verification_status = 'PENDING', phone_verified = 0").run();
      }

      if (scope === 'disputes') {
        deleteRows('dispute_messages');
        deleteRows('disputes');
        deleteRows('payment_disputes');
        deleteRows('listing_reports');
        deleteRows('communication_reports');
      }

      if (scope === 'all') {
        // Complete sweep of user, message, notification, and community tables
        deleteRows('student_profiles');
        deleteRows('student_preferences');
        deleteRows('student_preference_history');
        deleteRows('student_search_history');
        deleteRows('student_notification_preferences');
        deleteRows('provider_profiles');
        deleteRows('provider_payout_accounts');
        deleteRows('provider_inspection_schedules');
        deleteRows('provider_digital_services');
        deleteRows('provider_quick_replies');
        deleteRows('provider_subscriptions');
        deleteRows('provider_team_roles');
        deleteRows('verification_documents');
        deleteRows('verification_reviews');
        deleteRows('email_verifications');
        deleteRows('password_resets');
        deleteRows('user_presence');
        deleteRows('user_blocks');
        deleteRows('roommate_messages');
        deleteRows('roommate_requests');
        deleteRows('roommate_profiles');
        deleteRows('safewalk_journeys');
        deleteRows('safewalk_contacts');
        deleteRows('ai_messages');
        deleteRows('ai_conversations');
        deleteRows('ai_usage_logs');
        deleteRows('ai_feedback');
        deleteRows('community_reactions');
        deleteRows('community_reports');
        deleteRows('community_answers');
        deleteRows('community_questions');
        deleteRows('community_experiences');
        deleteRows('community_guides');
        deleteRows('messages');
        deleteRows('conversations');
        deleteRows('notifications');
        deleteRows('notification_logs');
        deleteRows('search_events');
        deleteRows('search_history');
        deleteRows('operational_tasks');
        deleteRows('admin_internal_notes');

        // Delete all non-admin users
        deleteRows('users', "role != 'ADMIN'");
        deleteRows('users', "role = 'ADMIN' AND id != 'user-admin-1' AND email NOT IN ('admin@hostelease.ng', 'hostelease.admin@gmail.com', 'oluwatosinahmad@gmail.com')");

        // Permanent lock on auto-seed
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('auto_seed_disabled', 'true')").run();
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('test_data_cleared', 'true')").run();
      }

      // Ensure auto-seed is locked permanently once any clearance has been triggered
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('auto_seed_disabled', 'true')").run();
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('test_data_cleared', 'true')").run();

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    })();

    // PHYSICAL DISK UNLINKING
    // 1. Unlink specific collected files
    const unlinkedSample: string[] = [];
    const uniqueFiles = Array.from(new Set(filesToUnlink.filter(Boolean)));
    for (const f of uniqueFiles) {
      if (safeUnlinkUploadFile(f)) {
        totalDeletedFiles++;
        if (unlinkedSample.length < 15) {
          unlinkedSample.push(path.basename(f));
        }
      }
    }

    // 2. For scope 'all', thoroughly sweep all remaining orphan files in uploads/
    if (scope === 'all') {
      const sweptCount = cleanDirectoryFiles(UPLOADS_DIR);
      totalDeletedFiles += sweptCount;
    }

    // AUDIT LOGGING (Strictly restricted, no sensitive data leakage)
    const auditLogId = `audit-clear-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, 'ADMIN', 'PERMANENT_TEST_DATA_CLEARANCE', 'SYSTEM_CLEARANCE', ?, ?, '127.0.0.1')
      `).run(
        auditLogId,
        adminUser.id,
        scope,
        JSON.stringify({
          scope,
          reason: adminReason || 'Administrator requested permanent test data clearance',
          deletedRecordsCount: totalDeletedRecords,
          deletedFilesCount: totalDeletedFiles,
          durationMs: Date.now() - startTime
        })
      );
    } catch (auditErr) {
      console.warn('[TestDataClearanceService] Audit log record notice:', auditErr);
    }

    const estimate = this.getClearanceEstimate(scope);

    return {
      success: true,
      scope,
      scopeLabel: estimate.scopeLabel,
      message: `Successfully executed permanent test data clearance for '${estimate.scopeLabel}'. Permanently deleted ${totalDeletedRecords} records and unlinked ${totalDeletedFiles} files from storage.`,
      timestamp: new Date().toISOString(),
      executedBy: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.full_name
      },
      deletedRecordsCount: totalDeletedRecords,
      deletedFilesCount: totalDeletedFiles,
      categoriesBreakdown,
      unlinkedFilesSample: unlinkedSample,
      preservedEntities: [
        'Super Administrator Account (admin@hostelease.ng)',
        'LAUTECH University Master Record',
        'Campus Geographic Areas & Landmarks (Under G, Adenike, Stadium, College, Abaa)',
        'Standard Amenities Catalog',
        'Area Travel & Navigation Guides',
        'Platform Fee & Commission Configuration'
      ],
      auditLogId
    };
  }
};
