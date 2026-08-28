import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  CheckCircle2, 
  MapPin, 
  DollarSign, 
  Video, 
  Footprints, 
  ShieldCheck, 
  Sparkles, 
  Droplets, 
  Zap, 
  Check, 
  ArrowLeft,
  ArrowRight,
  Upload, 
  Trash2, 
  Eye, 
  Edit3, 
  Clock, 
  AlertCircle, 
  Bell, 
  Home, 
  Star,
  FileText,
  HelpCircle,
  X,
  MessageSquare,
  Calendar,
  CalendarCheck,
  CreditCard,
  Ban,
  Flag,
  User,
  ChevronRight,
  Phone,
  GraduationCap
} from 'lucide-react';
import { 
  Property, 
  CampusZone, 
  University, 
  PropertyType, 
  PaymentFrequency, 
  PropertyMedia, 
  LandlordNotification,
  StudentInquiry,
  VirtualViewingRequest,
  StudentReview,
  Booking,
  LandlordPayout,
  PayoutAccount,
  PlatformFeeConfig
} from '../types';
import { UNIVERSITIES } from '../data/campusData';
import { formatNaira } from '../utils/formatters';
import { ListingCompletenessWidget } from './ListingCompletenessWidget';
import { calculateListingCompleteness } from '../utils/completeness';
import { calculateDistanceKm, formatProximityText } from '../utils/distance';
import { NIGERIAN_BANKS, maskAccountNumber } from '../services/paymentService';

interface LandlordPortalProps {
  currentUniversity: University;
  zones: CampusZone[];
  properties: Property[];
  notifications: LandlordNotification[];
  inquiries: StudentInquiry[];
  viewingRequests: VirtualViewingRequest[];
  reviews?: StudentReview[];
  bookings?: Booking[];
  payouts?: LandlordPayout[];
  payoutAccounts?: PayoutAccount[];
  platformFeeConfig?: PlatformFeeConfig;
  onAddProperty: (newProperty: Property) => void;
  onUpdateProperty: (updatedProperty: Property) => void;
  onDeleteProperty: (id: string) => void;
  onAcceptViewing: (viewingId: string, note?: string) => void;
  onDeclineViewing: (viewingId: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onViewPropertyDetails: (property: Property) => void;
  onNavigateHome: () => void;
  onRespondToReview?: (review: StudentReview) => void;
  onReportReview?: (review: StudentReview) => void;
  onAcceptBooking?: (bookingId: string) => void;
  onDeclineBooking?: (bookingId: string, reason: string) => void;
  onOpenBookingDetail?: (booking: Booking) => void;
  onOpenDisputeModal?: (booking: Booking) => void;
  onAddPayoutAccount?: (acc: { bankName: string; bankCode: string; accountNumber: string; accountName: string }) => void;
}

export const LandlordPortal: React.FC<LandlordPortalProps> = ({
  currentUniversity,
  zones,
  properties,
  notifications,
  inquiries,
  viewingRequests,
  reviews,
  bookings,
  payouts,
  payoutAccounts,
  platformFeeConfig,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onAcceptViewing,
  onDeclineViewing,
  onMarkNotificationRead,
  onViewPropertyDetails,
  onNavigateHome,
  onRespondToReview,
  onReportReview,
  onAcceptBooking,
  onDeclineBooking,
  onOpenBookingDetail,
  onOpenDisputeModal,
  onAddPayoutAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'my_properties' | 'booking_requests' | 'payments_earnings' | 'wizard' | 'inquiries_viewings' | 'reviews' | 'notifications'>('my_properties');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  // Payments & Payout State (Phase 7)
  const [payoutsFilterStatus, setPayoutsFilterStatus] = useState<'ALL' | 'PAID' | 'PROCESSING' | 'ON_HOLD'>('ALL');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState(NIGERIAN_BANKS[0].code);
  const [inputAccountNumber, setInputAccountNumber] = useState('');
  const [inputAccountName, setInputAccountName] = useState('');
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);

  // Booking Requests State
  const [bookingFilterStatus, setBookingFilterStatus] = useState<'ALL' | 'REQUESTED' | 'ACCEPTED' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [selectedBookingForDecline, setSelectedBookingForDecline] = useState<Booking | null>(null);
  const [declineReason, setDeclineReason] = useState('Property no longer available for requested session');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [selectedBookingForInfo, setSelectedBookingForInfo] = useState<Booking | null>(null);
  const [infoRequestText, setInfoRequestText] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('self_contain');
  const [description, setDescription] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);

  // Location State
  const [selectedUnivId, setSelectedUnivId] = useState<string>(currentUniversity.id);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'zone-under-g');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [walkTime, setWalkTime] = useState('5 mins walk');
  const [bikeTime, setBikeTime] = useState('2 mins bike');

  // Pricing State
  const [annualRent, setAnnualRent] = useState<number>(250000);
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('annually');
  const [agencyFee, setAgencyFee] = useState<number>(20000);
  const [agreementFee, setAgreementFee] = useState<number>(10000);
  const [cautionFee, setCautionFee] = useState<number>(20000);
  const [serviceCharge, setServiceCharge] = useState<number>(10000);
  const [otherFees, setOtherFees] = useState<number>(0);

  // Amenities State
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Water',
    'Electricity',
    'Prepaid meter',
    'Security',
    'Fence',
  ]);

  // Media State
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80',
  ]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const [hasVideo, setHasVideo] = useState<boolean>(true);
  const [videoUrl, setVideoUrl] = useState<string>(
    'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-interior-with-natural-lighting-40545-large.mp4'
  );

  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // Viewing response modal
  const [acceptingViewingId, setAcceptingViewingId] = useState<string | null>(null);
  const [acceptNote, setAcceptNote] = useState('');

  // Auto-calculated Estimated Total
  const estimatedTotal =
    Number(annualRent || 0) +
    Number(agencyFee || 0) +
    Number(agreementFee || 0) +
    Number(cautionFee || 0) +
    Number(serviceCharge || 0) +
    Number(otherFees || 0);

  const matchedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const matchedUniv = UNIVERSITIES.find((u) => u.id === selectedUnivId) || currentUniversity;

  const currentFormPartial: Partial<Property> = {
    title,
    description,
    universityId: selectedUnivId,
    zoneId: selectedZoneId,
    address,
    landmark,
    fees: {
      annualRent,
      paymentFrequency,
      agencyFee,
      agreementFee,
      cautionFee,
      serviceCharge,
      otherFees,
      estimatedTotal,
    },
    images: uploadedPhotos,
    hasVideoTour: hasVideo,
    videoTourUrl: videoUrl,
    amenities: selectedAmenities,
    availabilityStatus: 'AVAILABLE',
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setUploadedPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 100 * 1024 * 1024) {
      alert(`Video file "${file.name}" is too large. Maximum size is 100MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setHasVideo(true);

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setVideoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleAmenity = (name: string) => {
    if (selectedAmenities.includes(name)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== name));
    } else {
      setSelectedAmenities([...selectedAmenities, name]);
    }
  };

  const resetForm = () => {
    setTitle('');
    setPropertyType('self_contain');
    setDescription('');
    setBedrooms(1);
    setBathrooms(1);
    setAddress('');
    setLandmark('');
    setAnnualRent(250000);
    setAgencyFee(20000);
    setAgreementFee(10000);
    setCautionFee(20000);
    setServiceCharge(10000);
    setOtherFees(0);
    setCurrentStep(1);
    setEditingPropertyId(null);
    setFormSubmitted(false);
  };

  const handleStartEdit = (prop: Property) => {
    setEditingPropertyId(prop.id);
    setTitle(prop.title);
    setPropertyType(prop.propertyType);
    setDescription(prop.description);
    setBedrooms(prop.bedrooms);
    setBathrooms(prop.bathrooms);
    setSelectedUnivId(prop.universityId);
    setSelectedZoneId(prop.zoneId);
    setAddress(prop.address);
    setLandmark(prop.landmark);
    setWalkTime(prop.walkTimeToGate);
    setBikeTime(prop.bikeTimeToGate);
    setAnnualRent(prop.fees.annualRent);
    setPaymentFrequency(prop.fees.paymentFrequency);
    setAgencyFee(prop.fees.agencyFee);
    setAgreementFee(prop.fees.agreementFee);
    setCautionFee(prop.fees.cautionFee);
    setServiceCharge(prop.fees.serviceCharge);
    setOtherFees(prop.fees.otherFees);
    setSelectedAmenities(prop.amenities);
    setUploadedPhotos(prop.images);
    setHasVideo(prop.hasVideoTour);
    setVideoUrl(prop.videoTourUrl || '');
    setCurrentStep(1);
    setActiveTab('wizard');
  };

  const handleSubmitListing = () => {
    const completeness = calculateListingCompleteness(currentFormPartial).score;
    const coords = matchedZone.slug === 'under-g' ? { lat: 8.1465, lng: 4.2612 } : { lat: 8.1415, lng: 4.2588 };
    const distKm = calculateDistanceKm(coords.lat, coords.lng);

    const propertyPayload: Property = {
      id: editingPropertyId || `nest-${Date.now()}`,
      title: title || 'Student Accommodation Listing',
      slug: (title || 'nest').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      universityId: selectedUnivId,
      campusId: 'lautech-ogbomoso',
      zoneId: selectedZoneId,
      zoneName: matchedZone.name,
      cityName: matchedUniv.cityName,
      stateName: matchedUniv.stateName,
      countryName: 'Nigeria',
      address: address || 'Campus Zone Address',
      landmark: landmark || `Near ${matchedZone.name}`,
      coordinates: coords,
      distanceKmFromGate: distKm,
      distanceText: formatProximityText(distKm, 'LAUTECH'),
      propertyType,
      propertyTypeLabel: propertyType.replace(/_/g, ' '),
      bedrooms,
      bathrooms,
      description: description || 'Modern, secure student accommodation.',
      fees: {
        annualRent: Number(annualRent),
        paymentFrequency,
        agencyFee: Number(agencyFee),
        agreementFee: Number(agreementFee),
        cautionFee: Number(cautionFee),
        serviceCharge: Number(serviceCharge),
        otherFees: Number(otherFees),
        estimatedTotal,
      },
      listingStatus: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING_VERIFICATION',
      authorizationType: 'DIRECT_OWNER',
      availabilityStatus: 'AVAILABLE',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      completenessScore: completeness,
      viewsCount: 0,
      savesCount: 0,
      inquiriesCount: 0,
      coverImage: uploadedPhotos[primaryPhotoIndex] || uploadedPhotos[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
      images: uploadedPhotos,
      media: uploadedPhotos.map((url, idx) => ({
        id: `m-${idx}`,
        url,
        caption: idx === primaryPhotoIndex ? 'Primary Cover Photo' : `Photo ${idx + 1}`,
        isPrimary: idx === primaryPhotoIndex,
        type: 'photo',
        sortOrder: idx + 1,
      })),
      hasVideoTour: hasVideo,
      videoTourUrl: videoUrl,
      videoDuration: hasVideo ? '1m 30s Walkthrough' : undefined,
      amenities: selectedAmenities,
      hasBoreholeWater: selectedAmenities.includes('Water') || selectedAmenities.includes('24/7 Motorized Borehole'),
      hasPrepaidMeter: selectedAmenities.includes('Prepaid meter'),
      hasSolarOrInverter: selectedAmenities.includes('Generator') || selectedAmenities.includes('Solar Backup'),
      hasGeneratorBackup: selectedAmenities.includes('Generator'),
      hasSecurityGuard: selectedAmenities.includes('Security'),
      isFencedAndGated: selectedAmenities.includes('Fence'),
      isTiled: selectedAmenities.includes('Tiled floor'),
      hasKitchenCabinets: selectedAmenities.includes('Kitchen'),
      hasWardrobe: selectedAmenities.includes('Wardrobe'),
      hasParking: selectedAmenities.includes('Parking'),
      hasWifi: selectedAmenities.includes('Wi-Fi'),
      walkTimeToGate: walkTime,
      bikeTimeToGate: bikeTime,
      distanceToGateMins: parseInt(walkTime) || 5,
      distanceDescription: `${walkTime} to ${matchedUniv.shortName} Gate`,
      overallRating: 5.0,
      totalReviewsCount: 0,
      inspectionReport: {
        waterSourceVerified: false,
        waterNote: 'Pending physical inspection by CampusNest.',
        electricityVerified: false,
        electricityNote: 'Pending verification.',
        structuralIntegrity: 'good',
        securityFencingGated: selectedAmenities.includes('Fence'),
        drainageFloodFree: true,
        landlordIdVerified: true,
      },
      landlord: {
        id: 'lnd-8801',
        name: 'Alhaji Oladimeji Properties',
        type: 'verified_landlord',
        isIdVerified: true,
        phone: '+234 803 456 7890',
        whatsapp: '+234 803 456 7890',
        rating: 4.9,
        activeListings: properties.length + 1,
        joinedYear: 2024,
      },
      featured: false,
      createdAt: new Date().toISOString(),
    };

    if (editingPropertyId) {
      onUpdateProperty(propertyPayload);
    } else {
      onAddProperty(propertyPayload);
    }
    setFormSubmitted(true);
  };

  const handleToggleAvailability = (prop: Property) => {
    const updated: Property = {
      ...prop,
      availabilityStatus: prop.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
    onUpdateProperty(updated);
  };

  const handleConfirmAccept = () => {
    if (!acceptingViewingId) return;
    onAcceptViewing(acceptingViewingId, acceptNote.trim() || undefined);
    setAcceptingViewingId(null);
    setAcceptNote('');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const hostPropertyIds = properties.map((p) => p.id);
  const hostReviews = reviews ? reviews.filter((r) => hostPropertyIds.includes(r.propertyId)) : [];
  const totalHostReviews = hostReviews.length;
  const avgHostRating = totalHostReviews > 0
    ? (hostReviews.reduce((sum, r) => sum + r.rating, 0) / totalHostReviews).toFixed(1)
    : '5.0';

  const hostBookings = bookings
    ? bookings.filter((b) => hostPropertyIds.includes(b.propertyId) || b.landlordId === 'lnd-8801' || b.landlordId === 'lnd-101')
    : [];
  const pendingBookingsCount = hostBookings.filter((b) => b.status === 'REQUESTED').length;

  const hostPayouts = payouts || [];
  const hostAccounts = payoutAccounts || [];
  const primaryAccount = hostAccounts.find((a: PayoutAccount) => a.isDefault) || hostAccounts[0];
  const totalGrossEarned = hostPayouts.reduce((sum: number, p: LandlordPayout) => sum + p.grossAmount, 0);
  const totalPaidOut = hostPayouts.filter((p: LandlordPayout) => p.status === 'PAID').reduce((sum: number, p: LandlordPayout) => sum + p.netAmount, 0);
  const totalInEscrow = hostPayouts.filter((p: LandlordPayout) => p.status === 'PROCESSING' || p.status === 'PENDING').reduce((sum: number, p: LandlordPayout) => sum + p.netAmount, 0);

  const landlordMenuItems = [
    { id: 'my_properties', label: 'My Properties', count: properties.length, icon: Building2, badgeColor: 'bg-brand-600' },
    { id: 'booking_requests', label: 'Booking Requests', count: hostBookings.length, unreadCount: pendingBookingsCount, icon: CalendarCheck, badgeColor: 'bg-emerald-600' },
    { id: 'payments_earnings', label: 'Payments & Earnings', count: hostPayouts.length, icon: CreditCard, badgeColor: 'bg-emerald-600' },
    { id: 'inquiries_viewings', label: 'Inquiries & Viewings', count: inquiries.length + viewingRequests.length, icon: MessageSquare, badgeColor: 'bg-teal-600' },
    { id: 'reviews', label: 'My Reviews', count: hostReviews.length, icon: Star, badgeColor: 'bg-amber-500' },
    { id: 'wizard', label: editingPropertyId ? 'Edit Property' : 'Add Property Wizard', count: null, icon: PlusCircle, badgeColor: 'bg-brand-600' },
    { id: 'notifications', label: 'Notifications', count: notifications.length, unreadCount: unreadNotifsCount, icon: Bell, badgeColor: 'bg-rose-500' },
  ];

  return (
    <div className="py-8 bg-slate-50 min-h-[90vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                Verified Landlord Portal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {currentUniversity.name} ({currentUniversity.cityName})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hostel Listing & Inquiries Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage listings, review student inquiries, confirm WhatsApp virtual tours, and toggle room availability.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                resetForm();
                setActiveTab('wizard');
              }}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Property</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Left Hand Navigation Menu */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-card space-y-1">
              {landlordMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'wizard' && !editingPropertyId) {
                        resetForm();
                      }
                      setActiveTab(item.id as any);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== null && item.count > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : `${item.badgeColor} text-white`
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Host Quick Summary & Trust Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Verified Host Hub</h4>
                  <p className="text-[10px] text-slate-400">{currentUniversity.shortName} Campus Network</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Listings with video walkthroughs and zero hidden fees receive <strong>4x more student inquiries</strong>.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('wizard');
                }}
                className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Listing</span>
              </button>
            </div>

          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-9 space-y-6">

        {/* Tab 1: My Properties List */}
        {activeTab === 'my_properties' && (
          <div className="space-y-4">
            {properties.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-extrabold text-base text-slate-900">No Properties Listed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  List your student accommodation around LAUTECH to receive direct verified student inquiries.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('wizard');
                  }}
                  className="mt-4 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-card flex flex-col justify-between"
                  >
                    <div>
                      {/* Image & Badges */}
                      <div className="relative aspect-[16/10] bg-slate-100">
                        <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase shadow-sm ${
                            p.listingStatus === 'PUBLISHED' ? 'bg-emerald-600 text-white' :
                            p.listingStatus === 'PENDING_VERIFICATION' ? 'bg-amber-500 text-white' :
                            p.listingStatus === 'REJECTED' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
                          }`}>
                            {p.listingStatus.replace('_', ' ')}
                          </span>

                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase shadow-sm ${
                            p.verificationStatus === 'VERIFIED' ? 'bg-teal-600 text-white' : 'bg-slate-900/80 text-slate-200'
                          }`}>
                            {p.verificationStatus === 'VERIFIED' ? 'Verified by CampusNest' : p.verificationStatus}
                          </span>
                        </div>

                        {/* Availability Pill on image */}
                        <div className="absolute bottom-3 right-3">
                          <button
                            onClick={() => handleToggleAvailability(p)}
                            className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm transition-transform active:scale-95 ${
                              p.availabilityStatus === 'AVAILABLE'
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-rose-500/90 text-white'
                            }`}
                            title="Click to toggle availability"
                          >
                            ● {p.availabilityStatus}
                          </button>
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                            {p.zoneName}
                          </span>
                          <span className="text-[11px]">Last updated: {p.lastUpdated}</span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 line-clamp-1">{p.title}</h3>

                        <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-xs text-slate-500">Annual Rent:</span>
                            <span className="font-extrabold text-sm text-slate-900 ml-1">
                              {formatNaira(p.fees.annualRent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Est. Total:</span>
                            <span className="font-bold text-xs text-emerald-700 ml-1">
                              {formatNaira(p.fees.estimatedTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Engagement Metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Views</span>
                            <span className="font-extrabold text-slate-800">{p.viewsCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Saves</span>
                            <span className="font-extrabold text-slate-800">{p.savesCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Inquiries</span>
                            <span className="font-extrabold text-slate-800">{p.inquiriesCount || 0}</span>
                          </div>
                        </div>

                        {/* Rejection / Changes Requested / Suspension Notice */}
                        {p.requestedChangesNote && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                            <strong className="block font-bold flex items-center gap-1 text-amber-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Admin Requested Changes:
                            </strong>
                            <p className="text-[11px] leading-relaxed">{p.requestedChangesNote}</p>
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Edit & Resubmit for Verification
                            </button>
                          </div>
                        )}

                        {p.suspensionReason && (
                          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                            <strong className="block font-bold flex items-center gap-1 text-rose-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Listing Suspended:
                            </strong>
                            <p className="text-[11px] leading-relaxed">{p.suspensionReason}</p>
                          </div>
                        )}

                        {p.rejectionReason && !p.requestedChangesNote && (
                          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                            <strong className="block font-bold flex items-center gap-1 text-rose-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Listing Rejected:
                            </strong>
                            <p className="text-[11px] leading-relaxed">{p.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="p-5 pt-0 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onViewPropertyDetails(p)}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(p)}
                        className="py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => onDeleteProperty(p.id)}
                        className="py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Booking Requests (PHASE 6: BOOKING & RESERVATION WORKFLOW) */}
        {activeTab === 'booking_requests' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-extrabold text-slate-900">Student Booking & Reservation Requests</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {hostBookings.length} Total
                  </span>
                  {pendingBookingsCount > 0 && (
                    <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                      {pendingBookingsCount} Awaiting Your Review
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Review student move-in dates, academic credentials, accept reservations, and manage key handovers.
                </p>
              </div>

              {/* Status Filter Bar */}
              <div className="flex items-center space-x-1.5 overflow-x-auto p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                {(['ALL', 'REQUESTED', 'ACCEPTED', 'CONFIRMED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                      bookingFilterStatus === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All Requests'
                      : st === 'REQUESTED'
                      ? `New (${pendingBookingsCount})`
                      : st === 'ACCEPTED'
                      ? 'Payment Pending'
                      : st === 'CONFIRMED'
                      ? 'Confirmed'
                      : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Availability Lock Alert */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-3xl text-xs text-emerald-950 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold text-emerald-900 block">CampusNest Availability Lock Active</span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  When you accept a booking, CampusNest automatically holds the property for 48 hours to prevent overlapping reservations. If the student fails to proceed within the window, the property is automatically restored to Available.
                </p>
              </div>
            </div>

            {/* Bookings Queue */}
            {hostBookings.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-card space-y-3">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-base text-slate-900">No Booking Requests Received Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When LAUTECH students request a reservation on your verified properties, their requests and move-in schedules will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {hostBookings
                  .filter((b) => {
                    if (bookingFilterStatus === 'ALL') return true;
                    if (bookingFilterStatus === 'REQUESTED') return b.status === 'REQUESTED';
                    if (bookingFilterStatus === 'ACCEPTED') return b.status === 'ACCEPTED' || b.status === 'PAYMENT_PENDING';
                    if (bookingFilterStatus === 'CONFIRMED') return b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'COMPLETED';
                    if (bookingFilterStatus === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'EXPIRED';
                    return true;
                  })
                  .map((bk) => (
                    <div
                      key={bk.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-card hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Request Header with Student Picture & Verified Matriculation Card */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={bk.studentAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(bk.studentName)}&background=059669&color=fff&bold=true`}
                              alt={bk.studentName}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm bg-slate-100"
                              onError={(e: any) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bk.studentName)}&background=059669&color=fff&bold=true`;
                              }}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs" title="Verified LAUTECH Student">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                                {bk.referenceNumber}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{bk.propertyTitle}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-base text-slate-900">
                                {bk.studentName}
                              </h4>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <GraduationCap className="w-3 h-3 text-emerald-600" />
                                <span>Matric: {bk.studentMatricNumber || bk.studentMatricNo || '2024/04812'}</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                              <span>{bk.studentDepartment || 'LAUTECH Student'}</span>
                              {bk.studentLevel && <span>• {bk.studentLevel}</span>}
                              <span className="text-emerald-600 font-bold">• Verified Student</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          {bk.status === 'REQUESTED' && (
                            <span className="bg-amber-100 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Action Required</span>
                            </span>
                          )}
                          {(bk.status === 'ACCEPTED' || bk.status === 'PAYMENT_PENDING') && (
                            <span className="bg-blue-100 text-blue-900 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-300 flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                              <span>Accepted • Payment Pending</span>
                            </span>
                          )}
                          {(bk.status === 'PAID' || bk.status === 'CONFIRMED') && (
                            <span className="bg-emerald-100 text-emerald-900 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Confirmed Reservation</span>
                            </span>
                          )}
                          {bk.status === 'COMPLETED' && (
                            <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-3 py-1 rounded-full border border-purple-300 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                              <span>Moved In</span>
                            </span>
                          )}
                          {bk.status === 'CANCELLED' && (
                            <span className="bg-rose-100 text-rose-900 text-xs font-extrabold px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5 text-rose-700" />
                              <span>Cancelled</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            Requested {new Date(bk.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Request Details Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Move-in Date</span>
                          <span className="font-extrabold text-slate-900">{bk.moveInDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Tenancy Duration</span>
                          <span className="font-bold text-slate-800">{bk.durationLabel}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Annual Rent</span>
                          <span className="font-bold text-slate-800">{formatNaira(bk.annualRent)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Package</span>
                          <span className="font-black text-brand-600 text-sm">{formatNaira(bk.studentTotalAmount)}</span>
                        </div>
                      </div>

                      {/* Student Message Note */}
                      {bk.studentMessage && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-950 space-y-0.5">
                          <span className="font-bold text-[11px] text-amber-800">Student Note:</span>
                          <p className="italic text-[11px]">"{bk.studentMessage}"</p>
                        </div>
                      )}

                      {/* Contact Channels */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                        <span className="text-slate-500 font-bold">Contact Student:</span>
                        <a
                          href={`tel:${bk.studentPhone}`}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-brand-600" />
                          <span>{bk.studentPhone}</span>
                        </a>
                        {bk.studentWhatsapp && (
                          <a
                            href={`https://wa.me/${bk.studentWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${bk.studentName}, I am contacting you regarding your CampusNest booking request ${bk.referenceNumber} for ${bk.propertyTitle}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-semibold hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <span className="text-slate-400 text-xs font-mono">{bk.studentEmail}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-2">
                          {onOpenDisputeModal && (
                            <button
                              onClick={() => onOpenDisputeModal(bk)}
                              className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Report Problem</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {bk.status === 'REQUESTED' && (
                            <>
                              <button
                                onClick={() => setSelectedBookingForDecline(bk)}
                                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => setSelectedBookingForInfo(bk)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              >
                                Request Info
                              </button>
                              {onAcceptBooking && (
                                <button
                                  onClick={() => onAcceptBooking(bk.id)}
                                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Accept Reservation</span>
                                </button>
                              )}
                            </>
                          )}

                          {onOpenBookingDetail && (
                            <button
                              onClick={() => onOpenBookingDetail(bk)}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>View Full Timeline</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Decline Dialog Modal */}
            {selectedBookingForDecline && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-slate-900">Decline Booking Request</h4>
                    <button onClick={() => setSelectedBookingForDecline(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-600">
                    Provide a reason for declining <strong>{selectedBookingForDecline.studentName}</strong>'s request for {selectedBookingForDecline.propertyTitle}.
                  </p>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Property no longer available for requested session">Property no longer available for requested session</option>
                    <option value="Room already leased physically">Room already leased physically</option>
                    <option value="Move-in date is too far in future">Move-in date is too far in future</option>
                    <option value="Unable to meet student special requirements">Unable to meet student special requirements</option>
                    <option value="Other">Other reason</option>
                  </select>

                  {declineReason === 'Other' && (
                    <input
                      type="text"
                      value={customDeclineReason}
                      onChange={(e) => setCustomDeclineReason(e.target.value)}
                      placeholder="Specify reason..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSelectedBookingForDecline(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (onDeclineBooking && selectedBookingForDecline) {
                          const rsn = declineReason === 'Other' && customDeclineReason ? customDeclineReason : declineReason;
                          onDeclineBooking(selectedBookingForDecline.id, rsn);
                        }
                        setSelectedBookingForDecline(null);
                      }}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                    >
                      Confirm Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Request Info Modal */}
            {selectedBookingForInfo && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-slate-900">Request Information from Student</h4>
                    <button onClick={() => setSelectedBookingForInfo(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-600">
                    Send a message to <strong>{selectedBookingForInfo.studentName}</strong> regarding their booking request.
                  </p>
                  <textarea
                    rows={3}
                    value={infoRequestText}
                    onChange={(e) => setInfoRequestText(e.target.value)}
                    placeholder="e.g. Please clarify your preferred move-in time or department..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSelectedBookingForInfo(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBookingForInfo(null);
                        setInfoRequestText('');
                      }}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: PAYMENTS & EARNINGS (PHASE 7: LANDLORD PAYOUTS & SETTLEMENTS) */}
        {activeTab === 'payments_earnings' && (
          <div className="space-y-6">
            {/* Header & Account Summary */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-extrabold text-slate-900">Payments & Earnings Desk</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {hostPayouts.length} {hostPayouts.length === 1 ? 'Payout' : 'Payouts'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Direct rent settlements, move-in escrow verification, transparent commission deductions, and automated Nigerian bank payouts.
                </p>
              </div>

              {/* Settlement Bank Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 shrink-0 min-w-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Settlement Account
                  </span>
                  <button
                    onClick={() => {
                      setAccountFeedback(null);
                      setIsBankModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-brand-400 hover:text-brand-300 underline cursor-pointer"
                  >
                    {primaryAccount ? 'Change' : 'Add Bank'}
                  </button>
                </div>
                {primaryAccount ? (
                  <div>
                    <span className="font-extrabold text-sm block">{primaryAccount.bankName}</span>
                    <span className="font-mono text-xs text-slate-300">{primaryAccount.accountNumberMasked}</span>
                    <span className="text-[10px] text-slate-400 block uppercase mt-0.5">{primaryAccount.accountName}</span>
                  </div>
                ) : (
                  <div className="py-1 text-xs text-amber-300 font-medium">
                    No bank account linked. Click above to add your Nigerian NUBAN account.
                  </div>
                )}
              </div>
            </div>

            {/* Financial Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Rent Volume</span>
                <div className="text-xl font-black text-slate-900 font-mono">{formatNaira(totalGrossEarned)}</div>
                <span className="text-[10px] text-slate-500">From student bookings</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Dispatched to Bank</span>
                <div className="text-xl font-black text-emerald-700 font-mono">{formatNaira(totalPaidOut)}</div>
                <span className="text-[10px] text-emerald-600 font-medium">Settled & Completed</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Held in Escrow</span>
                <div className="text-xl font-black text-blue-700 font-mono">{formatNaira(totalInEscrow)}</div>
                <span className="text-[10px] text-blue-600 font-medium">Disbursing on Move-in</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Fee Model</span>
                <div className="text-lg font-black text-slate-900">
                  {platformFeeConfig?.model === 'PERCENTAGE' ? `${platformFeeConfig.percentageRate}% Rate` : 'Fixed NGN'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {platformFeeConfig?.payer === 'STUDENT' ? 'Student Covered' : 'Host Deducted'}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
              {(['ALL', 'PAID', 'PROCESSING', 'ON_HOLD'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPayoutsFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    payoutsFilterStatus === status
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'All Payouts' : status.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Payouts Records */}
            {hostPayouts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-card space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">No Settlement Payouts Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When students complete payments for accepted bookings, their rent is securely held in escrow and settled directly to your bank account after student check-in.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {hostPayouts
                  .filter((p) => payoutsFilterStatus === 'ALL' || p.status === payoutsFilterStatus)
                  .map((payout) => (
                    <div
                      key={payout.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-card hover:border-slate-300 transition-all space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              {payout.payoutReference}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-xs text-slate-500">
                              Booking Ref: {payout.bookingReference}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mt-1">
                            {payout.propertyTitle}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Bank Destination: <strong>{payout.bankName}</strong> ({payout.accountNumberMasked}) • {payout.accountName}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full border flex items-center gap-1 ${
                              payout.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : payout.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {payout.status === 'PAID' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
                            <span>{payout.status}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Due: {new Date(payout.settlementDueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Rent</span>
                          <span className="font-bold text-slate-900">{formatNaira(payout.grossAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Commission Deducted</span>
                          <span className="font-bold text-slate-600 font-mono">
                            {payout.commissionDeducted > 0 ? `-${formatNaira(payout.commissionDeducted)}` : '₦0 (Student Covered)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Net Payout to Host</span>
                          <span className="font-black text-emerald-700 text-sm font-mono">{formatNaira(payout.netAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Transfer Reference</span>
                          <span className="font-mono text-slate-600">{payout.payoutProviderRef || 'Pending Release'}</span>
                        </div>
                      </div>

                      {/* On Hold Alert */}
                      {payout.status === 'ON_HOLD' && (
                        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block">Settlement Payout Held by CampusNest Escrow Mediation</span>
                            <span className="text-[11px] text-amber-800">
                              Reason: {payout.holdReason || 'Student reported property check-in concern. Mediator is investigating.'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Bank Account Setup / Update Modal */}
            {isBankModalOpen && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-600" />
                      <h4 className="font-extrabold text-base text-slate-900">Set Settlement Bank Account</h4>
                    </div>
                    <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    Provide your Nigerian bank details where rent payouts from verified student bookings will be transferred.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Nigerian Bank</label>
                      <select
                        value={selectedBankCode}
                        onChange={(e) => setSelectedBankCode(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        {NIGERIAN_BANKS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NUBAN Account Number (10 Digits)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={inputAccountNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setInputAccountNumber(val);
                          if (val.length === 10) {
                            setIsResolvingAccount(true);
                            setTimeout(() => {
                              setIsResolvingAccount(false);
                              setInputAccountName('ALHAJI OLADIMEJI PROPERTIES');
                              setAccountFeedback('Account name resolved: ALHAJI OLADIMEJI PROPERTIES');
                            }, 600);
                          }
                        }}
                        placeholder="0123456789"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800"
                      />
                    </div>

                    {isResolvingAccount && (
                      <div className="text-[11px] text-brand-600 font-bold flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying account name with NIBSS...</span>
                      </div>
                    )}

                    {inputAccountName && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Resolved Account Name</label>
                        <input
                          type="text"
                          value={inputAccountName}
                          readOnly
                          className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-extrabold text-emerald-950 uppercase font-mono"
                        />
                      </div>
                    )}

                    {inputAccountNumber.length === 10 && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                        <span className="font-bold text-[10px] uppercase text-slate-400 block">Public Masked Preview:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{maskAccountNumber(inputAccountNumber)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setIsBankModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={inputAccountNumber.length !== 10}
                      onClick={() => {
                        if (onAddPayoutAccount) {
                          const bank = NIGERIAN_BANKS.find((b) => b.code === selectedBankCode) || NIGERIAN_BANKS[0];
                          onAddPayoutAccount({
                            bankName: bank.name,
                            bankCode: bank.code,
                            accountNumber: inputAccountNumber,
                            accountName: inputAccountName || 'ALHAJI OLADIMEJI PROPERTIES',
                          });
                        }
                        setIsBankModalOpen(false);
                      }}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                    >
                      Save Payout Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Inquiries & Virtual Viewings Management */}
        {activeTab === 'inquiries_viewings' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-base text-slate-900">Virtual & On-Site Viewing Requests</h3>
                </div>
                <span className="text-xs font-bold text-slate-500">{viewingRequests.length} total</span>
              </div>

              {viewingRequests.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No viewing requests received yet.</p>
              ) : (
                <div className="space-y-3">
                  {viewingRequests.map((vw) => (
                    <div key={vw.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(vw.studentName)}&background=0284c7&color=fff&bold=true`}
                          alt={vw.studentName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{vw.studentName}</span>
                            <span className="text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.2 rounded font-mono">
                              LAUTECH Verified
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              vw.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                              vw.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {vw.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Listing: <strong>{vw.propertyTitle}</strong> • {vw.preferredDate} at {vw.preferredTime} ({vw.platform})
                          </p>
                          {vw.notes && <p className="text-xs text-slate-500 italic mt-1">Student Note: "{vw.notes}"</p>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {vw.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setAcceptingViewingId(vw.id);
                                setAcceptNote(`Confirmed! Will call you on WhatsApp at ${vw.preferredTime}.`);
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                            >
                              Accept Viewing
                            </button>
                            <button
                              onClick={() => onDeclineViewing(vw.id)}
                              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        <a
                          href={`https://wa.me/${vw.studentWhatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(vw.studentName)},%20this%20is%20regarding%20your%20viewing%20request%20for%20"${encodeURIComponent(vw.propertyTitle)}".`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                        >
                          WhatsApp Student
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inquiries Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-600" />
                  <h3 className="font-extrabold text-base text-slate-900">Student In-App Messages</h3>
                </div>
                <span className="text-xs font-bold text-slate-500">{inquiries.length} total</span>
              </div>

              {inquiries.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No student messages received yet.</p>
              ) : (
                <div className="space-y-3">
                  {inquiries.map((inq) => (
                    <div key={inq.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(inq.studentName)}&background=10b981&color=fff&bold=true`}
                          alt={inq.studentName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{inq.studentName}</span>
                            <span className="text-xs text-slate-400">• {inq.studentPhone}</span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium mt-1">"{inq.message}"</p>
                          <span className="text-[11px] text-brand-700 font-semibold mt-1 block">
                            Re: {inq.propertyTitle}
                          </span>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/${inq.studentPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(inq.studentName)},%20replying%20to%20your%20inquiry%20on%20CampusNest%20for%20"${encodeURIComponent(inq.propertyTitle)}".`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap self-start sm:self-auto"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Reply on WhatsApp</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab: My Reviews & Student Ratings */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Header & Stats Card */}
            <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Host Reputation & Ratings Hub</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">Student Feedback & Reviews</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    View verified student ratings across your listings in Under-G, Adenike, and Stadium Road. Professional landlord replies build trust with prospective tenants!
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center sm:text-right shrink-0 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Overall Host Rating</span>
                  <div className="text-3xl sm:text-4xl font-black text-amber-400 flex items-center justify-center sm:justify-end gap-1">
                    <span>{avgHostRating}</span>
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400 inline" />
                  </div>
                  <span className="text-[11px] text-slate-300 block font-semibold mt-0.5">
                    From {totalHostReviews} {totalHostReviews === 1 ? 'Review' : 'Reviews'}
                  </span>
                </div>
              </div>

              {/* Tips for Hosts */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-1">
                <strong className="text-white block font-bold">CampusNest Host Standards:</strong>
                <p className="text-slate-300/90 leading-relaxed">
                  Students value timely communication, honest listing descriptions, and functional amenities (boreholes & prepaid meters). Always respond constructively to student feedback.
                </p>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900">
                  All Reviews Received ({hostReviews.length})
                </h4>
              </div>

              {hostReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-card space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                    <Star className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">No Reviews Received Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When verified students complete virtual viewings or reside in your hostels, their ratings and reviews will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {hostReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg">
                              {rev.propertyTitle || 'Your Property'}
                            </span>
                            {rev.isVerifiedExperience && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Verified Experience</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-900 pt-0.5">
                            By {rev.studentName} ({rev.studentDepartment} • {rev.studentLevel || 'Student'})
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Submitted on {new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {rev.updatedAt && ' (Updated)'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-sm px-3 py-1 rounded-xl flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{rev.rating}.0</span>
                          </div>
                          {onRespondToReview && (
                            <button
                              onClick={() => onRespondToReview(rev)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{rev.landlordResponse ? 'Edit Host Reply' : 'Respond as Host'}</span>
                            </button>
                          )}
                          {onReportReview && (
                            <button
                              onClick={() => onReportReview(rev)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Report this review to CampusNest Moderation"
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sub-Ratings Chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Condition</span>
                          <span className="font-extrabold text-slate-800">★ {rev.propertyCondition || rev.rating}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Accuracy</span>
                          <span className="font-extrabold text-slate-800">★ {rev.listingAccuracy || rev.rating}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Location</span>
                          <span className="font-extrabold text-slate-800">★ {rev.locationExperience || rev.rating}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Value</span>
                          <span className="font-extrabold text-slate-800">★ {rev.valueForMoney || rev.rating}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-500 block font-semibold">Landlord</span>
                          <span className="font-extrabold text-slate-800">★ {rev.landlordExperience || rev.rating}</span>
                        </div>
                      </div>

                      {/* Comment */}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100 italic">
                        "{rev.comment}"
                      </p>

                      {/* Review Photos */}
                      {rev.photos && rev.photos.length > 0 && (
                        <div className="flex gap-2">
                          {rev.photos.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="evidence"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      )}

                      {/* Official Landlord Response if present */}
                      {rev.landlordResponse ? (
                        <div className="p-4 bg-emerald-50/80 border-l-4 border-emerald-600 rounded-r-2xl space-y-1 text-xs">
                          <div className="flex items-center justify-between text-emerald-950 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Your Official Response ({rev.landlordResponse.landlordName})</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-normal">
                              {new Date(rev.landlordResponse.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-emerald-900 leading-relaxed">
                            "{rev.landlordResponse.message}"
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>You haven't responded to this student review yet.</span>
                          </div>
                          {onRespondToReview && (
                            <button
                              onClick={() => onRespondToReview(rev)}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors"
                            >
                              Write Response
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Multi-Step Property Creation Wizard */}
        {activeTab === 'wizard' && (
          <div className="space-y-6">
            {formSubmitted ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-card space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Listing Submitted for Admin Verification!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your listing has been submitted to the CampusNest Moderation Desk with status <strong className="text-amber-700">PENDING_VERIFICATION</strong>.
                  Our team will verify the details and publish it live for LAUTECH students.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('my_properties')}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    View in My Properties
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      setFormSubmitted(false);
                    }}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
                  >
                    Create Another Listing
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left 2 Cols: Step-by-Step Form */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
                  
                  {/* Step Progress Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                        Step {currentStep} of 7
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {currentStep === 1 && 'Basic Information'}
                        {currentStep === 2 && 'University & Location'}
                        {currentStep === 3 && 'Pricing & Itemized Fees'}
                        {currentStep === 4 && 'Amenities Checklist'}
                        {currentStep === 5 && 'Property Photos'}
                        {currentStep === 6 && 'Video Tour Walkthrough'}
                        {currentStep === 7 && 'Live Preview & Submission'}
                      </h3>
                    </div>

                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                        <div
                          key={s}
                          onClick={() => setCurrentStep(s)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
                            currentStep === s
                              ? 'bg-brand-600 text-white'
                              : currentStep > s
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1: Basic Info */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Property Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Royal Crest Executive Self-Contain"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Property Type</label>
                          <select
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="self_contain">Self-contained</option>
                            <option value="room_and_parlour">Room and parlour</option>
                            <option value="one_bedroom">1 bedroom</option>
                            <option value="two_bedroom">2 bedroom</option>
                            <option value="three_bedroom">3 bedroom</option>
                            <option value="shared_accommodation">Shared accommodation</option>
                            <option value="hostel">Hostel</option>
                            <option value="apartment">Apartment</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Bedrooms</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={bedrooms}
                            onChange={(e) => setBedrooms(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Bathrooms</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={bathrooms}
                            onChange={(e) => setBathrooms(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Detailed Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Describe the room layout, environment, study atmosphere, light schedule, water pump timing, etc..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {/* Step 2: University & Location */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">University</label>
                          <select
                            value={selectedUnivId}
                            onChange={(e) => setSelectedUnivId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                          >
                            {UNIVERSITIES.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.shortName})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Campus Zone / Neighborhood</label>
                          <select
                            value={selectedZoneId}
                            onChange={(e) => setSelectedZoneId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                          >
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name} ({z.avgWalkTimeToGateMins} mins walk to gate)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                          <input
                            type="text"
                            placeholder="e.g. 14 Destiny Avenue, Under-G"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Prominent Landmark</label>
                          <input
                            type="text"
                            placeholder="e.g. Opposite Bovas Station, 2 mins from gate"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Walk Time to Gate</label>
                          <input
                            type="text"
                            placeholder="e.g. 4 mins walk"
                            value={walkTime}
                            onChange={(e) => setWalkTime(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Bike Ride Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 2 mins bike"
                            value={bikeTime}
                            onChange={(e) => setBikeTime(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Pricing & Fees */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950">
                        <strong className="block font-bold">CampusNest Transparent Fee Engine:</strong>
                        <span>Enter actual values only. Never invent fees. The total will be calculated automatically.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Rent Amount (₦)</label>
                          <input
                            type="number"
                            required
                            value={annualRent}
                            onChange={(e) => setAnnualRent(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Frequency</label>
                          <select
                            value={paymentFrequency}
                            onChange={(e) => setPaymentFrequency(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="annually">Annually (Per Year)</option>
                            <option value="per_semester">Per Semester</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Agency Fee (₦)</label>
                          <input
                            type="number"
                            value={agencyFee}
                            onChange={(e) => setAgencyFee(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Agreement Fee (₦)</label>
                          <input
                            type="number"
                            value={agreementFee}
                            onChange={(e) => setAgreementFee(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Caution Fee (₦)</label>
                          <input
                            type="number"
                            value={cautionFee}
                            onChange={(e) => setCautionFee(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Service Charge (₦)</label>
                          <input
                            type="number"
                            value={serviceCharge}
                            onChange={(e) => setServiceCharge(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">Other Fees (₦)</label>
                          <input
                            type="number"
                            value={otherFees}
                            onChange={(e) => setOtherFees(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                          />
                        </div>

                        <div className="bg-emerald-700 text-white p-2.5 rounded-xl flex flex-col justify-center">
                          <span className="text-[10px] text-emerald-200 uppercase font-bold">Estimated Total</span>
                          <span className="text-sm font-extrabold">{formatNaira(estimatedTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Amenities Checklist */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600">
                        Check all amenities physically present at the property. Only select real features.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          'Water',
                          '24/7 Motorized Borehole',
                          'Electricity',
                          'Prepaid meter',
                          'Solar Backup',
                          'Generator',
                          'Security',
                          'Parking',
                          'Kitchen',
                          'Bathroom',
                          'Wi-Fi',
                          'Wardrobe',
                          'Tiled floor',
                          'Fence',
                          'Other',
                        ].map((amenity) => {
                          const isChecked = selectedAmenities.includes(amenity);
                          return (
                            <label
                              key={amenity}
                              onClick={() => handleToggleAmenity(amenity)}
                              className={`flex items-center space-x-2 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-brand-600 focus:ring-brand-500"
                              />
                              <span>{amenity}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Property Photos */}
                  {currentStep === 5 && (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                        Upload photos of the <strong>Exterior, Entrance, Main room, Bedroom, Bathroom, Kitchen</strong>, and Compound.
                      </div>

                      {/* File Upload Box */}
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <Upload className="w-8 h-8 text-brand-600 mb-2" />
                        <span className="text-xs font-bold text-slate-800">Click to upload photos</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 5MB</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Photos Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                        {uploadedPhotos.map((url, idx) => (
                          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100">
                            <img src={url} alt="prop" className="w-full h-full object-cover" />
                            {primaryPhotoIndex === idx && (
                              <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Cover
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5">
                              {primaryPhotoIndex !== idx && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryPhotoIndex(idx)}
                                  className="p-1 rounded bg-white text-slate-800 text-[10px] font-bold"
                                >
                                  Set Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))}
                                className="p-1 rounded bg-rose-600 text-white"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 6: Video Walkthrough Tour */}
                  {currentStep === 6 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-xs text-teal-950 space-y-1">
                        <strong className="block font-bold text-sm text-teal-950 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-teal-700" />
                          <span>Search First. Visit Less. (HD Video Tour)</span>
                        </strong>
                        <p className="leading-relaxed text-teal-900/80">
                          Upload a continuous 30–90 second walkthrough video showing: <strong>Entrance → Room → Bathroom → Kitchen → Compound</strong>. Listings with verified video tours receive <strong>4x more student viewings</strong>!
                        </p>
                      </div>

                      {/* Video File Upload Box */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                          Upload Video File from Device (MP4, MOV, WebM)
                        </label>

                        {!videoUrl ? (
                          <label className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-teal-50/30 hover:bg-teal-50/70 transition-colors group">
                            <div className="w-14 h-14 rounded-2xl bg-teal-100 group-hover:bg-teal-200 text-teal-700 flex items-center justify-center mb-2 transition-colors">
                              <Video className="w-7 h-7" />
                            </div>
                            <span className="text-sm font-bold text-slate-900">Click or tap to upload hostel video</span>
                            <span className="text-xs text-slate-500 mt-1">MP4, WebM, QuickTime up to 100MB</span>
                            <span className="mt-3 px-4 py-1.5 bg-teal-600 group-hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs">
                              Select Video File
                            </span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime,video/*"
                              onChange={handleVideoFileUpload}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3 shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                                <span>Video Loaded & Ready for Students</span>
                              </span>
                              <div className="flex items-center space-x-2">
                                <label className="cursor-pointer text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors">
                                  Change Video
                                  <input
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,video/*"
                                    onChange={handleVideoFileUpload}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVideoUrl('');
                                    setHasVideo(false);
                                  }}
                                  className="text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <video
                              src={videoUrl}
                              controls
                              className="w-full h-56 sm:h-64 rounded-2xl object-cover bg-black"
                            />
                          </div>
                        )}
                      </div>

                      {/* Fallback URL Input */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Or paste Video URL / YouTube / Google Drive link
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. https://assets.mixkit.co/... or YouTube walkthrough link"
                          value={videoUrl}
                          onChange={(e) => {
                            setVideoUrl(e.target.value);
                            setHasVideo(Boolean(e.target.value.trim()));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 7: Live Preview & Submission */}
                  {currentStep === 7 && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Student-Facing Preview Summary
                        </span>
                        <h4 className="font-extrabold text-base text-slate-900">{title || 'Untitled Property'}</h4>
                        <p className="text-xs text-slate-600">{matchedZone.name} • {address}</p>
                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                          <span className="font-bold text-sm text-slate-900">{formatNaira(annualRent)} / yr</span>
                          <span className="font-extrabold text-xs text-emerald-700">Estimated Total: {formatNaira(estimatedTotal)}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Upon submission, the listing will enter <strong className="text-amber-800">PENDING_VERIFICATION</strong> status. 
                          The CampusNest verification desk will inspect the listing before making it public to students.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentStep === 1}
                      onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Previous Step
                    </button>

                    {currentStep < 7 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1))}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitListing}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Verification</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Right Col: Listing Completeness Score Widget */}
                <div className="space-y-4">
                  <ListingCompletenessWidget property={currentFormPartial} />
                </div>

              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-extrabold text-base text-slate-900">No Notifications</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You will receive updates here when admin reviews your listings or flags changes.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkNotificationRead(n.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                    n.isRead ? 'bg-white border-slate-200' : 'bg-brand-50/70 border-brand-300 shadow-xs'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    n.type === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    n.type === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {n.type === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                      <span className="text-[11px] text-slate-400">{n.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] font-semibold text-brand-700 mt-1 block">
                      {n.propertyTitle}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

          </div>
        </div>

      </div>

      {/* Accept Viewing Modal */}
      {acceptingViewingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Confirm Viewing Appointment</h3>
              <button onClick={() => setAcceptingViewingId(null)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Provide an optional message for the student. They will receive an in-app notification and WhatsApp confirmation.
            </p>
            <textarea
              rows={3}
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900"
            ></textarea>
            <div className="flex space-x-2 pt-1">
              <button onClick={() => setAcceptingViewingId(null)} className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleConfirmAccept} className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs">
                Confirm & Accept
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
