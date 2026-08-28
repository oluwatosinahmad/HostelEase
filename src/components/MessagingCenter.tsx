import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Flag, 
  Info, 
  ChevronLeft, 
  Sparkles, 
  Clock, 
  Check, 
  CheckCheck,
  AlertCircle,
  Eye,
  Phone,
  User,
  Building2,
  PlusCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Smile,
  Zap,
  Droplets,
  CreditCard,
  X,
  MessageCircle
} from 'lucide-react';
import { ConversationItem, ConversationDetail, MessageItem, Property } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { ReportUserModal } from './ReportUserModal';

interface MessagingCenterProps {
  initialPropertyId?: string | null;
  onSelectProperty?: (propertyId: string) => void;
  onRequestInspection?: (propertyId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({
  initialPropertyId,
  onSelectProperty,
  onRequestInspection,
  onShowToast
}) => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  // Conversations and active state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  
  // UI states
  const [messageInput, setMessageInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread'>('all');

  // Available Hostels for starting a new chat
  const [availableHostels, setAvailableHostels] = useState<Property[]>([]);
  const [showNewChatSelector, setShowNewChatSelector] = useState<boolean>(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickQuestions = [
    { text: 'Is this hostel still available for the 2026/2027 session?', icon: '🏢' },
    { text: 'Is running borehole water available inside the room 24/7?', icon: '💧' },
    { text: 'How steady is the electricity and neighborhood feeder line?', icon: '⚡' },
    { text: 'What is the full first-year fee breakdown and caution deposit?', icon: '💰' },
    { text: 'Can I schedule a physical inspection tour this Saturday?', icon: '📅' }
  ];

  // Fetch available hostels so student/user can start a new inquiry anytime
  useEffect(() => {
    api.properties.search({ page: 1 })
      .then(res => setAvailableHostels(res.properties || []))
      .catch(() => {});
  }, []);

  // Fetch conversations and maintain accurate active conversation
  const loadConversations = async (preferredSelectId?: string) => {
    setLoading(true);
    try {
      const res = await api.messages.getConversations();
      const convs = res.conversations || [];
      setConversations(convs);

      if (preferredSelectId) {
        setActiveConversationId(preferredSelectId);
      } else if (!activeConversationId && convs.length > 0) {
        setActiveConversationId(convs[0].id);
      } else if (activeConversationId) {
        // Verify active ID still exists, otherwise select first
        const exists = convs.some(c => c.id === activeConversationId);
        if (!exists && convs.length > 0) {
          setActiveConversationId(convs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // If initialPropertyId is provided from a hostel card or inspection click, open that exact conversation
  useEffect(() => {
    if (initialPropertyId) {
      api.messages.startConversation(initialPropertyId)
        .then(res => {
          setActiveConversationId(res.conversationId);
          loadConversations(res.conversationId);
        })
        .catch(err => {
          console.error('Failed to start conversation for property:', err);
          loadConversations();
        });
    } else {
      loadConversations();
    }
  }, [initialPropertyId]);

  // Load message detail whenever activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setActiveDetail(null);
      return;
    }

    setMessagesLoading(true);
    api.messages.getConversation(activeConversationId)
      .then(res => {
        setActiveDetail(res);
        setMessagesLoading(false);
        // Mark as read in background
        api.messages.markAsRead(activeConversationId).catch(() => {});
      })
      .catch(err => {
        console.error('Failed to load messages for conversation:', err);
        setMessagesLoading(false);
      });
  }, [activeConversationId]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDetail?.messages, messagesLoading]);

  const handleSelectConversation = (convId: string) => {
    if (convId === activeConversationId) return;
    setActiveConversationId(convId);
  };

  const handleStartNewChatWithHostel = async (propertyId: string) => {
    try {
      const res = await api.messages.startConversation(propertyId);
      setShowNewChatSelector(false);
      setActiveConversationId(res.conversationId);
      loadConversations(res.conversationId);
      onShowToast('Direct chat opened with verified landlord', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to start conversation', 'error');
    }
  };

  const handleSendMessage = async (contentToSend?: string) => {
    const text = (contentToSend || messageInput).trim();
    if (!text || !activeConversationId) return;

    setSending(true);
    try {
      const res = await api.messages.sendMessage(activeConversationId, text);
      setMessageInput('');

      // Append message to active detail
      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, res.message]
        };
      });

      // Update last message preview in conversations list
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: text, lastMessageAt: new Date().toISOString() };
        }
        return c;
      }));

      // Focus back to input
      inputRef.current?.focus();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  // Filtered conversations list
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = 
      (c.propertyTitle && c.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.providerName && c.providerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.areaName && c.areaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilterTab === 'unread') {
      return (c.unreadCount || 0) > 0;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top Banner: Professional Communication Command Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
              Hostel Ease Direct Messenger
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Verified Escrow & Landlord Network
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            Direct Landlord & Student Communication
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {isStudent
              ? 'Message verified accommodation owners directly to ask questions about water, electricity, caution fees, and book inspection tours.'
              : 'Reply to incoming student inquiries, answer room condition questions, and confirm physical tour appointments.'}
          </p>
        </div>

        {isStudent && (
          <button
            onClick={() => setShowNewChatSelector(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Inquire About a Hostel</span>
          </button>
        )}
      </div>

      {/* New Hostel Chat Selector Modal */}
      {showNewChatSelector && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-3xl w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Select a Hostel to Message Landlord</h3>
                <p className="text-xs text-slate-500">Pick any verified accommodation around LAUTECH to start a direct inquiry with the owner.</p>
              </div>
              <button
                onClick={() => setShowNewChatSelector(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
              {availableHostels.map(h => (
                <div
                  key={h.id}
                  onClick={() => handleStartNewChatWithHostel(h.id)}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-400 rounded-2xl cursor-pointer transition-all flex flex-col justify-between space-y-2 group shadow-2xs"
                >
                  <div className="relative h-28 rounded-xl overflow-hidden bg-slate-200">
                    <img
                      src={h.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                      alt={h.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-xs">
                      {h.verificationStatus === 'APPROVED' ? '✓ VERIFIED' : 'ACTIVE'}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                      {h.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {h.area?.name || (h as any).areaName || 'LAUTECH Area'}
                    </p>
                    <p className="text-xs font-black text-emerald-700 pt-1">
                      {formatNaira((h as any).rentAmount ?? h.priceSummary?.rentAmount ?? 200000)}/yr
                    </p>
                  </div>
                  <button className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer">
                    <MessageSquare className="w-3 h-3" />
                    <span>Message Landlord</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Pane Messaging Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[660px] max-h-[800px]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST (STUDENTS & LANDLORDS)                      */}
        {/* ========================================================================= */}
        <div className={`md:col-span-4 border-r border-slate-200 flex flex-col bg-white ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Search and Filter Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
            <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs shadow-2xs focus-within:border-emerald-500 transition-colors">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search landlord, student, or hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  activeFilterTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Chats ({conversations.length})
              </button>
              <button
                onClick={() => setActiveFilterTab('unread')}
                className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  activeFilterTab === 'unread'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-700">No Conversations Found</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {isStudent
                    ? 'Inquire about any verified hostel to start chatting directly with the landlord.'
                    : 'Incoming messages from prospective students will appear here.'}
                </p>
                {isStudent && (
                  <button
                    onClick={() => setShowNewChatSelector(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Select a Hostel to Message
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConversationId;
                const otherPartyName = isStudent ? conv.providerName : conv.studentName;
                const hasUnread = (conv.unreadCount || 0) > 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3 border-l-4 ${
                      isSelected 
                        ? 'bg-emerald-50/90 border-emerald-600 shadow-inner' 
                        : hasUnread 
                        ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-500' 
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    {/* Avatar with Online Status */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                        isStudent ? 'bg-gradient-to-br from-emerald-600 to-teal-800' : 'bg-gradient-to-br from-blue-600 to-indigo-800'
                      }`}>
                        {otherPartyName ? otherPartyName.charAt(0).toUpperCase() : 'H'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Online" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Top Row: Name + Time */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                          <span>{otherPartyName}</span>
                          {isStudent && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* Hostel Name & Area */}
                      <p className="text-[11px] font-bold text-emerald-800 truncate">
                        🏢 {conv.propertyTitle} <span className="text-slate-400 font-normal">({conv.areaName})</span>
                      </p>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className={`text-[11px] truncate ${hasUnread ? 'font-black text-slate-900' : 'text-slate-500 font-medium'}`}>
                          {conv.lastMessageText || 'Tap to start conversation'}
                        </p>
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-full shrink-0">
                            {conv.unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CONVERSATION THREAD                                 */}
        {/* ========================================================================= */}
        <div className={`md:col-span-8 flex flex-col bg-slate-50/70 ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {!activeConversationId || !activeDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center shadow-inner">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-slate-800">Select an Accommodation Thread</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Choose a conversation on the left to chat directly with that specific landlord regarding rooms, caution deposits, and move-in schedules.
                </p>
              </div>
              {isStudent && (
                <button
                  onClick={() => setShowNewChatSelector(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Start New Hostel Inquiry
                </button>
              )}
            </div>
          ) : (
            <>
              {/* TOP HEADER: Landlord Info & Hostel Anchor Card */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 shadow-xs space-y-2.5">
                
                {/* Row 1: Direct Participant Information */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back to List Button */}
                    <button
                      onClick={() => setActiveConversationId(null)}
                      className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-sm shadow-xs">
                        {isStudent ? (activeDetail.conversation.provider.name?.charAt(0) || 'L') : (activeDetail.conversation.student.name?.charAt(0) || 'S')}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {isStudent
                            ? `Landlord: ${activeDetail.conversation.provider.name}`
                            : `Student: ${activeDetail.conversation.student.name}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified Owner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                        <span>🟢 Online • Usually replies in &lt;15 mins</span>
                        {(activeDetail.conversation.provider as any)?.phone && (
                          <span>• 📞 {(activeDetail.conversation.provider as any).phone}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions Header Right */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onRequestInspection && (
                      <button
                        onClick={() => onRequestInspection(activeDetail.conversation.property.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Book Tour</span>
                      </button>
                    )}

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Report User or Inappropriate Behavior"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Property Quick Anchor Card */}
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={activeDetail.conversation.property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                      alt={activeDetail.conversation.property.title}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        🏢 {activeDetail.conversation.property.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        📍 {activeDetail.conversation.property.areaName} ({formatDistance(activeDetail.conversation.property.distanceFromCampusKm)}) •{' '}
                        <strong className="text-emerald-700">{formatNaira(activeDetail.conversation.property.rentAmount)}/yr</strong>
                      </p>
                    </div>
                  </div>

                  {onSelectProperty && (
                    <button
                      onClick={() => onSelectProperty(activeDetail.conversation.property.id)}
                      className="px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Inspect Details</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
                {messagesLoading ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">Loading conversation thread...</p>
                  </div>
                ) : activeDetail.messages.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-600">Start the conversation with Landlord {activeDetail.conversation.provider.name}</p>
                    <p className="text-[11px] text-slate-400">Click a smart inquiry chip below to send your first question instantly.</p>
                  </div>
                ) : (
                  activeDetail.messages.map(msg => {
                    const isMe = msg.senderId === user?.id || (isStudent && msg.senderRole === 'STUDENT') || (!isStudent && msg.senderRole === 'PROVIDER');
                    const isSystem = msg.messageType === 'SYSTEM_EVENT';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="px-3.5 py-1.5 bg-slate-200/90 rounded-2xl text-[11px] font-bold text-slate-800 max-w-md text-center flex items-center gap-1.5 shadow-2xs border border-slate-300/60">
                            <Info className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                            <span>{msg.content}</span>
                          </div>
                        </div>
                      );
                    }

                    const senderLabel = isMe
                      ? `You (${isStudent ? 'Student' : 'Landlord'})`
                      : msg.senderRole === 'PROVIDER'
                      ? `🏡 Landlord: ${activeDetail.conversation.provider.name}`
                      : `🎓 Student: ${activeDetail.conversation.student.name}`;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label Above Bubble */}
                        <span className="text-[10px] font-black text-slate-400 px-1 mb-0.5">
                          {senderLabel}
                        </span>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs font-medium space-y-1 shadow-sm ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-tr-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-amber-300' : 'text-emerald-200'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Inquiry Smart Chips */}
              {isStudent && (
                <div className="px-4 py-2 bg-white/90 border-t border-slate-200 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-600 inline mr-0.5" />
                    Quick Ask:
                  </span>
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q.text)}
                      className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <span>{q.icon}</span>
                      <span>"{q.text}"</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Message Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    isStudent
                      ? `Ask Landlord ${activeDetail.conversation.provider.name} a question...`
                      : `Reply to student ${activeDetail.conversation.student.name}...`
                  }
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
                />

                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {activeDetail && (
        <ReportUserModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportedUserId={isStudent ? activeDetail.conversation.provider.id : activeDetail.conversation.student.id}
          reportedUserName={isStudent ? activeDetail.conversation.provider.name : activeDetail.conversation.student.name}
          conversationId={activeDetail.conversation.id}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
