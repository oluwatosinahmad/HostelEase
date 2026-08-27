export type UserRole = 'STUDENT' | 'PROVIDER' | 'ADMIN' | 'AGENT';
export type AppView = 'home' | 'search' | 'saved' | 'community' | 'student-dashboard' | 'provider-portal' | 'admin-portal' | 'agent-portal' | 'messages' | 'inspections' | 'bookings' | 'payments' | 'move-in' | 'history';

export type PropertyType = 'SELF_CONTAIN' | 'SINGLE_ROOM' | 'FLAT' | 'SHARED_BEDSPACE';
export type GenderPreference = 'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY';
export type VerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type AvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL' | 'FULLY_OCCUPIED' | 'UNAVAILABLE';
export type MediaCategory = 'EXTERIOR' | 'BEDROOM' | 'BATHROOM' | 'KITCHEN' | 'COMPOUND' | 'FACILITY' | 'FACILITIES' | 'OTHER' | 'VIDEO_WALKTHROUGH';
export type InspectionType = 'PHYSICAL' | 'VIRTUAL';
export type InspectionStatus = 'PENDING' | 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ProviderType = 'HOSTEL_OWNER' | 'PROPERTY_OWNER' | 'HOSTEL_MANAGER' | 'PROPERTY_MANAGER' | 'AUTHORIZED_REP';
export type PreferredContactMethod = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'ANY';

export type VerificationDocumentType = 
  | 'NIN_CARD' 
  | 'DRIVERS_LICENSE' 
  | 'VOTERS_CARD' 
  | 'PASSPORT' 
  | 'CAC_CERTIFICATE' 
  | 'PROOF_OF_OWNERSHIP' 
  | 'MANAGEMENT_AUTHORIZATION' 
  | 'UTILITY_BILL' 
  | 'OTHER';

export type ReportReason = 
  | 'FAKE_HOSTEL' 
  | 'WRONG_PRICE' 
  | 'WRONG_PHOTOS' 
  | 'HOSTEL_UNAVAILABLE' 
  | 'SUSPICIOUS_PROVIDER' 
  | 'MISLEADING_INFO' 
  | 'WRONG_LOCATION' 
  | 'OTHER';
export type ReportStatus = 'OPEN' | 'PENDING' | 'UNDER_REVIEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: number;
  avatarUrl?: string;
  profile?: StudentProfile | ProviderProfile | AgentProfile | null;
}

export interface StudentProfile {
  id: string;
  userId: string;
  universityId: string;
  matricNo?: string;
  department?: string;
  level?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface ProviderProfile {
  id: string;
  userId: string;
  businessName?: string;
  address?: string;
  providerType?: ProviderType;
  idType?: string;
  bio?: string;
  preferredContactMethod?: PreferredContactMethod;
  verificationStatus: VerificationStatus;
  phoneVerified?: number;
  adminFeedback?: string;
  verifiedAt?: string;
}

export interface VerificationDocument {
  id: string;
  providerId?: string;
  documentType: VerificationDocumentType;
  fileUrl: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminFeedback?: string;
  createdAt: string;
}

export interface Bedspace {
  id: string;
  roomId: string;
  bedspaceNumber: string;
  isOccupied: boolean;
  priceOverride?: number;
  genderPreference?: GenderPreference;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
}

export interface Area {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  description?: string;
  landmark?: string;
  approxDistanceMinKm: number;
  approxDistanceMaxKm: number;
  centerLat?: number;
  centerLng?: number;
  propertyCount?: number;
  minRent?: number;
  maxRent?: number;
}

export interface Amenity {
  id: string;
  key: string;
  name: string;
  category: string;
  icon: string;
  description?: string;
  isAvailable?: boolean;
  notes?: string;
}

export interface PropertyMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  category: MediaCategory;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  displayOrder: number;
  isCover: boolean;
  isVerified?: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: PropertyType;
  maxOccupants: number;
  quantityTotal: number;
  quantityAvailable: number;
  occupiedCount?: number;
  isEnsuite: boolean;
  isFurnished: boolean;
  status?: string;
  bedspaces?: Bedspace[];
}

export interface PriceBreakdown {
  id?: string;
  roomId?: string;
  period: 'YEARLY' | 'SEMESTER' | 'MONTHLY';
  rentAmount: number;
  serviceCharge: number;
  agencyFee: number;
  cautionFee: number;
  otherMandatoryCharges: number;
  legalFee: number;
  totalMandatoryCost: number;
  totalRefundableCost: number;
  isNegotiable?: boolean;
  notes?: string;
}

export interface PriceHistoryItem {
  id: string;
  previousRent: number;
  newRent: number;
  previousTotalMandatory: number;
  newTotalMandatory: number;
  changeReason?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
}

export interface Property {
  id: string;
  title: string;
  slug: string;
  description: string;
  address: string;
  nearbyLandmark?: string;
  latitude?: number;
  longitude?: number;
  distanceFromCampusKm: number;
  propertyType: PropertyType;
  genderPreference: GenderPreference;
  totalRooms: number;
  verificationStatus: VerificationStatus;
  availabilityStatus: AvailabilityStatus;
  isDemo: boolean;
  isFeatured: boolean;
  adminFeedbackNotes?: string;
  rejectionReason?: string;
  completenessScore?: number;
  createdAt: string;
  updatedAt?: string;
  area: {
    id: string;
    name: string;
    slug?: string;
    landmark?: string;
  };
  coverImage: string;
  coverImageCaption?: string;
  priceSummary?: {
    period?: string;
    rentAmount: number;
    serviceCharge?: number;
    agencyFee?: number;
    cautionFee?: number;
    otherMandatoryCharges?: number;
    legalFee?: number;
    totalMandatoryCost: number;
    totalRefundableCost?: number;
    isNegotiable?: boolean;
  } | null;
  keyAmenities?: Amenity[];
  amenities?: Amenity[];
  rooms?: Room[];
  prices?: PriceBreakdown[];
  media?: PropertyMedia[];
  provider?: {
    id?: string;
    name: string;
    businessName?: string;
    phone?: string;
    verificationStatus?: string;
    providerType?: string;
    bio?: string;
  };
  reviews?: any[];
  isSaved?: boolean;
}

export interface PublicProviderProfile {
  id: string;
  fullName: string;
  businessName: string;
  avatarUrl?: string;
  providerType: ProviderType;
  bio: string;
  verificationStatus: VerificationStatus;
  phoneVerified: boolean;
  preferredContactMethod: PreferredContactMethod;
  joinedDate: string;
  activeHostelsCount: number;
  properties: Property[];
}

export interface InspectionRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress?: string;
  nearbyLandmark?: string;
  areaName?: string;
  coverImage?: string;
  roomId?: string;
  roomName?: string;
  inspectionType: InspectionType;
  preferredDate: string;
  preferredTime: string;
  proposedAlternativeDate?: string;
  proposedAlternativeTime?: string;
  studentPhone?: string;
  notes?: string;
  status: InspectionStatus;
  providerResponse?: string;
  rescheduleReason?: string;
  cancellationReason?: string;
  virtualMeetingUrl?: string | null;
  privateStudentNotes?: string | null;
  feedbackRating?: number;
  feedbackComment?: string;
  studentName?: string;
  studentEmail?: string;
  providerName?: string;
  providerPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCoverImage: string;
  areaName: string;
  studentId: string;
  studentName: string;
  providerId: string;
  providerName: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'BLOCKED';
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'STUDENT' | 'PROVIDER' | 'SYSTEM';
  messageType: 'TEXT' | 'SYSTEM_EVENT' | 'QUICK_QUESTION' | 'INSPECTION_SHORTCUT';
  content: string;
  metadata?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ConversationDetail {
  conversation: {
    id: string;
    property: {
      id: string;
      title: string;
      address: string;
      areaName: string;
      propertyType: PropertyType;
      distanceFromCampusKm: number;
      rentAmount: number;
      totalMandatoryCost: number;
      coverImage: string;
    };
    student: { id: string; name: string };
    provider: { id: string; name: string };
    status: string;
    createdAt: string;
  };
  messages: MessageItem[];
}

export interface ProviderCalendarData {
  todayCount: number;
  tomorrowCount: number;
  upcomingCount: number;
  pendingCount: number;
  today: InspectionRequest[];
  tomorrow: InspectionRequest[];
  upcoming: InspectionRequest[];
  pending: InspectionRequest[];
  completed: InspectionRequest[];
}

export interface ListingReport {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertySlug?: string;
  propertyVerificationStatus?: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  adminActionNotes?: string;
  reporterName?: string;
  reporterEmail?: string;
  providerName?: string;
  providerPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SearchFilterState {
  search: string;
  areaId: string;
  minPrice: number | '';
  maxPrice: number | '';
  maxDistance: number | '';
  roomType: string;
  genderPreference: string;
  availability: string;
  verifiedOnly: boolean;
  facilities: string[];
  sortBy: string;
  page: number;
}

// Phase 3 Types
export interface MapMarker {
  id: string;
  title: string;
  slug: string;
  address: string;
  landmark?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  propertyType: PropertyType;
  rentAmount: number;
  totalMandatoryCost: number;
  verificationStatus: VerificationStatus;
  availabilityStatus: AvailabilityStatus;
  isFeatured: boolean;
  completenessScore: number;
  area: { id: string; name: string };
  coverImage: string;
}

export interface CampusLandmark {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  desc: string;
}

export interface MapDataResponse {
  campusCenter: { name: string; lat: number; lng: number; zoom: number };
  campusLandmarks: CampusLandmark[];
  totalCount: number;
  markers: MapMarker[];
}

export interface HostelComparisonItem {
  id: string;
  title: string;
  slug: string;
  address: string;
  nearbyLandmark?: string;
  distanceFromCampusKm: number;
  propertyType: PropertyType;
  genderPreference: GenderPreference;
  verificationStatus: VerificationStatus;
  availabilityStatus: AvailabilityStatus;
  isFeatured: boolean;
  completenessScore: number;
  area: { id: string; name: string };
  coverImage: string;
  pricing: {
    rentAmount: number;
    serviceCharge: number;
    agencyFee: number;
    cautionFee: number;
    otherCharges: number;
    totalMandatoryCost: number;
    totalFirstYearEstimated: number;
    notes?: string;
  };
  facilitiesMap: {
    electricity: boolean;
    water: boolean;
    wifi: boolean;
    security: boolean;
    kitchen: boolean;
    generator: boolean;
    inverter: boolean;
    parking: boolean;
    cctv: boolean;
    tiled: boolean;
    wardrobe: boolean;
  };
  amenitiesList: any[];
  roomsList: any[];
  providerName: string;
  rating: { avg: number; count: number };
}

export interface HostelComparisonResult {
  count: number;
  hostels: HostelComparisonItem[];
  highlights: {
    lowestPriceId: string;
    closestDistanceId: string;
  };
}

export interface RecommendedProperty extends Property {
  matchScore: number;
  matchExplanation: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: Partial<SearchFilterState>;
  resultCount: number;
  createdAt: string;
}

export interface RecentlyViewedItem {
  id: string;
  title: string;
  slug: string;
  areaName: string;
  distanceFromCampusKm: number;
  propertyType: PropertyType;
  rentAmount: number;
  totalMandatoryCost: number;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  coverImage: string;
  viewedAt: string;
}

export interface SmartSearchResponse {
  query: string;
  interpretedFilters: Partial<SearchFilterState>;
  explanation: string[];
  resultCount: number;
  properties: Property[];
}

export type BookingStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'DECLINED' 
  | 'CANCELLED_BY_STUDENT' 
  | 'CANCELLED_BY_PROVIDER' 
  | 'EXPIRED' 
  | 'COMPLETED';

export interface BedspaceAvailability {
  id: string;
  bedspaceNumber: string;
  isOccupied: boolean;
  priceOverride?: number;
  genderPreference: string;
  status: string;
}

export interface RoomAvailability {
  id: string;
  name: string;
  type: PropertyType;
  maxOccupants: number;
  quantityTotal: number;
  quantityAvailable: number;
  occupiedCount: number;
  isEnsuite: boolean;
  isFurnished: boolean;
  status: string;
  pricing: {
    rentAmount: number;
    serviceCharge: number;
    agencyFee: number;
    cautionDeposit: number;
    otherCharges: number;
    totalCost: number;
  };
  bedspaces: BedspaceAvailability[];
}

export interface PropertyAvailabilityResponse {
  propertyId: string;
  title: string;
  availabilityStatus: AvailabilityStatus;
  rooms: RoomAvailability[];
}

export interface BookingItem {
  id: string;
  bookingReference: string;
  propertyId: string;
  propertyTitle: string;
  propertyCoverImage: string;
  distanceFromCampusKm: number;
  areaName: string;
  roomId: string;
  roomName: string;
  roomType: PropertyType;
  bedspaceId?: string;
  bedspaceNumber?: string;
  moveInDate: string;
  academicSession: string;
  durationMonths: number;
  rentAmount: number;
  serviceCharge: number;
  agencyFee: number;
  cautionDeposit: number;
  otherCharges: number;
  totalCost: number;
  status: BookingStatus;
  expiresAt: string;
  cancellationReason?: string;
  declineReason?: string;
  specialRequests?: string;
  paymentStatus?: 'UNPAID' | 'PENDING_PAYMENT' | 'PAID' | 'REFUNDED';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
}

export interface BookingHistoryItem {
  id: string;
  actorId: string;
  actorRole: UserRole | 'SYSTEM';
  actorName: string;
  previousStatus?: BookingStatus;
  newStatus: BookingStatus;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface BookingDetail {
  id: string;
  bookingReference: string;
  property: {
    id: string;
    title: string;
    address: string;
    coverImage: string;
    areaName: string;
    nearbyLandmark?: string;
    distanceFromCampusKm: number;
  };
  room: {
    id: string;
    name: string;
    type: PropertyType;
    isEnsuite: boolean;
  };
  bedspace?: {
    id: string;
    number: string;
  } | null;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  provider: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  pricing: {
    rentAmount: number;
    serviceCharge: number;
    agencyFee: number;
    cautionDeposit: number;
    otherCharges: number;
    totalCost: number;
  };
  moveInDate: string;
  academicSession: string;
  durationMonths: number;
  status: BookingStatus;
  expiresAt: string;
  cancellationReason?: string;
  declineReason?: string;
  specialRequests?: string;
  paymentStatus?: 'UNPAID' | 'PENDING_PAYMENT' | 'PAID' | 'REFUNDED';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------------------------------
// Phase 6 Payment & Financial Types
// --------------------------------------------------------------------------
export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'EXPIRED' 
  | 'REFUNDED' 
  | 'PARTIALLY_REFUNDED';

export type PaymentMethodType = 'CARD' | 'BANK_TRANSFER' | 'USSD' | 'BANK_ACCOUNT';
export type PaymentGatewayType = 'PAYSTACK' | 'FLUTTERWAVE' | 'TEST_GATEWAY';

export interface PaymentBreakdown {
  rentAmount: number;
  serviceCharge: number;
  agencyFee: number;
  cautionDeposit: number;
  otherCharges: number;
  bookingSubtotal: number;
  platformFee: number;
  totalAmount: number;
}

export interface PaymentItem {
  id: string;
  paymentReference: string;
  bookingId: string;
  bookingReference: string;
  amount: number;
  platformFee: number;
  currency: string;
  paymentProvider: PaymentGatewayType;
  paymentMethod: PaymentMethodType;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    address: string;
    areaName: string;
  };
  room: {
    name: string;
    type: PropertyType;
    bedspaceNumber?: string;
  };
  breakdown?: PaymentBreakdown;
}

export interface PaymentReceipt {
  receiptNumber: string;
  paymentReference: string;
  bookingReference: string;
  status: PaymentStatus;
  issuedAt: string;
  paymentMethod: PaymentMethodType;
  paymentProvider: string;
  providerTransactionRef?: string;
  currency: string;
  totalPaid: number;
  platformFee: number;
  providerAmount: number;
  breakdown?: PaymentBreakdown;
  student: {
    name: string;
    email: string;
    phone?: string;
  };
  provider: {
    name: string;
    email: string;
    phone?: string;
  };
  accommodation: {
    title: string;
    address: string;
    area: string;
    roomName: string;
    roomType: PropertyType;
    bedspaceNumber?: string;
    moveInDate: string;
    academicSession: string;
  };
  verificationHash: string;
}

export interface ProviderFinancialsData {
  metrics: {
    totalRevenue: number;
    pendingRevenue: number;
    refundedAmount: number;
    paidBookingsCount: number;
    pendingPaymentsCount: number;
    totalTransactionsCount: number;
  };
  propertyRevenue: Array<{
    propertyId: string;
    propertyTitle: string;
    areaName: string;
    revenue: number;
    paidCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    paymentReference: string;
    bookingReference: string;
    propertyTitle: string;
    roomName: string;
    studentName: string;
    amount: number;
    status: PaymentStatus;
    paidAt?: string;
    createdAt: string;
  }>;
  payoutAccount?: {
    bankName: string;
    bankCode: string;
    accountName: string;
    accountNumberMasked: string;
    isVerified: boolean;
  } | null;
}

export interface FinancialLedgerRecord {
  id: string;
  entryType: 'PAYMENT_RECEIVED' | 'PLATFORM_FEE_DEDUCTED' | 'PROVIDER_EARNING_CREDITED' | 'REFUND_DEBITED' | 'PAYOUT_PROCESSED';
  amount: number;
  currency: string;
  debitAccount: string;
  creditAccount: string;
  description: string;
  createdAt: string;
  paymentReference?: string;
  bookingReference?: string;
}

export interface AdminFinancialsData {
  metrics: {
    totalGmv: number;
    totalPlatformFees: number;
    totalProviderEarnings: number;
    totalRefunded: number;
    successCount: number;
    pendingCount: number;
    failedCount: number;
    refundedCount: number;
    totalTransactions: number;
  };
  ledgerStream: FinancialLedgerRecord[];
  disputes: Array<{
    id: string;
    disputeReference: string;
    reason: string;
    status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
    createdAt: string;
    bookingReference: string;
    studentName: string;
    providerName: string;
    paymentAmount?: number;
  }>;
}

// ----------------------------------------------------
// PHASE 7: STUDENT DASHBOARD & PERSONALIZATION TYPES
// ----------------------------------------------------

export interface StudentPreferences {
  id?: string;
  minBudget: number;
  maxBudget: number;
  preferredAreas: string[];
  preferredRoomTypes: PropertyType[];
  preferredFacilities: string[];
  maxDistanceKm: number;
  genderPreference: GenderPreference;
  preferredMoveInDate?: string | null;
  isMoveInFlexible: boolean;
  academicSession: string;
  onboardingCompleted?: boolean;
}

export interface StudentDashboardSummary {
  savedCount: number;
  pendingInspectionsCount: number;
  activeBookingsCount: number;
  pendingPaymentsCount: number;
  unreadMessagesCount: number;
}

export interface StudentDashboardAction {
  type: string;
  priority: number;
  badge: string;
  badgeColor: string;
  title: string;
  message: string;
  bookingId?: string;
  inspectionId?: string;
  propertyId?: string;
  amount?: number;
  actionLabel: string;
  actionType: 'PAY_NOW' | 'VIEW_INSPECTION' | 'VIEW_BOOKINGS' | 'VIEW_INSPECTIONS' | 'VIEW_MESSAGES' | 'COMPARE_SAVED' | 'EXPLORE_HOSTELS';
}

export interface StudentDashboardActiveBooking {
  id: string;
  bookingReference: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  coverImage: string;
  distanceFromCampusKm: number;
  roomName: string;
  roomType: PropertyType;
  bedspaceNumber?: string;
  moveInDate: string;
  academicSession: string;
  totalCost: number;
  rentAmount: number;
  status: BookingStatus;
  paymentStatus: 'UNPAID' | 'PENDING_PAYMENT' | 'PAID' | 'REFUNDED';
  paidAt?: string;
  expiresAt: string;
  provider: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface StudentDashboardUpcomingInspection {
  id: string;
  propertyTitle: string;
  propertyAddress: string;
  date: string;
  time: string;
  type: string;
  status: string;
  provider: {
    name: string;
    phone?: string;
  };
}

export interface StudentDashboardSavedHostel extends Property {
  savedId: string;
  savedAt: string;
  priceChanged: boolean;
  priceChangeDetails?: string | null;
  availabilityChanged: boolean;
  availabilityAlert?: string | null;
}

export interface RecentlyViewedHostelItem extends Property {
  viewedAt: string;
}

export interface StudentSearchHistoryItem {
  id: string;
  queryText: string;
  filters?: any;
  createdAt: string;
}

export interface StudentNotificationPreferences {
  inspectionReminders: boolean;
  availabilityAlerts: boolean;
  priceAlerts: boolean;
  recommendationAlerts: boolean;
}

export interface StudentProfileCompleteness {
  score: number;
  missingFields: string[];
}

export interface StudentDashboardData {
  summary: StudentDashboardSummary;
  urgentAction: StudentDashboardAction | null;
  actionQueue: StudentDashboardAction[];
  activeBooking: StudentDashboardActiveBooking | null;
  pendingBookings: Array<{
    id: string;
    bookingReference: string;
    status: BookingStatus;
    createdAt: string;
    expiresAt: string;
    totalCost: number;
    propertyTitle: string;
    roomName: string;
  }>;
  pendingPayments: Array<{
    id: string;
    bookingReference: string;
    totalCost: number;
    status: string;
    paymentStatus: string;
    propertyTitle: string;
    roomName: string;
    totalPayable: number;
  }>;
  upcomingInspection: StudentDashboardUpcomingInspection | null;
  recentInspections: Array<{
    id: string;
    inspectionType: string;
    preferredDate: string;
    preferredTime: string;
    status: string;
    propertyTitle: string;
    propertyId: string;
  }>;
  recentMessages: Array<{
    id: string;
    propertyId: string;
    content: string;
    createdAt: string;
    isRead: number;
    propertyTitle: string;
    otherPartyName: string;
  }>;
  savedHostels: StudentDashboardSavedHostel[];
  recentlyViewed: RecentlyViewedHostelItem[];
  recommendedHostels: Array<Property & {
    matchScore: number;
    explanationReasons: string[];
  }>;
  preferences: StudentPreferences;
  profileCompleteness: StudentProfileCompleteness;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    department?: string;
    level?: string;
    matricNo?: string;
    gender?: string;
    avatarUrl?: string;
  };
}

// --------------------------------------------------------------------------
// Phase 8 AI Accommodation Assistant Types
// --------------------------------------------------------------------------
export interface AIConversation {
  id: string;
  student_id: string;
  title: string;
  context_type: 'GENERAL' | 'HOSTEL_DETAILS' | 'SEARCH' | 'INSPECTION' | 'BOOKING' | 'COMPARISON';
  context_property_id?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

export interface AIActionPrompt {
  actionType: 'SAVE_HOSTEL' | 'REQUEST_INSPECTION' | 'VIEW_BOOKING' | 'PAY_NOW' | 'APPLY_FILTERS';
  title: string;
  description: string;
  payload: any;
  confirmLabel: string;
  cancelLabel: string;
}

export interface AIInspectionCategory {
  name: string;
  icon: string;
  checks: string[];
}

export interface AIInspectionChecklist {
  propertyTitle: string;
  propertyId?: string | null;
  categories: AIInspectionCategory[];
}

export interface AIScamAssessment {
  isHighRisk: boolean;
  warningFlags: string[];
  advice: string;
}

export interface AIStructuredData {
  type: 'HOSTEL_LIST' | 'HOSTEL_COMPARISON' | 'INSPECTION_CHECKLIST' | 'SCAM_ALERT' | 'ACTION_CONFIRMATION' | 'DASHBOARD_SUMMARY' | 'CLARIFYING_QUESTION';
  properties?: Array<{
    id: string;
    title: string;
    address: string;
    areaName: string;
    distanceFromCampusKm: number;
    propertyType: string;
    genderPreference: string;
    verificationStatus: string;
    availabilityStatus: string;
    coverImage: string;
    rentAmount: number;
    totalMandatoryCost: number;
    availableBedspaces?: number;
    amenities: string[];
    updatedAt?: string;
  }>;
  comparison?: {
    properties: any[];
    insights: {
      cheapest: { id: string; title: string; rentAmount: number };
      closest: { id: string; title: string; distanceKm: number };
      mostEquipped: { id: string; title: string; amenityCount: number };
    };
  };
  checklist?: AIInspectionChecklist;
  scamAssessment?: AIScamAssessment;
  actionPrompt?: AIActionPrompt;
  suggestedQueries?: string[];
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  structured_data?: string | null;
  structuredData?: AIStructuredData | null;
  tool_calls?: string | null;
  toolCalls?: string[] | null;
  created_at: string;
}

export interface AIChatResponse {
  conversationId: string;
  messageId: string;
  response: string;
  structuredData?: AIStructuredData;
  toolsUsed?: string[];
}

export interface AIAdminStats {
  totalQueries: number;
  successRate: number;
  rateLimitedCount: number;
  toolExecutions: Array<{ tool_name: string; count: number }>;
  feedbackCounts: Array<{ rating: string; count: number }>;
  recentLogs: Array<{
    id: string;
    endpoint: string;
    query_text: string;
    tool_name: string;
    status: string;
    latency_ms: number;
    created_at: string;
  }>;
}

// =============================================================================
// PHASE 9: PROVIDER PORTAL & HOSTEL MANAGEMENT TYPES
// =============================================================================
export interface ProviderInspectionSchedule {
  id: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  propertyId?: string | null;
}

export interface ProviderQuickReply {
  id: string;
  title: string;
  messageText: string;
  category: string;
  usageCount: number;
}

export interface ProviderTeamMember {
  id: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  createdAt: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  propertyTitle?: string;
}

export interface ProviderPerformanceFunnel {
  funnel: {
    views: number;
    saves: number;
    inspections: number;
    bookingRequests: number;
    confirmedBookings: number;
    conversionRate: string;
  };
  reviews: {
    totalReviews: number;
    averageRating: number;
    items: Array<{
      id: string;
      rating: number;
      clean_rating?: number;
      security_rating?: number;
      water_rating?: number;
      electricity_rating?: number;
      comment: string;
      created_at: string;
      property_title: string;
      student_name: string;
    }>;
  };
}

export interface ProviderCalendarEvent {
  id: string;
  type: 'BOOKING_MOVE_IN' | 'INSPECTION' | 'AVAILABILITY_BLOCK';
  title: string;
  date: string;
  time?: string;
  propertyTitle: string;
  status: string;
  badgeLabel: string;
  details: string;
}

export interface ProviderOnboardingData {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  businessRegNo: string;
  managementType: string;
  address: string;
  idType: string;
  verificationStatus: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

export interface ProviderDashboardData {
  stats: {
    totalHostels: number;
    activeListings: number;
    pendingApproval: number;
    drafts: number;
    totalCapacity: number;
    availableSpaces: number;
    occupiedSpaces: number;
    reservedSpaces: number;
    pendingBookings: number;
    confirmedBookings: number;
    pendingInspections: number;
    upcomingInspections: number;
    unreadMessages: number;
    pendingPayments: number;
    totalRevenue: number;
    verificationStatus: string;
  };
  properties: Array<any>;
  actionRequired: Array<{
    type: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaTab: string;
  }>;
  qualityAlerts: Array<{
    propertyId: string;
    propertyTitle: string;
    type: string;
    message: string;
  }>;
  onboarding: {
    completed: boolean;
    step: number;
  };
}

// =============================================================================
// PHASE 10: ADMIN CONTROL CENTER & TRUST SYSTEM TYPES
// =============================================================================
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'VERIFICATION_ADMIN' | 'SUPPORT_ADMIN' | 'FINANCE_ADMIN' | 'MODERATION_ADMIN';

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'STUDENT' | 'PROVIDER' | 'ADMIN';
  isActive: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DEACTIVATED';
  statusReason?: string;
  studentBookingsCount?: number;
  providerHostelsCount?: number;
  createdAt: string;
}

export interface AdminProviderItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  accountStatus: string;
  businessName?: string;
  providerType: string;
  managementType: string;
  officeLocation?: string;
  verificationStatus: string;
  phoneVerified: boolean;
  adminFeedback?: string;
  verifiedAt?: string;
  propertiesCount: number;
  totalBookingsCount: number;
  createdAt: string;
}

export interface AdminHostelItem {
  id: string;
  title: string;
  slug: string;
  address: string;
  nearbyLandmark?: string;
  distanceFromCampusKm: number;
  propertyType: string;
  genderPreference: string;
  totalRooms: number;
  verificationStatus: string;
  availabilityStatus: string;
  completenessScore: number;
  coverImage: string;
  rentAmount: number;
  totalMandatoryCost: number;
  areaName: string;
  provider: {
    name: string;
    phone?: string;
    email: string;
  };
  createdAt: string;
}

export interface VerificationChecklist {
  identityVerified: boolean;
  locationConfirmed: boolean;
  genuinePhotos: boolean;
  transparentPricing: boolean;
  structuralSafety: boolean;
  waterPowerVerified: boolean;
  roomCountAccurate: boolean;
  physicalVisitDone: boolean;
}

export interface AdminSupportTicket {
  id: string;
  ticketCode: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  userName: string;
  userEmail: string;
  userRole: string;
  assignedAdminName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'USER' | 'ADMIN';
  message: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface PlatformAnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetAudience: 'ALL' | 'STUDENTS' | 'PROVIDERS';
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  isPublished: boolean;
  authorName?: string;
  createdAt: string;
}

export interface SystemHealthService {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  details: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface AdminDashboardData {
  admin: {
    id: string;
    fullName: string;
    email: string;
    role: AdminRole;
    department: string;
    isSuperAdmin: boolean;
  };
  stats: {
    totalStudents: number;
    totalProviders: number;
    totalHostels: number;
    verifiedHostels: number;
    pendingHostels: number;
    activeBookings: number;
    pendingBookings: number;
    successfulPayments: number;
    pendingPayments: number;
    totalRefunds: number;
    openReports: number;
    upcomingInspections: number;
    openSupportTickets: number;
    totalGrossRevenue: number;
  };
  stressMetrics: {
    searchToBookingConversion: string;
    bookingCancellationRate: string;
    avgViewsPerBooking: string;
    totalSearches: number;
    totalViews: number;
    totalInspections: number;
    totalBookingsAll: number;
    avgSearchToInspectionDays: string;
  };
}

// =============================================================================
// PHASE 11: TRANSACTION & DISPUTE INTERFACES
// =============================================================================

export interface BookingReviewData {
  bookingId: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  isPaid: boolean;
  paidAt?: string;
  expiresAt: string;
  moveInDate: string;
  durationMonths: number;
  academicSession: string;
  hostel: {
    id: string;
    title: string;
    address: string;
    coverImage: string;
    areaName: string;
    distanceFromCampusKm: number;
    verificationStatus: string;
    isVerified: boolean;
    rules: string[];
  };
  room: {
    id: string;
    name: string;
    type: string;
    maxOccupants: number;
    isEnsuite: boolean;
    isFurnished: boolean;
    bedspace: string;
  };
  provider: {
    id: string;
    name: string;
    phone: string;
    email: string;
    managementType: string;
    isVerified: boolean;
  };
  priceBreakdown: {
    baseRent: number;
    serviceCharge: number;
    agencyFee: number;
    cautionDeposit: number;
    otherCharges: number;
    platformFee: number;
    totalMandatory: number;
    totalAmount: number;
    optionalCharges: Array<{
      id: string;
      title: string;
      amount: number;
      isSelected: boolean;
    }>;
  };
  cancellationPolicy: {
    policyType: string;
    summary: string;
    freeCancellationWindowHours: number;
    refundableCautionDeposit: boolean;
  };
}

export interface CancellationPreviewData {
  bookingId: string;
  bookingReference: string;
  propertyTitle: string;
  currentStatus: string;
  isPaid: boolean;
  originalPayment: number;
  cancellationFee: number;
  expectedRefund: number;
  refundMethod: string;
  isFreeWindow: boolean;
  hoursSinceCreated: number;
  policyTerms: string;
}

export interface AlternativeHostelRecommendation {
  id: string;
  title: string;
  slug: string;
  address: string;
  distanceFromCampusKm: number;
  coverImage: string;
  rentAmount: number;
  totalMandatoryCost: number;
  areaName: string;
  isVerified: boolean;
}

export interface MoveInChecklistData {
  bookingId: string;
  bookingReference: string;
  propertyTitle: string;
  moveInDate: string;
  providerPhone: string;
  checklist: {
    confirmMoveInDate: boolean;
    saveVoucher: boolean;
    contactLandlord: boolean;
    reviewHostelRules: boolean;
    prepareDocuments: boolean;
    confirmZeroOutstandingBalance: boolean;
    getDirections: boolean;
  };
  isCompleted: boolean;
}

export type DisputeCategory = 
  | 'HOSTEL_NOT_AS_DESCRIBED'
  | 'PROVIDER_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'BOOKING_ISSUE'
  | 'REFUND_ISSUE'
  | 'INSPECTION_ISSUE'
  | 'SAFETY_ISSUE'
  | 'OTHER';

export type DisputeStatus = 
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'WAITING_FOR_INFORMATION'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type DisputeResolutionType = 
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'NO_ACTION'
  | 'PROVIDER_WARNING'
  | 'LISTING_SUSPENDED'
  | 'OTHER';

export interface DisputeItem {
  id: string;
  disputeCode: string;
  bookingId: string;
  bookingReference: string;
  propertyTitle: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  status: DisputeStatus;
  resolutionType?: DisputeResolutionType;
  resolutionNotes?: string;
  refundAmount?: number;
  studentName: string;
  studentEmail?: string;
  providerName: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DisputeMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'STUDENT' | 'PROVIDER' | 'ADMIN';
  message: string;
  evidence?: string[];
  isInternalNote: boolean;
  createdAt: string;
}

// =============================================================================
// PHASE 12: MOVE-IN & POST-BOOKING EXPERIENCE TYPES
// =============================================================================
export type MoveInStatus = 
  | 'NOT_STARTED'
  | 'PREPARING'
  | 'READY'
  | 'MOVE_IN_DAY'
  | 'ARRIVED'
  | 'MOVED_IN'
  | 'COMPLETED'
  | 'CANCELLED';

export interface MoveInChecklistItem {
  id: string;
  category: 'BEFORE_MOVE_IN' | 'MOVE_IN_DAY';
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface MoveInPhoto {
  id: string;
  photoUrl: string;
  category: string;
  caption?: string;
  createdAt: string;
}

export type MoveInIssueCategory = 
  | 'ELECTRICITY'
  | 'WATER'
  | 'ROOM'
  | 'FURNITURE'
  | 'SECURITY'
  | 'CLEANLINESS'
  | 'BATHROOM'
  | 'INTERNET'
  | 'OTHER';

export type MoveInIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MoveInIssueStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'WAITING_FOR_STUDENT' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';

export interface MoveInIssue {
  id: string;
  issueCode: string;
  category: MoveInIssueCategory;
  severity: MoveInIssueSeverity;
  status: MoveInIssueStatus;
  title: string;
  description: string;
  evidence: string[];
  providerResponse?: string;
  providerActionDate?: string;
  studentConfirmedResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoveInConditionReport {
  overallCondition: 'GOOD' | 'MINOR_ISSUES' | 'MAJOR_ISSUES' | 'NOT_AS_DESCRIBED';
  roomChecks: Record<string, boolean>;
  comments?: string;
}

export interface MoveInDashboardData {
  id: string;
  bookingId: string;
  status: MoveInStatus;
  moveInDate: string;
  scheduledArrivalTime: string;
  countdownText: string;
  diffDays: number;
  arrivalConfirmedAt?: string;
  acceptedAt?: string;
  postMoveInRating?: string;
  postMoveInFeedback?: string;
  instructions: string;
  keyCollectionPoint: string;
  emergencyContactPhone: string;
  hostel: {
    id: string;
    title: string;
    address: string;
    coverImage: string;
    areaName: string;
    distanceFromCampusKm: number;
    nearbyLandmark: string;
    latitude: number;
    longitude: number;
  };
  room: {
    id: string;
    name: string;
    type: string;
    isEnsuite: boolean;
    isFurnished: boolean;
    bedspaceNumber: string;
  };
  provider: {
    id: string;
    name: string;
    businessName?: string;
    phone?: string;
    email?: string;
    officeLocation?: string;
  };
  payment: {
    status: string;
    isPaid: boolean;
    rentAmount: number;
    serviceCharge: number;
    cautionDeposit: number;
    totalCost: number;
    outstandingAmount: number;
  };
  checklist: {
    items: MoveInChecklistItem[];
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
    isCompleted: boolean;
  };
  photos: MoveInPhoto[];
  issues: MoveInIssue[];
}

export interface AccommodationStay {
  bookingId: string;
  bookingReference: string;
  bookingStatus: string;
  paymentStatus: string;
  moveInDate: string;
  durationMonths: number;
  academicSession: string;
  rentAmount: number;
  cautionDeposit: number;
  bookedAt: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  areaName: string;
  coverImage?: string;
  roomName: string;
  roomType: string;
  providerName: string;
  moveInStatus?: MoveInStatus;
  arrivalConfirmedAt?: string;
  acceptedAt?: string;
  postMoveInRating?: string;
  moveOutStatus?: string;
  moveOutDate?: string;
  depositRefundStatus?: string;
}

export interface OperationalTask {
  id: string;
  title: string;
  description?: string;
  category: 'VERIFICATION' | 'BOOKING' | 'MOVE_IN' | 'DISPUTE' | 'REFUND' | 'MAINTENANCE' | 'SUPPORT' | 'COMPLIANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProviderPayoutRecord {
  id: string;
  providerId: string;
  providerName?: string;
  providerPhone?: string;
  bookingId: string;
  hostelTitle?: string;
  roomName?: string;
  grossAmount: number;
  platformFee: number;
  cautionEscrow: number;
  netPayout: number;
  payoutStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'HELD' | 'FAILED';
  payoutReference?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PaymentReconciliationItem {
  id: string;
  paymentId: string;
  bookingId?: string;
  studentName?: string;
  providerReference: string;
  gatewayStatus: string;
  expectedAmount: number;
  settledAmount: number;
  discrepancy: number;
  reconciledBy?: string;
  status: 'RECONCILED' | 'DISCREPANCY_FLAGGED' | 'REFUND_REQUIRED';
  notes?: string;
  createdAt: string;
}

export interface ListingRefreshItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  providerId: string;
  providerName: string;
  lastConfirmedAt: string;
  status: 'CONFIRMED' | 'NEEDS_REVIEW' | 'EXPIRED';
  nextReviewDue: string;
  confirmedPrice: number;
  confirmedAvailableRooms: number;
  notes?: string;
  createdAt: string;
}

export interface NotificationLogItem {
  id: string;
  userId: string;
  userName?: string;
  channel: 'IN_APP' | 'SMS' | 'EMAIL' | 'WHATSAPP';
  eventType: string;
  recipient: string;
  message: string;
  deliveryStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';
  readStatus: boolean;
  errorDetails?: string;
  createdAt: string;
}

export interface ComplaintPatternSummary {
  propertyId: string;
  propertyTitle: string;
  areaName: string;
  providerName: string;
  totalComplaints: number;
  electricityIssues: number;
  waterIssues: number;
  securityIssues: number;
  cleanlinessIssues: number;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL_REVIEW';
}

export interface ProviderPerformanceScorecard {
  providerId: string;
  providerName: string;
  businessName?: string;
  totalHostels: number;
  totalBedspaces: number;
  occupiedBedspaces: number;
  occupancyRate: string;
  bookingAcceptanceRate: string;
  cancellationRate: string;
  avgIssueResolutionHours: number;
  studentSatisfactionRating: number;
  verificationBadge: 'VERIFIED_PROVIDER' | 'PENDING' | 'REJECTED';
}

export interface OperationsDashboardData {
  todayBookingsCount: number;
  pendingBookingsCount: number;
  todayMoveInsCount: number;
  upcomingMoveInsCount: number;
  openComplaintsCount: number;
  openDisputesCount: number;
  pendingRefundsCount: number;
  paymentIssuesCount: number;
  pendingProviderVerificationsCount: number;
  pendingHostelVerificationsCount: number;
  unresolvedAccommodationIssuesCount: number;
  openSupportTicketsCount: number;
  urgentTasksCount: number;
  actionRequiredItems: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'URGENT' | 'HIGH' | 'MEDIUM';
    actionUrl?: string;
    relatedEntityId?: string;
  }>;
  operationalTasks: OperationalTask[];
  recentPayouts: ProviderPayoutRecord[];
  complaintPatterns: ComplaintPatternSummary[];
  providerScorecards: ProviderPerformanceScorecard[];
}

// =============================================================================
// FINANCE & REVENUE TYPES
// =============================================================================
export interface OwnerRevenueData {
  totalGrossRevenue: number;
  bookingCommission: number;
  providerSubscriptions: number;
  featuredListings: number;
  digitalServices: number;
  refunds: number;
  netPlatformRevenue: number;
}

export interface RevenueDashboardSummary {
  totalRevenue: number;
  thisMonth: number;
  pendingRevenue: number;
  successfulBookings: number;
  providerRevenue: number;
  platformCommission: number;
  activeSubscribers: number;
  activeFeatured: number;
  completedServices: number;
  pendingPayouts: number;
  pendingPayoutsCount: number;
  totalOwnerWithdrawn: number;
}

export interface RevenueStreamItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface AreaRevenueItem {
  areaName: string;
  areaSlug: string;
  paymentsCount: number;
  grossAmount: number;
  commissionEarned: number;
}

export interface MonthlyRevenueHistoryItem {
  month: string;
  bookingCommission: number;
  grossTransactionVolume: number;
  transactionsCount: number;
}

export interface RevenueOverviewResponse {
  success: boolean;
  ownerRevenue: OwnerRevenueData;
  dashboardSummary: RevenueDashboardSummary;
  streams: RevenueStreamItem[];
  areaRevenue: AreaRevenueItem[];
  monthlyHistory: MonthlyRevenueHistoryItem[];
}

export interface BookingCommissionItem {
  paymentId: string;
  paymentReference: string;
  grossRentPaid: number;
  commissionEarned: number;
  providerNet: number;
  status: string;
  paidAt: string;
  createdAt: string;
  bookingReference: string;
  hostelTitle: string;
  areaName: string;
  studentName: string;
  providerName: string;
  commissionRatePercent: number;
}

export interface ProviderSubscriptionItem {
  id: string;
  provider_id: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  businessName?: string;
  plan_name: 'STARTER' | 'PRO_LANDLORD' | 'ENTERPRISE_ESTATE';
  amount: number;
  billing_cycle: 'MONTHLY' | 'SEMESTER' | 'ANNUAL';
  max_listings: number;
  features_json: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  start_date: string;
  end_date: string;
  payment_reference?: string;
  created_at: string;
}

export interface FeaturedListingItem {
  id: string;
  property_id: string;
  propertyTitle: string;
  propertyAddress: string;
  propertySlug: string;
  areaName: string;
  provider_id: string;
  providerName: string;
  providerPhone?: string;
  feature_tier: 'HOMEPAGE_SPOTLIGHT' | 'TOP_OF_SEARCH' | 'AREA_HERO' | 'VERIFIED_BADGE_BOOST';
  amount: number;
  duration_days: number;
  impressions_count: number;
  clicks_count: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  start_date: string;
  end_date: string;
  payment_reference?: string;
  created_at: string;
}

export interface ProviderDigitalServiceItem {
  id: string;
  provider_id: string;
  providerName: string;
  providerPhone?: string;
  providerEmail?: string;
  property_id?: string;
  propertyTitle?: string;
  service_type: 'PROFESSIONAL_PHOTOGRAPHY' | 'VIRTUAL_3D_TOUR' | 'PHYSICAL_INSPECTION_AUDIT' | 'SMS_BROADCAST_BLAST' | 'FEATURED_SOCIAL_PROMOTION' | 'TENANCY_LEGAL_AGREEMENT';
  service_name: string;
  amount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigned_agent?: string;
  delivery_notes?: string;
  payment_reference?: string;
  created_at: string;
  completed_at?: string;
}

export interface PayoutRequestItem {
  id: string;
  payout_reference: string;
  provider_id: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  businessName?: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export interface PlatformInvoiceItem {
  id: string;
  invoice_number: string;
  user_id: string;
  user_role: string;
  user_name: string;
  user_email: string;
  item_type: 'BOOKING_FEE' | 'COMMISSION' | 'SUBSCRIPTION' | 'FEATURED_LISTING' | 'DIGITAL_SERVICE' | 'PLATFORM_SERVICE';
  item_description: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'PAID' | 'PENDING' | 'VOID' | 'REFUNDED';
  due_date?: string;
  paid_at?: string;
  created_at: string;
}

export interface PlatformWithdrawalItem {
  id: string;
  withdrawal_reference: string;
  admin_id: string;
  adminName: string;
  adminEmail: string;
  amount: number;
  destination_account_name: string;
  destination_bank: string;
  destination_account_number: string;
  purpose: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface FinancialReportRow {
  monthPeriod: string;
  paidBookings: number;
  grossBookingVolume: number;
  bookingCommission: number;
  subscriptionRevenue: number;
  featuredRevenue: number;
  digitalServiceRevenue: number;
  totalPlatformGross: number;
  refundsTotal: number;
  netPlatformEarnings: number;
  providerDisbursements: number;
}

export interface RevenueSettingItem {
  id: string;
  setting_key: string;
  setting_value: string;
  category: string;
  description?: string;
  updated_at: string;
}

// =============================================================================
// AGENT PORTAL & AGENT ROLE (4TH ROLE) INTERFACES
// =============================================================================

export type AgentVerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'DEACTIVATED';
export type AgentRequestStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AgentEarningStatus = 'PENDING' | 'AVAILABLE' | 'PAID' | 'HELD';
export type AgentPayoutStatus = 'PENDING' | 'ELIGIBLE' | 'PROCESSING' | 'PAID' | 'FAILED' | 'HELD';
export type AgentLeadStatus = 'PENDING_VERIFICATION' | 'CONTACTED' | 'APPROVED_LISTED' | 'REJECTED';

export interface AgentProfile {
  id: string;
  userId: string;
  businessName: string;
  operatingAreas: string[];
  experienceYears: number;
  bio?: string;
  verificationStatus: AgentVerificationStatus;
  idDocumentUrl?: string;
  idDocumentType: string;
  serviceFeeAmount: number;
  rating: number;
  reviewCount: number;
  completedRequestsCount: number;
  activeStudentsCount: number;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  payoutAccountName?: string;
  adminFeedback?: string;
  verifiedAt?: string;
  termsAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  studentAvatar?: string;
  studentDepartment?: string;
  studentLevel?: string;
  agentId?: string;
  agentName?: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyCoverImage?: string;
  preferredAreas: string[];
  budgetMin: number;
  budgetMax: number;
  roomType: string;
  moveInDate?: string;
  status: AgentRequestStatus;
  notes?: string;
  serviceFee: number;
  feePaymentStatus: 'UNPAID' | 'ESCROW' | 'PAID' | 'REFUNDED';
  suggestedHostels?: {
    id: string;
    title: string;
    rentAmount: number;
    areaName: string;
    coverImage: string;
    suggestedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentDashboardData {
  agent: {
    id: string;
    fullName: string;
    email: string;
    businessName: string;
    verificationStatus: AgentVerificationStatus;
    rating: number;
    reviewCount: number;
    serviceFeeAmount: number;
  };
  metrics: {
    activeRequests: number;
    assignedStudents: number;
    availableHostels: number;
    pendingBookings: number;
    completedBookings: number;
    totalEarnings: number;
    pendingEarnings: number;
    availableBalance: number;
  };
  recentRequests: AgentRequest[];
  assignedHostels: any[];
  recentActivity: {
    id: string;
    action: string;
    details: string;
    timestamp: string;
  }[];
  notifications: {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    isRead: boolean;
  }[];
}

export interface AgentEarning {
  id: string;
  agentId: string;
  bookingId?: string;
  requestId?: string;
  amount: number;
  earningType: 'SERVICE_FEE' | 'COMMISSION' | 'BONUS';
  status: AgentEarningStatus;
  notes?: string;
  createdAt: string;
}

export interface AgentPayout {
  id: string;
  payoutReference: string;
  agentId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: AgentPayoutStatus;
  adminNotes?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AgentLead {
  id: string;
  agentId: string;
  agentName?: string;
  agentBusiness?: string;
  hostelName: string;
  areaId: string;
  areaName?: string;
  landmark?: string;
  estimatedRent: number;
  roomTypes: string;
  landlordName?: string;
  landlordPhone?: string;
  photos: string[];
  notes?: string;
  status: AgentLeadStatus;
  adminFeedback?: string;
  createdAt: string;
}

export interface AgentReview {
  id: string;
  agentId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  requestId?: string;
  rating: number;
  reviewText: string;
  isVerifiedAssistance: boolean;
  createdAt: string;
}

export interface AdminAgentItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  businessName: string;
  operatingAreas: string[];
  experienceYears: number;
  bio?: string;
  verificationStatus: AgentVerificationStatus;
  idDocumentUrl?: string;
  idDocumentType: string;
  serviceFeeAmount: number;
  rating: number;
  reviewCount: number;
  completedRequestsCount: number;
  totalPlacements?: number;
  activeStudentsCount: number;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  payoutAccountName?: string;
  adminFeedback?: string;
  verifiedAt?: string;
  createdAt: string;
}
