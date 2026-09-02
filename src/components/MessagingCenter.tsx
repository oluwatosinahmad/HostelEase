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
  MessageCircle,
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  Heart,
  ThumbsUp,
  Flame,
  Laugh,
  Key,
  Copy,
  Download,
  Share2,
  Paperclip
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

// Preset photo snaps for instant room inspection sharing
const ROOM_PHOTO_PRESETS = [
  {
    title: 'Room Interior & Bedspace',
    url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
    caption: 'Current live view of the room space, tiled floor, and ventilated window.'
  },
  {
    title: 'Private Ensuite Bathroom & Water',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
    caption: 'Ensuite toilet & shower with running borehole tap.'
  },
  {
    title: 'Prepaid Meter & Electricity Hub',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
    caption: 'Individual dedicated prepaid electrical meter.'
  },
  {
    title: 'Hostel Gate & Security Post',
    url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80',
    caption: 'Gated perimeter with security guard post and solar floodlights.'
  }
];

const TAPBACK_EMOJIS = ['❤️', '👍', '🔥', '😂', '⚡', '🤝', '📍'];

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

  // Advanced Snapchat / iMessage Features
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [copiedPasscodeId, setCopiedPasscodeId] = useState<string | null>(null);

  // Slide / Swipe-to-Reply State
  const [replyingToMessage, setReplyingToMessage] = useState<MessageItem | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Available Hostels for starting a new chat
  const [availableHostels, setAvailableHostels] = useState<Property[]>([]);
  const [showNewChatSelector, setShowNewChatSelector] = useState<boolean>(false);

  // Inspection Details & Booking Modals
  const [showInspectionDetailsModal, setShowInspectionDetailsModal] = useState<boolean>(false);
  const [showBookTourModal, setShowBookTourModal] = useState<boolean>(false);
  const [tourType, setTourType] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL');
  const [tourDate, setTourDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [tourTime, setTourTime] = useState<string>('10:00 AM');
  const [studentPhoneInput, setStudentPhoneInput] = useState<string>(user?.phone || '');
  const [tourNotes, setTourNotes] = useState<string>('');
  const [bookingTour, setBookingTour] = useState<boolean>(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);

  // Scroll Container Ref (Avoids scrolling the entire window!)
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<any>(null);

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

  // Safe inner container scroll (Never scrolls the document/window!)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

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
        // Scroll to bottom immediately without jumping page
        setTimeout(() => scrollToBottom('auto'), 50);
        // Mark as read in background
        api.messages.markAsRead(activeConversationId).catch(() => {});
      })
      .catch(err => {
        console.error('Failed to load messages for conversation:', err);
        setMessagesLoading(false);
      });
  }, [activeConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesLoading && activeDetail?.messages) {
      scrollToBottom('smooth');
    }
  }, [activeDetail?.messages?.length]);

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

  // Send Text Message or Quick Inquiry
  const handleSendMessage = async (contentToSend?: string) => {
    const text = (contentToSend || messageInput).trim();
    if (!text || !activeConversationId) return;

    const meta: any = {};
    if (replyingToMessage) {
      meta.replyToMessageId = replyingToMessage.id;
      meta.replyToText = replyingToMessage.content;
      meta.replyToSender = replyingToMessage.senderRole;
    }

    setSending(true);
    try {
      const res = await api.messages.sendMessage(activeConversationId, text, 'TEXT', Object.keys(meta).length > 0 ? meta : undefined);
      setMessageInput('');
      setReplyingToMessage(null);
      setShowEmojiPicker(false);

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

      // Trigger realistic live Landlord typing indicator and automatic response if it's a student question
      if (isStudent && activeDetail) {
        setIsTyping(true);
        setTimeout(async () => {
          setIsTyping(false);
          const landlordName = activeDetail.conversation.provider.name;
          const propTitle = activeDetail.conversation.property.title;
          let replyContent = `Thank you for asking! At ${propTitle}, we ensure 24/7 security and steady utilities. Would you like to schedule an inspection tour?`;
          
          if (text.toLowerCase().includes('water')) {
            replyContent = `Yes! Clean borehole water runs 24/7 into all overhead storage tanks at ${propTitle}. You have direct running water in the room.`;
          } else if (text.toLowerCase().includes('electricity') || text.toLowerCase().includes('light')) {
            replyContent = `Electricity is very steady on our feeder line, and each room is equipped with its own dedicated prepaid meter.`;
          } else if (text.toLowerCase().includes('caution') || text.toLowerCase().includes('fee') || text.toLowerCase().includes('cost')) {
            replyContent = `The fee is transparent: rent is ${formatNaira(activeDetail.conversation.property.rentAmount)}/yr with zero hidden agency commission.`;
          } else if (text.toLowerCase().includes('inspection') || text.toLowerCase().includes('visit')) {
            replyContent = `You are welcome for an inspection tour! Please tap "Book Tour" at the top to pick your preferred date and time.`;
          }

          try {
            const autoRes = await api.messages.sendMessage(activeConversationId, replyContent, 'TEXT');
            setActiveDetail(prev => {
              if (!prev) return null;
              return { ...prev, messages: [...prev.messages, autoRes.message] };
            });
            setConversations(prev => prev.map(c => {
              if (c.id === activeConversationId) {
                return { ...c, lastMessageText: replyContent, lastMessageAt: new Date().toISOString() };
              }
              return c;
            }));
          } catch {}
        }, 1800);
      }

      inputRef.current?.focus();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  // Send Photo Snap
  const handleSendPhotoSnap = async (photoUrl: string, caption?: string) => {
    if (!activeConversationId) return;
    try {
      const res = await api.messages.sendMessage(
        activeConversationId,
        caption || '📸 Sent a Room Inspection Photo',
        'IMAGE',
        { imageUrl: photoUrl, imageCaption: caption }
      );
      setShowPhotoModal(false);

      setActiveDetail(prev => {
        if (!prev) return null;
        return { ...prev, messages: [...prev.messages, res.message] };
      });
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: '📷 Photo', lastMessageAt: new Date().toISOString() };
        }
        return c;
      }));
      onShowToast('Photo Snap sent successfully!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send photo', 'error');
    }
  };

  // Toggle Voice Note Recording Simulation
  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    voiceTimerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);
  };

  const handleStopAndSendVoiceRecording = async () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    const durationSec = Math.max(2, recordingSeconds);
    if (!activeConversationId) return;

    try {
      const res = await api.messages.sendMessage(
        activeConversationId,
        `🎙️ Voice Note (${durationSec}s)`,
        'AUDIO',
        { audioDuration: durationSec, audioUrl: '#' }
      );

      setActiveDetail(prev => {
        if (!prev) return null;
        return { ...prev, messages: [...prev.messages, res.message] };
      });
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: `🎙️ Voice Note (${durationSec}s)`, lastMessageAt: new Date().toISOString() };
        }
        return c;
      }));
      onShowToast('Voice note sent!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send voice note', 'error');
    }
  };

  const handleCancelVoiceRecording = () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Send Secure Gate / Inspection Passcode
  const handleSendGatePasscode = async () => {
    if (!activeConversationId || !activeDetail) return;
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const code = `HOSTEL-${randomPin}-SECURE`;
    try {
      const res = await api.messages.sendMessage(
        activeConversationId,
        `🔒 Official Inspection Access PIN: ${code}`,
        'SNAP_PASSCODE',
        { passcode: code, passcodeExpiry: 'Valid for 24 Hours' }
      );

      setActiveDetail(prev => {
        if (!prev) return null;
        return { ...prev, messages: [...prev.messages, res.message] };
      });
      onShowToast('Inspection gate passcode generated and sent!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send passcode', 'error');
    }
  };

  // Tapback Emoji Reaction Toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return;
    try {
      const res = await api.messages.toggleReaction(activeConversationId, messageId, emoji);
      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m => m.id === messageId ? { ...m, metadata: { ...m.metadata, reactions: res.reactions } } : m)
        };
      });
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  };

  // Direct In-Chat Hostel Tour & Inspection Booking Submission
  const handleBookTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetail || !activeConversationId) return;
    setBookingTour(true);
    try {
      const prop = activeDetail.conversation.property;
      const res = await api.inspections.request(prop.id, {
        inspectionType: tourType,
        preferredDate: tourDate,
        preferredTime: tourTime,
        studentPhone: studentPhoneInput.trim() || user?.phone || '08012345678',
        notes: tourNotes.trim() || undefined
      });

      const pin = `PASS-${Math.floor(1000 + Math.random() * 9000)}-LAUTECH`;
      const messageText = `📅 Inspection Tour Appointment Confirmed!\n• Visit Type: ${tourType === 'PHYSICAL' ? '🚶 Physical Walkthrough' : '📹 Live Video Tour'}\n• Scheduled: ${tourDate} at ${tourTime}\n• Gate Passcode: ${pin}\n• Location: ${prop.title} (${prop.areaName})\n• Landlord: ${activeDetail.conversation.provider.name}`;

      // Send verification pass directly into active conversation
      const chatRes = await api.messages.sendMessage(activeConversationId, messageText, 'SNAP_PASSCODE', {
        passcode: pin,
        passcodeExpiry: `${tourDate} at ${tourTime}`
      });

      setActiveDetail(prev => {
        if (!prev) return null;
        return { ...prev, messages: [...prev.messages, chatRes.message] };
      });

      setShowBookTourModal(false);
      onShowToast(res.message || 'Inspection tour booked successfully! Passcode sent to chat.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to book inspection', 'error');
    } finally {
      setBookingTour(false);
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
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
      {/* High-End Docked Messenger Container (Fixed Height Viewport - Zero Page Jumps!) */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6rem)] max-h-[860px]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION HUB (SLACK / SNAPCHAT STYLE CHAT LIST)           */}
        {/* ========================================================================= */}
        <div className={`md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/90 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-white tracking-tight">Direct Messages</h2>
                  <p className="text-[10px] text-slate-400 font-bold">Encrypted & Escrow Shielded</p>
                </div>
              </div>

              {isStudent && (
                <button
                  onClick={() => setShowNewChatSelector(true)}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-all cursor-pointer"
                  title="Inquire about any hostel"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-2 text-xs text-white focus-within:border-emerald-500 transition-colors shadow-inner">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search landlord, student, or hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-white placeholder:text-slate-500 text-xs font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer text-center ${
                  activeFilterTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setActiveFilterTab('unread')}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer text-center ${
                  activeFilterTab === 'unread'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1.5 space-y-1">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Syncing conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-300">No Conversations Found</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {isStudent
                    ? 'Tap the + button to select any verified hostel and message the landlord directly.'
                    : 'Incoming messages from interested students will appear here.'}
                </p>
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
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 border ${
                      isSelected 
                        ? 'bg-emerald-950/80 border-emerald-500/80 shadow-lg' 
                        : hasUnread 
                        ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40' 
                        : 'hover:bg-slate-850 bg-slate-900/40 border-transparent'
                    }`}
                  >
                    {/* Avatar with Snapchat/iMessage Active Dot */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-md ${
                        isStudent ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-indigo-500 to-purple-700'
                      }`}>
                        {otherPartyName ? otherPartyName.charAt(0).toUpperCase() : 'H'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Name & Timestamp */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-white truncate flex items-center gap-1">
                          <span>{otherPartyName}</span>
                          {isStudent && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-bold">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* Property Title */}
                      <p className="text-[11px] font-bold text-emerald-400 truncate">
                        🏢 {conv.propertyTitle} <span className="text-slate-500 font-normal">({conv.areaName})</span>
                      </p>

                      {/* Last Message Snippet */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className={`text-[11px] truncate ${hasUnread ? 'font-black text-white' : 'text-slate-400 font-medium'}`}>
                          {conv.lastMessageText || 'Tap to chat'}
                        </p>
                        {hasUnread && (
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full shrink-0">
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
        {/* RIGHT COLUMN: ADVANCED CHAT STREAM (SNAPCHAT / iMESSAGE GRADIENT CANVAS)   */}
        {/* ========================================================================= */}
        <div className={`md:col-span-8 flex flex-col bg-slate-950/95 relative overflow-hidden ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
          {!activeConversationId || !activeDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-3xl flex items-center justify-center shadow-inner border border-slate-800">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-white">Select an Accommodation Thread</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Chat directly with verified landlords to ask about water, electricity, caution fees, and send room photo snaps.
                </p>
              </div>
              {isStudent && (
                <button
                  onClick={() => setShowNewChatSelector(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer transition-all"
                >
                  Start New Hostel Inquiry
                </button>
              )}
            </div>
          ) : (
            <>
              {/* TOP STICKY CHAT HEADER: Profile, Status & Property Anchor */}
              <div className="p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-md space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setActiveConversationId(null)}
                      className="md:hidden p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-md">
                        {isStudent ? (activeDetail.conversation.provider.name?.charAt(0) || 'L') : (activeDetail.conversation.student.name?.charAt(0) || 'S')}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-white truncate">
                          {isStudent
                            ? activeDetail.conversation.provider.name
                            : activeDetail.conversation.student.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Verified Owner
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-bold truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online • Usually replies in &lt;15 mins</span>
                        {(activeDetail.conversation.provider as any)?.phone && (
                          <span className="text-slate-400 font-normal">• 📞 {(activeDetail.conversation.provider as any).phone}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowBookTourModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Book Hostel Inspection Tour"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Book Tour</span>
                    </button>

                    <button
                      onClick={handleSendGatePasscode}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                      title="Send Secure Gate Entry Passcode"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Passcode</span>
                    </button>

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                      title="Report User"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Property Compact Bar */}
                <div className="p-2 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs shadow-inner">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={activeDetail.conversation.property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                      alt={activeDetail.conversation.property.title}
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">
                        🏢 {activeDetail.conversation.property.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        📍 {activeDetail.conversation.property.areaName} ({formatDistance(activeDetail.conversation.property.distanceFromCampusKm)}) •{' '}
                        <strong className="text-emerald-400 font-black">{formatNaira(activeDetail.conversation.property.rentAmount)}/yr</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowInspectionDetailsModal(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                      title="View Verified Physical Inspection Details"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Inspect Details</span>
                    </button>

                    {onSelectProperty && (
                      <button
                        onClick={() => onSelectProperty(activeDetail.conversation.property.id)}
                        className="px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                        title="View Full Listing"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* MESSAGES FEED CONTAINER (Scroll strictly contained here!) */}
              <div
                ref={messagesContainerRef}
                className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
              >
                {messagesLoading ? (
                  <div className="py-20 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">Loading message history...</p>
                  </div>
                ) : activeDetail.messages.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-300">Start the conversation with {activeDetail.conversation.provider.name}</p>
                    <p className="text-[11px] text-slate-500">Pick a quick inquiry chip below or send a photo snap.</p>
                  </div>
                ) : (
                  activeDetail.messages.map(msg => {
                    const isMe = msg.senderId === user?.id || (isStudent && msg.senderRole === 'STUDENT') || (!isStudent && msg.senderRole === 'PROVIDER');
                    const isImage = msg.messageType === 'IMAGE' || Boolean(msg.metadata?.imageUrl);
                    const isAudio = msg.messageType === 'AUDIO' || Boolean(msg.metadata?.audioDuration);
                    const isPasscode = msg.messageType === 'SNAP_PASSCODE' || Boolean(msg.metadata?.passcode);
                    const isSystem = msg.messageType === 'SYSTEM_EVENT';
                    const reactions = msg.metadata?.reactions || {};

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="px-3.5 py-1.5 bg-slate-800/90 rounded-2xl text-[11px] font-bold text-slate-300 max-w-md text-center flex items-center gap-1.5 shadow-md border border-slate-700">
                            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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

                    const isSwipingThis = swipingMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        onTouchStart={(e) => {
                          setTouchStartX(e.touches[0].clientX);
                          setSwipingMessageId(msg.id);
                        }}
                        onTouchMove={(e) => {
                          if (touchStartX !== null) {
                            const diff = e.touches[0].clientX - touchStartX;
                            if (diff > 0 && diff < 80) {
                              setSwipeOffset(diff);
                            }
                          }
                        }}
                        onTouchEnd={() => {
                          if (swipeOffset > 35) {
                            setReplyingToMessage(msg);
                            onShowToast(`Replying to ${msg.senderRole === 'PROVIDER' ? 'Landlord' : 'Student'}`, 'info');
                            inputRef.current?.focus();
                          }
                          setTouchStartX(null);
                          setSwipingMessageId(null);
                          setSwipeOffset(0);
                        }}
                        style={{
                          transform: isSwipingThis && swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
                          transition: isSwipingThis ? 'none' : 'transform 0.2s ease-out'
                        }}
                        className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label */}
                        <span className="text-[9px] font-black text-slate-500 px-1 mb-0.5">
                          {senderLabel}
                        </span>

                        {/* Floating Snapchat / iMessage Tapback Reaction & Quick Reply Bar */}
                        {hoveredMessageId === msg.id && (
                          <div className={`absolute -top-7 z-10 flex items-center gap-1 bg-slate-850/95 border border-slate-700/80 rounded-full px-2 py-1 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-100 ${
                            isMe ? 'right-0' : 'left-0'
                          }`}>
                            {TAPBACK_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs p-0.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}

                            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                            {/* 1-Click Desktop Reply Action */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToMessage(msg);
                                inputRef.current?.focus();
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-750 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                              title="Swipe or click to reply"
                            >
                              <span>↩️ Reply</span>
                            </button>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-3xl text-xs font-medium space-y-2 shadow-lg relative ${
                            isMe
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-xs'
                              : 'bg-slate-800/90 text-white border border-slate-700/80 rounded-tl-xs'
                          }`}
                        >
                          {/* QUOTED / REPLIED MESSAGE PREVIEW PILL */}
                          {msg.metadata?.replyToText && (
                            <div className="p-2.5 rounded-2xl bg-black/35 border-l-2 border-emerald-400 text-[11px] mb-1.5 space-y-0.5">
                              <span className="font-black text-[10px] text-emerald-300 flex items-center gap-1 uppercase tracking-wider">
                                <span>↩ Quoting</span>
                                <span>{msg.metadata.replyToSender === 'PROVIDER' ? 'Landlord' : 'Student'}</span>
                              </span>
                              <p className="truncate opacity-90 text-[11px] italic font-normal">
                                "{msg.metadata.replyToText}"
                              </p>
                            </div>
                          )}

                          {/* 1. PHOTO SNAP MESSAGE */}
                          {isImage && msg.metadata?.imageUrl && (
                            <div className="space-y-1.5">
                              <div
                                onClick={() => setPreviewImage({ url: msg.metadata?.imageUrl!, caption: msg.metadata?.imageCaption })}
                                className="relative rounded-2xl overflow-hidden cursor-pointer group/img border border-white/10"
                              >
                                <img
                                  src={msg.metadata.imageUrl}
                                  alt="Room Snap"
                                  className="w-full max-h-60 object-cover group-hover/img:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[11px] gap-1">
                                  <Eye className="w-4 h-4" />
                                  <span>Tap to Expand Snap</span>
                                </div>
                              </div>
                              {msg.metadata.imageCaption && (
                                <p className="text-[11px] font-medium opacity-90">{msg.metadata.imageCaption}</p>
                              )}
                            </div>
                          )}

                          {/* 2. AUDIO / VOICE NOTE MESSAGE */}
                          {isAudio && (
                            <div className="flex items-center gap-3 py-1">
                              <button
                                onClick={() => setActiveVoiceNoteId(activeVoiceNoteId === msg.id ? null : msg.id)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95 ${
                                  isMe ? 'bg-white text-emerald-800' : 'bg-emerald-500 text-slate-950'
                                }`}
                              >
                                {activeVoiceNoteId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                              </button>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1 h-5">
                                  {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50].map((h, i) => (
                                    <span
                                      key={i}
                                      style={{ height: `${h}%` }}
                                      className={`w-1 rounded-full transition-all ${
                                        activeVoiceNoteId === msg.id
                                          ? 'bg-amber-300 animate-pulse'
                                          : isMe ? 'bg-emerald-200' : 'bg-slate-400'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="flex justify-between text-[9px] opacity-75">
                                  <span>{activeVoiceNoteId === msg.id ? 'Playing...' : 'Voice Note'}</span>
                                  <span>0:{msg.metadata?.audioDuration ? String(msg.metadata.audioDuration).padStart(2, '0') : '12'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. SECURE PASSCODE MESSAGE */}
                          {isPasscode && msg.metadata?.passcode && (
                            <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/40 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 uppercase">
                                  <Key className="w-3.5 h-3.5" />
                                  Official Gate Tour Passcode
                                </span>
                                <span className="text-[9px] text-slate-400">Valid 24h</span>
                              </div>
                              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
                                <code className="text-sm font-black text-emerald-400 font-mono tracking-widest">
                                  {msg.metadata.passcode}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.metadata?.passcode!);
                                    setCopiedPasscodeId(msg.id);
                                    setTimeout(() => setCopiedPasscodeId(null), 2000);
                                    onShowToast('Passcode copied to clipboard!', 'success');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedPasscodeId === msg.id ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedPasscodeId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 4. REGULAR TEXT CONTENT */}
                          {!isImage && !isAudio && !isPasscode && (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}

                          {/* Timestamp and Delivery Ticks */}
                          <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-amber-300' : 'text-emerald-200'}`} />
                            )}
                          </div>
                        </div>

                        {/* Reaction Badges */}
                        {Object.keys(reactions).length > 0 && (
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] flex items-center gap-1 shadow-md hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-bold text-white">{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Live "Landlord is typing..." indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs animate-in fade-in">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {activeDetail.conversation.provider.name.charAt(0)}
                    </div>
                    <div className="p-3 bg-slate-800 rounded-2xl rounded-tl-xs border border-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK INQUIRY SMART CHIPS */}
              {isStudent && (
                <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-emerald-400 inline" />
                    Quick Ask:
                  </span>
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q.text)}
                      className="px-3 py-1 bg-slate-800/80 hover:bg-emerald-950/80 text-slate-300 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <span>{q.icon}</span>
                      <span>"{q.text}"</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ADVANCED MESSAGE COMPOSER (SNAPCHAT / iMESSAGE TOOLBAR) */}
              <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 shadow-xl shrink-0">
                {/* Voice Note Recording Live Bar */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl animate-pulse">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-black">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      <span>Recording Voice Memo... (0:{String(recordingSeconds).padStart(2, '0')})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelVoiceRecording}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleStopAndSendVoiceRecording}
                        className="px-4 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Audio</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Active Quoted Message Banner */}
                    {replyingToMessage && (
                      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/95 border-l-4 border-emerald-500 rounded-2xl mb-2.5 text-xs shadow-md animate-in slide-in-from-bottom-2">
                        <div className="min-w-0 pr-2">
                          <span className="font-black text-[10px] text-emerald-400 uppercase tracking-wider block">
                            ↩ Replying to {replyingToMessage.senderRole === 'PROVIDER' ? 'Landlord' : 'Student'}
                          </span>
                          <p className="text-slate-300 text-xs truncate max-w-lg mt-0.5 italic font-normal">
                            "{replyingToMessage.content}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingToMessage(null)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Cancel reply"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2 relative"
                    >
                    {/* Media Snap Buttons */}
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Send Room Inspection Photo Snap"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Voice Memo Button */}
                    <button
                      type="button"
                      onClick={handleStartVoiceRecording}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Emoji Picker Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Emoji Reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Quick Emojis Flyout */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-16 left-0 z-20 bg-slate-850 border border-slate-700 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in zoom-in-95">
                        {['👍', '🔥', '❤️', '🏡', '⚡', '💧', '🤝', '🔑', '🙏', '😊'].map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setMessageInput(prev => prev + em);
                              setShowEmojiPicker(false);
                            }}
                            className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Main Text Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={
                        isStudent
                          ? `Message ${activeDetail.conversation.provider.name}...`
                          : `Reply to ${activeDetail.conversation.student.name}...`
                      }
                      className="flex-1 px-4 py-3 bg-slate-800 text-white placeholder:text-slate-500 rounded-2xl border border-slate-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={sending || !messageInput.trim()}
                      className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PHOTO SNAP MODAL (SNAPCHAT STYLE PHOTO SELECTOR) */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  Send Room Inspection Photo Snap
                </h3>
                <p className="text-xs text-slate-400">Share instant live inspection photos with the other party.</p>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
              {ROOM_PHOTO_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendPhotoSnap(preset.url, preset.title)}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 rounded-2xl overflow-hidden cursor-pointer transition-all group shadow-md"
                >
                  <img
                    src={preset.url}
                    alt={preset.title}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-3 space-y-1">
                    <h4 className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                      {preset.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {preset.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX VIEWER */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage.url}
            alt="Snap Preview"
            className="max-w-4xl max-h-[80vh] object-contain rounded-3xl shadow-2xl"
          />
          {previewImage.caption && (
            <p className="text-white text-sm font-bold mt-4 max-w-lg text-center bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700">
              {previewImage.caption}
            </p>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INSPECTION DETAILS & PHYSICAL VERIFICATION AUDIT MODAL                 */}
      {/* ========================================================================= */}
      {showInspectionDetailsModal && activeDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    Physical Inspection & Verification Audit
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hostel Ease On-Site Verification for <strong className="text-emerald-400">{activeDetail.conversation.property.title}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInspectionDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Summary Banner */}
            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={activeDetail.conversation.property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                  alt={activeDetail.conversation.property.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h4 className="font-black text-white text-sm">{activeDetail.conversation.property.title}</h4>
                  <p className="text-slate-400 text-[11px]">
                    📍 {activeDetail.conversation.property.areaName} ({formatDistance(activeDetail.conversation.property.distanceFromCampusKm)} to campus)
                  </p>
                  <p className="text-emerald-400 font-black text-xs pt-0.5">
                    {formatNaira(activeDetail.conversation.property.rentAmount)}/yr • Verified Landlord: {activeDetail.conversation.provider.name}
                  </p>
                </div>
              </div>
            </div>

            {/* 8-Point Physical Inspection Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Physical Verification Checklist (Audit Score: 100% Passed)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>Running Water & Borehole</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Dedicated overhead storage tank. Running water verified inside room & bathroom.
                  </p>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Electricity & Prepaid Meter</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Dedicated prepaid meter per room on the primary neighborhood feeder line.
                  </p>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Perimeter Gate & Security</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Lockable steel gate with resident access key, perimeter lighting, and caretaker presence.
                  </p>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-400">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Private Ensuite Bathroom</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Private tiled bathroom with functional shower, toilet flush, and soakaway drainage.
                  </p>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Room Ventilation & Mesh</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Large cross-ventilated windows equipped with mosquito netting and burglar-proof iron bars.
                  </p>
                </div>

                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-700/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Zero Agent Commission</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    100% direct from verified landlord. Fully protected by Hostel Ease Escrow Shield.
                  </p>
                </div>
              </div>
            </div>

            {/* Meeting Point & Directions */}
            <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-1.5 text-xs">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Meeting & Navigation Directions
              </span>
              <p className="text-slate-300 font-medium">
                📍 Location: {activeDetail.conversation.property.areaName}, near LAUTECH Campus, Ogbomoso.
              </p>
              <p className="text-slate-400 text-[11px]">
                When visiting, meet the landlord or resident caretaker at the main gate. Present your digital Inspection Passcode.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInspectionDetailsModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowInspectionDetailsModal(false);
                  setShowBookTourModal(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Inspection Tour</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOOK INSPECTION TOUR MODAL                                             */}
      {/* ========================================================================= */}
      {showBookTourModal && activeDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Book Hostel Inspection Tour
                </h3>
                <p className="text-xs text-slate-400">
                  Pick your preferred date & time to tour {activeDetail.conversation.property.title}.
                </p>
              </div>
              <button
                onClick={() => setShowBookTourModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookTourSubmit} className="space-y-4 text-xs">
              {/* Tour Type */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Tour Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTourType('PHYSICAL')}
                    className={`p-3 rounded-2xl font-bold border text-center transition-all cursor-pointer ${
                      tourType === 'PHYSICAL'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    🚶 Physical Walkthrough
                  </button>
                  <button
                    type="button"
                    onClick={() => setTourType('VIRTUAL')}
                    className={`p-3 rounded-2xl font-bold border text-center transition-all cursor-pointer ${
                      tourType === 'VIRTUAL'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    📹 Live Video Call Tour
                  </button>
                </div>
              </div>

              {/* Preferred Date */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Preferred Date</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Tomorrow', 'This Saturday', 'This Sunday'].map((label, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() + (idx === 0 ? 1 : idx === 1 ? (6 - d.getDay() + 7) % 7 || 7 : (7 - d.getDay() + 7) % 7 || 7));
                    const dateStr = d.toISOString().split('T')[0];
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setTourDate(dateStr)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all cursor-pointer ${
                          tourDate === dateStr
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {label} ({dateStr.slice(5)})
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={tourDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 text-white rounded-xl border border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>

              {/* Preferred Time Slot */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Preferred Time Slot</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '05:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTourTime(slot)}
                      className={`py-2 rounded-xl font-bold text-[11px] border transition-all text-center cursor-pointer ${
                        tourTime === slot
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Phone */}
              <div className="space-y-1">
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Your Phone Number (For Landlord Contact)</label>
                <input
                  type="tel"
                  value={studentPhoneInput}
                  onChange={(e) => setStudentPhoneInput(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 bg-slate-800 text-white rounded-xl border border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Questions or Specific Requests (Optional)</label>
                <input
                  type="text"
                  value={tourNotes}
                  onChange={(e) => setTourNotes(e.target.value)}
                  placeholder="e.g. Would like to test the borehole water pressure and inspect room #4..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 text-white rounded-xl border border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookTourModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingTour}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{bookingTour ? 'Confirming Tour...' : 'Confirm & Generate Passcode'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

