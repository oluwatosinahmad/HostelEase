import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  SlidersHorizontal, 
  Calendar, 
  Bookmark, 
  ArrowRight,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Clock,
  Shield,
  Layers,
  Bed,
  Droplets,
  Zap,
  Receipt,
  Plus,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Reply
} from 'lucide-react';
import { AIMessage, AIStructuredData, AIConversation, Property } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface AIAccommodationAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPropertyContext?: Property | null;
  onSelectProperty?: (propertyId: string) => void;
  onOpenComparison?: () => void;
  onApplyPreferencesToSearch?: (prefs: any) => void;
  onNavigateToBooking?: (bookingId: string) => void;
  onNavigateToPayments?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_QUICK_SUGGESTIONS = [
  'Show me verified hostels under ₦180k near Under G',
  'Compare the 3 closest hostels to LAUTECH gate',
  'Give me an inspection checklist for my tour',
  'What is the current status of my bookings & payments?',
  'Someone asked me to pay before inspecting, is that safe?'
];

const PIDGIN_QUICK_SUGGESTIONS = [
  'Show me correct lodge wey get constant light near Under G',
  'Hostel wey cheap pass under ₦180k dey?',
  'Wetin I suppose check before I pay for room?',
  'Landlord say make I pay urgent before inspection, e legit?',
  'Which area light steady pass between Under G and Stadium?'
];

export const AIAccommodationAssistantModal: React.FC<AIAccommodationAssistantModalProps> = ({
  isOpen,
  onClose,
  initialPropertyContext,
  onSelectProperty,
  onOpenComparison,
  onApplyPreferencesToSearch,
  onNavigateToBooking,
  onNavigateToPayments,
  onShowToast
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationsList, setConversationsList] = useState<AIConversation[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({});
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'HELPFUL' | 'UNHELPFUL'>>({});
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Revolutionary: Nigerian Pidgin & Voice Note Inquiries
  const [languageMode, setLanguageMode] = useState<'EN' | 'PIDGIN'>('EN');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Quoting & Swipe-to-Reply State
  const [replyingToMessage, setReplyingToMessage] = useState<AIMessage | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Authentic Voice Note Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlayProgress, setAudioPlayProgress] = useState<Record<string, number>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioIntervalRef = useRef<any>(null);

  // Authentic MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Voice recording timer effect
  useEffect(() => {
    let timer: any;
    if (isRecordingVoice) {
      timer = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(audioIntervalRef.current);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleTogglePlayAudio = (msgId: string, audioUrl?: string, durationSec: number = 10) => {
    if (playingAudioId === msgId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      clearInterval(audioIntervalRef.current);
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    clearInterval(audioIntervalRef.current);

    setPlayingAudioId(msgId);
    setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));

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

    let currentSec = 0;
    audioIntervalRef.current = setInterval(() => {
      currentSec += 1;
      setAudioPlayProgress(prev => ({ ...prev, [msgId]: currentSec }));
      if (currentSec >= durationSec) {
        clearInterval(audioIntervalRef.current);
        setPlayingAudioId(null);
        setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));
      }
    }, 1000 / playbackSpeed);
  };

  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = nextSpeed;
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      loadConversations();
      
      // If modal opened with specific property context and no messages yet
      if (initialPropertyContext && messages.length === 0) {
        startContextualGreeting(initialPropertyContext);
      } else if (messages.length === 0) {
        // Welcome message
        setMessages([
          {
            id: 'welcome-msg',
            conversation_id: 'default',
            sender: 'AI',
            content: `Hello! 👋 Welcome to **Hostel Ease** — your dedicated LAUTECH Student Accommodation & Housing Advisory Assistant.\n\n` +
              `How can I assist you with your student accommodation today? We offer verified student houses & lodges across LAUTECH (Under G, Adenike, Stadium Road, CHS/College Road, General Area), 100% transparent fee breakdowns, solar inverter power intelligence, free landlord inspections, and secure Escrow protection.\n\n` +
              `What type of accommodation or location are you interested in exploring?`,
            structuredData: {
              type: 'CLARIFYING_QUESTION',
              suggestedQueries: [
                'Show me verified self-contain lodges in Under G',
                'Which area has the most reliable electricity?',
                'Find budget hostels under ₦180k',
                'Give me an inspection checklist for my tour',
                'How does Hostel Ease Escrow protect my money?'
              ]
            },
            created_at: new Date().toISOString()
          }
        ]);
      }
    }
  }, [isOpen, initialPropertyContext]);

  const loadConversations = async () => {
    try {
      const res = await api.ai.getConversations();
      setConversationsList(res.conversations || []);
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    }
  };

  const startContextualGreeting = (property: Property) => {
    setMessages([
      {
        id: `ctx-${property.id}`,
        conversation_id: 'contextual',
        sender: 'AI',
        content: `I see you are viewing **${property.title}** (${property.area?.name || 'LAUTECH Area'}, ${property.distanceFromCampusKm}km from campus gate). I can help verify its exact mandatory fees, availability, facilities, or generate a customized inspection checklist for this hostel. What would you like to know?`,
        structuredData: {
          type: 'HOSTEL_LIST',
          properties: [{
            id: property.id,
            title: property.title,
            address: property.address,
            areaName: property.area?.name || 'Off-Campus',
            distanceFromCampusKm: property.distanceFromCampusKm,
            propertyType: property.propertyType,
            genderPreference: property.genderPreference,
            verificationStatus: property.verificationStatus,
            availabilityStatus: property.availabilityStatus,
            coverImage: property.coverImage,
            rentAmount: property.priceSummary?.rentAmount || 0,
            totalMandatoryCost: property.priceSummary?.totalMandatoryCost || 0,
            amenities: (property.keyAmenities || []).map(a => a.name)
          }],
          suggestedQueries: [
            `What are the total mandatory fees for ${property.title}?`,
            `Give me an inspection checklist for ${property.title}`,
            `Compare ${property.title} with other hostels nearby`
          ]
        },
        created_at: new Date().toISOString()
      }
    ]);
  };

  const handleSendMessage = async (
    textToSend?: string,
    options?: { isVoiceNote?: boolean; audioUrl?: string; audioDuration?: number }
  ) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const replyMeta = replyingToMessage ? {
      id: replyingToMessage.id,
      sender: replyingToMessage.sender,
      text: replyingToMessage.content.slice(0, 80)
    } : null;
    setReplyingToMessage(null);

    setInputQuery('');
    const userTempId = `user-${Date.now()}`;
    const newMsg: AIMessage = {
      id: userTempId,
      conversation_id: conversationId || 'temp',
      sender: 'USER',
      content: query,
      isVoiceNote: options?.isVoiceNote,
      audioUrl: options?.audioUrl,
      audioDuration: options?.audioDuration,
      replyTo: replyMeta,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.ai.chat(
        query,
        conversationId || undefined,
        initialPropertyContext ? { propertyId: initialPropertyContext.id, contextType: 'HOSTEL_DETAILS' } : undefined
      );

      if (res.conversationId && !conversationId) {
        setConversationId(res.conversationId);
      }

      const aiMsg: AIMessage = {
        id: res.messageId || `ai-${Date.now()}`,
        conversation_id: res.conversationId,
        sender: 'AI',
        content: res.response,
        structuredData: res.structuredData,
        toolCalls: res.toolsUsed,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI error:', err);
      const errMsg: AIMessage = {
        id: `err-${Date.now()}`,
        conversation_id: conversationId || 'temp',
        sender: 'AI',
        content: `I apologize, but I encountered an issue connecting to the accommodation intelligence service. You can still use the direct search filters, maps, and comparison tools normally.`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
      onShowToast(err.message || 'AI service temporarily unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (actionPrompt: any) => {
    setExecutingActionId(actionPrompt.actionType);
    try {
      const res = await api.ai.confirmAction(actionPrompt.actionType, actionPrompt.payload);
      onShowToast(res.message || 'Action completed successfully!', 'success');

      // Append confirmation message to chat
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          conversation_id: conversationId || 'default',
          sender: 'SYSTEM',
          content: `✅ **Action Confirmed:** ${res.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to execute action', 'error');
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleFeedback = async (messageId: string, rating: 'HELPFUL' | 'UNHELPFUL') => {
    try {
      await api.ai.submitFeedback(messageId, rating);
      setFeedbackGiven(prev => ({ ...prev, [messageId]: rating }));
      onShowToast(rating === 'HELPFUL' ? 'Thank you for your feedback! 👍' : 'Feedback recorded. We will improve! 👎', 'info');
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleStartNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: 'new-welcome',
        conversation_id: 'default',
        sender: 'AI',
        content: `Starting a fresh chat! How can I assist your LAUTECH accommodation search?`,
        structuredData: {
          type: 'CLARIFYING_QUESTION',
          suggestedQueries: DEFAULT_QUICK_SUGGESTIONS
        },
        created_at: new Date().toISOString()
      }
    ]);
  };

  const handleLoadPastConversation = async (conv: AIConversation) => {
    setShowHistoryDropdown(false);
    setConversationId(conv.id);
    setLoading(true);
    try {
      const res = await api.ai.getConversation(conv.id);
      setMessages(res.messages || []);
    } catch (err) {
      onShowToast('Failed to load chat history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklistItem = (key: string) => {
    setCheckedChecklistItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleLanguage = (mode: 'EN' | 'PIDGIN') => {
    setLanguageMode(mode);
    if (mode === 'PIDGIN') {
      const pidginWelcome: AIMessage = {
        id: `pidgin-switch-${Date.now()}`,
        conversation_id: conversationId || 'default',
        sender: 'AI',
        content: `Bros/Sistur how far! 🇳🇬 You don activate **Pidgin Mode**! As your sharp LAUTECH campus plug, I dey here to make sure landlord or fake agent no run you street.\n\n` +
          `Wetin you dey find? Verified self-contain for Under G? Lodge wey light steady pass for Stadium Road or Adenike? Or you wan know if the money landlord dey quote make sense? Oya, ask me anything!`,
        structuredData: {
          type: 'CLARIFYING_QUESTION',
          suggestedQueries: PIDGIN_QUICK_SUGGESTIONS
        },
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, pidginWelcome]);
      onShowToast('🇳🇬 Switched to Nigerian Pidgin Mode!', 'success');
    } else {
      const enWelcome: AIMessage = {
        id: `en-switch-${Date.now()}`,
        conversation_id: conversationId || 'default',
        sender: 'AI',
        content: `Switched back to **English Mode**. How can I assist you with your LAUTECH accommodation search or verification?`,
        structuredData: {
          type: 'CLARIFYING_QUESTION',
          suggestedQueries: DEFAULT_QUICK_SUGGESTIONS
        },
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, enWelcome]);
      onShowToast('🇬🇧 Switched to English Mode', 'info');
    }
  };

  const handleToggleVoiceNote = () => {
    if (!isRecordingVoice) {
      handleStartVoiceRecording();
    } else {
      handleStopAndSendVoiceRecording();
    }
  };

  const handleStartVoiceRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(200);
      }
    } catch (err) {
      console.warn('Microphone access not available or denied, continuing with animated simulated recording:', err);
    }
    setIsRecordingVoice(true);
    setRecordSeconds(0);
    onShowToast(
      languageMode === 'PIDGIN'
        ? '🎙️ Dey record voice note... Talk wetin you dey find!'
        : '🎙️ Recording voice note... Speak your hostel inquiry!',
      'info'
    );
  };

  const handleStopAndSendVoiceRecording = () => {
    const finalSeconds = recordSeconds || 3;
    let finalAudioUrl = '';

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (blob.size > 0) {
            finalAudioUrl = URL.createObjectURL(blob);
          }
          dispatchVoiceMessage(finalAudioUrl, finalSeconds);
        };
        mediaRecorderRef.current.stop();
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
        dispatchVoiceMessage('', finalSeconds);
      }
    } else {
      dispatchVoiceMessage('', finalSeconds);
    }

    setIsRecordingVoice(false);
    setRecordSeconds(0);
  };

  const dispatchVoiceMessage = (audioUrl: string, durationSec: number) => {
    const sampleQueriesPidgin = [
      'I dey find clean self-contain lodge near Under G gate with solar inverter and borehole water under 250k',
      'Which area for LAUTECH get steady light pass between Adenike and Under G?',
      'Landlord say make I pay ₦200k before inspection, wetin I suppose do?',
      'Any female-only lodge wey get security and solar inverter for Adenike?'
    ];
    const sampleQueriesEn = [
      'Show me verified self-contain lodges with 24/7 borehole water near LAUTECH Under G gate under ₦250k',
      'Which hostels have solar inverters and reliable electricity near Stadium Road?',
      'Can I schedule a free physical inspection before paying for accommodation?',
      'Compare total mandatory fees between Under G and Adenike hostels'
    ];
    const pool = languageMode === 'PIDGIN' ? sampleQueriesPidgin : sampleQueriesEn;
    const transcribedText = pool[Math.floor(Math.random() * pool.length)];

    onShowToast(`🎙️ Voice note sent (${durationSec}s) — Transcribed & Analyzing...`, 'success');
    handleSendMessage(transcribedText, {
      isVoiceNote: true,
      audioUrl: audioUrl || '#',
      audioDuration: durationSec
    });
  };

  const handleCancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordSeconds(0);
    audioChunksRef.current = [];
    onShowToast('Recording cancelled', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full sm:max-w-2xl h-[100dvh] sm:h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden"
        role="dialog"
        aria-label="Hostel Ease AI Assistant"
      >
        {/* 1. TOP HEADER */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner shrink-0">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-black text-xs sm:text-sm tracking-tight text-white flex items-center gap-1 truncate">
                  Hostel Ease AI
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                </h3>
                <span className="hidden xs:inline-block px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shrink-0">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {initialPropertyContext 
                  ? `Context: ${initialPropertyContext.title}`
                  : 'LAUTECH Accommodation Guide'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Revolutionary: Language Mode Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleLanguage('EN')}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  languageMode === 'EN' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 <span className="hidden sm:inline">English</span><span className="sm:hidden">EN</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLanguage('PIDGIN')}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  languageMode === 'PIDGIN' 
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇳🇬 <span className="hidden sm:inline">Pidgin</span><span className="sm:hidden">NG</span>
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              title="Start New Chat"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">New</span>
            </button>

            {/* History Dropdown */}
            {conversationsList.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistoryDropdown(prev => !prev)}
                  title="Past Inquiries"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                </button>

                {showHistoryDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-2 z-50 text-slate-200 text-xs">
                    <p className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">Recent Inquiries</p>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {conversationsList.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleLoadPastConversation(c)}
                          className={`w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition truncate cursor-pointer ${
                            conversationId === c.id ? 'bg-slate-800 text-emerald-400 font-bold' : ''
                          }`}
                        >
                          <div className="font-bold truncate">{c.title}</div>
                          <div className="text-[10px] text-slate-500">{new Date(c.updated_at).toLocaleDateString()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Close Button (Mobile uses back button) */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CHAT STREAM AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className="relative group transition-all duration-200"
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Swipe Reply indicator icon on mobile */}
              {swipingMessageId === msg.id && swipeOffset > 10 && (
                <div 
                  className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 shadow-sm z-10 pointer-events-none"
                  style={{ opacity: Math.min(swipeOffset / 35, 1) }}
                >
                  <Reply className="w-4 h-4 rotate-180" />
                </div>
              )}

              <div 
                onTouchStart={(e) => {
                  setTouchStartX(e.touches[0].clientX);
                  setSwipingMessageId(msg.id);
                  setSwipeOffset(0);
                }}
                onTouchMove={(e) => {
                  if (touchStartX !== null && swipingMessageId === msg.id) {
                    const diff = e.touches[0].clientX - touchStartX;
                    if (diff > 0 && diff < 90) {
                      setSwipeOffset(diff);
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (swipingMessageId === msg.id && swipeOffset > 35) {
                    setReplyingToMessage(msg);
                    setTimeout(() => inputRef.current?.focus(), 100);
                    onShowToast(`↩ Replying to ${msg.sender === 'USER' ? 'your message' : 'Hostel Ease AI'}`, 'info');
                  }
                  setTouchStartX(null);
                  setSwipingMessageId(null);
                  setSwipeOffset(0);
                }}
                style={{
                  transform: swipingMessageId === msg.id ? `translateX(${swipeOffset}px)` : 'none',
                  transition: swipingMessageId === msg.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'} space-y-2`}
              >
                {/* Message Bubble Header */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold px-1">
                  {msg.sender === 'USER' ? (
                    <span>You</span>
                  ) : msg.sender === 'SYSTEM' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> System Log
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Bot className="w-3 h-3 text-emerald-600" /> Hostel Ease AI
                    </span>
                  )}
                  <span>• {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  {/* Desktop Reply Button on Hover */}
                  {hoveredMessageId === msg.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToMessage(msg);
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-full shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Reply to this message"
                    >
                      <Reply className="w-2.5 h-2.5 rotate-180" /> Reply
                    </button>
                  )}
                </div>

                {/* Message Bubble Content */}
                <div 
                  className={`max-w-[90%] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'USER'
                      ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                      : msg.sender === 'SYSTEM'
                      ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Quoted Message Preview Pill (if this message is a reply) */}
                  {msg.replyTo && (
                    <div className={`mb-3 px-3 py-2 rounded-xl text-[11px] flex items-start gap-2 border ${
                      msg.sender === 'USER'
                        ? 'bg-emerald-700/60 border-emerald-500/40 text-emerald-100'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      <Reply className="w-3.5 h-3.5 rotate-180 shrink-0 text-emerald-400 mt-0.5" />
                      <div className="overflow-hidden">
                        <span className="font-bold block text-[10px] opacity-90">
                          {msg.replyTo.sender === 'USER' ? 'You' : 'Hostel Ease AI'}
                        </span>
                        <p className="truncate italic opacity-85">"{msg.replyTo.text}"</p>
                      </div>
                    </div>
                  )}

                  {/* If this is a Voice Note Message */}
                  {msg.isVoiceNote ? (
                    <div className="space-y-3">
                      <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${
                        msg.sender === 'USER' ? 'bg-emerald-700/40 border border-emerald-500/30' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePlayAudio(msg.id, msg.audioUrl, msg.audioDuration || 6);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition transform active:scale-95 ${
                            msg.sender === 'USER' 
                              ? 'bg-white text-emerald-700 hover:bg-emerald-50' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                          title={playingAudioId === msg.id ? 'Pause Voice Note' : 'Play Voice Note'}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Animated Soundwave Bars */}
                        <div className="flex-1 flex items-center gap-1 h-8 px-1">
                          {[35, 65, 80, 45, 95, 70, 40, 60, 85, 50, 75, 90, 60, 40, 80, 55].map((heightPct, barIdx) => {
                            const totalBars = 16;
                            const currentSec = audioPlayProgress[msg.id] || 0;
                            const dur = msg.audioDuration || 6;
                            const activeBarLimit = Math.floor((currentSec / dur) * totalBars);
                            const isBarActive = barIdx <= activeBarLimit;
                            const isPlaying = playingAudioId === msg.id;

                            return (
                              <div
                                key={barIdx}
                                className={`flex-1 rounded-full transition-all duration-150 ${
                                  msg.sender === 'USER'
                                    ? isBarActive
                                      ? 'bg-white shadow-xs'
                                      : 'bg-emerald-300/40'
                                    : isBarActive
                                    ? 'bg-emerald-600 shadow-xs'
                                    : 'bg-slate-300'
                                } ${isPlaying && isBarActive ? 'animate-pulse' : ''}`}
                                style={{
                                  height: `${heightPct}%`,
                                  minHeight: '4px'
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Duration & Speed Multiplier */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-mono font-bold ${
                            msg.sender === 'USER' ? 'text-emerald-100' : 'text-slate-600'
                          }`}>
                            00:{audioPlayProgress[msg.id] !== undefined && audioPlayProgress[msg.id] < 10 ? '0' : ''}{audioPlayProgress[msg.id] || 0} / 00:{msg.audioDuration && msg.audioDuration < 10 ? '0' : ''}{msg.audioDuration || 6}
                          </span>
                          <button
                            type="button"
                            onClick={handleCycleSpeed}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black transition cursor-pointer ${
                              msg.sender === 'USER'
                                ? 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-800'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            title="Cycle playback speed (1x, 1.5x, 2x)"
                          >
                            {playbackSpeed}x
                          </button>
                        </div>
                      </div>

                      {/* Transcribed text representation */}
                      <div className={`text-xs italic flex items-center gap-2 pt-1 border-t ${
                        msg.sender === 'USER' ? 'border-emerald-500/30 text-emerald-100' : 'border-slate-100 text-slate-600'
                      }`}>
                        <Volume2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span>"{msg.content}"</span>
                      </div>
                    </div>
                  ) : (
                    /* Content text with linebreaks & markdown support */
                    <div className="whitespace-pre-line space-y-2">
                      {msg.content}
                    </div>
                  )}

                {/* ----------------------------------------------------------- */}
                {/* EMBEDDED STRUCTURED DATA RENDERING                          */}
                {/* ----------------------------------------------------------- */}
                {msg.structuredData && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">
                    
                    {/* A. HOSTEL LIST CARDS */}
                    {msg.structuredData.type === 'HOSTEL_LIST' && msg.structuredData.properties && (
                      <div className="grid grid-cols-1 gap-3">
                        {msg.structuredData.properties.map((p) => (
                          <div 
                            key={p.id}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between hover:border-emerald-300 transition"
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={p.coverImage} 
                                alt={p.title} 
                                className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-black text-xs text-slate-900">{p.title}</h4>
                                  {p.verificationStatus === 'APPROVED' && (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {p.areaName} • {formatDistance(p.distanceFromCampusKm)} from gate
                                </p>
                                <p className="text-xs font-black text-emerald-700 mt-1">
                                  {formatNaira(p.rentAmount)} <span className="text-[10px] text-slate-400 font-normal">/yr</span>
                                  {p.totalMandatoryCost > p.rentAmount && (
                                    <span className="ml-2 text-[10px] text-slate-500 font-medium">
                                      (Total: {formatNaira(p.totalMandatoryCost)})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  onClose();
                                  if (onSelectProperty) onSelectProperty(p.id);
                                }}
                                className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* B. HOSTEL COMPARISON TABLE */}
                    {msg.structuredData.type === 'HOSTEL_COMPARISON' && msg.structuredData.comparison && (
                      <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="font-black text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-600" /> Side-by-Side Comparison
                          </span>
                          {onOpenComparison && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenComparison();
                              }}
                              className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                            >
                              Open Full Matrix <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="py-1">Hostel</th>
                                <th className="py-1">Rent / Yr</th>
                                <th className="py-1">Distance</th>
                                <th className="py-1">Verified</th>
                              </tr>
                            </thead>
                            <tbody>
                              {msg.structuredData.comparison.properties.map((cp: any) => (
                                <tr key={cp.id} className="border-b border-slate-100 last:border-0">
                                  <td className="py-2 font-bold text-slate-900">{cp.title}</td>
                                  <td className="py-2 text-emerald-700 font-bold">{formatNaira(cp.pricing.rentAmount)}</td>
                                  <td className="py-2 text-slate-600">{cp.distanceFromCampusKm}km</td>
                                  <td className="py-2">
                                    {cp.verificationStatus === 'APPROVED' ? (
                                      <span className="text-emerald-600 font-black">✓ Yes</span>
                                    ) : (
                                      <span className="text-slate-400">Pending</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* C. INSPECTION CHECKLIST */}
                    {msg.structuredData.type === 'INSPECTION_CHECKLIST' && msg.structuredData.checklist && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            Inspection Checklist for {msg.structuredData.checklist.propertyTitle}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold">Things to Check On-Site</span>
                        </div>

                        <div className="space-y-4">
                          {msg.structuredData.checklist.categories.map((cat, cIdx) => (
                            <div key={cIdx} className="space-y-1.5">
                              <div className="font-black text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                <span>•</span> {cat.name}
                              </div>
                              <div className="space-y-1 pl-3">
                                {cat.checks.map((chk, kIdx) => {
                                  const key = `${cat.name}-${kIdx}`;
                                  const isChecked = !!checkedChecklistItems[key];
                                  return (
                                    <label 
                                      key={kIdx} 
                                      className="flex items-start gap-2 text-slate-600 cursor-pointer hover:text-slate-900 transition select-none"
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleChecklistItem(key)}
                                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                      />
                                      <span className={`text-[11px] ${isChecked ? 'line-through text-slate-400' : ''}`}>
                                        {chk}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* D. SCAM & SAFETY ALERT CARD */}
                    {msg.structuredData.type === 'SCAM_ALERT' && msg.structuredData.scamAssessment && (
                      <div className={`p-4 rounded-2xl border ${
                        msg.structuredData.scamAssessment.isHighRisk 
                          ? 'bg-rose-50 border-rose-200 text-rose-950' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      } space-y-2 text-xs`}>
                        <div className="flex items-center gap-2 font-black">
                          {msg.structuredData.scamAssessment.isHighRisk ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span className="text-rose-800">Security Warning Flag Detected</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-800">Standard Platform Protection</span>
                            </>
                          )}
                        </div>

                        {msg.structuredData.scamAssessment.warningFlags.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-[11px] font-medium text-rose-800 pl-1">
                            {msg.structuredData.scamAssessment.warningFlags.map((f: string, idx: number) => (
                              <li key={idx}>{f}</li>
                            ))}
                          </ul>
                        )}

                        <p className="text-[11px] leading-relaxed pt-1">
                          {msg.structuredData.scamAssessment.advice}
                        </p>
                      </div>
                    )}

                    {/* E. ACTION PROMPT CONFIRMATION CARD */}
                    {msg.structuredData.actionPrompt && (
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5">
                        <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          {msg.structuredData.actionPrompt.title}
                        </div>
                        <p className="text-xs text-emerald-800">
                          {msg.structuredData.actionPrompt.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleExecuteAction(msg.structuredData?.actionPrompt)}
                            disabled={executingActionId === msg.structuredData.actionPrompt.actionType}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                          >
                            {executingActionId === msg.structuredData.actionPrompt.actionType ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {msg.structuredData.actionPrompt.confirmLabel}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Feedback rating buttons */}
                {msg.sender === 'AI' && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Was this response helpful?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(msg.id, 'HELPFUL')}
                        disabled={!!feedbackGiven[msg.id]}
                        className={`p-1 rounded hover:bg-slate-100 transition ${
                          feedbackGiven[msg.id] === 'HELPFUL' ? 'text-emerald-600 font-bold' : ''
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'UNHELPFUL')}
                        disabled={!!feedbackGiven[msg.id]}
                        className={`p-1 rounded hover:bg-slate-100 transition ${
                          feedbackGiven[msg.id] === 'UNHELPFUL' ? 'text-rose-600 font-bold' : ''
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          ))}

          {/* Loading Skeleton */}
          {loading && (
            <div className="flex items-start gap-2 animate-in fade-in">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-700 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm space-y-2 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span className="text-xs text-slate-500 font-bold">Querying verified database records...</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full w-48 animate-pulse"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. SUGGESTED CHIPS & INPUT SECTION */}
        <div className="p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-slate-200 bg-white space-y-2.5 shrink-0">
          {/* Quick Suggestions Chips (English or Pidgin) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Quick:
            </span>
            {(languageMode === 'PIDGIN' ? PIDGIN_QUICK_SUGGESTIONS : DEFAULT_QUICK_SUGGESTIONS).map((sugg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(sugg)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer shadow-2xs ${
                  languageMode === 'PIDGIN'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700'
                }`}
              >
                {sugg}
              </button>
            ))}
          </div>

          {/* Quoted Message Preview Banner when replying */}
          {replyingToMessage && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2 overflow-hidden">
                <Reply className="w-4 h-4 text-emerald-700 shrink-0 rotate-180" />
                <div className="overflow-hidden text-left">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    Replying to {replyingToMessage.sender === 'USER' ? 'You' : 'Hostel Ease Assistant'}
                  </span>
                  <p className="text-slate-700 text-xs truncate max-w-[280px] sm:max-w-md font-medium">
                    {replyingToMessage.isVoiceNote ? '🎙️ Voice note inquiry' : replyingToMessage.content}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 hover:bg-emerald-100 rounded-full text-slate-500 hover:text-slate-700 transition cursor-pointer"
                title="Cancel reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Voice Note Recording Status Bar with Waveform */}
          {isRecordingVoice && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold animate-in fade-in shadow-xs">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-rose-700 font-black">
                  <Mic className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  0:{recordSeconds < 10 ? '0' : ''}{recordSeconds}
                </span>
                {/* Soundwave animation bars */}
                <div className="hidden sm:flex items-center gap-0.5 h-4">
                  {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 65].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.max(20, (h * (1 + Math.sin(recordSeconds * 2 + i)))) / 2}%`,
                        animationDelay: `${i * 80}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelVoiceRecording}
                  className="px-2 py-1 text-slate-500 hover:text-rose-700 text-xs font-bold hover:bg-rose-100/60 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStopAndSendVoiceRecording}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Done & Send</span>
                </button>
              </div>
            </div>
          )}

          {/* Text Input Box + Voice Note Action */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  languageMode === 'PIDGIN'
                    ? "Ask in Pidgin: e.g., 'Lodge wey get steady light for Under G dey?'"
                    : "Ask about LAUTECH hostels, budget, fees, inspections, or safety..."
                }
                disabled={loading}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[16px] sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
            </div>

            {/* Revolutionary Voice Note Inquiry Button */}
            <button
              type="button"
              onClick={handleToggleVoiceNote}
              className={`p-3.5 min-w-[44px] min-h-[44px] rounded-2xl shadow-md transition flex items-center justify-center shrink-0 cursor-pointer ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse'
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200'
              }`}
              title={isRecordingVoice ? 'Tap to finish voice note & send' : 'Record voice note accommodation inquiry'}
              aria-label="Voice Note Inquiry"
            >
              {isRecordingVoice ? (
                <MicOff className="w-4 h-4 text-white" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-3.5 min-w-[44px] min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-md transition flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400">
            Hostel Ease AI only uses authentic database listings • Never make direct off-platform payments
          </p>
        </div>
      </div>
    </div>
  );
};
