import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  RefreshCw, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  ListChecks, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Send, 
  Receipt, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Clock,
  Volume2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira } from '../utils/formatters';

interface LiveVirtualTourModalProps {
  inspectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onReserveProperty?: (propertyId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

interface ChatMessage {
  id: string;
  sender: 'STUDENT' | 'AGENT';
  senderName: string;
  text: string;
  timestamp: string;
}

interface InquiryItem {
  id: string;
  question: string;
  isCompleted: boolean;
}

export const LiveVirtualTourModal: React.FC<LiveVirtualTourModalProps> = ({
  inspectionId,
  isOpen,
  onClose,
  onReserveProperty,
  onShowToast
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);

  // Call Controls State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'none' | 'checklist' | 'chat'>('checklist');

  // Elapsed Call Timer
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // In-Tour Checklist & Chat
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Media Stream References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Inspection Session
  useEffect(() => {
    if (!isOpen || !inspectionId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.inspections.getSession(inspectionId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.session;
        setSession(data);

        // Parse student inquiries from notes or default questions
        const extractedQuestions: InquiryItem[] = [];
        if (data.notes) {
          const parts = data.notes.split(/[;•\n,]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          parts.forEach((part: string, idx: number) => {
            extractedQuestions.push({
              id: `q-${idx}`,
              question: part.replace(/^[•\-\*]\s*/, ''),
              isCompleted: false
            });
          });
        }

        if (extractedQuestions.length === 0) {
          extractedQuestions.push(
            { id: 'q-default-1', question: 'Show me the bathroom & water flow', isCompleted: false },
            { id: 'q-default-2', question: 'Show me the electrical sockets & ventilation', isCompleted: false },
            { id: 'q-default-3', question: 'Show me the room entrance & security lock', isCompleted: false },
            { id: 'q-default-4', question: 'Show me the compound & surroundings', isCompleted: false }
          );
        }

        setInquiries(extractedQuestions);

        // Pre-populate system greeting
        const isAgent = data.userRoleInSession === 'AGENT' || data.userRoleInSession === 'ADMIN';
        setChatMessages([
          {
            id: 'msg-init-1',
            sender: 'AGENT',
            senderName: data.agent?.name || 'Verified Agent',
            text: isAgent 
              ? `Hello ${data.student?.name || 'Student'}! Welcome to the live walkthrough of ${data.property?.title}. Let me know anything specific you would like to examine.`
              : `Hello! I am ready to show you around ${data.property?.title}. Feel free to ask questions or request close-ups anytime!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load live tour session:', err);
        setError(err.message || 'Access restricted. You must be the scheduled student or assigned agent to access this live tour.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, inspectionId]);

  // Elapsed Timer
  useEffect(() => {
    if (!isOpen || loading || error) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, loading, error]);

  // Camera & Stream Initialization
  useEffect(() => {
    if (!isOpen || loading || error) return;

    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: true
          });
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch (camErr) {
        console.warn('Camera device access declined or unavailable, running in preview mode:', camErr);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, loading, error, facingMode]);

  // Toggle Mute
  const handleToggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Switch Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Toggle Checklist Item
  const handleToggleInquiry = (id: string) => {
    setInquiries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: !item.isCompleted } : item))
    );
  };

  // Send Chat Message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : chatInput).trim();
    if (!text || !session) return;

    const isAgent = session.userRoleInSession === 'AGENT' || session.userRoleInSession === 'ADMIN';
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: isAgent ? 'AGENT' : 'STUDENT',
      senderName: isAgent ? (session.agent?.name || 'Agent') : (session.student?.name || 'Student'),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newMsg]);
    if (textToSend === undefined) {
      setChatInput('');
    }
  };

  // Format Elapsed Time
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const isAgent = session?.userRoleInSession === 'AGENT' || session?.userRoleInSession === 'ADMIN';
  const completedInquiriesCount = inquiries.filter((i) => i.isCompleted).length;

  return (
    <div 
      ref={modalContainerRef}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden text-white animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE TOUR</span>
          </div>

          {/* Time Counter */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-300 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Property & Space Title */}
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-black text-white truncate">
              {session?.property?.title || 'Live Hostel Inspection'}
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium truncate">
              {session?.room?.name ? `${session.room.name} (Live View)` : 'Full Hostel & Space Walkthrough'}
            </p>
          </div>
        </div>

        {/* Participants & Controls */}
        <div className="flex items-center gap-2">
          {/* Role Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">
              {isAgent ? `Host: ${session?.agent?.name || 'Agent'}` : `Viewing as ${session?.student?.name || 'Student'}`}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
          </div>

          {/* Toggle Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close / Leave Tour */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
            title="Leave Walkthrough"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <div>
              <h3 className="font-bold text-base text-white">Connecting to Secure Inspection Stream...</h3>
              <p className="text-xs text-slate-400 mt-1">Verifying room cryptographic session and participant credentials.</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Live Tour Access Restricted</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Left: Video Viewport & Controls */}
            <div className="flex-1 flex flex-col relative bg-black justify-between overflow-hidden">
              {/* Video Element / Simulated Feed */}
              <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* If camera is off or fallback mode */}
                {isVideoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <VideoOff className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Host Camera is Temporarily Paused</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Audio and live text communication remain active. You can still ask questions or review property specs.
                      </p>
                    </div>
                  </div>
                )}

                {/* Floating Participant Tag on Video */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/10 text-xs flex items-center gap-2 shadow-lg">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white block leading-tight">
                        {session?.agent?.name || 'Verified Agent'} (Host)
                      </span>
                      <span className="text-[10px] text-slate-300">Live Camera Stream</span>
                    </div>
                  </div>

                  {session?.room?.name && (
                    <div className="px-3 py-1 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-[11px] font-bold text-emerald-300 shadow">
                      Inspecting: {session.room.name}
                    </div>
                  )}
                </div>

                {/* Floating Quick Action for Student: Reserve Now */}
                {!isAgent && onReserveProperty && session?.property?.id && (
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onReserveProperty(session.property.id);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-xl shadow-emerald-950/40 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer border border-emerald-400/30"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Reserve This Room Now</span>
                    </button>
                  </div>
                )}

                {/* Inquiries Progress Floating Pill */}
                <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs">
                  <ListChecks className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300">
                    Inquiries Verified: <strong>{completedInquiriesCount}/{inquiries.length}</strong>
                  </span>
                </div>
              </div>

              {/* Bottom Video Control Bar */}
              <div className="h-20 px-4 sm:px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between z-20">
                {/* Media toggles */}
                <div className="flex items-center gap-2">
                  {/* Mic Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Video Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleVideo}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      isVideoOff
                        ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>

                  {/* Flip Camera (Agent / Mobile) */}
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Flip Camera (Front/Rear)"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Central Drawer Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel((prev) => (prev === 'checklist' ? 'none' : 'checklist'))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeSidePanel === 'checklist'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    <span className="hidden sm:inline">Inquiries Checklist</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-900/60 text-[10px]">
                      {completedInquiriesCount}/{inquiries.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSidePanel((prev) => (prev === 'chat' ? 'none' : 'chat'))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeSidePanel === 'chat'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">In-Tour Chat</span>
                    {chatMessages.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-[10px]">
                        {chatMessages.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Leave / End Tour Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{isAgent ? 'End Walkthrough' : 'Leave Tour'}</span>
                </button>
              </div>
            </div>

            {/* Right: Side Drawer (Checklist or Chat) */}
            {activeSidePanel !== 'none' && (
              <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-72 lg:h-full z-20">
                {/* Side Panel Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeSidePanel === 'checklist' ? (
                      <>
                        <ListChecks className="w-4 h-4 text-purple-400" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                          Student Inquiries Checklist
                        </h3>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                          Live In-Tour Chat
                        </h3>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel('none')}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel 1: Checklist */}
                {activeSidePanel === 'checklist' && (
                  <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-3">
                    <p className="text-[11px] text-slate-400">
                      Check off items as the host walks through each specific area of the hostel room:
                    </p>

                    <div className="space-y-2">
                      {inquiries.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleInquiry(item.id)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            item.isCompleted
                              ? 'bg-purple-950/40 border-purple-800/80 text-purple-200'
                              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="mt-0.5">
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 text-xs">
                            <span className={item.isCompleted ? 'line-through text-slate-400' : 'font-medium'}>
                              {item.question}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Quick inquiry prompt for student */}
                    {!isAgent && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSidePanel('chat');
                            handleSendMessage('Could you please show me the wardrobe space and electrical sockets?');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Ask host to inspect wardrobe</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Panel 2: Live Chat */}
                {activeSidePanel === 'chat' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Messages Container */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                      {chatMessages.map((msg) => {
                        const isMe = (isAgent && msg.sender === 'AGENT') || (!isAgent && msg.sender === 'STUDENT');
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[10px] text-slate-400 mb-0.5">
                              {msg.senderName} • {msg.timestamp}
                            </span>
                            <div
                              className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-emerald-600 text-white rounded-br-xs'
                                  : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Message Chips */}
                    <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Can you zoom into the bathroom?')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        🚿 Bathroom close-up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Is there a socket near the bed?')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        🔌 Sockets check
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('The water pressure looks great!')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        👍 Water looks good
                      </button>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage();
                        }}
                        placeholder="Type a message or question..."
                        className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim()}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
