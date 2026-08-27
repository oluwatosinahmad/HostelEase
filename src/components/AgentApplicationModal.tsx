import React, { useState } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Upload,
  MapPin, Briefcase, User, Mail, Phone, Lock, ChevronRight, Info
} from 'lucide-react';
import { api } from '../services/api';

interface AgentApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LAUTECH_OPERATING_AREAS = [
  'Under G',
  'Adenike',
  'Stadium Road',
  'College Road',
  'General Area',
  'Aroje',
  'Randa',
  'Idiroko',
  'Odo Oru',
  'Yoaco'
];

export const AgentApplicationModal: React.FC<AgentApplicationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Under G', 'Adenike']);
  const [experienceYears, setExperienceYears] = useState('2');
  const [bio, setBio] = useState('');
  const [idType, setIdType] = useState('NIN_CARD');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [antiFraudAccepted, setAntiFraudAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      if (selectedAreas.length > 1) {
        setSelectedAreas(selectedAreas.filter(a => a !== area));
      }
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !antiFraudAccepted) {
      setError('You must accept the Agent Terms and Anti-Fraud Policy to submit your application.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.auth.register({
        fullName,
        email,
        phone,
        password,
        role: 'AGENT',
        agentDetails: {
          businessName: businessName || fullName,
          operatingAreas: selectedAreas,
          experienceYears: Number(experienceYears),
          bio,
          idDocumentType: idType,
          serviceFeeAmount: 5000
        }
      });

      if (res.user) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit agent application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/30 text-emerald-200 uppercase tracking-wider">
                Vetted Agent Network
              </span>
              <h2 className="text-xl font-bold text-white">Become a Hostel Ease Agent</h2>
            </div>
          </div>
          <p className="text-emerald-100/90 text-sm">
            Assist LAUTECH students find verified lodges with 100% transparent pricing and no hidden charges.
          </p>

          {/* Progress Indicator */}
          {!isSuccess && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-emerald-700/50 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-medium ${step === 1 ? 'bg-white text-emerald-900 font-bold' : 'bg-emerald-700/50 text-white'}`}>
                1. Basic Info
              </span>
              <ChevronRight className="w-3 h-3 text-emerald-400" />
              <span className={`px-2.5 py-1 rounded-full font-medium ${step === 2 ? 'bg-white text-emerald-900 font-bold' : 'bg-emerald-700/50 text-white'}`}>
                2. Operations & Vetting
              </span>
              <ChevronRight className="w-3 h-3 text-emerald-400" />
              <span className={`px-2.5 py-1 rounded-full font-medium ${step === 3 ? 'bg-white text-emerald-900 font-bold' : 'bg-emerald-700/50 text-white'}`}>
                3. Policies & Agreement
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                Your application to join Hostel Ease as a Verified Accommodation Agent is currently 
                <strong className="text-amber-600"> PENDING VERIFICATION</strong>. The platform Administrator will review your identification and operating areas.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-600 space-y-2 mb-6 max-w-md mx-auto">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  What happens next?
                </div>
                <p>• Admin verifies your identity against Nigerian registries.</p>
                <p>• Once approved, you can log in directly under the <strong>🤝 Agent</strong> role.</p>
                <p>• You will gain immediate access to student requests and verified lodge inventories.</p>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Babatunde Lawal"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Agency / Business Name
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Lawal Student Relocators"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="agent@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="08012345678"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Account Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!fullName || !email || !phone || !password) {
                          setError('Please fill in all required fields.');
                          return;
                        }
                        setError(null);
                        setStep(2);
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl flex items-center gap-1.5 text-sm transition"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Operating Areas in Ogbomoso (Select all that apply) *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LAUTECH_OPERATING_AREAS.map(area => {
                        const isSelected = selectedAreas.includes(area);
                        return (
                          <button
                            type="button"
                            key={area}
                            onClick={() => toggleArea(area)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Experience in Student Accommodation (Years)
                      </label>
                      <select
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                      >
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="4">4 Years</option>
                        <option value="5">5+ Years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        ID Document Type *
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                      >
                        <option value="NIN_CARD">NIN Slip / Card</option>
                        <option value="VOTERS_CARD">Voter's Card</option>
                        <option value="DRIVERS_LICENSE">Driver's License</option>
                        <option value="PASSPORT">International Passport</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Professional Bio / Experience Summary
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Briefly describe your background assisting LAUTECH students..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    />
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl flex items-center gap-1.5 text-sm transition"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Hostel Ease Transparent Agent Standards
                    </div>
                    <p>• <strong>Fixed Transparent Service Fee:</strong> Standard assistance fee is ₦5,000 per student request.</p>
                    <p>• <strong>No Hidden Charges:</strong> Under no circumstance should you demand unvetted extra charges or off-platform money transfers.</p>
                    <p>• <strong>Direct Booking Protection:</strong> Students maintain full rights to book directly without an agent at any point.</p>
                    <p>• <strong>Accountability:</strong> Fraudulent listings or misrepresentations result in permanent deactivation and NIMC reporting.</p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-700">
                        I agree to the <strong>Hostel Ease Agent Code of Conduct & Operational Terms</strong>.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={antiFraudAccepted}
                        onChange={(e) => setAntiFraudAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-700">
                        I confirm that all accommodation details and landlord representations I provide are 100% accurate and verifiable in Ogbomoso.
                      </span>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !termsAccepted || !antiFraudAccepted}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-2"
                    >
                      {isSubmitting ? 'Submitting Application...' : 'Submit Agent Application'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
