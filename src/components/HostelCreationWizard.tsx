import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Bed, 
  CheckSquare, 
  DollarSign, 
  Camera, 
  Eye, 
  Send, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  Video, 
  Trash2, 
  Star, 
  Info,
  ShieldCheck,
  Footprints,
  Plus
} from 'lucide-react';
import { Area, MediaCategory, PropertyType, GenderPreference } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface HostelCreationWizardProps {
  areas: Area[];
  onComplete: () => void;
  onCancel: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialData?: any;
  editingProperty?: any;
}

interface MediaUploadItem {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mediaType: 'IMAGE' | 'VIDEO';
  category: MediaCategory;
  caption: string;
  isCover: boolean;
}

interface RoomConfig {
  name: string;
  type: PropertyType;
  maxOccupants: number;
  total: number;
  available: number;
  isEnsuite: boolean;
  isFurnished: boolean;
}

export const HostelCreationWizard: React.FC<HostelCreationWizardProps> = ({
  areas,
  onComplete,
  onCancel,
  onShowToast,
  initialData,
  editingProperty
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const init = editingProperty || initialData;

  // Step 1: Basic Info
  const [title, setTitle] = useState(init?.title || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(init?.propertyType || 'SELF_CONTAIN');
  const [description, setDescription] = useState(init?.description || '');
  const [genderPreference, setGenderPreference] = useState<GenderPreference>(init?.genderPreference || 'ANY');

  // Step 2: Location
  const [areaId, setAreaId] = useState(init?.areaId || init?.area?.id || areas[0]?.id || 'area-under-g');
  const [address, setAddress] = useState(init?.address || '');
  const [nearbyLandmark, setNearbyLandmark] = useState(init?.nearbyLandmark || '');
  const [distanceKm, setDistanceKm] = useState(init?.distanceFromCampusKm?.toString() || '0.8');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Step 3: Rooms
  const [roomsList, setRoomsList] = useState<RoomConfig[]>(initialData?.roomsList || [
    { name: 'Standard Self-Contain', type: 'SELF_CONTAIN', maxOccupants: 1, total: 10, available: 10, isEnsuite: true, isFurnished: false }
  ]);

  // Step 4: Facilities
  const [amenityKeys, setAmenityKeys] = useState<string[]>(initialData?.amenityKeys || [
    'electricity', 'water', 'security', 'kitchen'
  ]);

  // Step 5: Pricing
  const [rentAmount, setRentAmount] = useState(initialData?.pricing?.rentAmount?.toString() || '180000');
  const [serviceCharge, setServiceCharge] = useState(initialData?.pricing?.serviceCharge?.toString() || '15000');
  const [agencyFee, setAgencyFee] = useState(initialData?.pricing?.agencyFee?.toString() || '15000');
  const [cautionFee, setCautionFee] = useState(initialData?.pricing?.cautionFee?.toString() || '10000');
  const [otherCharges, setOtherCharges] = useState(initialData?.pricing?.otherMandatoryCharges?.toString() || '5000');
  const [pricingNotes, setPricingNotes] = useState(initialData?.pricing?.notes || '');

  // Step 6: Media
  const [mediaList, setMediaList] = useState<MediaUploadItem[]>(initialData?.mediaItems || [
    {
      id: 'default-ext',
      url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      filename: 'exterior.jpg',
      originalName: 'Compound Front Elevation.jpg',
      mediaType: 'IMAGE',
      category: 'EXTERIOR',
      caption: 'Front Elevation & Gate',
      isCover: true
    },
    {
      id: 'default-bed',
      url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
      filename: 'bedroom.jpg',
      originalName: 'Bedroom.jpg',
      mediaType: 'IMAGE',
      category: 'BEDROOM',
      caption: 'Bedroom with Tiled Floor',
      isCover: false
    }
  ]);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check duplicate on blur
  const handleCheckDuplicate = async () => {
    if (title.length > 3 && areaId) {
      try {
        const res = await api.provider.checkDuplicate(title, areaId, address);
        if (res.isDuplicate) {
          setDuplicateWarning(res.message || 'A similar hostel is already listed in this area.');
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Completeness score calculation
  const calculateScore = () => {
    let score = 0;
    const missing: string[] = [];

    if (title.trim().length > 5) score += 10; else missing.push('Hostel title');
    if (description.trim().length > 20) score += 10; else missing.push('Detailed description');
    if (address.trim().length > 5) score += 10; else missing.push('Street address');
    if (nearbyLandmark.trim().length > 2) score += 5; else missing.push('Nearby landmark');
    if (parseFloat(distanceKm) > 0) score += 5; else missing.push('Distance to campus');
    if (parseFloat(rentAmount) > 0) score += 15; else missing.push('Annual rent amount');
    if (parseFloat(serviceCharge) > 0 || parseFloat(agencyFee) > 0 || parseFloat(cautionFee) > 0) score += 10; else missing.push('Fee breakdown');

    const hasExt = mediaList.some(m => m.category === 'EXTERIOR');
    const hasBed = mediaList.some(m => m.category === 'BEDROOM');
    const hasBath = mediaList.some(m => m.category === 'BATHROOM');
    const hasKit = mediaList.some(m => m.category === 'KITCHEN');
    const hasVid = mediaList.some(m => m.mediaType === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH');

    if (hasExt) score += 10; else missing.push('Exterior photo');
    if (hasBed) score += 10; else missing.push('Bedroom photo');
    if (hasBath) score += 5; else missing.push('Bathroom photo');
    if (hasKit) score += 5; else missing.push('Kitchen photo');
    if (hasVid) score += 5; else missing.push('Video walkthrough tour');

    return { score: Math.min(100, score), missing };
  };

  const completeness = calculateScore();

  // Media Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const res = await api.upload.multiple(fileArray);

      const newItems: MediaUploadItem[] = res.files.map((file, idx) => {
        const isFirst = mediaList.length === 0 && idx === 0;
        let defaultCategory: MediaCategory = 'BEDROOM';
        if (file.mediaType === 'VIDEO') defaultCategory = 'VIDEO_WALKTHROUGH';
        else if (isFirst) defaultCategory = 'EXTERIOR';

        return {
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          url: file.url,
          filename: file.filename,
          originalName: file.originalName,
          mediaType: file.mediaType,
          category: defaultCategory,
          caption: file.originalName.replace(/\.[^/.]+$/, ''),
          isCover: isFirst
        };
      });

      setMediaList(prev => [...prev, ...newItems]);
      onShowToast(`Uploaded ${newItems.length} media item(s) successfully!`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to upload media', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddVideoTour = () => {
    if (!customVideoUrl.trim()) return;
    const newItem: MediaUploadItem = {
      id: `vid-${Date.now()}`,
      url: customVideoUrl.trim(),
      filename: 'video_walkthrough',
      originalName: 'Video Tour Link',
      mediaType: 'VIDEO',
      category: 'VIDEO_WALKTHROUGH',
      caption: 'Online Walkthrough Video Tour',
      isCover: false
    };
    setMediaList(prev => [...prev, newItem]);
    setCustomVideoUrl('');
    onShowToast('Video walkthrough tour added!', 'success');
  };

  // Submit Handler
  const handleFinalSubmit = async (isDraft: boolean) => {
    if (!title.trim()) {
      onShowToast('Please provide a hostel title', 'error');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        areaId,
        description: description.trim(),
        address: address.trim(),
        nearbyLandmark: nearbyLandmark.trim() || undefined,
        distanceFromCampusKm: parseFloat(distanceKm) || 1.0,
        propertyType,
        genderPreference,
        totalRooms: roomsList.reduce((acc, r) => acc + (r.total || 1), 0),
        isDraft,
        pricing: {
          period: 'YEARLY',
          rentAmount: parseFloat(rentAmount) || 0,
          serviceCharge: parseFloat(serviceCharge) || 0,
          agencyFee: parseFloat(agencyFee) || 0,
          cautionFee: parseFloat(cautionFee) || 0,
          otherMandatoryCharges: parseFloat(otherCharges) || 0,
          notes: pricingNotes.trim() || undefined
        },
        amenityKeys,
        mediaItems: mediaList.map(m => ({
          type: m.mediaType,
          cat: m.category,
          url: m.url,
          caption: m.caption,
          isCover: m.isCover
        })),
        roomsList
      };

      const targetPropId = editingProperty?.id || initialData?.id;

      if (targetPropId) {
        await api.provider.updateListing(targetPropId, { ...payload, submitForReview: !isDraft });
        onShowToast(isDraft ? 'Draft updated!' : 'Hostel resubmitted for admin review!', 'success');
      } else {
        await api.provider.createListing(payload);
        onShowToast(isDraft ? 'Hostel saved as Draft!' : 'Hostel submitted for Admin Verification!', 'success');
      }

      onComplete();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save accommodation listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Rooms' },
    { num: 4, label: 'Facilities' },
    { num: 5, label: 'Pricing' },
    { num: 6, label: 'Media' },
    { num: 7, label: 'Preview' },
    { num: 8, label: 'Submit' }
  ];

  const totalMandatory = (parseFloat(rentAmount) || 0) +
                         (parseFloat(serviceCharge) || 0) +
                         (parseFloat(agencyFee) || 0) +
                         (parseFloat(otherCharges) || 0);

  const selectedAreaObj = areas.find(a => a.id === areaId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 duration-200">
      {/* Header with Progress Steps */}
      <div className="bg-slate-900 text-white p-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
              Hostel Creation Wizard
            </span>
            <h2 className="text-xl font-black">
              {initialData ? 'Edit Hostel Listing' : 'List New Student Accommodation'}
            </h2>
          </div>

          {/* Completeness Indicator */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-300">Listing Completeness:</span>
            <div className="w-20 bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  completeness.score >= 80 ? 'bg-emerald-400' : completeness.score >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${completeness.score}%` }}
              />
            </div>
            <span className="font-bold text-emerald-300">{completeness.score}%</span>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-8 gap-1 pt-2 border-t border-slate-800 text-[10px]">
          {steps.map(step => (
            <button
              key={step.num}
              type="button"
              onClick={() => setCurrentStep(step.num)}
              className={`py-1.5 rounded-lg font-bold flex flex-col items-center transition-all ${
                currentStep === step.num
                  ? 'bg-emerald-600 text-white shadow'
                  : currentStep > step.num
                  ? 'bg-emerald-950/60 text-emerald-300'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px]">{step.num}</span>
              <span className="hidden sm:inline truncate max-w-full">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body per Step */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="font-bold text-base text-slate-900">Step 1 — Basic Information</h3>
            <p className="text-xs text-slate-500">Provide the title, accommodation type, and general description.</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hostel / Lodge Name *</label>
              <input
                type="text"
                placeholder="e.g. Adeleke Royal Villa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleCheckDuplicate}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accommodation Type *</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="SELF_CONTAIN">Self-Contain</option>
                  <option value="SINGLE_ROOM">Single Room</option>
                  <option value="FLAT">Flat / Apartment</option>
                  <option value="SHARED_BEDSPACE">Shared Bedspace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender Policy</label>
                <select
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value as GenderPreference)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ANY">Co-ed / Any Gender</option>
                  <option value="FEMALE_ONLY">Female Only Lodge</option>
                  <option value="MALE_ONLY">Male Only Lodge</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description & House Rules *</label>
              <textarea
                rows={4}
                placeholder="Describe power supply schedule, borehole water setup, gate lock times, reading space, peaceful atmosphere..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>
        )}

        {/* STEP 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="font-bold text-base text-slate-900">Step 2 — Location in Ogbomoso</h3>
            <p className="text-xs text-slate-500">Specify the LAUTECH area and proximity landmarks.</p>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">LAUTECH Accommodation Area *</label>
                <select
                  value={areaId}
                  onChange={(e) => { setAreaId(e.target.value); handleCheckDuplicate(); }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.approxDistanceMinKm}-{a.approxDistanceMaxKm} km)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Distance to LAUTECH Gate (km) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Street Address *</label>
              <input
                type="text"
                placeholder="e.g. Plot 4, Bovas Station Road, Under G, Ogbomoso"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nearby Landmark / Directions</label>
              <input
                type="text"
                placeholder="e.g. 200m behind Bovas Filling Station"
                value={nearbyLandmark}
                onChange={(e) => setNearbyLandmark(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Rooms & Bedspaces */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Step 3 — Room Configurations & Spaces</h3>
                <p className="text-xs text-slate-500">Define the room units, occupants capacity, and available spaces.</p>
              </div>
              <button
                type="button"
                onClick={() => setRoomsList([...roomsList, {
                  name: `Unit ${roomsList.length + 1}`,
                  type: propertyType,
                  maxOccupants: 1,
                  total: 4,
                  available: 4,
                  isEnsuite: true,
                  isFurnished: false
                }])}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1 hover:bg-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add Room Type
              </button>
            </div>

            <div className="space-y-3">
              {roomsList.map((room, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Room #{idx + 1}</span>
                    {roomsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRoomsList(roomsList.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Room Label</label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].name = e.target.value;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Total Rooms</label>
                      <input
                        type="number"
                        min="1"
                        value={room.total}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].total = parseInt(e.target.value, 10) || 1;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Available Spaces</label>
                      <input
                        type="number"
                        min="0"
                        max={room.total}
                        value={room.available}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].available = parseInt(e.target.value, 10) || 0;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Max Occupants</label>
                      <input
                        type="number"
                        min="1"
                        value={room.maxOccupants}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].maxOccupants = parseInt(e.target.value, 10) || 1;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.isEnsuite}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].isEnsuite = e.target.checked;
                          setRoomsList(updated);
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span>Ensuite Bathroom</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.isFurnished}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].isFurnished = e.target.checked;
                          setRoomsList(updated);
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span>Furnished (Bed / Wardrobe)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Facilities */}
        {currentStep === 4 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-base text-slate-900">Step 4 — Facilities Checklist</h3>
            <p className="text-xs text-slate-500">Select all utilities and amenities physically installed in the lodge.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'electricity', label: 'Constant Electricity (Dedicated Line)', icon: '⚡' },
                { key: 'water', label: 'Borehole / Running Water', icon: '💧' },
                { key: 'security', label: 'Gated Security & Fence', icon: '🛡️' },
                { key: 'wifi', label: 'High-Speed Wi-Fi', icon: '📶' },
                { key: 'kitchen', label: 'Kitchen Space', icon: '🍳' },
                { key: 'inverter', label: 'Solar / Inverter Backup', icon: '☀️' },
                { key: 'generator', label: 'Standby Generator', icon: '🔌' },
                { key: 'parking', label: 'Compound Parking', icon: '🚗' },
                { key: 'cctv', label: 'CCTV Surveillance', icon: '📹' },
                { key: 'waste', label: 'Regular Waste Disposal', icon: '🗑️' },
                { key: 'tiled', label: 'Fully Tiled Flooring', icon: '✨' },
                { key: 'wardrobe', label: 'Fitted Wardrobes', icon: '🚪' }
              ].map(fac => (
                <label
                  key={fac.key}
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                    amenityKeys.includes(fac.key)
                      ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={amenityKeys.includes(fac.key)}
                    onChange={() => {
                      setAmenityKeys(prev => 
                        prev.includes(fac.key) ? prev.filter(k => k !== fac.key) : [...prev, fac.key]
                      );
                    }}
                    className="rounded text-emerald-600"
                  />
                  <span>{fac.icon} {fac.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Pricing Breakdown */}
        {currentStep === 5 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-base text-slate-900">Step 5 — Transparent Pricing Breakdown</h3>
            <p className="text-xs text-slate-500">
              Disclose all mandatory fees upfront so students know the true cost before visiting.
            </p>

            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Annual Rent (₦) *
                  </label>
                  <input
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Service Charge (₦)
                  </label>
                  <input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Agency / Agreement (₦)
                  </label>
                  <input
                    type="number"
                    value={agencyFee}
                    onChange={(e) => setAgencyFee(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Caution Deposit (₦ - Refundable)
                  </label>
                  <input
                    type="number"
                    value={cautionFee}
                    onChange={(e) => setCautionFee(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Other Mandatory Levies (₦)
                  </label>
                  <input
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-300 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Calculated Total Mandatory Cost</span>
                  <span className="text-base font-black text-emerald-800">{formatNaira(totalMandatory)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Media */}
        {currentStep === 6 && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Step 6 — Photos & Video Walkthrough</h3>
                <p className="text-xs text-slate-500">Upload authentic photos and video tours.</p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload Media Files'}
                </button>
              </div>
            </div>

            {/* Video Tour Link */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="url"
                placeholder="Or paste online video tour URL (YouTube, Vimeo, Cloud)..."
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
              <button
                type="button"
                onClick={handleAddVideoTour}
                className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Add Video Tour
              </button>
            </div>

            {/* Uploaded Media Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {mediaList.map(item => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 relative">
                    {item.mediaType === 'VIDEO' ? (
                      <div className="w-full h-full bg-slate-900 text-emerald-400 flex flex-col items-center justify-center">
                        <Video className="w-5 h-5" />
                        <span className="text-[8px] text-white">VIDEO</span>
                      </div>
                    ) : (
                      <img src={item.url} alt="media" className="w-full h-full object-cover" />
                    )}
                    {item.isCover && (
                      <span className="absolute bottom-0.5 left-0.5 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">
                        COVER
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const updated = mediaList.map(m => m.id === item.id ? { ...m, category: e.target.value as MediaCategory } : m);
                          setMediaList(updated);
                        }}
                        className="text-[10px] font-bold bg-white rounded border border-slate-200 px-1.5 py-0.5"
                      >
                        <option value="EXTERIOR">Exterior</option>
                        <option value="BEDROOM">Bedroom</option>
                        <option value="BATHROOM">Bathroom</option>
                        <option value="KITCHEN">Kitchen</option>
                        <option value="COMPOUND">Compound</option>
                        <option value="FACILITY">Facility</option>
                        <option value="VIDEO_WALKTHROUGH">🎥 Video Tour</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setMediaList(mediaList.filter(m => m.id !== item.id))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => {
                        const updated = mediaList.map(m => m.id === item.id ? { ...m, caption: e.target.value } : m);
                        setMediaList(updated);
                      }}
                      placeholder="Add caption..."
                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5"
                    />

                    {item.mediaType === 'IMAGE' && !item.isCover && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = mediaList.map(m => ({ ...m, isCover: m.id === item.id }));
                          setMediaList(updated);
                        }}
                        className="text-[10px] text-emerald-700 font-bold flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" /> Set Cover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Live Student Preview */}
        {currentStep === 7 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="font-bold text-base text-slate-900">Step 7 — Student Preview</h3>
            <p className="text-xs text-slate-500">Here is exactly how your accommodation will appear to LAUTECH students.</p>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-lg space-y-4">
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={mediaList.find(m => m.isCover)?.url || mediaList[0]?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow">
                  ✓ Hostel Ease Verified
                </span>
                <span className="absolute top-3 right-3 bg-slate-900/80 text-white font-bold text-[10px] px-2.5 py-1 rounded-full">
                  {formatDistance(parseFloat(distanceKm))} to Campus
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  📍 {selectedAreaObj?.name || 'Under G'} • {propertyType}
                </span>
                <h4 className="text-lg font-black text-slate-900">{title || 'Your Hostel Name'}</h4>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">{description || 'Hostel description'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Annual Rent</span>
                  <span className="font-bold text-slate-900 text-sm">{formatNaira(parseFloat(rentAmount) || 0)}/yr</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Est. Total First Year</span>
                  <span className="font-black text-emerald-800 text-sm">{formatNaira(totalMandatory)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: Submit & Completeness Review */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="font-bold text-base text-slate-900">Step 8 — Review & Submission</h3>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Listing Completeness Score</span>
                <span className="text-sm font-black text-emerald-700">{completeness.score}%</span>
              </div>

              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${completeness.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>

              {completeness.missing.length > 0 ? (
                <div className="pt-2 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">Recommended additions before submitting:</p>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                    {completeness.missing.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Listing is 100% complete and ready for instant audit!
                </p>
              )}
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">What happens next?</p>
              <p className="text-[11px] leading-relaxed">
                When you click <strong>"Submit for Verification"</strong>, our LAUTECH campus team will audit your pricing and photos. Once approved, your lodge receives the <strong>"Hostel Ease Verified"</strong> badge and appears on student search.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-100 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* Save Draft Button (always available) */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleFinalSubmit(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleFinalSubmit(false)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
