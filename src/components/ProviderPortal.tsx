import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  PlusCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  MapPin, 
  Eye, 
  DollarSign, 
  ShieldCheck, 
  Camera, 
  X, 
  Phone, 
  Mail,
  Zap,
  Droplets,
  Wifi,
  Shield,
  Utensils,
  Sun,
  Upload,
  Video,
  Image as ImageIcon,
  Trash2,
  Star,
  FileText,
  Bell,
  AlertTriangle,
  History,
  Lock,
  Layers,
  Edit3,
  Receipt,
  Users,
  ChevronDown,
  Sparkles,
  Send,
  Check,
  TrendingUp,
  Activity,
  UserCheck,
  Flag,
  ArrowRight,
  KeyRound,
  MessageSquare,
  Search
} from 'lucide-react';
import { Area, Property, NotificationItem, VerificationDocument, PriceHistoryItem, ConversationItem, ConversationDetail, MessageItem } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HostelCreationWizard } from './HostelCreationWizard';
import { ProviderInspectionDashboard } from './ProviderInspectionDashboard';
import { ProviderBookingDashboard } from './ProviderBookingDashboard';
import { ProviderFinancialDashboard } from './ProviderFinancialDashboard';
import { ProviderOnboardingModal } from './ProviderOnboardingModal';
import { ProviderMoveInManager } from './ProviderMoveInManager';
import { ListingQualityCard } from './ListingQualityCard';
import { formatNaira, formatDistance, getAvailabilityBadgeInfo, getPropertyTypeLabel } from '../utils/formatters';

interface ProviderPortalProps {
  areas: Area[];
  onOpenConversation?: (propertyId: string, studentId?: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProviderPortal: React.FC<ProviderPortalProps> = ({
  areas,
  onOpenConversation,
  onShowToast
}) => {
  const { user, loginDemo } = useAuth();
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'listings' | 'rooms' | 'availability' | 'bookings' | 'move_ins' | 'inspections' | 'financials' | 'messages' | 'performance' | 'profile_team' | 'wizard'
  >('dashboard');
  
  // Property Switcher: 'all' or propertyId
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  // Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [inspectionSchedules, setInspectionSchedules] = useState<any[]>([]);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Student Inquiries & Direct Messages State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [messageReplyText, setMessageReplyText] = useState<string>('');
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [conversationSearch, setConversationSearch] = useState<string>('');
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);

  // Modals & Sub-states
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [selectedPropertyPriceHistory, setSelectedPropertyPriceHistory] = useState<PriceHistoryItem[] | null>(null);
  const [historyPropertyTitle, setHistoryPropertyTitle] = useState('');
  
  // Room Management State
  const [selectedRoomPropertyId, setSelectedRoomPropertyId] = useState<string>('');
  const [propertyRooms, setPropertyRooms] = useState<any[]>([]);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    roomName: '',
    roomType: 'SINGLE_ROOM',
    maxOccupants: 1,
    quantityTotal: 1,
    isEnsuite: true,
    isFurnished: false
  });

  // AI Assistant State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'USER' | 'AI'; text: string; structuredData?: any }>>([
    { sender: 'AI', text: 'Hello! I am your Hostel Ease Landlord Assistant. Ask me about your room availability, pending bookings, upcoming inspections, or ask me to optimize your hostel descriptions.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Quick Reply creation modal
  const [newQuickReplyModal, setNewQuickReplyModal] = useState(false);
  const [newQRTitle, setNewQRTitle] = useState('');
  const [newQRText, setNewQRText] = useState('');
  const [newQRCategory, setNewQRCategory] = useState('GENERAL');

  // Team Member Add Modal
  const [addTeamModal, setAddTeamModal] = useState(false);
  const [teamEmail, setTeamEmail] = useState('');
  const [teamRole, setTeamRole] = useState('MANAGER');

  // Report Review Modal
  const [reportReviewModal, setReportReviewModal] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('INAPPROPRIATE_REVIEW');
  const [reportDescription, setReportDescription] = useState('');

  // Document Upload
  const [selectedDocType, setSelectedDocType] = useState('NIN_CARD');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const fetchConversations = async (targetId?: string) => {
    try {
      const res = await api.messages.getConversations();
      const list = res.conversations || [];
      setConversations(list);
      
      const toSelect = targetId || activeConversationId || (list.length > 0 ? list[0].id : null);
      if (toSelect) {
        setActiveConversationId(toSelect);
        loadConversationDetail(toSelect);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const loadConversationDetail = async (id: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.messages.getConversation(id);
      setActiveDetail(res);
      await api.messages.markAsRead(id);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('Failed to load conversation detail:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageReplyText.trim() || !activeConversationId) return;

    setSendingReply(true);
    try {
      await api.messages.sendMessage(activeConversationId, messageReplyText.trim());
      setMessageReplyText('');
      await loadConversationDetail(activeConversationId);
      onShowToast('Reply sent to student successfully!', 'success');
      const res = await api.messages.getConversations();
      setConversations(res.conversations || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const fetchAllProviderData = (propId: string = selectedPropertyId) => {
    setLoading(true);
    Promise.all([
      api.provider.getDashboard(propId),
      api.provider.getMyListings(),
      api.provider.getCalendar(propId),
      api.provider.getInspectionSchedules(),
      api.provider.getQuickReplies(),
      api.provider.getPerformance(propId),
      api.provider.getTeam(),
      api.provider.getAuditLogs(),
      api.verification.getMyDocuments(),
      api.notifications.getAll(),
      api.messages.getConversations()
    ])
      .then(([dashRes, propsRes, calRes, schedRes, qrRes, perfRes, teamRes, logsRes, docsRes, notifsRes, msgsRes]) => {
        setDashboardData(dashRes);
        setProperties(propsRes.properties || []);
        setCalendarEvents(calRes.events || []);
        setInspectionSchedules(schedRes.schedules || []);
        setQuickReplies(qrRes.quickReplies || []);
        setPerformanceData(perfRes);
        setTeamMembers(teamRes.team || []);
        setAuditLogs(logsRes.logs || []);
        setDocuments(docsRes.documents || []);
        setNotifications(notifsRes.notifications || []);
        setUnreadNotifsCount(notifsRes.unreadCount || 0);
        
        const convList = msgsRes.conversations || [];
        setConversations(convList);
        if (convList.length > 0 && !activeConversationId) {
          setActiveConversationId(convList[0].id);
          loadConversationDetail(convList[0].id);
        }

        if (propsRes.properties && propsRes.properties.length > 0 && !selectedRoomPropertyId) {
          setSelectedRoomPropertyId(propsRes.properties[0].id);
        }

        // Check if onboarding needs to be shown for new providers
        if (dashRes.onboarding && !dashRes.onboarding.completed && (!propsRes.properties || propsRes.properties.length === 0)) {
          setOnboardingOpen(true);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading provider data', err);
        onShowToast(err.message || 'Failed to load landlord portal data', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllProviderData(selectedPropertyId);
  }, [selectedPropertyId]);

  // Real-time listener for incoming student messages, bookings, inspections & notifications
  useEffect(() => {
    const handleNotificationUpdate = () => {
      api.notifications.getAll().then(res => {
        setNotifications(res.notifications || []);
        setUnreadNotifsCount(res.unreadCount || 0);
      });
      api.messages.getConversations().then(res => {
        setConversations(res.conversations || []);
      });
      if (activeConversationId) {
        api.messages.getConversation(activeConversationId).then(res => {
          setActiveDetail(res);
        });
      }
    };

    const handlePropsUpdate = () => {
      fetchAllProviderData(selectedPropertyId);
    };

    window.addEventListener('hostel_ease_notification_updated', handleNotificationUpdate);
    window.addEventListener('hostel_ease_conversations_updated', handleNotificationUpdate);
    window.addEventListener('hostel_ease_bookings_updated', handlePropsUpdate);
    window.addEventListener('hostel_ease_inspections_updated', handlePropsUpdate);
    window.addEventListener('hostel_ease_properties_updated', handlePropsUpdate);
    return () => {
      window.removeEventListener('hostel_ease_notification_updated', handleNotificationUpdate);
      window.removeEventListener('hostel_ease_conversations_updated', handleNotificationUpdate);
      window.removeEventListener('hostel_ease_bookings_updated', handlePropsUpdate);
      window.removeEventListener('hostel_ease_inspections_updated', handlePropsUpdate);
      window.removeEventListener('hostel_ease_properties_updated', handlePropsUpdate);
    };
  }, [activeConversationId, selectedPropertyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDetail?.messages]);

  // Fetch rooms when room property changes
  useEffect(() => {
    if (selectedRoomPropertyId) {
      api.provider.getRooms(selectedRoomPropertyId)
        .then(res => setPropertyRooms(res.rooms || []))
        .catch(err => console.error('Failed to load rooms', err));
    }
  }, [selectedRoomPropertyId]);

  // Handle Availability Toggle
  const handleUpdateAvailability = async (propertyId: string, newStatus: string) => {
    try {
      await api.provider.updateAvailability(propertyId, newStatus);
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, availabilityStatus: newStatus } : p));
      onShowToast(`Availability status updated to ${newStatus}`, 'success');
      fetchAllProviderData(selectedPropertyId);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update availability', 'error');
    }
  };

  // Bedspace Toggle
  const handleToggleBedspace = async (roomId: string, bedId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
    try {
      await api.provider.updateBedspace(roomId, bedId, nextStatus, nextStatus === 'OCCUPIED');
      onShowToast(`Bedspace marked as ${nextStatus}`, 'success');
      // Refresh room list
      const res = await api.provider.getRooms(selectedRoomPropertyId);
      setPropertyRooms(res.rooms || []);
      fetchAllProviderData(selectedPropertyId);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update bedspace', 'error');
    }
  };

  // Add Room Submit
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomPropertyId) return;

    try {
      await api.provider.addRoom(selectedRoomPropertyId, newRoomData);
      onShowToast('Room and bedspaces added successfully!', 'success');
      setAddRoomModalOpen(false);
      setNewRoomData({
        roomName: '',
        roomType: 'SINGLE_ROOM',
        maxOccupants: 1,
        quantityTotal: 1,
        isEnsuite: true,
        isFurnished: false
      });
      const res = await api.provider.getRooms(selectedRoomPropertyId);
      setPropertyRooms(res.rooms || []);
      fetchAllProviderData(selectedPropertyId);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to add room', 'error');
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;
    try {
      await api.provider.deleteRoom(roomId);
      onShowToast('Room deleted', 'info');
      const res = await api.provider.getRooms(selectedRoomPropertyId);
      setPropertyRooms(res.rooms || []);
      fetchAllProviderData(selectedPropertyId);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete room', 'error');
    }
  };

  // Price History Modal
  const handleViewPriceHistory = async (prop: any) => {
    try {
      setHistoryPropertyTitle(prop.title);
      const res = await api.provider.getPriceHistory(prop.id);
      setSelectedPropertyPriceHistory(res.priceHistory || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load price history', 'error');
    }
  };

  // Inspection Schedule Toggle
  const handleToggleScheduleDay = async (dayOfWeek: string, currentAvail: boolean) => {
    const updated = inspectionSchedules.map(s => s.dayOfWeek === dayOfWeek ? { ...s, isAvailable: !currentAvail } : s);
    setInspectionSchedules(updated);
    try {
      await api.provider.updateInspectionSchedules(updated);
      onShowToast('Inspection schedule updated', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save schedule', 'error');
    }
  };

  // Create Quick Reply
  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQRTitle || !newQRText) return;

    try {
      await api.provider.createQuickReply({ title: newQRTitle, messageText: newQRText, category: newQRCategory });
      onShowToast('Quick reply template created!', 'success');
      setNewQuickReplyModal(false);
      setNewQRTitle('');
      setNewQRText('');
      const res = await api.provider.getQuickReplies();
      setQuickReplies(res.quickReplies || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create quick reply', 'error');
    }
  };

  // Delete Quick Reply
  const handleDeleteQuickReply = async (id: string) => {
    try {
      await api.provider.deleteQuickReply(id);
      setQuickReplies(prev => prev.filter(q => q.id !== id));
      onShowToast('Quick reply deleted', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete quick reply', 'error');
    }
  };

  // Add Team Member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamEmail) return;

    try {
      await api.provider.addTeamMember({ email: teamEmail, role: teamRole });
      onShowToast('Team member added successfully!', 'success');
      setAddTeamModal(false);
      setTeamEmail('');
      const res = await api.provider.getTeam();
      setTeamMembers(res.team || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to add team member', 'error');
    }
  };

  // Remove Team Member
  const handleRemoveTeamMember = async (id: string) => {
    if (!confirm('Remove this team member from your accommodation management?')) return;
    try {
      await api.provider.removeTeamMember(id);
      setTeamMembers(prev => prev.filter(t => t.id !== id));
      onShowToast('Team member removed', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to remove team member', 'error');
    }
  };

  // Document Upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', selectedDocType);

      await api.verification.uploadDocument(formData);
      onShowToast('Verification document uploaded securely for admin review!', 'success');
      fetchAllProviderData(selectedPropertyId);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to upload document', 'error');
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Report Review Submit
  const handleReportReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReviewModal) return;

    try {
      await api.provider.reportReview(reportReviewModal.id, { reason: reportReason, description: reportDescription });
      onShowToast('Review reported to admin moderation team', 'success');
      setReportReviewModal(null);
      setReportDescription('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to report review', 'error');
    }
  };

  // AI Assistant Ask
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userText = aiPrompt.trim();
    setAiMessages(prev => [...prev, { sender: 'USER', text: userText }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await api.provider.askAI(userText, selectedPropertyId !== 'all' ? selectedPropertyId : undefined);
      setAiMessages(prev => [...prev, { sender: 'AI', text: res.response, structuredData: res.structuredData }]);
    } catch (err: any) {
      setAiMessages(prev => [...prev, { sender: 'AI', text: `Sorry, I could not process your request: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const stats = {
    totalCapacity: properties.reduce((sum, p) => sum + (Number(p?.totalRooms) || (p?.rooms?.length || 1)), 0),
    availableSpaces: properties.reduce((sum, p) => sum + (Number(p?.availableRooms ?? p?.totalRooms) || 1), 0),
    occupiedSpaces: Math.max(0, properties.reduce((sum, p) => sum + (Number(p?.totalRooms) || 1), 0) - properties.reduce((sum, p) => sum + (Number(p?.availableRooms ?? p?.totalRooms) || 1), 0)),
    reservedSpaces: dashboardData?.stats?.reservedSpaces || 0,
    pendingBookings: dashboardData?.stats?.pendingBookings || 0,
    confirmedBookings: dashboardData?.stats?.confirmedBookings || 0,
    upcomingInspections: dashboardData?.stats?.upcomingInspections || 0,
    pendingInspections: dashboardData?.stats?.pendingInspections || 0,
    totalRevenue: properties.reduce((sum, p) => sum + (p?.priceSummary?.rentAmount || p?.pricing?.rentAmount || p?.rentAmount || 0), 0),
    verificationStatus: (user as any)?.accountStatus === 'ACTIVE' ? 'APPROVED' : (dashboardData?.stats?.verificationStatus || 'APPROVED'),
    unreadMessages: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || (dashboardData?.stats?.unreadMessages || 0),
    ...dashboardData?.stats
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. TOP COMMAND BAR & PROPERTY SWITCHER */}
      <header className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Property Switcher */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Provider Portal</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {stats?.verificationStatus === 'APPROVED' ? 'Verified Landlord' : 'Verification Pending'}
                </span>
              </div>

              {/* Property Switcher Dropdown */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-gray-500">Property:</span>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">🏢 All Registered Hostels ({properties.length})</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      📍 {p.title} ({p.availabilityStatus})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Actions Header Bar */}
          <div className="flex items-center gap-2">
            
            {/* Real-time Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                title="Landlord In-App Notifications"
              >
                <Bell className="w-4 h-4 text-gray-700" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-800" />
                      <h4 className="text-xs font-bold text-gray-900">Student & Booking Alerts</h4>
                    </div>
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={async () => {
                          await api.notifications.markAllRead();
                          setUnreadNotifsCount(0);
                          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          onShowToast('All notifications marked as read', 'info');
                        }}
                        className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-gray-400">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            if (n.type === 'NEW_MESSAGE' || n.linkUrl?.includes('messages')) {
                              setActiveTab('messages');
                              fetchConversations();
                            } else {
                              setActiveTab('bookings');
                            }
                            api.notifications.markRead(n.id);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            !n.isRead ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px] text-gray-900">{n.title}</span>
                            <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-gray-600 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setEditingProperty(null);
                setActiveTab('wizard');
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              + Add Hostel
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-gray-500" />
              Spaces & Rooms
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all relative flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span>Inquiries</span>
              {conversations.some(c => (c.unreadCount || 0) > 0) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setAiDrawerOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              AI Assistant
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER WITH LEFT-HAND SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT-HAND SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-gray-200 rounded-3xl p-4 shadow-xs lg:sticky lg:top-36 space-y-5">
          
          {/* Group 1: Operations & Listings */}
          <div>
            <p className="px-3 text-[10px] font-black tracking-wider text-gray-400 uppercase mb-2">
              Hostel Operations
            </p>
            <div className="space-y-1">
              {[
                { id: 'dashboard', label: 'Overview', icon: Building2 },
                { id: 'listings', label: 'My Hostels', count: properties.length, icon: Building2 },
                { id: 'rooms', label: 'Rooms & Bedspaces', count: stats?.totalCapacity, icon: Layers },
                { id: 'availability', label: 'Availability & Calendar', icon: CalendarIcon }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 2: Tenants & Move-In */}
          <div className="border-t border-gray-100 pt-4">
            <p className="px-3 text-[10px] font-black tracking-wider text-gray-400 uppercase mb-2">
              Tenants & Move-In
            </p>
            <div className="space-y-1">
              {[
                { id: 'bookings', label: 'Bookings', count: stats?.pendingBookings, badgeColor: 'bg-red-500 text-white', icon: FileText },
                { id: 'move_ins', label: 'Move-In & Issues', count: 0, badgeColor: 'bg-amber-500 text-white', icon: KeyRound },
                { id: 'inspections', label: 'Inspections & Slots', count: stats?.pendingInspections, badgeColor: 'bg-blue-500 text-white', icon: Clock },
                { id: 'messages', label: 'Student Inquiries', count: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || stats?.unreadMessages || 0, badgeColor: 'bg-rose-600 text-white', icon: Send }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 3: Financials & Growth */}
          <div className="border-t border-gray-100 pt-4">
            <p className="px-3 text-[10px] font-black tracking-wider text-gray-400 uppercase mb-2">
              Financials & Growth
            </p>
            <div className="space-y-1">
              {[
                { id: 'financials', label: 'Revenue & Payments', icon: DollarSign },
                { id: 'performance', label: 'Performance & Funnel', icon: TrendingUp },
                { id: 'profile_team', label: 'Profile & Team Access', icon: Users }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Perspective Switcher Widget */}
          <div className="border-t border-gray-100 pt-4">
            <p className="px-3 text-[10px] font-black tracking-wider text-gray-400 uppercase mb-2 flex items-center justify-between">
              <span>Switch Perspective</span>
              <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">Demo</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              <button
                onClick={() => loginDemo('STUDENT')}
                className="p-2 text-center rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-black transition-colors"
              >
                🎓 Student
              </button>
              <button
                onClick={() => loginDemo('ADMIN')}
                className="p-2 text-center rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-[11px] font-black transition-colors"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

        </aside>

        {/* RIGHT-HAND MAIN CONTENT */}
        <main className="flex-1 min-w-0 w-full">

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Metrics Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Available Spaces</span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  {stats?.availableSpaces || 0}
                  <span className="text-xs font-semibold text-gray-400 ml-1.5">
                    / {stats?.totalCapacity || 0} Total
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {stats?.occupiedSpaces || 0} occupied • {stats?.reservedSpaces || 0} reserved
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Bookings</span>
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700">
                  {stats?.pendingBookings || 0}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {stats?.confirmedBookings || 0} confirmed bookings
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Upcoming Inspections</span>
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-800">
                  {stats?.upcomingInspections || 0}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {stats?.pendingInspections || 0} requests awaiting response
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between text-gray-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {formatNaira(stats?.totalRevenue || 0)}
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  Verified escrow payouts
                </p>
              </div>

            </div>

            {/* Urgent Action Required Queue */}
            {dashboardData?.actionRequired && dashboardData.actionRequired.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Action Required</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {dashboardData.actionRequired.map((action: any, idx: number) => (
                    <div key={idx} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{action.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab(action.ctaTab as any)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 whitespace-nowrap transition-colors"
                      >
                        {action.ctaLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Alerts */}
            {dashboardData?.qualityAlerts && dashboardData.qualityAlerts.length > 0 && (
              <div className="space-y-2">
                {dashboardData.qualityAlerts.map((alert: any, idx: number) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{alert.message}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('listings')}
                      className="text-xs font-bold text-blue-700 hover:underline shrink-0"
                    >
                      Complete Listing →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Properties Overview & Bedspace Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Accommodations Summary</h3>
                  <p className="text-xs text-gray-500">Overview of active listings and real-time room capacity</p>
                </div>
                <button
                  onClick={() => setActiveTab('listings')}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  Manage All Hostels <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {properties.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-gray-700">No Hostels Registered Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Add your first hostel listing to start receiving student inspection requests and bookings.
                  </p>
                  <button
                    onClick={() => setActiveTab('wizard')}
                    className="mt-4 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Add Your Hostel
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.slice(0, 6).map((prop, idx) => (
                    <div key={prop?.id || `dash-prop-${idx}`} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{prop?.title || 'Hostel'}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (prop?.availabilityStatus || 'AVAILABLE') === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {prop?.availabilityStatus || 'AVAILABLE'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{prop?.address || 'LAUTECH Off-Campus'}</p>
                      
                      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-100">
                        <span className="font-bold text-gray-900">{formatNaira(prop?.priceSummary?.rentAmount || prop?.pricing?.rentAmount || prop?.rentAmount || 0)} / yr</span>
                        <span className="text-gray-500 font-semibold">{prop?.totalRooms || 1} Rooms</span>
                      </div>

                      {/* Completeness Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mb-1">
                          <span>Listing Completeness</span>
                          <span className={(prop?.completenessScore ?? 80) >= 80 ? 'text-emerald-700' : 'text-amber-700'}>
                            {prop?.completenessScore ?? 80}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(prop?.completenessScore ?? 80) >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                            style={{ width: `${prop?.completenessScore ?? 80}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Student Inquiries & Direct Messages Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Student Inquiries & Live Messages</h3>
                    <p className="text-xs text-gray-500">Incoming room questions and inspection inquiries from prospective students</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conversations.some(c => (c.unreadCount || 0) > 0) && (
                    <span className="px-2.5 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                      {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)} New Inquiry
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab('messages');
                      fetchConversations();
                    }}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Open Messages Inbox →
                  </button>
                </div>
              </div>

              {conversations.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-500">No student messages received yet.</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">When students click "Chat Landlord" on your verified hostel listings, inquiries will instantly appear here with live notifications.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {conversations.slice(0, 3).map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        (conv.unreadCount || 0) > 0
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-black text-xs flex items-center justify-center">
                              {conv.studentName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-gray-900">{conv.studentName || 'Student'}</h5>
                              <p className="text-[10px] text-emerald-800 font-semibold">{conv.propertyTitle}</p>
                            </div>
                          </div>
                          {(conv.unreadCount || 0) > 0 && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                              New
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed italic">
                          "{conv.lastMessageText || 'Hello, I would like to inquire about this hostel...'}"
                        </p>
                      </div>

                      <div className="pt-3 mt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                        <button
                          onClick={() => {
                            setActiveTab('messages');
                            setActiveConversationId(conv.id);
                            loadConversationDetail(conv.id);
                          }}
                          className="font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Reply to Student</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MY HOSTELS LISTINGS */}
        {activeTab === 'listings' && (() => {
          const verifiedCount = properties.filter(p => p?.verificationStatus === 'APPROVED').length;
          const pendingCount = properties.filter(p => p?.verificationStatus !== 'APPROVED' && p?.verificationStatus !== 'REJECTED').length;
          const rejectedCount = properties.filter(p => p?.verificationStatus === 'REJECTED').length;

          return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">My Registered Hostels</h2>
                <p className="text-xs text-gray-500">Manage listing details, verification status, and physical audit approvals</p>
              </div>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setActiveTab('wizard');
                }}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Add New Hostel
              </button>
            </div>

            {/* Verification Notice Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-emerald-950">Hostel Ease Verification Standard for LAUTECH Landlords</h4>
                <p className="text-gray-600 leading-relaxed">
                  Every new hostel submission is audited by the Hostel Ease admin team to verify borehole water, electricity sub-meters, gate security, and genuine room photos before going live on public student search.
                </p>
              </div>
            </div>

            {/* Verification Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-bold text-gray-500">Filter:</span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-800 text-white shadow-xs">
                All Hostels ({properties.length})
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-800 border border-emerald-200">
                ✓ Verified ({verifiedCount})
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-amber-800 border border-amber-200">
                ⏳ Pending Verification ({pendingCount})
              </span>
              {rejectedCount > 0 && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-rose-800 border border-rose-200">
                  ❌ Needs Action ({rejectedCount})
                </span>
              )}
            </div>

            {(!properties || properties.length === 0) ? (
              <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">No Hostels Registered Yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    You haven't listed any hostel accommodation yet. Register your property around LAUTECH to receive student inquiries, schedule inspection tours, and accept secure bookings.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingProperty(null);
                    setActiveTab('wizard');
                  }}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ List Your First Hostel</span>
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop, idx) => {
                  const isVerified = prop?.verificationStatus === 'APPROVED';
                  const isRejected = prop?.verificationStatus === 'REJECTED';

                  return (
                  <div key={prop?.id || `prop-${idx}`} className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all ${
                    isVerified ? 'border-emerald-200' : isRejected ? 'border-rose-300' : 'border-amber-200'
                  }`}>
                    <div className="h-44 relative bg-gray-100">
                      <img
                        src={prop?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
                        alt={prop?.title || 'Hostel'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      
                      {/* Prominent Verification Badge */}
                      <span className={`absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 ${
                        isVerified ? 'bg-emerald-600 text-white' :
                        isRejected ? 'bg-rose-600 text-white' :
                        'bg-amber-500 text-white animate-pulse'
                      }`}>
                        {isVerified ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            <span>✓ Verified by Admin</span>
                          </>
                        ) : isRejected ? (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>Action Required</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>⏳ Pending Verification</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{prop?.title || 'Hostel Accommodation'}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {prop?.address || 'LAUTECH Area'} • {prop?.distanceFromCampusKm || 0.8}km from campus
                        </p>
                      </div>

                      {/* Verification Explanation Card */}
                      <div className={`p-2.5 rounded-xl text-[11px] font-medium leading-relaxed border ${
                        isVerified ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                        isRejected ? 'bg-rose-50 text-rose-900 border-rose-200' :
                        'bg-amber-50 text-amber-900 border-amber-200'
                      }`}>
                        {isVerified ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span><strong>Live & Verified:</strong> Students across LAUTECH can view, inspect, and book this hostel.</span>
                          </div>
                        ) : isRejected ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-800">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Rejection Note from Admin:</span>
                            </div>
                            <p className="text-rose-700 text-[10px]">
                              {prop?.rejectionReason || 'Please provide clearer room interior photos and confirm prepaid sub-meter installation.'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span><strong>Under Review:</strong> Admin team is auditing your hostel specs before activating public search.</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Annual Rent:</span>
                          <span className="font-bold text-gray-900">{formatNaira(prop?.priceSummary?.rentAmount || prop?.pricing?.rentAmount || prop?.rentAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Move-in:</span>
                          <span className="font-bold text-emerald-800">{formatNaira(prop?.priceSummary?.totalMandatoryCost || prop?.pricing?.totalFirstYearCost || prop?.totalCost || 0)}</span>
                        </div>
                      </div>

                      {/* Completeness Progress */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 mb-1">
                          <span>Listing Score</span>
                          <span className="font-bold">{prop?.completenessScore ?? 80}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(prop?.completenessScore ?? 80) >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                            style={{ width: `${prop?.completenessScore ?? 80}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex items-center gap-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setEditingProperty(prop);
                            setActiveTab('wizard');
                          }}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer"
                        >
                          Edit Details
                        </button>

                        <button
                          onClick={() => handleViewPriceHistory(prop)}
                          className="p-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl cursor-pointer"
                          title="View Price History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleUpdateAvailability(prop?.id, (prop?.availabilityStatus || 'AVAILABLE') === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            (prop?.availabilityStatus || 'AVAILABLE') === 'AVAILABLE'
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-red-200 text-red-700 hover:bg-red-50'
                          }`}
                          title={(prop?.availabilityStatus || 'AVAILABLE') === 'AVAILABLE' ? 'Pause Listing' : 'Activate Listing'}
                        >
                          {(prop?.availabilityStatus || 'AVAILABLE') === 'AVAILABLE' ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      {/* Listing Quality & Improvement Tips */}
                      {prop?.id && (
                        <div className="pt-2">
                          <ListingQualityCard propertyId={prop.id} />
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
          );
        })()}

        {/* TAB 3: ROOMS & BEDSPACES INVENTORY */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Room & Bedspace Manager</h2>
                <p className="text-xs text-gray-500">Track individual bedspace occupancy and room configurations</p>
              </div>

              <div className="flex items-center gap-3">
                {properties.length > 0 ? (
                  <select
                    value={selectedRoomPropertyId}
                    onChange={e => setSelectedRoomPropertyId(e.target.value)}
                    className="text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 cursor-pointer"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">No registered hostels</span>
                )}

                <button
                  onClick={() => setAddRoomModalOpen(true)}
                  disabled={properties.length === 0}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  + Add Room
                </button>
              </div>
            </div>

            {/* Room List with Bedspaces */}
            {(!propertyRooms || propertyRooms.length === 0) ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center space-y-3 shadow-xs">
                <Layers className="w-10 h-10 text-gray-300 mx-auto" />
                <h4 className="text-sm font-bold text-gray-700">No Rooms Configured Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {properties.length === 0 
                    ? 'Register your hostel first to configure individual rooms and bedspaces.' 
                    : 'Click "+ Add Room" to configure single rooms, self-contains, or bedspaces for this hostel.'}
                </p>
                {properties.length === 0 && (
                  <button
                    onClick={() => {
                      setEditingProperty(null);
                      setActiveTab('wizard');
                    }}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Add Hostel First
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {propertyRooms.map(room => (
                  <div key={room.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{room.roomName}</h4>
                        <p className="text-xs text-gray-500">{getPropertyTypeLabel(room.roomType)} • Max: {room.maxOccupants} Occupants</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                      {room.isEnsuite && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">En-suite Bathroom</span>}
                      {room.isFurnished && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">Furnished</span>}
                    </div>

                    {/* Bedspaces Interactive Grid */}
                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                        Bedspaces ({room.quantityAvailable || 0} Available / {room.quantityTotal || 1} Total)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {room.bedspaces?.map((bed: any) => (
                          <button
                            key={bed.id}
                            onClick={() => handleToggleBedspace(room.id, bed.id, bed.status)}
                            className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                              bed.status === 'AVAILABLE'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                            }`}
                          >
                            <div className="font-bold">{bed.bedspaceNumber}</div>
                            <div className="text-[10px] font-semibold opacity-80">{bed.status} (Click to toggle)</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AVAILABILITY & CALENDAR */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* Calendar Feed View (2 Cols) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Move-in & Inspection Calendar</h2>
                    <p className="text-xs text-gray-500">Upcoming student check-ins, active tours, and reservation schedules</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                    {calendarEvents.length} Scheduled Events
                  </span>
                </div>

                <div className="space-y-3">
                  {calendarEvents.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-xs">
                      No calendar events scheduled for this period.
                    </div>
                  ) : (
                    calendarEvents.map(evt => (
                      <div key={evt.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            evt.type === 'BOOKING_MOVE_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {evt.type === 'BOOKING_MOVE_IN' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{evt.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{evt.propertyTitle} • {evt.details}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded-md">
                                📅 {evt.date} {evt.time ? `at ${evt.time}` : ''}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700">
                                {evt.badgeLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inspection Weekly Availability Hours (1 Col) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Weekly Inspection Hours</h3>
                  <p className="text-xs text-gray-500">Configure days you accept physical & virtual student inspection tours</p>
                </div>

                <div className="space-y-2">
                  {inspectionSchedules.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">{slot.dayOfWeek}</span>
                        <span className="text-[10px] text-gray-500">
                          {slot.isAvailable ? `${slot.startTime} – ${slot.endTime}` : 'Closed / Not Available'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleScheduleDay(slot.dayOfWeek, slot.isAvailable)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          slot.isAvailable
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                            : 'border-gray-300 bg-white text-gray-500'
                        }`}
                      >
                        {slot.isAvailable ? 'Open' : 'Off'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: BOOKINGS */}
        {activeTab === 'bookings' && (
          <ProviderBookingDashboard onShowToast={onShowToast} />
        )}

        {/* TAB 5B: MOVE-IN & ISSUES */}
        {activeTab === 'move_ins' && (
          <ProviderMoveInManager onShowToast={onShowToast} onOpenConversation={onOpenConversation} />
        )}

        {/* TAB 6: INSPECTIONS */}
        {activeTab === 'inspections' && (
          <ProviderInspectionDashboard onShowToast={onShowToast} onOpenConversation={onOpenConversation || (() => {})} />
        )}

        {/* TAB 7: FINANCIALS & REVENUE */}
        {activeTab === 'financials' && (
          <ProviderFinancialDashboard onShowToast={onShowToast} />
        )}

        {/* TAB 8: MESSAGES & STUDENT INQUIRIES */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            
            {/* Top Quick Actions & Template Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Student Inquiries & Direct Messaging</h3>
                  <p className="text-xs text-gray-500">Live chat with prospective students inquiring about your hostels</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchConversations()}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Refresh Chats
                  </button>
                  <button
                    onClick={() => setNewQuickReplyModal(true)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    + Add Quick Reply Template
                  </button>
                </div>
              </div>

              {/* Quick Reply Badges */}
              {quickReplies.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-gray-400 shrink-0">Templates:</span>
                  {quickReplies.map(qr => (
                    <button
                      key={qr.id}
                      onClick={() => setMessageReplyText(qr.messageText)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={qr.messageText}
                    >
                      <span>{qr.title}</span>
                      <span className="text-[10px] text-emerald-600">↳ Insert</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Two-Pane Messaging Interface */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden grid lg:grid-cols-12 min-h-[620px]">
              
              {/* Left Column: Student Conversations List */}
              <div className="lg:col-span-4 border-r border-gray-200 flex flex-col bg-gray-50/50">
                
                {/* Search Bar */}
                <div className="p-3.5 border-b border-gray-200 bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search student or hostel..."
                      value={conversationSearch}
                      onChange={e => setConversationSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Conversations Scrollable List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[560px]">
                  {conversations.length === 0 ? (
                    <div className="text-center py-16 px-4 space-y-2">
                      <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-bold text-gray-500">No active student inquiries</p>
                      <p className="text-[11px] text-gray-400">When students ask questions about your rooms, they will show here.</p>
                    </div>
                  ) : (
                    conversations
                      .filter(c => {
                        if (!conversationSearch.trim()) return true;
                        const q = conversationSearch.toLowerCase();
                        return (
                          (c.studentName && c.studentName.toLowerCase().includes(q)) ||
                          (c.propertyTitle && c.propertyTitle.toLowerCase().includes(q)) ||
                          (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
                        );
                      })
                      .map(conv => {
                        const isSelected = activeConversationId === conv.id;
                        const hasUnread = (conv.unreadCount || 0) > 0;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => {
                              setActiveConversationId(conv.id);
                              loadConversationDetail(conv.id);
                            }}
                            className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/90 border-l-4 border-emerald-800'
                                : hasUnread
                                ? 'bg-amber-50/60 hover:bg-amber-100/60'
                                : 'hover:bg-gray-100/70'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {conv.studentName?.charAt(0) || 'S'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <h5 className="text-xs font-bold text-gray-900 truncate">
                                  {conv.studentName || 'Student'}
                                </h5>
                                <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                                  {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-emerald-800 truncate mb-1">
                                {conv.propertyTitle}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] text-gray-500 truncate flex-1 pr-2">
                                  {conv.lastMessageText || 'No message yet'}
                                </p>
                                {hasUnread && (
                                  <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

              </div>

              {/* Right Column: Active Conversation & Reply Thread */}
              <div className="lg:col-span-8 flex flex-col bg-white">
                {activeDetail ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {activeDetail.conversation.student?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">
                              {activeDetail.conversation.student?.name || 'Student'}
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              Prospective Tenant
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Inquiring regarding <span className="font-semibold text-emerald-800">{activeDetail.conversation.property?.title}</span> • {activeDetail.conversation.property?.areaName}
                          </p>
                        </div>
                      </div>

                      {/* Property badge */}
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-black text-gray-900">
                          {formatNaira(activeDetail.conversation.property?.rentAmount || 0)}/yr
                        </span>
                        <p className="text-[10px] text-gray-400">Total: {formatNaira(activeDetail.conversation.property?.totalMandatoryCost || 0)}</p>
                      </div>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/40 max-h-[460px]">
                      {messagesLoading ? (
                        <div className="text-center py-16">
                          <div className="w-6 h-6 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Loading conversation history...</p>
                        </div>
                      ) : activeDetail.messages.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 text-xs">
                          No messages in this inquiry thread yet.
                        </div>
                      ) : (
                        activeDetail.messages.map((msg: MessageItem) => {
                          const isMe = msg.senderRole === 'PROVIDER';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-[10px] font-bold text-gray-500">
                                  {isMe ? 'You (Landlord)' : activeDetail.conversation.student?.name || 'Student'}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div
                                className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                                  isMe
                                    ? 'bg-emerald-800 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Input Form */}
                    <div className="p-4 border-t border-gray-200 bg-white space-y-2">
                      <form onSubmit={handleSendReply} className="flex gap-2">
                        <input
                          type="text"
                          value={messageReplyText}
                          onChange={e => setMessageReplyText(e.target.value)}
                          placeholder="Type your response to this student..."
                          className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          disabled={sendingReply}
                        />
                        <button
                          type="submit"
                          disabled={!messageReplyText.trim() || sendingReply}
                          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                        </button>
                      </form>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                        <span>💬 Direct replies are delivered instantly to the student's portal.</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3 min-h-[400px]">
                    <MessageSquare className="w-12 h-12 text-gray-300" />
                    <h4 className="text-sm font-bold text-gray-700">Select a student conversation</h4>
                    <p className="text-xs max-w-sm">Choose an inquiry from the left pane to view message history and send immediate replies.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 9: PERFORMANCE & FUNNEL */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            
            {/* Conversion Funnel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Student Accommodation Conversion Funnel</h2>
                <p className="text-xs text-gray-500">Track how student interest converts into confirmed paid bookings</p>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { label: 'Views', value: performanceData?.funnel?.views || 0, color: 'bg-gray-100 text-gray-900' },
                  { label: 'Shortlist Saves', value: performanceData?.funnel?.saves || 0, color: 'bg-blue-50 text-blue-900' },
                  { label: 'Inspections', value: performanceData?.funnel?.inspections || 0, color: 'bg-indigo-50 text-indigo-900' },
                  { label: 'Booking Requests', value: performanceData?.funnel?.bookingRequests || 0, color: 'bg-amber-50 text-amber-900' },
                  { label: 'Confirmed / Paid', value: performanceData?.funnel?.confirmedBookings || 0, color: 'bg-emerald-100 text-emerald-950' }
                ].map((stage, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border border-gray-200 ${stage.color}`}>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-75">{stage.label}</span>
                    <div className="text-2xl font-black mt-1">{stage.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Reviews & Feedback */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Student Reviews & Ratings</h3>
                  <p className="text-xs text-gray-500">Verified feedback from students who inspected or stayed in your hostel</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  {performanceData?.reviews?.averageRating || '5.0'} / 5.0
                </div>
              </div>

              <div className="space-y-3">
                {(!performanceData?.reviews?.items || performanceData.reviews.items.length === 0) ? (
                  <p className="text-xs text-gray-500 py-6 text-center">No student reviews recorded yet.</p>
                ) : (
                  performanceData.reviews.items.map((rev: any) => (
                    <div key={rev.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{rev.student_name}</span>
                          <span className="text-[10px] text-gray-500">({rev.property_title})</span>
                          <span className="text-amber-500 text-xs font-bold">★ {rev.rating}/5</span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">{rev.comment}</p>
                      </div>
                      <button
                        onClick={() => setReportReviewModal(rev)}
                        className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 shrink-0"
                        title="Report review"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Report
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 10: PROFILE & TEAM ACCESS */}
        {activeTab === 'profile_team' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Business Profile & Documents */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Landlord Profile & Verification</h3>
                  <p className="text-xs text-gray-500">Upload official identity documents for your verified badge</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Landlord Name:</span>
                    <span className="font-bold text-gray-900">{user?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Email:</span>
                    <span className="font-bold text-gray-900">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Verification Status:</span>
                    <span className="font-bold text-emerald-800">{stats?.verificationStatus || 'PENDING'}</span>
                  </div>
                </div>

                {/* Upload Verification Document */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-5 text-center space-y-3">
                  <Upload className="w-8 h-8 text-emerald-700 mx-auto" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Upload ID Document (NIN / Driver License)</h5>
                    <p className="text-[11px] text-gray-500">Encrypted & visible only to Hostel Ease compliance admins</p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <select
                      value={selectedDocType}
                      onChange={e => setSelectedDocType(e.target.value)}
                      className="text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="NIN_CARD">NIN Slip / Card</option>
                      <option value="DRIVERS_LICENSE">Driver's License</option>
                      <option value="VOTERS_CARD">Voter's Card</option>
                      <option value="INTERNATIONAL_PASSPORT">Passport</option>
                    </select>

                    <input
                      ref={docInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleDocumentUpload}
                      className="hidden"
                      id="provider-doc-upload"
                    />
                    <label
                      htmlFor="provider-doc-upload"
                      className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      {isUploadingDoc ? 'Uploading...' : 'Choose File'}
                    </label>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-gray-700">Uploaded Verification Files</h5>
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-900">{doc.documentType}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team Roles & Permissions */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Accommodation Team & Roles</h3>
                    <p className="text-xs text-gray-500">Grant caretakers or managers operational access</p>
                  </div>
                  <button
                    onClick={() => setAddTeamModal(true)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Add Member
                  </button>
                </div>

                <div className="space-y-3">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">No team members added yet.</p>
                  ) : (
                    teamMembers.map(member => (
                      <div key={member.id} className="p-3.5 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">{member.fullName}</h5>
                          <p className="text-[11px] text-gray-500">{member.email} • Role: <strong>{member.role}</strong></p>
                        </div>
                        <button
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="text-gray-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Provider Activity Audit Logs */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-gray-900">Activity Audit Trail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.slice(0, 10).map(log => (
                      <tr key={log.id}>
                        <td className="p-3 font-bold text-gray-900">{log.action}</td>
                        <td className="p-3 text-gray-600">{log.entity_type}</td>
                        <td className="p-3 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB: WIZARD */}
        {activeTab === 'wizard' && (
          <HostelCreationWizard
            areas={areas}
            editingProperty={editingProperty}
            onComplete={() => {
              setActiveTab('listings');
              fetchAllProviderData(selectedPropertyId);
            }}
            onCancel={() => setActiveTab('listings')}
            onShowToast={onShowToast}
          />
        )}

      </main>
      </div>

      {/* 2. ONBOARDING MODAL */}
      <ProviderOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => fetchAllProviderData(selectedPropertyId)}
        onShowToast={onShowToast}
      />

      {/* 3. ADD ROOM MODAL */}
      {addRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add Room & Bedspaces</h3>
              <button onClick={() => setAddRoomModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Room Name / Number *</label>
                <input
                  type="text"
                  required
                  value={newRoomData.roomName}
                  onChange={e => setNewRoomData({ ...newRoomData, roomName: e.target.value })}
                  placeholder="e.g. Room 101, Block A"
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Room Layout</label>
                  <select
                    value={newRoomData.roomType}
                    onChange={e => setNewRoomData({ ...newRoomData, roomType: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  >
                    <option value="SELF_CONTAIN">Self Contain</option>
                    <option value="SINGLE_ROOM">Single Room</option>
                    <option value="SHARED_BEDSPACE">Shared Bedspace</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Bedspaces / Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRoomData.maxOccupants}
                    onChange={e => setNewRoomData({ ...newRoomData, maxOccupants: parseInt(e.target.value, 10) || 1, quantityTotal: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRoomData.isEnsuite}
                    onChange={e => setNewRoomData({ ...newRoomData, isEnsuite: e.target.checked })}
                    className="rounded text-emerald-700"
                  />
                  <span>En-suite Bathroom</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRoomData.isFurnished}
                    onChange={e => setNewRoomData({ ...newRoomData, isFurnished: e.target.checked })}
                    className="rounded text-emerald-700"
                  />
                  <span>Furnished</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddRoomModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. AI LANDLORD ASSISTANT DRAWER */}
      {aiDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="text-sm font-bold">Landlord AI Guide</h3>
            </div>
            <button onClick={() => setAiDrawerOpen(false)} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl max-w-[85%] ${
                  msg.sender === 'USER'
                    ? 'ml-auto bg-emerald-800 text-white font-medium'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
              </div>
            ))}
            {aiLoading && (
              <div className="p-3 bg-gray-100 rounded-2xl text-xs text-gray-500 animate-pulse">
                Analyzing your accommodation data...
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-1.5 text-[11px]">
            {[
              'How many spaces are available?',
              'Which bookings need attention?',
              'Summarize my inspections',
              'Improve my hostel description'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(chip);
                }}
                className="px-2.5 py-1 bg-white border border-gray-200 hover:border-emerald-500 rounded-lg text-gray-700 font-medium"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleAskAI} className="p-3 border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ask about rooms, bookings, descriptions..."
              className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiPrompt.trim()}
              className="p-2.5 bg-emerald-800 text-white rounded-xl disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 5. ADD QUICK REPLY MODAL */}
      {newQuickReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Create Quick Reply Template</h3>
              <button onClick={() => setNewQuickReplyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickReply} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={newQRTitle}
                  onChange={e => setNewQRTitle(e.target.value)}
                  placeholder="e.g. Generator Schedule Policy"
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Message Content *</label>
                <textarea
                  required
                  rows={3}
                  value={newQRText}
                  onChange={e => setNewQRText(e.target.value)}
                  placeholder="Type the response message you frequently send..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setNewQuickReplyModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD TEAM MEMBER MODAL */}
      {addTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add Team Member</h3>
              <button onClick={() => setAddTeamModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeamMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">User Account Email *</label>
                <input
                  type="email"
                  required
                  value={teamEmail}
                  onChange={e => setTeamEmail(e.target.value)}
                  placeholder="e.g. manager@hostelease.ng"
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Access Role</label>
                <select
                  value={teamRole}
                  onChange={e => setTeamRole(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                >
                  <option value="MANAGER">MANAGER (Listings, Bookings, Inspections, Messages)</option>
                  <option value="STAFF">STAFF (Inspections & Operations only)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddTeamModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. REPORT REVIEW MODAL */}
      {reportReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Report Review to Moderation</h3>
              <button onClick={() => setReportReviewModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportReviewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Report Reason</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                >
                  <option value="INAPPROPRIATE_REVIEW">Abusive or Vulgar Language</option>
                  <option value="FRAUDULENT_REVIEW">False / Fabricated Claim</option>
                  <option value="SPAM">Spam / Competitor Attack</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Explanation for Admin *</label>
                <textarea
                  required
                  rows={3}
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Explain why this review should be investigated..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReportReviewModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. PRICE HISTORY MODAL */}
      {selectedPropertyPriceHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Price Change History</h3>
                <p className="text-xs text-gray-500">{historyPropertyTitle}</p>
              </div>
              <button onClick={() => setSelectedPropertyPriceHistory(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedPropertyPriceHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No historical price changes recorded for this hostel.</p>
              ) : (
                selectedPropertyPriceHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 border border-gray-200 rounded-xl bg-gray-50 space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-500 line-through">{formatNaira(item.previousRent)}</span>
                      <span className="text-emerald-800 font-extrabold">{formatNaira(item.newRent)}</span>
                    </div>
                    <p className="text-gray-600 text-[11px]">{item.changeReason}</p>
                    <span className="text-[10px] text-gray-400 block pt-1">{new Date(item.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
