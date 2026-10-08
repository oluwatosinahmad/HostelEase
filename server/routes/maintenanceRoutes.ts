import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Generate professional ticket tracking code: HE-MNT-YYYYMMDD-XXXXX
function generateTicketCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(10000 + Math.random() * 90000);
  return `HE-MNT-${dateStr}-${randNum}`;
}

// 1. Get properties available for maintenance issue submission
router.get('/properties', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    
    if (user.role === 'PROVIDER') {
      const properties = db.prepare(`
        SELECT id, title, address, total_rooms FROM properties 
        WHERE provider_id = ? AND availability_status != 'DELISTED'
        ORDER BY title ASC
      `).all(user.id);
      return res.json({ properties });
    }

    // For students: first check approved/active bookings
    const bookedProperties = db.prepare(`
      SELECT DISTINCT p.id, p.title, p.address, p.provider_id, u.full_name as provider_name
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users u ON p.provider_id = u.id
      WHERE b.student_id = ? AND b.status IN ('CONFIRMED', 'ACTIVE', 'PAID', 'APPROVED')
    `).all(user.id);

    // Also provide active verified hostels in case of recent move-in or unlinked booking
    const allActiveProperties = db.prepare(`
      SELECT p.id, p.title, p.address, p.provider_id, u.full_name as provider_name
      FROM properties p
      JOIN users u ON p.provider_id = u.id
      WHERE p.availability_status != 'DELISTED'
      ORDER BY p.title ASC
    `).all();

    return res.json({
      bookedProperties,
      allProperties: allActiveProperties
    });
  } catch (err: any) {
    console.error('Error fetching maintenance properties:', err);
    return res.status(500).json({ error: 'Failed to retrieve property list' });
  }
});

// 2. Submit a new maintenance ticket
router.post('/tickets', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      propertyId,
      roomNumber,
      category,
      description,
      priority = 'MEDIUM',
      attachments = []
    } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'Property is required' });
    }
    if (!roomNumber || !roomNumber.trim()) {
      return res.status(400).json({ error: 'Room number or location description is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Maintenance category is required' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a clear description of the issue (at least 10 characters)' });
    }

    const validCategories = [
      'ELECTRICITY', 'WATER', 'PLUMBING', 'DOOR_LOCK', 'FAN_AC',
      'INTERNET', 'CLEANING', 'SECURITY', 'FURNITURE', 'OTHER'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Choose from: ${validCategories.join(', ')}` });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
    const assignedPriority = validPriorities.includes(priority) ? priority : 'MEDIUM';

    // Fetch property and its provider
    const property = db.prepare(`
      SELECT p.id, p.title, p.provider_id, u.full_name as provider_name 
      FROM properties p 
      JOIN users u ON p.provider_id = u.id 
      WHERE p.id = ?
    `).get(propertyId) as any;

    if (!property) {
      return res.status(404).json({ error: 'Selected property does not exist' });
    }

    const ticketId = `mnt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const ticketCode = generateTicketCode();
    const attachmentsJson = JSON.stringify(Array.isArray(attachments) ? attachments : []);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO maintenance_tickets (
          id, ticket_code, student_id, property_id, provider_id,
          room_number, category, description, attachments_json,
          status, priority, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          'SUBMITTED', ?, datetime('now'), datetime('now')
        )
      `).run(
        ticketId,
        ticketCode,
        user.id,
        property.id,
        property.provider_id,
        roomNumber.trim(),
        category,
        description.trim(),
        attachmentsJson,
        assignedPriority
      );

      // Create initial update log
      const updateId = `mnt-upd-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      db.prepare(`
        INSERT INTO maintenance_ticket_updates (
          id, ticket_id, sender_id, sender_role, message, status_change, attachments_json, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, 'SUBMITTED', ?, datetime('now')
        )
      `).run(
        updateId,
        ticketId,
        user.id,
        user.role,
        `Issue reported: ${description.trim().substring(0, 120)}...`,
        attachmentsJson
      );
    })();

    const createdTicket = db.prepare(`
      SELECT mt.*, p.title as property_title, u.full_name as provider_name
      FROM maintenance_tickets mt
      JOIN properties p ON mt.property_id = p.id
      JOIN users u ON mt.provider_id = u.id
      WHERE mt.id = ?
    `).get(ticketId);

    return res.status(201).json({
      success: true,
      message: `Maintenance ticket ${ticketCode} created successfully! Property management has been notified.`,
      ticket: createdTicket
    });
  } catch (err: any) {
    console.error('Error creating maintenance ticket:', err);
    return res.status(500).json({ error: 'Failed to create maintenance ticket' });
  }
});

// 3. List tickets (Student: only own; Provider: only their hostels; Admin: all)
router.get('/tickets', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, category, priority, propertyId } = req.query;

    let sql = `
      SELECT mt.*, 
             p.title as property_title, p.address as property_address,
             student.full_name as student_name, student.phone as student_phone, student.email as student_email,
             provider.full_name as provider_name, provider.phone as provider_phone
      FROM maintenance_tickets mt
      JOIN properties p ON mt.property_id = p.id
      JOIN users student ON mt.student_id = student.id
      JOIN users provider ON mt.provider_id = provider.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'STUDENT') {
      sql += ' AND mt.student_id = ?';
      params.push(user.id);
    } else if (user.role === 'PROVIDER') {
      sql += ' AND mt.provider_id = ?';
      params.push(user.id);
    } // ADMIN sees all

    if (status && status !== 'ALL') {
      sql += ' AND mt.status = ?';
      params.push(status);
    }
    if (category && category !== 'ALL') {
      sql += ' AND mt.category = ?';
      params.push(category);
    }
    if (priority && priority !== 'ALL') {
      sql += ' AND mt.priority = ?';
      params.push(priority);
    }
    if (propertyId) {
      sql += ' AND mt.property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY mt.created_at DESC';

    const tickets = db.prepare(sql).all(...params);
    return res.json({ tickets });
  } catch (err: any) {
    console.error('Error fetching maintenance tickets:', err);
    return res.status(500).json({ error: 'Failed to retrieve maintenance tickets' });
  }
});

// 4. Get ticket details with timeline updates
router.get('/tickets/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const ticket = db.prepare(`
      SELECT mt.*, 
             p.title as property_title, p.address as property_address,
             student.full_name as student_name, student.phone as student_phone, student.email as student_email,
             provider.full_name as provider_name, provider.phone as provider_phone
      FROM maintenance_tickets mt
      JOIN properties p ON mt.property_id = p.id
      JOIN users student ON mt.student_id = student.id
      JOIN users provider ON mt.provider_id = provider.id
      WHERE mt.id = ? OR mt.ticket_code = ?
    `).get(id, id) as any;

    if (!ticket) {
      return res.status(404).json({ error: 'Maintenance ticket not found' });
    }

    // Role-based security access check
    if (user.role === 'STUDENT' && ticket.student_id !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to view this ticket' });
    }
    if (user.role === 'PROVIDER' && ticket.provider_id !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to view tickets for properties you do not manage' });
    }

    const updates = db.prepare(`
      SELECT mtu.*, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM maintenance_ticket_updates mtu
      JOIN users u ON mtu.sender_id = u.id
      WHERE mtu.ticket_id = ?
      ORDER BY mtu.created_at ASC
    `).all(ticket.id);

    return res.json({ ticket, updates });
  } catch (err: any) {
    console.error('Error fetching ticket details:', err);
    return res.status(500).json({ error: 'Failed to retrieve ticket details' });
  }
});

// 5. Add update / progress note / status change
router.post('/tickets/:id/updates', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { message, statusChange, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Update message cannot be empty' });
    }

    const ticket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(id) as any;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Access check
    if (user.role === 'STUDENT' && ticket.student_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (user.role === 'PROVIDER' && ticket.provider_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validStatuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const newStatus = statusChange && validStatuses.includes(statusChange) ? statusChange : ticket.status;

    const updateId = `mnt-upd-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const attachmentsJson = JSON.stringify(Array.isArray(attachments) ? attachments : []);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO maintenance_ticket_updates (
          id, ticket_id, sender_id, sender_role, message, status_change, attachments_json, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, datetime('now')
        )
      `).run(
        updateId,
        ticket.id,
        user.id,
        user.role,
        message.trim(),
        statusChange || null,
        attachmentsJson
      );

      const resolvedAtUpdate = (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? ", resolved_at = datetime('now')" : "";
      db.prepare(`
        UPDATE maintenance_tickets 
        SET status = ?, updated_at = datetime('now') ${resolvedAtUpdate}
        WHERE id = ?
      `).run(newStatus, ticket.id);
    })();

    const updatedTicket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(ticket.id);
    return res.json({
      success: true,
      message: 'Update recorded successfully',
      ticket: updatedTicket
    });
  } catch (err: any) {
    console.error('Error posting ticket update:', err);
    return res.status(500).json({ error: 'Failed to record update' });
  }
});

// 6. Quick status change (Provider / Admin / Student close)
router.patch('/tickets/:id/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(id) as any;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (user.role === 'STUDENT' && ticket.student_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (user.role === 'PROVIDER' && ticket.provider_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Students can only mark CLOSED (to confirm resolution) or reopen
    if (user.role === 'STUDENT' && !['CLOSED', 'SUBMITTED'].includes(status)) {
      return res.status(403).json({ error: 'Students can only mark resolved issues as CLOSED or report ongoing issues' });
    }

    const updateMsg = note ? note.trim() : `Status updated to ${status}`;
    const updateId = `mnt-upd-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO maintenance_ticket_updates (
          id, ticket_id, sender_id, sender_role, message, status_change, attachments_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, '[]', datetime('now'))
      `).run(updateId, ticket.id, user.id, user.role, updateMsg, status);

      const resolvedUpdate = (status === 'RESOLVED' || status === 'CLOSED') ? ", resolved_at = datetime('now')" : "";
      db.prepare(`
        UPDATE maintenance_tickets 
        SET status = ?, updated_at = datetime('now') ${resolvedUpdate}
        WHERE id = ?
      `).run(status, ticket.id);
    })();

    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err: any) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

export default router;
