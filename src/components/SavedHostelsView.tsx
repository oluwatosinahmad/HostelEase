import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Search, 
  Trash2, 
  Eye, 
  Calendar, 
  MapPin, 
  Footprints, 
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  History,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { Property, RecentlyViewedItem } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance, getPropertyTypeLabel } from '../utils/formatters';

interface SavedHostelsViewProps {
  onViewDetails: (property: Property) => void;
  onNavigateToSearch: () => void;
  onToggleCompare?: (propertyId: string) => void;
  comparedIds?: string[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SavedHostelsView: React.FC<SavedHostelsViewProps> = ({
  onViewDetails,
  onNavigateToSearch,
  onToggleCompare,
  comparedIds = [],
  onShowToast
}) => {
  const { isAuthenticated } = useAuth();
  const [savedHostels, setSavedHostels] = useState<Property[]>([]);
  const [recentViews, setRecentViews] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedAndRecent = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.properties.getSaved(),
      api.discovery.getRecentlyViewed()
    ])
      .then(([savedRes, recentRes]) => {
        setSavedHostels(savedRes.savedProperties || []);
        setRecentViews(recentRes.recentViews || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load saved hostels');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedAndRecent();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleUnsave = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.properties.unsaveProperty(propertyId);
      setSavedHostels(prev => prev.filter(p => p.id !== propertyId));
      onShowToast('Hostel removed from saved shortlist', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to remove hostel', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign In to View Your Shortlist</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Create an account or log in to save hostels for easy side-by-side comparison and inspection requests.
        </p>
        <button
          onClick={onNavigateToSearch}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          Explore LAUTECH Hostels
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-emerald-600 fill-emerald-600/20" />
            My Shortlisted Hostels ({savedHostels.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare shortlisted accommodations and track live availability changes before booking inspections.
          </p>
        </div>

        <button
          onClick={onNavigateToSearch}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          Find More Hostels
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading your shortlisted lodges...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && savedHostels.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Your Shortlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse through verified LAUTECH hostels and click the bookmark icon to save your preferred options for inspection.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Start Searching Hostels
          </button>
        </div>
      )}

      {/* Saved Hostels Grid */}
      {!loading && savedHostels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedHostels.map(property => {
            const hasAvailabilityAlert = property.availabilityStatus === 'LIMITED' || property.availabilityStatus === 'FULLY_OCCUPIED';

            return (
              <div
                key={property.id}
                onClick={() => onViewDetails(property)}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all overflow-hidden flex flex-col cursor-pointer group"
              >
                {/* Image & Badges */}
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={property.coverImage}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-md">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>

                    <button
                      onClick={(e) => handleUnsave(property.id, e)}
                      className="p-2 rounded-full bg-white/90 text-rose-600 hover:bg-rose-100 shadow-md transition-all"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                      property.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    } backdrop-blur-md shadow-sm`}>
                      {property.availabilityStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {/* Live Availability / Change Alert */}
                    {hasAvailabilityAlert && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span>Availability changed since saved (Spaces filling up)</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {property.area.name}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <Footprints className="w-3.5 h-3.5 text-slate-400" />
                        {formatDistance(property.distanceFromCampusKm)}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {property.title}
                    </h3>
                  </div>

                  {/* Pricing & CTA Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Rent</span>
                      <p className="font-black text-sm text-slate-900">
                        {formatNaira(property.priceSummary?.rentAmount)} <span className="text-[10px] font-normal text-slate-400">/yr</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onToggleCompare && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompare(property.id);
                          }}
                          className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                            comparedIds.includes(property.id)
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                          title="Compare"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onViewDetails(property)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently Viewed Hostels Section */}
      {!loading && recentViews.length > 0 && (
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Recently Viewed Hostels</h3>
              <p className="text-xs text-slate-500">Pick up where you left off</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentViews.map(rv => (
              <div
                key={rv.id}
                onClick={() => onViewDetails(rv as any)}
                className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm cursor-pointer space-y-2 group transition-all"
              >
                <img
                  src={rv.coverImage}
                  alt={rv.title}
                  className="w-full h-24 rounded-xl object-cover bg-slate-100 group-hover:scale-102 transition-transform"
                />
                <div>
                  <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                    {rv.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">📍 {rv.areaName} • {formatDistance(rv.distanceFromCampusKm)}</p>
                  <p className="text-xs font-bold text-emerald-800 mt-1">{formatNaira(rv.rentAmount)}/yr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
