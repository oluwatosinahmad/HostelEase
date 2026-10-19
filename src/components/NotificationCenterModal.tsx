import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Play,
  Building2,
  MessageSquare,
  Calendar,
  CreditCard,
  Wrench,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Flame
} from 'lucide-react';
import { NotificationItem } from '../types/hostelEase';
import { api } from '../services/api';
import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume,
  playTestChime
} from '../utils/sound';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onNavigate?: (view: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // Sound Controls State
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(isSoundEnabled());
  const [soundVolume, setSoundVolumeState] = useState<number>(getSoundVolume());
  const [showSoundControls, setShowSoundControls] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const role = (currentUser?.role || 'STUDENT').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isAgent = role === 'PROVIDER' || role === 'AGENT';
  const isStudent = role === 'STUDENT';

  // Available filter tabs by role
  const filterTabs = React.useMemo(() => {
    if (isAdmin) {
      return [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'properties', label: 'Hostel Approvals' },
        { id: 'messages', label: 'Messages' },
        { id: 'reports', label: 'Reports & Disputes' },
        { id: 'payments', label: 'Payments' },
        { id: 'system', label: 'System' }
      ];
    }
    if (isAgent) {
      return [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'properties', label: 'Listing Status' },
        { id: 'messages', label: 'Inquiries & Chats' },
        { id: 'inspections', label: 'Inspections' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'maintenance', label: 'Maintenance' }
      ];
    }
    // Default Student
    return [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'messages', label: 'Messages & Chats' },
      { id: 'bookings', label: 'Bookings' },
      { id: 'inspections', label: 'Inspections' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'safety', label: 'Safety & Campus' }
    ];
  }, [isAdmin, isAgent, isStudent]);

  // Sync sound settings from storage or custom events
  useEffect(() => {
    const handleSoundSettingsChange = (e: any) => {
      if (e.detail) {
        if (typeof e.detail.enabled === 'boolean') setSoundEnabledState(e.detail.enabled);
        if (typeof e.detail.volume === 'number') setSoundVolumeState(e.detail.volume);
      }
    };
    window.addEventListener('hostel_ease_sound_settings_changed', handleSoundSettingsChange);
    return () => window.removeEventListener('hostel_ease_sound_settings_changed', handleSoundSettingsChange);
  }, []);

  // Fetch notifications whenever modal is open or filter changes
  const fetchNotifications = async (filterKey: string = activeFilter) => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await api.notifications.getAll(60, 0, filterKey);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to fetch notifications in modal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(activeFilter);
      // Ensure audio context is ready on modal open
      setSoundEnabledState(isSoundEnabled());
      setSoundVolumeState(getSoundVolume());
    }
  }, [isOpen, activeFilter, currentUser?.id]);

  // Listen to real-time notification events
  useEffect(() => {
    const handleNotificationUpdated = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'MARK_ALL_READ') {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } else if (detail?.action === 'MARK_READ' && detail?.notificationId) {
        setNotifications(prev => prev.map(n => n.id === detail.notificationId ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else if (detail?.notification) {
        setNotifications(prev => {
          if (prev.some(item => item.id === detail.notification.id)) return prev;
          return [detail.notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
      } else {
        // Refresh full list quietly
        fetchNotifications(activeFilter);
      }
    };

    window.addEventListener('hostel_ease_notification_updated', handleNotificationUpdated);
    return () => window.removeEventListener('hostel_ease_notification_updated', handleNotificationUpdated);
  }, [activeFilter, currentUser?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) {
      playTestChime(soundVolume);
    }
  };

  // Sound volume change handler
  const handleVolumeChange = (newVol: number) => {
    setSoundVolumeState(newVol);
    setSoundVolume(newVol);
  };

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Mark single notification read
  const handleMarkSingleRead = async (e: React.MouseEvent, n: NotificationItem) => {
    e.stopPropagation();
    if (n.isRead) return;
    try {
      await api.notifications.markRead(n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffMs = now - past;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Get category icon and colors
  const getCategoryMeta = (type: string, priority?: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'WELCOME') {
      return {
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    }
    if (t.includes('PROPERTY') || t.includes('HOSTEL')) {
      return {
        icon: <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      };
    }
    if (t.includes('MESSAGE')) {
      return {
        icon: <MessageSquare className="w-4 h-4 text-sky-500" />,
        bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
      };
    }
    if (t.includes('INSPECTION')) {
      return {
        icon: <Calendar className="w-4 h-4 text-indigo-500" />,
        bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      };
    }
    if (t.includes('BOOKING') || t.includes('PAYMENT')) {
      return {
        icon: <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
        bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
      };
    }
    if (t.includes('MAINTENANCE')) {
      return {
        icon: <Wrench className="w-4 h-4 text-orange-500" />,
        bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
      };
    }
    if (t.includes('DISPUTE') || t.includes('REPORT') || priority === 'URGENT') {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      };
    }
    return {
      icon: <Bell className="w-4 h-4 text-slate-500" />,
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    };
  };

  // Handle Exact Deep Linking Click
  const handleNotificationClick = async (n: NotificationItem) => {
    // 1. Mark as read immediately
    if (!n.isRead) {
      try {
        await api.notifications.markRead(n.id);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    // Close modal
    onClose();

    const link = n.linkUrl || '';
    const type = (n.type || '').toUpperCase();
    const propId = n.propertyId || (n.metadata as any)?.propertyId || (link.match(/propertyId=([^&]+)/)?.[1]);
    const convId = n.conversationId || (n.metadata as any)?.conversationId || (link.match(/conversationId=([^&]+)/)?.[1]);
    const inspId = n.relatedEntityId || (n.metadata as any)?.inspectionId || (link.match(/inspectionId=([^&]+)/)?.[1]);

    // ROUTING RULE 1: Welcome Notifications
    if (type === 'WELCOME') {
      if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));
      } else if (isAdmin) {
        if (onNavigate) onNavigate('admin-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'admin-portal' }));
      } else {
        if (onNavigate) onNavigate('home');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'home' }));
      }
      return;
    }

    // ROUTING RULE 2: Messages & Inquiries
    if (type.includes('MESSAGE') || link.includes('messages') || convId) {
      if (onNavigate) onNavigate('messages');
      else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'messages' }));

      if (convId || propId) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_open_conversation', {
            detail: { conversationId: convId, propertyId: propId }
          }));
        }, 120);
      }
      return;
    }

    // ROUTING RULE 3: Inspections
    if (type.includes('INSPECTION') || link.includes('inspections') || inspId) {
      if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', {
            detail: { tab: 'inspections', inspectionId: inspId }
          }));
          if (inspId) {
            window.dispatchEvent(new CustomEvent('hostel_ease_target_inspection', {
              detail: { inspectionId: inspId }
            }));
          }
        }, 120);
      } else {
        if (onNavigate) onNavigate('student-dashboard');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'student-dashboard' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_student_tab', { detail: 'inspections' }));
          if (inspId) {
            window.dispatchEvent(new CustomEvent('hostel_ease_target_inspection', {
              detail: { inspectionId: inspId }
            }));
          }
        }, 120);
      }
      return;
    }

    // ROUTING RULE 4: Hostels / Properties Listing
    if (type.includes('PROPERTY') || type.includes('HOSTEL') || link.includes('properties') || link.includes('hostels')) {
      if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'listings' }));
        }, 120);
      } else if (isAdmin) {
        if (onNavigate) onNavigate('admin-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'admin-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_admin_tab', { detail: 'hostels' }));
        }, 120);
      } else {
        if (propId) {
          window.dispatchEvent(new CustomEvent('hostel_ease_open_hostel_details', { detail: propId }));
        } else {
          if (onNavigate) onNavigate('home');
          else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'home' }));
        }
      }
      return;
    }

    // ROUTING RULE 5: Bookings
    if (type.includes('BOOKING') || link.includes('bookings')) {
      if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'bookings' }));
        }, 120);
      } else {
        if (onNavigate) onNavigate('student-dashboard');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'student-dashboard' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_student_tab', { detail: 'bookings' }));
        }, 120);
      }
      return;
    }

    // ROUTING RULE 6: Maintenance
    if (type.includes('MAINTENANCE') || link.includes('maintenance')) {
      if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'maintenance' }));
        }, 120);
      } else {
        if (onNavigate) onNavigate('student-dashboard');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'overview' }));
      }
      return;
    }

    // ROUTING RULE 7: Disputes & Reports
    if (type.includes('DISPUTE') || type.includes('REPORT') || link.includes('disputes') || link.includes('reports')) {
      if (isAdmin) {
        if (onNavigate) onNavigate('admin-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'admin-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_admin_tab', { detail: type.includes('DISPUTE') ? 'disputes' : 'reports' }));
        }, 120);
      } else if (isAgent) {
        if (onNavigate) onNavigate('provider-portal');
        else window.dispatchEvent(new CustomEvent('hostel_ease_navigate', { detail: 'provider-portal' }));

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'disputes' }));
        }, 120);
      }
      return;
    }

    // Fallback: If propertyId is present anywhere, open property details
    if (propId && isStudent) {
      window.dispatchEvent(new CustomEvent('hostel_ease_open_hostel_details', { detail: propId }));
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Notifications
                </h2>
                {unreadCount > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Caught up
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {isAdmin ? 'Admin Platform Monitor' : isAgent ? 'Agent Activity & Inquiries' : 'LAUTECH Student Updates'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Control Toggle Button */}
            <button
              onClick={() => setShowSoundControls(!showSoundControls)}
              title={soundEnabled ? 'Sound options & volume' : 'Sound muted'}
              aria-label="Sound options"
              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                showSoundControls
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                  : soundEnabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? `${Math.round(soundVolume * 100)}%` : 'Muted'}</span>
            </button>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close notification center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Sound & Volume Settings Bar */}
        {showSoundControls && (
          <div className="px-5 py-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleSound}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? 'Chime Enabled' : 'Muted'}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Volume</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={soundVolume}
                  disabled={!soundEnabled}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-24 sm:w-32 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-40"
                  aria-label="Chime Volume"
                />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-[32px]">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
            </div>

            <button
              onClick={() => playTestChime(soundVolume)}
              disabled={!soundEnabled}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-emerald-300/60 dark:border-emerald-700/60 disabled:opacity-40"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test Chime</span>
            </button>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            const countForTab = tab.id === 'unread' ? unreadCount : undefined;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {typeof countForTab === 'number' && countForTab > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-emerald-700' : 'bg-rose-500 text-white'
                  }`}>
                    {countForTab}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 sm:p-3">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/40">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                {activeFilter === 'unread' ? 'Zero Unread Alerts' : 'No Notifications Here'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {activeFilter === 'unread'
                  ? 'All notifications have been reviewed. New real-time alerts will chime automatically when they arrive.'
                  : 'You will receive updates on hostel verifications, messages, inspections, and platform alerts here.'}
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = getCategoryMeta(n.type, n.priority);
              const isUrgent = n.priority === 'URGENT';
              const isHigh = n.priority === 'HIGH';
              const actionText = n.actionLabel || (
                n.type === 'WELCOME'
                  ? (isAgent ? 'Open Agent Portal' : isAdmin ? 'Open Admin Portal' : 'Explore Hostels')
                  : n.type.includes('MESSAGE')
                  ? 'Reply'
                  : n.type.includes('INSPECTION')
                  ? 'View Inspection'
                  : n.type.includes('PROPERTY') || n.type.includes('HOSTEL')
                  ? 'View Listing'
                  : n.type.includes('BOOKING')
                  ? 'View Booking'
                  : 'Open'
              );

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 sm:p-4 rounded-2xl text-left cursor-pointer transition-all flex items-start gap-3.5 group relative hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !n.isRead
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-500'
                      : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Category / Icon Box */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                    {meta.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                          {n.title}
                        </span>

                        {/* Priority Badge */}
                        {isUrgent && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-600 text-white flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Urgent
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                            High
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {n.message}
                    </p>

                    {/* Footer Actions: CTA Button + Mark Read */}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          <span>{actionText}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkSingleRead(e, n)}
                            title="Mark as read"
                            className="text-[11px] font-semibold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-[11px]">Real-Time SSE Sync Active</span>
          </div>
          <span className="text-[11px] font-medium hidden sm:inline">
            Hostel Ease Accommodation Hub
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
