import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect ALL revenue endpoints with strict ADMIN authentication
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Helper for date formatting
function getStartOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// =============================================================================
// 1. GET /api/admin/revenue/overview — Comprehensive Owner Revenue Telemetry
// =============================================================================
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  try {
    const startOfMonth = getStartOfMonthISO();

    // 1. Booking Commissions & Platform Fees
    const bookingRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) as totalGmv,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN platform_fee ELSE 0 END), 0) as totalPlatformFee,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN provider_amount ELSE 0 END), 0) as totalProviderAmount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pendingGmv,
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) as totalRefunded,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successBookingsCount,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' AND created_at >= ? THEN platform_fee ELSE 0 END), 0) as thisMonthCommission
      FROM payments
    `).get(startOfMonth) as any;

    // 2. Provider Subscriptions Revenue
    const subRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN amount ELSE 0 END), 0) as totalSubscriptions,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as activeSubscribersCount,
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' AND created_at >= ? THEN amount ELSE 0 END), 0) as thisMonthSubscriptions
      FROM provider_subscriptions
    `).get(startOfMonth) as any;

    // 3. Featured Listings Revenue
    const featRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN amount ELSE 0 END), 0) as totalFeatured,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as activeFeaturedCount,
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' AND created_at >= ? THEN amount ELSE 0 END), 0) as thisMonthFeatured
      FROM featured_listings
    `).get(startOfMonth) as any;

    // 4. Provider Digital Services Revenue
    const servRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as totalServices,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedServicesCount,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND created_at >= ? THEN amount ELSE 0 END), 0) as thisMonthServices
      FROM provider_digital_services
    `).get(startOfMonth) as any;

    // 5. Payouts and Pending Disbursements
    const payoutRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as totalDisbursed,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pendingPayouts,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingPayoutsCount
      FROM payout_requests
    `).get() as any;

    // 6. Platform Owner Withdrawals
    const withdrawalRev = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as totalOwnerWithdrawn,
        COUNT(*) as totalWithdrawalsCount
      FROM platform_withdrawals
    `).get() as any;

    // Financial Totals Calculation
    const totalBookingCommission = Number(bookingRev.totalPlatformFee) || 0;
    const totalSubscriptions = Number(subRev.totalSubscriptions) || 0;
    const totalFeatured = Number(featRev.totalFeatured) || 0;
    const totalServices = Number(servRev.totalServices) || 0;
    const totalRefunds = Number(bookingRev.totalRefunded) || 0;

    // Total Platform Revenue earned across all 4 monetization streams
    const totalGrossRevenue = totalBookingCommission + totalSubscriptions + totalFeatured + totalServices;
    const netPlatformRevenue = Math.max(0, totalGrossRevenue - totalRefunds);

    const thisMonthRevenue = (Number(bookingRev.thisMonthCommission) || 0) +
                             (Number(subRev.thisMonthSubscriptions) || 0) +
                             (Number(featRev.thisMonthFeatured) || 0) +
                             (Number(servRev.thisMonthServices) || 0);

    // 7. Area Revenue Distribution (Under G, Adenike, Stadium, Aroje, etc.)
    const areaRevenue = db.prepare(`
      SELECT 
        a.name as areaName,
        a.slug as areaSlug,
        COUNT(p.id) as paymentsCount,
        COALESCE(SUM(p.amount), 0) as grossAmount,
        COALESCE(SUM(p.platform_fee), 0) as commissionEarned
      FROM areas a
      JOIN properties prop ON a.id = prop.area_id
      JOIN payments p ON prop.id = p.property_id
      WHERE p.status = 'SUCCESS'
      GROUP BY a.id
      ORDER BY grossAmount DESC
    `).all();

    // 8. Monthly Revenue Growth History (Last 6 months)
    const monthlyHistory = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COALESCE(SUM(platform_fee), 0) as bookingCommission,
        COALESCE(SUM(amount), 0) as grossTransactionVolume,
        COUNT(*) as transactionsCount
      FROM payments
      WHERE status = 'SUCCESS'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all();

    res.json({
      success: true,
      ownerRevenue: {
        totalGrossRevenue,
        bookingCommission: totalBookingCommission,
        providerSubscriptions: totalSubscriptions,
        featuredListings: totalFeatured,
        digitalServices: totalServices,
        refunds: totalRefunds,
        netPlatformRevenue
      },
      dashboardSummary: {
        totalRevenue: totalGrossRevenue,
        thisMonth: thisMonthRevenue,
        pendingRevenue: Number(bookingRev.pendingGmv) || 0,
        successfulBookings: Number(bookingRev.successBookingsCount) || 0,
        providerRevenue: Number(bookingRev.totalProviderAmount) || 0,
        platformCommission: totalBookingCommission,
        activeSubscribers: Number(subRev.activeSubscribersCount) || 0,
        activeFeatured: Number(featRev.activeFeaturedCount) || 0,
        completedServices: Number(servRev.completedServicesCount) || 0,
        pendingPayouts: Number(payoutRev.pendingPayouts) || 0,
        pendingPayoutsCount: Number(payoutRev.pendingPayoutsCount) || 0,
        totalOwnerWithdrawn: Number(withdrawalRev.totalOwnerWithdrawn) || 0
      },
      streams: [
        { name: 'Booking Commissions', amount: totalBookingCommission, percentage: totalGrossRevenue > 0 ? Math.round((totalBookingCommission / totalGrossRevenue) * 100) : 0, color: '#10B981', icon: 'Receipt' },
        { name: 'Provider Subscriptions', amount: totalSubscriptions, percentage: totalGrossRevenue > 0 ? Math.round((totalSubscriptions / totalGrossRevenue) * 100) : 0, color: '#3B82F6', icon: 'ShieldCheck' },
        { name: 'Featured Listings', amount: totalFeatured, percentage: totalGrossRevenue > 0 ? Math.round((totalFeatured / totalGrossRevenue) * 100) : 0, color: '#F59E0B', icon: 'Sparkles' },
        { name: 'Digital & Media Services', amount: totalServices, percentage: totalGrossRevenue > 0 ? Math.round((totalServices / totalGrossRevenue) * 100) : 0, color: '#8B5CF6', icon: 'Camera' }
      ],
      areaRevenue,
      monthlyHistory
    });
  } catch (err: any) {
    console.error('Admin revenue overview error:', err);
    res.status(500).json({ error: 'Failed to generate revenue overview: ' + err.message });
  }
});

// =============================================================================
// 2. GET /api/admin/revenue/transactions — All Platform Payments & Inflow
// =============================================================================
router.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const { status, paymentMethod, search, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT 
        p.*,
        b.booking_reference as bookingReference,
        b.move_in_date as moveInDate,
        prop.title as propertyTitle,
        prop.address as propertyAddress,
        r.room_name as roomName,
        u_student.full_name as studentName,
        u_student.email as studentEmail,
        u_student.phone as studentPhone,
        u_prov.full_name as providerName,
        u_prov.email as providerEmail,
        u_prov.phone as providerPhone
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u_student ON p.student_id = u_student.id
      JOIN users u_prov ON p.provider_id = u_prov.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      sql += ' AND p.payment_method = ?';
      params.push(paymentMethod);
    }

    if (search) {
      sql += ` AND (p.payment_reference LIKE ? OR b.booking_reference LIKE ? OR u_student.full_name LIKE ? OR prop.title LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(sql).all(...params);
    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM payments').get() as any)?.count || 0;

    res.json({
      success: true,
      totalCount,
      transactions
    });
  } catch (err: any) {
    console.error('Admin transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions: ' + err.message });
  }
});

// =============================================================================
// 3. GET /api/admin/revenue/commissions — Booking Commission Breakdown
// =============================================================================
router.get('/commissions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const commissions = db.prepare(`
      SELECT 
        p.id as paymentId,
        p.payment_reference as paymentReference,
        p.amount as grossRentPaid,
        p.platform_fee as commissionEarned,
        p.provider_amount as providerNet,
        p.status,
        p.paid_at as paidAt,
        p.created_at as createdAt,
        b.booking_reference as bookingReference,
        prop.title as hostelTitle,
        a.name as areaName,
        u_student.full_name as studentName,
        u_prov.full_name as providerName,
        ROUND((p.platform_fee / p.amount) * 100, 1) as commissionRatePercent
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN areas a ON prop.area_id = a.id
      JOIN users u_student ON p.student_id = u_student.id
      JOIN users u_prov ON p.provider_id = u_prov.id
      WHERE p.status = 'SUCCESS'
      ORDER BY p.paid_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(platform_fee), 0) as totalCommissionsEarned,
        COALESCE(SUM(amount), 0) as totalGrossProcessed,
        COALESCE(AVG(platform_fee), 0) as avgCommissionPerBooking,
        COUNT(*) as totalCommissionedBookings
      FROM payments
      WHERE status = 'SUCCESS'
    `).get() as any;

    res.json({
      success: true,
      summary,
      commissions
    });
  } catch (err: any) {
    console.error('Admin commissions error:', err);
    res.status(500).json({ error: 'Failed to retrieve commissions: ' + err.message });
  }
});

// =============================================================================
// 4. GET /api/admin/revenue/subscriptions — Provider Subscription Plans
// =============================================================================
router.get('/subscriptions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriptions = db.prepare(`
      SELECT 
        s.*,
        u.full_name as providerName,
        u.email as providerEmail,
        u.phone as providerPhone,
        pp.business_name as businessName
      FROM provider_subscriptions s
      JOIN users u ON s.provider_id = u.id
      LEFT JOIN provider_profiles pp ON u.id = pp.user_id
      ORDER BY s.created_at DESC
    `).all();

    const plans = [
      {
        id: 'STARTER',
        name: 'Starter Landlord',
        price: 0,
        billingCycle: 'FREE',
        maxListings: 2,
        features: ['Up to 2 lodge listings', 'Standard student inquiry chat', 'Basic verification badge']
      },
      {
        id: 'PRO_LANDLORD',
        name: 'Pro Landlord',
        price: 15000,
        billingCycle: 'MONTHLY',
        maxListings: 10,
        features: ['Up to 10 lodge listings', 'Priority search placement in Under G / Adenike', 'Instant WhatsApp lead forwarding', 'Real-time occupancy analytics']
      },
      {
        id: 'ENTERPRISE_ESTATE',
        name: 'Enterprise Estate',
        price: 45000,
        billingCycle: 'ANNUAL',
        maxListings: 50,
        features: ['Unlimited hostels & room bedspaces', 'Multi-caretaker access accounts', 'Direct SMS blast to searching students', 'Free professional photography sessions']
      }
    ];

    res.json({
      success: true,
      plans,
      subscriptions
    });
  } catch (err: any) {
    console.error('Admin subscriptions error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscriptions: ' + err.message });
  }
});

// =============================================================================
// 5. GET /api/admin/revenue/featured-listings — Promoted Hostels
// =============================================================================
router.get('/featured-listings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const featured = db.prepare(`
      SELECT 
        f.*,
        prop.title as propertyTitle,
        prop.address as propertyAddress,
        prop.slug as propertySlug,
        a.name as areaName,
        u.full_name as providerName,
        u.phone as providerPhone
      FROM featured_listings f
      JOIN properties prop ON f.property_id = prop.id
      JOIN areas a ON prop.area_id = a.id
      JOIN users u ON f.provider_id = u.id
      ORDER BY f.created_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalRevenue,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as activeCount,
        COALESCE(SUM(impressions_count), 0) as totalImpressions,
        COALESCE(SUM(clicks_count), 0) as totalClicks
      FROM featured_listings
    `).get() as any;

    res.json({
      success: true,
      summary,
      featured
    });
  } catch (err: any) {
    console.error('Admin featured listings error:', err);
    res.status(500).json({ error: 'Failed to retrieve featured listings: ' + err.message });
  }
});

// =============================================================================
// 6. GET & PATCH /api/admin/revenue/provider-services — Digital Services
// =============================================================================
router.get('/provider-services', (req: AuthenticatedRequest, res: Response) => {
  try {
    const services = db.prepare(`
      SELECT 
        s.*,
        prop.title as propertyTitle,
        u.full_name as providerName,
        u.phone as providerPhone,
        u.email as providerEmail
      FROM provider_digital_services s
      JOIN users u ON s.provider_id = u.id
      LEFT JOIN properties prop ON s.property_id = prop.id
      ORDER BY s.created_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalServiceRevenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedCount,
        COUNT(CASE WHEN status = 'PENDING' OR status = 'IN_PROGRESS' THEN 1 END) as pendingCount
      FROM provider_digital_services
    `).get() as any;

    res.json({
      success: true,
      summary,
      services
    });
  } catch (err: any) {
    console.error('Admin provider services error:', err);
    res.status(500).json({ error: 'Failed to retrieve provider services: ' + err.message });
  }
});

router.patch('/provider-services/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, deliveryNotes, assignedAgent } = req.body;

  try {
    const completedAt = status === 'COMPLETED' ? new Date().toISOString() : null;
    db.prepare(`
      UPDATE provider_digital_services
      SET status = COALESCE(?, status),
          delivery_notes = COALESCE(?, delivery_notes),
          assigned_agent = COALESCE(?, assigned_agent),
          completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, deliveryNotes, assignedAgent, completedAt, id);

    res.json({ success: true, message: 'Digital service updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update service: ' + err.message });
  }
});

// =============================================================================
// 7. GET & POST /api/admin/revenue/payouts — Landlord Disbursements
// =============================================================================
router.get('/payouts', (req: AuthenticatedRequest, res: Response) => {
  try {
    const payouts = db.prepare(`
      SELECT 
        pr.*,
        u.full_name as providerName,
        u.email as providerEmail,
        u.phone as providerPhone,
        pp.business_name as businessName
      FROM payout_requests pr
      JOIN users u ON pr.provider_id = u.id
      LEFT JOIN provider_profiles pp ON u.id = pp.user_id
      ORDER BY pr.created_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as totalPaidOut,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as totalPendingAmount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingRequestsCount
      FROM payout_requests
    `).get() as any;

    res.json({
      success: true,
      summary,
      payouts
    });
  } catch (err: any) {
    console.error('Admin payouts error:', err);
    res.status(500).json({ error: 'Failed to retrieve payouts: ' + err.message });
  }
});

router.post('/payouts/:id/action', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, adminNotes } = req.body; // 'APPROVE' or 'REJECT'
  const adminName = req.user!.fullName;

  try {
    const payout = db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(id) as any;
    if (!payout) return res.status(404).json({ error: 'Payout request not found' });

    if (action === 'APPROVE') {
      db.transaction(() => {
        const now = new Date().toISOString();
        db.prepare(`
          UPDATE payout_requests
          SET status = 'PAID',
              processed_by = ?,
              processed_at = ?,
              admin_notes = COALESCE(?, admin_notes)
          WHERE id = ?
        `).run(adminName, now, adminNotes || 'Disbursed via automated bank batch', id);

        // Record Ledger Entry
        db.prepare(`
          INSERT INTO financial_ledger (
            id, entry_type, amount, currency, debit_account, credit_account, description, created_at
          ) VALUES (?, 'PAYOUT_PROCESSED', ?, 'NGN', 'HOSTEL_EASE_SETTLEMENT', 'PROVIDER_BANK_ACCOUNT', ?, datetime('now'))
        `).run(
          `ledg-${crypto.randomUUID()}`,
          payout.amount,
          `Disbursed payout ${payout.payout_reference} to ${payout.account_name} (${payout.bank_name})`
        );
      })();

      return res.json({ success: true, message: `Payout of ₦${payout.amount.toLocaleString()} approved and marked paid` });
    } else {
      db.prepare(`
        UPDATE payout_requests
        SET status = 'REJECTED',
            admin_notes = ?,
            processed_by = ?,
            processed_at = datetime('now')
        WHERE id = ?
      `).run(adminNotes || 'Declined due to mismatched bank details', adminName, id);

      return res.json({ success: true, message: 'Payout request rejected' });
    }
  } catch (err: any) {
    console.error('Payout action error:', err);
    res.status(500).json({ error: 'Failed to process payout action: ' + err.message });
  }
});

// =============================================================================
// 8. GET & POST /api/admin/revenue/refunds — Student Refunds Management
// =============================================================================
router.get('/refunds', (req: AuthenticatedRequest, res: Response) => {
  try {
    const refunds = db.prepare(`
      SELECT 
        r.*,
        p.payment_reference as paymentReference,
        p.amount as paymentOriginalAmount,
        b.booking_reference as bookingReference,
        prop.title as propertyTitle,
        u_student.full_name as studentName,
        u_student.email as studentEmail,
        u_prov.full_name as providerName
      FROM refunds r
      JOIN payments p ON r.payment_id = p.id
      JOIN bookings b ON r.booking_id = b.id
      JOIN properties prop ON p.property_id = prop.id
      JOIN users u_student ON b.student_id = u_student.id
      JOIN users u_prov ON b.provider_id = u_prov.id
      ORDER BY r.created_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) as totalRefundedAmount,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as completedRefundsCount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingRefundsCount
      FROM refunds
    `).get() as any;

    res.json({
      success: true,
      summary,
      refunds
    });
  } catch (err: any) {
    console.error('Admin refunds error:', err);
    res.status(500).json({ error: 'Failed to retrieve refunds: ' + err.message });
  }
});

// =============================================================================
// 9. GET /api/admin/revenue/invoices — Official Billing & Invoices
// =============================================================================
router.get('/invoices', (req: AuthenticatedRequest, res: Response) => {
  const { search, status, limit = 50 } = req.query;

  try {
    let sql = 'SELECT * FROM platform_invoices WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (invoice_number LIKE ? OR user_name LIKE ? OR item_description LIKE ?)';
      const wild = `%${search}%`;
      params.push(wild, wild, wild);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const invoices = db.prepare(sql).all(...params);
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalInvoiced,
        COUNT(*) as totalInvoicesCount
      FROM platform_invoices
    `).get() as any;

    res.json({
      success: true,
      summary,
      invoices
    });
  } catch (err: any) {
    console.error('Admin invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoices: ' + err.message });
  }
});

// =============================================================================
// 10. GET & POST /api/admin/revenue/withdrawals — Platform Treasury
// =============================================================================
router.get('/withdrawals', (req: AuthenticatedRequest, res: Response) => {
  try {
    const withdrawals = db.prepare(`
      SELECT 
        w.*,
        u.full_name as adminName,
        u.email as adminEmail
      FROM platform_withdrawals w
      JOIN users u ON w.admin_id = u.id
      ORDER BY w.created_at DESC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalWithdrawn,
        COUNT(*) as count
      FROM platform_withdrawals
    `).get() as any;

    res.json({
      success: true,
      summary,
      withdrawals
    });
  } catch (err: any) {
    console.error('Admin withdrawals error:', err);
    res.status(500).json({ error: 'Failed to retrieve withdrawals: ' + err.message });
  }
});

router.post('/withdrawals', (req: AuthenticatedRequest, res: Response) => {
  const { amount, destinationBank, destinationAccountNumber, destinationAccountName, purpose } = req.body;

  if (!amount || !destinationBank || !destinationAccountNumber || !destinationAccountName) {
    return res.status(400).json({ error: 'All withdrawal bank destination details are required' });
  }

  try {
    const withdrawalId = `wdr-${crypto.randomUUID()}`;
    const withdrawalRef = `WDR-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO platform_withdrawals (
          id, withdrawal_reference, admin_id, amount, destination_account_name,
          destination_bank, destination_account_number, purpose, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', datetime('now'))
      `).run(
        withdrawalId, withdrawalRef, req.user!.id, Number(amount),
        destinationAccountName, destinationBank, destinationAccountNumber,
        purpose || 'Treasury Transfer'
      );

      // Ledger debit
      db.prepare(`
        INSERT INTO financial_ledger (
          id, entry_type, amount, currency, debit_account, credit_account, description, created_at
        ) VALUES (?, 'PAYOUT_PROCESSED', ?, 'NGN', 'HOSTEL_EASE_SETTLEMENT', 'PLATFORM_OWNER_BANK', ?, datetime('now'))
      `).run(
        `ledg-${crypto.randomUUID()}`,
        Number(amount),
        `Owner treasury withdrawal ${withdrawalRef} to ${destinationAccountName} (${destinationBank})`
      );
    })();

    res.status(201).json({
      success: true,
      withdrawalReference: withdrawalRef,
      message: `Platform withdrawal of ₦${Number(amount).toLocaleString()} recorded successfully`
    });
  } catch (err: any) {
    console.error('Create withdrawal error:', err);
    res.status(500).json({ error: 'Failed to execute withdrawal: ' + err.message });
  }
});

// =============================================================================
// 11. GET /api/admin/revenue/reports — Structured Financial Export & Tax
// =============================================================================
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  const { year = '2026' } = req.query;

  try {
    const monthlyStatements = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as monthPeriod,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as paidBookings,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) as grossBookingVolume,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN platform_fee ELSE 0 END), 0) as bookingCommission,
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN provider_amount ELSE 0 END), 0) as providerDisbursements,
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) as refundsTotal
      FROM payments
      WHERE strftime('%Y', created_at) = ?
      GROUP BY monthPeriod
      ORDER BY monthPeriod ASC
    `).all(year);

    const subscriptionTotals = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as monthPeriod,
        COALESCE(SUM(amount), 0) as subscriptionRevenue
      FROM provider_subscriptions
      WHERE strftime('%Y', created_at) = ?
      GROUP BY monthPeriod
    `).all(year) as any[];

    const featuredTotals = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as monthPeriod,
        COALESCE(SUM(amount), 0) as featuredRevenue
      FROM featured_listings
      WHERE strftime('%Y', created_at) = ?
      GROUP BY monthPeriod
    `).all(year) as any[];

    const digitalServiceTotals = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as monthPeriod,
        COALESCE(SUM(amount), 0) as digitalServiceRevenue
      FROM provider_digital_services
      WHERE strftime('%Y', created_at) = ?
      GROUP BY monthPeriod
    `).all(year) as any[];

    // Merge streams per month
    const combinedReport = monthlyStatements.map((m: any) => {
      const sub = subscriptionTotals.find(s => s.monthPeriod === m.monthPeriod)?.subscriptionRevenue || 0;
      const feat = featuredTotals.find(f => f.monthPeriod === m.monthPeriod)?.featuredRevenue || 0;
      const dgt = digitalServiceTotals.find(d => d.monthPeriod === m.monthPeriod)?.digitalServiceRevenue || 0;
      const netPlatform = (m.bookingCommission + sub + feat + dgt) - m.refundsTotal;

      return {
        monthPeriod: m.monthPeriod,
        paidBookings: m.paidBookings,
        grossBookingVolume: m.grossBookingVolume,
        bookingCommission: m.bookingCommission,
        subscriptionRevenue: sub,
        featuredRevenue: feat,
        digitalServiceRevenue: dgt,
        totalPlatformGross: m.bookingCommission + sub + feat + dgt,
        refundsTotal: m.refundsTotal,
        netPlatformEarnings: Math.max(0, netPlatform),
        providerDisbursements: m.providerDisbursements
      };
    });

    res.json({
      success: true,
      fiscalYear: year,
      taxJurisdiction: 'Nigeria (Oyo State / Federal)',
      companyName: 'Hostel Ease Technologies Ltd (LAUTECH Platform)',
      report: combinedReport
    });
  } catch (err: any) {
    console.error('Admin financial report error:', err);
    res.status(500).json({ error: 'Failed to generate financial report: ' + err.message });
  }
});

// =============================================================================
// 12. GET & PUT /api/admin/revenue/settings — Revenue Rates & Configs
// =============================================================================
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM revenue_settings ORDER BY category ASC, setting_key ASC').all();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load revenue settings: ' + err.message });
  }
});

router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const { settings } = req.body; // Array of { key, value }

  if (!Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array required' });
  }

  try {
    db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE revenue_settings
        SET setting_value = ?, updated_at = datetime('now')
        WHERE setting_key = ?
      `);

      for (const s of settings) {
        updateStmt.run(String(s.value), s.key);
      }
    })();

    res.json({ success: true, message: 'Platform revenue settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update revenue settings: ' + err.message });
  }
});

export default router;
