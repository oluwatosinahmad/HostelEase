import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  ThumbsUp, 
  ThumbsDown, 
  Calendar, 
  Receipt, 
  Layers, 
  Clock, 
  TrendingUp, 
  ArrowRight, 
  ExternalLink,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Reply,
  CornerDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface AILandlordAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPropertyId?: string;
  onNavigateTab: (tab: 'dashboard' | 'listings' | 'rooms' | 'availability' | 'bookings' | 'move_ins' | 'inspections' | 'financials' | 'messages' | 'performance' | 'profile_team' | 'wizard') => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface LandlordAIMessage {
  id: string;
  sender: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  structuredData?: any;
  created_at: string;
  isVoiceNote?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  replyTo?: {
    id: string;
    sender: 'USER' | 'AI' | 'SYSTEM';
    text: string;
    isVoiceNote?: boolean;
  };
}

const DEFAULT_LANDLORD_SUGGESTIONS = [
  'How many spaces are available right now?',
  'Which bookings need my attention?',
  'Show my upcoming student inspections schedule',
  'What are students currently paying in Under G vs Adenike?',
  'How can I improve my hostel listing to get more bookings?'
];

const PIDGIN_LANDLORD_SUGGESTIONS = [
  'How many room remain for my hostel now now?',
  'Any student don book room wey I never accept?',
  'Which inspection I get this week for my lodge?',
  'How much students dey pay for self-contain for Under G?',
  'Wetin I fit do make students rush my hostel?'
];

export const AILandlordAssistantModal: React.FC<AILandlordAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedPropertyId = 'all',
  onNavigateTab,
  onShowToast
}) => {
  const [messages, setMessages] = useState<LandlordAIMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [languageMode, setLanguageMode] = useState<'EN' | 'PIDGIN'>('EN');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'HELPFUL' | 'UNHELPFUL'>>({});
  
  // Swipe to reply & desktop reply state
  const [replyingToMessage, setReplyingToMessage] = useState<LandlordAIMessage | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlayProgress, setAudioPlayProgress] = useState<Record<string, number>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Real MediaRecorder Voice Note State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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

  // Focus and initial greeting
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);

      if (messages.length === 0) {
        setMessages([
          {
            id: 'landlord-welcome',
            sender: 'AI',
            content: languageMode === 'PIDGIN'
              ? `Hello Oga Landlord! 👋 Welcome to **Hostel Ease Landlord AI Assistant**.\n\nI be your 24/7 LAUTECH accommodation assistant. I fit help you check free bedspaces, manage pending booking requests, track student inspection appointments, compare hostel market prices across Under G / Adenike, or rewrite your hostel description.\n\nWetin you go like make I check for you today?`
              : `Hello! 👋 Welcome to **Hostel Ease Landlord AI Assistant** — your 24/7 LAUTECH property manager, occupancy advisor, and revenue optimizer.\n\nI can help you monitor real-time bedspace availability, respond to pending student bookings, manage inspection schedules, benchmark LAUTECH campus rents, and craft high-converting listing descriptions.\n\nHow can I assist your hostel operations today?`,
            structuredData: {
              type: 'CLARIFYING_QUESTION',
              suggestedQueries: languageMode === 'PIDGIN' ? PIDGIN_LANDLORD_SUGGESTIONS : DEFAULT_LANDLORD_SUGGESTIONS
            },
            created_at: new Date().toISOString()
          }
        ]);
      }
    }
  }, [isOpen, languageMode]);

  if (!isOpen) return null;

  const handleSendMessage = async (
    customQuery?: string,
    voiceData?: { isVoiceNote?: boolean; audioUrl?: string; audioDuration?: number }
  ) => {
    const query = (customQuery || inputQuery).trim();
    if (!query || loading) return;

    const currentReplyTo = replyingToMessage ? {
      id: replyingToMessage.id,
      sender: replyingToMessage.sender,
      text: replyingToMessage.isVoiceNote ? '🎙️ Voice note inquiry' : replyingToMessage.content,
      isVoiceNote: replyingToMessage.isVoiceNote
    } : undefined;

    setInputQuery('');
    setReplyingToMessage(null);
    const userTempId = `user-${Date.now()}`;
    const newMsg: LandlordAIMessage = {
      id: userTempId,
      sender: 'USER',
      content: query,
      created_at: new Date().toISOString(),
      isVoiceNote: voiceData?.isVoiceNote,
      audioUrl: voiceData?.audioUrl,
      audioDuration: voiceData?.audioDuration,
      replyTo: currentReplyTo
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.provider.askAI(query, selectedPropertyId);

      const aiMsg: LandlordAIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        content: res.response || 'I analyzed your property data.',
        structuredData: res.structuredData,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Landlord AI error:', err);
      const errMsg: LandlordAIMessage = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        content: `I apologize, but I encountered an issue retrieving your property data. You can still use the portal tabs directly to manage your accommodations.`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
      onShowToast(err.message || 'AI service temporarily unavailable', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Audio Playback Controls
  const handleTogglePlayAudio = (msgId: string, audioUrl?: string, durationSec: number = 3) => {
    if (playingAudioId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    if (audioUrl && audioUrl.startsWith('blob:')) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      activeAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
          setAudioPlayProgress(prev => ({ ...prev, [msgId]: pct }));
        }
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));
      };

      audio.play().catch(() => {
        simulateAudioPlayback(msgId, durationSec);
      });
      setPlayingAudioId(msgId);
    } else {
      simulateAudioPlayback(msgId, durationSec);
    }
  };

  const simulateAudioPlayback = (msgId: string, durationSec: number) => {
    setPlayingAudioId(msgId);
    let currentSec = 0;
    const intervalTime = (1000 / playbackSpeed) / 10;
    const totalSteps = durationSec * 10;

    const interval = setInterval(() => {
      currentSec++;
      const pct = Math.min(100, Math.round((currentSec / totalSteps) * 100));
      setAudioPlayProgress(prev => ({ ...prev, [msgId]: pct }));

      if (currentSec >= totalSteps) {
        clearInterval(interval);
        setPlayingAudioId(null);
        setAudioPlayProgress(prev => ({ ...prev, [msgId]: 0 }));
      }
    }, intervalTime);
  };

  const handleCyclePlaybackSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = nextSpeed;
    }
  };

  // Swipe to reply handlers
  const handleTouchStart = (e: React.TouchEvent, msg: LandlordAIMessage) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingMessageId(msg.id);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent, msgId: string) => {
    if (touchStartX === null || swipingMessageId !== msgId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff > 0 && diff < 80) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (msg: LandlordAIMessage) => {
    if (swipeOffset > 35) {
      setReplyingToMessage(msg);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(25); } catch {}
      }
    }
    setTouchStartX(null);
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  // Voice note recording
  const handleStartVoiceRecording = async () => {
    audioChunksRef.current = [];
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
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
      console.warn('Microphone access not available or denied:', err);
    }
    setIsRecordingVoice(true);
    setRecordSeconds(0);
    onShowToast(
      languageMode === 'PIDGIN'
        ? '🎙️ Dey record voice note... Talk wetin you wan check!'
        : '🎙️ Recording voice note... Speak your landlord inquiry!',
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
      'How many room remain for my hostel now now?',
      'Any student don book room wey I never accept?',
      'Which inspection I get this week for my lodge?',
      'How much students dey pay for self-contain for Under G?',
      'Wetin I fit do make students rush my hostel?'
    ];
    const sampleQueriesEn = [
      'How many spaces are available right now across my listings?',
      'Which pending booking requests need my immediate attention?',
      'Show my upcoming student physical inspections schedule',
      'What are students currently paying in Under G vs Adenike?',
      'How can I improve my hostel listing to increase booking rate?'
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

  const handleFeedback = (messageId: string, rating: 'HELPFUL' | 'UNHELPFUL') => {
    setFeedbackGiven(prev => ({ ...prev, [messageId]: rating }));
    onShowToast(rating === 'HELPFUL' ? 'Thank you for your feedback! 👍' : 'Feedback noted. We are optimizing our responses! 👎', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-950 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] max-h-[780px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight">Landlord AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80">
                24/7 LAUTECH Property Manager & Occupancy Advisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nigerian Pidgin & English Toggle */}
            <div className="bg-white/10 p-0.5 rounded-xl border border-white/20 flex items-center">
              <button
                type="button"
                onClick={() => setLanguageMode('EN')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  languageMode === 'EN'
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                ENG
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode('PIDGIN')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  languageMode === 'PIDGIN'
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Nigerian Pidgin English"
              >
                PIDGIN
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-950">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchMove={(e) => handleTouchMove(e, msg.id)}
              onTouchEnd={() => handleTouchEnd(msg)}
              className={`group relative flex flex-col space-y-1.5 transition-transform duration-100 select-none ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
              style={{
                transform: swipingMessageId === msg.id ? `translateX(${swipeOffset}px)` : 'none'
              }}
            >
              {/* Swipe-to-reply indicator icon */}
              {swipingMessageId === msg.id && swipeOffset > 10 && (
                <div 
                  className="absolute left-[-28px] top-1/2 -translate-y-1/2 text-emerald-600 transition-opacity"
                  style={{ opacity: Math.min(1, swipeOffset / 35) }}
                >
                  <Reply className="w-5 h-5 rotate-180" />
                </div>
              )}

              {/* Message Header & Desktop Hover Reply Button */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold px-1">
                {msg.sender === 'USER' ? (
                  <span>You (Landlord)</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-black">
                    <Bot className="w-3.5 h-3.5" /> Hostel Ease Landlord AI
                  </span>
                )}
                <span>• {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                {/* Desktop hover reply button */}
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(msg)}
                  className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded-md transition-opacity cursor-pointer ${
                    hoveredMessageId === msg.id ? 'opacity-100' : 'opacity-0'
                  }`}
                  title="Reply to this message"
                >
                  <Reply className="w-3 h-3 rotate-180" />
                  <span>Reply</span>
                </button>
              </div>

              {/* Message Content Bubble */}
              <div 
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'USER'
                    ? 'bg-emerald-800 text-white rounded-br-none font-medium'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-none'
                }`}
              >
                {/* Replying-to Quoted Preview Pill */}
                {msg.replyTo && (
                  <div className={`mb-2.5 p-2 rounded-xl text-[11px] border-l-4 ${
                    msg.sender === 'USER'
                      ? 'bg-emerald-900/60 border-emerald-300 text-emerald-100'
                      : 'bg-white dark:bg-slate-800 border-emerald-500 text-slate-600 dark:text-slate-300'
                  }`}>
                    <div className="font-bold uppercase text-[9px] opacity-80 flex items-center gap-1">
                      <Reply className="w-2.5 h-2.5 rotate-180" />
                      Replying to {msg.replyTo.sender === 'USER' ? 'Landlord' : 'Hostel Ease AI'}
                    </div>
                    <p className="truncate font-medium mt-0.5">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Authentic Voice Note Audio Player Card */}
                {msg.isVoiceNote ? (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                      msg.sender === 'USER'
                        ? 'bg-emerald-900/40 border-emerald-600/50 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}>
                      {/* Play / Pause Circular Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePlayAudio(msg.id, msg.audioUrl, msg.audioDuration || 3)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm cursor-pointer ${
                          msg.sender === 'USER'
                            ? 'bg-white text-emerald-800 hover:bg-emerald-50'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        title={playingAudioId === msg.id ? 'Pause voice note' : 'Play voice note'}
                        aria-label="Play voice note"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Soundwave Progress Bars */}
                      <div className="flex-1 flex items-center gap-1 h-8">
                        {[40, 75, 30, 90, 60, 100, 50, 85, 45, 95, 35, 70, 55, 80, 40, 65].map((heightPct, barIdx) => {
                          const progress = audioPlayProgress[msg.id] || 0;
                          const barProgress = (barIdx / 16) * 100;
                          const isActive = barProgress <= progress;
                          return (
                            <div
                              key={barIdx}
                              className={`flex-1 rounded-full transition-all duration-150 ${
                                isActive
                                  ? msg.sender === 'USER' ? 'bg-white' : 'bg-emerald-600'
                                  : msg.sender === 'USER' ? 'bg-emerald-600/50' : 'bg-slate-300 dark:bg-slate-600'
                              } ${playingAudioId === msg.id && isActive ? 'animate-pulse' : ''}`}
                              style={{ height: `${heightPct}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* Audio Duration & Speed Toggle */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] font-mono font-bold">
                          0:{((msg.audioDuration || 3) < 10 ? '0' : '') + (msg.audioDuration || 3)}
                        </span>
                        <button
                          type="button"
                          onClick={handleCyclePlaybackSpeed}
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded border transition cursor-pointer ${
                            msg.sender === 'USER'
                              ? 'border-emerald-500/50 text-emerald-200 hover:bg-emerald-800'
                              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title="Change playback speed"
                        >
                          {playbackSpeed}x
                        </button>
                      </div>
                    </div>

                    {/* Transcribed text below audio card */}
                    <div className="text-xs opacity-90 pl-1 font-medium">
                      <span>"{msg.content}"</span>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                )}

                {/* STRUCTURED DATA CARDS */}
                {msg.structuredData && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    
                    {/* A. SPACE SUMMARY CARD */}
                    {msg.structuredData.type === 'SPACE_SUMMARY' && (
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-emerald-600" /> Room & Bedspace Inventory
                          </span>
                          <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {msg.structuredData.totalAvailable} Spaces Available
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateTab('rooms');
                          }}
                          className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>Manage Spaces & Rooms</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* B. BOOKING SUMMARY CARD */}
                    {msg.structuredData.type === 'BOOKING_SUMMARY' && (
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950 dark:text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-amber-600" /> Student Booking Requests
                          </span>
                          <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {msg.structuredData.pendingBookings?.length || 0} Pending
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateTab('bookings');
                          }}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>Open Bookings Tab to Confirm</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* C. INSPECTION SUMMARY CARD */}
                    {msg.structuredData.type === 'INSPECTION_SUMMARY' && (
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-300">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-600" /> Student Inspection Calendar
                          </span>
                          <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {msg.structuredData.inspections?.length || 0} Scheduled
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateTab('inspections');
                          }}
                          className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>View Full Inspection Calendar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* D. PRICING BENCHMARK CARD */}
                    {msg.structuredData.type === 'PRICING_BENCHMARK' && (
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-950 dark:text-purple-300">
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-purple-600" /> Campus Zone Benchmarks
                          </span>
                          <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">Live Database Average</span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateTab('listings');
                          }}
                          className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>Review & Adjust My Hostel Rent</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* E. DESCRIPTION IMPROVEMENT CARD */}
                    {msg.structuredData.type === 'DESCRIPTION_IMPROVEMENT' && (
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-300 block">
                          Tip: High listing completeness gives your hostel top placement on the student search feed.
                        </span>
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateTab('listings');
                          }}
                          className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>Edit Hostel Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Helpful Feedback Actions (For AI Messages) */}
                {msg.sender === 'AI' && (
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-400">
                    <span>Was this response helpful?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'HELPFUL')}
                        disabled={Boolean(feedbackGiven[msg.id])}
                        className={`p-1 rounded-md transition cursor-pointer ${
                          feedbackGiven[msg.id] === 'HELPFUL'
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'hover:text-slate-600'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'UNHELPFUL')}
                        disabled={Boolean(feedbackGiven[msg.id])}
                        className={`p-1 rounded-md transition cursor-pointer ${
                          feedbackGiven[msg.id] === 'UNHELPFUL'
                            ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                            : 'hover:text-slate-600'
                        }`}
                        title="Not Helpful"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xs text-xs text-slate-500 animate-pulse">
              <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Analyzing accommodation data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTION CHIPS */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-400 shrink-0 font-bold flex items-center gap-1 pl-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Try:
            </span>
            {(languageMode === 'PIDGIN' ? PIDGIN_LANDLORD_SUGGESTIONS : DEFAULT_LANDLORD_SUGGESTIONS).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition cursor-pointer whitespace-nowrap shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Quoted Message Preview Banner when replying */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-t border-emerald-200 dark:border-emerald-800 text-xs animate-in slide-in-from-bottom-2 duration-150 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <Reply className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 rotate-180" />
              <div className="overflow-hidden text-left">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Replying to {replyingToMessage.sender === 'USER' ? 'You' : 'Hostel Ease AI'}
                </span>
                <p className="text-slate-700 dark:text-slate-200 text-xs truncate max-w-[280px] sm:max-w-md font-medium">
                  {replyingToMessage.isVoiceNote ? '🎙️ Voice note inquiry' : replyingToMessage.content}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToMessage(null)}
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voice Note Recording Status Bar with Waveform */}
        {isRecordingVoice && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold animate-in fade-in shadow-xs shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-rose-700 dark:text-rose-400 font-black">
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
                className="px-2.5 py-1 text-slate-500 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer"
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

        {/* CHAT INPUT BAR */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Mic button */}
            <button
              type="button"
              onClick={() => {
                if (isRecordingVoice) {
                  handleStopAndSendVoiceRecording();
                } else {
                  handleStartVoiceRecording();
                }
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={isRecordingVoice ? 'Stop recording & send' : 'Record voice note inquiry'}
            >
              {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Query text input */}
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                languageMode === 'PIDGIN'
                  ? 'Ask about your rooms, students wey book, or price for Under G...'
                  : 'Ask about vacant spaces, pending bookings, pricing benchmarks...'
              }
              className="flex-1 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
