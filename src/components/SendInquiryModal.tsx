import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Building2, User, Phone, Mail, Sparkles } from 'lucide-react';
import { Property, StudentInquiry } from '../types';

interface SendInquiryModalProps {
  property: Property | null;
  onClose: () => void;
  onSubmitInquiry: (inquiry: StudentInquiry) => void;
}

const QUICK_PROMPTS = [
  'Is this room still available for this semester?',
  'What is the borehole water pumping schedule?',
  'Can I schedule a live virtual viewing via WhatsApp?',
  'Is there solar inverter power backup during power cuts?',
  'Can I pay in two installments (per semester)?',
];

export const SendInquiryModal: React.FC<SendInquiryModalProps> = ({
  property,
  onClose,
  onSubmitInquiry,
}) => {
  if (!property) return null;

  const [message, setMessage] = useState('');
  const [studentName, setStudentName] = useState('Oluwaseun Adeleke');
  const [studentEmail, setStudentEmail] = useState('oluwaseun@student.lautech.edu.ng');
  const [studentPhone, setStudentPhone] = useState('08034567890');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newInquiry: StudentInquiry = {
      id: `inq-${Date.now()}`,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyImage: property.coverImage,
      zoneName: property.zoneName,
      landlordId: property.landlord.id,
      landlordName: property.landlord.name,
      landlordWhatsapp: property.landlord.whatsapp,
      studentId: 'stu-current',
      studentName: studentName || 'Student Resident',
      studentEmail: studentEmail || 'student@lautech.edu.ng',
      studentPhone: studentPhone || '08000000000',
      message: message.trim(),
      status: 'NEW',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSubmitInquiry(newInquiry);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-emerald-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-white shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Send In-App Inquiry</h3>
              <p className="text-xs text-brand-100/90 mt-0.5 line-clamp-1">
                To: <span className="font-bold">{property.landlord.name}</span> • {property.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-slate-900">Inquiry Sent Successfully!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Your message has been delivered to <strong>{property.landlord.name}</strong>. You can track their response in your Student Dashboard.
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Quick Prompt Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-600" />
                <span>Quick Inquiries (Click to autofill)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="text-[11px] text-slate-700 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-2.5 py-1 rounded-lg transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Ask specific questions about water availability, electricity schedule, light bills, or moving dates..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              ></textarea>
            </div>

            {/* Student Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!message.trim()}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Inquiry to Landlord</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
