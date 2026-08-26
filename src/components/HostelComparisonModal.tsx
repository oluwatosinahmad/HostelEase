import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Minus, 
  ShieldCheck, 
  MapPin, 
  Zap, 
  Droplets, 
  Wifi, 
  Shield, 
  Utensils, 
  Cpu, 
  Sun, 
  Layers, 
  Star, 
  Calendar, 
  ExternalLink,
  Trash2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Award
} from 'lucide-react';
import { HostelComparisonResult, HostelComparisonItem } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface HostelComparisonModalProps {
  comparedIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveHostel: (propertyId: string) => void;
  onClearAll: () => void;
  onSelectProperty: (propertyId: string) => void;
  onRequestInspection?: (property: any) => void;
  onOpenAI?: () => void;
}

export const HostelComparisonModal: React.FC<HostelComparisonModalProps> = ({
  comparedIds,
  isOpen,
  onClose,
  onRemoveHostel,
  onClearAll,
  onSelectProperty,
  onRequestInspection,
  onOpenAI
}) => {
  const [data, setData] = useState<HostelComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || comparedIds.length === 0) return;

    setLoading(true);
    api.discovery.compareHostels(comparedIds)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load comparison data:', err);
        setLoading(false);
      });
  }, [isOpen, comparedIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                Side-by-Side Comparison
              </span>
              <span className="text-xs text-slate-400">({comparedIds.length} of 4 Selected)</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black">
              Compare LAUTECH Accommodations
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAI && comparedIds.length >= 2 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAI();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Ask AI Analysis</span>
              </button>
            )}

            <button
              onClick={onClearAll}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading comparison matrix...</p>
            </div>
          ) : !data || data.hostels.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700">No Hostels in Comparison</h3>
              <p className="text-xs text-slate-400">Select up to 4 hostels from search results to compare.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 w-44 font-bold text-slate-400 uppercase text-[10px] bg-slate-50 rounded-tl-2xl">
                      Feature / Details
                    </th>
                    {data.hostels.map(h => (
                      <th key={h.id} className="p-3 w-56 align-top">
                        <div className="space-y-2 relative bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          <button
                            onClick={() => onRemoveHostel(h.id)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded-full bg-white shadow-sm"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <img
                            src={h.coverImage}
                            alt={h.title}
                            className="w-full h-28 rounded-xl object-cover bg-slate-200"
                          />

                          <div className="space-y-1">
                            {h.id === data.highlights.lowestPriceId && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                                <Award className="w-2.5 h-2.5" /> LOWEST RENT
                              </span>
                            )}
                            {h.id === data.highlights.closestDistanceId && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                                📍 CLOSEST TO CAMPUS
                              </span>
                            )}
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{h.title}</h4>
                            <p className="text-[10px] text-slate-500">📍 {h.area.name} ({formatDistance(h.distanceFromCampusKm)})</p>
                          </div>

                          <button
                            onClick={() => onSelectProperty(h.id)}
                            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Row 1: Annual Rent */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Annual Rent</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        <span className="font-black text-sm text-emerald-700">{formatNaira(h.pricing.rentAmount)}</span>
                        <span className="text-[10px] text-slate-400">/yr</span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Total 1st Year Estimated Cost */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">
                      Total First Year Cost
                      <span className="block text-[10px] text-slate-400 font-normal">Rent + Caution + All Fees</span>
                    </td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3 font-bold text-slate-900">
                        {formatNaira(h.pricing.totalFirstYearEstimated)}
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: Caution Deposit (Refundable) */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Caution Deposit</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        {h.pricing.cautionFee > 0 ? (
                          <span className="text-emerald-700 font-semibold">{formatNaira(h.pricing.cautionFee)} (Refundable)</span>
                        ) : (
                          <span className="text-slate-400">₦0</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Distance to LAUTECH */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Distance to Campus</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3 font-bold text-slate-800">
                        {formatDistance(h.distanceFromCampusKm)} to Main Gate
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: Room Type */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Room Type</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3 font-semibold text-slate-800">
                        {h.propertyType.replace(/_/g, ' ')}
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Availability Status */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Current Availability</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          h.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.availabilityStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 7: Power & Electricity */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Electricity Supply</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Dedicated Line
                          </div>
                          {h.facilitiesMap.inverter && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-yellow-100 text-yellow-800">
                              ☀️ Solar Inverter
                            </span>
                          )}
                          {h.facilitiesMap.generator && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-800">
                              ⚡ Standby Gen
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Row 8: Water Supply */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Water Supply</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        {h.facilitiesMap.water ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Borehole Running Water
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> Well Water
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 9: Security */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Compound Security</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        {h.facilitiesMap.security ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Gated & Security Guard
                          </span>
                        ) : (
                          <span className="text-slate-400">Standard Gate</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 10: Wi-Fi */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">High-Speed Wi-Fi</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        {h.facilitiesMap.wifi ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> High-Speed Wi-Fi
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> Not Provided
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 11: Kitchen */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Kitchen Facility</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        {h.facilitiesMap.kitchen ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Private / Dedicated Kitchen
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> Shared
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Row 12: Rating & Reviews */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900 bg-slate-50/50">Student Rating</td>
                    {data.hostels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-slate-900">{h.rating.avg}</span>
                          <span className="text-[10px] text-slate-400">({h.rating.count} reviews)</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <p className="text-slate-500">
            💡 <strong>Tip:</strong> You can compare up to 4 hostels simultaneously to find the best match for your budget and study needs.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-sm"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

// Persistent Floating Comparison Dock (Shown at bottom of screen when 1 to 4 hostels are queued)
interface ComparisonDockProps {
  comparedIds: string[];
  onOpenModal: () => void;
  onRemoveHostel: (id: string) => void;
  onClearAll: () => void;
}

export const ComparisonDock: React.FC<ComparisonDockProps> = ({
  comparedIds,
  onOpenModal,
  onRemoveHostel,
  onClearAll
}) => {
  if (comparedIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl animate-in slide-in-from-bottom-6 duration-200">
      <div className="bg-slate-950/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-800 text-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-md">
            {comparedIds.length}
          </div>
          <div>
            <h4 className="font-black text-xs sm:text-sm text-white">
              Hostel Comparison Dock
            </h4>
            <p className="text-[10px] text-slate-400">
              {comparedIds.length} of 4 hostels ready to compare
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Clear
          </button>

          <button
            onClick={onOpenModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Compare Now ({comparedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
