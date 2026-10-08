import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Send,
  Bell,
  Building,
  DollarSign,
  PieChart,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { formatNaira } from '../utils/formatters';
import { getAuthToken } from '../services/api';

interface SplitRentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface ParticipantInput {
  name: string;
  email: string;
  phone: string;
  sharePercentage: number;
}

export const SplitRentModal: React.FC<SplitRentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'agreements'>('create');
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  // Form State
  const [propertyTitle, setPropertyTitle] = useState('');
  const [totalRent, setTotalRent] = useState<number | string>(300000);
  const [splitType, setSplitType] = useState<'50_50' | '60_40' | '70_30' | 'CUSTOM'>('50_50');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [participants, setParticipants] = useState<ParticipantInput[]>([
    {
      name: currentUser?.fullName || 'You (Primary Tenant)',
      email: currentUser?.email || 'you@student.lautech.edu.ng',
      phone: currentUser?.phone || '',
      sharePercentage: 50
    },
    {
      name: 'Roommate 1',
      email: '',
      phone: '',
      sharePercentage: 50
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payingShareId, setPayingShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchMyAgreements();
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

  const fetchMyAgreements = async () => {
    setLoadingAgreements(true);
    try {
      const res = await fetch('/api/split-rent/my', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAgreements(data.agreements || []);
      }
    } catch (err) {
      console.error('Failed to load split rent agreements:', err);
    } finally {
      setLoadingAgreements(false);
    }
  };

  // Preset split type changes
  const applyPresetSplit = (type: '50_50' | '60_40' | '70_30' | 'CUSTOM') => {
    setSplitType(type);
    if (type === '50_50') {
      setParticipants(prev => [
        { ...prev[0], sharePercentage: 50 },
        { ...prev[1], sharePercentage: 50 }
      ]);
    } else if (type === '60_40') {
      setParticipants(prev => [
        { ...prev[0], sharePercentage: 60 },
        { ...prev[1], sharePercentage: 40 }
      ]);
    } else if (type === '70_30') {
      setParticipants(prev => [
        { ...prev[0], sharePercentage: 70 },
        { ...prev[1], sharePercentage: 30 }
      ]);
    }
  };

  const addRoommate = () => {
    if (participants.length >= 6) {
      onShowToast('Maximum 6 roommates supported per split agreement', 'error');
      return;
    }
    setSplitType('CUSTOM');
    const newCount = participants.length + 1;
    const equalShare = Math.floor(100 / newCount);
    const updated = participants.map(p => ({ ...p, sharePercentage: equalShare }));
    const remainder = 100 - (equalShare * newCount);
    updated[0].sharePercentage += remainder;

    setParticipants([
      ...updated,
      {
        name: `Roommate ${newCount - 1}`,
        email: '',
        phone: '',
        sharePercentage: equalShare
      }
    ]);
  };

  const removeRoommate = (index: number) => {
    if (participants.length <= 2) {
      onShowToast('A split agreement requires at least 2 participants.', 'error');
      return;
    }
    setSplitType('CUSTOM');
    const filtered = participants.filter((_, idx) => idx !== index);
    const equalShare = Math.floor(100 / filtered.length);
    const remainder = 100 - (equalShare * filtered.length);
    const redistributed = filtered.map((p, idx) => ({
      ...p,
      sharePercentage: idx === 0 ? equalShare + remainder : equalShare
    }));
    setParticipants(redistributed);
  };

  const updateParticipant = (index: number, field: keyof ParticipantInput, value: any) => {
    const copy = [...participants];
    copy[index] = { ...copy[index], [field]: value };
    setParticipants(copy);
  };

  const totalPercentage = participants.reduce((sum, p) => sum + (parseFloat(p.sharePercentage as any) || 0), 0);
  const rentNumber = parseFloat(totalRent as any) || 0;

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyTitle.trim()) {
      onShowToast('Please enter the lodge or property title.', 'error');
      return;
    }
    if (rentNumber <= 0) {
      onShowToast('Please enter a valid total rent amount.', 'error');
      return;
    }
    if (Math.abs(totalPercentage - 100) > 0.5) {
      onShowToast(`Roommate shares must total 100%. Currently: ${totalPercentage}%`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/split-rent/create', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          propertyTitle: propertyTitle.trim(),
          totalRent: rentNumber,
          splitType,
          dueDate,
          notes: notes.trim(),
          participants
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agreement');
      }

      onShowToast(`Agreement ${data.agreement.reference_code} generated!`, 'success');
      fetchMyAgreements();
      setActiveTab('agreements');
    } catch (err: any) {
      onShowToast(err.message || 'Error creating agreement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayShare = async (shareId: string) => {
    setPayingShareId(shareId);
    try {
      const res = await fetch(`/api/split-rent/share/${shareId}/pay`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          paymentReference: `PAY-SPLIT-${Date.now().toString(36).toUpperCase()}`
        })
      });

      if (res.ok) {
        onShowToast('Your rent share was marked as PAID into escrow!', 'success');
        fetchMyAgreements();
      }
    } catch (err) {
      onShowToast('Failed to process payment.', 'error');
    } finally {
      setPayingShareId(null);
    }
  };

  const handleRemindRoommates = async (agreementId: string) => {
    try {
      const res = await fetch(`/api/split-rent/${agreementId}/remind`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        onShowToast(data.message || 'Payment reminders sent to pending roommates!', 'success');
      }
    } catch (err) {
      onShowToast('Failed to dispatch reminders.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Users className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/30 text-teal-300 border border-teal-500/40">
                  ROOMMATES
                </span>
                <span className="text-[11px] text-slate-300 font-bold hidden sm:inline">
                  Roommate Cost & Rent Splitting
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                Split Rent
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
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            <span>Create Split Agreement</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('agreements');
              fetchMyAgreements();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'agreements'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-blue-600" />
            <span>My Split Agreements</span>
            {agreements.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-bold">
                {agreements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Create Agreement */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateAgreement} className="p-5 sm:p-6 space-y-5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Property Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Hostel / Lodge Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={propertyTitle}
                    onChange={(e) => setPropertyTitle(e.target.value)}
                    placeholder="e.g. Emerald Heights Lodge, Under G"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Total Rent */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Total Rent Amount (₦) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalRent}
                    onChange={(e) => setTotalRent(e.target.value)}
                    placeholder="e.g. 280000"
                    min="10000"
                    step="5000"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Split Type Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Select Split Ratio
                </label>
                <span className="text-[10px] text-teal-600 font-bold">
                  Total: {formatNaira(rentNumber)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '50_50', label: '50 / 50', desc: 'Equal split' },
                  { id: '60_40', label: '60 / 40', desc: 'Master/Smaller room' },
                  { id: '70_30', label: '70 / 30', desc: 'Unequal share' },
                  { id: 'CUSTOM', label: 'Custom', desc: 'Manual ratio' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => applyPresetSplit(r.id as any)}
                    className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      splitType === r.id
                        ? 'bg-teal-600 text-white border-teal-600 font-black shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-[9px] opacity-80 hidden sm:block">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Roommates Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Roommates & Share Distribution ({participants.length})
                </span>
                <button
                  type="button"
                  onClick={addRoommate}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-teal-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Roommate</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {participants.map((p, idx) => {
                  const shareAmount = Math.round((rentNumber * (parseFloat(p.sharePercentage as any) || 0)) / 100);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                          placeholder="Roommate Name"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                          required
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-4">
                        <input
                          type="email"
                          value={p.email}
                          onChange={(e) => updateParticipant(idx, 'email', e.target.value)}
                          placeholder="email@lautech.edu.ng"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                          required
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={p.sharePercentage}
                            onChange={(e) => {
                              setSplitType('CUSTOM');
                              updateParticipant(idx, 'sharePercentage', parseFloat(e.target.value) || 0);
                            }}
                            min="5"
                            max="95"
                            className="w-14 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-center"
                          />
                          <span className="font-bold text-slate-500">%</span>
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1.5">
                        <span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] whitespace-nowrap">
                          {formatNaira(shareAmount)}
                        </span>
                        {participants.length > 2 && idx > 0 && (
                          <button
                            type="button"
                            onClick={() => removeRoommate(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Percentage validation bar */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Share Allocation:</span>
                <span className={`font-black ${Math.abs(totalPercentage - 100) < 0.1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totalPercentage.toFixed(0)}% {Math.abs(totalPercentage - 100) < 0.1 ? '✓ Complete' : '⚠️ Must equal 100%'}
                </span>
              </div>
            </div>

            {/* Due date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Due Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  Special Notes / Room Allocation (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. John takes Room A, Tolu takes Room B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || Math.abs(totalPercentage - 100) > 0.5}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Split Agreement...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Generate Split Rent Agreement</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: My Agreements */}
        {activeTab === 'agreements' && (
          <div className="p-5 sm:p-6 space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Active & Settled Split Rent Agreements
              </h4>
              <button
                onClick={fetchMyAgreements}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingAgreements ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                Loading your agreements...
              </div>
            ) : agreements.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Split Agreements Found</h5>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Split rent and deposits easily with your lodge roommates. Tap "Create Split Agreement" to begin.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Create First Agreement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {agreements.map(agr => {
                  const isCompleted = agr.status === 'COMPLETED';
                  return (
                    <div
                      key={agr.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
                              {agr.reference_code}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Ratio: {agr.split_type.replace('_', '/')}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                            {agr.property_title}
                          </h5>
                          <p className="text-xs text-slate-500">
                            Due: {agr.due_date} • Total: <strong className="text-slate-900 dark:text-white">{formatNaira(agr.total_rent)}</strong>
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {agr.status} ({agr.paid_count || 0}/{agr.total_participants || 0} Paid)
                        </span>
                      </div>

                      {/* Participant shares breakdown */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {agr.shares?.map((s: any) => {
                          const isUser = s.participant_email?.toLowerCase() === currentUser?.email?.toLowerCase() || s.user_id === currentUser?.id;
                          const isPaid = s.payment_status === 'PAID';
                          return (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>{s.participant_name}</span>
                                  {isUser && <span className="px-1 py-0.2 rounded bg-teal-100 text-teal-800 text-[9px] font-black">YOU</span>}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  {s.share_percentage}% • {formatNaira(s.share_amount)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {isPaid ? 'PAID ✓' : 'PENDING'}
                                </span>

                                {!isPaid && isUser && (
                                  <button
                                    onClick={() => handlePayShare(s.id)}
                                    disabled={payingShareId === s.id}
                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                                  >
                                    {payingShareId === s.id ? 'Processing...' : 'Pay Share'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reminder Action */}
                      {!isCompleted && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleRemindRoommates(agr.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                            <span>Remind Pending Roommates</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
            <span>Remita RRR & Escrow Shielded Co-Tenancy Agreement.</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
