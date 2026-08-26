import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  Zap, 
  Droplets, 
  Flame, 
  Coffee, 
  Wind, 
  Laptop, 
  Smartphone, 
  Lightbulb, 
  Shirt, 
  Users, 
  AlertCircle, 
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { ApplianceUsageItem } from '../types';
import { formatNaira } from '../utils/formatters';

interface UtilityCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAppliances: ApplianceUsageItem[];
}

export const UtilityCalculatorModal: React.FC<UtilityCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialAppliances,
}) => {
  const [appliances, setAppliances] = useState<ApplianceUsageItem[]>(initialAppliances);
  const [roommateCount, setRoommateCount] = useState<number>(1);
  const [waterLevyMonthly, setWaterLevyMonthly] = useState<number>(2500);
  const [wasteLevyMonthly, setWasteLevyMonthly] = useState<number>(1000);
  const [ibedcTariffPerKwh, setIbedcTariffPerKwh] = useState<number>(75); // ₦75 per kWh in Ogbomoso Band C/D

  if (!isOpen) return null;

  const handleHoursChange = (id: string, hours: number) => {
    setAppliances(
      appliances.map((a) => (a.id === id ? { ...a, currentDailyHours: Math.max(0, hours) } : a))
    );
  };

  const handleCountChange = (id: string, count: number) => {
    setAppliances(
      appliances.map((a) => (a.id === id ? { ...a, count: Math.max(0, count) } : a))
    );
  };

  // Calculations
  const { totalDailyKwh, totalMonthlyKwh, monthlyElectricCost, totalMonthlyUtility, perPersonCost } = useMemo(() => {
    const dailyWattHours = appliances.reduce((sum, a) => {
      return sum + (a.wattage * a.currentDailyHours * a.count);
    }, 0);

    const dailyKwh = dailyWattHours / 1000;
    const monthlyKwh = dailyKwh * 30;
    const electricCost = Math.round(monthlyKwh * ibedcTariffPerKwh);
    const totalUtility = electricCost + waterLevyMonthly + wasteLevyMonthly;
    const perPerson = Math.round(totalUtility / (roommateCount || 1));

    return {
      totalDailyKwh: dailyKwh.toFixed(2),
      totalMonthlyKwh: Math.round(monthlyKwh),
      monthlyElectricCost: electricCost,
      totalMonthlyUtility: totalUtility,
      perPersonCost: perPerson,
    };
  }, [appliances, ibedcTariffPerKwh, waterLevyMonthly, wasteLevyMonthly, roommateCount]);

  const getApplianceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Coffee': return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'Wind': return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'Laptop': return <Laptop className="w-4 h-4 text-blue-400" />;
      case 'Smartphone': return <Smartphone className="w-4 h-4 text-indigo-400" />;
      case 'Lightbulb': return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'Shirt': return <Shirt className="w-4 h-4 text-rose-400" />;
      default: return <Zap className="w-4 h-4 text-brand-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden text-white my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Ogbomoso Utility Forecaster</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  IBEDC Tariff Simulator
                </span>
              </div>
              <h2 className="text-lg font-black text-white">Electricity & Utility Cost Estimator</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: Appliances List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Adjust your daily hours for each appliance:</span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">~₦{ibedcTariffPerKwh}/kWh Rate</span>
            </div>

            <div className="space-y-3">
              {appliances.map((app) => (
                <div 
                  key={app.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {getApplianceIcon(app.iconName)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs truncate">{app.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{app.wattage} Watts rating</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Quantity Counter */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                      <span className="text-slate-500 px-1 font-bold">Qty:</span>
                      <button
                        type="button"
                        onClick={() => handleCountChange(app.id, app.count - 1)}
                        className="w-5 h-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-white font-mono">{app.count}</span>
                      <button
                        type="button"
                        onClick={() => handleCountChange(app.id, app.count + 1)}
                        className="w-5 h-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Daily Hours Slider */}
                    <div className="flex items-center gap-2 bg-slate-900 p-1.5 px-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <span className="font-bold text-slate-300 font-mono">{app.currentDailyHours}h/day</span>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="0.5"
                        value={app.currentDailyHours}
                        onChange={(e) => handleHoursChange(app.id, parseFloat(e.target.value))}
                        className="w-20 accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Energy Saver Tips */}
            <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200/90">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Ogbomoso Power Tip:</strong> Electric hotplates account for up to 60% of monthly student prepaid bills. Using gas for boiling beans or heavy meals can save you over ₦8,000 monthly.
              </p>
            </div>
          </div>

          {/* Right Summary Cost Breakdown */}
          <div className="w-full lg:w-80 bg-slate-900 p-5 space-y-4 overflow-y-auto shrink-0 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Estimated Consumption</span>
                <h3 className="font-black text-white text-base">Monthly Utility Summary</h3>
              </div>

              {/* Consumption Overview Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Daily Power Usage:</span>
                  <strong className="text-white font-mono">{totalDailyKwh} kWh/day</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Monthly Power Usage:</span>
                  <strong className="text-amber-400 font-mono">{totalMonthlyKwh} kWh/mo</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-900 font-bold">
                  <span>Prepaid Light Recharge:</span>
                  <span className="text-emerald-400 font-mono text-sm">{formatNaira(monthlyElectricCost)}</span>
                </div>
              </div>

              {/* Additional Flat Levies */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compound Shared Levies</span>
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Borehole Pumping:</span>
                  <input
                    type="number"
                    value={waterLevyMonthly}
                    onChange={(e) => setWaterLevyMonthly(parseInt(e.target.value) || 0)}
                    className="w-24 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-right font-mono text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Refuse / Security:</span>
                  <input
                    type="number"
                    value={wasteLevyMonthly}
                    onChange={(e) => setWasteLevyMonthly(parseInt(e.target.value) || 0)}
                    className="w-24 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-right font-mono text-white text-xs"
                  />
                </div>
              </div>

              {/* Roommate Splitter */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Split with Roommates</span>
                  <span className="text-brand-400 font-bold font-mono">{roommateCount} Person(s)</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRoommateCount(num)}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                        roommateCount === num
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {num} {num === 1 ? 'Solo' : 'Ppl'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grand Total & Per Person */}
              <div className="bg-gradient-to-br from-brand-950 to-slate-950 p-4 rounded-2xl border border-brand-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Total Monthly Utilities:</span>
                  <span className="font-bold text-white font-mono">{formatNaira(totalMonthlyUtility)} / mo</span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-brand-500/30 font-black">
                  <span className="text-amber-300">Your Share:</span>
                  <span className="text-emerald-400 font-mono text-base">{formatNaira(perPersonCost)} / mo</span>
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg"
              >
                Done
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
