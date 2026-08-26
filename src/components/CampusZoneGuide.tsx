import React from 'react';
import { MapPin, Footprints, Bike, Zap, Shield, Sparkles, ArrowRight, Droplets } from 'lucide-react';
import { CampusZone, University } from '../types';
import { formatNaira } from '../utils/formatters';

interface CampusZoneGuideProps {
  currentUniversity: University;
  zones: CampusZone[];
  activeZoneId: string;
  onSelectZone: (zoneId: string) => void;
}

export const CampusZoneGuide: React.FC<CampusZoneGuideProps> = ({
  currentUniversity,
  zones,
  activeZoneId,
  onSelectZone,
}) => {
  return (
    <section id="zones-section" className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Campus Proximity Guide • {currentUniversity.shortName} ({currentUniversity.cityName})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Know Your Neighborhoods Around Campus
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
              Choose your ideal location based on walking distance to lecture theaters, security, and local student amenities.
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 shrink-0">
            <span className="font-semibold text-slate-700">Reference Point:</span> LAUTECH Under-G Gate & Main Gate
          </div>
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {zones.map((zone) => {
            const isSelected = activeZoneId === zone.id;
            return (
              <div
                key={zone.id}
                onClick={() => onSelectZone(isSelected ? '' : zone.id)}
                className={`relative rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-brand-300 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Name & Distance Tag */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-brand-700 transition-colors flex items-center gap-1.5">
                        <span>{zone.name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                            Active Filter
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{zone.avgWalkTimeToGateMins} mins walk to gate</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-brand-700 bg-brand-100/70 px-2.5 py-1 rounded-md">
                        {formatNaira(zone.avgRentRange.min)} - {formatNaira(zone.avgRentRange.max)}
                      </span>
                    </div>
                  </div>

                  {/* Commute Indicators */}
                  <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                      <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                        <Footprints className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Walk to Gate</div>
                        <div>{zone.avgWalkTimeToGateMins} mins</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                      <div className="p-1.5 rounded-md bg-teal-100 text-teal-800">
                        <Bike className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Bike Ride</div>
                        <div>{zone.avgBikeTimeToGateMins} mins</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                    {zone.description}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span><strong>Light Reliability:</strong> {zone.lightReliabilityScore} / 5.0</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong>Water Reliability:</strong> {zone.waterReliabilityScore} / 5.0</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span><strong>Popular For:</strong> {zone.popularFor.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-700">
                  <span>{isSelected ? 'Remove Area Filter' : `View ${zone.name} Hostels`}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
