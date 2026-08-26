import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  GraduationCap, 
  FileText, 
  Mail, 
  Lock,
  Sparkles,
  Camera
} from 'lucide-react';
import { UserProfile } from '../types';
import { validateUploadedFile } from '../utils/security';

interface StudentVerificationModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitVerification: (data: {
    matricNumber: string;
    department: string;
    level: string;
    method: 'STUDENT_ID' | 'MATRIC_PORTAL' | 'UNIVERSITY_EMAIL';
    studentIdCardUrl: string;
  }) => void;
}

export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSubmitVerification,
}) => {
  const [method, setMethod] = useState<'STUDENT_ID' | 'MATRIC_PORTAL' | 'UNIVERSITY_EMAIL'>('STUDENT_ID');
  const [matricNumber, setMatricNumber] = useState(currentUser?.matricNumber || 'LAU/21/0492');
  const [department, setDepartment] = useState(currentUser?.department || 'Computer Science & Engineering');
  const [level, setLevel] = useState(currentUser?.level || '300 Level');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [idCardPreviewUrl, setIdCardPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadedFile(file, 'image');
    if (!validation.isValid) {
      setFileError(validation.errorMessage || 'Invalid file uploaded');
      return;
    }

    setUploadedFileName(file.name);
    // Create preview URL
    const preview = URL.createObjectURL(file);
    setIdCardPreviewUrl(preview);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricNumber.trim()) {
      setFileError('Please provide your LAUTECH Matriculation / UTME Number.');
      return;
    }

    if (method === 'STUDENT_ID' && !uploadedFileName && !idCardPreviewUrl) {
      // For demo testing, provide sample ID preview if not uploaded
      setIdCardPreviewUrl('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80');
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitVerification({
        matricNumber: matricNumber.trim().toUpperCase(),
        department: department.trim(),
        level,
        method,
        studentIdCardUrl: idCardPreviewUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
      });
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-white my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">LAUTECH Student Trust Shield</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  MVP BETA
                </span>
              </div>
              <h2 className="text-lg font-black text-white">Student ID Verification</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits Banner */}
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-6 py-3 flex items-center gap-3 text-xs text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Verified students receive the <strong>Verified Student Badge</strong>, unlocking 48-hour priority reservation locks with verified hosts.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Verification Method Switcher */}
          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">
              Select Verification Document
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('STUDENT_ID')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'STUDENT_ID'
                    ? 'bg-brand-600/20 border-brand-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4 mx-auto mb-1 text-brand-400" />
                <span className="block text-[11px]">Student ID Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('MATRIC_PORTAL')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'MATRIC_PORTAL'
                    ? 'bg-brand-600/20 border-brand-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <span className="block text-[11px]">Portal Course Slip</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('UNIVERSITY_EMAIL')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  method === 'UNIVERSITY_EMAIL'
                    ? 'bg-brand-600/20 border-brand-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <span className="block text-[11px]">LAUTECH Email</span>
              </button>
            </div>
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                LAUTECH Matric / UTME No.
              </label>
              <input
                type="text"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. LAU/21/0492"
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                Academic Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="100 Level">100 Level (Freshman)</option>
                <option value="200 Level">200 Level</option>
                <option value="300 Level">300 Level</option>
                <option value="400 Level">400 Level</option>
                <option value="500 Level">500 Level (Final Year)</option>
                <option value="Postgraduate">Postgraduate / Masters</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
              Faculty & Academic Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Mechanical Engineering / Nursing Science"
              required
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Document Upload Area */}
          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
              Upload {method === 'STUDENT_ID' ? 'ID Card (Front)' : method === 'MATRIC_PORTAL' ? 'Admission / Registration Slip' : 'Student Portal Screenshot'}
            </label>
            
            <div className="border-2 border-dashed border-slate-700 hover:border-brand-500/80 rounded-2xl p-4 text-center transition-all bg-slate-950/40 relative cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              
              {idCardPreviewUrl ? (
                <div className="space-y-2">
                  <img src={idCardPreviewUrl} alt="ID Preview" className="h-24 w-auto mx-auto rounded-xl object-cover border border-slate-700 shadow-md" />
                  <div className="text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{uploadedFileName || 'Document Attached'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Click to replace file</p>
                </div>
              ) : (
                <div className="space-y-1.5 py-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-white text-xs">Tap to upload verification image</p>
                  <p className="text-[10px] text-slate-500">JPG, PNG or PDF (Max 10MB)</p>
                </div>
              )}
            </div>

            {fileError && (
              <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fileError}</span>
              </p>
            )}
          </div>

          {/* Privacy Note */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span>
              Your student documents are encrypted under NDPA 2023 regulations and used solely to prevent fraud and identity theft.
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? (
                <span>Submitting for Review...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
