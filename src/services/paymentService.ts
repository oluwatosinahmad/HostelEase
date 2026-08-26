import { 
  PaymentTransaction, 
  PaymentProvider, 
  PlatformFeeConfig, 
  Booking, 
} from '../types';

// =========================================================================
// GATEWAY ENVIRONMENT & CONFIGURATION CONTRACT
// =========================================================================

export const PAYMENT_GATEWAY_CONFIG = {
  activeProvider: ((import.meta as any).env?.VITE_PAYMENT_PROVIDER || 'PAYSTACK') as PaymentProvider,
  publicKey: (import.meta as any).env?.VITE_PAYMENT_PUBLIC_KEY || 'pk_test_campusnest_lautech_2026_demo',
  isTestMode: true,
  currency: 'NGN',
  merchantName: 'CampusNest Student Housing Technologies',
};

// Supported Nigerian Banks for Ogbomoso / LAUTECH Landlord Direct Payouts
export const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank', slug: 'access-bank' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)', slug: 'gtb' },
  { code: '057', name: 'Zenith Bank', slug: 'zenith-bank' },
  { code: '011', name: 'First Bank of Nigeria', slug: 'first-bank' },
  { code: '033', name: 'United Bank for Africa (UBA)', slug: 'uba' },
  { code: '214', name: 'First City Monument Bank (FCMB)', slug: 'fcmb' },
  { code: '032', name: 'Union Bank of Nigeria', slug: 'union-bank' },
  { code: '035', name: 'Wema Bank / ALAT', slug: 'wema-bank' },
  { code: '070', name: 'Fidelity Bank', slug: 'fidelity-bank' },
  { code: '232', name: 'Sterling Bank', slug: 'sterling-bank' },
  { code: '50211', name: 'Kuda Microfinance Bank', slug: 'kuda-bank' },
  { code: '999991', name: 'OPay Digital Services', slug: 'opay' },
  { code: '999992', name: 'PalmPay Limited', slug: 'palmpay' },
  { code: '50515', name: 'Moniepoint Microfinance Bank', slug: 'moniepoint' },
  { code: '076', name: 'Polaris Bank', slug: 'polaris-bank' },
  { code: '221', name: 'Stanbic IBTC Bank', slug: 'stanbic-ibtc' },
];

export interface PaymentBreakdownResult {
  rentAmount: number;
  agencyFee: number;
  agreementFee: number;
  cautionFee: number;
  serviceCharge: number;
  propertyAmount: number; // Sum of property-level costs
  platformFee: number; // CampusNest commission
  providerFee: number; // Payment Gateway processing fee (e.g. 1.5% + N100)
  grossAmount: number; // What the student pays
  landlordAmount: number; // What the host receives
  payer: 'STUDENT' | 'LANDLORD' | 'SPLIT';
  feePercentageDisplay: string;
}

/**
 * Calculates transparent itemized payment breakdown based on active Platform Commission Config
 */
export function calculatePaymentBreakdown(
  booking: Booking,
  config: PlatformFeeConfig
): PaymentBreakdownResult {
  const rent = booking.annualRent || 0;
  const agency = booking.agencyFee || 0;
  const agreement = booking.agreementFee || 0;
  const caution = booking.cautionFee || 0;
  const service = booking.serviceCharge || 0;
  const propertyAmount = rent + agency + agreement + caution + service;

  const isEnabled = config.isEnabled ?? config.isActive ?? false;
  const payer = config.payer || 'STUDENT';
  const model = config.model || config.feeModel || 'PERCENTAGE';
  const rate = config.percentageRate || config.value || 3.5;
  const fixed = config.fixedAmount || config.value || 3000;

  let calculatedPlatformFee = 0;
  if (isEnabled) {
    if (model === 'PERCENTAGE') {
      calculatedPlatformFee = Math.round((rent * rate) / 100);
    } else {
      calculatedPlatformFee = fixed;
    }
  }

  // Gateway Provider processing fee (Paystack standard: 1.5% capped at N2000 + N100 for N2500+)
  const providerFee = Math.min(2000, Math.round(propertyAmount * 0.015) + (propertyAmount >= 2500 ? 100 : 0));

  let grossAmount = propertyAmount;
  let landlordAmount = propertyAmount;

  if (payer === 'STUDENT') {
    grossAmount = propertyAmount + calculatedPlatformFee;
    landlordAmount = propertyAmount; // Landlord gets full property amount
  } else if (payer === 'LANDLORD') {
    grossAmount = propertyAmount;
    landlordAmount = Math.max(0, propertyAmount - calculatedPlatformFee); // Deducted from host payout
  } else if (payer === 'SPLIT') {
    const halfFee = Math.round(calculatedPlatformFee / 2);
    grossAmount = propertyAmount + halfFee;
    landlordAmount = Math.max(0, propertyAmount - halfFee);
  }

  const feePercentageDisplay =
    model === 'PERCENTAGE' ? `${rate}% of annual rent` : `₦${fixed.toLocaleString()} fixed fee`;

  return {
    rentAmount: rent,
    agencyFee: agency,
    agreementFee: agreement,
    cautionFee: caution,
    serviceCharge: service,
    propertyAmount,
    platformFee: calculatedPlatformFee,
    providerFee,
    grossAmount,
    landlordAmount,
    payer,
    feePercentageDisplay,
  };
}

/**
 * Validates and simulates server-side payment verification
 */
export async function verifyPaymentTransaction(params: {
  booking: Booking;
  paymentReference: string;
  expectedAmount: number;
  paidAmount: number;
  channel: string;
  existingTransactions: PaymentTransaction[];
  breakdown: PaymentBreakdownResult;
}): Promise<{
  success: boolean;
  transaction?: PaymentTransaction;
  errorMessage?: string;
  isFlagged?: boolean;
}> {
  // 1. Idempotency Check: Prevent duplicate payment verification for same reference
  const duplicate = params.existingTransactions.find(
    (t) => t.paymentReference === params.paymentReference && t.status === 'SUCCESSFUL'
  );
  if (duplicate) {
    return {
      success: true,
      transaction: duplicate,
    };
  }

  // 2. Amount Mismatch Validation: Never trust unverified amounts
  if (params.paidAmount < params.expectedAmount) {
    const flaggedTx: PaymentTransaction = {
      id: `tx-flagged-${Date.now()}`,
      bookingId: params.booking.id,
      bookingReference: params.booking.referenceNumber,
      paymentReference: params.paymentReference,
      propertyId: params.booking.propertyId,
      propertyTitle: params.booking.propertyTitle,
      zoneName: params.booking.zoneName,
      studentId: params.booking.studentId,
      studentName: params.booking.studentName,
      studentEmail: params.booking.studentEmail,
      studentPhone: params.booking.studentPhone,
      landlordId: params.booking.landlordId,
      landlordName: params.booking.landlordName,
      grossAmount: params.paidAmount,
      propertyAmount: params.breakdown.propertyAmount,
      rentAmount: params.breakdown.rentAmount,
      agencyFee: params.breakdown.agencyFee,
      agreementFee: params.breakdown.agreementFee,
      cautionFee: params.breakdown.cautionFee,
      serviceCharge: params.breakdown.serviceCharge,
      platformFee: params.breakdown.platformFee,
      providerFee: params.breakdown.providerFee,
      landlordAmount: params.breakdown.landlordAmount,
      currency: 'NGN',
      provider: PAYMENT_GATEWAY_CONFIG.activeProvider,
      channel: params.channel,
      status: 'FAILED',
      isFlaggedForReview: true,
      flagReason: `Underpaid: expected ₦${params.expectedAmount.toLocaleString()}, received ₦${params.paidAmount.toLocaleString()}`,
      gatewayResponse: 'AMOUNT_MISMATCH_SUSPICIOUS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      success: false,
      transaction: flaggedTx,
      isFlagged: true,
      errorMessage: 'Payment amount does not match expected accommodation cost. Transaction flagged for review.',
    };
  }

  // 3. Create verified successful transaction
  const nowIso = new Date().toISOString();
  const receiptNum = `RCP-CN-${Date.now().toString().slice(-6)}`;

  const successfulTx: PaymentTransaction = {
    id: `tx-${Date.now()}`,
    bookingId: params.booking.id,
    bookingReference: params.booking.referenceNumber,
    paymentReference: params.paymentReference,
    propertyId: params.booking.propertyId,
    propertyTitle: params.booking.propertyTitle,
    zoneName: params.booking.zoneName,
    studentId: params.booking.studentId,
    studentName: params.booking.studentName,
    studentEmail: params.booking.studentEmail,
    studentPhone: params.booking.studentPhone,
    landlordId: params.booking.landlordId,
    landlordName: params.booking.landlordName,
    grossAmount: params.paidAmount,
    propertyAmount: params.breakdown.propertyAmount,
    rentAmount: params.breakdown.rentAmount,
    agencyFee: params.breakdown.agencyFee,
    agreementFee: params.breakdown.agreementFee,
    cautionFee: params.breakdown.cautionFee,
    serviceCharge: params.breakdown.serviceCharge,
    platformFee: params.breakdown.platformFee,
    providerFee: params.breakdown.providerFee,
    landlordAmount: params.breakdown.landlordAmount,
    currency: 'NGN',
    provider: PAYMENT_GATEWAY_CONFIG.activeProvider,
    channel: params.channel,
    status: 'SUCCESSFUL',
    gatewayResponse: 'Approved by Gateway (Test Sandbox)',
    paidAt: nowIso,
    receiptNumber: receiptNum,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    success: true,
    transaction: successfulTx,
  };
}

/**
 * Verifies and masks landlord Nigerian bank account details
 */
export function maskAccountNumber(accNum: string): string {
  if (!accNum || accNum.length < 4) return '****';
  const clean = accNum.replace(/\s+/g, '');
  const lastFour = clean.slice(-4);
  return `•••• •••• ${lastFour}`;
}

/**
 * Validates bank account resolution with payment provider
 */
export async function verifyLandlordBankAccount(
  accountNumber: string,
  _bankCode: string,
  declaredName: string
): Promise<{ isValid: boolean; resolvedAccountName: string }> {
  // Emulate bank name inquiry API resolution
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!accountNumber || accountNumber.length !== 10) {
    throw new Error('Nigerian NUBAN account number must be exactly 10 digits.');
  }

  // Return realistic resolved account name
  const resolvedAccountName = declaredName.toUpperCase();
  return {
    isValid: true,
    resolvedAccountName,
  };
}
