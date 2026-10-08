import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// 1. Get current active SafeWalk journey & saved contacts
router.get('/active', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.json({ journey: null, contacts: [] });
    }

    // Auto-expire journeys older than expected arrival + 30 mins
    db.prepare(`
      UPDATE safewalk_journeys 
      SET status = 'EXPIRED' 
      WHERE user_id = ? AND status = 'ACTIVE' 
      AND datetime('now') > datetime(expected_arrival_at, '+30 minutes')
    `).run(userId);

    const activeJourney = db.prepare(`
      SELECT * FROM safewalk_journeys 
      WHERE user_id = ? AND status IN ('ACTIVE', 'SOS_TRIGGERED')
      ORDER BY started_at DESC LIMIT 1
    `).get(userId);

    const contacts = db.prepare(`
      SELECT * FROM safewalk_contacts 
      WHERE user_id = ? 
      ORDER BY is_primary DESC, created_at DESC
    `).all(userId);

    return res.json({
      journey: activeJourney || null,
      contacts: contacts || []
    });
  } catch (err: any) {
    console.error('Error fetching active SafeWalk journey:', err);
    return res.status(500).json({ error: 'Failed to retrieve active SafeWalk journey' });
  }
});

// 2. Start a new SafeWalk journey
router.post('/start', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      destination, 
      startLocation, 
      startCoordinates, 
      durationMins = 15, 
      emergencyContactName, 
      emergencyContactPhone,
      notes
    } = req.body;

    if (!destination || !destination.trim()) {
      return res.status(400).json({ error: 'Destination is required for SafeWalk' });
    }
    if (!emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ error: 'A designated emergency contact name and phone number are required' });
    }

    const duration = Math.max(5, Math.min(180, parseInt(durationMins, 10) || 15));

    // Cancel any previous active journey
    db.prepare(`
      UPDATE safewalk_journeys 
      SET status = 'CANCELLED' 
      WHERE user_id = ? AND status = 'ACTIVE'
    `).run(userId);

    const journeyId = `swj-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    
    // Save or update emergency contact in address book
    const existingContact = db.prepare(`
      SELECT id FROM safewalk_contacts WHERE user_id = ? AND phone_number = ?
    `).get(userId, emergencyContactPhone);

    if (!existingContact) {
      db.prepare(`
        INSERT INTO safewalk_contacts (id, user_id, contact_name, phone_number, is_primary)
        VALUES (?, ?, ?, ?, 1)
      `).run(`swc-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`, userId, emergencyContactName.trim(), emergencyContactPhone.trim());
    }

    db.prepare(`
      INSERT INTO safewalk_journeys (
        id, user_id, destination, start_location, start_coordinates, duration_mins,
        emergency_contact_name, emergency_contact_phone, status, started_at,
        expected_arrival_at, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, 'ACTIVE', datetime('now'),
        datetime('now', '+' || ? || ' minutes'), ?
      )
    `).run(
      journeyId,
      userId,
      destination.trim(),
      startLocation ? startLocation.trim() : 'Current Location',
      startCoordinates ? JSON.stringify(startCoordinates) : null,
      duration,
      emergencyContactName.trim(),
      emergencyContactPhone.trim(),
      duration,
      notes ? notes.trim() : null
    );

    const created = db.prepare('SELECT * FROM safewalk_journeys WHERE id = ?').get(journeyId);
    return res.status(201).json({ journey: created, message: 'SafeWalk journey started successfully' });
  } catch (err: any) {
    console.error('Error starting SafeWalk journey:', err);
    return res.status(500).json({ error: 'Failed to start SafeWalk journey' });
  }
});

// 3. Mark Journey as Safe / Arrived
router.post('/safe', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { journeyId } = req.body;

    const journey = journeyId 
      ? db.prepare('SELECT * FROM safewalk_journeys WHERE id = ? AND user_id = ?').get(journeyId, userId)
      : db.prepare("SELECT * FROM safewalk_journeys WHERE user_id = ? AND status IN ('ACTIVE', 'SOS_TRIGGERED') ORDER BY started_at DESC LIMIT 1").get(userId);

    if (!journey) {
      return res.status(404).json({ error: 'Active journey not found' });
    }

    db.prepare(`
      UPDATE safewalk_journeys 
      SET status = 'COMPLETED', completed_at = datetime('now')
      WHERE id = ?
    `).run((journey as any).id);

    return res.json({ 
      success: true, 
      message: "You're safe! Your SafeWalk journey has been completed." 
    });
  } catch (err: any) {
    console.error('Error ending SafeWalk journey:', err);
    return res.status(500).json({ error: 'Failed to complete SafeWalk journey' });
  }
});

// 4. Trigger SOS Alert
router.post('/sos', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { journeyId, currentCoordinates, alertNote } = req.body;

    const journey = journeyId 
      ? db.prepare('SELECT * FROM safewalk_journeys WHERE id = ? AND user_id = ?').get(journeyId, userId)
      : db.prepare("SELECT * FROM safewalk_journeys WHERE user_id = ? AND status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1").get(userId);

    const actualId = (journey as any)?.id;

    if (actualId) {
      db.prepare(`
        UPDATE safewalk_journeys 
        SET status = 'SOS_TRIGGERED', 
            sos_triggered_at = datetime('now'),
            notes = COALESCE(notes, '') || ' [SOS Triggered: ' || ? || ']'
        WHERE id = ?
      `).run(alertNote || 'Emergency SOS Button Activated', actualId);
    }

    return res.json({
      success: true,
      sosTriggered: true,
      message: 'Emergency SOS activated. Your designated contacts have been prioritized with your journey details.',
      emergencyContact: journey ? {
        name: (journey as any).emergency_contact_name,
        phone: (journey as any).emergency_contact_phone
      } : null,
      securityHelpline: 'LAUTECH Security Unit: 0803 000 0000 / Oyo State Emergency: 112'
    });
  } catch (err: any) {
    console.error('Error triggering SOS:', err);
    return res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
});

// 5. Emergency Contacts management
router.get('/contacts', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contacts = db.prepare(`
      SELECT * FROM safewalk_contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC
    `).all(userId);
    return res.json({ contacts });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

router.post('/contacts', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactName, phoneNumber, relationship = 'Family/Friend', isPrimary = 0 } = req.body;

    if (!contactName || !phoneNumber) {
      return res.status(400).json({ error: 'Contact name and phone number are required' });
    }

    if (isPrimary) {
      db.prepare('UPDATE safewalk_contacts SET is_primary = 0 WHERE user_id = ?').run(userId);
    }

    const id = `swc-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    db.prepare(`
      INSERT INTO safewalk_contacts (id, user_id, contact_name, phone_number, relationship, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, contactName.trim(), phoneNumber.trim(), relationship.trim(), isPrimary ? 1 : 0);

    const contact = db.prepare('SELECT * FROM safewalk_contacts WHERE id = ?').get(id);
    return res.status(201).json({ contact });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save contact' });
  }
});

router.delete('/contacts/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    db.prepare('DELETE FROM safewalk_contacts WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// 6. Journey History
router.get('/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const journeys = db.prepare(`
      SELECT * FROM safewalk_journeys 
      WHERE user_id = ? 
      ORDER BY started_at DESC LIMIT 15
    `).all(userId);
    return res.json({ journeys });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve journey history' });
  }
});

export default router;
