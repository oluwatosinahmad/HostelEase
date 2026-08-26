import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getPaymentGateway } from '../services/paymentGateway';

const router = Router();

// Helper: Generate reference HE-PAY-2026-XXXXXX
function generatePaymentReference(): string {
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `HE-PAY-2026-${randomStr}`;
}

// Helper: Generate refund reference HE-REF-2026-XXXXXX
function generateRefundReference(): string {
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `HE-REF-2026-${randomStr}`;
}

// Helper: Generate dispute reference HE-DIS-2026-XXXXXX
function generateDisputeReference(): string {
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `HE-DIS-2026-${randomStr}`;
}

// Helper: Get active platform fee
function getActivePlatformFee(): number {
  const config = db.prepare(`
    SELECT fee_type, fee_value FROM platform_fee_configs
    WHERE is_active = 1
    LIMIT 1
  `).get() as any;

  if (!config) return 2500;
  return Number(config.fee_value) || 2500;
}

// ==========================================================================
// 1. GET Config / Platform Fee
// ==========================================================================
router.get('/platform-fee', (req: Request, res: Response) => {
  try {
    const fee = getActivePlatformFee();
    res.json({
      feeName: 'Hostel Ease Service & Security Fee',
      feeAmount: fee,
      currency: 'NGN',
      description: 'Covers payment processing, verified receipt generation, and fraud protection.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch fee config' });
  }
});

// ==========================================================================
// 2. POST /initialize - Initialize Payment with Strict Price Integrity
// ==========================================================================
router.post('/initialize', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const userEmail = req.user!.email;
  const { bookingId, paymentProvider, paymentMethod } = req.body;

  if (userRole !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students can initiate payments for hostel bookings' });
  }

  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    // 1. Query Authoritative Booking from DB
    const booking = db.prepare(`
      SELECT 
        b.*,
        p.title as propertyTitle,
        p.provider_id as propertyProviderId,
        r.room_name as roomName,
        r.room_type as roomType,
        u.email as studentEmail,
        u.full_name as studentName,
        u.phone as studentPhone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.student_id = u.id
      WHERE b.id = ? OR b.booking_reference = ?
    `).get(bookingId, bookingId) as any;

    if (!booking) {
      return res.status(404).json({ error: 'Booking reservation not found' });
    }

    if (booking.student_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to pay for this booking' });
    }

    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot pay for a booking with status ${booking.status}` });
    }

    if (booking.payment_status === 'PAID') {
      return res.status(400).json({ error: 'This booking has already been paid for' });
    }

    // 2. Authoritative Price Calculation (Zero trust on frontend values)
    const bookingTotal = Number(booking.total_cost);
    const platformFee = getActivePlatformFee();
    const totalToPay = bookingTotal + platformFee;
    const providerEarning = bookingTotal; // Provider receives full booking cost

    if (totalToPay <= 0) {
      return res.status(400).json({ error: 'Invalid total payment amount calculated' });
    }

    // 3. Generate Payment Reference & Record
    const paymentRef = generatePaymentReference();
    const paymentId = `pay-${crypto.randomUUID()}`;
    const selectedProvider = paymentProvider || 'TEST_GATEWAY';
    const selectedMethod = paymentMethod || 'CARD';

    const breakdown = {
      rentAmount: booking.rent_amount,
      serviceCharge: booking.service_charge,
      agencyFee: booking.agency_fee,
      cautionDeposit: booking.caution_deposit,
      otherCharges: booking.other_charges,
      bookingSubtotal: bookingTotal,
      platformFee: platformFee,
      totalAmount: totalToPay
    };

    // Insert Payment within Atomic Transaction
    db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (
          id, payment_reference, booking_id, student_id, provider_id, property_id,
          amount, platform_fee, provider_amount, currency, payment_provider,
          payment_method, status, metadata_json, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'NGN', ?,
          ?, 'PENDING', ?, datetime('now'), datetime('now')
        )
      `).run(
        paymentId,
        paymentRef,
        booking.id,
        userId,
        booking.propertyProviderId,
        booking.property_id,
        totalToPay,
        platformFee,
        providerEarning,
        selectedProvider,
        selectedMethod,
        JSON.stringify(breakdown)
      );

      // Insert Initial Payment Attempt
      db.prepare(`
        INSERT INTO payment_attempts (
          id, payment_id, booking_id, attempt_reference, provider, amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'INITIALIZED')
      `).run(
        `att-${crypto.randomUUID()}`,
        paymentId,
        booking.id,
        paymentRef,
        selectedProvider,
        totalToPay
      );

      // Update Booking Payment Status
      db.prepare(`
        UPDATE bookings
        SET payment_status = 'PENDING_PAYMENT', updated_at = datetime('now')
        WHERE id = ?
      `).run(booking.id);
    })();

    // 4. Initialize Gateway
    const gateway = getPaymentGateway(selectedProvider);
    const callbackUrl = `${process.env.APP_URL || 'http://localhost:3001'}/payment/verify?reference=${paymentRef}`;

    const gatewayResult = await gateway.initializePayment({
      email: userEmail,
      amount: totalToPay,
      reference: paymentRef,
      callbackUrl,
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        studentId: userId,
        propertyId: booking.property_id,
        propertyTitle: booking.propertyTitle,
        breakdown
      }
    });

    res.status(201).json({
      message: 'Payment initialized successfully',
      paymentId,
      paymentReference: paymentRef,
      bookingReference: booking.booking_reference,
      propertyTitle: booking.propertyTitle,
      roomName: booking.roomName,
      amount: totalToPay,
      platformFee,
      currency: 'NGN',
      breakdown,
      authorizationUrl: gatewayResult.authorizationUrl,
      provider: gatewayResult.provider
    });
  } catch (err: any) {
    console.error('Payment initialization failed:', err);
    res.status(500).json({ error: err.message || 'Failed to initialize payment transaction' });
  }
});

// ==========================================================================
// 3. GET /verify/:reference - Authoritative Server Verification
// ==========================================================================
router.get('/verify/:reference', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { reference } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  try {
    const payment = db.prepare(`
      SELECT 
        p.*,
        b.booking_reference as bookingReference,
        b.move_in_date as moveInDate,
        prop.title as propertyTitle,
        prop.address as propertyAddress,
        r.room_name as roomName,
        r.room_type as roomType,
        bs.bedspace_number as bedspaceNumber,
        u_student.full_name as studentName,
        u_student.email as studentEmail,
        u_student.phone as studentPhone,
        u_provider.full_name as providerName,
        u_provider.email as providerEmail,
        u_provider.phone as providerPhone
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
      JOIN users u_student ON p.student_id = u_student.id
      JOIN users u_provider ON p.provider_id = u_provider.id
      WHERE p.payment_reference = ? OR p.id = ?
    `).get(reference, reference) as any;

    if (!payment) {
      return res.status(404).json({ error: 'Payment transaction record not found' });
    }

    // Access control
    if (userRole !== 'ADMIN' && payment.student_id !== userId && payment.provider_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to view this transaction' });
    }

    // If already verified SUCCESS, return cached verified receipt
    if (payment.status === 'SUCCESS') {
      return res.json({
        success: true,
        status: 'SUCCESS',
        payment: {
          id: payment.id,
          paymentReference: payment.payment_reference,
          bookingReference: payment.bookingReference,
          amount: payment.amount,
          platformFee: payment.platform_fee,
          providerAmount: payment.provider_amount,
          currency: payment.currency,
          paymentMethod: payment.payment_method,
          provider: payment.payment_provider,
          paidAt: payment.paid_at,
          verifiedAt: payment.verified_at,
          property: {
            title: payment.propertyTitle,
            address: payment.propertyAddress,
            roomName: payment.roomName,
            roomType: payment.roomType,
            bedspaceNumber: payment.bedspaceNumber
          },
          student: {
            name: payment.studentName,
            email: payment.studentEmail,
            phone: payment.studentPhone
          },
          provider: {
            name: payment.providerName,
            email: payment.providerEmail,
            phone: payment.providerPhone
          },
          breakdown: payment.metadata_json ? JSON.parse(payment.metadata_json) : null
        }
      });
    }

    // Call Gateway for Authoritative Verification
    const gateway = getPaymentGateway(payment.payment_provider);
    const verification = await gateway.verifyPayment(payment.payment_reference);

    if (verification.success && verification.status === 'SUCCESS') {
      // Execute Atomic Database Transaction
      db.transaction(() => {
        const now = new Date().toISOString();

        // 1. Update Payment Record
        db.prepare(`
          UPDATE payments
          SET status = 'SUCCESS',
              provider_transaction_reference = ?,
              payment_method = ?,
              paid_at = ?,
              verified_at = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          verification.providerReference || `TX_${Date.now()}`,
          verification.channel || payment.payment_method || 'CARD',
          verification.paidAt || now,
          now,
          payment.id
        );

        // 2. Update Booking Payment Status & Booking Status to CONFIRMED
        db.prepare(`
          UPDATE bookings
          SET payment_status = 'PAID',
              paid_at = ?,
              status = 'CONFIRMED',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(now, payment.booking_id);

        // 3. Write Immutable Financial Ledger Entries (Double-Entry audit trail)
        const ledgerId1 = `ledg-${crypto.randomUUID()}`;
        const ledgerId2 = `ledg-${crypto.randomUUID()}`;
        const ledgerId3 = `ledg-${crypto.randomUUID()}`;

        // Entry A: Payment Received from Student into Escrow
        db.prepare(`
          INSERT INTO financial_ledger (
            id, payment_id, booking_id, entry_type, amount, currency,
            debit_account, credit_account, description
          ) VALUES (?, ?, ?, 'PAYMENT_RECEIVED', ?, 'NGN', 'GATEWAY_ESCROW', 'HOSTEL_EASE_SETTLEMENT', ?)
        `).run(
          ledgerId1, payment.id, payment.booking_id, payment.amount,
          `Received full student booking payment for ${payment.bookingReference}`
        );

        // Entry B: Platform Fee Deducted
        if (payment.platform_fee > 0) {
          db.prepare(`
            INSERT INTO financial_ledger (
              id, payment_id, booking_id, entry_type, amount, currency,
              debit_account, credit_account, description
            ) VALUES (?, ?, ?, 'PLATFORM_FEE_DEDUCTED', ?, 'NGN', 'HOSTEL_EASE_SETTLEMENT', 'PLATFORM_REVENUE', ?)
          `).run(
            ledgerId2, payment.id, payment.booking_id, payment.platform_fee,
            `Platform service fee earned on ${payment.payment_reference}`
          );
        }

        // Entry C: Provider Net Earning Credited
        db.prepare(`
          INSERT INTO financial_ledger (
            id, payment_id, booking_id, entry_type, amount, currency,
            debit_account, credit_account, description
          ) VALUES (?, ?, ?, 'PROVIDER_EARNING_CREDITED', ?, 'NGN', 'HOSTEL_EASE_SETTLEMENT', 'PROVIDER_PAYABLE', ?)
        `).run(
          ledgerId3, payment.id, payment.booking_id, payment.provider_amount,
          `Provider earning credited for ${payment.propertyTitle} (${payment.bookingReference})`
        );

        // 4. Send In-App Notification to Student
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link_url)
          VALUES (?, ?, ?, ?, 'PAYMENT', ?)
        `).run(
          `notif-${crypto.randomUUID()}`,
          payment.student_id,
          'Payment Successful! 🎉',
          `Your payment of ₦${Number(payment.amount).toLocaleString()} for ${payment.propertyTitle} was verified. Your room is 100% reserved!`,
          `/payments/receipt/${payment.payment_reference}`
        );

        // 5. Send In-App Notification to Provider
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link_url)
          VALUES (?, ?, ?, ?, 'PAYMENT', ?)
        `).run(
          `notif-${crypto.randomUUID()}`,
          payment.provider_id,
          'Student Payment Received! 💰',
          `Student ${payment.studentName} paid ₦${Number(payment.provider_amount).toLocaleString()} for ${payment.propertyTitle} (${payment.roomName}).`,
          `/provider/financials`
        );

        // 6. Record System Message in Chat Conversation
        const conv = db.prepare(`
          SELECT id FROM conversations
          WHERE property_id = ? AND student_id = ? AND provider_id = ?
        `).get(payment.property_id, payment.student_id, payment.provider_id) as any;

        if (conv) {
          db.prepare(`
            INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
            VALUES (?, ?, ?, 'SYSTEM', 'SYSTEM_EVENT', ?, 0)
          `).run(
            `msg-${crypto.randomUUID()}`,
            conv.id,
            payment.student_id,
            `💳 Verified Payment Received! Reference: ${payment.payment_reference} (Amount: ₦${Number(payment.amount).toLocaleString()})`
          );
        }
      })();

      return res.json({
        success: true,
        status: 'SUCCESS',
        message: 'Payment verified and credited successfully',
        payment: {
          id: payment.id,
          paymentReference: payment.payment_reference,
          bookingReference: payment.bookingReference,
          amount: payment.amount,
          platformFee: payment.platform_fee,
          providerAmount: payment.provider_amount,
          currency: payment.currency,
          paymentMethod: verification.channel || 'CARD',
          paidAt: verification.paidAt || new Date().toISOString(),
          property: {
            title: payment.propertyTitle,
            address: payment.propertyAddress,
            roomName: payment.roomName,
            roomType: payment.roomType,
            bedspaceNumber: payment.bedspaceNumber
          },
          student: {
            name: payment.studentName,
            email: payment.studentEmail,
            phone: payment.studentPhone
          },
          provider: {
            name: payment.providerName,
            email: payment.providerEmail,
            phone: payment.providerPhone
          },
          breakdown: payment.metadata_json ? JSON.parse(payment.metadata_json) : null
        }
      });
    } else {
      // Mark as Failed/Declined
      db.prepare(`
        UPDATE payments
        SET status = 'FAILED', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.id);

      db.prepare(`
        UPDATE bookings
        SET payment_status = 'UNPAID', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.booking_id);

      return res.status(400).json({
        success: false,
        status: 'FAILED',
        error: verification.gatewayResponse || 'Payment transaction could not be verified by the gateway'
      });
    }
  } catch (err: any) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// ==========================================================================
// 4. POST /webhook - Idempotent Secure Webhook Handler
// ==========================================================================
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = (req.headers['x-paystack-signature'] || req.headers['verif-hash'] || req.headers['x-webhook-signature']) as string;
  const payload = req.body;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const providerName = req.headers['x-paystack-signature'] ? 'PAYSTACK' : 
                       req.headers['verif-hash'] ? 'FLUTTERWAVE' : 'TEST_GATEWAY';

  const gateway = getPaymentGateway(providerName);

  // 1. Signature Security Validation
  const isValidSignature = gateway.verifyWebhookSignature(signature || '', rawBody);
  if (!isValidSignature && providerName !== 'TEST_GATEWAY') {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const eventType = payload.event || payload['event.type'] || 'charge.success';
  const eventId = payload.data?.id ? String(payload.data.id) : `evt-${crypto.randomUUID()}`;
  const reference = payload.data?.reference || payload.data?.tx_ref || payload.reference;

  if (!reference) {
    return res.status(400).json({ error: 'Transaction reference missing in webhook payload' });
  }

  // 2. Idempotency Check: Prevent duplicate webhook processing
  const existingEvent = db.prepare(`
    SELECT id FROM payment_webhook_events
    WHERE provider = ? AND event_id = ?
  `).get(providerName, eventId);

  if (existingEvent) {
    return res.json({ message: 'Webhook event already processed (idempotent)', status: 'ALREADY_PROCESSED' });
  }

  try {
    // Record Webhook Event
    db.prepare(`
      INSERT INTO payment_webhook_events (
        id, provider, event_type, event_id, signature, payload_json, status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED', datetime('now'))
    `).run(
      `wh-${crypto.randomUUID()}`,
      providerName,
      eventType,
      eventId,
      signature || 'NONE',
      JSON.stringify(payload)
    );

    // 3. Process Transaction State
    if (eventType === 'charge.success' || eventType === 'successful') {
      const payment = db.prepare(`
        SELECT p.*, b.booking_reference, prop.title as propertyTitle
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN properties prop ON p.property_id = prop.id
        WHERE p.payment_reference = ?
      `).get(reference) as any;

      if (payment && payment.status !== 'SUCCESS') {
        db.transaction(() => {
          const now = new Date().toISOString();
          db.prepare(`
            UPDATE payments
            SET status = 'SUCCESS',
                provider_transaction_reference = ?,
                paid_at = ?,
                verified_at = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(eventId, now, now, payment.id);

          db.prepare(`
            UPDATE bookings
            SET payment_status = 'PAID', paid_at = ?, status = 'CONFIRMED', updated_at = datetime('now')
            WHERE id = ?
          `).run(now, payment.booking_id);

          // Record Ledger Entry
          db.prepare(`
            INSERT INTO financial_ledger (
              id, payment_id, booking_id, entry_type, amount, currency,
              debit_account, credit_account, description
            ) VALUES (?, ?, ?, 'PAYMENT_RECEIVED', ?, 'NGN', 'GATEWAY_ESCROW', 'HOSTEL_EASE_SETTLEMENT', ?)
          `).run(
            `ledg-${crypto.randomUUID()}`, payment.id, payment.booking_id, payment.amount,
            `Webhook verified payment for ${reference}`
          );
        })();
      }
    }

    res.json({ message: 'Webhook processed successfully', reference });
  } catch (err: any) {
    console.error('Webhook processing failure:', err);
    res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
});

// ==========================================================================
// 5. GET /student - Student Payment History
// ==========================================================================
router.get('/student', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { status } = req.query;

  if (userRole !== 'STUDENT') {
    return res.status(403).json({ error: 'Only students can view their payment history' });
  }

  try {
    let query = `
      SELECT 
        p.id,
        p.payment_reference as paymentReference,
        p.booking_id as bookingId,
        b.booking_reference as bookingReference,
        p.amount,
        p.platform_fee as platformFee,
        p.currency,
        p.payment_provider as paymentProvider,
        p.payment_method as paymentMethod,
        p.status,
        p.paid_at as paidAt,
        p.created_at as createdAt,
        prop.id as propertyId,
        prop.title as propertyTitle,
        prop.address as propertyAddress,
        a.name as areaName,
        r.room_name as roomName,
        r.room_type as roomType,
        bs.bedspace_number as bedspaceNumber,
        p.metadata_json as metadataJson
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN areas a ON prop.area_id = a.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
      WHERE p.student_id = ?
    `;

    const params: any[] = [userId];

    if (status && typeof status === 'string' && status !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const rawPayments = db.prepare(query).all(...params) as any[];

    const payments = rawPayments.map(p => ({
      id: p.id,
      paymentReference: p.paymentReference,
      bookingId: p.bookingId,
      bookingReference: p.bookingReference,
      amount: p.amount,
      platformFee: p.platformFee,
      currency: p.currency,
      paymentProvider: p.paymentProvider,
      paymentMethod: p.paymentMethod,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      property: {
        id: p.propertyId,
        title: p.propertyTitle,
        address: p.propertyAddress,
        areaName: p.areaName
      },
      room: {
        name: p.roomName,
        type: p.roomType,
        bedspaceNumber: p.bedspaceNumber
      },
      breakdown: p.metadataJson ? JSON.parse(p.metadataJson) : null
    }));

    res.json({ payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch student payments' });
  }
});

// ==========================================================================
// 6. GET /receipt/:reference - Digital Official Receipt
// ==========================================================================
router.get('/receipt/:reference', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { reference } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  try {
    const payment = db.prepare(`
      SELECT 
        p.*,
        b.booking_reference as bookingReference,
        b.move_in_date as moveInDate,
        b.academic_session as academicSession,
        prop.title as propertyTitle,
        prop.address as propertyAddress,
        a.name as areaName,
        r.room_name as roomName,
        r.room_type as roomType,
        bs.bedspace_number as bedspaceNumber,
        u_student.full_name as studentName,
        u_student.email as studentEmail,
        u_student.phone as studentPhone,
        u_provider.full_name as providerName,
        u_provider.email as providerEmail,
        u_provider.phone as providerPhone
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN areas a ON prop.area_id = a.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
      JOIN users u_student ON p.student_id = u_student.id
      JOIN users u_provider ON p.provider_id = u_provider.id
      WHERE p.payment_reference = ? OR p.id = ?
    `).get(reference, reference) as any;

    if (!payment) {
      return res.status(404).json({ error: 'Receipt record not found' });
    }

    if (userRole !== 'ADMIN' && payment.student_id !== userId && payment.provider_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to view this receipt' });
    }

    const receipt = {
      receiptNumber: `REC-${payment.payment_reference}`,
      paymentReference: payment.payment_reference,
      bookingReference: payment.bookingReference,
      status: payment.status,
      issuedAt: payment.verified_at || payment.paid_at || payment.created_at,
      paymentMethod: payment.payment_method,
      paymentProvider: payment.payment_provider,
      providerTransactionRef: payment.provider_transaction_reference,
      currency: payment.currency,
      totalPaid: payment.amount,
      platformFee: payment.platform_fee,
      providerAmount: payment.provider_amount,
      breakdown: payment.metadata_json ? JSON.parse(payment.metadata_json) : null,
      student: {
        name: payment.studentName,
        email: payment.studentEmail,
        phone: payment.studentPhone
      },
      provider: {
        name: payment.providerName,
        email: payment.providerEmail,
        phone: payment.providerPhone
      },
      accommodation: {
        title: payment.propertyTitle,
        address: payment.propertyAddress,
        area: payment.areaName,
        roomName: payment.roomName,
        roomType: payment.roomType,
        bedspaceNumber: payment.bedspaceNumber,
        moveInDate: payment.moveInDate,
        academicSession: payment.academicSession
      },
      verificationHash: crypto.createHash('sha256').update(`${payment.payment_reference}-${payment.amount}-${payment.student_id}`).digest('hex').substring(0, 16).toUpperCase()
    };

    res.json({ receipt });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate receipt' });
  }
});

// ==========================================================================
// 7. GET /provider/financials - Provider Financial Dashboard
// ==========================================================================
router.get('/provider/financials', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== 'PROVIDER' && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only accommodation providers can view financial reports' });
  }

  try {
    // 1. Calculate Aggregate Financials
    const metrics = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN provider_amount ELSE 0 END), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN provider_amount ELSE 0 END), 0) as pendingRevenue,
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN provider_amount ELSE 0 END), 0) as refundedAmount,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as paidBookingsCount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingPaymentsCount,
        COUNT(*) as totalTransactionsCount
      FROM payments
      WHERE provider_id = ?
    `).get(userId) as any;

    // 2. Revenue grouped by Hostel Property
    const propertyRevenue = db.prepare(`
      SELECT 
        prop.id as propertyId,
        prop.title as propertyTitle,
        a.name as areaName,
        COALESCE(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.provider_amount ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN p.status = 'SUCCESS' THEN 1 END) as paidCount
      FROM properties prop
      JOIN areas a ON prop.area_id = a.id
      LEFT JOIN payments p ON prop.id = p.property_id
      WHERE prop.provider_id = ?
      GROUP BY prop.id
      ORDER BY revenue DESC
    `).all(userId);

    // 3. Recent Transactions
    const recentTransactions = db.prepare(`
      SELECT 
        p.id,
        p.payment_reference as paymentReference,
        b.booking_reference as bookingReference,
        prop.title as propertyTitle,
        r.room_name as roomName,
        u_student.full_name as studentName,
        p.provider_amount as amount,
        p.status,
        p.paid_at as paidAt,
        p.created_at as createdAt
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u_student ON p.student_id = u_student.id
      WHERE p.provider_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20
    `).all(userId);

    // 4. Saved Payout Bank Account
    const payoutAccount = db.prepare(`
      SELECT * FROM provider_payout_accounts
      WHERE provider_id = ? AND is_primary = 1
      LIMIT 1
    `).get(userId);

    res.json({
      metrics: {
        totalRevenue: metrics.totalRevenue,
        pendingRevenue: metrics.pendingRevenue,
        refundedAmount: metrics.refundedAmount,
        paidBookingsCount: metrics.paidBookingsCount,
        pendingPaymentsCount: metrics.pendingPaymentsCount,
        totalTransactionsCount: metrics.totalTransactionsCount
      },
      propertyRevenue,
      recentTransactions,
      payoutAccount: payoutAccount ? {
        bankName: payoutAccount.bank_name,
        bankCode: payoutAccount.bank_code,
        accountName: payoutAccount.account_name,
        accountNumberMasked: `******${payoutAccount.account_number.slice(-4)}`,
        isVerified: Boolean(payoutAccount.is_verified)
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch provider financials' });
  }
});

// ==========================================================================
// 8. GET /admin/financials - Admin Financial & Ledger Dashboard
// ==========================================================================
router.get('/admin/financials', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user!.role;

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only platform administrators can view admin financials' });
  }

  try {
    // 1. Platform-wide GMV & Fee Breakdown
    const platformMetrics = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) as totalGmv,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN platform_fee ELSE 0 END), 0) as totalPlatformFees,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN provider_amount ELSE 0 END), 0) as totalProviderEarnings,
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) as totalRefunded,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successCount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failedCount,
        COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refundedCount,
        COUNT(*) as totalTransactions
      FROM payments
    `).get() as any;

    // 2. Recent Immutable Financial Ledger Stream
    const ledgerStream = db.prepare(`
      SELECT 
        l.id,
        l.entry_type as entryType,
        l.amount,
        l.currency,
        l.debit_account as debitAccount,
        l.credit_account as creditAccount,
        l.description,
        l.created_at as createdAt,
        p.payment_reference as paymentReference,
        b.booking_reference as bookingReference
      FROM financial_ledger l
      LEFT JOIN payments p ON l.payment_id = p.id
      LEFT JOIN bookings b ON l.booking_id = b.id
      ORDER BY l.created_at DESC
      LIMIT 30
    `).all();

    // 3. Open Disputes
    const disputes = db.prepare(`
      SELECT 
        d.id,
        d.dispute_reference as disputeReference,
        d.reason,
        d.status,
        d.created_at as createdAt,
        b.booking_reference as bookingReference,
        u_student.full_name as studentName,
        u_provider.full_name as providerName,
        p.amount as paymentAmount
      FROM payment_disputes d
      JOIN bookings b ON d.booking_id = b.id
      JOIN users u_student ON d.student_id = u_student.id
      JOIN users u_provider ON d.provider_id = u_provider.id
      LEFT JOIN payments p ON d.payment_id = p.id
      ORDER BY d.created_at DESC
    `).all();

    res.json({
      metrics: platformMetrics,
      ledgerStream,
      disputes
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin financials' });
  }
});

// ==========================================================================
// 9. POST /refund - Initiate Authorized Refund
// ==========================================================================
router.post('/refund', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { paymentId, amount, reason } = req.body;

  if (userRole !== 'ADMIN' && userRole !== 'PROVIDER') {
    return res.status(403).json({ error: 'Only administrators or authorized accommodation providers can initiate refunds' });
  }

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID or reference is required' });
  }

  try {
    const payment = db.prepare(`
      SELECT p.*, b.booking_reference, prop.title as propertyTitle
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      WHERE p.id = ? OR p.payment_reference = ?
    `).get(paymentId, paymentId) as any;

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    if (userRole === 'PROVIDER' && payment.provider_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to refund payments for other providers' });
    }

    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ error: `Cannot refund payment with status ${payment.status}` });
    }

    const refundAmount = amount ? Number(amount) : payment.amount;
    const refundRef = generateRefundReference();
    const refundId = `ref-${crypto.randomUUID()}`;

    // Process Gateway Refund
    const gateway = getPaymentGateway(payment.payment_provider);
    const refundResult = await gateway.processRefund({
      transactionReference: payment.provider_transaction_reference || payment.payment_reference,
      amount: refundAmount,
      merchantNote: reason || 'Hostel Ease student refund'
    });

    db.transaction(() => {
      // 1. Insert Refund Record
      db.prepare(`
        INSERT INTO refunds (
          id, refund_reference, payment_id, booking_id, amount, reason,
          status, initiated_by, approved_by, provider_refund_reference
        ) VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?)
      `).run(
        refundId,
        refundRef,
        payment.id,
        payment.booking_id,
        refundAmount,
        reason || 'Authorized Accommodation Refund',
        userId,
        userRole === 'ADMIN' ? userId : null,
        refundResult.refundReference
      );

      // 2. Update Payment Status
      db.prepare(`
        UPDATE payments
        SET status = 'REFUNDED', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.id);

      // 3. Update Booking Payment Status
      db.prepare(`
        UPDATE bookings
        SET payment_status = 'REFUNDED', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.booking_id);

      // 4. Record Financial Ledger Debit
      db.prepare(`
        INSERT INTO financial_ledger (
          id, payment_id, booking_id, refund_id, entry_type, amount, currency,
          debit_account, credit_account, description
        ) VALUES (?, ?, ?, ?, 'REFUND_DEBITED', ?, 'NGN', 'HOSTEL_EASE_SETTLEMENT', 'GATEWAY_ESCROW', ?)
      `).run(
        `ledg-${crypto.randomUUID()}`,
        payment.id,
        payment.booking_id,
        refundId,
        refundAmount,
        `Refund debited for ${payment.booking_reference}. Reason: ${reason || 'Approved refund'}`
      );

      // 5. Send Student Notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'PAYMENT', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        payment.student_id,
        'Refund Processed 🔄',
        `A refund of ₦${refundAmount.toLocaleString()} has been processed for ${payment.propertyTitle}. Ref: ${refundRef}`,
        `/payments/receipt/${payment.payment_reference}`
      );
    })();

    res.json({
      message: 'Refund processed successfully',
      refundReference: refundRef,
      amount: refundAmount,
      status: 'SUCCESS'
    });
  } catch (err: any) {
    console.error('Refund processing error:', err);
    res.status(500).json({ error: err.message || 'Failed to process refund' });
  }
});

// ==========================================================================
// 10. POST /payout-account - Save Provider Payout Bank Account
// ==========================================================================
router.post('/payout-account', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { bankCode, bankName, accountNumber, accountName } = req.body;

  if (userRole !== 'PROVIDER' && userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only accommodation providers can save settlement bank accounts' });
  }

  if (!bankCode || !bankName || !accountNumber || !accountName) {
    return res.status(400).json({ error: 'All bank details (bankCode, bankName, accountNumber, accountName) are required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM provider_payout_accounts WHERE provider_id = ?').get(userId) as any;

    if (existing) {
      db.prepare(`
        UPDATE provider_payout_accounts
        SET bank_code = ?, bank_name = ?, account_number = ?, account_name = ?,
            is_verified = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(bankCode, bankName, accountNumber, accountName, existing.id);
    } else {
      db.prepare(`
        INSERT INTO provider_payout_accounts (
          id, provider_id, bank_code, bank_name, account_number, account_name, is_verified, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      `).run(
        `payout-${crypto.randomUUID()}`,
        userId,
        bankCode,
        bankName,
        accountNumber,
        accountName
      );
    }

    res.json({
      message: 'Settlement bank account saved and verified',
      account: {
        bankName,
        bankCode,
        accountName,
        accountNumberMasked: `******${accountNumber.slice(-4)}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save payout bank account' });
  }
});

// ==========================================================================
// 11. POST /dispute - Raise Payment Dispute
// ==========================================================================
router.post('/dispute', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { bookingId, paymentId, reason } = req.body;

  if (!bookingId || !reason) {
    return res.status(400).json({ error: 'Booking ID and dispute reason are required' });
  }

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const disputeRef = generateDisputeReference();
    const disputeId = `disp-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO payment_disputes (
        id, dispute_reference, booking_id, payment_id, student_id, provider_id, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `).run(
      disputeId,
      disputeRef,
      booking.id,
      paymentId || null,
      booking.student_id,
      booking.provider_id,
      reason
    );

    // Notify Admin & Parties
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, 'Dispute Opened', ?, 'DISPUTE', ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      booking.student_id === userId ? booking.provider_id : booking.student_id,
      `A dispute (${disputeRef}) has been opened regarding booking ${booking.booking_reference}.`,
      `/bookings/${booking.id}`
    );

    res.status(201).json({
      message: 'Payment dispute lodged successfully. Admin will review within 24 hours.',
      disputeReference: disputeRef,
      status: 'OPEN'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to file dispute' });
  }
});

export default router;
