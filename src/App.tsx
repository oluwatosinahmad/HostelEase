import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  Building2, 
  Search, 
  Bookmark, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  SlidersHorizontal, 
  ArrowRight, 
  Eye, 
  Footprints, 
  Zap, 
  Droplets, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  LayoutDashboard,
  Home,
  X,
  Map as MapIcon,
  List,
  Sparkles,
  Award,
  Layers,
  History,
  RotateCcw,
  Receipt,
  ShieldAlert
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Property, Area, SearchFilterState, UserRole, AppView } from './types/hostelEase';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { HostelCard } from './components/HostelCard';
import { HostelSearchFilters, ActiveFilterChips } from './components/HostelSearchFilters';
import { SmartSearchBar } from './components/SmartSearchBar';
import { SavedHostelsView } from './components/SavedHostelsView';
import { ComparisonDock } from './components/ComparisonDock';
import { BookingModal } from './components/BookingModal';
import { InspectionModal } from './components/InspectionModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { HostelListSkeleton, DashboardSkeleton } from './components/SkeletonLoaders';
import { formatNaira, formatDistance } from './utils/formatters';
import { AdminPortal } from './components/AdminPortal';
import { ProviderPortal } from './components/ProviderPortal';
import { CampusMapExplorer } from './components/CampusMapExplorer';
import { HostelComparisonModal } from './components/HostelComparisonModal';
import { HostelDetailModal } from './components/HostelDetailModal';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentInspectionCenter } from './components/StudentInspectionCenter';
import { StudentBookingDashboard } from './components/StudentBookingDashboard';
import { ProviderBookingDashboard } from './components/ProviderBookingDashboard';
import { StudentPaymentHistory } from './components/StudentPaymentHistory';
import { MessagingCenter } from './components/MessagingCenter';
import { AIAccommodationAssistantModal } from './components/AIAccommodationAssistantModal';
import { MoveInCenter } from './components/MoveInCenter';
import { AccommodationHistory } from './components/AccommodationHistory';
import { CommunityHub } from './components/CommunityHub';
import { ErrorBoundary } from './components/ErrorBoundary';

const initialFilters: SearchFilterState = {
  search: '',
  areaId: 'all',
  minPrice: '',
  maxPrice: '',
  maxDistance: '',
  roomType: 'all',
  genderPreference: 'ANY',
  availability: 'all',
  verifiedOnly: false,
  facilities: [],
  sortBy: 'recommended',
  page: 1
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

function MainApp() {
  const { user, isAuthenticated, isStudent, isProvider, isAdmin, login, logout, loginDemo, impersonateUser, exitImpersonation, isImpersonating } = useAuth();

  // Navigation & View State
  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      const saved = localStorage.getItem('hostel_ease_current_view') as AppView;
      if (saved) return saved;
    } catch {}
    return 'home';
  });

  useEffect(() => {
    try {
      localStorage.setItem('hostel_ease_current_view', currentView);
    } catch {}
  }, [currentView]);

  const [searchViewMode, setSearchViewMode] = useState<'list' | 'map'>('list');
  const [messagingTargetPropertyId, setMessagingTargetPropertyId] = useState<string | null>(null);

  // Admin Direct Login State
  const [adminLoginEmail, setAdminLoginEmail] = useState('admin@hostelease.ng');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Data State
  const [areas, setAreas] = useState<Area[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  
  // Search & Filter State
  const [filters, setFilters] = useState<SearchFilterState>(initialFilters);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [activeSearchExplanation, setActiveSearchExplanation] = useState<string[]>([]);

  // 4-Hostel Comparison Tool State
  const [comparedPropertyIds, setComparedPropertyIds] = useState<string[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);

  // Modals
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [bookingTargetProperty, setBookingTargetProperty] = useState<Property | null>(null);
  const [standaloneInspectionModalOpen, setStandaloneInspectionModalOpen] = useState<boolean>(false);
  const [inspectionTargetProperty, setInspectionTargetProperty] = useState<Property | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalDefaultRole, setAuthModalDefaultRole] = useState<UserRole>('STUDENT');
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiPropertyContext, setAiPropertyContext] = useState<Property | null>(null);
  const [studentDashboardTab, setStudentDashboardTab] = useState<'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security'>('overview');

  const handleOpenAI = (property?: Property | null) => {
    setAiPropertyContext(property || null);
    setAiModalOpen(true);
  };

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load Areas and Initial Data
  const loadInitialData = () => {
    api.areas.getAll()
      .then(res => setAreas(res.areas || []))
      .catch(err => console.error('Failed to load areas:', err));

    api.properties.getFeatured()
      .then(res => setFeaturedProperties(res.properties || []))
      .catch(err => console.error('Failed to load featured:', err));

    api.properties.getRecent()
      .then(res => setRecentProperties(res.properties || []))
      .catch(err => console.error('Failed to load recent:', err));

    api.properties.search(filters)
      .then(res => {
        setProperties(res.properties || []);
        setPagination(res.pagination || { page: 1, limit: 12, total: res.properties?.length || 0, totalPages: 1 });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInitialData();
    const handlePropsUpdate = () => loadInitialData();
    window.addEventListener('hostel_ease_properties_updated', handlePropsUpdate);
    return () => window.removeEventListener('hostel_ease_properties_updated', handlePropsUpdate);
  }, []);

  // Fetch Saved properties when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.properties.getSaved()
        .then(res => setSavedProperties(res.savedProperties || []))
        .catch(err => console.error('Failed to load saved:', err));
    } else {
      setSavedProperties([]);
    }
  }, [isAuthenticated]);

  // Role-based route guard - soft notification without jarring forced jumps
  useEffect(() => {
    if (isAuthenticated && user) {
      if (currentView === 'provider-portal' && user.role !== 'PROVIDER') {
        showToast('Landlord Management Center requires a Landlord account.', 'info');
      }
    }
  }, [currentView, isAuthenticated, user]);

  // Execute Search query when filters change or when search view is open
  useEffect(() => {
    if (currentView === 'search' || currentView === 'home') {
      setSearchLoading(true);
      api.properties.search(filters)
        .then(res => {
          setProperties(res.properties || []);
          setPagination(res.pagination || { page: 1, limit: 12, total: res.properties?.length || 0, totalPages: 1 });
        })
        .catch(err => {
          console.error('Search error:', err);
          showToast(err.message || 'Failed to search hostels', 'error');
        })
        .finally(() => setSearchLoading(false));
    }
  }, [filters, currentView]);

  // Handle Save / Unsave from cards
  const handleToggleSave = async (propertyId: string, willSave: boolean) => {
    if (!isAuthenticated) {
      setAuthModalDefaultRole('STUDENT');
      setAuthModalOpen(true);
      showToast('Please log in as a student to save hostels', 'info');
      return;
    }

    try {
      if (willSave) {
        await api.properties.saveProperty(propertyId);
        showToast('Hostel saved to your shortlist', 'success');
      } else {
        await api.properties.unsaveProperty(propertyId);
        showToast('Hostel removed from shortlist', 'info');
      }

      // Refresh saved properties count
      const res = await api.properties.getSaved();
      setSavedProperties(res.savedProperties || []);
    } catch (err: any) {
      showToast(err.message || 'Could not update saved hostel', 'error');
    }
  };

  // Handle Comparison Toggle
  const handleToggleCompare = (propertyId: string) => {
    if (comparedPropertyIds.includes(propertyId)) {
      setComparedPropertyIds(prev => prev.filter(id => id !== propertyId));
      showToast('Removed from comparison dock', 'info');
    } else {
      if (comparedPropertyIds.length >= 4) {
        showToast('You can compare a maximum of 4 hostels at a time', 'error');
        return;
      }
      setComparedPropertyIds(prev => [...prev, propertyId]);
      showToast(`Added to comparison (${comparedPropertyIds.length + 1} of 4)`, 'success');
    }
  };

  const handleHeroSearch = (searchTerm: string, areaId: string, roomType: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      areaId,
      roomType,
      page: 1
    }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArea = (areaId: string) => {
    setFilters(prev => ({
      ...prev,
      areaId,
      page: 1
    }));
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplySmartFilters = (interpreted: Partial<SearchFilterState>, explanation: string[]) => {
    setFilters(prev => ({
      ...prev,
      ...interpreted,
      page: 1
    }));
    setActiveSearchExplanation(explanation);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Smart search: ${explanation.length} filters applied`, 'success');
  };

  const handleRemoveSingleFilter = (key: keyof SearchFilterState, value?: any) => {
    if (key === 'facilities' && value) {
      setFilters(prev => ({
        ...prev,
        facilities: prev.facilities.filter(f => f !== value),
        page: 1
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: initialFilters[key],
        page: 1
      }));
    }
  };

  const handleOpenAuth = (role: UserRole = 'STUDENT') => {
    setAuthModalDefaultRole(role);
    setAuthModalOpen(true);
  };

  const handleOpenBookingModal = (property: Property) => {
    setBookingTargetProperty(property);
    setBookingModalOpen(true);
  };

  const handleOpenInspectionModal = (property: Property) => {
    setInspectionTargetProperty(property);
    setStandaloneInspectionModalOpen(true);
  };

  const handleReservePropertyById = async (propertyId: string) => {
    try {
      const prop = properties.find(p => p.id === propertyId) || 
                   featuredProperties.find(p => p.id === propertyId) ||
                   (await api.properties.getById(propertyId)).property;
      if (prop) {
        handleOpenBookingModal(prop);
      }
    } catch (err) {
      showToast('Could not load hostel details for booking', 'error');
    }
  };

  // Count active filters
  const activeFiltersCount = [
    filters.areaId !== 'all',
    filters.minPrice !== '',
    filters.maxPrice !== '',
    filters.maxDistance !== '',
    filters.roomType !== 'all',
    filters.genderPreference !== 'ANY',
    filters.availability !== 'all',
    filters.verifiedOnly,
    filters.facilities.length > 0,
    filters.search !== ''
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in slide-in-from-top-3 duration-200 ${
              toast.type === 'success' 
                ? 'bg-emerald-900 text-white border-emerald-700' 
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              {toast.type === 'info' && <Building2 className="w-4 h-4 text-teal-400 flex-shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 text-white/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 👑 SUPER ADMIN IMPERSONATION ACTIVE BANNER */}
      {isImpersonating && user && (
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white px-4 py-2.5 text-xs font-medium shadow-2xl border-b border-purple-500/50 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Impersonation</span>
            </span>
            <span>
              Controlling: <strong className="text-white font-bold">{user.fullName}</strong> ({user.email}) • <span className="uppercase text-purple-300 font-bold">{user.role === 'PROVIDER' ? '🏢 Landlord' : '🎓 Student'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {user.role === 'PROVIDER' && currentView !== 'provider-portal' && (
              <button
                onClick={() => {
                  setCurrentView('provider-portal');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Open Landlord Portal</span>
              </button>
            )}

            {user.role === 'STUDENT' && currentView !== 'home' && (
              <button
                onClick={() => {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>🎓 Open Marketplace</span>
              </button>
            )}

            <button
              onClick={() => {
                exitImpersonation();
                setCurrentView('admin-portal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                showToast('Restored Super Administrator session.', 'info');
              }}
              className="px-3.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-purple-400/40 shadow-sm cursor-pointer"
            >
              <span>🔙 Return to Super Admin Portal</span>
            </button>
          </div>
        </div>
      )}

      {/* Network Resilience Status Banner */}
      <NetworkStatusBanner onRetry={loadInitialData} />

      {/* Main Navbar */}
      <Navbar
        activeView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToDashboardTab={setStudentDashboardTab}
        onOpenAuth={handleOpenAuth}
        savedCount={savedProperties.length}
        onOpenAI={() => handleOpenAI()}
      />

      {/* Content Body Router with Lazy Suspense */}
      <Suspense fallback={<DashboardSkeleton />}>
        <main className="flex-1 pb-28 md:pb-24">
        {/* VIEW 1: HOME PAGE */}
        {currentView === 'home' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <HeroSection
              areas={areas}
              onSearchSubmit={handleHeroSearch}
              onSelectArea={handleSelectArea}
            />

            {/* Popular LAUTECH Accommodation Areas */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Neighborhood Guide
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Popular Areas Around LAUTECH
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentView('search')}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  View all areas <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {areas.map(area => (
                  <div
                    key={area.id}
                    onClick={() => handleSelectArea(area.id)}
                    className="group bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer space-y-1.5 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-lg">📍</span>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {area.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {area.approxDistanceMinKm}-{area.approxDistanceMaxKm} km to Gate
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-800 dark:text-emerald-400">{area.propertyCount || 0} Hostels</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Verified Hostels */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Audited Listings
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Featured Verified Hostels
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inspected by the Hostel Ease verification team around LAUTECH campus.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentView('search')}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  See all hostels <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProperties.slice(0, 3).map(property => (
                  <HostelCard
                    key={property.id}
                    property={property}
                    onViewDetails={(p) => setSelectedPropertyId(p.id)}
                    onToggleSave={handleToggleSave}
                    onToggleCompare={handleToggleCompare}
                    onOpenConversation={(propId) => {
                      setMessagingTargetPropertyId(propId);
                      setCurrentView('messages');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onOpenBookingModal={(prop) => handleOpenBookingModal(prop)}
                    onOpenInspectionModal={(prop) => handleOpenInspectionModal(prop)}
                    isCompared={comparedPropertyIds.includes(property.id)}
                  />
                ))}
              </div>
            </section>

            {/* Anti-Scam Call to Action Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
                <div className="space-y-2 max-w-xl text-center md:text-left">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
                    LAUTECH Student Safety Guarantee
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    Never Pay Before Inspecting
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Hostel Ease protects students against fraud. Always verify the lodge condition and confirm with the verified landlord.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCurrentView('search');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <span>FIND YOUR HOSTEL NOW</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: SEARCH, MAP & FILTER RESULTS */}
        {currentView === 'search' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Top Smart Search & Mode Switcher Header */}
            <div className="space-y-3">
              <SmartSearchBar
                value={filters.search}
                onChange={(val) => setFilters({ ...filters, search: val, page: 1 })}
                onSearch={(q) => setFilters({ ...filters, search: q, page: 1 })}
                onApplyParsedFilters={handleApplySmartFilters}
                isAuthenticated={isAuthenticated}
                activeExplanation={activeSearchExplanation}
                onClearExplanation={() => {
                  setActiveSearchExplanation([]);
                  setFilters(initialFilters);
                }}
              />

              {/* View Mode (List vs Interactive Map) & Sorting Controls */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* List vs Map Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
                  <button
                    onClick={() => setSearchViewMode('list')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      searchViewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    List View
                  </button>

                  <button
                    onClick={() => setSearchViewMode('map')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      searchViewMode === 'map'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <MapIcon className="w-4 h-4" />
                    Interactive Map
                  </button>
                </div>

                {/* Mobile Filter Toggle & Sort Select */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-2 text-xs">
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="lg:hidden px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Sort:</span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value, page: 1 })}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="recommended">Recommended (Verified & Closest)</option>
                      <option value="price_asc">Lowest Price (Budget Friendly)</option>
                      <option value="price_desc">Highest Price</option>
                      <option value="distance_asc">Closest to LAUTECH</option>
                      <option value="newest">Recently Added</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips Bar */}
              <ActiveFilterChips
                filters={filters}
                areas={areas}
                onRemoveFilter={handleRemoveSingleFilter}
                onClearAll={() => {
                  setFilters(initialFilters);
                  setActiveSearchExplanation([]);
                }}
                totalCount={properties.length}
              />
            </div>

            {/* Render MAP VIEW or LIST VIEW */}
            {searchViewMode === 'map' ? (
              <div className="space-y-4">
                <CampusMapExplorer
                  filters={filters}
                  areas={areas}
                  onSelectProperty={(id) => setSelectedPropertyId(id)}
                  onToggleCompare={handleToggleCompare}
                  onOpenConversation={(propId) => {
                    setMessagingTargetPropertyId(propId);
                    setCurrentView('messages');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  comparedIds={comparedPropertyIds}
                  onShowToast={showToast}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Column: Filters Sidebar */}
                <div className="lg:col-span-1">
                  <HostelSearchFilters
                    filters={filters}
                    areas={areas}
                    onChange={setFilters}
                    onReset={() => {
                      setFilters(initialFilters);
                      setActiveSearchExplanation([]);
                    }}
                    isMobileOpen={mobileFiltersOpen}
                    onCloseMobile={() => setMobileFiltersOpen(false)}
                    totalResultsCount={properties.length}
                    onOpenAI={() => handleOpenAI()}
                  />
                </div>

                {/* Right Column: Search Results Grid */}
                <div className="lg:col-span-3 space-y-4">
                  {searchLoading ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold px-1">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span>Finding matching verified hostels in Ogbomoso...</span>
                      </div>
                      <HostelListSkeleton count={6} />
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                        <Search className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900">No Hostels Match All Your Filters</h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                          We couldn't find any accommodation matching all active search conditions. Try adjusting a filter below:
                        </p>
                      </div>

                      {/* Diagnostic Quick Fix Action Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {filters.maxPrice && (
                          <button
                            onClick={() => setFilters({ ...filters, maxPrice: 250000 })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                          >
                            Expand Budget to ₦250k
                          </button>
                        )}
                        {filters.maxDistance && (
                          <button
                            onClick={() => setFilters({ ...filters, maxDistance: 2.5 })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                          >
                            Increase Distance to 2.5km
                          </button>
                        )}
                        {filters.facilities.length > 0 && (
                          <button
                            onClick={() => setFilters({ ...filters, facilities: [] })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                          >
                            Clear Facility Filters
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFilters(initialFilters);
                            setActiveSearchExplanation([]);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                        >
                          View All Hostels ({areas.length} Areas)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {properties.map(property => (
                        <HostelCard
                          key={property.id}
                          property={property}
                          onViewDetails={(p) => setSelectedPropertyId(p.id)}
                          onToggleSave={handleToggleSave}
                          onToggleCompare={handleToggleCompare}
                          onOpenConversation={(propId) => {
                            setMessagingTargetPropertyId(propId);
                            setCurrentView('messages');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onOpenBookingModal={(prop) => handleOpenBookingModal(prop)}
                          onOpenInspectionModal={(prop) => handleOpenInspectionModal(prop)}
                          isCompared={comparedPropertyIds.includes(property.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SAVED HOSTELS */}
        {currentView === 'saved' && (
          <SavedHostelsView
            onViewDetails={(p) => setSelectedPropertyId(p.id)}
            onNavigateToSearch={() => {
              setCurrentView('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleCompare={handleToggleCompare}
            comparedIds={comparedPropertyIds}
            onShowToast={showToast}
          />
        )}

        {/* VIEW: COMMUNITY & ROOMMATES (Phase 14) */}
        {currentView === 'community' && (
          <ErrorBoundary>
            <CommunityHub
              isAuthenticated={isAuthenticated}
              onShowToast={showToast}
              onOpenAuthModal={() => setAuthModalOpen(true)}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 4: STUDENT INSPECTION CENTER (Phase 4) */}
        {currentView === 'inspections' && (
          <StudentInspectionCenter
            onOpenConversation={(propId) => {
              setMessagingTargetPropertyId(propId);
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToSearch={() => {
              setCurrentView('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onReserveHostel={(propId) => handleReservePropertyById(propId)}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 5: IN-APP MESSAGING CENTER (Phase 4) */}
        {currentView === 'messages' && (
          <MessagingCenter
            initialPropertyId={messagingTargetPropertyId}
            onSelectProperty={(id) => setSelectedPropertyId(id)}
            onRequestInspection={(id) => {
              setSelectedPropertyId(id);
            }}
            onShowToast={showToast}
          />
        )}

        {/* VIEW: BOOKINGS & RESERVATIONS (Phase 5) */}
        {currentView === 'bookings' && (
          isProvider ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
                      Hostel Ease Phase 5
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-emerald-400" />
                    Hostel Space Reservations
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                    Manage incoming student room & bedspace reservation requests with 1-click confirmation.
                  </p>
                </div>
              </div>
              <ProviderBookingDashboard
                onOpenConversation={(propId) => {
                  setMessagingTargetPropertyId(propId);
                  setCurrentView('messages');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onShowToast={showToast}
              />
            </div>
          ) : (
            <StudentBookingDashboard
              onSelectProperty={(id) => setSelectedPropertyId(id)}
              onOpenConversation={(propId) => {
                setMessagingTargetPropertyId(propId);
                setCurrentView('messages');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBrowseHostels={() => {
                setCurrentView('search');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateToMoveIn={() => {
                setCurrentView('move-in');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onShowToast={showToast}
            />
          )
        )}

        {/* VIEW 6: STUDENT DASHBOARD */}
        {currentView === 'student-dashboard' && (
          <StudentDashboard
            areas={areas}
            initialTab={studentDashboardTab}
            onNavigateToSearch={() => {
              setCurrentView('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToSaved={() => {
              setCurrentView('saved');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToInspections={() => {
              setCurrentView('inspections');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToBookings={() => {
              setCurrentView('bookings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToPayments={() => {
              setCurrentView('payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToMoveIn={() => {
              setCurrentView('move-in');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToHistory={() => {
              setCurrentView('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToMessages={() => {
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToCommunity={() => {
              setCurrentView('community');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenConversation={(propId) => {
              setMessagingTargetPropertyId(propId);
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProperty={(id) => setSelectedPropertyId(id)}
            onApplyPreferencesToSearch={(prefs) => {
              setFilters(prev => ({
                ...prev,
                minPrice: prefs.minBudget ? Number(prefs.minBudget) : prev.minPrice,
                maxPrice: prefs.maxBudget ? Number(prefs.maxBudget) : prev.maxPrice,
                maxDistance: prefs.maxDistanceKm ? Number(prefs.maxDistanceKm) : prev.maxDistance,
                roomType: (prefs.preferredRoomTypes && prefs.preferredRoomTypes.length > 0) ? prefs.preferredRoomTypes[0] : 'all',
                genderPreference: prefs.genderPreference || 'ANY',
                facilities: (prefs.preferredFacilities && prefs.preferredFacilities.length > 0) ? prefs.preferredFacilities : prev.facilities,
                areaId: (prefs.preferredAreas && prefs.preferredAreas.length > 0) ? prefs.preferredAreas[0] : 'all'
              }));
              setCurrentView('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              showToast('Applied your saved accommodation preferences to search filters!', 'success');
            }}
            onShowToast={showToast}
            onOpenAI={handleOpenAI}
          />
        )}

        {/* VIEW: STUDENT PAYMENTS & RECEIPTS (Phase 6) */}
        {currentView === 'payments' && (
          <StudentPaymentHistory
            onNavigateToBookings={() => {
              setCurrentView('bookings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 7: PROVIDER / LANDLORD PORTAL */}
        {currentView === 'provider-portal' && (
          isProvider ? (
            <ErrorBoundary>
              <ProviderPortal
                areas={areas}
                onOpenConversation={(propId, studentId) => {
                  setMessagingTargetPropertyId(propId);
                  setCurrentView('messages');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onShowToast={showToast}
              />
            </ErrorBoundary>
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">🔒 Access Restricted</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                This account is not authorized to access the Landlord Management Center. Please log in with a verified Landlord account.
              </p>
              <button
                onClick={() => {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                Return to Home
              </button>
            </div>
          )
        )}

        {/* VIEW 8: ADMIN PORTAL */}
        {currentView === 'admin-portal' && (
          isAdmin ? (
            <ErrorBoundary>
              <AdminPortal
                areas={areas}
                onShowToast={showToast}
                onNavigateView={setCurrentView}
              />
            </ErrorBoundary>
          ) : (
            <div className="max-w-lg mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-800 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800">
                  👑 Single Owner Authentication
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Command Portal</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Hostel Ease enforces an exclusive single-owner administration security architecture. Please log in with the authorized platform administrator credentials.
                </p>
              </div>

              {isAuthenticated && user && !isAdmin && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-left text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>Currently signed in as:</span>
                  </div>
                  <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium pl-6">
                    {user.fullName} ({user.email}) • Role: <strong className="uppercase">{user.role}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      showToast('Logged out of session. Please sign in with Owner credentials.', 'info');
                    }}
                    className="ml-6 text-[11px] font-bold text-amber-800 dark:text-amber-300 underline hover:text-amber-900 cursor-pointer"
                  >
                    Switch Account (Log Out Current Session) →
                  </button>
                </div>
              )}

              {adminLoginError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAdminLoginError(null);
                  setAdminLoginLoading(true);
                  try {
                    await login(adminLoginEmail.trim(), adminLoginPassword, 'ADMIN');
                    showToast('Authenticated as Platform Owner / Admin!', 'success');
                  } catch (err: any) {
                    setAdminLoginError(err.message || 'Invalid Admin credentials or unauthorized account.');
                  } finally {
                    setAdminLoginLoading(false);
                  }
                }} 
                className="space-y-4 text-left"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={adminLoginEmail}
                    onChange={(e) => setAdminLoginEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="admin@hostelease.ng"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminLoginPassword}
                    onChange={(e) => setAdminLoginPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="Enter owner password (e.g. Admin123!)"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminLoginLoading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {adminLoginLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Unlock Admin Portal</span>
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">Authorized Platform Owner Access</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setAdminLoginError(null);
                    setAdminLoginLoading(true);
                    try {
                      await loginDemo('ADMIN');
                      showToast('Authenticated as Platform Owner / Super Admin!', 'success');
                    } catch (err: any) {
                      setAdminLoginError(err.message || 'Failed to authenticate Admin demo.');
                    } finally {
                      setAdminLoginLoading(false);
                    }
                  }}
                  disabled={adminLoginLoading}
                  className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⚡ 1-Click Owner Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                >
                  <span>← Return Home</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 9: MOVE-IN & POST-BOOKING CENTER (Phase 12) */}
        {currentView === 'move-in' && (
          <MoveInCenter
            onNavigate={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenConversation={(propId, studentId) => {
              setMessagingTargetPropertyId(propId);
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
            onOpenAI={handleOpenAI}
          />
        )}

        {/* VIEW 10: ACCOMMODATION HISTORY (Phase 12) */}
        {currentView === 'history' && (
          <AccommodationHistory
            onNavigate={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenConversation={(propId, studentId) => {
              setMessagingTargetPropertyId(propId);
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
          />
        )}
      </main>
      </Suspense>

      {/* Floating Comparison Dock (Shown when 1 to 4 hostels are queued) */}
      <ComparisonDock
        comparedIds={comparedPropertyIds}
        onOpenModal={() => setComparisonModalOpen(true)}
        onRemoveHostel={(id) => setComparedPropertyIds(prev => prev.filter(pId => pId !== id))}
        onClearAll={() => setComparedPropertyIds([])}
      />

      {/* 4-Hostel Comparison Modal */}
      <Suspense fallback={null}>
        {comparisonModalOpen && (
          <HostelComparisonModal
            comparedIds={comparedPropertyIds}
            isOpen={comparisonModalOpen}
            onClose={() => setComparisonModalOpen(false)}
            onRemoveHostel={(id) => setComparedPropertyIds(prev => prev.filter(pId => pId !== id))}
            onClearAll={() => {
              setComparedPropertyIds([]);
              setComparisonModalOpen(false);
            }}
            onSelectProperty={(id) => setSelectedPropertyId(id)}
            onOpenAI={() => handleOpenAI()}
          />
        )}
      </Suspense>

      {/* Hostel Detail Modal */}
      <Suspense fallback={null}>
        {selectedPropertyId && (
          <HostelDetailModal
            propertyId={selectedPropertyId}
            isOpen={Boolean(selectedPropertyId)}
            onClose={() => setSelectedPropertyId(null)}
            onToggleSave={handleToggleSave}
            onToggleCompare={handleToggleCompare}
            onOpenConversation={(propId) => {
              setMessagingTargetPropertyId(propId);
              setCurrentView('messages');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenBookingModal={(prop) => handleOpenBookingModal(prop)}
            onOpenAI={(prop) => handleOpenAI(prop)}
            isCompared={comparedPropertyIds.includes(selectedPropertyId)}
            onShowToast={showToast}
          />
        )}
      </Suspense>

      {/* Room & Bedspace Booking Modal (Phase 5) */}
      {bookingTargetProperty && (
        <BookingModal
          property={bookingTargetProperty}
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setBookingTargetProperty(null);
          }}
          onBookingSuccess={(bookingId, bookingRef) => {
            showToast(`Reservation #${bookingRef} created successfully!`, 'success');
            setBookingModalOpen(false);
            setBookingTargetProperty(null);
            setCurrentView('bookings');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenConversation={(propId) => {
            setMessagingTargetPropertyId(propId);
            setCurrentView('messages');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onShowToast={showToast}
        />
      )}

      {/* Standalone Inspection Modal */}
      {inspectionTargetProperty && (
        <InspectionModal
          property={inspectionTargetProperty}
          isOpen={standaloneInspectionModalOpen}
          onClose={() => {
            setStandaloneInspectionModalOpen(false);
            setInspectionTargetProperty(null);
          }}
          onSuccess={(msg) => showToast(msg, 'success')}
          onOpenConversation={(propId) => {
            setStandaloneInspectionModalOpen(false);
            setInspectionTargetProperty(null);
            setMessagingTargetPropertyId(propId);
            setCurrentView('messages');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* AI Accommodation Assistant Modal (Phase 8) */}
      <Suspense fallback={null}>
        {aiModalOpen && (
          <AIAccommodationAssistantModal
            isOpen={aiModalOpen}
            onClose={() => {
              setAiModalOpen(false);
              setAiPropertyContext(null);
            }}
            initialPropertyContext={aiPropertyContext}
            onSelectProperty={(id) => {
              setAiModalOpen(false);
              setSelectedPropertyId(id);
            }}
            onOpenComparison={() => {
              setAiModalOpen(false);
              setComparisonModalOpen(true);
            }}
            onApplyPreferencesToSearch={(prefs) => {
              setAiModalOpen(false);
              setFilters(prev => ({
                ...prev,
                minPrice: prefs.minBudget ? Number(prefs.minBudget) : prev.minPrice,
                maxPrice: prefs.maxBudget ? Number(prefs.maxBudget) : prev.maxPrice,
                maxDistance: prefs.maxDistanceKm ? Number(prefs.maxDistanceKm) : prev.maxDistance,
                areaId: (prefs.preferredAreas && prefs.preferredAreas.length > 0) ? prefs.preferredAreas[0] : 'all'
              }));
              setCurrentView('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
          />
        )}
      </Suspense>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultRole={authModalDefaultRole}
        onSuccess={(authedUser) => {
          showToast('Authenticated successfully. Welcome to Hostel Ease!', 'success');
          const targetRole = authedUser?.role || (localStorage.getItem('hostel_ease_user') ? JSON.parse(localStorage.getItem('hostel_ease_user') || '{}')?.role : 'STUDENT');
          if (targetRole === 'ADMIN') {
            setCurrentView('admin-portal');
          } else if (targetRole === 'PROVIDER') {
            setCurrentView('provider-portal');
          } else {
            setCurrentView('student-dashboard');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Footer */}
      <Footer 
        onNavigate={setCurrentView} 
        onOpenAuth={handleOpenAuth}
      />

      {/* Mobile-First Floating Bottom Navigation Bar */}
      <MobileBottomNav
        activeView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleOpenAuth}
        onOpenAI={handleOpenAI}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
