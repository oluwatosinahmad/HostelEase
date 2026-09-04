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
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { ReportUserModal } from './ReportUserModal';

interface MessagingCenterProps {
  initialPropertyId?: string | null;
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
  onSelectProperty,
  onRequestInspection,
  onShowToast,
  onViewOnMap
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
                    } group/conv`}
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
                                targetName: isStudent ? activeDetail.conversation.provider.name : activeDetail.conversation.student.name
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

                    {onViewOnMap && (
                      <button
                        type="button"
                        onClick={() => {
                          const addr = activeDetail.conversation.property.address || activeDetail.conversation.property.areaName || '';
                          onViewOnMap(addr);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:text-white bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                        title="View Location on Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>Google Map</span>
                      </button>
                    )}

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
                ) : (() => {
                  const filteredMessages = inChatSearchQuery.trim()
                    ? activeDetail.messages.filter(m => (m.content || '').toLowerCase().includes(inChatSearchQuery.toLowerCase().trim()))
                    : activeDetail.messages;

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

                  if (activeDetail.messages.length === 0) {
                    return (
                      <div className="py-20 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-300">Start the conversation with {activeDetail.conversation.provider.name}</p>
                        <p className="text-[11px] text-slate-500">Pick a quick inquiry chip below or send a photo snap.</p>
                      </div>
                    );
                  }

                  return filteredMessages.map(msg => {
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

                            {/* Timestamp and Delivery Ticks (WhatsApp Cyan Checks when read) */}
                            <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-cyan-400' : 'text-emerald-200'}`} />
                              )}
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

                {/* Live "Landlord is typing..." indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs animate-in fade-in">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {isStudent ? activeDetail.conversation.provider.name.charAt(0) : (activeDetail.conversation.student.name?.charAt(0) || 'S')}
                    </div>
                    <div className="p-3 bg-slate-800 rounded-2xl rounded-tl-xs border border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] text-emerald-400 font-bold ml-1">
                        {typingCustomText || (isStudent ? `${activeDetail.conversation.provider.name} is typing...` : 'Student is typing...')}
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
    </div>
  );
};

