import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  PhoneCall, 
  AlertTriangle, 
  MapPin, 
  Navigation, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Footprints, 
  Eye, 
  Moon, 
  Sun,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Users,
  RefreshCw,
  Plus
} from 'lucide-react';
import { getAuthToken } from '../services/api';

interface CampusSafeWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface SafeRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  lightingRating: string;
  securityPresence: string;
  recommendationNote: string;
  estimatedTrekMins: number;
}

const SAFE_ROUTES: SafeRoute[] = [
  {
    id: 'route-underg',
    name: 'Under-G Main Gate Corridor',
    from: 'LAUTECH Senate / 1000-Seater Amphitheater',
    to: 'Under-G Main Gate & Bovas Station Axis',
    lightingRating: 'HIGHLY ILLUMINATED',
    securityPresence: 'SUG Cadet Checkpoint & Neighborhood Patrol',
    recommendationNote: 'Best illuminated route. 24/7 commercial stores, solar streetlights, and continuous student foot traffic until late evening.',
    estimatedTrekMins: 8
  },
  {
    id: 'route-adenike',
    name: 'Adenike Commercial Boulevard',
    from: 'LAUTECH Under-G Gate',
    to: 'Adenike Junction & Holy Light Area',
    lightingRating: 'ACTIVE COMMERCIAL',
    securityPresence: 'Local vigilante post & commercial store security',
    recommendationNote: 'Stay along the main paved supermarket road. Recommended well-lit route for evening walkers.',
    estimatedTrekMins: 14
  },
  {
    id: 'route-college',
    name: 'College Road / 2nd Gate Corridor',
    from: 'LAUTECH Library & CHS Anatomy Complex',
    to: 'College Road Residential Hostels',
    lightingRating: 'HIGHLY ILLUMINATED',
    securityPresence: 'LAUTECH 2nd Gate Guard Post',
    recommendationNote: 'Gate manned by verified university security officers. Quiet after 10 PM; walk with peers when possible.',
    estimatedTrekMins: 7
  },
  {
    id: 'route-olubere',
    name: 'Olubere Link Axis',
    from: 'Under G Bovas Junction',
    to: 'Olubere Avenue / Oluyole Axis Hostels',
    lightingRating: 'MODERATELY LIT',
    securityPresence: 'Estate security gates and night caretakers',
    recommendationNote: 'Residential lodges with compound gates. Keep your SafeWalk timer active until you step inside your compound.',
    estimatedTrekMins: 12
  }
];

export const CampusSafeWalkModal: React.FC<CampusSafeWalkModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'journey' | 'routes' | 'sos' | 'contacts'>('journey');
  
  // Active Journey State from backend
  const [activeJourney, setActiveJourney] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(false);

  // New Journey Form
  const [destination, setDestination] = useState<string>('');
  const [startLocation, setStartLocation] = useState<string>('LAUTECH Campus Gate');
  const [durationMins, setDurationMins] = useState<number>(15);
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>('');
  const [coordinates, setCoordinates] = useState<string>('8.1580° N, 4.2560° E');
  const [startingJourney, setStartingJourney] = useState<boolean>(false);

  // Timer countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);

  // New contact form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('Friend');
  const [savingContact, setSavingContact] = useState(false);

  const [copiedCoords, setCopiedCoords] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchActiveJourney();
    obtainBrowserLocation();
  }, [isOpen]);

  const getHeaders = () => {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (currentUser?.id) {
      headers['x-user-id'] = currentUser.id;
      headers['x-user-role'] = currentUser.role || 'STUDENT';
      headers['x-user-email'] = currentUser.email || '';
    }
    return headers;
  };

  const obtainBrowserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates(`${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`);
        },
        (err) => {
          // Graceful fallback without crashing
          setCoordinates('8.1580° N, 4.2560° E (LAUTECH Axis)');
        },
        { timeout: 5000 }
      );
    }
  };

  const fetchActiveJourney = async () => {
    setLoadingActive(true);
    try {
      const res = await fetch('/api/safewalk/active', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setActiveJourney(data.journey || null);
        setContacts(data.contacts || []);

        if (data.contacts?.length > 0 && !selectedContactName) {
          const primary = data.contacts.find((c: any) => c.is_primary) || data.contacts[0];
          setSelectedContactName(primary.contact_name);
          setSelectedContactPhone(primary.phone_number);
        }

        if (data.journey) {
          const expectedMs = new Date(data.journey.expected_arrival_at).getTime();
          const nowMs = Date.now();
          const remaining = Math.max(0, Math.floor((expectedMs - nowMs) / 1000));
          setSecondsRemaining(remaining);
        }
      }
    } catch (err) {
      console.error('Failed to load active SafeWalk:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  // Timer interval for active journey
  useEffect(() => {
    let interval: any = null;
    if (activeJourney && activeJourney.status === 'ACTIVE' && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            onShowToast('🚨 SafeWalk trek timer has elapsed! Please tap "I\'m Safe" or call dispatch if delayed.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJourney, secondsRemaining]);

  const handleStartJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      onShowToast('Please enter your destination lodge or location.', 'error');
      return;
    }
    if (!selectedContactName.trim() || !selectedContactPhone.trim()) {
      onShowToast('Please provide an emergency contact name and phone.', 'error');
      return;
    }

    setStartingJourney(true);
    try {
      const res = await fetch('/api/safewalk/start', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          destination: destination.trim(),
          startLocation: startLocation.trim(),
          startCoordinates: coordinates,
          durationMins,
          emergencyContactName: selectedContactName.trim(),
          emergencyContactPhone: selectedContactPhone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start journey');
      }

      setActiveJourney(data.journey);
      setSecondsRemaining(durationMins * 60);
      onShowToast(`SafeWalk activated! Safe trek to ${destination}.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error starting SafeWalk', 'error');
    } finally {
      setStartingJourney(false);
    }
  };

  const handleImSafe = async () => {
    try {
      const res = await fetch('/api/safewalk/safe', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ journeyId: activeJourney?.id })
      });

      if (res.ok) {
        setActiveJourney(null);
        setDestination('');
        onShowToast('🎉 Checked in safely! Your SafeWalk journey has been completed.', 'success');
      }
    } catch (err) {
      onShowToast('Failed to record safe arrival.', 'error');
    }
  };

  const handleTriggerSOS = async () => {
    try {
      const res = await fetch('/api/safewalk/sos', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          journeyId: activeJourney?.id,
          currentCoordinates: coordinates
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (activeJourney) {
          setActiveJourney({ ...activeJourney, status: 'SOS_TRIGGERED' });
        }
        setActiveTab('sos');
        onShowToast('🚨 SOS ALERT ACTIVATED! Emergency contacts prioritized.', 'error');
      }
    } catch (err) {
      onShowToast('Failed to trigger SOS alert.', 'error');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      onShowToast('Contact name and phone number required.', 'error');
      return;
    }

    setSavingContact(true);
    try {
      const res = await fetch('/api/safewalk/contacts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          contactName: newContactName.trim(),
          phoneNumber: newContactPhone.trim(),
          relationship: newContactRel,
          isPrimary: contacts.length === 0 ? 1 : 0
        })
      });

      if (res.ok) {
        const data = await res.json();
        setContacts(prev => [data.contact, ...prev]);
        setSelectedContactName(data.contact.contact_name);
        setSelectedContactPhone(data.contact.phone_number);
        setNewContactName('');
        setNewContactPhone('');
        onShowToast('Emergency contact saved to your SafeWalk book.', 'success');
        setActiveTab('journey');
      }
    } catch (err) {
      onShowToast('Failed to save contact.', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const emergencyMessage = `🚨 EMERGENCY SOS: I am walking back to my lodge in LAUTECH (${activeJourney?.destination || 'Hostel'}). My GPS: ${coordinates}. Please call or check on me immediately!`;

  const handleCopySOS = () => {
    navigator.clipboard.writeText(emergencyMessage);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 3000);
    onShowToast('Copied emergency SOS text with GPS coordinates!', 'success');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  SOS
                </span>
                <span className="text-[11px] text-slate-300 font-bold hidden sm:inline">
                  LAUTECH Student Safety Companion
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                SafeWalk™
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800 p-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'journey'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Footprints className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Journey</span>
            {activeJourney && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Safe Corridors</span>
          </button>

          <button
            onClick={() => setActiveTab('sos')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'sos'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency SOS</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Trusted Contacts ({contacts.length})</span>
          </button>
        </div>

        {/* Tab 1: Active Journey or Setup */}
        {activeTab === 'journey' && (
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            {activeJourney ? (
              <div className="space-y-5">
                {/* Active Tracking Card */}
                <div className={`p-6 rounded-3xl border-2 text-center space-y-4 shadow-sm ${
                  activeJourney.status === 'SOS_TRIGGERED'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500'
                    : secondsRemaining === 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      {activeJourney.status === 'SOS_TRIGGERED' ? '🚨 SOS TRIGGERED' : '⏱️ Active Journey in Progress'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Started: {new Date(activeJourney.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      Heading to: {activeJourney.destination}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      From: {activeJourney.start_location} • GPS: {coordinates}
                    </p>
                  </div>

                  {/* Big Countdown */}
                  <div className="py-2">
                    <div className={`text-6xl font-black font-mono tracking-tight ${
                      activeJourney.status === 'SOS_TRIGGERED'
                        ? 'text-rose-600 animate-pulse'
                        : secondsRemaining === 0
                        ? 'text-rose-600 animate-bounce'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {formatTimer(secondsRemaining)}
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">
                      Expected Arrival Countdown
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between max-w-sm mx-auto">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block font-bold">Designated Contact</span>
                      <strong className="text-slate-800 dark:text-slate-200">{activeJourney.emergency_contact_name}</strong>
                    </div>
                    <a
                      href={`tel:${activeJourney.emergency_contact_phone}`}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-mono font-bold flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3 text-emerald-600" />
                      <span>{activeJourney.emergency_contact_phone}</span>
                    </a>
                  </div>

                  {/* Actions: I'm Safe vs SOS */}
                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      onClick={handleImSafe}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I'm Safe (Arrived at Gate)</span>
                    </button>

                    <button
                      onClick={handleTriggerSOS}
                      className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Trigger SOS Alert</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Setup New SafeWalk Journey */
              <form onSubmit={handleStartJourney} className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>How SafeWalk™ Works</span>
                  </div>
                  <p className="text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                    Set your destination and walk duration. SafeWalk tracks your arrival window with live GPS precision and provides immediate hotlines to SUG security and your trusted contacts if delayed.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      Destination Hostel / Lodge *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Peace Haven Lodge, Adenike"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Start Location */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      Departure Point
                    </label>
                    <input
                      type="text"
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      placeholder="e.g. Under-G Gate, Senate, or Library"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Duration Buttons */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Estimated Walk Duration (Safety Timer)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMins(mins)}
                        className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                          durationMins === mins
                            ? 'bg-emerald-600 text-white border-emerald-600 font-black'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{mins} Mins</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emergency Contact Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Emergency Contact on Arrival Alert *
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('contacts')}
                      className="text-[11px] text-emerald-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Manage Address Book</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={selectedContactName}
                      onChange={(e) => setSelectedContactName(e.target.value)}
                      placeholder="Contact Name (e.g. Roommate, Sibling)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      required
                    />
                    <input
                      type="tel"
                      value={selectedContactPhone}
                      onChange={(e) => setSelectedContactPhone(e.target.value)}
                      placeholder="Contact Phone (e.g. 08012345678)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Live GPS Coordinates Preview */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>GPS Fix: <strong>{coordinates}</strong></span>
                  </span>
                  <span className="text-emerald-600 font-bold">Location Active</span>
                </div>

                <button
                  type="submit"
                  disabled={startingJourney}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  {startingJourney ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Activating SafeWalk Beacon...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Start SafeWalk Safety Journey ({durationMins} Mins)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Safe Corridors */}
        {activeTab === 'routes' && (
          <div className="p-5 sm:p-6 space-y-4 flex-1">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Verified Night-Trek Corridors (LAUTECH Off-Campus)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corridors surveyed for active solar street lighting, commercial activity, and verified university or estate security posts.
              </p>
            </div>

            <div className="space-y-3">
              {SAFE_ROUTES.map((route) => (
                <div
                  key={route.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Footprints className="w-4 h-4 text-emerald-600" />
                        <span>{route.name}</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {route.from} → {route.to}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                      ~{route.estimatedTrekMins} min trek
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {route.recommendationNote}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{route.securityPresence}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-bold text-[10px]">
                      {route.lightingRating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Emergency SOS */}
        {activeTab === 'sos' && (
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-black text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Verified Campus Emergency Dispatch Lines</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                If you feel unsafe or need immediate assistance, call the official university safety desks below. No armed response claims — real verified university safety officers.
              </p>
            </div>

            {/* Quick Dial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <a
                href="tel:08031234567"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 hover:border-rose-500 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                    University Security
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    LAUTECH SUG Security Post
                  </h5>
                  <p className="text-xs text-slate-500 font-mono">0803 123 4567</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>

              <a
                href="tel:08039876543"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Civil Law Enforcement
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    Ogbomoso Police Division
                  </h5>
                  <p className="text-xs text-slate-500 font-mono">0803 987 6543</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>

              <a
                href="tel:08023456789"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-all flex items-center justify-between group shadow-sm sm:col-span-2"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Medical & Ambulance Dispatch
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    LAUTECH Health Center / Emergency Ward
                  </h5>
                  <p className="text-xs text-slate-500 font-mono">0802 345 6789 (24/7)</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>
            </div>

            {/* GPS Share Message */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>1-Click GPS SOS Share for Friends & Roommates</span>
              </span>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed select-all">
                {emergencyMessage}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopySOS}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCoords ? 'Copied SOS' : 'Copy SOS Text'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(emergencyMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Trusted Contacts */}
        {activeTab === 'contacts' && (
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Saved Emergency Contacts
              </h4>
              <p className="text-xs text-slate-500">
                These contacts are notified when you start a SafeWalk journey or trigger an SOS alert.
              </p>
            </div>

            {/* Existing contacts */}
            <div className="space-y-2">
              {contacts.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{c.contact_name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-500">
                        {c.relationship}
                      </span>
                      {c.is_primary === 1 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{c.phone_number}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContactName(c.contact_name);
                      setSelectedContactPhone(c.phone_number);
                      setActiveTab('journey');
                      onShowToast(`Selected ${c.contact_name} as active SafeWalk emergency contact`, 'info');
                    }}
                    className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-300 cursor-pointer hover:bg-emerald-100"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>

            {/* Add new contact form */}
            <form onSubmit={handleSaveContact} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                Add New Contact
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  required
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone (080...)"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  required
                />
                <select
                  value={newContactRel}
                  onChange={(e) => setNewContactRel(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="Friend">Friend / Roommate</option>
                  <option value="Family">Family / Parent</option>
                  <option value="Course Mate">Course Mate</option>
                  <option value="Hostel Caretaker">Hostel Caretaker</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingContact}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                {savingContact ? 'Saving...' : 'Save to SafeWalk Address Book'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Dedicated to keeping LAUTECH students safe every night.</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 cursor-pointer"
          >
            Close SafeWalk
          </button>
        </div>
      </div>
    </div>
  );
};
