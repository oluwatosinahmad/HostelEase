import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

function generateSplitRef(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HE-SPLIT-${dateStr}-${rand}`;
}

// 1. Create a new Split Rent Agreement
router.post('/create', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      propertyId,
      propertyTitle,
      totalRent,
      splitType = '50_50',
      dueDate,
      notes,
      participants = []
    } = req.body;

    const rent = parseFloat(totalRent);
    if (isNaN(rent) || rent <= 0) {
      return res.status(400).json({ error: 'Please enter a valid total rent amount' });
    }

    if (!propertyTitle || !propertyTitle.trim()) {
      return res.status(400).json({ error: 'Hostel/Property name is required' });
    }

    if (!dueDate) {
      return res.status(400).json({ error: 'Rent due date is required' });
    }

    if (!Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: 'At least 2 roommates are required for rent splitting' });
    }

    // Validate percentage sum
    const totalPercentage = participants.reduce((sum: number, p: any) => sum + (parseFloat(p.sharePercentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.5) {
      return res.status(400).json({ 
        error: `Total shares must sum to 100%. Current sum: ${totalPercentage.toFixed(1)}%` 
      });
    }

    const agreementId = `sra-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const referenceCode = generateSplitRef();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO split_rent_agreements (
          id, reference_code, creator_id, property_id, property_title,
          total_rent, split_type, due_date, status, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, 'PENDING', ?, datetime('now'), datetime('now')
        )
      `).run(
        agreementId,
        referenceCode,
        user.id,
        propertyId || null,
        propertyTitle.trim(),
        rent,
        ['50_50', '60_40', '70_30', 'CUSTOM'].includes(splitType) ? splitType : 'CUSTOM',
        dueDate,
        notes ? notes.trim() : null
      );

      const insertShare = db.prepare(`
        INSERT INTO split_rent_shares (
          id, agreement_id, user_id, participant_name, participant_email,
          participant_phone, share_percentage, share_amount, payment_status,
          acceptance_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, datetime('now'))
      `);

      for (const p of participants) {
        const shareId = `srs-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const pct = parseFloat(p.sharePercentage) || 0;
        const shareAmt = Math.round((rent * pct) / 100);
        
        // Check if participant matches the creator
        const isCreator = p.email?.trim().toLowerCase() === user.email.toLowerCase() || p.userId === user.id;
        const participantUserId = isCreator ? user.id : (p.userId || null);
        const acceptanceStatus = isCreator ? 'ACCEPTED' : 'PENDING';

        insertShare.run(
          shareId,
          agreementId,
          participantUserId,
          p.name?.trim() || 'Roommate',
          p.email?.trim().toLowerCase() || '',
          p.phone ? p.phone.trim() : null,
          pct,
          shareAmt,
          acceptanceStatus
        );
      }
    })();

    const agreement = db.prepare('SELECT * FROM split_rent_agreements WHERE id = ?').get(agreementId);
    const shares = db.prepare('SELECT * FROM split_rent_shares WHERE agreement_id = ?').all(agreementId);

    return res.status(201).json({
      success: true,
      message: `Split Rent agreement ${referenceCode} generated! Roommates can now view and settle their portion.`,
      agreement,
      shares
    });
  } catch (err: any) {
    console.error('Error creating split rent agreement:', err);
    return res.status(500).json({ error: 'Failed to create split rent agreement' });
  }
});

// 2. Get user's split rent agreements (as creator or participant)
router.get('/my', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Find agreements where user is creator or listed in shares
    const agreements = db.prepare(`
      SELECT DISTINCT sra.*,
        (SELECT COUNT(*) FROM split_rent_shares WHERE agreement_id = sra.id) as total_participants,
        (SELECT COUNT(*) FROM split_rent_shares WHERE agreement_id = sra.id AND payment_status = 'PAID') as paid_count,
        (SELECT SUM(share_amount) FROM split_rent_shares WHERE agreement_id = sra.id AND payment_status = 'PAID') as collected_amount
      FROM split_rent_agreements sra
      LEFT JOIN split_rent_shares srs ON sra.id = srs.agreement_id
      WHERE sra.creator_id = ? OR srs.user_id = ? OR srs.participant_email = ?
      ORDER BY sra.created_at DESC
    `).all(user.id, user.id, user.email.toLowerCase()) as any[];

    // Attach shares to each agreement
    const result = agreements.map((agr: any) => {
      const shares = db.prepare(`
        SELECT * FROM split_rent_shares WHERE agreement_id = ? ORDER BY share_percentage DESC
      `).all(agr.id);
      return {
        ...agr,
        shares
      };
    });

    return res.json({ agreements: result });
  } catch (err: any) {
    console.error('Error fetching split rent agreements:', err);
    return res.status(500).json({ error: 'Failed to retrieve split rent agreements' });
  }
});

// 3. Get single agreement detail
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const agreement = db.prepare(`
      SELECT * FROM split_rent_agreements WHERE id = ? OR reference_code = ?
    `).get(id, id) as any;

    if (!agreement) {
      return res.status(404).json({ error: 'Split rent agreement not found' });
    }

    const shares = db.prepare(`
      SELECT * FROM split_rent_shares WHERE agreement_id = ? ORDER BY share_percentage DESC
    `).all(agreement.id);

    return res.json({ agreement, shares });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve agreement details' });
  }
});

// 4. Accept share invite
router.post('/share/:shareId/accept', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { shareId } = req.params;

    const share = db.prepare('SELECT * FROM split_rent_shares WHERE id = ?').get(shareId) as any;
    if (!share) {
      return res.status(404).json({ error: 'Share record not found' });
    }

    db.prepare(`
      UPDATE split_rent_shares 
      SET acceptance_status = 'ACCEPTED', user_id = ?
      WHERE id = ?
    `).run(user.id, share.id);

    return res.json({ success: true, message: 'Split rent share accepted.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to accept share' });
  }
});

// 5. Mark / Record Payment for a share
router.post('/share/:shareId/pay', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { shareId } = req.params;
    const { paymentReference = `PAY-SPLIT-${Date.now().toString(36).toUpperCase()}` } = req.body;

    const share = db.prepare('SELECT * FROM split_rent_shares WHERE id = ?').get(shareId) as any;
    if (!share) {
      return res.status(404).json({ error: 'Share record not found' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE split_rent_shares 
        SET payment_status = 'PAID', paid_at = datetime('now'), payment_reference = ?
        WHERE id = ?
      `).run(paymentReference, share.id);

      // Check if all shares for agreement are now PAID
      const remainingUnpaid = db.prepare(`
        SELECT COUNT(*) as count FROM split_rent_shares 
        WHERE agreement_id = ? AND payment_status != 'PAID'
      `).get(share.agreement_id) as { count: number };

      if (remainingUnpaid.count === 0) {
        db.prepare(`
          UPDATE split_rent_agreements 
          SET status = 'COMPLETED', updated_at = datetime('now')
          WHERE id = ?
        `).run(share.agreement_id);
      } else {
        db.prepare(`
          UPDATE split_rent_agreements 
          SET status = 'ACTIVE', updated_at = datetime('now')
          WHERE id = ?
        `).run(share.agreement_id);
      }
    })();

    const updatedShare = db.prepare('SELECT * FROM split_rent_shares WHERE id = ?').get(share.id);
    return res.json({
      success: true,
      message: 'Share marked as PAID successfully!',
      share: updatedShare
    });
  } catch (err: any) {
    console.error('Error processing split share payment:', err);
    return res.status(500).json({ error: 'Failed to record share payment' });
  }
});

// 6. Send Reminder to unpaid roommates
router.post('/:id/remind', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const agreement = db.prepare('SELECT * FROM split_rent_agreements WHERE id = ?').get(id) as any;
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    const unpaidShares = db.prepare(`
      SELECT * FROM split_rent_shares 
      WHERE agreement_id = ? AND payment_status = 'PENDING'
    `).all(agreement.id) as any[];

    // In a real email/SMS queue, messages are dispatched. We log and return confirmation
    const remindedNames = unpaidShares.map(s => s.participant_name).join(', ');

    return res.json({
      success: true,
      message: `Friendly payment reminder queued for ${unpaidShares.length} pending roommate(s): ${remindedNames || 'All settled'}.`,
      remindedCount: unpaidShares.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export default router;
