import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  ChevronRight, 
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
  Plus
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
            content: `Hello! I'm your **Hostel Ease AI Assistant**. I can help you find verified hostels around LAUTECH, break down rent & mandatory fees, compare accommodations, check your booking status, or prepare inspection checklists. What are you looking for today?`,
            structuredData: {
              type: 'CLARIFYING_QUESTION',
              suggestedQueries: DEFAULT_QUICK_SUGGESTIONS
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

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    setInputQuery('');
    const userTempId = `user-${Date.now()}`;
    const newMsg: AIMessage = {
      id: userTempId,
      conversation_id: conversationId || 'temp',
      sender: 'USER',
      content: query,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-2xl h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-200"
        role="dialog"
        aria-label="Hostel Ease AI Assistant"
      >
        {/* 1. TOP HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                  Hostel Ease AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                  Zero Hallucination
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {initialPropertyContext 
                  ? `Property Context: ${initialPropertyContext.title}`
                  : 'LAUTECH Accommodation Intelligence & Decision Guide'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              title="Start New Chat"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            {/* History Dropdown */}
            {conversationsList.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistoryDropdown(prev => !prev)}
                  title="Past Inquiries"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
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
                          className={`w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition truncate ${
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

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
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
              className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Message Bubble Header */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold px-1">
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
                {/* Content text with linebreaks & markdown support */}
                <div className="whitespace-pre-line space-y-2">
                  {msg.content}
                </div>

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
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {DEFAULT_QUICK_SUGGESTIONS.map((sugg, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sugg)}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 transition whitespace-nowrap"
              >
                {sugg}
              </button>
            ))}
          </div>

          {/* Text Input Box */}
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
                placeholder="Ask about LAUTECH hostels, budget, fees, inspections, or safety..."
                disabled={loading}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-md transition flex items-center justify-center shrink-0"
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
