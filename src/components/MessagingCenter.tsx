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
  Paperclip,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { ConversationItem, ConversationDetail, MessageItem, Property } from '../types/hostelEase';
import { api, getMediaUrl } from '../services/api';
import { DEFAULT_PROPERTIES } from '../services/offlineFallback';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { formatPresence } from '../utils/presence';
import { ReportUserModal } from './ReportUserModal';
import { ChatImageModal } from './ChatImageModal';
import { playMessageNotificationSound } from '../utils/sound';

interface MessagingCenterProps {
  initialPropertyId?: string | null;
  initialConversationId?: string | null;
  onSelectProperty?: (propertyId: string) => void;
  onRequestInspection?: (propertyId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onViewOnMap?: (address: string) => void;
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
  initialConversationId,
  onSelectProperty,
  onRequestInspection,
  onShowToast,
  onViewOnMap
}) => {
  const { user, isLoading } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  // Conversations and active state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [resolvingPropertyId, setResolvingPropertyId] = useState<string | null>(initialPropertyId || null);
  const resolvingPropertyRef = useRef<string | null>(null);
  
  // UI states
  const [messageInput, setMessageInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread'>('all');
  const [conversationsError, setConversationsError] = useState<boolean>(false);
  const [activeThreadError, setActiveThreadError] = useState<boolean>(false);

  // Advanced Snapchat / iMessage Features
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingCustomText, setTypingCustomText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlayProgress, setAudioPlayProgress] = useState<Record<string, number>>({});
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [copiedPasscodeId, setCopiedPasscodeId] = useState<string | null>(null);

  // WhatsApp Features State
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showChatMenu, setShowChatMenu] = useState<boolean>(false);
  const [showInChatSearch, setShowInChatSearch] = useState<boolean>(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState<string>('');
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'DELETE_MESSAGE' | 'CLEAR_CHAT' | 'DELETE_CONVERSATION';
    messageId?: string;
    conversationId?: string;
    targetName?: string;
  } | null>(null);

  // Full-Screen Profile / Hostel Image Preview Modal
  const [fullScreenImage, setFullScreenImage] = useState<{
    imageUrl: string;
    title: string;
    subtitle?: string;
    isOnline?: boolean;
    presenceText?: string;
  } | null>(null);

  // Presence heartbeat loop while active on messaging screen
  useEffect(() => {
    if (!user) return;
    
    // Immediate heartbeat
    api.presence.heartbeat().catch(() => {});

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.presence.heartbeat().catch(() => {});
      }
    }, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        api.presence.heartbeat().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  // Real Audio Recording & Playback References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioIntervalRef = useRef<any>(null);

  // Play Real Voice Note (WhatsApp style playback)
  const playVoiceNote = (msgId: string, durationSec: number, audioUrl?: string) => {
    // If clicking on the currently playing audio, toggle pause
    if (playingAudioId === msgId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      clearInterval(audioIntervalRef.current);
      setPlayingAudioId(null);
      return;
    }

    // Stop any previously playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    clearInterval(audioIntervalRef.current);

    setPlayingAudioId(msgId);
    setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));

    // If real recorded audio is present (base64 Data URL, blob URL, or HTTP URL)
    if (audioUrl && audioUrl !== '#' && (audioUrl.startsWith('data:audio') || audioUrl.startsWith('http') || audioUrl.startsWith('blob:'))) {
      try {
        const audio = new Audio(audioUrl);
        audio.playbackRate = playbackSpeed;
        currentAudioRef.current = audio;

        audio.ontimeupdate = () => {
          const currentSec = Math.floor(audio.currentTime);
          setAudioPlayProgress(prev => ({ ...prev, [msgId]: currentSec }));
        };

        audio.onended = () => {
          setPlayingAudioId(null);
          setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingAudioId(null);
          currentAudioRef.current = null;
        };

        audio.play().catch(() => {
          setPlayingAudioId(null);
          currentAudioRef.current = null;
        });
        return;
      } catch (err) {
        console.warn('Audio playback error:', err);
      }
    }

    // For legacy messages without recorded audio, just advance progress bar silently without fake sounds
    let currentSec = 0;
    audioIntervalRef.current = setInterval(() => {
      currentSec += 1;
      setAudioPlayProgress(prev => ({ ...prev, [msgId]: currentSec }));
      if (currentSec >= durationSec) {
        clearInterval(audioIntervalRef.current);
        setPlayingAudioId(null);
        setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearInterval(audioIntervalRef.current);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

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
  const typingTimerRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (!activeConversationId) return;

    const now = Date.now();
    // Throttle typing heartbeats to server (at most once every 2 seconds)
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      api.messages.setTyping(activeConversationId, true).catch(() => {});
    }

    // Reset 3s inactivity timer to mark typing false
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (activeConversationId) {
        api.messages.setTyping(activeConversationId, false).catch(() => {});
      }
    }, 3000);
  };

  const stopTypingNow = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (activeConversationId) {
      api.messages.setTyping(activeConversationId, false).catch(() => {});
    }
  };

  // Clear typing on conversation switch or unmount
  useEffect(() => {
    return () => {
      stopTypingNow();
    };
  }, [activeConversationId]);

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
    setConversationsError(false);
    try {
      const res = await api.messages.getConversations();
      const convs = res.conversations || [];
      setConversations(convs);

      const targetId = preferredSelectId || activeConversationId;
      if (targetId) {
        const item = convs.find(c => c.id === targetId);
        selectAndLoadConversation(targetId, false, item || convs[0]);
      } else if (convs.length > 0 && !resolvingPropertyRef.current && !initialPropertyId) {
        // Auto-select first conversation on wider desktop screens ONLY if not currently resolving a property chat
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          selectAndLoadConversation(convs[0].id, false, convs[0]);
        }
      }
    } catch (err) {
      console.error('[MessagingCenter] Failed to load conversations:', err);
      setConversationsError(true);
    } finally {
      setLoading(false);
    }
  };

  const selectAndLoadConversation = async (convId: string, forceReload = false, fallbackItem?: ConversationItem) => {
    if (!convId) return;

    const currentItem = fallbackItem || conversations.find(c => c.id === convId);

    // If already active with detail and not forcing reload, return
    if (convId === activeConversationId && activeDetail && !forceReload) {
      return;
    }

    setActiveConversationId(convId);
    // Immediately clear unreadCount in local state so UI updates in 0ms without waiting for network
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    setMessagesLoading(true);
    setActiveThreadError(false);

    // Trigger backend mark-as-read immediately
    api.messages.markAsRead(convId).then(() => {
      window.dispatchEvent(new CustomEvent('hostel_ease_notification_updated'));
      window.dispatchEvent(new CustomEvent('hostel_ease_conversations_updated'));
    }).catch(() => {});

    // Optimistically initialize activeDetail from conversation summary so UI opens instantly without blank screen
    if (currentItem && (!activeDetail || activeDetail.conversation.id !== convId)) {
      setActiveDetail({
        conversation: {
          id: convId,
          property: {
            id: currentItem.propertyId || 'prop-default',
            title: currentItem.propertyTitle || 'Hostel Accommodation',
            address: currentItem.propertyAddress || 'LAUTECH Area, Ogbomoso',
            areaName: currentItem.areaName || 'Under G',
            propertyType: 'SELF_CONTAIN',
            distanceFromCampusKm: 0.5,
            rentAmount: 0,
            totalMandatoryCost: 0,
            coverImage: currentItem.propertyCoverImage || currentItem.avatarUrl || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85'
          },
          student: {
            id: currentItem.studentId || 'student',
            name: currentItem.studentName || 'Student',
            avatarUrl: currentItem.avatarUrl || null,
            isOnline: Boolean(currentItem.isOnline),
            lastSeenAt: currentItem.lastSeenAt || null
          },
          provider: {
            id: currentItem.providerId || 'provider',
            name: currentItem.providerName || 'Verified Agent',
            avatarUrl: currentItem.avatarUrl || currentItem.propertyCoverImage || null,
            isOnline: Boolean(currentItem.isOnline),
            lastSeenAt: currentItem.lastSeenAt || null
          },
          status: currentItem.status || 'ACTIVE',
          createdAt: currentItem.createdAt || new Date().toISOString()
        },
        messages: [],
        typingUser: null
      });
    }

    try {
      const res = await api.messages.getConversation(convId);
      if (res) {
        setActiveDetail(res);
        setTimeout(() => scrollToBottom('auto'), 50);
      }

      // Re-confirm conversation unread badge cleared in local list
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('[MessagingCenter] Failed to load conversation messages:', err);
      setActiveThreadError(true);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Open and foreground conversation for a specific hostel property
  const openPropertyConversation = async (propertyId: string, studentId?: string) => {
    if (!propertyId || !propertyId.trim()) return;
    if (!user) return;
    const cleanPropId = propertyId.trim();

    // Look up hostel and agent information immediately
    const propertyInfo = availableHostels.find(p => p.id === cleanPropId || (p as any).slug === cleanPropId) ||
      DEFAULT_PROPERTIES.find(p => p.id === cleanPropId || (p as any).slug === cleanPropId);

    // 1. Check if we already have this conversation loaded in memory list
    const existingConv = conversations.find(c => c.propertyId === cleanPropId && (!studentId || c.studentId === studentId));
    if (existingConv) {
      setActiveConversationId(existingConv.id);
      await selectAndLoadConversation(existingConv.id, true, existingConv);
      resolvingPropertyRef.current = null;
      setResolvingPropertyId(null);
      return;
    }

    resolvingPropertyRef.current = cleanPropId;
    setResolvingPropertyId(cleanPropId);
    setMessagesLoading(true);
    setActiveThreadError(false);

    // Immediately initialize activeDetail optimistically so the chat screen opens in 0ms!
    const targetConvId = `conv_${user.id}_${cleanPropId}`;
    setActiveConversationId(targetConvId);

    const pTitle = propertyInfo?.title || 'Hostel Accommodation';
    const pAddress = propertyInfo?.address || 'LAUTECH Area, Ogbomoso';
    const pArea = propertyInfo?.area?.name || (propertyInfo as any)?.areaName || 'Under G';
    const pCover = propertyInfo?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
    const pAgentName = propertyInfo?.provider?.name || (propertyInfo as any)?.providerName || 'Verified Agent';
    const pAgentAvatar = (propertyInfo?.provider as any)?.avatarUrl || pCover;
    const pRent = propertyInfo?.priceSummary?.rentAmount || 0;
    const pTotal = propertyInfo?.priceSummary?.totalMandatoryCost || pRent;
    const pAgentId = (propertyInfo as any)?.providerId || (propertyInfo?.provider as any)?.id || 'user-provider-default';

    setActiveDetail({
      conversation: {
        id: targetConvId,
        property: {
          id: cleanPropId,
          title: pTitle,
          address: pAddress,
          areaName: pArea,
          propertyType: (propertyInfo?.propertyType as any) || 'SELF_CONTAIN',
          distanceFromCampusKm: propertyInfo?.distanceFromCampusKm || 0.5,
          rentAmount: pRent,
          totalMandatoryCost: pTotal,
          coverImage: pCover
        },
        student: {
          id: user.id,
          name: user.fullName || 'Student',
          avatarUrl: user.avatarUrl || null,
          isOnline: true,
          lastSeenAt: new Date().toISOString()
        },
        provider: {
          id: pAgentId,
          name: pAgentName,
          avatarUrl: pAgentAvatar,
          isOnline: false,
          lastSeenAt: null
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      },
      messages: [],
      typingUser: null
    });

    try {
      // 2. Resolve or create on backend (single source of truth with deduplication)
      const res = await api.messages.startConversation(cleanPropId, undefined, studentId);
      if (res && res.conversationId) {
        setActiveConversationId(res.conversationId);

        // Update activeDetail from server returned conversation
        if (res.conversation) {
          const c = res.conversation;
          setActiveDetail(prev => ({
            conversation: {
              id: res.conversationId,
              property: {
                id: c.propertyId || cleanPropId,
                title: c.propertyTitle || pTitle,
                address: c.propertyAddress || pAddress,
                areaName: c.areaName || pArea,
                propertyType: 'SELF_CONTAIN',
                distanceFromCampusKm: propertyInfo?.distanceFromCampusKm || 0.5,
                rentAmount: pRent,
                totalMandatoryCost: pTotal,
                coverImage: c.propertyCoverImage || c.avatarUrl || pCover
              },
              student: {
                id: c.studentId || user.id,
                name: (c as any).studentName || user.fullName || 'Student',
                avatarUrl: user.avatarUrl || null,
                isOnline: Boolean(c.isOnline),
                lastSeenAt: c.lastSeenAt || null
              },
              provider: {
                id: c.providerId || pAgentId,
                name: c.providerName || pAgentName,
                avatarUrl: c.avatarUrl || (c as any).providerAvatarUrl || pAgentAvatar,
                isOnline: Boolean(c.isOnline),
                lastSeenAt: c.lastSeenAt || null
              },
              status: c.status || 'ACTIVE',
              createdAt: c.createdAt || new Date().toISOString()
            },
            messages: prev?.messages || [],
            typingUser: null
          }));
        }

        // 3. Concurrently load full message history
        try {
          const detailRes = await api.messages.getConversation(res.conversationId);
          if (detailRes && detailRes.messages) {
            setActiveDetail(detailRes);
            setTimeout(() => scrollToBottom('auto'), 50);
          }
        } catch (detailErr) {
          console.warn('[MessagingCenter] Could not load message history:', detailErr);
        }

        // 4. Update conversations list in background so sidebar stays in sync
        api.messages.getConversations().then(listRes => {
          if (listRes?.conversations) {
            setConversations(listRes.conversations);
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[MessagingCenter] Background startConversation note:', err);
      // Keep optimistic activeDetail active so user is never stranded on empty view
      setActiveThreadError(false);
    } finally {
      resolvingPropertyRef.current = null;
      setResolvingPropertyId(null);
      setMessagesLoading(false);
    }
  };

  // Reset all conversation state when authenticated user changes or logs out (Strict Session Isolation)
  useEffect(() => {
    setConversations([]);
    setActiveConversationId(null);
    setActiveDetail(null);
    setResolvingPropertyId(null);
    resolvingPropertyRef.current = null;
  }, [user?.id]);

  // If initialConversationId or initialPropertyId is provided from a hostel card or inspection click, open that exact conversation
  useEffect(() => {
    if (!user || isLoading) return;
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      loadConversations(initialConversationId);
    } else if (initialPropertyId) {
      openPropertyConversation(initialPropertyId);
    } else {
      loadConversations();
    }
  }, [initialConversationId, initialPropertyId, user?.id, isLoading]);

  // Instant notification navigation listener (even when already on messages screen)
  useEffect(() => {
    const handleOpenConv = (e: any) => {
      const convId = e.detail?.conversationId;
      const propId = e.detail?.propertyId;
      const studentId = e.detail?.studentId;
      if (convId) {
        setActiveConversationId(convId);
        loadConversations(convId);
      } else if (propId) {
        openPropertyConversation(propId, studentId);
      }
    };
    window.addEventListener('hostel_ease_open_conversation', handleOpenConv);
    return () => window.removeEventListener('hostel_ease_open_conversation', handleOpenConv);
  }, []);

  // Synchronize URL hash with active conversation for persistence on refresh
  useEffect(() => {
    if (activeConversationId) {
      try {
        const expectedHash = `#messages?conversationId=${encodeURIComponent(activeConversationId)}`;
        if (window.location.hash !== expectedHash) {
          window.history.replaceState(
            { view: 'messages', conversationId: activeConversationId },
            '',
            expectedHash
          );
        }
      } catch {}
    }
  }, [activeConversationId]);

  // Active cross-device real-time sync (poll every 2.5 seconds when document is visible)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        // Silently update conversations list
        api.messages.getConversations().then(res => {
          if (res?.conversations) {
            // Check for new incoming messages across all conversations to play chime
            res.conversations.forEach(c => {
              const prevC = conversations.find(p => p.id === c.id);
              if (prevC && (c.unreadCount || 0) > (prevC.unreadCount || 0)) {
                playMessageNotificationSound(`conv-notif-${c.id}-${c.lastMessageAt}`, c.studentId === user?.id ? c.providerId : c.studentId, user?.id);
              }
            });
            // If the user currently has an active conversation open on screen, ensure its unread count stays 0
            const sanitized = res.conversations.map(c => {
              if (c.id === activeConversationId) {
                return { ...c, unreadCount: 0 };
              }
              return c;
            });
            setConversations(sanitized);
          }
        }).catch(() => {});

        // If an active conversation is open, poll latest messages and typing status silently
        if (activeConversationId) {
          api.messages.getConversation(activeConversationId).then(res => {
            if (res && res.messages) {
              setActiveDetail(prev => {
                if (!prev) return res;
                const prevMsgs = prev.messages || [];
                const newMsgs = res.messages || [];

                // Check for new incoming messages in active conversation to trigger chime
                if (newMsgs.length > prevMsgs.length) {
                  const newestMsg = newMsgs[newMsgs.length - 1];
                  if (newestMsg && newestMsg.senderId !== user?.id) {
                    playMessageNotificationSound(newestMsg.id, newestMsg.senderId, user?.id, newestMsg.createdAt);
                  }
                }

                const msgsChanged = prevMsgs.length !== newMsgs.length ||
                  (newMsgs.length > 0 && prevMsgs.length > 0 && newMsgs[newMsgs.length - 1].id !== prevMsgs[prevMsgs.length - 1].id) ||
                  newMsgs.some((m, i) => m.isRead !== prevMsgs[i]?.isRead);
                const typingChanged = (prev.typingUser?.userId !== res.typingUser?.userId) ||
                  (prev.typingUser?.userName !== res.typingUser?.userName);
                const presenceChanged = 
                  prev.conversation.student?.isOnline !== res.conversation.student?.isOnline ||
                  prev.conversation.provider?.isOnline !== res.conversation.provider?.isOnline;

                if (msgsChanged || typingChanged || presenceChanged) {
                  return res;
                }
                return prev;
              });

              // If there are unread messages from the other user while this conversation is open, mark as read
              const hasUnreadFromOther = res.messages.some(m => !m.isRead && m.senderId !== user?.id);
              if (hasUnreadFromOther) {
                api.messages.markAsRead(activeConversationId).then(() => {
                  window.dispatchEvent(new CustomEvent('hostel_ease_notification_updated'));
                  window.dispatchEvent(new CustomEvent('hostel_ease_conversations_updated'));
                }).catch(() => {});
              }
            }
          }).catch(() => {});
        }
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [activeConversationId, user?.id, conversations]);

  // Synchronize read/unread state on tab focus & iOS Safari restore (pageshow)
  useEffect(() => {
    const handleSyncOnVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadConversations(activeConversationId || undefined);
        if (activeConversationId) {
          api.messages.getConversation(activeConversationId).then(res => {
            if (res) setActiveDetail(res);
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnVisible);
    window.addEventListener('pageshow', handleSyncOnVisible);

    return () => {
      document.removeEventListener('visibilitychange', handleSyncOnVisible);
      window.removeEventListener('pageshow', handleSyncOnVisible);
    };
  }, [activeConversationId]);

  // Handle immediate refresh when message shortcut icon is clicked in Navbar
  useEffect(() => {
    const handleRefreshMessages = () => {
      loadConversations(activeConversationId || undefined);
      if (activeConversationId) {
        selectAndLoadConversation(activeConversationId, true);
      }
    };
    window.addEventListener('hostel_ease_refresh_messages', handleRefreshMessages);
    return () => window.removeEventListener('hostel_ease_refresh_messages', handleRefreshMessages);
  }, [activeConversationId]);

  // Load message detail whenever activeConversationId changes from an external prop or route
  useEffect(() => {
    if (!activeConversationId) {
      setActiveDetail(null);
      return;
    }
    // Only load if activeDetail is missing or has a different ID
    if (!activeDetail || activeDetail.conversation.id !== activeConversationId) {
      const item = conversations.find(c => c.id === activeConversationId);
      selectAndLoadConversation(activeConversationId, false, item);
    }
  }, [activeConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesLoading && activeDetail?.messages) {
      scrollToBottom('smooth');
    }
  }, [activeDetail?.messages?.length]);

  const handleSelectConversation = (convId: string) => {
    const item = conversations.find(c => c.id === convId);
    selectAndLoadConversation(convId, true, item);
  };

  const handleStartNewChatWithHostel = async (propertyId: string) => {
    try {
      const res = await api.messages.startConversation(propertyId);
      setShowNewChatSelector(false);
      setActiveConversationId(res.conversationId);
      loadConversations(res.conversationId);
      onShowToast('Direct chat opened with verified agent', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to start conversation', 'error');
    }
  };

  // Send Text Message or Quick Inquiry with Optimistic State and Failure Handling
  const handleSendMessage = async (contentToSend?: string) => {
    const text = (contentToSend || messageInput).trim();
    if (!text || !activeConversationId) return;

    const meta: any = {};
    if (replyingToMessage) {
      meta.replyToMessageId = replyingToMessage.id;
      meta.replyToText = replyingToMessage.content;
      meta.replyToSender = replyingToMessage.senderRole;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: MessageItem = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: user?.id || 'me',
      senderRole: isStudent ? 'STUDENT' : 'PROVIDER',
      messageType: 'TEXT',
      content: text,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
      isRead: false,
      createdAt: new Date().toISOString(),
      isSending: true,
      isFailed: false,
    };

    // Optimistically show message immediately
    setActiveDetail(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage]
      };
    });

    stopTypingNow();
    setMessageInput('');
    setReplyingToMessage(null);
    setShowEmojiPicker(false);
    setSending(true);

    try {
      let res: any;
      try {
        res = await api.messages.sendMessage(activeConversationId, text, 'TEXT', Object.keys(meta).length > 0 ? meta : undefined);
      } catch (sendErr: any) {
        // Fallback: If conversation has not been registered on backend yet, start it with this message
        if (activeDetail?.conversation?.property?.id) {
          const started = await api.messages.startConversation(activeDetail.conversation.property.id, text);
          if (started && started.conversationId) {
            setActiveConversationId(started.conversationId);
            res = {
              message: {
                id: `msg-${Date.now()}`,
                conversationId: started.conversationId,
                senderId: user?.id || 'me',
                senderRole: isStudent ? 'STUDENT' : 'PROVIDER',
                messageType: 'TEXT',
                content: text,
                isRead: false,
                createdAt: new Date().toISOString()
              }
            };
          } else {
            throw sendErr;
          }
        } else {
          throw sendErr;
        }
      }

      // Replace optimistic message with server-confirmed message
      setActiveDetail(prev => {
        if (!prev) return null;
        let updatedMsgs = prev.messages.map(m => m.id === tempId ? { ...res.message, isSending: false, isFailed: false } : m);
        if (res.autoReply && !updatedMsgs.some(m => m.id === res.autoReply.id)) {
          updatedMsgs = [...updatedMsgs, { ...res.autoReply, isSending: false, isFailed: false }];
          playMessageNotificationSound(res.autoReply.id, res.autoReply.senderId, user?.id, res.autoReply.createdAt);
        }
        return {
          ...prev,
          messages: updatedMsgs
        };
      });

      // Update last message preview in conversations list
      const latestSnippet = res.autoReply ? res.autoReply.content : text;
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: latestSnippet, lastMessageAt: new Date().toISOString(), unreadCount: 0 };
        }
        return c;
      }));

      window.dispatchEvent(new CustomEvent('hostel_ease_conversations_updated'));

      inputRef.current?.focus();
    } catch (err: any) {
      // Mark optimistic message as failed for retry
      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m => m.id === tempId ? { ...m, isSending: false, isFailed: true } : m)
        };
      });
      onShowToast(err.message || 'Failed to send message. Tap retry.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleRetrySendMessage = async (failedMsg: MessageItem) => {
    if (!activeConversationId) return;

    // Set sending state on the failed message
    setActiveDetail(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: prev.messages.map(m => m.id === failedMsg.id ? { ...m, isSending: true, isFailed: false } : m)
      };
    });

    try {
      const res = await api.messages.sendMessage(
        activeConversationId,
        failedMsg.content,
        failedMsg.messageType || 'TEXT',
        failedMsg.metadata
      );

      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m => m.id === failedMsg.id ? { ...res.message, isSending: false, isFailed: false } : m)
        };
      });

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, lastMessageText: failedMsg.content, lastMessageAt: new Date().toISOString() };
        }
        return c;
      }));
    } catch (err: any) {
      setActiveDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map(m => m.id === failedMsg.id ? { ...m, isSending: false, isFailed: true } : m)
        };
      });
      onShowToast(err.message || 'Retry failed. Please check connection.', 'error');
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

  // Real Microphone Voice Note Recording via MediaRecorder API
  const handleStartVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onShowToast('Microphone recording is not supported in this browser.', 'error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      onShowToast('Microphone permission denied or unavailable. Please enable microphone access in your browser.', 'error');
    }
  };

  const handleStopAndSendVoiceRecording = async () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    const durationSec = Math.max(1, recordingSeconds);
    if (!activeConversationId) return;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          // Release microphone tracks immediately
          recorder.stream.getTracks().forEach(t => t.stop());

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;

            try {
              const quotedMeta = replyingToMessage ? {
                replyToId: replyingToMessage.id,
                replyToSender: replyingToMessage.senderRole,
                replyToText: replyingToMessage.content.slice(0, 70)
              } : {};

              // Send authentic WhatsApp-style voice note without any fake transcripts or subtitles
              const res = await api.messages.sendMessage(
                activeConversationId,
                `🎙️ Voice note (${durationSec}s)`,
                'AUDIO',
                { 
                  audioDuration: durationSec, 
                  audioUrl: base64Audio,
                  ...quotedMeta
                }
              );

              setReplyingToMessage(null);

              setActiveDetail(prev => {
                if (!prev) return null;
                return { ...prev, messages: [...prev.messages, res.message] };
              });
              setConversations(prev => prev.map(c => {
                if (c.id === activeConversationId) {
                  return { ...c, lastMessageText: `🎙️ Voice note (${durationSec}s)`, lastMessageAt: new Date().toISOString() };
                }
                return c;
              }));
            } catch (sendErr: any) {
              onShowToast(sendErr.message || 'Failed to send voice note', 'error');
            }
          };
          reader.readAsDataURL(blob);
        } catch (procErr) {
          console.error('Failed to process voice note blob:', procErr);
        }
      };
      recorder.stop();
    }
  };

  const handleCancelVoiceRecording = () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
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

  // WhatsApp Style Delete Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversationId) return;
    try {
      await api.messages.deleteMessage(activeConversationId, msgId);
      setActiveDetail(prev => {
        if (!prev) return null;
        const filtered = prev.messages.filter(m => m.id !== msgId);
        return { ...prev, messages: filtered };
      });
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          const remaining = (activeDetail?.messages || []).filter(m => m.id !== msgId);
          const last = remaining[remaining.length - 1];
          return {
            ...c,
            lastMessageText: last ? last.content : 'No messages',
            lastMessageAt: last ? last.createdAt : c.lastMessageAt
          };
        }
        return c;
      }));
      onShowToast('Message deleted', 'info');
    } catch (err: any) {
      onShowToast('Failed to delete message', 'error');
    }
    setConfirmDeleteModal(null);
  };

  // WhatsApp Style Clear Chat
  const handleClearChat = async () => {
    if (!activeConversationId) return;
    try {
      await api.messages.clearChat(activeConversationId);
      setActiveDetail(prev => prev ? { ...prev, messages: [] } : null);
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            lastMessageText: 'Chat cleared',
            lastMessageAt: new Date().toISOString()
          };
        }
        return c;
      }));
      onShowToast('Chat cleared successfully', 'success');
    } catch (err: any) {
      onShowToast('Failed to clear chat', 'error');
    }
    setConfirmDeleteModal(null);
    setShowChatMenu(false);
  };

  // WhatsApp Style Delete Conversation
  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.messages.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setActiveDetail(null);
      }
      onShowToast('Conversation deleted', 'success');
    } catch (err: any) {
      onShowToast('Failed to delete conversation', 'error');
    }
    setConfirmDeleteModal(null);
    setShowChatMenu(false);
  };

  // Direct In-Chat Hostel Tour & Inspection Booking Submission
  const handleBookTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetail || !activeConversationId) return;
    setBookingTour(true);
    try {
      const prop = activeDetail.conversation.property;
      const res = await api.inspections.request(prop?.id || 'prop-default', {
        inspectionType: tourType,
        preferredDate: tourDate,
        preferredTime: tourTime,
        studentPhone: studentPhoneInput.trim() || user?.phone || '08012345678',
        notes: tourNotes.trim() || undefined
      });

      const pin = `PASS-${Math.floor(1000 + Math.random() * 9000)}-LAUTECH`;
      const propTitle = prop?.title || 'Hostel Accommodation';
      const propArea = prop?.areaName || 'LAUTECH Area';
      const agentName = activeDetail.conversation.provider?.name || 'Verified Agent';
      const messageText = `📅 Inspection Tour Appointment Confirmed!\n• Visit Type: ${tourType === 'PHYSICAL' ? '🚶 Physical Walkthrough' : '📹 Live Video Tour'}\n• Scheduled: ${tourDate} at ${tourTime}\n• Gate Passcode: ${pin}\n• Location: ${propTitle} (${propArea})\n• Agent: ${agentName}`;

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

  if (isLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <MessageCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Sign In to Hostel Ease Chat</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please sign in with your student or agent account to access direct messages, inquiries, and verified chat histories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }))}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div data-testid="messaging-center-container" className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 pb-20 md:pb-4">
      {/* High-End Docked Messenger Container (Fixed Height Viewport - Zero Page Jumps!) */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-9.5rem)] sm:h-[calc(100vh-6rem)] max-h-[860px]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION HUB (SLACK / SNAPCHAT STYLE CHAT LIST)           */}
        {/* ========================================================================= */}
        <div className={`md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/90 ${(activeConversationId || resolvingPropertyId) ? 'hidden md:flex' : 'flex'}`}>
          
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

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('hostel_ease_open_ai'))}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-teal-800 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500/30 group"
                  title={isStudent ? "Open Student AI Assistant Bot" : "Open Agent AI Assistant Bot"}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">{isStudent ? 'AI Bot' : 'Agent Bot'}</span>
                  <span className="sm:hidden">Bot</span>
                </button>

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
            </div>

            {/* Search Input */}
            <div className="relative flex items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-2 text-xs text-white focus-within:border-emerald-500 transition-colors shadow-inner">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search agent, student, or hostel..."
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
            ) : conversationsError && conversations.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-200">Unable to load your messages right now</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Please check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => loadConversations()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-300">No Conversations Found</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {isStudent
                    ? 'Tap the + button to select any verified hostel and message the agent directly.'
                    : 'Incoming messages from interested students will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConversationId;
                const otherPartyName = isStudent ? conv.providerName : conv.studentName;
                const hasUnread = (conv.unreadCount || 0) > 0;
                const isOnline = !!conv.isOnline;
                const convPresenceText = formatPresence(conv.isOnline, conv.lastSeenAt);
                const rawAvatar = conv.avatarUrl || conv.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
                const convAvatar = getMediaUrl(rawAvatar);

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
                    } group/conv`}
                  >
                    {/* Avatar with Real Photo & Online Dot & Click to View */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenImage({
                          imageUrl: convAvatar,
                          title: otherPartyName,
                          subtitle: conv.propertyTitle,
                          isOnline: isOnline,
                          presenceText: convPresenceText
                        });
                      }}
                      className="relative shrink-0 cursor-pointer group/itemavatar"
                      title="Click to view full photo"
                    >
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/80 shadow-md flex items-center justify-center transition-transform group-hover/itemavatar:scale-105">
                        {convAvatar ? (
                          <img
                            src={convAvatar}
                            alt={otherPartyName}
                            className="w-full h-full object-cover object-center"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 flex items-center justify-center font-black text-xs text-white -z-10 ${
                          isStudent ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-indigo-500 to-purple-700'
                        }`}>
                          {otherPartyName ? otherPartyName.charAt(0).toUpperCase() : 'H'}
                        </div>
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-slate-900 rounded-full shadow-sm ${
                        isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Name & Timestamp & Delete */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-white truncate flex items-center gap-1">
                          <span>{otherPartyName}</span>
                          {isStudent && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400 font-bold">
                            {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {/* WhatsApp Style Delete Conversation Button on hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteModal({
                                type: 'DELETE_CONVERSATION',
                                conversationId: conv.id,
                                targetName: otherPartyName
                              });
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all opacity-0 group-hover/conv:opacity-100 cursor-pointer"
                            title="Delete Conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Property Title & Presence status */}
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-bold text-emerald-400 truncate">
                          🏢 {conv.propertyTitle} <span className="text-slate-500 font-normal">({conv.areaName})</span>
                        </p>
                        {isOnline && (
                          <span className="text-[9px] font-bold text-emerald-400 shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Online
                          </span>
                        )}
                      </div>

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
        <div className={`md:col-span-8 flex flex-col bg-slate-950/95 relative overflow-hidden ${(!activeConversationId && !resolvingPropertyId) ? 'hidden md:flex' : 'flex'}`}>
          {resolvingPropertyId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">Connecting with Verified Agent...</h4>
                <p className="text-xs text-slate-400">Loading conversation and accommodation inquiry thread</p>
              </div>
            </div>
          ) : !activeConversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-900 text-emerald-400 rounded-3xl flex items-center justify-center shadow-inner border border-slate-800">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-white">Select an Accommodation Thread</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Chat directly with verified agents to ask about water, electricity, caution fees, and send room photo snaps.
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
          ) : (!activeDetail && messagesLoading) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">Opening Conversation...</h4>
                <p className="text-xs text-slate-400">Loading verified inquiry history and messages</p>
              </div>
            </div>
          ) : (!activeDetail || activeThreadError) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-900 text-slate-400 rounded-3xl flex items-center justify-center shadow-inner border border-slate-800">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-white">Unable to load messages</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  We couldn't load this conversation right now. Please try again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => activeConversationId && selectAndLoadConversation(activeConversationId, true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* TOP STICKY CHAT HEADER: Profile, Status & Property Anchor */}
              <div className="p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-md space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {(() => {
                    const otherUser = isStudent ? activeDetail.conversation.provider : activeDetail.conversation.student;
                    const otherName = isStudent 
                      ? (activeDetail.conversation.provider?.name || 'Verified Agent') 
                      : (activeDetail.conversation.student?.name || 'Student');
                    const rawAvatar = isStudent 
                      ? (activeDetail.conversation.provider?.avatarUrl || activeDetail.conversation.property?.coverImage)
                      : (activeDetail.conversation.student?.avatarUrl);
                    const otherAvatar = getMediaUrl(rawAvatar);
                    const isOnline = otherUser?.isOnline ?? false;
                    const lastSeenAt = otherUser?.lastSeenAt ?? null;
                    const presenceText = formatPresence(isOnline, lastSeenAt);
                    const badgeTitle = isStudent ? 'Verified Landlord / Agent' : 'Verified Student';
                    const isPeerTyping = !!activeDetail.typingUser;

                    return (
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Back Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConversationId(null);
                            setActiveDetail(null);
                            setResolvingPropertyId(null);
                            resolvingPropertyRef.current = null;
                            try {
                              window.history.replaceState({ view: 'messages' }, '', '#messages');
                            } catch {}
                          }}
                          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 active:bg-slate-700 rounded-xl cursor-pointer shrink-0"
                          aria-label="Back to conversations"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Clickable Profile / Hostel Image */}
                        <button
                          type="button"
                          onClick={() => {
                            if (otherAvatar) {
                              setFullScreenImage({
                                imageUrl: otherAvatar,
                                title: otherName,
                                subtitle: isStudent ? (activeDetail.conversation.property?.title || 'Hostel Accommodation') : 'Student Inquiry Profile',
                                isOnline,
                                presenceText
                              });
                            }
                          }}
                          className={`relative shrink-0 rounded-2xl group focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            otherAvatar ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : 'cursor-default'
                          }`}
                          title={otherAvatar ? `Click to view ${otherName}'s full-size photo` : otherName}
                        >
                          {otherAvatar ? (
                            <img
                              src={otherAvatar}
                              alt={otherName}
                              className="w-10 h-10 rounded-2xl object-cover shadow-md border border-slate-700/80 group-hover:border-emerald-500 transition-colors"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                (e.currentTarget.parentElement?.querySelector('.fallback-initial') as HTMLElement)?.style.setProperty('display', 'flex');
                              }}
                            />
                          ) : null}
                          <div
                            className={`fallback-initial w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white items-center justify-center font-black text-sm shadow-md ${
                              otherAvatar ? 'hidden' : 'flex'
                            }`}
                          >
                            {otherName.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                              isPeerTyping || isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                            }`}
                            title={isPeerTyping ? 'typing...' : (isOnline ? 'Online now' : presenceText)}
                          />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-white truncate">
                              {otherName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              {badgeTitle}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-medium truncate flex items-center gap-1.5 mt-0.5">
                            {isPeerTyping ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span className="text-emerald-400 font-bold animate-pulse">
                                  typing...
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                                  {presenceText}
                                </span>
                              </>
                            )}
                            {(activeDetail.conversation.provider as any)?.phone && isStudent && (
                              <span className="text-slate-400 font-normal">• 📞 {(activeDetail.conversation.provider as any).phone}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

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

                    {/* In-Chat Search Button */}
                    <button
                      type="button"
                      onClick={() => setShowInChatSearch(!showInChatSearch)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        showInChatSearch ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Search in chat"
                    >
                      <Search className="w-4 h-4" />
                    </button>

                    {/* WhatsApp 3-Dots More Options Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowChatMenu(!showChatMenu)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="More chat options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showChatMenu && (
                        <div className="absolute right-0 top-11 z-30 w-48 bg-slate-850 border border-slate-700 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowInChatSearch(true);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Search in Chat</span>
                          </button>

                          {/* Clear Chat Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteModal({
                                type: 'CLEAR_CHAT',
                                conversationId: activeConversationId
                              });
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Clear Chat</span>
                          </button>

                          {/* Delete Entire Conversation Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteModal({
                                type: 'DELETE_CONVERSATION',
                                conversationId: activeConversationId,
                                targetName: isStudent ? (activeDetail.conversation?.provider?.name || 'Agent') : (activeDetail.conversation?.student?.name || 'Student')
                              });
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Conversation</span>
                          </button>

                          <div className="border-t border-slate-750 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setReportModalOpen(true);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Report User</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* WhatsApp In-Chat Search Bar */}
                {showInChatSearch && (
                  <div className="px-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex items-center gap-2 shadow-inner animate-in slide-in-from-top-2">
                    <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="text"
                      value={inChatSearchQuery}
                      onChange={(e) => setInChatSearchQuery(e.target.value)}
                      placeholder="Search messages in this chat..."
                      className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
                      autoFocus
                    />
                    {inChatSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInChatSearchQuery('')}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowInChatSearch(false);
                        setInChatSearchQuery('');
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-700"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* Property Compact Bar */}
                {activeDetail.conversation?.property && (
                  <div className="p-2 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs shadow-inner">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getMediaUrl(activeDetail.conversation.property.coverImage) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                        alt={activeDetail.conversation.property.title || 'Hostel Accommodation'}
                        className="w-9 h-9 rounded-xl object-cover shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                        onClick={() => {
                          const cover = getMediaUrl(activeDetail.conversation.property.coverImage) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
                          setFullScreenImage({
                            imageUrl: cover,
                            title: activeDetail.conversation.property.title || 'Hostel Accommodation',
                            subtitle: `${activeDetail.conversation.property.areaName || 'LAUTECH Area'} • ${formatNaira(activeDetail.conversation.property.rentAmount || 0)}/yr`
                          });
                        }}
                        title="Click to view full-resolution photo"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">
                          🏢 {activeDetail.conversation.property.title || 'Hostel Accommodation'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          📍 {activeDetail.conversation.property.areaName || 'LAUTECH Area'} ({formatDistance(activeDetail.conversation.property.distanceFromCampusKm || 0.5)}) •{' '}
                          <strong className="text-emerald-400 font-black">{formatNaira(activeDetail.conversation.property.rentAmount || 0)}/yr</strong>
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

                      {onViewOnMap && (
                        <button
                          type="button"
                          onClick={() => {
                            const addr = activeDetail.conversation?.property?.address || activeDetail.conversation?.property?.areaName || '';
                            onViewOnMap(addr);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:text-white bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                          title="View Location on Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5 text-sky-400" />
                          <span>Google Map</span>
                        </button>
                      )}

                      {onSelectProperty && activeDetail.conversation.property.id && (
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
                )}
              </div>

              {/* MESSAGES FEED CONTAINER (Scroll strictly contained here!) */}
              <div
                ref={messagesContainerRef}
                className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
              >
                {messagesLoading && (!activeDetail.messages || activeDetail.messages.length === 0) ? (
                  <div className="py-20 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">Loading message history...</p>
                  </div>
                ) : (() => {
                  const filteredMessages = inChatSearchQuery.trim()
                    ? activeDetail.messages.filter(m => (m.content || '').toLowerCase().includes(inChatSearchQuery.toLowerCase().trim()))
                    : (activeDetail.messages || []);

                  if (inChatSearchQuery.trim() && filteredMessages.length === 0) {
                    return (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-300">No messages match "{inChatSearchQuery}"</p>
                        <button
                          type="button"
                          onClick={() => setInChatSearchQuery('')}
                          className="px-3 py-1 bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Clear search
                        </button>
                      </div>
                    );
                  }

                  if (filteredMessages.length === 0) {
                    const peerName = isStudent 
                      ? (activeDetail.conversation?.provider?.name || 'Agent') 
                      : (activeDetail.conversation?.student?.name || 'Student');
                    return (
                      <div className="py-20 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-300">Start the conversation with {peerName}</p>
                        <p className="text-[11px] text-slate-500">
                          {isStudent 
                            ? 'Pick a quick inquiry chip below, ask a question, or send a photo snap.' 
                            : 'Reply to this student inquiry or send photos and details about the hostel.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredMessages.map(msg => {
                    const isMe = Boolean(user?.id && msg.senderId === user.id) || Boolean(user?.email && (msg as any).senderEmail && (msg as any).senderEmail.toLowerCase() === user.email.toLowerCase());
                    const isAutoReply = Boolean(msg.metadata?.isAutoReply || msg.metadata?.automated);
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

                    const senderLabel = isAutoReply
                      ? '🤖 Hostel Ease Automated Assistant'
                      : isMe
                      ? 'You'
                      : (msg.senderRole === 'PROVIDER' || (msg.senderRole as string) === 'AGENT' || (msg.senderRole as string) === 'LANDLORD')
                      ? `🏡 Agent: ${activeDetail.conversation?.provider?.name || 'Agent'}`
                      : `🎓 Student: ${activeDetail.conversation?.student?.name || 'Student'}`;

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
                            onShowToast(`Replying to ${msg.senderRole === 'PROVIDER' ? 'Agent' : 'Student'}`, 'info');
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

                            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                            {/* Delete Message Action in Hover Menu */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: 'DELETE_MESSAGE',
                                  messageId: msg.id,
                                  targetName: isAudio ? 'voice note' : 'message'
                                });
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* WhatsApp Message Bubble Row with Left-Side Delete Button */}
                        <div className={`flex items-center gap-1.5 max-w-full ${isMe ? 'flex-row' : 'flex-row'}`}>
                          {/* WhatsApp Left-side Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteModal({
                                type: 'DELETE_MESSAGE',
                                messageId: msg.id,
                                targetName: isAudio ? 'voice note' : 'message'
                              });
                            }}
                            className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 opacity-70 sm:opacity-0 group-hover:opacity-100 hover:scale-110 ${
                              isAudio ? 'text-rose-400 hover:bg-rose-950/60' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                            title={isAudio ? 'Delete voice note' : 'Delete message'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Message Bubble */}
                          <div
                            className={`p-3.5 rounded-3xl text-xs font-medium space-y-2 shadow-lg relative ${
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
                                  <span>{msg.metadata.replyToSender === 'PROVIDER' ? 'Agent' : 'Student'}</span>
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
                                  onClick={() => setPreviewImage({ url: getMediaUrl(msg.metadata?.imageUrl!), caption: msg.metadata?.imageCaption })}
                                  className="relative rounded-2xl overflow-hidden cursor-pointer group/img border border-white/10"
                                >
                                  <img
                                    src={getMediaUrl(msg.metadata.imageUrl)}
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

                            {/* 2. AUDIO / VOICE NOTE MESSAGE (WhatsApp Authentic Style) */}
                            {isAudio && (
                              <div className="py-1 min-w-[220px] sm:min-w-[270px] max-w-[340px]">
                                <div className="flex items-center gap-2.5">
                                  {/* Direct Delete Voice Note Button on the Left Side of Voice Player */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteModal({
                                        type: 'DELETE_MESSAGE',
                                        messageId: msg.id,
                                        targetName: 'voice note'
                                      });
                                    }}
                                    className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                                      isMe
                                        ? 'text-emerald-200 hover:text-rose-200 hover:bg-emerald-800/80'
                                        : 'text-slate-400 hover:text-rose-400 hover:bg-slate-700/80'
                                    }`}
                                    title="Delete voice note"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* WhatsApp Circular Play/Pause Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const duration = msg.metadata?.audioDuration || 6;
                                      playVoiceNote(msg.id, duration, msg.metadata?.audioUrl);
                                    }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 cursor-pointer ${
                                      isMe 
                                        ? 'bg-white text-emerald-800 hover:bg-emerald-50' 
                                        : 'bg-emerald-500 text-white hover:bg-emerald-400'
                                    }`}
                                    title={playingAudioId === msg.id ? 'Pause' : 'Play'}
                                  >
                                    {playingAudioId === msg.id ? (
                                      <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    )}
                                  </button>

                                  {/* WhatsApp Waveform Track with Scrubbing / Progress Dot */}
                                  <div className="flex-1 space-y-1">
                                    <div 
                                      onClick={() => {
                                        const duration = msg.metadata?.audioDuration || 6;
                                        playVoiceNote(msg.id, duration, msg.metadata?.audioUrl);
                                      }}
                                      className="relative flex items-center gap-[2px] h-6 cursor-pointer py-1"
                                    >
                                      {[30, 60, 45, 80, 50, 95, 70, 40, 85, 60, 100, 75, 45, 90, 65, 80, 50, 70, 90, 55, 35, 65, 85, 40].map((h, i) => {
                                        const progress = (audioPlayProgress[msg.id] || 0) / (msg.metadata?.audioDuration || 6);
                                        const barProgress = i / 24;
                                        const isPlayed = barProgress <= progress;

                                        return (
                                          <span
                                            key={i}
                                            style={{ height: `${h}%` }}
                                            className={`w-[2.5px] rounded-full transition-colors duration-100 ${
                                              isPlayed 
                                                ? (isMe ? 'bg-white' : 'bg-emerald-400') 
                                                : (isMe ? 'bg-emerald-400/50' : 'bg-slate-500')
                                            }`}
                                          />
                                        );
                                      })}

                                      {/* Scrubber Dot */}
                                      {playingAudioId === msg.id && (
                                        <div 
                                          style={{
                                            left: `${Math.min(100, Math.max(0, ((audioPlayProgress[msg.id] || 0) / (msg.metadata?.audioDuration || 6)) * 100))}%`
                                          }}
                                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md -ml-1 pointer-events-none transition-all duration-100"
                                        />
                                      )}
                                    </div>

                                    {/* WhatsApp Duration, 1x/1.5x/2x Speed Toggle & Badge */}
                                    <div className="flex justify-between items-center text-[10px] font-mono opacity-85">
                                      <div className="flex items-center gap-1.5">
                                        <span>
                                          0:{String(playingAudioId === msg.id ? (audioPlayProgress[msg.id] || 0) : (msg.metadata?.audioDuration || 6)).padStart(2, '0')}
                                        </span>
                                        {/* WhatsApp 1x / 1.5x / 2x Speed Multiplier Pill */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
                                            setPlaybackSpeed(nextSpeed);
                                            if (currentAudioRef.current) {
                                              currentAudioRef.current.playbackRate = nextSpeed;
                                            }
                                          }}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider transition-colors cursor-pointer ${
                                            isMe
                                              ? 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-900'
                                              : 'bg-slate-700 text-emerald-300 hover:bg-slate-600'
                                          }`}
                                          title="Click to toggle playback speed: 1x, 1.5x, 2x"
                                        >
                                          {playbackSpeed}x
                                        </button>
                                      </div>
                                      <span className="text-[9px] opacity-75 font-sans flex items-center gap-0.5">
                                        <Mic className={`w-2.5 h-2.5 inline ${playingAudioId === msg.id ? 'text-cyan-300 animate-pulse' : ''}`} />
                                        <span>Voice note</span>
                                      </span>
                                    </div>
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
                              <div className="space-y-1.5">
                                {isAutoReply && (
                                  <div className="flex items-center gap-1.5 pb-1 text-[10px] font-bold text-emerald-300 border-b border-emerald-500/20">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span>Automated Acknowledgement</span>
                                  </div>
                                )}
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                {onViewOnMap && /(?:no\.?\s*\d+|street|avenue|road|close|crescent|lane|ibadan|ogbomoso|oluyole|bodija|olubere|under-?g|adenike|stadium)/i.test(msg.content) && (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        let addr = msg.content;
                                        const match = addr.match(/(?:address(?:\s+is)?[:\s]+)?(no\.?\s*\d+[^,\n.]+(?:,[^,\n.]+)*)/i);
                                        if (match && match[1]) {
                                          addr = match[1].trim();
                                        }
                                        onViewOnMap(addr);
                                      }}
                                      className={`px-2.5 py-1 text-[10px] font-bold rounded-xl flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${
                                        isMe 
                                          ? 'bg-emerald-800/80 text-emerald-100 border-emerald-400/40 hover:bg-emerald-700' 
                                          : 'bg-sky-950/80 text-sky-200 border-sky-500/40 hover:bg-sky-900/90'
                                      }`}
                                      title="Open and track this address on Google Maps"
                                    >
                                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                                      <span>Locate on Google Maps 🗺️</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Timestamp and Delivery Ticks (WhatsApp Cyan Checks when read, Spinner when sending, Retry when failed) */}
                            <div className={`flex items-center justify-end gap-1.5 text-[9px] pt-0.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.isSending ? (
                                <span title="Sending...">
                                  <Clock className="w-3 h-3 text-emerald-200/80 animate-spin" />
                                </span>
                              ) : msg.isFailed ? (
                                <button
                                  type="button"
                                  onClick={() => handleRetrySendMessage(msg)}
                                  className="flex items-center gap-0.5 text-rose-300 hover:text-white font-bold underline bg-rose-950/70 px-1 py-0.5 rounded cursor-pointer"
                                  title="Failed to deliver. Click to retry."
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                  <span>Retry</span>
                                </button>
                              ) : isMe ? (
                                <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-cyan-400' : 'text-emerald-200'}`} />
                              ) : null}
                            </div>
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
                  });
                })()}

                {/* Live "Agent is typing..." / "Student is typing..." indicator */}
                {(isTyping || activeDetail.typingUser) && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs animate-in fade-in">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {activeDetail.typingUser?.userName?.charAt(0) || (isStudent ? (activeDetail.conversation?.provider?.name?.charAt(0) || 'A') : (activeDetail.conversation?.student?.name?.charAt(0) || 'S'))}
                    </div>
                    <div className="p-3 bg-slate-800 rounded-2xl rounded-tl-xs border border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] text-emerald-400 font-bold ml-1">
                        {activeDetail.typingUser
                          ? `${activeDetail.typingUser.userName || (activeDetail.typingUser.role === 'PROVIDER' ? 'Agent' : 'Student')} is typing...`
                          : (typingCustomText || (isStudent ? `${activeDetail.conversation?.provider?.name || 'Agent'} is typing...` : `${activeDetail.conversation?.student?.name || 'Student'} is typing...`))}
                      </span>
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
                {/* Voice Note Recording Live Bar (WhatsApp Authentic Style) */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-800/95 border border-slate-700/80 rounded-2xl shadow-xl animate-in fade-in">
                    {/* Discard / Trash Can on the left */}
                    <button
                      type="button"
                      onClick={handleCancelVoiceRecording}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer shrink-0"
                      title="Discard Voice Note"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {/* Center: Live Pulsing Mic, Timer and Soundwave */}
                    <div className="flex items-center gap-2.5 flex-1 px-3 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative" />
                      </div>

                      <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider shrink-0">
                        0:{String(recordingSeconds).padStart(2, '0')}
                      </span>

                      {/* WhatsApp soundwave bars */}
                      <div className="flex items-center gap-1 h-4 flex-1 max-w-[160px] overflow-hidden">
                        {[40, 80, 55, 90, 65, 100, 75, 95, 50, 85, 60, 90, 70, 85, 45, 95].map((h, i) => (
                          <span 
                            key={i} 
                            style={{ height: `${Math.max(25, (h + (i % 3) * 20) % 100)}%` }} 
                            className="w-[2px] rounded-full bg-emerald-400 animate-pulse shrink-0" 
                          />
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp Green Circular Send Button */}
                    <button
                      type="button"
                      onClick={handleStopAndSendVoiceRecording}
                      className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer shrink-0"
                      title="Send Voice Note"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Active Quoted Message Banner */}
                    {replyingToMessage && (
                      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/95 border-l-4 border-emerald-500 rounded-2xl mb-2.5 text-xs shadow-md animate-in slide-in-from-bottom-2">
                        <div className="min-w-0 pr-2">
                          <span className="font-black text-[10px] text-emerald-400 uppercase tracking-wider block">
                            ↩ Replying to {replyingToMessage.senderRole === 'PROVIDER' ? 'Agent' : 'Student'}
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
                        stopTypingNow();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-1.5 sm:gap-2 relative"
                    >
                    {/* Media Snap Buttons */}
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-emerald-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Send Room Inspection Photo Snap"
                      aria-label="Send Photo Snap"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Voice Memo Button */}
                    <button
                      type="button"
                      onClick={handleStartVoiceRecording}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-purple-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Record Voice Note"
                      aria-label="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Emoji Picker Button (Tablet & Desktop) */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="hidden sm:flex p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Emoji Reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Ask AI Assistant Bot Button (Tablet & Desktop) */}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('hostel_ease_open_ai'))}
                      className="hidden sm:flex p-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-md transition-colors cursor-pointer shrink-0 border border-emerald-400/30"
                      title={isStudent ? "Ask Student Accommodation AI Bot" : "Ask Agent AI Bot"}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
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
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={() => stopTypingNow()}
                      placeholder={
                        isStudent
                          ? `Message ${activeDetail.conversation?.provider?.name || 'Agent'}...`
                          : `Reply to ${activeDetail.conversation?.student?.name || 'Student'}...`
                      }
                      className="flex-1 min-w-0 px-3.5 sm:px-4 py-3 bg-slate-800 text-white placeholder:text-slate-500 rounded-2xl border border-slate-700 text-[16px] sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={sending || !messageInput.trim()}
                      className="p-3 min-w-[44px] min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer shrink-0"
                      aria-label="Send message"
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
                    Hostel Ease On-Site Verification for <strong className="text-emerald-400">{activeDetail.conversation?.property?.title || 'Accommodation'}</strong>
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
                  src={activeDetail.conversation?.property?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'}
                  alt={activeDetail.conversation?.property?.title || 'Hostel'}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h4 className="font-black text-white text-sm">{activeDetail.conversation?.property?.title || 'Hostel Accommodation'}</h4>
                  <p className="text-slate-400 text-[11px]">
                    📍 {activeDetail.conversation?.property?.areaName || 'LAUTECH Area'} ({formatDistance(activeDetail.conversation?.property?.distanceFromCampusKm || 0.5)} to campus)
                  </p>
                  <p className="text-emerald-400 font-black text-xs pt-0.5">
                    {formatNaira(activeDetail.conversation?.property?.rentAmount || 0)}/yr • Verified Agent: {activeDetail.conversation?.provider?.name || 'Verified Agent'}
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
                    100% direct from verified agent. Fully protected by Hostel Ease Escrow Shield.
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
                📍 Location: {activeDetail.conversation?.property?.areaName || 'Under G'}, near LAUTECH Campus, Ogbomoso.
              </p>
              <p className="text-slate-400 text-[11px]">
                When visiting, meet the agent or resident caretaker at the main gate. Present your digital Inspection Passcode.
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
                  Pick your preferred date & time to tour {activeDetail.conversation?.property?.title || 'Accommodation'}.
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
                <label className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Your Phone Number (For Agent Contact)</label>
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
          reportedUserId={isStudent ? (activeDetail.conversation?.provider?.id || '') : (activeDetail.conversation?.student?.id || '')}
          reportedUserName={isStudent ? (activeDetail.conversation?.provider?.name || 'Verified Agent') : (activeDetail.conversation?.student?.name || 'Student')}
          conversationId={activeDetail.conversation?.id || ''}
          onShowToast={onShowToast}
        />
      )}

      {/* WhatsApp Authentic Confirmation Dialog (Delete Message, Clear Chat, Delete Conversation) */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                confirmDeleteModal.type === 'CLEAR_CHAT'
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-600/30'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-600/30'
              }`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  {confirmDeleteModal.type === 'DELETE_MESSAGE' && 'Delete message?'}
                  {confirmDeleteModal.type === 'CLEAR_CHAT' && 'Clear this chat?'}
                  {confirmDeleteModal.type === 'DELETE_CONVERSATION' && 'Delete this chat?'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmDeleteModal.type === 'DELETE_MESSAGE' && 'This message will be removed from your chat history.'}
                  {confirmDeleteModal.type === 'CLEAR_CHAT' && 'All messages in this chat will be cleared. This action cannot be undone.'}
                  {confirmDeleteModal.type === 'DELETE_CONVERSATION' && `Delete conversation with ${confirmDeleteModal.targetName || 'this contact'}? Messages will be removed from this device.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteModal.type === 'DELETE_MESSAGE' && confirmDeleteModal.messageId) {
                    handleDeleteMessage(confirmDeleteModal.messageId);
                  } else if (confirmDeleteModal.type === 'CLEAR_CHAT') {
                    handleClearChat();
                  } else if (confirmDeleteModal.type === 'DELETE_CONVERSATION' && confirmDeleteModal.conversationId) {
                    handleDeleteConversation(confirmDeleteModal.conversationId);
                  }
                }}
                className={`px-4 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  confirmDeleteModal.type === 'CLEAR_CHAT'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {confirmDeleteModal.type === 'DELETE_MESSAGE' && 'Delete'}
                  {confirmDeleteModal.type === 'CLEAR_CHAT' && 'Clear Chat'}
                  {confirmDeleteModal.type === 'DELETE_CONVERSATION' && 'Delete Chat'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Fullscreen Profile / Hostel Image Preview Modal */}
      <ChatImageModal
        isOpen={!!fullScreenImage}
        imageUrl={fullScreenImage?.imageUrl || ''}
        title={fullScreenImage?.title || 'Profile'}
        subtitle={fullScreenImage?.subtitle}
        isOnline={fullScreenImage?.isOnline}
        presenceText={fullScreenImage?.presenceText}
        onClose={() => setFullScreenImage(null)}
      />
    </div>
  );
};

