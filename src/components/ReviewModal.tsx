import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Upload, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Camera
} from 'lucide-react';
import { Property, StudentReview, UserProfile } from '../types';

interface ReviewModalProps {
  property: Property;
  currentUser: UserProfile | null;
  existingReview?: StudentReview | null;
  onClose: () => void;
  onSubmit: (reviewData: {
    propertyId: string;
    propertyTitle: string;
    studentId: string;
    studentName: string;
    studentDepartment: string;
    studentLevel: string;
    stayPeriod: string;
    rating: number;
    propertyCondition: number;
    listingAccuracy: number;
    locationExperience: number;
    valueForMoney: number;
    landlordExperience: number;
    comment: string;
    photos: string[];
    isVerifiedExperience: boolean;
    verificationSignal: 'CONFIRMED_VIEWING' | 'CONFIRMED_INQUIRY' | 'CONFIRMED_TENANCY' | 'ADMIN_VERIFIED';
    editReason?: string;
  }) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  property,
  currentUser,
  existingReview,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(existingReview);

  // Overall & Category Ratings (1-5)
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [propertyCondition, setPropertyCondition] = useState<number>(existingReview?.propertyCondition || 5);
  const [listingAccuracy, setListingAccuracy] = useState<number>(existingReview?.listingAccuracy || 5);
  const [locationExperience, setLocationExperience] = useState<number>(existingReview?.locationExperience || 5);
  const [valueForMoney, setValueForMoney] = useState<number>(existingReview?.valueForMoney || 5);
  const [landlordExperience, setLandlordExperience] = useState<number>(existingReview?.landlordExperience || 5);

  const [studentDepartment, setStudentDepartment] = useState<string>(
    existingReview?.studentDepartment || currentUser?.department || 'Engineering'
  );
  const [studentLevel, setStudentLevel] = useState<string>(
    existingReview?.studentLevel || '300L'
  );
  const [stayPeriod, setStayPeriod] = useState<string>(
    existingReview?.stayPeriod || '2025 - 2026 Academic Session'
  );
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [photos, setPhotos] = useState<string[]>(existingReview?.photos || []);
  const [editReason, setEditReason] = useState<string>('');
  const [hasAgreedToGuidelines, setHasAgreedToGuidelines] = useState<boolean>(true);
  const [showError, setShowError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(null);

    if (!currentUser) {
      setShowError('You must be signed in to submit a review.');
      return;
    }

    if (comment.trim().length < 15) {
      setShowError('Please write at least 15 characters to explain your rating to other students.');
      return;
    }

    if (!hasAgreedToGuidelines) {
      setShowError('Please acknowledge the CampusNest Review Integrity Guidelines.');
      return;
    }

    onSubmit({
      propertyId: property.id,
      propertyTitle: property.title,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentDepartment,
      studentLevel,
      stayPeriod,
      rating,
      propertyCondition,
      listingAccuracy,
      locationExperience,
      valueForMoney,
      landlordExperience,
      comment: comment.trim(),
      photos,
      isVerifiedExperience: true,
      verificationSignal: 'CONFIRMED_VIEWING',
      editReason: isEditing ? editReason.trim() : undefined,
    });

    onClose();
  };

  const renderStarInput = (
    currentValue: number, 
    onChange: (val: number) => void,
    size: 'lg' | 'sm' = 'sm'
  ) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
          >
            <Star
              className={`${
                size === 'lg' ? 'w-7 h-7' : 'w-4 h-4'
              } ${
                star <= currentValue
                  ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                  : 'text-slate-200 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
        <span className={`font-black text-slate-800 ml-1.5 ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
          {currentValue}.0
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 p-5 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {isEditing ? 'Update Review' : 'Student Experience'}
              </span>
              <span className="text-emerald-300 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Student Feedback
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black mt-1">
              {isEditing ? 'Edit Your Hostel Review' : 'Rate & Review This Hostel'}
            </h3>
            <p className="text-xs text-brand-100 truncate max-w-sm">
              {property.title} • {property.zoneName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {showError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{showError}</span>
            </div>
          )}

          {/* Primary Overall Rating */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-center space-y-1.5">
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Overall Hostel Rating
            </span>
            <div className="flex justify-center py-1">
              {renderStarInput(rating, setRating, 'lg')}
            </div>
            <p className="text-[11px] text-amber-900/70">
              {rating === 5 && 'Outstanding — Exceeded expectations in all areas.'}
              {rating === 4 && 'Good — Reliable accommodation with minor flaws.'}
              {rating === 3 && 'Average — Satisfactory but has room for improvement.'}
              {rating === 2 && 'Below Average — Multiple noticeable issues.'}
              {rating === 1 && 'Poor — Disappointing experience, needs urgent fix.'}
            </p>
          </div>

          {/* 5-Category Sub-Ratings */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Detailed Category Breakdown
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">1 to 5 Stars</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Property Condition */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Property Condition</span>
                  <span className="text-[10px] text-slate-400">Tiling, paint, plumbing, roof</span>
                </div>
                {renderStarInput(propertyCondition, setPropertyCondition)}
              </div>

              {/* Listing Accuracy */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Listing Accuracy</span>
                  <span className="text-[10px] text-slate-400">Matches photos & description</span>
                </div>
                {renderStarInput(listingAccuracy, setListingAccuracy)}
              </div>

              {/* Location Experience */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Location Experience</span>
                  <span className="text-[10px] text-slate-400">Distance to gate & road safety</span>
                </div>
                {renderStarInput(locationExperience, setLocationExperience)}
              </div>

              {/* Value for Money */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Value for Money</span>
                  <span className="text-[10px] text-slate-400">Fair rent for the amenities</span>
                </div>
                {renderStarInput(valueForMoney, setValueForMoney)}
              </div>
            </div>

            {/* Landlord/Agent Experience */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Landlord / Host Experience</span>
                <span className="text-[10px] text-slate-400">Communication, responsiveness & fairness</span>
              </div>
              {renderStarInput(landlordExperience, setLandlordExperience)}
            </div>
          </div>

          {/* Academic Context */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={studentDepartment}
                onChange={(e) => setStudentDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
              <select
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="100L">100 Level</option>
                <option value="200L">200 Level</option>
                <option value="300L">300 Level</option>
                <option value="400L">400 Level</option>
                <option value="500L">500 Level</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stay / Interaction Period</label>
              <select
                value={stayPeriod}
                onChange={(e) => setStayPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="2025 - 2026 Academic Session">2025 - 2026 Session</option>
                <option value="2024 - 2025 Academic Session">2024 - 2025 Session</option>
                <option value="Completed Virtual Viewing">Virtual Viewing Inspected</option>
                <option value="Currently Residing">Currently Residing</option>
              </select>
            </div>
          </div>

          {/* Written Review */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Your Written Review & Experience
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">
                {comment.length} characters (min 15)
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other students about your experience. How is the electricity, water pressure, road condition, security, and landlord responsiveness? Genuine positive and negative feedback is encouraged."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Optional Review Photos */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-brand-600" />
              <span>Add Review Photos (Optional)</span>
            </label>

            <div className="flex flex-wrap gap-2.5">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={photo} alt="review" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                <span className="text-[9px] font-bold text-slate-600">Add Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Photos of room condition, compound, or amenities. No personal ID cards or phone numbers.
            </span>
          </div>

          {/* If Editing, Edit Reason */}
          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Update (Optional)
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Landlord fixed water pump, updated rating accordingly"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          )}

          {/* CampusNest Community Review Guidelines */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5 text-slate-900 font-bold">
              <Info className="w-3.5 h-3.5 text-brand-600" />
              <span>CampusNest Review Guidelines</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Genuine negative experiences are welcomed and protected.</li>
              <li>No personal attacks, hate speech, passwords, or phone numbers.</li>
              <li>No spam, false claims, or extortion.</li>
            </ul>

            <label className="flex items-center space-x-2 pt-1 font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAgreedToGuidelines}
                onChange={(e) => setHasAgreedToGuidelines(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>I certify this review represents my honest student accommodation experience.</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Save Updated Review' : 'Submit Honest Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
