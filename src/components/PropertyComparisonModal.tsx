import React from 'react';
import { 
  X, 
  Check, 
  Droplets, 
  Zap, 
  ShieldCheck, 
  Footprints, 
  Star, 
  Trash2, 
  ArrowRight,
  Video,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/formatters';

interface PropertyComparisonModalProps {
  properties: Property[];
  onClose: () => void;
  onRemoveProperty: (id: string) => void;
  onClearAll: () => void;
  onSelectProperty: (property: Property) => void;
  onBookInspection: (property: Property) => void;
}

export const PropertyComparisonModal: React.FC<PropertyComparisonModalProps> = ({
  properties,
  onClose,
  onRemoveProperty,
  onClearAll,
  onSelectProperty,
  onBookInspection,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>Side-by-Side Hostel Comparison</span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                {properties.length} Nests Selected
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare prices, distance from LAUTECH, water reliability, backup power, and security features to choose the best fit for your needs.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {properties.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {properties.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Footprints className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No properties selected for comparison</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click the compare icon on any hostel card to add up to 4 properties to this side-by-side matrix.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Back to Listings
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-48 bg-slate-50/70">
                      Comparison Metric
                    </th>
                    {properties.map((p) => (
                      <th key={p.id} className="p-3 min-w-[230px] max-w-[280px] align-top">
                        <div className="relative rounded-2xl overflow-hidden mb-2 aspect-[16/10] bg-slate-100 shadow-sm">
                          <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => onRemoveProperty(p.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white transition-colors"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                            {p.zoneName}
                          </span>
                          {p.verificationStatus === 'VERIFIED' && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Verified
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  
                  {/* Annual Rent */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Rent</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-extrabold text-slate-900 text-sm">
                        {formatNaira(p.fees.annualRent)} / {p.fees.paymentFrequency}
                      </td>
                    ))}
                  </tr>

                  {/* Estimated Total */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Estimated Total</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-extrabold text-emerald-700 bg-emerald-50/40">
                        {formatNaira(p.fees.estimatedTotal)}
                      </td>
                    ))}
                  </tr>

                  {/* Caution Deposit */}
                  <tr>
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/50">Caution Deposit</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-semibold text-slate-800">
                        {p.fees.cautionFee > 0 ? formatNaira(p.fees.cautionFee) : 'None'}
                      </td>
                    ))}
                  </tr>

                  {/* Agency Fee */}
                  <tr>
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/50">Agency Fee</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-semibold text-slate-800">
                        {p.fees.agencyFee > 0 ? formatNaira(p.fees.agencyFee) : 'None'}
                      </td>
                    ))}
                  </tr>

                  {/* Distance from Campus */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Distance from Gate</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-1 text-emerald-700">
                          <Footprints className="w-3.5 h-3.5" />
                          <span>{p.distanceText || `${p.distanceKmFromGate} km from LAUTECH`}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Walk & Bike Time */}
                  <tr>
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/50">Commute Time</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.walkTimeToGate} • {p.bikeTimeToGate}
                      </td>
                    ))}
                  </tr>

                  {/* Property Type */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Property Type</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-800 font-semibold capitalize">
                        {p.propertyTypeLabel || p.propertyType.replace('_', ' ')}
                      </td>
                    ))}
                  </tr>

                  {/* Rooms & Bathrooms */}
                  <tr>
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/50">Layout</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.bedrooms} Bedroom(s) • {p.bathrooms} Bathroom(s)
                      </td>
                    ))}
                  </tr>

                  {/* Water Source */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Water Supply</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        <div className="flex items-center gap-1 font-semibold text-blue-700">
                          <Droplets className="w-3.5 h-3.5 text-blue-500" />
                          <span>{p.hasBoreholeWater ? '24/7 Motorized Borehole' : 'Well / Shared'}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Power & Solar */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Power & Backup</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.hasSolarOrInverter ? (
                          <span className="font-semibold text-amber-700 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            Solar / Generator Backup
                          </span>
                        ) : (
                          <span className="text-slate-500">Prepaid Meter Only</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Security */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Security</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {p.hasSecurityGuard ? 'Gated & Guard Post' : 'Fenced Compound'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Video Walkthrough */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 bg-slate-50/50">Video Tour</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.hasVideoTour ? (
                          <span className="font-bold text-teal-700 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-teal-600" />
                            HD Video Available
                          </span>
                        ) : (
                          <span className="text-slate-400">Photos Only</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Listing Completeness */}
                  <tr>
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/50">Completeness</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 font-bold text-slate-800">
                        {p.completenessScore}% Complete
                      </td>
                    ))}
                  </tr>

                  {/* Action Row */}
                  <tr>
                    <td className="p-3 bg-slate-50/50"></td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 space-y-2">
                        <button
                          onClick={() => {
                            onClose();
                            onSelectProperty(p);
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
                        >
                          View Full Details
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onBookInspection(p);
                          }}
                          className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs"
                        >
                          Request Viewing
                        </button>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
