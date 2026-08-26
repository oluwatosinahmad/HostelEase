import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Video, 
  Footprints, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Droplets, 
  Zap, 
  SlidersHorizontal, 
  Bookmark, 
  Phone, 
  MessageSquare, 
  Building2, 
  Award, 
  Flag,
  Calendar,
  Sparkles,
  Check,
  SunMedium,
  Clock,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Send,
  AlertTriangle,
  Info,
  UserX,
  ShieldAlert,
  CalendarClock,
  Edit3,
  Camera,
  ArrowUpDown,
  UserCheck,
  CalendarCheck,
  Share2
} from 'lucide-react';
import { Property, StudentReview, UserProfile, ReviewSortOption } from '../types';
import { HostelStudentInsights } from './HostelStudentInsights';
import { formatNaira } from '../utils/formatters';

interface PropertyDetailModalProps {
  property: Property | null;
  reviews?: StudentReview[];
  currentUser?: UserProfile | null;
  currentUserRole?: 'student' | 'landlord' | 'admin';
  currentUserId?: string;
  isSaved: boolean;
  isCompared: boolean;
  onClose: () => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (property: Property) => void;
  onOpenReportModal: (property: Property) => void;
  onOpenLandlordReportModal?: (landlord: Property['landlord']) => void;
  onOpenLandlordProfile: (landlord: Property['landlord']) => void;
  onBookInspection: (property: Property) => void;
  onSendInquiry: (property: Property) => void;
  onOpenSafetyGuide?: () => void;
  onWriteReview?: (property: Property) => void;
  onOpenWriteReview?: (property: Property) => void;
  onReportReview?: (review: StudentReview) => void;
  onOpenLandlordResponse?: (review: StudentReview) => void;
  onRequestBooking?: (property: Property) => void;
  onShareProperty?: (property: Property) => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  reviews,
  currentUser,
  currentUserRole,
  currentUserId,
  isSaved,
  isCompared,
  onClose,
  onToggleSave,
  onToggleCompare,
  onOpenReportModal,
  onOpenLandlordReportModal,
  onOpenLandlordProfile,
  onBookInspection,
  onSendInquiry,
  onOpenSafetyGuide,
  onWriteReview,
  onOpenWriteReview,
  onReportReview,
  onOpenLandlordResponse,
  onRequestBooking,
  onShareProperty,
  onShowToast,
}) => {
  if (!property) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'verification' | 'reviews'>('overview');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);

  const handleTriggerWriteReview = onOpenWriteReview || onWriteReview;

  const visibleReviews = (reviews || []).filter(
    (r) => r.propertyId === property.id && r.status !== 'HIDDEN'
  );

  const totalReviewsCount = visibleReviews.length;
  const avgOverallRating =
    totalReviewsCount > 0
      ? (
          visibleReviews.reduce((sum, r) => sum + r.rating, 0) /
          totalReviewsCount
        ).toFixed(1)
      : property.overallRating.toFixed(1);

  // 5-Star Histogram
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = visibleReviews.filter((r) => Math.round(r.rating) === stars).length;
    const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
    return { stars, count, percentage };
  });

  // Category Averages
  const categoryAverages = {
    condition: totalReviewsCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.propertyCondition || r.rating), 0) / totalReviewsCount).toFixed(1)
      : '4.8',
    accuracy: totalReviewsCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.listingAccuracy || r.rating), 0) / totalReviewsCount).toFixed(1)
      : '4.9',
    location: totalReviewsCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.locationExperience || r.rating), 0) / totalReviewsCount).toFixed(1)
      : '4.7',
    value: totalReviewsCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.valueForMoney || r.rating), 0) / totalReviewsCount).toFixed(1)
      : '4.5',
    landlord: totalReviewsCount > 0
      ? (visibleReviews.reduce((sum, r) => sum + (r.landlordExperience || r.rating), 0) / totalReviewsCount).toFixed(1)
      : '4.8',
  };

  // Sorted reviews
  const sortedReviews = [...visibleReviews].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating;
    if (reviewSort === 'lowest') return a.rating - b.rating;
    if (reviewSort === 'verified_only') {
      if (a.isVerifiedExperience && !b.isVerifiedExperience) return -1;
      if (!a.isVerifiedExperience && b.isVerifiedExperience) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // 'newest' default
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const studentHasExistingReview = currentUser
    ? visibleReviews.some((r) => r.studentId === currentUser.id)
    : false;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      
      {/* Modal Card */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Top Header Sticky Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap">
            {property.isDemo && (
              <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs tracking-wider">
                DEMO PROPERTY
              </span>
            )}
            {property.verificationStatus === 'VERIFIED' ? (
              <button
                onClick={() => setShowVerificationInfo(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full transition-colors cursor-pointer"
                title="Click to learn what CampusNest has verified"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified by CampusNest</span>
                <Info className="w-3 h-3 text-emerald-600" />
              </button>
            ) : property.verificationStatus === 'EXPIRED' ? (
              <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                <span>Verification Expired</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {property.verificationStatus.replace('_', ' ')}
              </span>
            )}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              {property.zoneName} ({property.cityName})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleCompare(property)}
              className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                isCompared
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Compare with other hostels"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleSave(property.id)}
              className={`p-2 rounded-xl border transition-all ${
                isSaved
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Save to shortlist"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Info Explainer Drawer / Banner */}
        {showVerificationInfo && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-2 animate-fadeIn relative">
            <button
              onClick={() => setShowVerificationInfo(false)}
              className="absolute top-3 right-3 text-emerald-700 hover:text-emerald-950"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="font-extrabold text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>About CampusNest Verification</span>
            </div>
            <p className="leading-relaxed">
              This property has passed CampusNest's current verification process. Verification includes reviewing submitted photos/videos, confirming the physical location, validating itemized fee breakdowns, and confirming host credentials.
            </p>
            <p className="text-[11px] text-emerald-900/80 font-medium">
              <em>Note: Verification does not guarantee that a property is 100% risk-free. Always ask questions and review fees before commitment.</em>
            </p>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Title & Basic Info */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{property.title}</h2>
              <div className="text-xl sm:text-2xl font-black text-brand-700">
                {formatNaira(property.fees.annualRent)}
                <span className="text-xs text-slate-400 font-normal">/year</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                {property.address}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-600">{property.landmark}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                {property.distanceText || `${property.distanceKmFromGate} km from Gate`}
              </span>
            </div>
          </div>

          {/* Media Carousel / Lightbox */}
          <div className="space-y-2">
            <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden bg-slate-900 shadow-md">
              {isPlayingVideo && property.videoTourUrl ? (
                <div className="relative w-full h-full">
                  <video
                    src={property.videoTourUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setIsPlayingVideo(false)}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-xl text-xs font-bold"
                  >
                    Switch to Photos
                  </button>
                </div>
              ) : (
                <>
                  <img
                    src={property.images[activeImageIndex] || property.coverImage}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Badges on image */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-xl">
                      {activeImageIndex + 1} / {property.images.length} Photos
                    </span>
                    {property.hasVideoTour && (
                      <button
                        onClick={() => setIsPlayingVideo(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold px-3 py-1 rounded-xl flex items-center gap-1 shadow-md animate-pulse"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Watch Video Tour</span>
                      </button>
                    )}
                  </div>

                  {/* Carousel Controls */}
                  {property.images.length > 1 && (
                    <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none">
                      <button
                        onClick={handlePrevImage}
                        className="pointer-events-auto p-2 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-md transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="pointer-events-auto p-2 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-md transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            {property.images.length > 1 && !isPlayingVideo && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsPlayingVideo(false);
                      setActiveImageIndex(idx);
                    }}
                    className={`relative w-20 h-14 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx && !isPlayingVideo
                        ? 'border-brand-600 ring-2 ring-brand-500/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Landlord Profile Card Trigger */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div 
              onClick={() => onOpenLandlordProfile(property.landlord)}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {property.landlord.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 group-hover:text-brand-700">{property.landlord.name}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Verified Host
                  </span>
                </div>
                <p className="text-xs text-slate-500 capitalize">
                  {property.authorizationType ? property.authorizationType.replace('_', ' ') : property.landlord.type.replace('_', ' ')} • Active Listings: {property.landlord.activeListings}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenLandlordProfile(property.landlord)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold"
              >
                Host Profile
              </button>
              {onOpenLandlordReportModal && (
                <button
                  onClick={() => onOpenLandlordReportModal(property.landlord)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1"
                  title="Report host for misconduct or fraud"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Report Host</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 flex space-x-4 text-sm font-semibold">
            {[
              { id: 'overview', label: 'Overview & Amenities' },
              { id: 'fees', label: 'Pricing & Itemized Fees' },
              { id: 'verification', label: 'Verification Details' },
              { id: 'reviews', label: `Reviews (${totalReviewsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-3">Amenities & Facilities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {property.amenities.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-brand-600" />
                  <span>Campus Proximity & Commute</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-800 block">Distance to Gate</span>
                    <span>{property.distanceText || `${property.distanceKmFromGate} km to LAUTECH Gate`}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-800 block">Walk & Bike Times</span>
                    <span>{property.walkTimeToGate} • {property.bikeTimeToGate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Itemized Fees (Real Price Transparency) */}
          {activeTab === 'fees' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">CampusNest Total Price Guarantee</span>
                  <span className="text-sm font-semibold text-slate-200">No surprise charges when you visit or inspect</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Estimated Total</span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatNaira(property.fees.estimatedTotal)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5 text-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">Base Annual Rent</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">MANDATORY</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatNaira(property.fees.annualRent)}</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">Agency / Host Documentation</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">MANDATORY</span>
                  </div>
                  <span className="font-semibold text-slate-800">{formatNaira(property.fees.agencyFee)}</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">Tenancy Legal / Agreement Fee</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">MANDATORY</span>
                  </div>
                  <span className="font-semibold text-slate-800">{formatNaira(property.fees.agreementFee)}</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-medium">Caution / Damages Deposit</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">REFUNDABLE</span>
                  </div>
                  <span className="font-semibold text-slate-800">{formatNaira(property.fees.cautionFee)}</span>
                </div>

                {property.fees.serviceCharge > 0 && (
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-medium">Service Charge (Compound & Security)</span>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">MANDATORY</span>
                    </div>
                    <span className="font-semibold text-slate-800">{formatNaira(property.fees.serviceCharge)}</span>
                  </div>
                )}

                {property.fees.otherFees > 0 && (
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-medium">Other Miscellaneous Fees</span>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">MANDATORY</span>
                    </div>
                    <span className="font-semibold text-slate-800">{formatNaira(property.fees.otherFees)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base font-extrabold pt-2 text-emerald-950">
                  <div>
                    <span>Total Real First-Year Cost</span>
                    <span className="text-xs text-slate-500 font-normal block">Includes Rent + Caution + Agency + Legal + Service</span>
                  </div>
                  <span className="text-xl text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-xl">
                    {formatNaira(property.fees.estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Verification Details (Phase 4 Detailed Breakdown) */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <div className="font-extrabold text-sm flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>✓ Verified by CampusNest</span>
                  </div>
                  {property.lastVerifiedDate && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Last Verified: {property.lastVerifiedDate}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed">
                  This property has been reviewed and verified by CampusNest administrators against our student accommodation criteria.
                </p>
                {property.verificationValidUntil && (
                  <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                    Verification valid until: <strong>{property.verificationValidUntil}</strong>
                  </div>
                )}
              </div>

              {/* What was checked */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Location & Proximity</span>
                  </div>
                  <p className="text-slate-600">Physical address confirmed in {property.zoneName} ({property.distanceText}).</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pricing & Fee Itemization</span>
                  </div>
                  <p className="text-slate-600">Zero hidden fees. Itemized rent, caution, and legal fees validated.</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span>Water Verification</span>
                  </div>
                  <p className="text-slate-600">{property.inspectionReport.waterNote}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Electricity & Meter</span>
                  </div>
                  <p className="text-slate-600">{property.inspectionReport.electricityNote}</p>
                </div>
              </div>

              {/* Honest Disclaimer */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Student Transparency Note:</strong> Verification means CampusNest has inspected and validated the stated parameters. It does not constitute a financial guarantee. We advise testing facilities during your inspection before final payment.
                </span>
              </div>
            </div>
          )}

          {/* Tab 4: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Phase 14: Structured Student Insights & Verified Stays */}
              <HostelStudentInsights
                propertyId={property.id}
                propertyTitle={property.title}
                isAuthenticated={Boolean(currentUser)}
                onShowToast={onShowToast || (() => {})}
              />

              {/* Top Overview & Ratings Histogram */}
              <div className="bg-gradient-to-br from-slate-900 to-brand-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Big Rating Box */}
                  <div className="md:col-span-5 text-center md:text-left border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-white">{avgOverallRating}</span>
                      <div className="space-y-0.5">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(Number(avgOverallRating))
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-white/20'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-300 block font-semibold">
                          Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'student reviews'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Transparent student feedback covering water reliability, light, road access, and host responsiveness.
                    </p>

                    {onWriteReview && (
                      <button
                        onClick={() => onWriteReview(property)}
                        className="mt-3.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{studentHasExistingReview ? 'Edit My Review' : 'Write a Review'}</span>
                      </button>
                    )}
                  </div>

                  {/* 5-Star Histogram */}
                  <div className="md:col-span-7 space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                      Rating Distribution
                    </span>
                    {ratingDistribution.map(({ stars, count, percentage }) => (
                      <div key={stars} className="flex items-center space-x-2 text-xs">
                        <span className="w-6 font-bold text-amber-300 flex items-center gap-0.5">
                          <span>{stars}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-[11px] text-slate-400 text-right">{count}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Category Averages Row */}
                <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Condition</span>
                    <span className="text-sm font-extrabold text-amber-300">★ {categoryAverages.condition}</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Accuracy</span>
                    <span className="text-sm font-extrabold text-amber-300">★ {categoryAverages.accuracy}</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Location</span>
                    <span className="text-sm font-extrabold text-amber-300">★ {categoryAverages.location}</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-semibold">Value</span>
                    <span className="text-sm font-extrabold text-amber-300">★ {categoryAverages.value}</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Host / Agent</span>
                    <span className="text-sm font-extrabold text-amber-300">★ {categoryAverages.landlord}</span>
                  </div>
                </div>
              </div>

              {/* Sorting & Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs font-extrabold text-slate-800">
                  {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'} for {property.title}
                </span>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-xs text-slate-500 font-semibold">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Sort by:</span>
                  </div>
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as ReviewSortOption)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="newest">Most Recent</option>
                    <option value="highest">Highest Rating (5★ first)</option>
                    <option value="lowest">Lowest Rating (Critical first)</option>
                    <option value="verified_only">Verified Experiences Only</option>
                  </select>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {sortedReviews.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                    <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-2xl mx-auto flex items-center justify-center">
                      <Star className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-slate-800 text-sm">No reviews found matching criteria</h5>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Be the first verified student to rate and review this accommodation!
                      </p>
                    </div>
                    {onWriteReview && (
                      <button
                        onClick={() => onWriteReview(property)}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Write a Review
                      </button>
                    )}
                  </div>
                ) : (
                  sortedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3 transition-all hover:border-slate-300"
                    >
                      {/* Reviewer Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                            {rev.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900">{rev.studentName}</span>
                              {rev.isVerifiedExperience && (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Verified Experience</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {rev.studentDepartment} • {rev.studentLevel || 'Student'} • {rev.stayPeriod || 'Resident'}
                            </span>
                          </div>
                        </div>

                        {/* Overall Rating & Date */}
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs px-2.5 py-1 rounded-xl">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{rev.rating}.0</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(rev.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {rev.updatedAt && ' (Updated)'}
                          </span>
                        </div>
                      </div>

                      {/* Sub-Rating Pills */}
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          Condition: <strong>★{rev.propertyCondition || rev.rating}</strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          Accuracy: <strong>★{rev.listingAccuracy || rev.rating}</strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          Location: <strong>★{rev.locationExperience || rev.rating}</strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          Value: <strong>★{rev.valueForMoney || rev.rating}</strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          Host: <strong>★{rev.landlordExperience || rev.rating}</strong>
                        </span>
                      </div>

                      {/* Review Comment */}
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        "{rev.comment}"
                      </p>

                      {/* Review Photos Gallery */}
                      {rev.photos && rev.photos.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {rev.photos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <img src={photo} alt="review evidence" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Landlord Response Callout */}
                      {rev.landlordResponse && (
                        <div className="mt-3 p-3.5 bg-slate-50 border-l-4 border-brand-600 rounded-r-2xl space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-900">
                            <span className="font-bold flex items-center gap-1.5 text-brand-900">
                              <Building2 className="w-3.5 h-3.5 text-brand-600" />
                              <span>Landlord Response ({rev.landlordResponse.landlordName})</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(rev.landlordResponse.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed italic">
                            "{rev.landlordResponse.message}"
                          </p>
                        </div>
                      )}

                      {/* Review Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <span>{rev.helpfulCount || 0} students found this helpful</span>
                        {onReportReview && (
                          <button
                            onClick={() => onReportReview(rev)}
                            className="hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors"
                            title="Report this review if it contains spam, harassment or fake information"
                          >
                            <Flag className="w-3 h-3" />
                            <span>Report Review</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Actions Sticky Bar */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenReportModal(property)}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report Listing</span>
            </button>
            {onOpenSafetyGuide && (
              <>
                <span className="text-slate-300">•</span>
                <button
                  onClick={onOpenSafetyGuide}
                  className="text-xs font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Safety Checklist</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center space-x-2">
            {onShareProperty && (
              <button
                onClick={() => onShareProperty(property)}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer border border-emerald-200"
                title="Share this property via WhatsApp or social media"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Share</span>
              </button>
            )}

            <button
              onClick={() => onSendInquiry(property)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <span>Inquire</span>
            </button>

            <button
              onClick={() => onBookInspection(property)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Virtual Tour</span>
            </button>

            {onRequestBooking && (
              property.availabilityStatus === 'UNAVAILABLE' || property.availabilityStatus === 'RESERVED' ? (
                <button
                  disabled
                  className="px-5 py-2.5 bg-slate-300 text-slate-500 font-extrabold text-xs sm:text-sm rounded-xl cursor-not-allowed flex items-center space-x-1.5"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Currently Reserved</span>
                </button>
              ) : (
                <button
                  onClick={() => onRequestBooking(property)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Reserve This Property</span>
                </button>
              )
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
