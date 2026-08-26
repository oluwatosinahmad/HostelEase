import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, CheckCircle2, AlertCircle, Send, 
  Clock, FileText, User, Building, MessageSquare, AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';
import { DisputeItem, DisputeMessageItem } from '../types/hostelEase';

interface DisputeCenterModalProps {
  isOpen: boolean;
  disputeId: string;
  onClose: () => void;
}

export const DisputeCenterModal: React.FC<DisputeCenterModalProps> = ({
  isOpen,
  disputeId,
  onClose
}) => {
  const [dispute, setDispute] = useState<DisputeItem | null>(null);
  const [messages, setMessages] = useState<DisputeMessageItem[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = () => {
    if (!disputeId) return;
    setLoading(true);
    api.disputes.getById(disputeId)
      .then(res => {
        setDispute(res.dispute);
        setMessages(res.messages || []);
      })
      .catch(err => {
        setError(err.message || 'Failed to load dispute investigation');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && disputeId) {
      fetchDetails();
    }
  }, [isOpen, disputeId]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      await api.disputes.sendMessage(disputeId, {
        message: replyMessage.trim()
      });
      setReplyMessage('');
      fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">RESOLVED ✓</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-xs">UNDER REVIEW</span>;
      case 'WAITING_FOR_INFORMATION':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">ACTION REQUIRED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-xs">ESCALATED TO ADMIN</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full font-bold text-xs">CLOSED</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">OPEN</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-between pr-12">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Dispute Case #{dispute?.disputeCode || '...'}</span>
              </div>
              <h2 className="text-xl font-bold text-white">{dispute?.subject || 'Dispute Investigation'}</h2>
            </div>
            {dispute && getStatusBadge(dispute.status)}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm font-medium">Loading dispute timeline...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : dispute ? (
            <>
              {/* Summary Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-gray-500 block">Hostel Listing:</span>
                  <span className="font-bold text-gray-900">{dispute.propertyTitle}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Booking Reference:</span>
                  <span className="font-mono font-bold text-emerald-700">{dispute.bookingReference}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Category:</span>
                  <span className="font-semibold text-gray-900">{dispute.category.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Resolution Card if Resolved */}
              {dispute.status === 'RESOLVED' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Official Resolution: {dispute.resolutionType}</span>
                  </div>
                  <p className="text-xs text-emerald-800">{dispute.resolutionNotes}</p>
                  {dispute.refundAmount && dispute.refundAmount > 0 ? (
                    <p className="text-xs font-bold text-emerald-900 pt-1">
                      Refund Granted: ₦{dispute.refundAmount.toLocaleString()}
                    </p>
                  ) : null}
                </div>
              )}

              {/* Messages & Timeline Thread */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Case Investigation Timeline
                </h4>

                <div className="space-y-3">
                  {messages.map((m) => {
                    const isAdmin = m.senderRole === 'ADMIN';
                    const isProvider = m.senderRole === 'PROVIDER';
                    return (
                      <div 
                        key={m.id}
                        className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                          isAdmin 
                            ? 'bg-purple-50/70 border-purple-200 ml-4' 
                            : isProvider 
                            ? 'bg-blue-50/70 border-blue-200 mr-4' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className={`font-bold ${
                            isAdmin ? 'text-purple-900' : isProvider ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {m.senderName} ({m.senderRole})
                          </span>
                          <span className="text-gray-400">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Message Input Footer */}
        {dispute && dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2 shrink-0">
            <input
              type="text"
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              placeholder="Type message or update for this dispute case..."
              className="flex-1 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-900 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !replyMessage.trim()}
              className="px-5 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
