// =========================================================================
// CAMPUSNEST — DOMAIN TYPES & INTERFACES (PHASE 4: TRUST, VERIFICATION & SAFETY)
// =========================================================================

export type Country = {
  id: string;
  name: string;
  code: string;
  currency: string;
  currencySymbol: string;
};

export type State = {
  id: string;
  name: string;
  countryId: string;
};

export type City = {
  id: string;
  name: string;
  stateId: string;
  countryId: string;
};

export type University = {
  id: string;
  name: string;
  shortName: string;
  cityName: string;
  stateName: string;
  countryName: string;
  isLaunchMarket: boolean;
  status: 'active' | 'upcoming' | 'planned' | 'BETA' | 'ACTIVE' | 'COMING_SOON' | 'PAUSED';
  launchStatus?: 'COMING_SOON' | 'BETA' | 'ACTIVE' | 'PAUSED';
  campusesCount: number;
  totalStudentsEstimate?: number;
  logoUrl?: string;
};

export type Campus = {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  cityName: string;
  stateName: string;
  isMainCampus: boolean;
  zonesCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
};

export type CampusZone = {
  id: string;
  campusId: string;
  name: string;
  slug: string;
  description: string;
  avgWalkTimeToGateMins: number;
  avgBikeTimeToGateMins: number;
  avgRentRange: {
    min: number;
    max: number;
  };
  safetyRating: number;
  lightReliabilityScore: number;
  waterReliabilityScore: number;
  popularFor: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive?: boolean;
  cityId?: string;
};

export type PropertyType =
  | 'self_contain'
  | 'room_and_parlour'
  | 'one_bedroom'
  | 'two_bedroom'
  | 'three_bedroom'
  | 'shared_accommodation'
  | 'hostel'
  | 'apartment'
  | 'other';

export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'PUBLISHED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED';

export type LandlordVerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'VERIFIED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'SUSPENDED';

export type LandlordAuthorizationType =
  | 'DIRECT_OWNER'
  | 'AUTHORIZED_AGENT'
  | 'HOSTEL_CARETAKER'
  | 'UNCONFIRMED';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'FULLY_OCCUPIED'
  | 'UNAVAILABLE'
  | 'RESERVED';

export type PaymentFrequency =
  | 'annually'
  | 'per_semester'
  | 'monthly';

export type PropertyMedia = {
  id: string;
  url: string;
  caption?: string;
  isPrimary: boolean;
  type: 'photo' | 'video_walkthrough' | 'floorplan';
  sortOrder: number;
};

export type CompletenessItem = {
  key: string;
  label: string;
  weight: number;
  isCompleted: boolean;
  actionHint?: string;
  recommendation: string;
};

export type CompletenessResult = {
  score: number;
  items: CompletenessItem[];
  missingCount: number;
  topRecommendation: string;
};

export type PropertyFeeBreakdown = {
  annualRent: number;
  rentPerYear?: number;
  paymentFrequency: PaymentFrequency;
  agencyFee: number;
  agreementFee: number;
  cautionFee: number;
  serviceCharge: number;
  otherFees: number;
  estimatedTotal: number;
};

// Phase 4: Verification Checklist structure
export type VerificationChecklist = {
  // Property Info Checks
  locationProvided: boolean;
  propertyTypeConfirmed: boolean;
  priceReviewed: boolean;
  feesReviewed: boolean;
  availabilityReviewed: boolean;
  photosReviewed: boolean;
  videoReviewed: boolean;
  // Landlord / Host Checks
  landlordProfileReviewed: boolean;
  landlordContactReviewed: boolean;
  landlordIdentityReviewed: boolean;
  authorizationDocumentReviewed: boolean;
  // Inspection & Field Evidence
  physicalVerificationCompleted: boolean;
  inspectorName?: string;
  inspectionDate?: string;
  waterSourceInspected: boolean;
  electricityMeterInspected: boolean;
  structuralIntegrityInspected: boolean;
  reportHistoryCleared: boolean;
  adminNotes?: string;
};

export type VerificationHistoryLog = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'SUSPEND' | 'REVERIFY';
  adminName: string;
  date: string;
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  reason?: string;
  notes?: string;
  checklistSnapshot?: Partial<VerificationChecklist>;
};

export type AvailabilityHistoryEntry = {
  id: string;
  previousStatus: AvailabilityStatus;
  newStatus: AvailabilityStatus;
  date: string;
  changedBy: string;
};

export type ListingChangeHistoryEntry = {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  date: string;
  changedBy: string;
};

export type Property = {
  id: string;
  title: string;
  slug: string;
  universityId: string;
  campusId: string;
  zoneId: string;
  zoneName: string;
  cityName: string;
  stateName: string;
  countryName: string;
  address: string;
  landmark: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceKmFromGate: number;
  distanceText: string;
  propertyType: PropertyType;
  propertyTypeLabel: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  fees: PropertyFeeBreakdown;
  listingStatus: ListingStatus;
  verificationStatus: VerificationStatus;
  availabilityStatus: AvailabilityStatus;
  lastUpdated: string;
  completenessScore: number;
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  rejectionReason?: string;
  suspensionReason?: string;
  requestedChangesNote?: string;
  isDemo?: boolean;

  // Verification & Trust Details
  lastVerifiedDate?: string;
  verificationValidUntil?: string;
  verificationChecklist?: VerificationChecklist;
  authorizationType: LandlordAuthorizationType;
  verificationHistory?: VerificationHistoryLog[];

  // Anomaly & Stale Listing Flags
  isDuplicateFlagged?: boolean;
  duplicateMatchTitle?: string;
  duplicateSimilarityScore?: number;
  priceAnomalyFlagged?: boolean;
  priceAnomalyNote?: string;
  previousRent?: number;
  availabilityFlappingFlagged?: boolean;
  lastAvailabilityConfirmedDate?: string;
  staleListingWarning?: boolean;
  availabilityHistory?: AvailabilityHistoryEntry[];
  changeHistory?: ListingChangeHistoryEntry[];

  // Media & Amenities
  coverImage: string;
  images: string[];
  media: PropertyMedia[];
  hasVideoTour: boolean;
  videoTourUrl?: string;
  videoDuration?: string;
  amenities: string[];
  hasBoreholeWater: boolean;
  hasPrepaidMeter: boolean;
  hasSolarOrInverter: boolean;
  hasGeneratorBackup: boolean;
  hasSecurityGuard: boolean;
  isFencedAndGated: boolean;
  isTiled: boolean;
  hasKitchenCabinets: boolean;
  hasWardrobe: boolean;
  hasParking: boolean;
  hasWifi: boolean;
  walkTimeToGate: string;
  bikeTimeToGate: string;
  distanceToGateMins: number;
  distanceDescription: string;
  overallRating: number;
  totalReviewsCount: number;
  
  inspectionReport: {
    waterSourceVerified: boolean;
    waterNote: string;
    electricityVerified: boolean;
    electricityNote: string;
    structuralIntegrity: 'excellent' | 'good' | 'fair';
    securityFencingGated: boolean;
    drainageFloodFree: boolean;
    landlordIdVerified: boolean;
    lastInspectedDate?: string;
  };
  landlord: {
    id: string;
    name: string;
    type: 'verified_landlord' | 'verified_agent' | 'caretaker';
    isIdVerified: boolean;
    phone: string;
    whatsapp: string;
    rating: number;
    activeListings: number;
    joinedYear: number;
    avatarUrl?: string;
    verificationStatus?: LandlordVerificationStatus;
    identityDocumentType?: 'NIN' | "Driver's License" | 'Voters Card' | 'International Passport';
    businessName?: string;
    businessRegNumber?: string;
    isSuspended?: boolean;
    suspensionReason?: string;
  };
  featured: boolean;
  createdAt: string;
};

export type StudentInquiry = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  zoneName: string;
  landlordId: string;
  landlordName: string;
  landlordWhatsapp: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
};

export type VirtualViewingRequest = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  zoneName: string;
  landlordId: string;
  landlordName: string;
  landlordWhatsapp: string;
  studentId?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentWhatsapp: string;
  viewingType: 'virtual_video' | 'physical_walkthrough';
  preferredDate: string;
  preferredTime: string;
  platform: 'WhatsApp Video' | 'Zoom' | 'Google Meet' | 'On-Site Walkthrough';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  landlordNote?: string;
  adminNotes?: string;
  createdAt: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  universityId: string;
  zoneId?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  hasVideoOnly?: boolean;
  matchCount: number;
  createdAt: string;
};

export type StudentNotification = {
  id: string;
  type: 
    | 'PRICE_CHANGE' 
    | 'AVAILABILITY_CHANGE' 
    | 'VIEWING_ACCEPTED' 
    | 'VIEWING_DECLINED' 
    | 'INQUIRY_REPLIED' 
    | 'VERIFICATION_EXPIRED' 
    | 'PROPERTY_SUSPENDED' 
    | 'REPORT_UPDATE' 
    | 'REVIEW_PUBLISHED' 
    | 'REVIEW_REPLY' 
    | 'REVIEW_MODERATED' 
    | 'BOOKING_SUBMITTED' 
    | 'BOOKING_ACCEPTED' 
    | 'BOOKING_DECLINED' 
    | 'BOOKING_PAYMENT_PENDING' 
    | 'BOOKING_PAYMENT_CONFIRMED' 
    | 'BOOKING_CONFIRMED' 
    | 'BOOKING_CANCELLED' 
    | 'BOOKING_MOVE_IN_REMINDER' 
    | 'BOOKING_DISPUTE_UPDATE' 
    | 'SYSTEM_ANNOUNCEMENT' 
    | 'SYSTEM';
  title: string;
  message: string;
  propertyId?: string;
  propertyTitle?: string;
  bookingId?: string;
  bookingReference?: string;
  timestamp?: string;
  date?: string;
  isRead: boolean;
};

// Phase 4: Extended Property Report
export type PropertyReportReason =
  | 'Fake property'
  | 'Wrong location'
  | 'Wrong price'
  | 'Property unavailable'
  | 'Misleading photos'
  | 'Misleading video'
  | 'Suspicious landlord/agent'
  | 'Duplicate listing'
  | 'Hidden fees'
  | 'Unsafe condition'
  | 'Other';

export type PropertyReport = {
  id: string;
  referenceNumber: string; // e.g. REP-LAU-8492
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  zoneName?: string;
  landlordId: string;
  landlordName: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  reason: PropertyReportReason;
  description: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'DISMISSED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  adminNotes?: string;
  resolutionNotes?: string;
  resolutionAction?: string;
  createdAt: string;
  updatedAt?: string;
};

// Phase 4: Landlord Report
export type LandlordReportReason =
  | 'Fraud concern'
  | 'Misleading information'
  | 'Harassment'
  | 'Fake listing'
  | 'Hidden fees'
  | 'Unprofessional behavior'
  | 'Other';

export type LandlordReport = {
  id: string;
  referenceNumber: string; // e.g. REP-HOST-3941
  landlordId: string;
  landlordName: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  reason: LandlordReportReason;
  description: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'DISMISSED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
};

// Phase 4: Admin Audit Log
export type AuditLogEntry = {
  id: string;
  adminName: string;
  action: 
    | 'APPROVE_PROPERTY'
    | 'REJECT_PROPERTY'
    | 'REQUEST_CHANGES'
    | 'SUSPEND_PROPERTY'
    | 'REVERIFY_PROPERTY'
    | 'SUSPEND_LANDLORD'
    | 'VERIFY_LANDLORD'
    | 'STUDENT_SUSPENDED'
    | 'STUDENT_REACTIVATED'
    | 'LANDLORD_SUSPENDED'
    | 'LANDLORD_REACTIVATED'
    | 'UNIVERSITY_ONBOARDED'
    | 'RESOLVE_REPORT'
    | 'DISMISS_REPORT'
    | 'UPDATE_EXPIRATION_SETTINGS'
    | 'CONFIRM_AVAILABILITY'
    | 'BOOKING_CANCELLED_ADMIN'
    | 'RESOLVE_BOOKING_DISPUTE'
    | 'UPDATE_COMMISSION_CONFIG'
    | string;
  entityType?: 'property' | 'landlord' | 'report' | 'booking' | 'dispute' | 'platform_fee' | 'system' | string;
  entityId?: string;
  entityTitle?: string;
  details: string;
  timestamp: string;
};

export type LandlordNotification = {
  id: string;
  landlordId?: string;
  propertyId?: string;
  propertyTitle?: string;
  type: 
    | 'SUBMITTED' 
    | 'APPROVED' 
    | 'REJECTED' 
    | 'CHANGES_REQUESTED'
    | 'SUSPENDED' 
    | 'VERIFICATION_EXPIRED'
    | 'AVAILABILITY_REMINDER' 
    | 'INQUIRY_RECEIVED' 
    | 'VIEWING_REQUESTED'
    | 'NEW_REVIEW_RECEIVED'
    | 'REVIEW_REPORT_ALERT'
    | 'NEW_BOOKING_REQUEST'
    | 'BOOKING_ACCEPTED'
    | 'BOOKING_PAYMENT_COMPLETED'
    | 'BOOKING_PAYMENT_RECEIVED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_DISPUTE_ALERT'
    | 'SYSTEM_ANNOUNCEMENT';
  title: string;
  message: string;
  bookingId?: string;
  bookingReference?: string;
  studentName?: string;
  timestamp?: string;
  date?: string;
  isRead: boolean;
};

export type ReviewStatus = 'PUBLISHED' | 'HIDDEN' | 'FLAGGED_SUSPICIOUS' | 'UNDER_MODERATION';

export type ReviewVerificationSignal = 
  | 'CONFIRMED_VIEWING' 
  | 'CONFIRMED_INQUIRY' 
  | 'CONFIRMED_TENANCY' 
  | 'ADMIN_VERIFIED';

export type LandlordReviewResponse = {
  id: string;
  landlordId: string;
  landlordName: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
};

export type ReviewEditHistoryEntry = {
  id: string;
  previousRating: number;
  previousComment: string;
  previousCategories?: {
    propertyCondition: number;
    listingAccuracy: number;
    locationExperience: number;
    valueForMoney: number;
    landlordExperience: number;
  };
  editedAt: string;
  editReason?: string;
};

export type StudentReview = {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  studentId?: string;
  studentName: string;
  studentDepartment: string;
  studentLevel?: string;
  stayPeriod?: string;
  
  // Multi-Category Ratings (1 to 5 Stars)
  rating: number; // Overall Rating
  propertyCondition: number;
  listingAccuracy: number;
  locationExperience: number;
  valueForMoney: number;
  landlordExperience: number;

  // Legacy compat aliases if referenced
  lightRating?: number;
  waterRating?: number;
  securityRating?: number;

  comment: string;
  photos?: string[];
  
  // Verification Signals
  isVerifiedExperience: boolean;
  isVerifiedResident?: boolean; // legacy alias
  verificationSignal?: ReviewVerificationSignal;

  // Landlord Feedback & Moderation
  landlordResponse?: LandlordReviewResponse;
  editHistory?: ReviewEditHistoryEntry[];
  status: ReviewStatus;
  isSuspiciousFlagged?: boolean;
  suspiciousReason?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  moderationReason?: string;
  
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
};

export type ReviewReportReason =
  | 'Fake review'
  | 'Spam'
  | 'Harassment'
  | 'Offensive content'
  | 'Personal information'
  | 'Misleading information'
  | 'Other';

export type ReviewReport = {
  id: string;
  referenceNumber: string; // e.g. REP-REV-8492
  reviewId: string;
  propertyId: string;
  propertyTitle: string;
  reviewAuthor: string;
  reviewSnippet: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole: 'student' | 'landlord' | 'admin';
  reason: ReviewReportReason;
  description: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionAction?: string;
  createdAt: string;
};

export type ViewingRatingScore = 'Very good' | 'Good' | 'Average' | 'Poor' | 'Very poor';

export type ViewingFeedback = {
  id: string;
  viewingId: string;
  propertyId: string;
  propertyTitle: string;
  studentId: string;
  studentName: string;
  rating: ViewingRatingScore;
  comment?: string;
  createdAt: string;
};

export type ReviewSortOption = 'newest' | 'highest' | 'lowest' | 'verified_only';

export type InspectionBooking = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  zoneName: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentWhatsapp: string;
  inspectionType: 'virtual_video' | 'physical_walkthrough';
  preferredDate: string;
  preferredTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
};

export type UserRole = 'student' | 'landlord' | 'admin';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  role: UserRole;
  universityId: string;
  campusId?: string;
  matricNumber?: string;
  department?: string;
  level?: string;
  isVerifiedStudent?: boolean;
  studentVerificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  studentIdCardUrl?: string;
  avatarUrl?: string;
  savedPropertyIds: string[];
};

export type SortOption =
  | 'recommended'
  | 'price_low'
  | 'price_high'
  | 'closest_to_campus'
  | 'recently_added'
  | 'recently_updated'
  | 'most_viewed'
  | 'most_saved';

// =========================================================================
// PHASE 6: CAMPUSNEST BOOKING, RESERVATION & MOVE-IN WORKFLOW
// =========================================================================

export type BookingStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

export type BookingTimelineStage =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'PAID'
  | 'CONFIRMED'
  | 'RESERVATION_CONFIRMED'
  | 'MOVE_IN_PENDING'
  | 'MOVE_IN_READY'
  | 'COMPLETED';

export type BookingTimelineStep = {
  id?: string;
  stage: BookingTimelineStage;
  step?: BookingTimelineStage | string;
  title: string;
  description: string;
  timestamp?: string;
  completed?: boolean;
  isCompleted?: boolean;
  isCurrent?: boolean;
  actor?: 'STUDENT' | 'LANDLORD' | 'ADMIN' | 'SYSTEM';
};

export type BookingCancellation = {
  cancelledBy: 'STUDENT' | 'LANDLORD' | 'ADMIN' | 'student' | 'landlord' | 'admin';
  cancellerName?: string;
  reason: string;
  timestamp?: string;
  cancelledAt?: string;
  details?: string;
};

export type Booking = {
  id: string;
  referenceNumber: string; // e.g. CN-2026-001042
  propertyId: string;
  propertyTitle: string;
  propertyCoverImage: string;
  zoneId?: string;
  zoneName: string;
  propertyAddress?: string;

  // Landlord/Agent Info
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  landlordWhatsapp?: string;

  // Student Info
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentWhatsapp?: string;
  studentMatricNumber?: string;
  studentDepartment?: string;
  studentLevel?: string;

  // Reservation Details
  moveInDate: string;
  durationMonths: number; // e.g. 12 months for 1 Academic Session
  durationLabel: string; // e.g. "1 Academic Session (12 Months)"
  studentMessage?: string;

  // Itemized Financials (All in NGN)
  annualRent: number;
  agencyFee: number;
  agreementFee: number;
  serviceCharge: number;
  cautionFee: number;
  platformFee: number; // CampusNest Service fee foundation
  studentTotalAmount: number;
  landlordPayoutAmount: number;
  currency?: 'NGN';

  // Status & Lifecycle
  status: BookingStatus;
  timeline: BookingTimelineStep[];
  cancellation?: BookingCancellation;
  expiresAt?: string; // ISO string for expiration (e.g. 48h from acceptance)
  notes?: string;

  // Move-in Foundation
  moveInInstructions?: string;
  requiredDocuments?: string[];
  moveInInspectionCompleted?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type BookingDisputeReason =
  | 'Property unavailable after booking'
  | 'Landlord not responding'
  | 'Incorrect property information'
  | 'Fee discrepancy'
  | 'Safety / condition concern'
  | 'Other';

export type BookingDispute = {
  id: string;
  referenceNumber?: string; // e.g. CN-DISP-2041
  ticketNumber?: string; // alias
  bookingId: string;
  bookingReference: string;
  propertyId: string;
  propertyTitle: string;
  zoneName?: string;
  reportedBy?: 'student' | 'landlord';
  reporterRole?: 'student' | 'landlord';
  reporterName: string;
  reporterEmail?: string;
  reporterContact?: string;
  reporterPhone?: string;
  reason: BookingDisputeReason;
  description?: string;
  details?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  adminNotes?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

// Platform Commission & Fee Foundation
export type PlatformFeeModel = 'FIXED' | 'PERCENTAGE';

export type PlatformFeeConfig = {
  feeModel?: PlatformFeeModel;
  model?: PlatformFeeModel;
  percentageRate?: number;
  fixedAmount?: number;
  value?: number; // e.g. 5% or 3000 NGN
  payer: 'STUDENT' | 'LANDLORD' | 'SPLIT';
  isActive?: boolean;
  isEnabled?: boolean; // default false in Phase 6, activated in Phase 7
  currency?: 'NGN';
  updatedAt: string;
  updatedBy?: string;
};

// =========================================================================
// PHASE 7: CAMPUSNEST PAYMENTS, COMMISSION & LANDLORD PAYOUTS
// =========================================================================

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SUCCESSFUL' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'FLAGGED_REVIEW'
  | 'REFUND_PENDING' 
  | 'REFUNDED' 
  | 'PARTIALLY_REFUNDED';

export type PaymentProvider = 'PAYSTACK' | 'FLUTTERWAVE' | 'BANK_TRANSFER';

export type PaymentMethodType = 'card' | 'bank_transfer' | 'ussd' | 'payattitude';

export type PaymentTransaction = {
  id: string;
  bookingId: string;
  bookingReference: string;
  paymentReference: string; // e.g. PAY-CN-2026-XXXXXX
  gatewayTransactionId?: string;
  propertyId: string;
  propertyTitle: string;
  zoneName?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  landlordId: string;
  landlordName: string;
  landlordPhone?: string;

  // Itemized Financials
  amount?: number; // compat alias for grossAmount
  grossAmount: number; // Total amount paid by student
  propertyAmount: number; // Rent + Caution + Service (excluding platform fee if paid by student)
  rentAmount: number;
  agencyFee: number;
  agreementFee: number;
  cautionFee: number;
  serviceCharge: number;
  platformFee: number; // CampusNest commission
  providerFee: number; // e.g. Paystack 1.5% + N100
  landlordAmount: number; // Net amount payable to landlord

  currency: 'NGN' | string;
  provider: PaymentProvider;
  channel?: PaymentMethodType | string;
  status: PaymentStatus;
  gatewayResponse?: string;
  idempotencyKey?: string;
  isFlaggedForReview?: boolean;
  flagReason?: string;
  paidAt?: string;
  receiptNumber?: string;
  createdAt: string;
  updatedAt?: string;
};

export type LandlordPayoutStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'PAID' 
  | 'FAILED' 
  | 'ON_HOLD' 
  | 'CANCELLED';

export type LandlordPayout = {
  id: string;
  payoutReference: string; // e.g. PAYOUT-CN-2026-001042
  landlordId: string;
  landlordName: string;
  landlordPhone?: string;
  bookingId: string;
  bookingReference: string;
  transactionId: string;
  propertyId: string;
  propertyTitle: string;
  grossAmount: number;
  commissionDeducted: number;
  netAmount: number;
  currency: 'NGN' | string;
  bankName: string;
  bankCode?: string;
  accountNumberMasked: string;
  accountName: string;
  status: LandlordPayoutStatus;
  holdReason?: string;
  settlementDueDate: string; // e.g. 2 days post move-in or immediate
  settlementPeriodHours?: number;
  paidAt?: string;
  payoutProviderRef?: string;
  createdAt: string;
  updatedAt?: string;
};

export type PayoutAccount = {
  id: string;
  landlordId: string;
  bankName: string;
  bankCode?: string;
  accountNumber?: string;
  accountNumberMasked: string;
  accountName: string;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type RefundStatus = 
  | 'REQUESTED' 
  | 'APPROVED' 
  | 'PROCESSING' 
  | 'REFUNDED' 
  | 'COMPLETED'
  | 'FAILED' 
  | 'REJECTED';

export type RefundRecord = {
  id: string;
  refundReference: string; // e.g. REF-CN-2026-001042
  bookingId: string;
  bookingReference: string;
  transactionId: string;
  paymentReference: string;
  studentId: string;
  studentName: string;
  propertyTitle: string;
  amount: number;
  currency?: 'NGN' | string;
  reason: string;
  requestedBy?: 'student' | 'admin' | 'landlord' | 'system' | string;
  status: RefundStatus;
  adminNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  gatewayRefundId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type FinancialLedgerEntry = {
  id: string;
  referenceNumber?: string;
  transactionId?: string;
  bookingReference?: string;
  entryType?: 'CREDIT' | 'DEBIT' | string;
  type?: 'CREDIT_PAYMENT' | 'DEBIT_PAYOUT' | 'DEBIT_REFUND' | 'COMMISSION_EARNED' | 'GATEWAY_FEE' | string;
  category?: string;
  amount: number;
  grossAmount?: number;
  platformFee?: number;
  providerFee?: number;
  landlordAmount?: number;
  netCampusNestEarned?: number;
  runningBalance?: number;
  currency?: 'NGN' | string;
  description: string;
  status?: 'SETTLED' | 'PENDING' | 'REVERSED' | string;
  createdAt: string;
};

export type FinancialAuditAction = 
  | 'VERIFY_PAYMENT' 
  | 'ESCROW_PAYMENT_VERIFIED'
  | 'FLAG_TRANSACTION' 
  | 'INITIATE_REFUND' 
  | 'APPROVE_REFUND' 
  | 'REJECT_REFUND' 
  | 'REFUND_PROCESSED'
  | 'CREATE_PAYOUT' 
  | 'HOLD_PAYOUT' 
  | 'PAYOUT_HOLD'
  | 'RELEASE_PAYOUT' 
  | 'PROCESS_PAYOUT' 
  | 'ESCROW_PAYOUT_DISPATCH'
  | 'UPDATE_COMMISSION_CONFIG'
  | string;

export type FinancialAuditLogEntry = {
  id: string;
  adminId?: string;
  adminName: string;
  adminRole: AdminRole | string;
  action?: FinancialAuditAction;
  actionType?: FinancialAuditAction;
  entityId?: string;
  reference?: string;
  previousState?: string;
  newState?: string;
  amount?: number;
  description?: string;
  details?: string;
  timestamp: string;
};

export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'PROPERTY_ADMIN'
  | 'VERIFICATION_ADMIN' 
  | 'SUPPORT_ADMIN' 
  | 'MODERATION_ADMIN'
  | 'FINANCE_ADMIN' 
  | 'ANALYTICS_ADMIN';

// =========================================================================
// PHASE 8: CAMPUSNEST COMPLETE ADMIN PORTAL & PLATFORM CONTROL CENTER
// =========================================================================

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  department?: string;
  is2FAEnabled: boolean;
  twoFactorSecret?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt?: string;
  createdAt: string;
};

export type AdminSession = {
  token: string;
  admin: AdminUser;
  role: AdminRole;
  authenticatedAt: string;
  expiresAt: string;
  is2FAVerified: boolean;
};

export type StudentUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  matricNumber: string;
  universityId: string;
  universityName: string;
  campusName: string;
  department: string;
  level: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  suspensionReason?: string;
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationMethod?: 'STUDENT_ID' | 'MATRIC_PORTAL' | 'UNIVERSITY_EMAIL' | 'ADMIN_MANUAL';
  studentIdCardUrl?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  savedCount: number;
  bookingsCount: number;
  reviewsCount: number;
  joinedAt: string;
  lastActiveAt?: string;
};

export type LandlordUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  organizationName?: string;
  authorizationType: LandlordAuthorizationType;
  verificationStatus: LandlordVerificationStatus;
  status: 'ACTIVE' | 'SUSPENDED';
  suspensionReason?: string;
  propertiesCount: number;
  activeListingsCount: number;
  rating: number;
  ratingCount: number;
  bankAccountMasked?: string;
  joinedAt: string;
  lastActiveAt?: string;
};

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';

export type SupportTicketCategory = 
  | 'BOOKING' 
  | 'PAYMENT' 
  | 'PROPERTY' 
  | 'VERIFICATION' 
  | 'ACCOUNT' 
  | 'DISPUTE' 
  | 'GENERAL';

export type SupportTicketMessage = {
  id: string;
  senderRole: 'STUDENT' | 'LANDLORD' | 'ADMIN' | 'SUPPORT_AGENT';
  senderName: string;
  message: string;
  timestamp: string;
  isInternalNote?: boolean;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string; // e.g. TKT-CN-2026-0042
  userRole: 'student' | 'landlord';
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedAdminName?: string;
  internalNotes?: string;
  messages: SupportTicketMessage[];
  relatedBookingRef?: string;
  relatedPropertyId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AmenityConfigItem = {
  id: string;
  name: string;
  iconName: string;
  category: 'UTILITIES' | 'SECURITY' | 'COMFORT' | 'CONNECTIVITY';
  isPopular: boolean;
  isActive: boolean;
};

export type PropertyTypeConfigItem = {
  id: string;
  code: PropertyType;
  label: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type NotificationTemplateItem = {
  id: string;
  code: string;
  title: string;
  subject: string;
  bodyTemplate: string;
  targetAudience: 'STUDENT' | 'LANDLORD' | 'ALL';
  channels: ('IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL')[];
  isActive: boolean;
};

export type SearchAnalyticsItem = {
  id: string;
  queryOrArea: string;
  searchCount: number;
  resultMatches: number;
  zeroResultsCount: number;
  conversionRate: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
};

export type PlatformGlobalSettings = {
  siteName: string;
  contactEmail: string;
  supportPhone: string;
  whatsappHelpdesk: string;
  allowNewStudentSignups: boolean;
  allowNewLandlordSignups: boolean;
  requireVerificationForPublishing: boolean;
  autoExpireBookingsHours: number;
  escrowSettlementDelayDays: number;
  maintenanceMode: boolean;
};

// =========================================================================
// PHASE 12: CAMPUSNEST MARKETING, STUDENT ACQUISITION & LANDLORD GROWTH
// =========================================================================

export type AmbassadorStatus = 'APPLIED' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';

export type CampusAmbassador = {
  id: string;
  name: string;
  email: string;
  phone: string;
  matricNumber: string;
  universityId: string;
  universityName: string;
  department: string;
  level: string;
  status: AmbassadorStatus;
  referralCode: string;
  totalClicks: number;
  totalSignups: number;
  totalVerifiedStudents: number;
  eligibleBookingsCount: number;
  earnedPoints: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  appliedAt: string;
  approvedAt?: string;
};

export type ReferralRecord = {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerRole: 'student' | 'landlord' | 'ambassador';
  referralCode: string;
  referredName: string;
  referredEmail: string;
  status: 'CLICKED' | 'REGISTERED' | 'VERIFIED' | 'BOOKED' | 'COMPLETED';
  rewardPoints: number;
  createdAt: string;
  completedAt?: string;
};

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type MarketingCampaign = {
  id: string;
  code: string;
  name: string;
  targetAudience: 'STUDENT' | 'LANDLORD' | 'ALL';
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'TIKTOK' | 'ON_CAMPUS' | 'REFERRAL' | 'SEARCH';
  headline: string;
  subtext: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  clicksCount: number;
  signupsCount: number;
  conversionsCount: number;
  budgetNgn: number;
  spendNgn: number;
};

export type PromoCodeItem = {
  id: string;
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  maxUsage: number;
  currentUsageCount: number;
  minBookingAmount: number;
  targetUserType: 'STUDENT' | 'LANDLORD' | 'ALL';
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

export type GrowthGoalItem = {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: 'STUDENTS' | 'HOSTELS' | 'BOOKINGS' | 'REVENUE';
};

export type HousingAdviceArticle = {
  id: string;
  title: string;
  slug: string;
  category: 'SAFETY' | 'INSPECTION' | 'PRICING' | 'MOVE_IN';
  summary: string;
  readTimeMins: number;
  author: string;
  publishedDate: string;
  content: string[];
  tips: string[];
};

export type StudentFeedbackSurvey = {
  id: string;
  studentName: string;
  studentEmail: string;
  universityId: string;
  biggestStruggle?: 'AGENT_FEES' | 'FAKE_LISTINGS' | 'WATER_LIGHT' | 'TRANSPORT_COMMUTE' | 'PRICING' | 'OTHER';
  whatWasDifficult?: string;
  whatDidYouLike?: string;
  whatWouldMakeEasier?: string;
  whatInformationMissing?: string;
  comments: string;
  rating: number;
  submittedAt: string;
};

// =========================================================================
// PHASE 14: ENTERPRISE EXPANSION — ROOMMATES, LIVE CHAT, CHECKLIST & CALCULATOR
// =========================================================================

export type SleepHabit = 'EARLY_BIRD' | 'NIGHT_OWL' | 'FLEXIBLE';
export type StudyHabit = 'SILENT_STUDY' | 'MUSIC_BACKGROUND' | 'GROUP_STUDY';
export type CleanlinessLevel = 'VERY_CLEAN' | 'MODERATE' | 'RELAXED';
export type CookingFrequency = 'DAILY' | 'OCCASIONAL' | 'EAT_OUT';

export type RoommateProfile = {
  id: string;
  studentId: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  department: string;
  level: string;
  avatarUrl: string;
  budgetPerPerson: number;
  preferredZoneId: string;
  preferredZoneName: string;
  sleepHabit: SleepHabit;
  studyHabit: StudyHabit;
  cleanliness: CleanlinessLevel;
  cookingFrequency: CookingFrequency;
  hasHostelAlready: boolean;
  targetHostelTitle?: string;
  bio: string;
  phone: string;
  whatsapp: string;
  isVerifiedStudent: boolean;
  compatibilityScore?: number;
  status: 'LOOKING' | 'MATCHED' | 'PAUSED';
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'landlord' | 'support' | 'admin';
  text: string;
  timestamp: string;
  isRead: boolean;
  quickAction?: string;
};

export type ChatConversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: 'landlord' | 'support';
  participantAvatar?: string;
  propertyId?: string;
  propertyTitle?: string;
  zoneName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
};

export type MoveInChecklistCategory = 'PRE_PAYMENT' | 'MOVE_IN_DAY' | 'SETTLING_IN' | 'CAMPUS_SECURITY';

export type MoveInChecklistItem = {
  id: string;
  category: MoveInChecklistCategory;
  title: string;
  description: string;
  isCompleted: boolean;
  criticalTip?: string;
};

export type ApplianceUsageItem = {
  id: string;
  name: string;
  category: 'COOKING' | 'COOLING' | 'ELECTRONICS' | 'LIGHTING' | 'UTILITY';
  wattage: number;
  defaultDailyHours: number;
  currentDailyHours: number;
  count: number;
  iconName: string;
};

