import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

interface ProviderOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProviderOnboardingModal: React.FC<ProviderOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onShowToast
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [managementType, setManagementType] = useState('DIRECT_OWNER');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('NIN_CARD');

  useEffect(() => {
    if (isOpen) {
      api.provider.getOnboarding()
        .then(res => {
          const data = res.onboarding;
          if (data) {
            setFullName(data.fullName || '');
            setPhone(data.phone || '');
            setBusinessName(data.businessName || '');
            setBusinessRegNo(data.businessRegNo || '');
            setManagementType(data.managementType || 'DIRECT_OWNER');
            setAddress(data.address || '');
            setIdType(data.idType || 'NIN_CARD');
            setStep(data.onboardingStep || 1);
          }
        })
        .catch(err => console.error('Failed to load onboarding data', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndContinue = async (nextStep?: number, markComplete: boolean = false) => {
    setLoading(true);
    try {
      await api.provider.updateOnboarding({
        fullName,
        phone,
        businessName,
        businessRegNo,
        managementType,
        address,
        idType,
        step: nextStep || step,
        completed: markComplete
      });

      if (markComplete) {
        onShowToast('Provider profile setup completed! Welcome to Hostel Ease.', 'success');
        onComplete();
        onClose();
      } else if (nextStep) {
        setStep(nextStep);
      } else {
        onShowToast('Progress saved! You can continue anytime.', 'info');
        onClose();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save onboarding progress', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 bg-emerald-900/40 px-2.5 py-0.5 rounded-full">
                Landlord & Manager Setup
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {step === 1 && '1. Landlord & Business Profile'}
                {step === 2 && '2. Location & Contact Details'}
                {step === 3 && '3. Identity Verification Details'}
              </h2>
            </div>
          </div>

          {/* Step Progress Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-white' : s < step ? 'w-4 bg-emerald-300' : 'w-4 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tell us about how you manage accommodation around LAUTECH Ogbomoso.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name / Contact Person *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Chief Adebayo Alabi"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number (WhatsApp Preferred) *
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 08031234567"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Hostel Brand or Business Name
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Peace View Accommodations"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Management Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DIRECT_OWNER', label: 'Hostel Owner (Landlord)' },
                    { id: 'CARETAKER', label: 'Resident Caretaker' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setManagementType(item.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        managementType === item.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location & Office Details */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Help students and Hostel Ease verification officers identify your location in Ogbomoso.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Hostel / Office Street Address *
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Behind Under G Primary School, Ogbomoso"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Business Registration / CAC Number (Optional)
                </label>
                <div className="relative">
                  <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={businessRegNo}
                    onChange={e => setBusinessRegNo(e.target.value)}
                    placeholder="e.g. BN-1234567 (Optional for individuals)"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Verified providers get <strong>4x more student inquiries</strong> and enjoy instant platform payments with zero escrow dispute delays.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Identity Setup */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose the official government identity document you will use for your verified landlord badge.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Preferred Identification Document
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'NIN_CARD', label: 'National ID (NIN Slip / Card)' },
                    { id: 'DRIVERS_LICENSE', label: "Driver's License" },
                    { id: 'VOTERS_CARD', label: "Permanent Voter's Card (PVC)" },
                    { id: 'INTERNATIONAL_PASSPORT', label: 'International Passport' }
                  ].map(idItem => (
                    <button
                      key={idItem.id}
                      type="button"
                      onClick={() => setIdType(idItem.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        idType === idItem.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {idItem.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  You can upload the physical document image immediately or later from the <strong>Verification</strong> tab in your dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={() => handleSaveAndContinue(undefined, false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save & Continue Later
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => handleSaveAndContinue(step + 1, false)}
                disabled={loading || (step === 1 && (!fullName || !phone))}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveAndContinue(undefined, true)}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Setup
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
