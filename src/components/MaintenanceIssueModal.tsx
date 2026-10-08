import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  Upload,
  Send,
  MessageSquare,
  FileText,
  Search,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Droplets,
  Key,
  Wind,
  Wifi,
  Sparkles,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { getAuthToken } from '../services/api';

interface MaintenanceIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CATEGORIES = [
  { id: 'ELECTRICITY', label: 'Electricity / Meter', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200' },
  { id: 'WATER', label: 'Water Supply / Tanks', icon: Droplets, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200' },
  { id: 'PLUMBING', label: 'Plumbing / Toilet', icon: Wrench, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200' },
  { id: 'DOOR_LOCK', label: 'Doors / Locks / Windows', icon: Key, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/50 border-orange-200' },
  { id: 'FAN_AC', label: 'Fan / AC / Ventilation', icon: Wind, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50 border-teal-200' },
  { id: 'INTERNET', label: 'Wi-Fi / Internet', icon: Wifi, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200' },
  { id: 'CLEANING', label: 'Waste / Hygiene', icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50 border-purple-200' },
  { id: 'SECURITY', label: 'Security / Gates', icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 border-rose-200' },
  { id: 'OTHER', label: 'General / Other', icon: HelpCircle, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200' }
];

export const MaintenanceIssueModal: React.FC<MaintenanceIssueModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'detail'>('create');
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newUpdateMessage, setNewUpdateMessage] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [category, setCategory] = useState('ELECTRICITY');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketCode, setCreatedTicketCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch properties and tickets on mount or open
  useEffect(() => {
    if (!isOpen) return;
    fetchProperties();
    fetchTickets();
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

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await fetch('/api/maintenance/properties', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = (data.bookedProperties?.length > 0)
          ? data.bookedProperties
          : (data.allProperties || []);
        setProperties(list);
        if (list.length > 0 && !propertyId) {
          setPropertyId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load maintenance properties:', err);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/maintenance/tickets', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/tickets/${ticketId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setUpdates(data.updates || []);
        setActiveTab('detail');
      }
    } catch (err) {
      onShowToast('Could not load ticket timeline.', 'error');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      onShowToast('Please select your hostel/property.', 'error');
      return;
    }
    if (!roomNumber.trim()) {
      onShowToast('Please specify your room or bedspace number.', 'error');
      return;
    }
    if (description.trim().length < 10) {
      onShowToast('Please describe the issue in more detail (at least 10 characters).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/maintenance/tickets', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          propertyId,
          roomNumber: roomNumber.trim(),
          category,
          priority,
          description: description.trim(),
          attachments: attachmentUrl ? [attachmentUrl] : []
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit maintenance ticket');
      }

      setCreatedTicketCode(data.ticket.ticket_code);
      onShowToast(`Ticket ${data.ticket.ticket_code} generated! Lodge management notified.`, 'success');
      setDescription('');
      setAttachmentUrl('');
      fetchTickets();
    } catch (err: any) {
      onShowToast(err.message || 'Error creating maintenance ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newUpdateMessage.trim()) return;

    setSubmittingUpdate(true);
    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}/updates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: newUpdateMessage.trim() })
      });

      if (res.ok) {
        setNewUpdateMessage('');
        fetchTicketDetail(selectedTicket.id);
        fetchTickets();
        onShowToast('Note added to ticket timeline.', 'success');
      }
    } catch (err) {
      onShowToast('Failed to post update note.', 'error');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/maintenance/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        onShowToast(`Ticket status updated to ${newStatus}`, 'success');
        fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      onShowToast('Failed to update status.', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    onShowToast(`Copied tracking code: ${code}`, 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">SUBMITTED</span>;
      case 'RECEIVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200">RECEIVED</span>;
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 flex items-center gap-1"><Clock className="w-2.5 h-2.5 animate-spin" /> IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'EMERGENCY':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">EMERGENCY</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">LOW</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 border border-blue-500/40">
                  SUPPORT
                </span>
                <span className="text-[11px] text-slate-300 font-bold hidden sm:inline">
                  Verified Lodges Ticketing Desk
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                Maintenance & Issue Reporting
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
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Report New Issue</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('list');
              fetchTickets();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>My Tickets & History</span>
            {tickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[10px] font-bold">
                {tickets.length}
              </span>
            )}
          </button>

          {selectedTicket && (
            <button
              onClick={() => setActiveTab('detail')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'detail'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>Timeline: {selectedTicket.ticket_code.slice(-5)}</span>
            </button>
          )}
        </div>

        {/* Tab 1: Create Ticket Form */}
        {activeTab === 'create' && (
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            {createdTicketCode ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Ticket Successfully Created!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Your issue report has been logged and assigned to your lodge caretaker & manager.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-700 max-w-sm mx-auto flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                    {createdTicketCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(createdTicketCode)}
                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCreatedTicketCode(null);
                      setActiveTab('list');
                      fetchTickets();
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    View Ticket Timeline
                  </button>
                  <button
                    onClick={() => setCreatedTicketCode(null)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Report Another Issue
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Property selection */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Hostel / Lodge *
                    </label>
                    <select
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    >
                      {loadingProperties && <option>Loading hostels...</option>}
                      {!loadingProperties && properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.address?.split(',')[0] || 'LAUTECH Axis'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room Number */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      Room / Flat Number *
                    </label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. Room B4, Top Floor"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Category of Issue *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg border ${cat.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Severity / Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'LOW', label: 'Low', desc: 'Minor issue' },
                      { id: 'MEDIUM', label: 'Medium', desc: 'Standard repair' },
                      { id: 'HIGH', label: 'High', desc: 'Major disruption' },
                      { id: 'EMERGENCY', label: 'Emergency', desc: 'Immediate risk' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                          priority === p.id
                            ? p.id === 'EMERGENCY'
                              ? 'bg-rose-600 text-white border-rose-600 font-black'
                              : 'bg-blue-600 text-white border-blue-600 font-black'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{p.label}</div>
                        <div className="text-[9px] opacity-80 hidden sm:block">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                    <span>Issue Description *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Min 10 characters</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what broke, when it happened, and any specific details for the maintenance technician..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    required
                  />
                </div>

                {/* Optional Photo Attachment Link */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    Photo URL / Attachment (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Paste image link or upload evidence screenshot..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Upload className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Ticket & Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Maintenance Ticket</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Ticket List */}
        {activeTab === 'list' && (
          <div className="p-5 sm:p-6 space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Active & Past Maintenance Tickets
              </h4>
              <button
                onClick={fetchTickets}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingTickets ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                Loading your maintenance records...
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Tickets Logged Yet</h5>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Everything in your lodge running smoothly? If any repair is needed, tap "Report New Issue" above.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Create First Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(t => (
                  <div
                    key={t.id}
                    onClick={() => fetchTicketDetail(t.id)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all cursor-pointer space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                            {t.ticket_code}
                          </span>
                          {getPriorityBadge(t.priority)}
                        </div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {t.property_title} • {t.room_number}
                        </h5>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {t.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Category: <strong className="text-slate-700 dark:text-slate-300">{t.category}</strong></span>
                      <span className="flex items-center gap-1 text-blue-600 font-bold">
                        <span>View Progress</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Ticket Detail Timeline */}
        {activeTab === 'detail' && selectedTicket && (
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      {selectedTicket.ticket_code}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {selectedTicket.property_title} ({selectedTicket.room_number})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Managed by: {selectedTicket.provider_name}
                  </p>
                </div>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Original Issue:</strong> {selectedTicket.description}
              </div>

              {/* Status Action Buttons for Student or Provider */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={() => handleStatusChange('CLOSED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Resolved & Close Ticket</span>
                  </button>
                )}
                {currentUser?.role === 'PROVIDER' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('RECEIVED')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Acknowledge (Received)
                    </button>
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Set In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange('RESOLVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Timeline updates */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Ticket Activity & Comments
              </h5>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {updates.map(u => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {u.sender_name || 'Staff'} ({u.sender_role})
                      </span>
                      <span>{new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {u.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add Note Input */}
              <form onSubmit={handleSendUpdate} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newUpdateMessage}
                  onChange={(e) => setNewUpdateMessage(e.target.value)}
                  placeholder="Post an update, question, or technician note..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={submittingUpdate}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Escrow & Tenancy protected maintenance tracking desk.</span>
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
