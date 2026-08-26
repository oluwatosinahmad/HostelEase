import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Zap, 
  Droplets, ThumbsUp, ThumbsDown, Calculator, ArrowRight, Eye, Calendar,
  HelpCircle, ChevronRight
} from 'lucide-react';
import { TrueCostEstimatorModal } from './TrueCostEstimatorModal';

interface SmartMatchItem {
  propertyId: string;
  propertyTitle: string;
  address: string;
  area: string;
  pricePerYear: number;
  roomType: string;
  verificationStatus: string;
  matchScore: number;
  positiveReasons: string[];
  negativeWarnings: string[];
  unknownFields: string[];
  affordabilityStatus: 'WITHIN_BUDGET' | 'NEAR_BUDGET' | 'ABOVE_BUDGET';
  affordabilityNote: string;
  trueCost: {
    rentPerYear: number;
    cautionDeposit: number;
    serviceCharge: number;
    agencyLegalFee: number;
    platformFee: number;
    totalKnownCost: number;
    estimatedDailyTransport: number;
    estimatedAnnualTransport: number;
    totalEstimatedCostWithTransport: number;
  };
  distanceKm: number;
  estimatedWalkMinutes: number;
  powerRating: number | null;
  waterRating: number | null;
  securityRating: number | null;
  riskSignals: string[];
  coverImage?: string;
  availableBedspaces: number;
}

interface SmartAlternative {
  type: 'CHEAPER' | 'CLOSER' | 'BETTER_ELECTRICITY';
  label: string;
  property: SmartMatchItem;
  differentiator: string;
}

interface SmartMatchFeedProps {
  onSelectProperty: (propertyId: string) => void;
  onRequestInspection?: (propertyId: string) => void;
  onBookNow?: (propertyId: string) => void;
}

export const SmartMatchFeed: React.FC<SmartMatchFeedProps> = ({
  onSelectProperty,
  onRequestInspection,
  onBookNow
}) => {
  const [loading, setLoading] = useState(true);
  const [bestMatch, setBestMatch] = useState<SmartMatchItem | null>(null);
  const [alternatives, setAlternatives] = useState<SmartAlternative[]>([]);
  const [allMatches, setAllMatches] = useState<SmartMatchItem[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [selectedTrueCost, setSelectedTrueCost] = useState<any | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/intelligence/smart-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setBestMatch(data.bestMatch || null);
      setAlternatives(data.alternatives || []);
      setAllMatches(data.allMatches || []);
      setStudentProfile(data.studentProfile || null);
    } catch (err) {
      console.error('Failed to load smart recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (propertyId: string, isHelpful: boolean) => {
    setFeedbackSubmitted(prev => ({ ...prev, [propertyId]: true }));
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/intelligence/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ propertyId, isHelpful })
      });
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const openTrueCost = (match: SmartMatchItem) => {
    setSelectedTrueCost({
      propertyId: match.propertyId,
      title: match.propertyTitle,
      area: match.area,
      distanceKm: match.distanceKm,
      knownCosts: {
        rentPerYear: match.trueCost.rentPerYear,
        cautionDeposit: match.trueCost.cautionDeposit,
        serviceCharge: match.trueCost.serviceCharge,
        agencyLegalFee: match.trueCost.agencyLegalFee,
        platformEscrowFee: match.trueCost.platformFee,
        totalKnownCost: match.trueCost.totalKnownCost
      },
      estimatedCosts: {
        dailyCampusCommuteEstimated: match.trueCost.estimatedDailyTransport,
        academicSessionCommuteEstimated: match.trueCost.estimatedAnnualTransport,
        schoolDaysCount: 180
      },
      totalTrueCost: match.trueCost.totalEstimatedCostWithTransport,
      costExplanation: `Initial known fee is ₦${match.trueCost.totalKnownCost.toLocaleString()}. Estimated transport to campus is ~₦${match.trueCost.estimatedAnnualTransport.toLocaleString()} over 180 school days.`
    });
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-600">Calculating personalized matches and True Cost estimates...</p>
      </div>
    );
  }

  if (!bestMatch) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
        <p className="text-xs text-slate-500">No matching hostel recommendations found for your current budget.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. TOP PERSONALIZED RECOMMENDATION BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          
          {/* Header Tag */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Best Match For You
              </span>
              <span className="text-xs text-slate-300">
                Ranked by budget (₦{studentProfile?.maxBudget?.toLocaleString()}) & preferences
              </span>
            </div>

            {/* Deterministic Match Score Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1.5 rounded-2xl">
              <div className="text-right">
                <div className="text-lg font-black text-emerald-400 leading-none">{bestMatch.matchScore}%</div>
                <span className="text-[9px] uppercase font-bold text-emerald-200/80 tracking-wider">Match Score</span>
              </div>
            </div>
          </div>

          {/* Main Property Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left: Info */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight hover:text-emerald-300 transition-colors cursor-pointer" onClick={() => onSelectProperty(bestMatch.propertyId)}>
                  {bestMatch.propertyTitle}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {bestMatch.address} • {bestMatch.area} ({bestMatch.estimatedWalkMinutes} mins walk to campus)
                </p>
              </div>

              {/* Price & Affordability Status */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div>
                  <span className="text-2xl font-black text-white">₦{bestMatch.pricePerYear.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-medium"> / year</span>
                </div>

                <div className="px-3 py-1 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-emerald-300">
                  {bestMatch.affordabilityNote}
                </div>

                {bestMatch.availableBedspaces > 0 && (
                  <span className="text-xs text-slate-300 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                    🟢 {bestMatch.availableBedspaces} spaces available
                  </span>
                )}
              </div>

              {/* Positive Checks vs Warnings */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {bestMatch.positiveReasons.slice(0, 4).map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {bestMatch.negativeWarnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bestMatch.negativeWarnings.map((warn, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-amber-300 text-xs font-medium bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions & True Cost Trigger */}
            <div className="md:col-span-4 flex flex-col justify-between bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">True Cost Breakdown</span>
                <div className="text-xs text-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Known Direct:</span>
                    <span className="font-bold">₦{bestMatch.trueCost.totalKnownCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Transport:</span>
                    <span className="font-bold text-amber-300">~₦{bestMatch.trueCost.estimatedAnnualTransport.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => openTrueCost(bestMatch)}
                  className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>View True Cost Sheet</span>
                </button>
              </div>

              {/* Action Triggers */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                {onRequestInspection && (
                  <button
                    onClick={() => onRequestInspection(bestMatch.propertyId)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Inspection</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectProperty(bestMatch.propertyId)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <span>View Full Listing</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Feedback Bar */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
            <span>Was this recommendation helpful?</span>
            {feedbackSubmitted[bestMatch.propertyId] ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Feedback recorded. Thank you!
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(bestMatch.propertyId, true)}
                  className="px-3 py-1 bg-white/10 hover:bg-emerald-500 hover:text-slate-950 rounded-lg font-bold flex items-center gap-1 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => handleFeedback(bestMatch.propertyId, false)}
                  className="px-3 py-1 bg-white/10 hover:bg-rose-500 hover:text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>No</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. 3 DISTINCT ALTERNATIVES (Cheaper, Closer, Better Power) */}
      {alternatives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Smart Alternatives for Comparison
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Ranked by specific student tradeoffs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      alt.type === 'CHEAPER' ? 'bg-emerald-100 text-emerald-800' :
                      alt.type === 'CLOSER' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {alt.label}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{alt.property.matchScore}% Match</span>
                  </div>

                  <h5 
                    className="text-sm font-bold text-slate-900 line-clamp-1 hover:text-emerald-600 cursor-pointer"
                    onClick={() => onSelectProperty(alt.property.propertyId)}
                  >
                    {alt.property.propertyTitle}
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{alt.property.area} • {alt.property.estimatedWalkMinutes} mins walk</p>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-black text-slate-900">₦{alt.property.pricePerYear.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400"> / yr</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">{alt.differentiator}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openTrueCost(alt.property)}
                    className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>True Cost</span>
                  </button>

                  <button
                    onClick={() => onSelectProperty(alt.property.propertyId)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* True Cost Modal */}
      <TrueCostEstimatorModal
        costData={selectedTrueCost}
        isOpen={Boolean(selectedTrueCost)}
        onClose={() => setSelectedTrueCost(null)}
        onProceedToBooking={onBookNow}
      />

    </div>
  );
};
