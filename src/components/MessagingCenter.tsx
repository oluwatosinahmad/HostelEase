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
  ChevronRight
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
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Available Hostels for starting a new chat
  const [availableHostels, setAvailableHostels] = useState<Property[]>([]);
  const [showNewChatSelector, setShowNewChatSelector] = useState<boolean>(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    'Is this hostel still available for rent?',
    'What is the total first-year cost including caution fee?',
    'Is electricity steady in this area?',
    'Is running borehole water available inside the room?',
    'Can I schedule an inspection this week?'
  ];

  // Fetch available hostels so user can easily start a chat
  useEffect(() => {
    api.properties.search({ page: 1 })
      .then(res => setAvailableHostels(res.properties || []))
      .catch(() => {});
  }, []);

  const fetchConversations = (selectId?: string) => {
    setLoading(true);
    api.messages.getConversations()
      .then(res => {
        const convs = res.conversations || [];
        setConversations(convs);
        setLoading(false);

        if (selectId) {
          setActiveConversationId(selectId);
        } else if (!activeConversationId && convs.length > 0) {
          setActiveConversationId(convs[0].id);
        }
      })
      .catch(err => {
        console.error('Failed to load conversations:', err);
        setLoading(false);
      });
  };

  // If initialPropertyId is provided, open or start that conversation
  useEffect(() => {
    if (initialPropertyId) {
      api.messages.startConversation(initialPropertyId)
        .then(res => {
          fetchConversations(res.conversationId);
        })
        .catch(err => {
          console.error('Failed to start conversation:', err);
          fetchConversations();
        });
    } else {
      fetchConversations();
    }
  }, [initialPropertyId]);

  // Load message history when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setActiveDetail(null);
      return;
    }

    api.messages.getConversation(activeConversationId)
      .then(res => {
        setActiveDetail(res);
        // Refresh conversations list to update unread status
        api.messages.getConversations().then(r => setConversations(r.conversations || []));
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
      });
  }, [activeConversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDetail?.messages]);

  const handleStartNewChatWithHostel = async (propertyId: string) => {
    try {
      const res = await api.messages.startConversation(propertyId);
      setShowNewChatSelector(false);
      fetchConversations(res.conversationId);
      onShowToast('Conversation opened with hostel landlord', 'success');
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
      
      // Append to active detail messages
      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, res.message]
        };
      });

      // Update conversations list preview
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: text, lastMessageAt: new Date().toISOString() };
        }
        return c;
      }));
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.areaName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Page Title & Context Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
              Hostel Ease Direct Messaging
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            Direct Landlord & Student Communication
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {user?.role === 'STUDENT'
              ? 'Message verified hostel owners directly to ask questions about water, electricity, caution fees, and inspection timings.'
              : 'Reply to incoming student inquiries, answer hostel questions, and confirm inspection appointments.'}
          </p>
        </div>

        {user?.role === 'STUDENT' && (
          <button
            onClick={() => setShowNewChatSelector(!showNewChatSelector)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center"
          >
            <PlusCircle className="w-4 h-4" />
            Inquire About a Hostel
          </button>
        )}
      </div>

      {/* New Hostel Chat Selector Modal / Dropdown */}
      {showNewChatSelector && (
        <div className="bg-white rounded-3xl p-5 border-2 border-emerald-500/30 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">Select a Hostel to Message Landlord</h3>
              <p className="text-xs text-slate-500">Pick any accommodation to start a direct inquiry with the verified provider.</p>
            </div>
            <button
              onClick={() => setShowNewChatSelector(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
            {availableHostels.map(h => (
              <div
                key={h.id}
                onClick={() => handleStartNewChatWithHostel(h.id)}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl cursor-pointer transition-all flex items-center gap-3"
              >
                <img
                  src={h.coverImage}
                  alt={h.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{h.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">📍 {h.area?.name || 'LAUTECH'}</p>
                  <p className="text-[11px] font-black text-emerald-700">{formatNaira(h.priceSummary?.rentAmount)}/yr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Messaging Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px] max-h-[780px]">
        {/* Left Column: Conversations List */}
        <div className={`md:col-span-4 border-r border-slate-200 flex flex-col bg-white ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {/* Search Conversations */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Loading chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-700">No Conversations Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {user?.role === 'STUDENT'
                    ? 'Click "Inquire About a Hostel" above or browse hostels to chat directly with landlords.'
                    : 'Incoming messages from interested students will appear here.'}
                </p>
                {user?.role === 'STUDENT' && (
                  <button
                    onClick={() => setShowNewChatSelector(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Select a Hostel to Message
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConversationId;
                const isStudentUser = user?.role === 'STUDENT';
                const otherPartyName = isStudentUser ? conv.providerName : conv.studentName;
                const otherPartyRole = isStudentUser ? 'Landlord' : 'Student';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-emerald-50/90 border-l-4 border-emerald-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={conv.propertyCoverImage}
                      alt={conv.propertyTitle}
                      className="w-12 h-12 rounded-2xl object-cover bg-slate-100 flex-shrink-0 shadow-2xs"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Identity & Unread Pill */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900 truncate flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${isStudentUser ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          {otherPartyRole}: {otherPartyName}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-full">
                            {conv.unreadCount} new
                          </span>
                        )}
                      </div>

                      {/* Hostel Name */}
                      <p className="text-xs font-bold text-emerald-800 truncate">
                        🏢 {conv.propertyTitle} ({conv.areaName})
                      </p>

                      {/* Last Message Snippet */}
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {conv.lastMessageText || 'Tap to view chat history'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Messages View */}
        <div className={`md:col-span-8 flex flex-col bg-slate-50/60 ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {!activeConversationId || !activeDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-slate-800">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Choose a chat on the left to talk directly with the landlord about room condition, caution deposit, water, and visits.
                </p>
              </div>
              {user?.role === 'STUDENT' && (
                <button
                  onClick={() => setShowNewChatSelector(true)}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Start New Hostel Inquiry
                </button>
              )}
            </div>
          ) : (
            <>
              {/* TOP HEADER: Clear Identity & Hostel Context Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 shadow-xs space-y-2">
                {/* Row 1: Who is chatting with whom */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setActiveConversationId(null)}
                      className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {user?.role === 'STUDENT' ? '🏡' : '🎓'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {user?.role === 'STUDENT'
                            ? `Landlord: ${activeDetail.conversation.provider.name}`
                            : `Student: ${activeDetail.conversation.student.name}`}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {user?.role === 'STUDENT'
                          ? 'Official accommodation provider for this lodge'
                          : 'LAUTECH Student inquiring about room availability'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onRequestInspection && (
                      <button
                        onClick={() => onRequestInspection(activeDetail.conversation.property.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Book Inspection</span>
                      </button>
                    )}

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Report Suspicious User or Chat"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Hostel Info Anchor Bar */}
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={activeDetail.conversation.property.coverImage}
                      alt={activeDetail.conversation.property.title}
                      className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
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
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3" />
                      View Hostel
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {activeDetail.messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-600">Start the conversation with the landlord</p>
                    <p className="text-[11px] text-slate-400">Click a quick question chip below to send your first message instantly.</p>
                  </div>
                ) : (
                  activeDetail.messages.map(msg => {
                    const isMe = msg.senderId === user?.id;
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
                      ? `You (${user?.role === 'STUDENT' ? 'Student' : 'Landlord'})`
                      : msg.senderRole === 'PROVIDER'
                      ? `🏡 Landlord: ${activeDetail.conversation.provider.name}`
                      : `🎓 Student: ${activeDetail.conversation.student.name}`;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Clear Sender Badge Above Bubble */}
                        <span className="text-[10px] font-black text-slate-500 px-1 mb-0.5">
                          {senderLabel}
                        </span>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs font-medium space-y-1 shadow-xs ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-tr-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center justify-end gap-1 text-[9px] ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck className={`w-3 h-3 ${msg.isRead ? 'text-amber-300' : 'text-emerald-300'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Chips (For quick student inquiries) */}
              {user?.role === 'STUDENT' && (
                <div className="px-3.5 py-2 bg-white/90 border-t border-slate-200/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-600 inline mr-0.5" />
                    Quick Ask:
                  </span>
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 shadow-2xs"
                    >
                      "{q}"
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
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    user?.role === 'STUDENT'
                      ? `Ask Landlord ${activeDetail.conversation.provider.name} a question...`
                      : `Reply to student ${activeDetail.conversation.student.name}...`
                  }
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />

                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center"
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
          reportedUserId={user?.role === 'STUDENT' ? activeDetail.conversation.provider.id : activeDetail.conversation.student.id}
          reportedUserName={user?.role === 'STUDENT' ? activeDetail.conversation.provider.name : activeDetail.conversation.student.name}
          conversationId={activeDetail.conversation.id}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
