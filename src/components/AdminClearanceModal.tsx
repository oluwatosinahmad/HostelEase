import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  X, 
  Loader2, 
  ShieldAlert, 
  FileBox, 
  Database, 
  Lock, 
  Info,
  Check
} from 'lucide-react';
import { ClearanceScope, ScopeEstimate, ClearanceResult } from '../types/hostelEase';
import { api } from '../services/api';

interface AdminClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: ClearanceScope;
  onSuccess?: (result: ClearanceResult) => void;
}

export const AdminClearanceModal: React.FC<AdminClearanceModalProps> = ({
  isOpen,
  onClose,
  scope,
  onSuccess
}) => {
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [estimate, setEstimate] = useState<ScopeEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [result, setResult] = useState<ClearanceResult | null>(null);

  // Fetch real-time estimate on open
  useEffect(() => {
    if (!isOpen) {
      setEstimate(null);
      setEstimateError(null);
      setConfirmPhraseInput('');
      setAdminReason('');
      setExecuting(false);
      setExecutionError(null);
      setResult(null);
      return;
    }

    let isMounted = true;
    setLoadingEstimate(true);
    setEstimateError(null);

    api.admin.getClearanceEstimate(scope)
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.estimate) {
          setEstimate(res.estimate);
        } else {
          setEstimateError('Failed to load clearance preview details.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setEstimateError(err.message || 'Error querying database for clearance estimate.');
      })
      .finally(() => {
        if (isMounted) setLoadingEstimate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, scope]);

  if (!isOpen) return null;

  const isScopeAll = scope === 'all';
  const isPhraseValid = !isScopeAll || confirmPhraseInput.trim() === 'CLEAR ALL DATA';

  const handleExecute = async () => {
    if (!isPhraseValid || executing) return;

    setExecuting(true);
    setExecutionError(null);

    try {
      const res = await api.admin.executeClearance({
        scope,
        confirmPhrase: isScopeAll ? confirmPhraseInput.trim() : undefined,
        adminReason: adminReason.trim() || undefined
      });

      if (res.success && res.result) {
        setResult(res.result);
        if (onSuccess) {
          onSuccess(res.result);
        }
      } else {
        setExecutionError(res.result?.message || 'Clearance operation encountered an error.');
      }
    } catch (err: any) {
      setExecutionError(err.message || 'Clearance request failed. Check server logs.');
    } finally {
      setExecuting(false);
    }
  };

  const handleModalClose = () => {
    if (executing) return; // Prevent closing while in progress
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-start justify-between ${
          result 
            ? 'bg-emerald-950/40 border-emerald-800/40' 
            : isScopeAll 
              ? 'bg-red-950/40 border-red-800/40' 
              : 'bg-amber-950/30 border-amber-800/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              result 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : isScopeAll 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-amber-500/20 text-amber-400'
            }`}>
              {result ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isScopeAll ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {result 
                  ? 'Clearance Completed Successfully' 
                  : isScopeAll 
                    ? 'Permanent Platform-Wide Reset' 
                    : `Permanent Clearance: ${estimate?.scopeLabel || scope}`}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {result 
                  ? 'All targeted test data and uploaded files have been permanently wiped.'
                  : estimate?.scopeDescription || 'Authorized Administrator test data deletion.'}
              </p>
            </div>
          </div>

          {!executing && (
            <button 
              onClick={handleModalClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Post-Clearance Report View */}
          {result ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-200">
                    Deletion Executed & Verified
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Database Records Removed</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-2">
                    {result.deletedRecordsCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <FileBox className="w-4 h-4 text-cyan-400" />
                    <span>Storage Files Unlinked</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-2">
                    {result.deletedFilesCount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Preserved Entities */}
              {result.preservedEntities && result.preservedEntities.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Preserved Core System Entities</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {result.preservedEntities.map((ent, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{ent}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Audit Reference */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Audit Log ID:</span>
                  <span className="font-mono text-slate-200">{result.auditLogId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Executed By:</span>
                  <span className="text-slate-200">{result.executedBy.name} ({result.executedBy.email})</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-slate-200">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Pre-Clearance Warnings & Estimates */}
              {loadingEstimate ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-3" />
                  <p className="text-sm">Calculating database records & physical storage files...</p>
                </div>
              ) : estimateError ? (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Unable to fetch clearance preview</p>
                    <p className="text-xs text-red-400 mt-1">{estimateError}</p>
                  </div>
                </div>
              ) : estimate ? (
                <div className="space-y-5">
                  {/* Warning Callout */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    isScopeAll 
                      ? 'bg-red-950/40 border-red-500/50 text-red-200' 
                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      isScopeAll ? 'text-red-400' : 'text-amber-400'
                    }`} />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider">
                        {isScopeAll ? 'Permanent Platform Reset Warning' : 'Irreversible Deletion'}
                      </h4>
                      <p className="text-xs opacity-90 mt-1">
                        {estimate.warning}
                      </p>
                      <p className="text-xs font-semibold mt-2 text-rose-300">
                        This action CANNOT be undone. Records and uploaded files (images, 4K videos, documents) are deleted permanently.
                      </p>
                    </div>
                  </div>

                  {/* Impact Summary Counters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Database className="w-4 h-4 text-red-400" />
                        <span>Records to Delete</span>
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {estimate.estimatedRecords.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Across related tables</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <FileBox className="w-4 h-4 text-amber-400" />
                        <span>Storage Files to Delete</span>
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {estimate.estimatedFiles.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Media in uploads/ directory</p>
                    </div>
                  </div>

                  {/* Breakdown List */}
                  {estimate.breakdown && estimate.breakdown.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Target Entities Breakdown
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {estimate.breakdown.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                          >
                            <span className="text-slate-400 truncate pr-2">{item.label}</span>
                            <span className="font-bold text-slate-200 shrink-0">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cascading Notice */}
                  {estimate.dependenciesNotice && (
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 flex items-start gap-2.5 text-xs text-slate-400">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{estimate.dependenciesNotice}</span>
                    </div>
                  )}

                  {/* Preserved Core Data Assurance */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center gap-2.5 text-xs text-emerald-300">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Preserves authorized Super Admin account, LAUTECH university definition, geographic areas, amenities taxonomy, and financial configuration.
                    </span>
                  </div>

                  {/* Reason for Audit Log */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Reason for Audit Trail (Optional)</span>
                      <span className="text-[10px] text-slate-500">Recorded in administrative audit log</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Clearing test catalog before launch / staging refresh"
                      value={adminReason}
                      onChange={e => setAdminReason(e.target.value)}
                      disabled={executing}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Deliberate Phrase Confirmation for scope === 'all' */}
                  {isScopeAll && (
                    <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 space-y-2">
                      <label className="block text-xs font-bold text-red-300 uppercase tracking-wider">
                        Type &quot;CLEAR ALL DATA&quot; to Confirm Platform Reset:
                      </label>
                      <input 
                        type="text"
                        placeholder="CLEAR ALL DATA"
                        value={confirmPhraseInput}
                        onChange={e => setConfirmPhraseInput(e.target.value)}
                        disabled={executing}
                        className="w-full px-3 py-2 text-sm font-mono tracking-wider bg-slate-950 border-2 border-red-500/50 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                      />
                      <p className="text-[11px] text-red-400/80">
                        Exact match required. Auto-seed on server startup will be permanently locked.
                      </p>
                    </div>
                  )}

                  {/* Execution Error Banner */}
                  {executionError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-500 text-red-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{executionError}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          {result ? (
            <button
              onClick={handleModalClose}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Done & Refresh Dashboard</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleModalClose}
                disabled={executing}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecute}
                disabled={loadingEstimate || !!estimateError || !isPhraseValid || executing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-white shadow-lg ${
                  executing || !isPhraseValid || loadingEstimate || !!estimateError
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                    : isScopeAll
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Permanently Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isScopeAll 
                        ? 'Permanently Clear All Test Data' 
                        : `Permanently Clear ${estimate?.scopeLabel || 'Scope'}`}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
