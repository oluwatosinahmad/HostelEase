import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkStatusBannerProps {
  onRetry?: () => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ onRetry }) => {
  const { isOnline, showReconnectedAlert, checkConnection } = useNetworkStatus();

  const handleRetry = async () => {
    await checkConnection();
    if (onRetry) onRetry();
  };

  if (isOnline && !showReconnectedAlert) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto animate-in slide-in-from-top duration-200">
      {!isOnline ? (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-amber-300 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <span>You're offline. Showing cached accommodation info.</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold px-2.5 py-1 rounded-xl text-[11px] border border-amber-500/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : showReconnectedAlert ? (
        <div className="bg-emerald-950/95 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>You're back online! All live LAUTECH accommodation updates synced.</span>
        </div>
      ) : null}
    </div>
  );
};
