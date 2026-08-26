import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  ShieldCheck, 
  Building2, 
  Bot, 
  User, 
  Sparkles, 
  ChevronDown, 
  Check, 
  CheckCheck,
  Headphones,
  Info
} from 'lucide-react';
import { ChatConversation, ChatMessage, UserProfile } from '../types';

interface LiveChatWidgetProps {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
  currentUser: UserProfile | null;
  onSendMessage: (conversationId: string, text: string) => void;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  conversations,
  messages,
  currentUser,
  onSendMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-01');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const activeMessages = messages[activeConversationId] || [];
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, activeMessages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    onSendMessage(activeConversationId, userText);
    setInputText('');

    // Simulate smart bot / landlord auto response after 1.2s
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let reply = 'Thank you for reaching out! A verified CampusNest housing representative or hostel caretaker will respond shortly.';
      
      const lower = userText.toLowerCase();
      if (lower.includes('escrow') || lower.includes('safety') || lower.includes('refund')) {
        reply = '🛡️ CampusNest 48-Hour Escrow Guarantee: Your funds are locked safely until you inspect the keys upon move-in. If anything is wrong, tap "Open Dispute" in your dashboard.';
      } else if (lower.includes('water') || lower.includes('borehole')) {
        reply = '💧 Borehole Inspection: All verified lodges in Under-G and Adenike have verified running borehole water with overhead storage tanks.';
      } else if (lower.includes('light') || lower.includes('meter')) {
        reply = '⚡ Electricity Guarantee: This lodge is equipped with an individual prepaid meter so you only pay for electricity you consume.';
      } else if (lower.includes('viewing') || lower.includes('inspect') || lower.includes('visit')) {
        reply = '📅 Physical Viewing: You can schedule a physical walk-through or request an agent meetup at Under-G or Main Gate.';
      }

      onSendMessage(activeConversationId, reply);
    }, 1200);
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group p-4 bg-brand-600 hover:bg-brand-500 text-white rounded-3xl shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border border-brand-400/30"
          aria-label="Open Live Messenger"
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
          <span className="font-extrabold text-xs hidden sm:inline tracking-wide">Host & Support Chat</span>
          
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black font-mono w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Expanded Modern Chat Window */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-[360px] sm:w-[400px] h-[520px] shadow-2xl overflow-hidden text-white flex flex-col animate-slideUp">
          
          {/* Top Chat Header */}
          <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                {activeConversation?.participantRole === 'support' ? (
                  <div className="w-10 h-10 rounded-2xl bg-teal-600/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                    <Headphones className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                {activeConversation?.isOnline && (
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 absolute -bottom-0.5 -right-0.5"></span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-xs truncate max-w-[170px]">
                    {activeConversation?.participantName}
                  </h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {activeConversation?.propertyTitle || 'LAUTECH Support Desk'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Switcher Tabs */}
          <div className="bg-slate-950/80 px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{conv.participantRole === 'support' ? '🛡️ Safety Helpdesk' : `🏠 ${conv.zoneName || 'Landlord'}`}</span>
                  {conv.unreadCount > 0 && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50 text-xs">
            
            {/* Safety Reminder Banner */}
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex items-start gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>48-Hour Escrow Active:</strong> Always keep payments inside CampusNest. Never transfer cash directly to roadside agents.
              </p>
            </div>

            {activeMessages.map((msg) => {
              const isMe = msg.senderRole === 'student' || msg.senderId === (currentUser?.id || 'user-001');
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 px-1">
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-brand-400" />}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-slate-900/80 rounded-2xl w-28 border border-slate-800 animate-pulse">
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-ping"></span>
                <span>Typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-900/90 px-3 py-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] shrink-0">
            <span className="text-slate-500 font-bold uppercase shrink-0 text-[9px]">Quick:</span>
            {[
              'Is borehole running 24/7?',
              'Prepaid meter policy?',
              'Can I schedule a viewing?',
              'How does 48h escrow protect me?'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(chip)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500 text-slate-300 whitespace-nowrap cursor-pointer transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeConversation?.participantName}...`}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all cursor-pointer shadow-lg shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
