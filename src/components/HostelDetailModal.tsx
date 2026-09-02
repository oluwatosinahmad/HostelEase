import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  ShieldCheck, 
  Bookmark, 
  Calendar, 
  Flag, 
  Zap, 
  Droplets, 
  Wifi, 
  Shield, 
  Utensils, 
  Cpu, 
  Sun, 
  Car, 
  Shirt, 
  BedDouble, 
  Camera, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User as UserIcon, 
  Footprints, 
  Info, 
  Check, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  UserCheck,
  SlidersHorizontal,
  MessageSquare,
  MessageCircle,
  Send,
  Receipt,
  Sparkles
} from 'lucide-react';
import { Property, MediaCategory, UserRole } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance, getAvailabilityBadgeInfo, getPropertyTypeLabel } from '../utils/formatters';
import { InspectionModal } from './InspectionModal';
import { ReportListingModal } from './ReportListingModal';
import { ProviderPublicProfileModal } from './ProviderPublicProfileModal';

interface HostelDetailModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleSave: (propertyId: string, isSaved: boolean) => void;
  onToggleCompare?: (propertyId: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  onOpenBookingModal?: (property: Property) => void;
  onRequestInspection?: (property: Property) => void;
  onOpenAuth?: (role: UserRole) => void;
  onOpenAI?: (property: Property) => void;
  isCompared?: boolean;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const HostelDetailModal: React.FC<HostelDetailModalProps> = ({
  propertyId,
  isOpen,
  onClose,
  onToggleSave,
  onToggleCompare,
  onOpenConversation,
  onOpenBookingModal,
  onRequestInspection,
  onOpenAuth,
  onOpenAI,
  isCompared = false,
  onShowToast
}) => {
  const { isAuthenticated } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [activeMediaCategory, setActiveMediaCategory] = useState<MediaCategory | 'ALL'>('ALL');
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Modals state
  const [inspectionModalOpen, setInspectionModalOpen] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [providerProfileModalOpen, setProviderProfileModalOpen] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Direct DM & Inquiry State
  const [inquiryText, setInquiryText] = useState<string>('');
  const [sendingInquiry, setSendingInquiry] = useState<boolean>(false);

  const handleInspectClick = () => {
    if (!isAuthenticated) {
      onShowToast('Please create an account or sign in first to schedule an inspection.', 'error');
      if (onOpenAuth) {
        onClose();
        onOpenAuth('STUDENT');
      } else {
        window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }));
        onClose();
      }
      return;
    }
    if (onRequestInspection && property) {
      onClose();
      onRequestInspection(property);
    } else {
      setInspectionModalOpen(true);
    }
  };

  const handleBookClick = () => {
    if (!isAuthenticated) {
      onShowToast('Please create an account or sign in first to book a hostel.', 'error');
      if (onOpenAuth) {
        onClose();
        onOpenAuth('STUDENT');
      } else {
        window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }));
        onClose();
      }
      return;
    }
    if (onOpenBookingModal && property) {
      onClose();
      onOpenBookingModal(property);
    }
  };

  const handleSendDirectInquiry = async (customMessage?: string) => {
    if (!property) return;
    if (!isAuthenticated) {
      onShowToast('Please create an account or sign in first to message the landlord.', 'error');
      if (onOpenAuth) {
        onClose();
        onOpenAuth('STUDENT');
      } else {
        window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }));
        onClose();
      }
      return;
    }
    const textToSend = (customMessage || inquiryText).trim() || `Hello! I am interested in ${property.title}. Is this room still available for rent?`;
    
    setSendingInquiry(true);
    try {
      if (onOpenConversation) {
        await api.messages.startConversation(property.id, textToSend);
        onShowToast(`Enquiry sent directly to ${property.provider?.name || 'Landlord'}'s DM!`, 'success');
        onClose();
        onOpenConversation(property.id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Could not send enquiry', 'error');
    } finally {
      setSendingInquiry(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!property) return;
    const rawPhone = property.provider?.phone || '08039876543';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.substring(1);
    }
    const message = encodeURIComponent(`Hello ${property.provider?.name || 'Landlord'}, I am inquiring about "${property.title}" listed on Hostel Ease. Is it currently available for inspection / rent?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  useEffect(() => {
    if (!isOpen || !propertyId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.properties.getById(propertyId)
      .then(res => {
        if (isMounted) {
          setProperty(res.property);
          setIsSaved(Boolean(res.property.isSaved));
          setActiveMediaIndex(0);
          setLoading(false);
          api.discovery.trackRecentlyViewed(propertyId).catch(() => {});
          api.student.recordRecentlyViewed(propertyId).catch(() => {});
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Failed to load property details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  const handleSaveToggle = async () => {
    if (!property) return;
    try {
      const nextState = !isSaved;
      setIsSaved(nextState);
      await onToggleSave(property.id, nextState);
      onShowToast(nextState ? 'Saved to your shortlist' : 'Removed from shortlist', 'success');
    } catch (err) {
      setIsSaved(!isSaved);
      onShowToast('Could not update shortlist', 'error');
    }
  };

  const handleShare = () => {
    if (navigator.share && property) {
      navigator.share({
        title: `${property.title} | Hostel Ease LAUTECH`,
        text: `Check out ${property.title} in ${property.area.name} on Hostel Ease. Rent: ${formatNaira(property.priceSummary?.rentAmount)}/yr.`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      onShowToast('Listing link copied to clipboard!', 'info');
    }
  };

  // Filter media by category
  const filteredMedia = property?.media?.filter(m => {
    if (activeMediaCategory === 'ALL') return true;
    return m.category === activeMediaCategory;
  }) || [];

  const currentMedia = filteredMedia[activeMediaIndex] || filteredMedia[0] || {
    url: property?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'IMAGE',
    caption: 'Lodge View'
  };

  const renderAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Droplets': return <Droplets className="w-4 h-4 text-sky-500" />;
      case 'Wifi': return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'ShieldCheck':
      case 'Shield': return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'Utensils': return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-indigo-500" />;
      case 'Sun': return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'Car': return <Car className="w-4 h-4 text-slate-600" />;
      case 'Shirt': return <Shirt className="w-4 h-4 text-cyan-600" />;
      case 'BedDouble': return <BedDouble className="w-4 h-4 text-rose-500" />;
      default: return <Check className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 min-h-screen md:min-h-0 md:max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Sticky Header Bar */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded uppercase">
              Hostel Ease Verified
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
              {property?.area?.name || 'LAUTECH'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSaveToggle}
              className={`p-2 rounded-full transition-all ${
                isSaved ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save to shortlist'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              title="Report listing"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading verified hostel details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  api.properties.getById(propertyId)
                    .then(res => {
                      setProperty(res.property);
                      setIsSaved(Boolean(res.property.isSaved));
                      setLoading(false);
                    })
                    .catch(err => {
                      setError(err.message || 'Failed to load details');
                      setLoading(false);
                    });
                }}
                className="px-3 py-1 bg-red-600 text-white rounded-xl text-xs font-bold shadow"
              >
                Try Again
              </button>
            </div>
          )}

          {property && (
            <>
              {/* Demo Listing Notice */}
              {property.isDemo && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-2 text-amber-900 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-400 text-amber-950 rounded font-black text-[10px]">
                      DEMO DATA
                    </span>
                    <span>This listing is for platform demonstration & testing around LAUTECH Ogbomoso.</span>
                  </div>
                </div>
              )}

              {/* Title & Quick Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getAvailabilityBadgeInfo(property.availabilityStatus).bg}`}>
                    {getAvailabilityBadgeInfo(property.availabilityStatus).label}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                    {getPropertyTypeLabel(property.propertyType)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Hostel Ease Verified
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
                  {property.title}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    {property.address}, {property.area.name}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <Footprints className="w-3.5 h-3.5" />
                    {formatDistance(property.distanceFromCampusKm)}
                  </span>
                </div>
              </div>

              {/* 1. Categorized Media Gallery & Walkthrough */}
              <div className="space-y-3">
                {/* Media Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { key: 'ALL', label: 'All Media' },
                    { key: 'EXTERIOR', label: 'Exterior' },
                    { key: 'BEDROOM', label: 'Bedroom' },
                    { key: 'BATHROOM', label: 'Bathroom' },
                    { key: 'KITCHEN', label: 'Kitchen' },
                    { key: 'COMPOUND', label: 'Compound' },
                    { key: 'VIDEO_WALKTHROUGH', label: '🎥 Video Tour' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveMediaCategory(tab.key as any);
                        setActiveMediaIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeMediaCategory === tab.key
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Main Media Display Viewport */}
                <div className="relative aspect-[16/9] md:aspect-[21/10] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {currentMedia.mediaType === 'VIDEO' ? (
                    <div className="w-full h-full bg-black relative flex items-center justify-center">
                      <video
                        src={currentMedia.url}
                        controls
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <img
                      src={currentMedia.url || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80'}
                      alt={currentMedia.caption || property.title}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80';
                      }}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Caption & Counter */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
                    <span className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg font-medium">
                      {currentMedia.caption || 'Verified Hostel Photo'}
                    </span>
                    <span className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg font-bold">
                      {activeMediaIndex + 1} / {filteredMedia.length || 1}
                    </span>
                  </div>

                  {/* Nav Arrows */}
                  {filteredMedia.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : filteredMedia.length - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveMediaIndex((prev) => (prev < filteredMedia.length - 1 ? prev + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails Row */}
                {filteredMedia.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {filteredMedia.map((m, idx) => (
                      <button
                        key={m.id || idx}
                        onClick={() => setActiveMediaIndex(idx)}
                        className={`relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                          activeMediaIndex === idx ? 'border-emerald-600 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        {m.mediaType === 'VIDEO' ? (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-emerald-400">
                            <Video className="w-5 h-5" />
                          </div>
                        ) : (
                          <img 
                            src={m.url} 
                            alt="thumb" 
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80';
                            }}
                            className="w-full h-full object-cover" 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Content Grid: Description & Transparent Price Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 text-slate-900 dark:text-slate-100">
                {/* Left 2 Cols: Description, Facilities, Location, Provider */}
                <div className="lg:col-span-2 space-y-6">
                  {/* About the Hostel */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                      Accommodation Description
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {property.description}
                    </p>
                  </div>

                  {/* Available Room Types */}
                  {property.rooms && property.rooms.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Available Room Configurations
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {property.rooms.map(room => (
                          <div 
                            key={room.id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{room.name}</h4>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                {room.quantityAvailable} left
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                              <p>• Max occupants: {room.maxOccupants} student{room.maxOccupants > 1 ? 's' : ''}</p>
                              <p>• Ensuite bathroom: {room.isEnsuite ? 'Yes (Private)' : 'Shared'}</p>
                              <p>• Furnishing: {room.isFurnished ? 'Furnished (Bed & Desk)' : 'Unfurnished'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Facilities & Amenities */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Verified Facilities & Amenities
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {property.amenities.map(am => (
                          <div 
                            key={am.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                              am.isAvailable 
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium' 
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 line-through'
                            }`}
                          >
                            {renderAmenityIcon(am.icon)}
                            <span className="truncate">{am.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location & LAUTECH Proximity */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      LAUTECH Location & Navigation
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <p className="text-slate-400 dark:text-slate-400 font-semibold uppercase text-[10px]">Area</p>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{property.area.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-slate-400 font-semibold uppercase text-[10px]">Distance to Campus</p>
                        <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{formatDistance(property.distanceFromCampusKm)}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-400 dark:text-slate-400 font-semibold uppercase text-[10px]">Landmark / Directions</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{property.nearbyLandmark || property.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Provider / Landlord Information Card */}
                  {property.provider && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-emerald-600/20">
                            {property.provider.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                              Verified Hostel Landlord
                            </p>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {property.provider.name}
                            </h4>
                            {property.provider.businessName && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">{property.provider.businessName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {property.provider.id && (
                            <button
                              onClick={() => setProviderProfileModalOpen(true)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 text-xs font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-1 shadow-sm"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Profile
                            </button>
                          )}
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Verified Landlord
                          </span>
                        </div>
                      </div>

                      {/* Direct DM / Instant Inquiry Box to Landlord's Inbox */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                                Direct Inquiry to {property.provider.name.split(' ')[0]}'s DM
                              </h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Goes directly to this landlord's personal inbox & alerts them on WhatsApp.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Question Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            'Is this hostel still available for rent?',
                            'Can I schedule a physical inspection this week?',
                            'How steady is the electricity & water supply?',
                            'Is the first-year rent strictly fixed?'
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInquiryText(chip);
                                handleSendDirectInquiry(chip);
                              }}
                              className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 transition-colors text-left"
                            >
                              💬 {chip}
                            </button>
                          ))}
                        </div>

                        {/* Custom Inquiry Textarea & Send Buttons */}
                        <div className="space-y-2 pt-1">
                          <div className="relative">
                            <textarea
                              rows={2}
                              value={inquiryText}
                              onChange={(e) => setInquiryText(e.target.value)}
                              placeholder={`Type a direct message to ${property.provider.name}...`}
                              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-medium"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleOpenWhatsApp}
                              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              WhatsApp Landlord
                            </button>

                            <button
                              type="button"
                              disabled={sendingInquiry}
                              onClick={() => handleSendDirectInquiry()}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              {sendingInquiry ? (
                                <span>Sending...</span>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Send Direct Message</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col: Price Transparency Card & CTAs */}
                <div className="space-y-5">
                  {/* Price Transparency Card */}
                  {property.prices && property.prices.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-lg space-y-4 sticky top-20">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Transparent Pricing
                          </span>
                          <h3 className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Zero Hidden Charges
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          100% DISCLOSED
                        </span>
                      </div>

                      {/* Line by line breakdown */}
                      {property.prices.slice(0, 1).map(price => (
                        <div key={price.id} className="space-y-3">
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                              <span>Annual Rent</span>
                              <span className="font-bold text-slate-900 dark:text-white">{formatNaira(price.rentAmount)}</span>
                            </div>

                            {price.serviceCharge > 0 && (
                              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  Service Charge
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 rounded">MANDATORY</span>
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNaira(price.serviceCharge)}</span>
                              </div>
                            )}

                            {price.agencyFee > 0 && (
                              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  Tenancy Agreement & Legal Fee
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 rounded">MANDATORY</span>
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNaira(price.agencyFee)}</span>
                              </div>
                            )}

                            {price.otherMandatoryCharges > 0 && (
                              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  Security / Waste Levy
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 rounded">MANDATORY</span>
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNaira(price.otherMandatoryCharges)}</span>
                              </div>
                            )}

                            {price.cautionFee > 0 && (
                              <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <span className="flex items-center gap-1">
                                  Caution Deposit
                                  <span className="text-[9px] bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 font-bold px-1 rounded">REFUNDABLE</span>
                                </span>
                                <span className="font-bold">{formatNaira(price.cautionFee)}</span>
                              </div>
                            )}
                          </div>

                          {/* Total Estimated Cost */}
                          <div className="pt-3 border-t-2 border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                Total First Year Cost
                              </span>
                              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                                {formatNaira(price.totalMandatoryCost + (price.cautionFee || 0))}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400">
                              Includes rent + all mandatory fees + refundable caution deposit.
                            </p>
                          </div>

                          {price.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 italic">
                              ℹ️ {price.notes}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Primary Actions: Dual Booking Options */}
                      <div className="space-y-2 pt-2">
                        {onOpenBookingModal && (
                          <div className="space-y-2">
                            <button
                              onClick={handleBookClick}
                              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Receipt className="w-4 h-4" />
                              Book Directly (Self-Reservation)
                            </button>
                          </div>
                        )}

                        {onOpenAI && property && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenAI(property);
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 border border-emerald-500/30 hover:border-emerald-400 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                            Ask AI About This Hostel
                          </button>
                        )}

                        <button
                          onClick={handleInspectClick}
                          className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Request Hostel Inspection
                        </button>

                        {onOpenConversation && (
                          <button
                            onClick={() => {
                              if (!isAuthenticated) {
                                onShowToast('Please create an account or sign in first to message the landlord.', 'error');
                                if (onOpenAuth) {
                                  onClose();
                                  onOpenAuth('STUDENT');
                                } else {
                                  window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }));
                                  onClose();
                                }
                                return;
                              }
                              onClose();
                              onOpenConversation(property.id);
                            }}
                            className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 border border-transparent dark:border-slate-700 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        )}

                        <button
                          onClick={handleSaveToggle}
                          className={`w-full py-2.5 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                            isSaved 
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          {isSaved ? 'Hostel Saved in Shortlist' : 'Save to Shortlist'}
                        </button>

                        {onToggleCompare && (
                          <button
                            onClick={() => onToggleCompare(property.id)}
                            className={`w-full py-2.5 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                              isCompared
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            {isCompared ? 'Added to Comparison (Comparing)' : 'Compare with Other Hostels'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inspection Modal */}
      {property && (
        <InspectionModal
          property={property}
          isOpen={inspectionModalOpen}
          onClose={() => setInspectionModalOpen(false)}
          onSuccess={(msg) => onShowToast(msg, 'success')}
          onOpenConversation={onOpenConversation ? (propId) => {
            onClose();
            onOpenConversation(propId);
          } : undefined}
        />
      )}

      {/* Report Modal */}
      {property && (
        <ReportListingModal
          property={property}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onSuccess={(msg) => onShowToast(msg, 'success')}
        />
      )}

      {/* Provider Public Profile Modal */}
      {property && property.provider?.id && (
        <ProviderPublicProfileModal
          providerId={property.provider.id}
          isOpen={providerProfileModalOpen}
          onClose={() => setProviderProfileModalOpen(false)}
        />
      )}
    </div>
  );
};
