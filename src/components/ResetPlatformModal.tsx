import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Database, 
  Lock, 
  Check,
  Building2,
  Users,
  Video,
  Calendar,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface ResetPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: (report: any) => void;
}

export const ResetPlatformModal: React.FC<ResetPlatformModalProps> = ({
  isOpen,
  onClose,
  onResetComplete
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStage, setResetStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    if (confirmationInput !== 'RESET EVERYTHING' || !acknowledged) return;

    setIsResetting(true);
    setError(null);
    setResetStage('Creating verified automated database backup...');

    try {
      setResetStage('Executing complete platform purge in SQLite transaction...');
      const res = await api.operations.resetEverything('RESET EVERYTHING');
      setResetStage('Complete! Verified 0 records.');
      setReport(res);
      onResetComplete(res);
    } catch (err: any) {
      setError(err.message || 'Platform reset encountered an error.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (isResetting) return;
    setConfirmationInput('');
    setAcknowledged(false);
    setError(null);
    setReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-500/30 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white flex items-center justify-between border-b border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  DANGER ZONE
                </span>
                <span className="text-xs text-rose-300 font-bold">High-Severity Operational Control</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Complete Platform Reset</h3>
            </div>
          </div>
          {!isResetting && (
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200">
          {report ? (
            /* Success Report Screen */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300">
                    Platform Application Data Completely Reset!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1">
                    All application users, listings, media files, bookings, messages, and operational records have been permanently cleared. The platform is clean and ready for fresh operations.
                  </p>
                </div>
              </div>

              {/* Records Cleared Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Users Purged</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.users ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Students & Providers</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Listings Purged</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.properties ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Hostels, Rooms, Beds</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Bookings Purged</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.bookings ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Reservations & History</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Messages Purged</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.messages ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Chats & Inquiries</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Media Files Deleted</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.mediaFiles ?? 0}</div>
                  <div className="text-[10px] text-slate-400">Images & 4K Videos</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Tables Cleared</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">{report.recordsCleared?.totalTablesPurged ?? 60}</div>
                  <div className="text-[10px] text-slate-400">Database Tables</div>
                </div>
              </div>

              {/* Preserved Infrastructure Callout */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Preserved Primary Administrator & Core Infrastructure</span>
                </div>
                <p className="text-slate-300">
                  Account: <strong>{report.preserved?.primaryAdministrator?.email || 'admin@hostelease.ng'}</strong> ({report.preserved?.primaryAdministrator?.fullName || 'Oluwatosin Ahmad'})
                </p>
                <p className="text-slate-400 text-[11px]">
                  Backup verified at: <code className="text-amber-300 font-mono">{report.backup?.path}</code>
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>Return to Operations Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Warning & Confirmation Screen */
            <>
              {/* Alert Banner */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    PERMANENT DELETION WARNING
                  </p>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                    This will perform a genuine, complete reset of <strong>all application data</strong> across Hostel Ease. Every student profile, agent profile, property listing, uploaded photo, 4K video, booking record, message, and review will be permanently deleted from the database and disk.
                  </p>
                </div>
              </div>

              {/* What will be cleared vs preserved */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
                  <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-400 uppercase text-[11px] tracking-wider">
                    <Trash2 className="w-4 h-4" />
                    <span>What Will Be Deleted</span>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                    <li>All Student accounts and profiles</li>
                    <li>All Agent, Host, and Provider accounts</li>
                    <li>All Hostel listings, rooms, bedspaces</li>
                    <li>All 4K video tours, photos, and files</li>
                    <li>All Bookings, inspections, move-in logs</li>
                    <li>All Messages, chats, and AI histories</li>
                    <li>All Reviews, ratings, and listing reports</li>
                    <li>All Notifications, activity logs, and audits</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                  <div className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-400 uppercase text-[11px] tracking-wider">
                    <Check className="w-4 h-4" />
                    <span>What Will Be Preserved</span>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                    <li>Primary Administrator (admin@hostelease.ng)</li>
                    <li>Database schema, tables, and migrations</li>
                    <li>LAUTECH campus &amp; 11 geographic areas</li>
                    <li>12 default amenity definitions</li>
                    <li>System revenue and fee settings</li>
                    <li>Full timestamped backup in backups/</li>
                  </ul>
                </div>
              </div>

              {/* Progress Stepper during reset */}
              {isResetting && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-700 animate-pulse">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>RESET IN PROGRESS — DO NOT CLOSE THIS WINDOW</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">{resetStage}</p>
                </div>
              )}

              {/* Error Callout */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500 text-rose-200 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Confirmation Input Step */}
              {!isResetting && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    To confirm this permanent action, type <span className="font-black text-rose-600 underline">RESET EVERYTHING</span> below:
                  </label>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="RESET EVERYTHING"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 transition-all uppercase"
                    autoComplete="off"
                  />

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      I understand that this action is irreversible, wipes all platform users and data, and sets all application metrics back to zero.
                    </span>
                  </label>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-3 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={confirmationInput !== 'RESET EVERYTHING' || !acknowledged || isResetting}
                      onClick={handleExecuteReset}
                      className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-bold text-xs transition-all shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Reset Everything</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
