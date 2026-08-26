import db from '../db.js';
import crypto from 'crypto';

export interface RoommateProfileData {
  id: string;
  userId: string;
  displayName: string;
  gender: string;
  department?: string;
  level?: string;
  budgetMin: number;
  budgetMax: number;
  preferredAreas: string[];
  preferredRoomType: string;
  moveInMonth: string;
  studyEnvironment: string;
  cleanlinessExpectation: string;
  sleepSchedule: string;
  visitorPreference: string;
  aboutMe?: string;
  roommatePreferencesNotes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PotentialRoommateMatch {
  profile: RoommateProfileData;
  compatibilityScore: number;
  compatibilityLabel: string; // e.g. "85% Potential Match"
  positiveMatches: string[];
  tradeOffs: string[];
  requestStatus?: 'NONE' | 'SENT' | 'RECEIVED' | 'ACCEPTED' | 'DECLINED' | 'ENDED';
  requestId?: string;
}

export class RoommateService {
  /**
   * Check if user A has blocked user B or vice-versa
   */
  static isBlocked(userA: string, userB: string): boolean {
    const b = db.prepare(`
      SELECT id FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1
    `).get(userA, userB, userB, userA);
    return Boolean(b);
  }

  /**
   * Get student's roommate profile
   */
  static getProfile(userId: string): RoommateProfileData | null {
    const p = db.prepare('SELECT * FROM roommate_profiles WHERE user_id = ?').get(userId) as any;
    if (!p) return null;

    let areas: string[] = [];
    try {
      areas = JSON.parse(p.preferred_areas_json || '[]');
    } catch {
      areas = ['Under G', 'Adenike'];
    }

    return {
      id: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      gender: p.gender,
      department: p.department,
      level: p.level,
      budgetMin: p.budget_min,
      budgetMax: p.budget_max,
      preferredAreas: areas,
      preferredRoomType: p.preferred_room_type,
      moveInMonth: p.move_in_month,
      studyEnvironment: p.study_environment,
      cleanlinessExpectation: p.cleanliness_expectation,
      sleepSchedule: p.sleep_schedule,
      visitorPreference: p.visitor_preference,
      aboutMe: p.about_me,
      roommatePreferencesNotes: p.roommate_preferences_notes,
      isActive: Boolean(p.is_active),
      createdAt: p.created_at
    };
  }

  /**
   * Create or update student's optional roommate profile
   */
  static upsertProfile(userId: string, data: {
    displayName: string;
    gender?: string;
    department?: string;
    level?: string;
    budgetMin?: number;
    budgetMax?: number;
    preferredAreas?: string[];
    preferredRoomType?: string;
    moveInMonth?: string;
    studyEnvironment?: string;
    cleanlinessExpectation?: string;
    sleepSchedule?: string;
    visitorPreference?: string;
    aboutMe?: string;
    roommatePreferencesNotes?: string;
    isActive?: boolean;
  }) {
    const existing = db.prepare('SELECT id FROM roommate_profiles WHERE user_id = ?').get(userId) as any;
    const profileId = existing?.id || `rmp-${crypto.randomUUID()}`;

    const {
      displayName,
      gender = 'ANY',
      department,
      level,
      budgetMin = 80000,
      budgetMax = 180000,
      preferredAreas = ['Under G', 'Adenike'],
      preferredRoomType = 'SHARED_2',
      moveInMonth = 'September',
      studyEnvironment = 'QUIET',
      cleanlinessExpectation = 'VERY_CLEAN',
      sleepSchedule = 'REGULAR',
      visitorPreference = 'OCCASIONAL',
      aboutMe,
      roommatePreferencesNotes,
      isActive = true
    } = data;

    if (!displayName || displayName.trim().length < 2) {
      throw new Error('Please provide a display name for your roommate profile');
    }

    db.prepare(`
      INSERT INTO roommate_profiles (
        id, user_id, is_active, display_name, gender, department, level,
        budget_min, budget_max, preferred_areas_json, preferred_room_type,
        move_in_month, study_environment, cleanliness_expectation,
        sleep_schedule, visitor_preference, about_me, roommate_preferences_notes,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now')
      )
      ON CONFLICT(user_id) DO UPDATE SET
        is_active = excluded.is_active,
        display_name = excluded.display_name,
        gender = excluded.gender,
        department = excluded.department,
        level = excluded.level,
        budget_min = excluded.budget_min,
        budget_max = excluded.budget_max,
        preferred_areas_json = excluded.preferred_areas_json,
        preferred_room_type = excluded.preferred_room_type,
        move_in_month = excluded.move_in_month,
        study_environment = excluded.study_environment,
        cleanliness_expectation = excluded.cleanliness_expectation,
        sleep_schedule = excluded.sleep_schedule,
        visitor_preference = excluded.visitor_preference,
        about_me = excluded.about_me,
        roommate_preferences_notes = excluded.roommate_preferences_notes,
        updated_at = datetime('now')
    `).run(
      profileId,
      userId,
      isActive ? 1 : 0,
      displayName.trim(),
      gender,
      department || null,
      level || null,
      budgetMin,
      budgetMax,
      JSON.stringify(preferredAreas),
      preferredRoomType,
      moveInMonth,
      studyEnvironment,
      cleanlinessExpectation,
      sleepSchedule,
      visitorPreference,
      aboutMe || null,
      roommatePreferencesNotes || null
    );

    return this.getProfile(userId);
  }

  /**
   * Calculate compatibility between two student roommate profiles
   */
  static calculateCompatibility(myProfile: RoommateProfileData, candidateProfile: RoommateProfileData): {
    score: number;
    label: string;
    positiveMatches: string[];
    tradeOffs: string[];
  } {
    let score = 50; // base potential score
    const positiveMatches: string[] = [];
    const tradeOffs: string[] = [];

    // 1. Budget Overlap (Max +20 pts)
    const budgetOverlap = Math.max(0, Math.min(myProfile.budgetMax, candidateProfile.budgetMax) - Math.max(myProfile.budgetMin, candidateProfile.budgetMin));
    if (budgetOverlap > 0) {
      score += 20;
      positiveMatches.push(`✓ Compatible annual budget range (₦${Math.max(myProfile.budgetMin, candidateProfile.budgetMin).toLocaleString()} – ₦${Math.min(myProfile.budgetMax, candidateProfile.budgetMax).toLocaleString()})`);
    } else {
      score -= 15;
      tradeOffs.push('⚠ Budget ranges do not directly overlap');
    }

    // 2. Area Overlap (Max +15 pts)
    const sharedAreas = myProfile.preferredAreas.filter(a => candidateProfile.preferredAreas.includes(a));
    if (sharedAreas.length > 0) {
      score += 15;
      positiveMatches.push(`✓ Shared neighborhood preference (${sharedAreas.join(', ')})`);
    } else {
      tradeOffs.push('⚠ Different preferred LAUTECH neighborhoods');
    }

    // 3. Room Type Match (+10 pts)
    if (myProfile.preferredRoomType === candidateProfile.preferredRoomType) {
      score += 10;
      positiveMatches.push(`✓ Same room configuration preference (${myProfile.preferredRoomType.replace('_', ' ')})`);
    }

    // 4. Move-in Timing Match (+10 pts)
    if (myProfile.moveInMonth.toLowerCase() === candidateProfile.moveInMonth.toLowerCase()) {
      score += 10;
      positiveMatches.push(`✓ Matching target move-in timeline (${myProfile.moveInMonth})`);
    } else {
      tradeOffs.push(`⚠ Different move-in target (${candidateProfile.moveInMonth})`);
    }

    // 5. Study & Living Environment (+15 pts)
    if (myProfile.studyEnvironment === candidateProfile.studyEnvironment) {
      score += 8;
      positiveMatches.push(`✓ Similar study environment preference (${myProfile.studyEnvironment.toLowerCase()})`);
    }
    if (myProfile.cleanlinessExpectation === candidateProfile.cleanlinessExpectation) {
      score += 7;
      positiveMatches.push('✓ Matching cleanliness expectations');
    } else {
      tradeOffs.push(`⚠ Cleanliness preference: ${candidateProfile.cleanlinessExpectation.toLowerCase().replace('_', ' ')}`);
    }

    // 6. Sleep Schedule
    if (myProfile.sleepSchedule === candidateProfile.sleepSchedule) {
      score += 5;
      positiveMatches.push(`✓ Similar sleep schedule (${myProfile.sleepSchedule.toLowerCase().replace('_', ' ')})`);
    }

    const finalScore = Math.max(30, Math.min(98, Math.round(score)));

    return {
      score: finalScore,
      label: `${finalScore}% Potential Match`,
      positiveMatches,
      tradeOffs
    };
  }

  /**
   * Discover and list potential roommate matches for a student
   */
  static discoverMatches(userId: string): PotentialRoommateMatch[] {
    const myProfile = this.getProfile(userId);
    if (!myProfile) return [];

    // Fetch all active profiles excluding self and blocked users
    const candidateProfilesRaw = db.prepare(`
      SELECT * FROM roommate_profiles 
      WHERE user_id != ? AND is_active = 1
    `).all(userId) as any[];

    const matches: PotentialRoommateMatch[] = [];

    for (const raw of candidateProfilesRaw) {
      if (this.isBlocked(userId, raw.user_id)) continue;

      let areas: string[] = [];
      try {
        areas = JSON.parse(raw.preferred_areas_json || '[]');
      } catch {
        areas = ['Under G', 'Adenike'];
      }

      const candidateProfile: RoommateProfileData = {
        id: raw.id,
        userId: raw.user_id,
        displayName: raw.display_name,
        gender: raw.gender,
        department: raw.department,
        level: raw.level,
        budgetMin: raw.budget_min,
        budgetMax: raw.budget_max,
        preferredAreas: areas,
        preferredRoomType: raw.preferred_room_type,
        moveInMonth: raw.move_in_month,
        studyEnvironment: raw.study_environment,
        cleanlinessExpectation: raw.cleanliness_expectation,
        sleepSchedule: raw.sleep_schedule,
        visitorPreference: raw.visitor_preference,
        aboutMe: raw.about_me,
        roommatePreferencesNotes: raw.roommate_preferences_notes,
        isActive: Boolean(raw.is_active),
        createdAt: raw.created_at
      };

      const evalResult = this.calculateCompatibility(myProfile, candidateProfile);

      // Check request status between the two
      const request = db.prepare(`
        SELECT id, sender_id, receiver_id, status 
        FROM roommate_requests 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, raw.user_id, raw.user_id, userId) as any;

      let requestStatus: PotentialRoommateMatch['requestStatus'] = 'NONE';
      let requestId: string | undefined;

      if (request) {
        requestId = request.id;
        if (request.status === 'ACCEPTED') requestStatus = 'ACCEPTED';
        else if (request.status === 'DECLINED') requestStatus = 'DECLINED';
        else if (request.status === 'ENDED') requestStatus = 'ENDED';
        else if (request.sender_id === userId) requestStatus = 'SENT';
        else requestStatus = 'RECEIVED';
      }

      matches.push({
        profile: candidateProfile,
        compatibilityScore: evalResult.score,
        compatibilityLabel: evalResult.label,
        positiveMatches: evalResult.positiveMatches,
        tradeOffs: evalResult.tradeOffs,
        requestStatus,
        requestId
      });
    }

    // Sort by compatibility score
    return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Send a roommate connection request
   */
  static sendRequest(senderId: string, receiverId: string, message?: string) {
    if (senderId === receiverId) {
      throw new Error('You cannot send a roommate request to yourself');
    }

    if (this.isBlocked(senderId, receiverId)) {
      throw new Error('Unable to send request to this student');
    }

    const senderProfile = this.getProfile(senderId);
    const receiverProfile = this.getProfile(receiverId);

    if (!senderProfile || !receiverProfile) {
      throw new Error('Both students must have an active roommate profile');
    }

    // Check if an active request already exists
    const existing = db.prepare(`
      SELECT id, status FROM roommate_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(senderId, receiverId, receiverId, senderId) as any;

    if (existing && existing.status === 'PENDING') {
      throw new Error('A pending roommate request already exists between you and this student');
    }

    const evalResult = this.calculateCompatibility(senderProfile, receiverProfile);
    const requestId = `rmr-${crypto.randomUUID()}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO roommate_requests (
          id, sender_id, receiver_id, status, message,
          compatibility_score, compatibility_breakdown_json
        ) VALUES (?, ?, ?, 'PENDING', ?, ?, ?)
      `).run(
        requestId,
        senderId,
        receiverId,
        message || null,
        evalResult.score,
        JSON.stringify(evalResult.positiveMatches)
      );

      // Notify receiver
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        receiverId,
        'New Potential Roommate Request',
        `${senderProfile.displayName} sent you a roommate connection request (${evalResult.label}).`,
        'ROOMMATE_REQUEST',
        '/community?tab=roommates'
      );
    })();

    return { requestId, status: 'PENDING', compatibilityScore: evalResult.score };
  }

  /**
   * Accept / Decline / End a Roommate Request
   */
  static respondRequest(requestId: string, userId: string, action: 'ACCEPT' | 'DECLINE' | 'END') {
    const req = db.prepare('SELECT * FROM roommate_requests WHERE id = ?').get(requestId) as any;
    if (!req) {
      throw new Error('Roommate request not found');
    }

    if (action === 'ACCEPT' || action === 'DECLINE') {
      if (req.receiver_id !== userId) {
        throw new Error('Only the recipient can accept or decline this request');
      }
    } else if (action === 'END') {
      if (req.sender_id !== userId && req.receiver_id !== userId) {
        throw new Error('You are not part of this roommate match');
      }
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'ENDED';

    db.prepare("UPDATE roommate_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, requestId);

    // Notify other party
    const otherUserId = req.sender_id === userId ? req.receiver_id : req.sender_id;
    const msg = action === 'ACCEPT' 
      ? 'Your roommate request was accepted! You can now message each other safely.'
      : action === 'DECLINE'
      ? 'A student declined the roommate request.'
      : 'A roommate match was concluded.';

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      otherUserId,
      'Roommate Request Update',
      msg,
      'ROOMMATE_UPDATE',
      '/community?tab=roommates'
    );

    return { requestId, status: newStatus };
  }

  /**
   * Send a message in Mutual Roommate Chat (Only allowed if request status is ACCEPTED)
   */
  static sendMessage(requestId: string, senderId: string, message: string) {
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    const req = db.prepare('SELECT * FROM roommate_requests WHERE id = ?').get(requestId) as any;
    if (!req) {
      throw new Error('Roommate request not found');
    }

    if (req.status !== 'ACCEPTED') {
      throw new Error('Mutual chat is only available after the roommate request has been accepted by both students');
    }

    if (req.sender_id !== senderId && req.receiver_id !== senderId) {
      throw new Error('You are not authorized to message in this conversation');
    }

    const receiverId = req.sender_id === senderId ? req.receiver_id : req.sender_id;

    if (this.isBlocked(senderId, receiverId)) {
      throw new Error('Unable to send message to blocked user');
    }

    const msgId = `rmm-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO roommate_messages (id, request_id, sender_id, receiver_id, message, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(msgId, requestId, senderId, receiverId, message.trim());

    return {
      id: msgId,
      requestId,
      senderId,
      receiverId,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get Mutual Roommate Chat Messages
   */
  static getMessages(requestId: string, userId: string) {
    const req = db.prepare('SELECT * FROM roommate_requests WHERE id = ?').get(requestId) as any;
    if (!req) {
      throw new Error('Roommate request not found');
    }

    if (req.sender_id !== userId && req.receiver_id !== userId) {
      throw new Error('Access denied to private roommate conversation');
    }

    // Mark unread messages as read
    db.prepare('UPDATE roommate_messages SET is_read = 1 WHERE request_id = ? AND receiver_id = ?').run(requestId, userId);

    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name
      FROM roommate_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.request_id = ?
      ORDER BY m.created_at ASC
    `).all(requestId) as any[];

    return {
      requestId,
      status: req.status,
      senderId: req.sender_id,
      receiverId: req.receiver_id,
      messages
    };
  }

  /**
   * Block a student
   */
  static blockUser(blockerId: string, blockedId: string, reason?: string) {
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself');
    }

    const blockId = `ub-${crypto.randomUUID()}`;

    db.transaction(() => {
      db.prepare(`
        INSERT OR IGNORE INTO user_blocks (id, blocker_id, blocked_id, reason)
        VALUES (?, ?, ?, ?)
      `).run(blockId, blockerId, blockedId, reason || null);

      // End any active roommate requests between them
      db.prepare(`
        UPDATE roommate_requests SET status = 'ENDED', updated_at = datetime('now')
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      `).run(blockerId, blockedId, blockedId, blockerId);
    })();

    return { success: true, message: 'User blocked successfully' };
  }

  /**
   * Report a community item or roommate behavior to Trust & Safety
   */
  static createReport(data: {
    reporterId: string;
    entityType: 'QUESTION' | 'ANSWER' | 'EXPERIENCE' | 'ROOMMATE_PROFILE' | 'ROOMMATE_CHAT' | 'POST' | 'GUIDE';
    entityId: string;
    reason: 'SPAM' | 'SCAM' | 'HARASSMENT' | 'FALSE_INFORMATION' | 'IMPERSONATION' | 'INAPPROPRIATE_CONTENT' | 'OTHER';
    description?: string;
  }) {
    const { reporterId, entityType, entityId, reason, description } = data;

    const reportId = `rep-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO community_reports (
        id, reporter_id, entity_type, entity_id, reason, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
    `).run(reportId, reporterId, entityType, entityId, reason, description || null);

    return { reportId, status: 'OPEN', message: 'Report submitted for administrator review' };
  }
}
