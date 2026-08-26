/**
 * CampusNest Security & Production Reliability Utilities
 * Implements XSS sanitization, rate-limiting, file upload validation,
 * booking conflict checks, server commission validation, and cryptographic token helpers.
 */

// =========================================================================
// 1. INPUT SANITIZATION (XSS & INJECTION PROTECTION)
// =========================================================================

/**
 * Strips HTML tags, script payloads, and potentially dangerous attributes
 * from user-supplied text (reviews, descriptions, inquiries, notes, etc.).
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(["']).*?\1/gi, '') // inline event handlers (onerror, onclick, etc.)
    .replace(/javascript\s*:/gi, '')
    .replace(/<[^>]+>/g, '') // strip all other HTML tags
    .trim();
}

/**
 * Validates and normalizes Nigerian phone numbers (e.g., 08012345678, +2348012345678).
 */
export function sanitizeNigerianPhone(phone: string): { isValid: boolean; normalized: string } {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (/^(\+234|0)[789][01]\d{8}$/.test(cleaned)) {
    const normalized = cleaned.startsWith('+234')
      ? '0' + cleaned.substring(4)
      : cleaned;
    return { isValid: true, normalized };
  }
  return { isValid: false, normalized: cleaned };
}

/**
 * Validates academic student email (supports .edu.ng, student portals, and standard domains).
 */
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

// =========================================================================
// 2. SLIDING-WINDOW RATE LIMITER (BRUTE FORCE & SPAM PROTECTION)
// =========================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Enforces rate limiting per action & identifier (IP or User ID).
 * @param actionKey - e.g. 'auth_login', 'submit_review', 'initiate_payment', 'send_inquiry'
 * @param identifier - e.g. user IP, email, or user ID
 * @param maxAttempts - Maximum allowed attempts in the window
 * @param windowMs - Time window in milliseconds (e.g. 60,000 for 1 min)
 * @returns { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number }
 */
export function checkRateLimit(
  actionKey: string,
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const key = `${actionKey}:${identifier.toLowerCase()}`;
  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter out timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Record this attempt
  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remainingAttempts: maxAttempts - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit for a specific key upon successful action (e.g. successful login).
 */
export function resetRateLimit(actionKey: string, identifier: string): void {
  const key = `${actionKey}:${identifier.toLowerCase()}`;
  rateLimitStore.delete(key);
}

// =========================================================================
// 3. FILE UPLOAD SECURITY VALIDATOR
// =========================================================================

export interface FileValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOCUMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_DOC_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates uploaded files against MIME whitelist, size boundaries, and dangerous extensions.
 */
export function validateUploadedFile(
  file: { name: string; size: number; type: string },
  category: 'image' | 'video' | 'document'
): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'html', 'svg', 'vbs', 'scr'];

  if (dangerousExtensions.includes(extension)) {
    return {
      isValid: false,
      errorMessage: `Security Violation: File extension .${extension} is strictly forbidden on CampusNest.`,
    };
  }

  if (category === 'image') {
    if (!ALLOWED_IMAGE_MIMES.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      return {
        isValid: false,
        errorMessage: 'Invalid Image Format: Only JPG, PNG, and WebP images are permitted.',
      };
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `File Too Large: Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`,
      };
    }
  } else if (category === 'video') {
    if (!ALLOWED_VIDEO_MIMES.includes(file.type) && !['mp4', 'webm', 'mov'].includes(extension)) {
      return {
        isValid: false,
        errorMessage: 'Invalid Video Format: Only MP4, WebM, and QuickTime videos are permitted.',
      };
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `File Too Large: Video walkthrough (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 50MB limit.`,
      };
    }
  } else if (category === 'document') {
    if (!ALLOWED_DOCUMENT_MIMES.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
      return {
        isValid: false,
        errorMessage: 'Invalid Document Format: Only PDF and Image documents are allowed for verification.',
      };
    }
    if (file.size > MAX_DOC_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `File Too Large: Document (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 15MB limit.`,
      };
    }
  }

  return { isValid: true };
}

// =========================================================================
// 4. BOOKING CONFLICT & DOUBLE-BOOKING PREVENTER
// =========================================================================

export interface ExistingBookingSlot {
  id: string;
  propertyId: string;
  status: string;
  studentId?: string;
  studentEmail?: string;
}

/**
 * Checks if a property is already booked or locked under an active payment session.
 */
export function checkBookingConflict(
  propertyId: string,
  existingBookings: ExistingBookingSlot[],
  requestingStudentEmail: string
): { isConflict: boolean; reason?: string } {
  // Check if there is already a confirmed booking
  const confirmedBooking = existingBookings.find(
    (b) => b.propertyId === propertyId && (b.status === 'CONFIRMED' || b.status === 'PAID')
  );

  if (confirmedBooking) {
    return {
      isConflict: true,
      reason: 'This property has already been reserved and paid for by another student for the upcoming academic session.',
    };
  }

  // Check if another student has an active 48-hour payment lock
  const activeLockBooking = existingBookings.find(
    (b) =>
      b.propertyId === propertyId &&
      (b.status === 'ACCEPTED' || b.status === 'PAYMENT_PENDING') &&
      b.studentEmail !== requestingStudentEmail
  );

  if (activeLockBooking) {
    return {
      isConflict: true,
      reason: 'Another student currently holds an active payment reservation lock on this property. If they do not complete payment within the 48-hour window, the property will become available again.',
    };
  }

  return { isConflict: false };
}

// =========================================================================
// 5. SERVER COMMISSION RECALCULATOR & FINANCIAL VERIFIER
// =========================================================================

export interface FeeCalculationInput {
  annualRent: number;
  agencyFee?: number;
  agreementFee?: number;
  cautionFee?: number;
  serviceCharge?: number;
  feeModel: 'PERCENTAGE' | 'FIXED';
  percentageRate?: number;
  fixedAmount?: number;
  payer: 'STUDENT' | 'LANDLORD' | 'SPLIT';
  isActive: boolean;
}

export interface VerifiedFeeBreakdown {
  annualRent: number;
  mandatoryCharges: number;
  platformFee: number;
  studentTotalAmount: number;
  landlordPayoutAmount: number;
  isTampered: boolean;
}

/**
 * Verifies and recalculates fees server-side to prevent client-side fee manipulation.
 */
export function recalculateVerifiedFees(
  input: FeeCalculationInput,
  clientGrossAmount?: number
): VerifiedFeeBreakdown {
  const rent = Math.max(0, input.annualRent);
  const mandatory = (input.agencyFee || 0) + (input.agreementFee || 0) + (input.cautionFee || 0) + (input.serviceCharge || 0);

  let rawFee = 0;
  if (input.isActive) {
    if (input.feeModel === 'PERCENTAGE') {
      const rate = input.percentageRate || 3.5;
      rawFee = Math.round((rent * rate) / 100);
    } else {
      rawFee = Math.round(input.fixedAmount || 3000);
    }
  }

  let studentFee = 0;
  let landlordFee = 0;

  if (input.payer === 'STUDENT') {
    studentFee = rawFee;
  } else if (input.payer === 'LANDLORD') {
    landlordFee = rawFee;
  } else if (input.payer === 'SPLIT') {
    studentFee = Math.round(rawFee / 2);
    landlordFee = rawFee - studentFee;
  }

  const studentTotal = rent + mandatory + studentFee;
  const landlordPayout = Math.max(0, rent + mandatory - landlordFee);

  const isTampered = Boolean(clientGrossAmount && Math.abs(clientGrossAmount - studentTotal) > 1);

  return {
    annualRent: rent,
    mandatoryCharges: mandatory,
    platformFee: rawFee,
    studentTotalAmount: studentTotal,
    landlordPayoutAmount: landlordPayout,
    isTampered,
  };
}

// =========================================================================
// 6. SENSITIVE DATA MASKING
// =========================================================================

/**
 * Masks NUBAN bank account numbers (e.g. "0123456789" -> "•••• •••• 6789")
 */
export function maskNubanAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length < 4) return '•••• •••• ••••';
  const last4 = digits.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Masks student/landlord email addresses (e.g. "oluwaseun@gmail.com" -> "o••••••n@gmail.com")
 */
export function maskEmailAddress(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '••••••@••••.com';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  const maskedName = `${name[0]}${'•'.repeat(Math.min(6, name.length - 2))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}
