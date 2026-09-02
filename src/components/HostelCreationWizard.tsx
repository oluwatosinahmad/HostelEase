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
  Plus,
  Search,
  X,
  Sparkles,
  SlidersHorizontal,
  Tag,
  Navigation,
  Compass,
  Check
} from 'lucide-react';
import { Area, MediaCategory, PropertyType, GenderPreference } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

export const POPULAR_LAUTECH_FACILITIES = [
  { key: 'toilet', label: 'Private Toilet & Bathroom (Ensuite)', icon: '🚽', category: 'Comfort', keywords: 'toilet bathroom ensuite bath washroom restroom' },
  { key: 'water', label: 'Borehole / Continuous Running Water', icon: '💧', category: 'Utilities', keywords: 'water borehole pipe running tap well tank' },
  { key: 'electricity', label: 'Constant Electricity (Dedicated Line)', icon: '⚡', category: 'Utilities', keywords: 'electricity power light nepa ibedc current' },
  { key: 'solar', label: 'Solar / Inverter 24/7 Power Backup', icon: '☀️', category: 'Utilities', keywords: 'solar inverter battery backup panel green' },
  { key: 'generator', label: 'Standby Generator Backup', icon: '🔌', category: 'Utilities', keywords: 'generator gen plant fuel soundproof' },
  { key: 'security', label: 'Gated Compound & Security Guard', icon: '🛡️', category: 'Security', keywords: 'security guard gate watchman gateman fence fenced' },
  { key: 'wifi', label: 'High-Speed Student Wi-Fi Internet', icon: '📶', category: 'Internet', keywords: 'wifi internet connection hotspot broadband network' },
  { key: 'wardrobe', label: 'Fitted Wardrobe & Shelves', icon: '🚪', category: 'Furniture', keywords: 'wardrobe closet cupboard cabinet hanger shelf' },
  { key: 'kitchen', label: 'Private / Fitted Kitchen Space', icon: '🍳', category: 'Comfort', keywords: 'kitchen cooking cabinet sink gas stove' },
  { key: 'tiled', label: 'Fully Tiled Flooring & Modern Finish', icon: '✨', category: 'Comfort', keywords: 'tiles tiled floor ceramic granite clean marble' },
  { key: 'cctv', label: 'CCTV 24/7 Surveillance Cameras', icon: '📹', category: 'Security', keywords: 'cctv camera surveillance recording security monitor' },
  { key: 'parking', label: 'Secure Compound Parking (Cars / Bikes)', icon: '🚗', category: 'Convenience', keywords: 'parking car bike motorcycle vehicle garage compound' },
  { key: 'fan', label: 'Installed Ceiling Fan', icon: '🌀', category: 'Comfort', keywords: 'fan ceiling wall ventilation cooling' },
  { key: 'ac', label: 'Air Conditioner / AC Port Installed', icon: '❄️', category: 'Comfort', keywords: 'ac air conditioner cooling split unit' },
  { key: 'waste', label: 'Regular Waste Disposal & Sanitation', icon: '🗑️', category: 'Convenience', keywords: 'waste trash disposal refuse dustbin sanitation' },
  { key: 'balcony', label: 'Private Balcony / Veranda Space', icon: '🌅', category: 'Comfort', keywords: 'balcony veranda porch terrace view' },
  { key: 'prepaid_meter', label: 'Personal Prepaid Electric Meter', icon: '📟', category: 'Utilities', keywords: 'prepaid meter electric token recharge card unit' },
  { key: 'water_heater', label: 'Water Heater in Bathroom', icon: '🚿', category: 'Comfort', keywords: 'water heater hot shower heater bathroom bath' },
  { key: 'reading_desk', label: 'Study Table & Reading Chair', icon: '🪑', category: 'Furniture', keywords: 'reading table study desk chair student furniture' },
  { key: 'laundry', label: 'Dedicated Laundry Area / Washing Basin', icon: '🧺', category: 'Convenience', keywords: 'laundry washing machine basin clothes lines drying' },
  { key: 'fence', label: 'High Perimeter Fence with Razor Wire', icon: '🧱', category: 'Security', keywords: 'fence perimeter wall wire security barrier' },
  { key: 'dstv', label: 'DSTV / Cable TV Connection', icon: '📺', category: 'Convenience', keywords: 'dstv gotv tv television cable decoder dish' }
];

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

  // Step 2: Location (with custom location addition)
  const [areaId, setAreaId] = useState(init?.areaId || init?.area?.id || areas[0]?.id || 'area-under-g');
  const [isCustomArea, setIsCustomArea] = useState<boolean>(Boolean(init?.isCustomArea || (init?.areaId === 'custom')));
  const [customLocationName, setCustomLocationName] = useState<string>(init?.customLocationName || '');
  const [address, setAddress] = useState(init?.address || '');
  const [nearbyLandmark, setNearbyLandmark] = useState(init?.nearbyLandmark || '');
  const [distanceKm, setDistanceKm] = useState(init?.distanceFromCampusKm?.toString() || '0.8');
  const [selectedGate, setSelectedGate] = useState<string>(init?.selectedGate || 'Under-G Gate');
  const [walkingMinutes, setWalkingMinutes] = useState<string>(init?.walkingMinutes?.toString() || '4');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleQuickDistanceSelect = (km: number, mins: number, gateName?: string) => {
    setDistanceKm(km.toString());
    setWalkingMinutes(mins.toString());
    const gate = gateName || selectedGate;
    const distanceMeters = Math.round(km * 1000);
    const landmarkText = `${distanceMeters < 1000 ? `${distanceMeters}m` : `${km}km`} from ${gate}, ${mins} mins walk`;
    setNearbyLandmark(landmarkText);
  };

  // Step 3: Rooms
  const [roomsList, setRoomsList] = useState<RoomConfig[]>(initialData?.roomsList || [
    { name: 'Standard Self-Contain', type: 'SELF_CONTAIN', maxOccupants: 1, total: 10, available: 10, isEnsuite: true, isFurnished: false }
  ]);

  // Step 4: Facilities with live search & autocomplete
  const [amenityKeys, setAmenityKeys] = useState<string[]>(initialData?.amenityKeys || [
    'toilet', 'electricity', 'water', 'security', 'kitchen'
  ]);
  const [facilitySearch, setFacilitySearch] = useState<string>('');
  const [facilityCategoryFilter, setFacilityCategoryFilter] = useState<string>('ALL');

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
    if (title.length > 3 && areaId && areaId !== 'custom') {
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
    if (address.trim().length > 5 || customLocationName.trim().length > 3) score += 10; else missing.push('Street address');
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

  // Media Handlers (with bulletproof local FileReader fallback)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      let uploadedItems: Array<{ url: string; filename: string; originalName: string; mediaType: 'IMAGE' | 'VIDEO' }> = [];

      try {
        const res = await api.upload.multiple(fileArray);
        if (res && Array.isArray(res.files) && res.files.length > 0) {
          uploadedItems = res.files.map(f => ({
            url: f.url,
            filename: f.filename,
            originalName: f.originalName || f.filename,
            mediaType: f.mediaType || (f.mimeType?.startsWith('video') ? 'VIDEO' : 'IMAGE')
          }));
        }
      } catch (err) {
        console.warn('API upload fallback to local FileReader:', err);
      }

      // Safe local FileReader fallback if API did not return files
      if (uploadedItems.length === 0) {
        uploadedItems = await Promise.all(
          fileArray.map(async (file) => {
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target?.result as string || URL.createObjectURL(file));
              reader.onerror = () => resolve(URL.createObjectURL(file));
              reader.readAsDataURL(file);
            });

            return {
              url: dataUrl,
              filename: file.name,
              originalName: file.name,
              mediaType: (file.type.startsWith('video') ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO'
            };
          })
        );
      }

      const newItems: MediaUploadItem[] = (uploadedItems || []).map((file, idx) => {
        const isFirst = mediaList.length === 0 && idx === 0;
        let defaultCategory: MediaCategory = 'BEDROOM';
        if (file.mediaType === 'VIDEO') defaultCategory = 'VIDEO_WALKTHROUGH';
        else if (isFirst) defaultCategory = 'EXTERIOR';

        return {
          id: `media-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          url: file.url,
          filename: file.filename,
          originalName: file.originalName,
          mediaType: file.mediaType,
          category: defaultCategory,
          caption: file.originalName.replace(/\.[^/.]+$/, ''),
          isCover: isFirst
        };
      });

      if (newItems.length > 0) {
        setMediaList(prev => [...prev, ...newItems]);
        onShowToast(`Uploaded ${newItems.length} media item(s) successfully!`, 'success');
      }
    } catch (err: any) {
      console.error('Upload handler error:', err);
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
    onShowToast('Video walkthrough tour added! Pending admin audit.', 'success');
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const videoDataUrl = reader.result as string;
        const newVideoItem: MediaUploadItem = {
          id: `vid-upload-${Date.now()}`,
          url: videoDataUrl,
          filename: file.name,
          originalName: file.name,
          mediaType: 'VIDEO',
          category: 'VIDEO_WALKTHROUGH',
          caption: '4K Room & Compound Walkthrough (Pending Admin Audit)',
          isCover: false
        };
        setMediaList(prev => [...prev.filter(m => m.mediaType !== 'VIDEO'), newVideoItem]);
        onShowToast('4K video walkthrough uploaded! Submitted for admin verification.', 'success');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to process video file', 'error');
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleToggleAmenity = (key: string) => {
    setAmenityKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddCustomFacility = (customName: string) => {
    const cleanKey = customName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanKey) return;
    if (!amenityKeys.includes(cleanKey)) {
      setAmenityKeys(prev => [...prev, cleanKey]);
      onShowToast(`Added "${customName.trim()}" to facilities!`, 'success');
    }
    setFacilitySearch('');
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
      const finalAddress = isCustomArea && customLocationName.trim()
        ? `${customLocationName.trim()}, ${address.trim()}`
        : address.trim();

      const payload = {
        title: title.trim(),
        areaId: isCustomArea ? (areas[0]?.id || 'area-under-g') : areaId,
        customLocationName: isCustomArea ? customLocationName.trim() : undefined,
        description: description.trim(),
        address: finalAddress,
        nearbyLandmark: nearbyLandmark.trim() || undefined,
        distanceFromCampusKm: parseFloat(distanceKm) || 1.0,
        selectedGate,
        walkingMinutes: parseInt(walkingMinutes, 10) || 5,
        has4KVideo: mediaList.some(m => m.mediaType === 'VIDEO'),
        videoTourUrl: mediaList.find(m => m.mediaType === 'VIDEO')?.url,
        videoVerificationStatus: editingProperty?.videoVerificationStatus || (mediaList.some(m => m.mediaType === 'VIDEO') ? 'PENDING_AUDIT' : 'NONE'),
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
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in-50 duration-200 text-slate-900 dark:text-slate-100">
      {/* Header with Progress Steps */}
      <div className="bg-slate-950 text-white p-6 pb-4 border-b border-slate-800">
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
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 1 — Basic Information</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Provide the title, accommodation type, and general description.</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Hostel / Lodge Name *</label>
              <input
                type="text"
                placeholder="e.g. Adeleke Royal Villa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleCheckDuplicate}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Accommodation Type *</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="SELF_CONTAIN">Self-Contain</option>
                  <option value="SINGLE_ROOM">Single Room</option>
                  <option value="FLAT">Flat / Apartment</option>
                  <option value="SHARED_BEDSPACE">Shared Bedspace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Gender Policy</label>
                <select
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value as GenderPreference)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="ANY">Co-ed / Any Gender</option>
                  <option value="FEMALE_ONLY">Female Only Lodge</option>
                  <option value="MALE_ONLY">Male Only Lodge</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Description & House Rules *</label>
              <textarea
                rows={4}
                placeholder="Describe power supply schedule, borehole water setup, gate lock times, reading space, peaceful atmosphere..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>
        )}

        {/* STEP 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Step 2 — Location in Ogbomoso
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Specify your exact LAUTECH hostel location. Choose a standard campus zone or type your custom neighborhood.
              </p>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Clear Mode Switcher */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 gap-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsCustomArea(false)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !isCustomArea
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                Choose Standard LAUTECH Area
              </button>
              <button
                type="button"
                onClick={() => setIsCustomArea(true)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isCustomArea
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                + Enter Custom Location / Neighborhood
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              {!isCustomArea ? (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Select Nearest LAUTECH Area *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <select
                        value={areaId}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setIsCustomArea(true);
                          } else {
                            setAreaId(e.target.value);
                            handleCheckDuplicate();
                          }
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.approxDistanceMinKm}-{a.approxDistanceMaxKm} km from campus)</option>
                        ))}
                        <option value="custom">➕ + Add Custom Location / New Area...</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="15"
                        placeholder="Distance to Gate (km)"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 sm:p-5 rounded-2xl border border-emerald-300 dark:border-emerald-700/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Type Your Custom Location / Specific Neighborhood Name *
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomArea(false)}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline"
                    >
                      Use Standard Areas
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Behind Bovas Station (Under G), Adeshina Area (Adenike), Sekona Junction, Olopomeji..."
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Quick suggestions:</span>
                    {['Behind Bovas (Under G)', 'Adeshina Extension', 'Sekona Junction', 'Olopomeji Area', 'Alata Junction', 'General Hospital Corridor', 'Papa Gate'].map(sugg => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setCustomLocationName(sugg)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-xs"
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Closest Standard Area</label>
                      <select
                        value={areaId}
                        onChange={(e) => setAreaId(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white cursor-pointer"
                      >
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Distance to LAUTECH Gate (km) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="15"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Landlord Quick Distance Component */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-emerald-600" />
                  Quick Distance to LAUTECH Campus Gate (Set by You) *
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  {parseFloat(distanceKm) < 1 ? `${Math.round(parseFloat(distanceKm) * 1000)}m` : `${distanceKm} km`} • {walkingMinutes} mins walk
                </span>
              </div>

              {/* 1-Tap Quick Distance Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">1-Tap Distance Presets:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: '150m (Gate-to-Gate)', km: 0.15, mins: 2 },
                    { label: '300m (3 mins walk)', km: 0.3, mins: 3 },
                    { label: '500m (5 mins walk)', km: 0.5, mins: 5 },
                    { label: '800m (8 mins walk)', km: 0.8, mins: 8 },
                    { label: '1.2 km (12 mins walk)', km: 1.2, mins: 12 },
                    { label: '2.0 km (Campus Shuttle)', km: 2.0, mins: 18 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleQuickDistanceSelect(p.km, p.mins)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                        Math.abs(parseFloat(distanceKm) - p.km) < 0.05
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className={`text-[10px] ${Math.abs(parseFloat(distanceKm) - p.km) < 0.05 ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {Math.round(p.km * 1000)}m to campus
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Distance Customizer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Campus Gate
                  </label>
                  <select
                    value={selectedGate}
                    onChange={(e) => {
                      setSelectedGate(e.target.value);
                      handleQuickDistanceSelect(parseFloat(distanceKm) || 0.5, parseInt(walkingMinutes, 10) || 5, e.target.value);
                    }}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Under-G Gate">Under-G Gate (South)</option>
                    <option value="Adenike Gate">Adenike Gate (East)</option>
                    <option value="Main Campus Gate">Main Campus Gate (North)</option>
                    <option value="Stadium Road Gate">Stadium Road Gate</option>
                    <option value="Aroje Gate">Aroje / General Gate</option>
                    <option value="Old Poly Road Gate">Old Poly Road Gate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Distance (in Kilometers)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="15"
                    value={distanceKm}
                    onChange={(e) => {
                      setDistanceKm(e.target.value);
                      const km = parseFloat(e.target.value) || 0.5;
                      const estMins = Math.max(1, Math.round(km * 10));
                      setWalkingMinutes(estMins.toString());
                    }}
                    placeholder="e.g. 0.3 for 300m"
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Walking Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={walkingMinutes}
                    onChange={(e) => setWalkingMinutes(e.target.value)}
                    placeholder="e.g. 3 mins"
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Detailed Street Address *</label>
              <input
                type="text"
                placeholder="e.g. Plot 4, Adebayo Close, Off Bovas Filling Station Road, Under G, Ogbomoso"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Proximity Landmarks & Directions</label>
              <input
                type="text"
                placeholder="e.g. 150m behind Bovas Station, directly opposite Green Mosque gate"
                value={nearbyLandmark}
                onChange={(e) => setNearbyLandmark(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Rooms & Bedspaces */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 3 — Room Configurations & Spaces</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Define the room units, occupants capacity, and available spaces.</p>
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
                className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Room Type
              </button>
            </div>

            <div className="space-y-3">
              {roomsList.map((room, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">Room #{idx + 1}</span>
                    {roomsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRoomsList(roomsList.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Room Label</label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].name = e.target.value;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Total Rooms</label>
                      <input
                        type="number"
                        min="1"
                        value={room.total}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].total = parseInt(e.target.value, 10) || 1;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Available Spaces</label>
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
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Max Occupants</label>
                      <input
                        type="number"
                        min="1"
                        value={room.maxOccupants}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].maxOccupants = parseInt(e.target.value, 10) || 1;
                          setRoomsList(updated);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={room.isEnsuite}
                        onChange={(e) => {
                          const updated = [...roomsList];
                          updated[idx].isEnsuite = e.target.checked;
                          setRoomsList(updated);
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
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
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Furnished (Bed / Wardrobe)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Facilities with Autocomplete */}
        {currentStep === 4 && (
          <div className="space-y-5 max-w-3xl">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                Step 4 — Facilities & Amenities
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Search or select all utilities, sanitary facilities, power setups, and comfort amenities.
              </p>
            </div>

            {/* Smart Autocomplete Search Bar */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="🔍 Type facility name (e.g. toilet, borehole, solar, generator, wifi, tiles, fan, wardrobe)..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-2xl pl-9 pr-10 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-sm"
                />
                {facilitySearch && (
                  <button
                    type="button"
                    onClick={() => setFacilitySearch('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Live Autocomplete Suggestions Dropdown */}
              {facilitySearch.trim().length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 max-h-64 overflow-y-auto animate-in fade-in-50 duration-150 space-y-1">
                  {POPULAR_LAUTECH_FACILITIES.filter(f => {
                    const q = facilitySearch.toLowerCase();
                    return f.label.toLowerCase().includes(q) || 
                           f.key.toLowerCase().includes(q) || 
                           f.category.toLowerCase().includes(q) ||
                           f.keywords.toLowerCase().includes(q);
                  }).map(fac => {
                    const isSelected = amenityKeys.includes(fac.key);
                    return (
                      <button
                        key={fac.key}
                        type="button"
                        onClick={() => {
                          handleToggleAmenity(fac.key);
                          setFacilitySearch('');
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left transition-colors ${
                          isSelected ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-200 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{fac.icon}</span>
                          <div>
                            <span className="font-semibold block">{fac.label}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{fac.category}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">+ Add</span>
                        )}
                      </button>
                    );
                  })}

                  {/* Add Custom Facility Button */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-700 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAddCustomFacility(facilitySearch)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add "{facilitySearch.trim()}" as Custom Facility
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Active Facilities Badges */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Selected Facilities ({amenityKeys.length})
                </span>
                {amenityKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmenityKeys([])}
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {amenityKeys.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                  No facilities selected yet. Search above or click the badges below to add amenities.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {amenityKeys.map(key => {
                    const preset = POPULAR_LAUTECH_FACILITIES.find(f => f.key === key);
                    const label = preset ? preset.label : key.replace(/_/g, ' ').toUpperCase();
                    const icon = preset ? preset.icon : '✨';
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm animate-in zoom-in-95 duration-150"
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAmenity(key)}
                          className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 hover:bg-emerald-300 dark:hover:bg-emerald-700 text-emerald-900 dark:text-emerald-100 flex items-center justify-center ml-0.5"
                          title="Remove facility"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Categorized Quick-Select Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Browse Popular Facilities</span>
                <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1">
                  {['ALL', 'Utilities', 'Comfort', 'Security', 'Convenience', 'Furniture', 'Internet'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFacilityCategoryFilter(cat)}
                      className={`px-2.5 py-0.5 rounded-lg font-semibold transition-all ${
                        facilityCategoryFilter === cat 
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {POPULAR_LAUTECH_FACILITIES.filter(f => 
                  facilityCategoryFilter === 'ALL' || f.category === facilityCategoryFilter
                ).map(fac => {
                  const isChecked = amenityKeys.includes(fac.key);
                  return (
                    <label
                      key={fac.key}
                      className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 font-bold text-emerald-950 dark:text-emerald-200 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAmenity(fac.key)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-base flex-shrink-0">{fac.icon}</span>
                      <span className="leading-tight">{fac.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Pricing Breakdown */}
        {currentStep === 5 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 5 — Transparent Pricing Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disclose all mandatory fees upfront so students know the true cost before visiting.
            </p>

            <div className="p-5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Annual Rent (₦) *
                  </label>
                  <input
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Service Charge (₦)
                  </label>
                  <input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tenancy Agreement & Legal Fee (₦)
                  </label>
                  <input
                    type="number"
                    value={agencyFee}
                    onChange={(e) => setAgencyFee(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Caution Deposit (₦ - Refundable)
                  </label>
                  <input
                    type="number"
                    value={cautionFee}
                    onChange={(e) => setCautionFee(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Other Mandatory Levies (₦)
                  </label>
                  <input
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Calculated Total Mandatory Cost</span>
                  <span className="text-base font-black text-emerald-800 dark:text-emerald-400">{formatNaira(totalMandatory)}</span>
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
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 6 — Photos & Video Walkthrough</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Upload authentic photos and video tours.</p>
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

            {/* 🎥 Dedicated 4K Verified Video Walkthrough Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl border border-emerald-500/30 text-white space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wide flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Virtual Campus Inspection
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold">Admin Verified Audit Standard</span>
                  </div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-emerald-400" />
                    4K Video Walkthrough Tour (For Student Confidence)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Upload an uncut 4K video showing the lodge compound, front gate, room interior, bathroom, and prepaid meter. Each video is reviewed and verified by the Hostel Ease admin team before going live on the homepage Virtual Campus Inspection.
                  </p>
                </div>
              </div>

              {/* Video Upload Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoUpload}
                  accept="video/mp4,video/webm,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading Video...' : 'Upload 4K Video from Device / Camera'}</span>
                </button>

                <div className="flex-1 flex gap-2">
                  <input
                    type="url"
                    placeholder="Or paste 4K video link (YouTube, Drive, Cloud MP4)..."
                    value={customVideoUrl}
                    onChange={(e) => setCustomVideoUrl(e.target.value)}
                    className="flex-1 text-xs bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddVideoTour}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Active Video Tour Status Preview */}
              {mediaList.some(m => m.mediaType === 'VIDEO') && (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      4K Video Attached & Ready for Admin Audit
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      ⏳ Pending Admin Verification
                    </span>
                  </div>
                  <div className="aspect-video max-w-sm rounded-lg overflow-hidden bg-black mx-auto">
                    <video
                      src={mediaList.find(m => m.mediaType === 'VIDEO')?.url}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Uploaded Media Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {mediaList.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 relative">
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
                        className="text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 cursor-pointer"
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
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
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
                      className="w-full text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />

                    {item.mediaType === 'IMAGE' && !item.isCover && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = mediaList.map(m => ({ ...m, isCover: m.id === item.id }));
                          setMediaList(updated);
                        }}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1"
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
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 7 — Student Preview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Here is exactly how your accommodation will appear to LAUTECH students.</p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg space-y-4">
              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900">
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
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  📍 {isCustomArea && customLocationName ? customLocationName : (selectedAreaObj?.name || 'Under G')} • {propertyType.replace('_', ' ')}
                </span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">{title || 'Your Hostel Name'}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">{description || 'Hostel description'}</p>
                {address && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">🏠 {address}</p>}

                {/* Facilities Preview Chips */}
                {amenityKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {amenityKeys.slice(0, 8).map(key => {
                      const preset = POPULAR_LAUTECH_FACILITIES.find(f => f.key === key);
                      return (
                        <span key={key} className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                          <span>{preset?.icon || '✓'}</span>
                          <span>{preset?.label || key}</span>
                        </span>
                      );
                    })}
                    {amenityKeys.length > 8 && (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                        +{amenityKeys.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Annual Rent</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{formatNaira(parseFloat(rentAmount) || 0)}/yr</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Est. Total First Year</span>
                  <span className="font-black text-emerald-800 dark:text-emerald-400 text-sm">{formatNaira(totalMandatory)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: Submit & Completeness Review */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Step 8 — Review & Submission</h3>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Listing Completeness Score</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{completeness.score}%</span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${completeness.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>

              {completeness.missing.length > 0 ? (
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-200">Recommended additions before submitting:</p>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    {completeness.missing.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Listing is 100% complete and ready for instant audit!
                </p>
              )}
            </div>

            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-bold">What happens next?</p>
              <p className="text-[11px] leading-relaxed">
                When you click <strong>"Submit for Verification"</strong>, our LAUTECH campus team will audit your pricing and photos. Once approved, your lodge receives the <strong>"Hostel Ease Verified"</strong> badge and appears on student search.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-slate-50 dark:bg-slate-900 p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {/* Save Draft Button (always available) */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleFinalSubmit(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleFinalSubmit(false)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
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
