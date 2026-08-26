import db from '../db.js';
import crypto from 'crypto';

export interface CommunityQuestionItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  isVerifiedStudent: boolean;
  isVerifiedStay: boolean;
  isHelpfulContributor: boolean;
  title: string;
  description: string;
  category: string;
  propertyId?: string;
  propertyTitle?: string;
  areaId?: string;
  areaName?: string;
  isAnonymous: boolean;
  status: string;
  isAnswered: boolean;
  viewCount: number;
  answersCount: number;
  createdAt: string;
}

export interface CommunityAnswerItem {
  id: string;
  questionId: string;
  userId: string;
  authorName: string;
  authorRole: string;
  isVerifiedStay: boolean;
  isVerifiedStudent: boolean;
  isHelpfulContributor: boolean;
  isOfficialGuide: boolean;
  content: string;
  helpfulCount: number;
  unhelpfulCount: number;
  userReaction?: 'HELPFUL' | 'UNHELPFUL';
  createdAt: string;
}

export class CommunityService {
  /**
   * Check if a student has verified stay history on Hostel Ease
   */
  static checkVerifiedStay(userId: string, propertyId?: string): boolean {
    if (propertyId) {
      const b = db.prepare(`
        SELECT id FROM bookings 
        WHERE student_id = ? AND property_id = ? AND status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
        LIMIT 1
      `).get(userId, propertyId) as any;
      return Boolean(b);
    }

    const anyBooking = db.prepare(`
      SELECT id FROM bookings 
      WHERE student_id = ? AND status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
      LIMIT 1
    `).get(userId) as any;
    return Boolean(anyBooking);
  }

  /**
   * Check if a student is recognized as a Helpful Contributor (10+ helpful votes)
   */
  static checkHelpfulContributor(userId: string): boolean {
    const stat = db.prepare(`
      SELECT SUM(helpful_count) as totalHelpful 
      FROM community_answers 
      WHERE user_id = ? AND status = 'ACTIVE'
    `).get(userId) as any;
    return (stat?.totalHelpful || 0) >= 10;
  }

  /**
   * Get Community Questions with optional category, search, and property filter
   */
  static getQuestions(params: {
    category?: string;
    propertyId?: string;
    areaId?: string;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { category, propertyId, areaId, search, status = 'ACTIVE', limit = 25, offset = 0 } = params;

    let sql = `
      SELECT q.*, 
             u.full_name as author_name, 
             u.role as author_role,
             p.title as property_title,
             a.name as area_name,
             (SELECT COUNT(*) FROM community_answers ca WHERE ca.question_id = q.id AND ca.status = 'ACTIVE') as answers_count
      FROM community_questions q
      JOIN users u ON u.id = q.user_id
      LEFT JOIN properties p ON p.id = q.property_id
      LEFT JOIN areas a ON a.id = q.area_id
      WHERE 1=1
    `;
    const sqlParams: any[] = [];

    if (status !== 'ALL') {
      sql += ' AND q.status = ?';
      sqlParams.push(status);
    }

    if (category && category !== 'ALL') {
      sql += ' AND q.category = ?';
      sqlParams.push(category);
    }

    if (propertyId) {
      sql += ' AND q.property_id = ?';
      sqlParams.push(propertyId);
    }

    if (areaId) {
      sql += ' AND q.area_id = ?';
      sqlParams.push(areaId);
    }

    if (search && search.trim()) {
      sql += ' AND (q.title LIKE ? OR q.description LIKE ?)';
      sqlParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const rows = db.prepare(sql).all(...sqlParams) as any[];

    const questions: CommunityQuestionItem[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      authorName: r.is_anonymous ? 'Anonymous Student' : r.author_name,
      authorRole: r.author_role,
      isVerifiedStudent: r.author_role === 'STUDENT',
      isVerifiedStay: this.checkVerifiedStay(r.user_id, r.property_id),
      isHelpfulContributor: this.checkHelpfulContributor(r.user_id),
      title: r.title,
      description: r.description,
      category: r.category,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      areaId: r.area_id,
      areaName: r.area_name,
      isAnonymous: Boolean(r.is_anonymous),
      status: r.status,
      isAnswered: Boolean(r.is_answered || r.answers_count > 0),
      viewCount: r.view_count || 0,
      answersCount: r.answers_count || 0,
      createdAt: r.created_at
    }));

    return { questions, total: questions.length };
  }

  /**
   * Get Question Details and its Answers
   */
  static getQuestionDetail(questionId: string, currentUserId?: string) {
    // Increment view count
    db.prepare('UPDATE community_questions SET view_count = view_count + 1 WHERE id = ?').run(questionId);

    const q = db.prepare(`
      SELECT q.*, 
             u.full_name as author_name, 
             u.role as author_role,
             p.title as property_title,
             a.name as area_name,
             (SELECT COUNT(*) FROM community_answers ca WHERE ca.question_id = q.id AND ca.status = 'ACTIVE') as answers_count
      FROM community_questions q
      JOIN users u ON u.id = q.user_id
      LEFT JOIN properties p ON p.id = q.property_id
      LEFT JOIN areas a ON a.id = q.area_id
      WHERE q.id = ?
    `).get(questionId) as any;

    if (!q) {
      throw new Error('Question not found');
    }

    const question: CommunityQuestionItem = {
      id: q.id,
      userId: q.user_id,
      authorName: q.is_anonymous ? 'Anonymous Student' : q.author_name,
      authorRole: q.author_role,
      isVerifiedStudent: q.author_role === 'STUDENT',
      isVerifiedStay: this.checkVerifiedStay(q.user_id, q.property_id),
      isHelpfulContributor: this.checkHelpfulContributor(q.user_id),
      title: q.title,
      description: q.description,
      category: q.category,
      propertyId: q.property_id,
      propertyTitle: q.property_title,
      areaId: q.area_id,
      areaName: q.area_name,
      isAnonymous: Boolean(q.is_anonymous),
      status: q.status,
      isAnswered: Boolean(q.is_answered || q.answers_count > 0),
      viewCount: q.view_count || 0,
      answersCount: q.answers_count || 0,
      createdAt: q.created_at
    };

    // Get Answers (Prioritize Official Guides & Helpful answers, not just likes)
    const answersRaw = db.prepare(`
      SELECT a.*, 
             u.full_name as author_name, 
             u.role as user_role,
             COALESCE((SELECT reaction_type FROM community_reactions cr WHERE cr.entity_type = 'ANSWER' AND cr.entity_id = a.id AND cr.user_id = ?), NULL) as user_reaction
      FROM community_answers a
      JOIN users u ON u.id = a.user_id
      WHERE a.question_id = ? AND a.status = 'ACTIVE'
      ORDER BY a.is_official_guide DESC, (a.helpful_count - a.unhelpful_count) DESC, a.created_at ASC
    `).all(currentUserId || '', questionId) as any[];

    const answers: CommunityAnswerItem[] = answersRaw.map(a => ({
      id: a.id,
      questionId: a.question_id,
      userId: a.user_id,
      authorName: a.author_role === 'PROVIDER' ? `${a.author_name} (Hostel Provider)` : a.author_name,
      authorRole: a.author_role,
      isVerifiedStay: Boolean(a.is_verified_stay || this.checkVerifiedStay(a.user_id, q.property_id)),
      isVerifiedStudent: a.author_role === 'STUDENT',
      isHelpfulContributor: this.checkHelpfulContributor(a.user_id),
      isOfficialGuide: Boolean(a.is_official_guide || a.author_role === 'ADMIN'),
      content: a.content,
      helpfulCount: a.helpful_count || 0,
      unhelpfulCount: a.unhelpful_count || 0,
      userReaction: a.user_reaction,
      createdAt: a.created_at
    }));

    return { question, answers };
  }

  /**
   * Create a new Community Question
   */
  static createQuestion(data: {
    userId: string;
    title: string;
    description: string;
    category?: string;
    propertyId?: string;
    areaId?: string;
    isAnonymous?: boolean;
  }) {
    const { userId, title, description, category = 'GENERAL', propertyId, areaId, isAnonymous = false } = data;

    if (!title || title.trim().length < 8) {
      throw new Error('Question title must be at least 8 characters long');
    }
    if (!description || description.trim().length < 15) {
      throw new Error('Please provide more details in the description (at least 15 characters)');
    }

    const questionId = `cq-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO community_questions (
        id, user_id, title, description, category, property_id, area_id, is_anonymous, status, is_answered, view_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, 1)
    `).run(
      questionId,
      userId,
      title.trim(),
      description.trim(),
      category,
      propertyId || null,
      areaId || null,
      isAnonymous ? 1 : 0
    );

    return this.getQuestionDetail(questionId, userId);
  }

  /**
   * Answer a Community Question
   */
  static answerQuestion(data: {
    questionId: string;
    userId: string;
    content: string;
  }) {
    const { questionId, userId, content } = data;

    if (!content || content.trim().length < 10) {
      throw new Error('Answer content must be at least 10 characters long');
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      throw new Error('User not found');
    }

    const question = db.prepare('SELECT id, property_id, user_id FROM community_questions WHERE id = ?').get(questionId) as any;
    if (!question) {
      throw new Error('Question not found');
    }

    const isVerifiedStay = this.checkVerifiedStay(userId, question.property_id) ? 1 : 0;
    const isVerifiedStudent = user.role === 'STUDENT' ? 1 : 0;
    const isOfficialGuide = user.role === 'ADMIN' ? 1 : 0;
    const answerId = `ca-${crypto.randomUUID()}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO community_answers (
          id, question_id, user_id, author_role, content,
          is_verified_stay, is_verified_student, is_official_guide,
          helpful_count, unhelpful_count, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ACTIVE')
      `).run(
        answerId,
        questionId,
        userId,
        user.role,
        content.trim(),
        isVerifiedStay,
        isVerifiedStudent,
        isOfficialGuide
      );

      // Mark question as answered
      db.prepare("UPDATE community_questions SET is_answered = 1, updated_at = datetime('now') WHERE id = ?").run(questionId);

      // Notify question author if different
      if (question.user_id !== userId) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `notif-${crypto.randomUUID()}`,
          question.user_id,
          'New Answer to Your Accommodation Question',
          'A student or community member answered your question on Hostel Ease.',
          'COMMUNITY_ANSWER',
          `/community?questionId=${questionId}`
        );
      }
    })();

    return this.getQuestionDetail(questionId, userId);
  }

  /**
   * React to Answer (Helpful / Unhelpful)
   */
  static reactToAnswer(data: {
    answerId: string;
    userId: string;
    reactionType: 'HELPFUL' | 'UNHELPFUL';
  }) {
    const { answerId, userId, reactionType } = data;

    const answer = db.prepare('SELECT id, helpful_count, unhelpful_count FROM community_answers WHERE id = ?').get(answerId) as any;
    if (!answer) {
      throw new Error('Answer not found');
    }

    const existing = db.prepare(`
      SELECT id, reaction_type FROM community_reactions 
      WHERE entity_type = 'ANSWER' AND entity_id = ? AND user_id = ?
    `).get(answerId, userId) as any;

    db.transaction(() => {
      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          db.prepare('DELETE FROM community_reactions WHERE id = ?').run(existing.id);
          if (reactionType === 'HELPFUL') {
            db.prepare('UPDATE community_answers SET helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(answerId);
          } else {
            db.prepare('UPDATE community_answers SET unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(answerId);
          }
        } else {
          // Switch reaction
          db.prepare('UPDATE community_reactions SET reaction_type = ? WHERE id = ?').run(reactionType, existing.id);
          if (reactionType === 'HELPFUL') {
            db.prepare('UPDATE community_answers SET helpful_count = helpful_count + 1, unhelpful_count = MAX(0, unhelpful_count - 1) WHERE id = ?').run(answerId);
          } else {
            db.prepare('UPDATE community_answers SET unhelpful_count = unhelpful_count + 1, helpful_count = MAX(0, helpful_count - 1) WHERE id = ?').run(answerId);
          }
        }
      } else {
        // Insert new reaction
        const reactId = `cr-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO community_reactions (id, user_id, entity_type, entity_id, reaction_type)
          VALUES (?, ?, 'ANSWER', ?, ?)
        `).run(reactId, userId, answerId, reactionType);

        if (reactionType === 'HELPFUL') {
          db.prepare('UPDATE community_answers SET helpful_count = helpful_count + 1 WHERE id = ?').run(answerId);
        } else {
          db.prepare('UPDATE community_answers SET unhelpful_count = unhelpful_count + 1 WHERE id = ?').run(answerId);
        }
      }
    })();

    return db.prepare('SELECT id, helpful_count, unhelpful_count FROM community_answers WHERE id = ?').get(answerId);
  }

  /**
   * Search across all Community knowledge (Questions, Answers, Guides, Area Guides)
   */
  static searchCommunity(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { questions: [], guides: [], areaGuides: [] };
    }

    const questions = db.prepare(`
      SELECT q.id, q.title, q.description, q.category,
             (SELECT COUNT(*) FROM community_answers ca WHERE ca.question_id = q.id) as answers_count
      FROM community_questions q
      WHERE q.status = 'ACTIVE' AND (q.title LIKE ? OR q.description LIKE ?)
      ORDER BY q.created_at DESC
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`);

    const guides = db.prepare(`
      SELECT id, title, slug, category, read_time_minutes
      FROM community_guides
      WHERE title LIKE ? OR content_markdown LIKE ?
      LIMIT 5
    `).all(`%${q}%`, `%${q}%`);

    const areaGuides = db.prepare(`
      SELECT id, area_name, description, walking_minutes_to_campus, estimated_daily_transport
      FROM area_guides
      WHERE area_name LIKE ? OR description LIKE ?
      LIMIT 5
    `).all(`%${q}%`, `%${q}%`);

    return { questions, guides, areaGuides };
  }
}
