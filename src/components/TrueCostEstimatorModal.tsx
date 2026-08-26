import React from 'react';
import { X, Calculator, ShieldCheck, Bus, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface TrueCostData {
  propertyId: string;
  title: string;
  area: string;
  distanceKm: number;
  knownCosts: {
    rentPerYear: number;
    cautionDeposit: number;
    serviceCharge: number;
    agencyLegalFee: number;
    platformEscrowFee: number;
    totalKnownCost: number;
  };
  estimatedCosts: {
    dailyCampusCommuteEstimated: number;
    academicSessionCommuteEstimated: number;
    schoolDaysCount: number;
  };
  totalTrueCost: number;
  costExplanation: string;
}

interface TrueCostEstimatorModalProps {
  costData: TrueCostData | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToBooking?: (propertyId: string) => void;
}

export const TrueCostEstimatorModal: React.FC<TrueCostEstimatorModalProps> = ({
  costData,
  isOpen,
  onClose,
  onProceedToBooking
}) => {
  if (!isOpen || !costData) return null;

  const { knownCosts, estimatedCosts, totalTrueCost, title, area, distanceKm, costExplanation } = costData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">True Cost Estimator</h2>
              <p className="text-xs text-slate-300 truncate max-w-xs">{title} • {area}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Explanation Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Zero Money Surprises:</strong> We strictly separate your <strong>Known Direct Payments</strong> from <strong>Estimated Local Transport</strong> so you know exactly what to budget.
            </p>
          </div>

          {/* 1. KNOWN DIRECT COSTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                1. Known Direct Accommodation Fees
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Fixed
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Annual Base Rent</span>
                <span className="font-bold text-slate-900">₦{knownCosts.rentPerYear.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1">
                  Caution Deposit
                  <span className="text-[10px] text-slate-400">(Refundable on move-out)</span>
                </span>
                <span className="font-bold text-slate-900">₦{knownCosts.cautionDeposit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Service & Maintenance Charge</span>
                <span className="font-bold text-slate-900">₦{knownCosts.serviceCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Legal & Agency Fee</span>
                <span className="font-bold text-slate-900">₦{knownCosts.agencyLegalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1">
                  Hostel Ease Escrow & Verification Fee
                </span>
                <span className="font-bold text-slate-900">₦{knownCosts.platformEscrowFee.toLocaleString()}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-black text-slate-900">
                <span>Total Known Initial Payment</span>
                <span className="text-emerald-700 text-sm">₦{knownCosts.totalKnownCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 2. ESTIMATED LOCAL COMMUTE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-amber-600" />
                2. Estimated Campus Commute Transport
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Estimated (~{distanceKm} km)
              </span>
            </div>

            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Daily Round-Trip Bike / Shuttle (Est.)</span>
                <span className="font-bold text-slate-900">₦{estimatedCosts.dailyCampusCommuteEstimated.toLocaleString()} / day</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Academic Session Duration</span>
                <span className="font-bold text-slate-900">~{estimatedCosts.schoolDaysCount} School Days</span>
              </div>

              <div className="border-t border-amber-200/80 pt-2 flex justify-between items-center font-black text-slate-900">
                <span>Estimated Annual Transport Cost</span>
                <span className="text-amber-800 text-sm">₦{estimatedCosts.academicSessionCommuteEstimated.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 3. TOTAL ESTIMATED OUTLAY */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total True Cost Estimate</span>
              <p className="text-xs text-slate-300 mt-0.5">Accommodation + Campus Commute</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-white">₦{totalTrueCost.toLocaleString()}</span>
              <p className="text-[10px] text-slate-400">per academic session</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          
          {onProceedToBooking && (
            <button
              onClick={() => {
                onClose();
                onProceedToBooking(costData.propertyId);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition-all flex items-center gap-2"
            >
              <span>Proceed to Space Reservation</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
