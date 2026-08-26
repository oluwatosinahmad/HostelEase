import React, { useState } from 'react';
import { 
  HelpCircle, 
  ShieldCheck, 
  MessageSquare, 
  PhoneCall, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  Video, 
  MapPin, 
  CheckCircle2,
  Lock
} from 'lucide-react';

interface SupportFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDisputeDesk?: () => void;
}

export const SupportFaqModal: React.FC<SupportFaqModalProps> = ({
  isOpen,
  onClose,
  onOpenDisputeDesk,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      question: 'How does CampusNest work for LAUTECH students in Ogbomoso?',
      category: 'DISCOVERY',
      answer:
        'CampusNest enables LAUTECH students to search, compare, and inspect verified student accommodation in Under-G, Adenike, Stadium Road, Aroje, and General Area without walking from house to house in the sun. Every verified property features uncut video tours, verified water/light ratings, and transparent fees.',
    },
    {
      question: 'What is the 10-Point Physical Verification Standard?',
      category: 'SAFETY',
      answer:
        'Before a property receives the "Verified Student Shield", a CampusNest field officer visits the premises in Ogbomoso. We verify GPS coordinates, test running borehole water, confirm prepaid meters, record continuous interior video, and inspect landlord/agent legal tenancy authorization.',
    },
    {
      question: 'How does the 48-Hour Escrow Protection work?',
      category: 'PAYMENTS',
      answer:
        'When you pay online through CampusNest via Paystack or Flutterwave, your rent and caution deposit are held in secure escrow. The funds are NOT disbursed to the landlord until you arrive, inspect the room keys, and confirm your move-in condition.',
    },
    {
      question: 'Can a landlord demand extra inspection fees or hidden charges?',
      category: 'FEES',
      answer:
        'No. All verified listings operate under our Transparent Pricing Guarantee. The total amount displayed at checkout (Rent + Caution + Service/Agreement) is the complete payment. If any host asks for offline side-fees, report them immediately.',
    },
    {
      question: 'How do Virtual Video Walkthroughs work?',
      category: 'VIEWINGS',
      answer:
        'Students can request scheduled live WhatsApp video walkthroughs directly with the landlord or caretaker to see the current state of the room, water flow, and compound before committing.',
    },
    {
      question: 'What happens if a property is not available after payment?',
      category: 'REFUNDS',
      answer:
        'Under the CampusNest Escrow Guarantee, if a landlord cannot deliver access on the agreed move-in date or if the room condition contradicts verified media, you are entitled to an immediate 100% full refund.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden text-white my-8 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center shadow-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">LAUTECH Student Knowledge Base</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  OGBOMOSO DESK
                </span>
              </div>
              <h2 className="text-lg font-black text-white">How CampusNest Protects You</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Contact Bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-300">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span>LAUTECH Student Hotline: <strong>0800-CAMPUS-NEST</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-brand-400" />
            <span>Under-G / School Gate Liaison Desk</span>
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="p-6 overflow-y-auto space-y-3 font-sans text-xs">
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className={`border rounded-2xl transition-all overflow-hidden ${
                  isExpanded ? 'bg-slate-800/60 border-brand-500/40' : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                      {faq.category}
                    </span>
                    <h3 className="font-bold text-white text-xs">{faq.question}</h3>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-brand-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 text-slate-300 text-xs leading-relaxed border-t border-slate-800/80 pt-3 animate-fadeIn">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Support Action */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CampusNest Student Trust & Tenancy Protection</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all shadow-lg cursor-pointer"
          >
            Got It, Thanks
          </button>
        </div>

      </div>
    </div>
  );
};
