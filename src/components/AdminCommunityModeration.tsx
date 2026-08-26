import React, { useState, useEffect } from 'react';
import { Shield, Flag, CheckCircle2, EyeOff, MessageSquare, AlertTriangle, RefreshCw, X, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

export const AdminCommunityModeration: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [hideEntity, setHideEntity] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchModerationData = async () => {
    setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        api.admin ? fetch('/api/community/admin/reports', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()) : { reports: [] },
        fetch('/api/community/admin/unanswered', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
      ]);

      setReports(rRes.reports || []);
      setUnansweredQuestions(uRes.unanswered || []);
    } catch (err) {
      console.error('Failed to fetch admin moderation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  const handleResolve = async (actionStatus: 'RESOLVED' | 'DISMISSED' | 'ACTION_TAKEN') => {
    if (!selectedReport) return;
    setResolving(true);
    try {
      await fetch(`/api/community/admin/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: actionStatus,
          adminNotes: adminNotes.trim(),
          hideEntity
        })
      });

      setSelectedReport(null);
      setAdminNotes('');
      setHideEntity(false);
      fetchModerationData();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Community & Roommate Moderation (Phase 14)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Trust & Safety moderation queue for student reports, roommate safety, and Q&A content quality
          </p>
        </div>

        <button
          onClick={fetchModerationData}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden space-y-3 p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-400" />
          <span>Reported Community Content & Roommate Disputes ({reports.length})</span>
        </h3>

        {reports.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            ✓ No open community moderation reports. Platform is clean.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Reporter</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono text-[10px] text-emerald-400">{r.entity_type}</td>
                    <td className="p-3 font-bold text-rose-300">{r.reason}</td>
                    <td className="p-3">{r.reporter_name}</td>
                    <td className="p-3 max-w-xs truncate text-[11px] text-slate-400">{r.description || 'No description provided'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        r.status === 'OPEN'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'OPEN' && (
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow"
                        >
                          Moderate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unanswered Questions Quality Inspector */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Unanswered Student Questions ({unansweredQuestions.length})</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          Admins can post official verified guide answers to resolve unanswered student inquiries without AI fabrication.
        </p>

        <div className="space-y-2">
          {unansweredQuestions.slice(0, 5).map((q) => (
            <div key={q.id} className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{q.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Category: {q.category} • Asked by {q.author_name}</p>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">
                UNANSWERED
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Moderation Action Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Moderate {selectedReport.entity_type} ({selectedReport.reason})</span>
              </h4>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-300">
              <p><strong>Reporter:</strong> {selectedReport.reporter_name}</p>
              <p><strong>Report Reason:</strong> {selectedReport.reason}</p>
              <p><strong>Details:</strong> {selectedReport.description || 'N/A'}</p>

              <div>
                <label className="font-bold text-white block mb-1">Admin Investigation Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record justification and actions taken for immutable audit log..."
                  rows={3}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer text-amber-300">
                <input
                  type="checkbox"
                  checked={hideEntity}
                  onChange={(e) => setHideEntity(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <span>Hide offending content immediately from public view</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve('DISMISSED')}
                  className="px-4 py-2 bg-slate-800 text-slate-200 hover:text-white rounded-xl font-bold"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve('ACTION_TAKEN')}
                  disabled={resolving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow"
                >
                  Apply Action
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
