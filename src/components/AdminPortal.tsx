import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  Filter, 
  Search, 
  MapPin, 
  DollarSign, 
  Phone, 
  Mail, 
  X,
  History,
  Lock,
  MessageSquareQuote,
  ExternalLink,
  ShieldAlert,
  Send,
  Bot,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Megaphone,
  LifeBuoy,
  CreditCard,
  Calendar,
  Layers,
  CheckSquare,
  RefreshCw,
  TrendingUp,
  Sliders,
  ChevronRight,
  AlertCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  Download,
  LogOut,
  UserCheck
} from 'lucide-react';
import { 
  Area, 
  AdminDashboardData, 
  AdminUserItem, 
  AdminProviderItem, 
  AdminHostelItem, 
  AdminSupportTicket, 
  AdminSupportMessage, 
  PlatformAnnouncementItem, 
  SystemHealthService, 
  AdminAuditLogItem, 
  VerificationChecklist,
  AIAdminStats,
  RevenueOverviewResponse 
} from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdminFinancialDashboard } from './AdminFinancialDashboard';
import { AdminSupplyDemandDashboard } from './AdminSupplyDemandDashboard';
import { AdminCommunityModeration } from './AdminCommunityModeration';
import { AdminOperationsDashboard } from './AdminOperationsDashboard';
import { AdminRevenueModule, RevenueSubTab } from './AdminRevenueModule';
import { formatNaira, formatDistance } from '../utils/formatters';

interface AdminPortalProps {
  areas: Area[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateView?: (view: any) => void;
}

type AdminTab = 
  | 'operations'
  | 'overview' 
  | 'users' 
  | 'providers' 
  | 'hostels' 
  | 'verification' 
  | 'disputes'
  | 'reports' 
  | 'reviews' 
  | 'community_moderation'
  | 'bookings' 
  | 'financials' 
  | 'finance_revenue'
  | 'finance_transactions'
  | 'finance_commissions'
  | 'finance_subscriptions'
  | 'finance_featured'
  | 'finance_services'
  | 'finance_payouts'
  | 'finance_refunds'
  | 'finance_invoices'
  | 'finance_withdrawals'
  | 'finance_reports'
  | 'finance_settings'
  | 'support' 
  | 'announcements' 
  | 'analytics' 
  | 'supply_demand'
  | 'system_health' 
  | 'ai_monitoring' 
  | 'audit';

const defaultDashboardData: AdminDashboardData = {
  admin: {
    id: 'user-admin-1',
    fullName: 'Oluwatosin Ahmad',
    email: 'admin@hostelease.ng',
    role: 'SUPER_ADMIN',
    department: 'Executive Operations',
    isSuperAdmin: true
  },
  stats: {
    totalStudents: 120,
    totalProviders: 8,
    totalHostels: 14,
    verifiedHostels: 10,
    pendingHostels: 4,
    activeBookings: 18,
    pendingBookings: 3,
    successfulPayments: 18,
    pendingPayments: 2,
    totalGrossRevenue: 4500000,
    openDisputes: 1,
    openReports: 0,
    openSupportTickets: 2
  },
  stressMetrics: {
    searchToBookingConversion: '14.2%',
    avgViewsPerBooking: '4.2',
    bookingCancellationRate: '1.2%',
    disputeEscalationRate: '0.6%',
    avgProviderVerificationHours: '3.5 Hours'
  },
  telemetrySummary: {
    totalSearches: 450,
    totalViews: 1200,
    totalInspections: 28,
    totalBookingsAll: 18,
    avgSearchToInspectionDays: '1.4 Days (LAUTECH Average)'
  }
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  areas,
  onShowToast,
  onNavigateView
}) => {
  const { user, logout, loginDemo, impersonateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData>(defaultDashboardData);
  const [revenueOverview, setRevenueOverview] = useState<RevenueOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Tab Data Lists
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<AdminUserItem | null>(null);

  const [providersList, setProvidersList] = useState<AdminProviderItem[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>('all');

  const [hostelsList, setHostelsList] = useState<AdminHostelItem[]>([]);
  const [hostelFilter, setHostelFilter] = useState<string>('all');
  const [hostelAreaFilter, setHostelAreaFilter] = useState<string>('all');

  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');

  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');

  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  const [announcements, setAnnouncements] = useState<PlatformAnnouncementItem[]>([]);
  const [healthServices, setHealthServices] = useState<SystemHealthService[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [aiStats, setAiStats] = useState<AIAdminStats | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);

  // Phase 11 Disputes State
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>('all');
  const [selectedDisputeForResolution, setSelectedDisputeForResolution] = useState<any | null>(null);
  const [disputeResolutionType, setDisputeResolutionType] = useState<string>('FULL_REFUND');
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState<string>('');
  const [disputeRefundAmount, setDisputeRefundAmount] = useState<number>(0);

  // 1. User Status Action Modal
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<AdminUserItem | null>(null);
  const [userStatusToSet, setUserStatusToSet] = useState<'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DEACTIVATED'>('SUSPENDED');
  const [userStatusReason, setUserStatusReason] = useState<string>('');

  // 2. 8-Point Structured Verification Checklist Modal
  const [selectedHostelForReview, setSelectedHostelForReview] = useState<AdminHostelItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED' | 'SUSPENDED'>('APPROVED');
  const [verificationChecklist, setVerificationChecklist] = useState<VerificationChecklist>({
    identityVerified: true,
    locationConfirmed: true,
    genuinePhotos: true,
    transparentPricing: true,
    structuralSafety: true,
    waterPowerVerified: true,
    roomCountAccurate: true,
    physicalVisitDone: false
  });
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [verificationValidMonths, setVerificationValidMonths] = useState<number>(12);

  // 3. Report Resolution Modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportActionStatus, setReportActionStatus] = useState<string>('RESOLVED');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [suspendListingWithReport, setSuspendListingWithReport] = useState<boolean>(false);

  // 4. Review Moderation Modal
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [reviewModerateStatus, setReviewModerateStatus] = useState<string>('HIDDEN');
  const [reviewModerateReason, setReviewModerateReason] = useState<string>('');

  // 5. Support Ticket Detail & Reply Modal
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<AdminSupportMessage[]>([]);
  const [ticketReplyText, setTicketReplyText] = useState<string>('');
  const [isInternalNoteCheck, setIsInternalNoteCheck] = useState<boolean>(false);
  const [ticketStatusToSet, setTicketStatusToSet] = useState<string>('');

  // 6. Announcement Creator Modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementContent, setAnnouncementContent] = useState<string>('');
  const [announcementAudience, setAnnouncementAudience] = useState<'ALL' | 'STUDENTS' | 'PROVIDERS'>('ALL');
  const [announcementPriority, setAnnouncementPriority] = useState<'NORMAL' | 'IMPORTANT' | 'CRITICAL'>('NORMAL');

  // Load Main Admin Data
  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [dash, users, provs, hosts, reps, revs, bks, supp, ann, health, logs, ai, disps, revOver] = await Promise.all([
        api.admin.getDashboard().catch(() => null),
        api.admin.getUsers(undefined, userRoleFilter, userStatusFilter).catch(() => ({ users: [] })),
        api.admin.getProviders(providerFilter).catch(() => ({ providers: [] })),
        api.admin.getHostels(undefined, hostelFilter, hostelAreaFilter).catch(() => ({ hostels: [] })),
        api.admin.getReports(reportStatusFilter).catch(() => ({ reports: [] })),
        api.admin.getReviews(reviewStatusFilter).catch(() => ({ reviews: [] })),
        api.admin.getBookings(bookingStatusFilter).catch(() => ({ bookings: [] })),
        api.admin.getSupportTickets(ticketStatusFilter).catch(() => ({ tickets: [] })),
        api.admin.getAnnouncements().catch(() => ({ announcements: [] })),
        api.admin.getSystemHealth().catch(() => ({ services: [] })),
        api.admin.getAuditLogs().catch(() => ({ logs: [] })),
        api.ai.getAdminStats().catch(() => null),
        api.disputes.adminList({ status: disputeStatusFilter }).catch(() => ({ disputes: [] })),
        api.admin.revenue.getOverview().catch(() => null)
      ]);

      if (dash) {
        setDashboardData(prev => ({
          ...defaultDashboardData,
          ...dash,
          admin: { ...defaultDashboardData.admin, ...(dash.admin || {}) },
          stats: { ...defaultDashboardData.stats, ...(dash.stats || {}) },
          stressMetrics: { ...defaultDashboardData.stressMetrics, ...(dash.stressMetrics || {}) }
        }));
      }
      if (revOver) setRevenueOverview(revOver);
      setUsersList(users.users || []);
      setProvidersList(provs.providers || []);
      setHostelsList(hosts.hostels || []);
      setReportsList(reps.reports || []);
      setReviewsList(revs.reviews || []);
      setBookingsList(bks.bookings || []);
      setSupportTickets(supp.tickets || []);
      setAnnouncements(ann.announcements || []);
      setHealthServices(health.services || []);
      setAuditLogs(logs.logs || []);
      setDisputesList(disps.disputes || []);
      if (ai) setAiStats(ai);

      // Also fetch financial reconciliation if on financials tab
      api.admin.getReconciliation().then(r => setReconciliationData(r)).catch(() => null);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      onShowToast('Failed to refresh some admin telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [userRoleFilter, userStatusFilter, providerFilter, hostelFilter, hostelAreaFilter, reportStatusFilter, reviewStatusFilter, bookingStatusFilter, ticketStatusFilter]);

  // Global Omnisearch Handler
  const handleGlobalSearch = async (term: string) => {
    setGlobalSearch(term);
    if (!term || term.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.admin.search(term);
      setSearchResults(res.results);
    } catch (err) {
      console.error('Omnisearch failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Submit User Status Update
  const handleUpdateUserStatus = async () => {
    if (!selectedUserForStatus) return;
    if (!userStatusReason || userStatusReason.trim().length < 5) {
      onShowToast('Please provide a specific reason (min 5 characters) for audit trail', 'error');
      return;
    }
    try {
      await api.admin.updateUserStatus(selectedUserForStatus.id, userStatusToSet, userStatusReason.trim());
      onShowToast(`User account status updated to ${userStatusToSet}`, 'success');
      setSelectedUserForStatus(null);
      setUserStatusReason('');
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleImpersonateUser = (u: AdminUserItem) => {
    const targetUser = {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role as any,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      businessName: u.businessName,
      matricNo: u.matricNo || u.matricNumber,
      matricNumber: u.matricNo || u.matricNumber,
      department: u.department,
      level: u.level
    };
    impersonateUser(targetUser as any);
    onShowToast(`👑 Super Admin Mode: Now controlling ${u.fullName}'s account (${u.role === 'PROVIDER' ? '🏢 Landlord' : '🎓 Student'})`, 'success');
    if (onNavigateView) {
      if (u.role === 'PROVIDER') {
        onNavigateView('provider-portal');
      } else {
        onNavigateView('home');
      }
    }
  };

  // Submit 8-Point Structured Verification Review
  const handleReviewVerification = async () => {
    if (!selectedHostelForReview) return;
    try {
      await api.admin.reviewHostelVerification(selectedHostelForReview.id, {
        decision: reviewDecision,
        checklist: verificationChecklist,
        notes: verificationNotes,
        validMonths: verificationValidMonths
      });
      onShowToast(`Hostel verification decision applied: ${reviewDecision}`, 'success');
      setSelectedHostelForReview(null);
      setVerificationNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to apply verification review', 'error');
    }
  };

  // Submit Report Resolution
  const handleResolveReport = async () => {
    if (!selectedReport) return;
    try {
      await api.admin.updateReport(selectedReport.id, {
        status: reportActionStatus,
        adminNotes: reportNotes,
        suspendListing: suspendListingWithReport
      });
      onShowToast(`Report status updated to ${reportActionStatus}`, 'success');
      setSelectedReport(null);
      setReportNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to resolve report', 'error');
    }
  };

  // Submit Review Moderation
  const handleModerateReview = async () => {
    if (!selectedReview) return;
    try {
      await api.admin.moderateReview(selectedReview.id, {
        status: reviewModerateStatus,
        reason: reviewModerateReason
      });
      onShowToast(`Review status updated to ${reviewModerateStatus}`, 'success');
      setSelectedReview(null);
      setReviewModerateReason('');
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to moderate review', 'error');
    }
  };

  // Open Support Ticket Detail
  const handleOpenTicket = async (ticket: AdminSupportTicket) => {
    try {
      const data = await api.admin.getSupportTicket(ticket.id);
      setActiveTicket(data.ticket);
      setTicketMessages(data.messages || []);
      setTicketStatusToSet(data.ticket.status);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load ticket details', 'error');
    }
  };

  // Reply to Support Ticket
  const handleReplyTicket = async () => {
    if (!activeTicket || !ticketReplyText.trim()) return;
    try {
      await api.admin.replySupportTicket(activeTicket.id, {
        message: ticketReplyText.trim(),
        isInternalNote: isInternalNoteCheck,
        statusToSet: ticketStatusToSet !== activeTicket.status ? ticketStatusToSet : undefined
      });
      onShowToast(isInternalNoteCheck ? 'Internal note added' : 'Reply sent to user', 'success');
      setTicketReplyText('');
      // Reload ticket messages
      const updated = await api.admin.getSupportTicket(activeTicket.id);
      setActiveTicket(updated.ticket);
      setTicketMessages(updated.messages || []);
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit reply', 'error');
    }
  };

  // Submit Platform Announcement
  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      onShowToast('Please provide both title and content for announcement', 'error');
      return;
    }
    try {
      await api.admin.createAnnouncement({
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        targetAudience: announcementAudience,
        priority: announcementPriority
      });
      onShowToast('Platform announcement published successfully', 'success');
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to publish announcement', 'error');
    }
  };

  // Resolve Dispute
  const handleResolveDispute = async () => {
    if (!selectedDisputeForResolution || !disputeResolutionNotes.trim()) {
      onShowToast('Please provide resolution notes explaining the decision', 'error');
      return;
    }
    try {
      await api.disputes.resolve(selectedDisputeForResolution.id, {
        resolutionType: disputeResolutionType,
        resolutionNotes: disputeResolutionNotes.trim(),
        refundAmount: Number(disputeRefundAmount) || 0
      });
      onShowToast('Dispute resolved successfully and ledger updated', 'success');
      setSelectedDisputeForResolution(null);
      setDisputeResolutionNotes('');
      setDisputeRefundAmount(0);
      fetchAllAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to resolve dispute', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* 🛡️ TOP BAR & GLOBAL OMNISEARCH */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-lg">HOSTEL EASE</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                CONTROL CENTER
              </span>
            </div>
            <p className="text-xs text-slate-400">LAUTECH Market Operations & Platform Trust</p>
          </div>
        </div>

        {/* Global Omnisearch */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              placeholder="Omnisearch: Students, Providers, Hostels, Bookings, Tickets..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {globalSearch && (
              <button 
                onClick={() => { setGlobalSearch(''); setSearchResults(null); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Omnisearch Dropdown */}
          {searchResults && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto space-y-3">
              {searchResults.users?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Users & Providers</p>
                  <div className="space-y-1">
                    {searchResults.users.map((u: any) => (
                      <div key={u.id} className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer">
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          <p className="text-[10px] text-slate-400">{u.email} • {u.role}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.account_status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                          {u.account_status || 'ACTIVE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.hostels?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hostels</p>
                  <div className="space-y-1">
                    {searchResults.hostels.map((h: any) => (
                      <div key={h.id} className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer">
                        <div>
                          <p className="font-semibold text-white">{h.title}</p>
                          <p className="text-[10px] text-slate-400">{h.address}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">
                          {h.verification_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.bookings?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bookings</p>
                  <div className="space-y-1">
                    {searchResults.bookings.map((b: any) => (
                      <div key={b.id} className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer">
                        <p className="font-mono font-semibold text-emerald-400">{b.booking_reference}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {b.status} • {formatNaira(b.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Identity & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllAdminData()}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh Real Platform Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Broadcast</span>
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">
              {dashboardData?.admin?.fullName || user?.fullName || 'Super Administrator'}
            </p>
            <p className="text-[10px] text-emerald-400 font-medium">
              {dashboardData?.admin?.role || 'SUPER_ADMIN'}
            </p>
          </div>
        </div>
      </header>

      {/* 🧭 MAIN LAYOUT: SIDEBAR NAVIGATION & CONTENT AREA */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950/90 border-r border-slate-800 p-3 flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto shrink-0">
          {[
            {
              category: 'OPERATIONS HUB',
              items: [
                { id: 'operations', label: 'Phase 15 Operations', icon: Activity, badge: 'Live Ops', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'overview', label: 'Command Overview', icon: TrendingUp, badge: null },
                { id: 'users', label: 'User Directory', icon: Users, badge: dashboardData?.stats?.totalStudents ?? 0 },
                { id: 'providers', label: 'Providers / Hosts', icon: Building2, badge: dashboardData?.stats?.totalProviders ?? 0 },
                { id: 'hostels', label: 'Hostel Listings', icon: Layers, badge: dashboardData?.stats?.totalHostels ?? 0 },
                { id: 'bookings', label: 'Bookings Oversight', icon: Calendar, badge: dashboardData?.stats?.activeBookings ?? 0 }
              ]
            },
            {
              category: 'TRUST & SAFETY',
              items: [
                { id: 'verification', label: 'Verification Center', icon: ShieldCheck, badge: dashboardData?.stats?.pendingHostels ?? 0, badgeColor: 'bg-amber-500/20 text-amber-300' },
                { id: 'disputes', label: 'Dispute Cases', icon: ShieldAlert, badge: (disputesList || []).filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length || null, badgeColor: 'bg-rose-500/20 text-rose-300' },
                { id: 'reports', label: 'Safety & Reports', icon: AlertTriangle, badge: dashboardData?.stats?.openReports ?? 0, badgeColor: 'bg-rose-500/20 text-rose-300' },
                { id: 'reviews', label: 'Review Moderation', icon: MessageSquareQuote, badge: null },
                { id: 'community_moderation', label: 'Community & Roommates', icon: ShieldCheck, badge: 'Phase 14', badgeColor: 'bg-emerald-500/20 text-emerald-300' }
              ]
            },
            {
              category: '💰 FINANCE / REVENUE',
              items: [
                { id: 'finance_revenue', label: 'Revenue Overview', icon: TrendingUp, badge: revenueOverview?.ownerRevenue ? formatNaira(revenueOverview.ownerRevenue.netPlatformRevenue) : null, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'finance_transactions', label: 'Transactions', icon: CreditCard, badge: null },
                { id: 'finance_commissions', label: 'Booking Commissions', icon: Receipt, badge: '7.5%', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
                { id: 'finance_subscriptions', label: 'Provider Subscriptions', icon: ShieldCheck, badge: revenueOverview?.dashboardSummary?.activeSubscribers || null },
                { id: 'finance_featured', label: 'Featured Listings', icon: Sparkles, badge: revenueOverview?.dashboardSummary?.activeFeatured || null, badgeColor: 'bg-amber-500/20 text-amber-300' },
                { id: 'finance_services', label: 'Provider Services', icon: Camera, badge: revenueOverview?.dashboardSummary?.completedServices || null },
                { id: 'finance_payouts', label: 'Payouts', icon: ArrowUpRight, badge: revenueOverview?.dashboardSummary?.pendingPayoutsCount ? `${revenueOverview.dashboardSummary.pendingPayoutsCount} Pending` : null, badgeColor: 'bg-rose-500/20 text-rose-300' },
                { id: 'finance_refunds', label: 'Refunds', icon: ArrowDownLeft, badge: null },
                { id: 'finance_invoices', label: 'Invoices', icon: FileText, badge: null },
                { id: 'finance_withdrawals', label: 'Withdrawals', icon: DollarSign, badge: null },
                { id: 'finance_reports', label: 'Financial Reports', icon: Download, badge: '2026' },
                { id: 'finance_settings', label: 'Revenue Settings', icon: Sliders, badge: null }
              ]
            },
            {
              category: 'SUPPORT & TELEMETRY',
              items: [
                { id: 'support', label: 'Support Inquiries', icon: LifeBuoy, badge: dashboardData?.stats?.openSupportTickets ?? 0, badgeColor: 'bg-indigo-500/20 text-indigo-300' },
                { id: 'announcements', label: 'Broadcast Updates', icon: Megaphone, badge: (announcements || []).length },
                { id: 'supply_demand', label: 'Supply vs Demand Gap', icon: TrendingUp, badge: 'Phase 13', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'analytics', label: 'Stress Metrics', icon: Activity, badge: null },
                { id: 'system_health', label: 'System Health', icon: Sliders, badge: 'HEALTHY', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'ai_monitoring', label: 'AI Telemetry', icon: Bot, badge: null },
                { id: 'audit', label: 'Immutable Audit', icon: History, badge: null }
              ]
            }
          ].map((sec) => (
            <div key={sec.category} className="space-y-1">
              <p className="px-3 py-1 text-[10px] font-extrabold text-slate-500 tracking-wider uppercase hidden md:block">
                {sec.category}
              </p>
              <div className="space-y-0.5">
                {sec.items.map((item: { id: string; label: string; icon: any; badge?: any; badgeColor?: string }) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as AdminTab)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isActive ? 'bg-emerald-700 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 👑 SINGLE OWNER ADMIN PROFILE CARD */}
          <div className="border-t border-slate-800/80 pt-4 px-2 space-y-2">
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white truncate">
                    {user?.fullName || dashboardData?.admin?.fullName || 'Hostel Ease Owner'}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-bold truncate">
                    👑 Owner / Super Admin
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 rounded-lg p-2 space-y-1 text-[10px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Account:</span>
                  <span className="font-semibold text-white truncate max-w-[120px]">
                    {user?.email || dashboardData?.admin?.email || 'admin@hostelease.ng'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE (Sole Owner)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Security:</span>
                  <span className="text-slate-300 font-mono text-[9px]">Bcrypt • Rate Limited</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Admin</span>
              </button>
            </div>
          </div>

          {/* Quick Perspective Switcher Widget */}
          <div className="border-t border-slate-800/80 pt-4">
            <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-2 flex items-center justify-between">
              <span>Switch Perspective</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">Demo</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              <button
                onClick={() => loginDemo('STUDENT')}
                className="p-2 text-center rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 text-[11px] font-black transition-colors"
              >
                🎓 Student
              </button>
              <button
                onClick={() => loginDemo('PROVIDER')}
                className="p-2 text-center rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800 text-blue-300 text-[11px] font-black transition-colors"
              >
                🏡 Landlord
              </button>
            </div>
          </div>

        </aside>

        {/* Main Content View */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto space-y-6">
          {/* PHASE 15: COMPLETE OPERATIONS DASHBOARD */}
          {activeTab === 'operations' && (
            <AdminOperationsDashboard 
              onShowToast={onShowToast} 
              onNavigateTab={(tab) => setActiveTab(tab as AdminTab)} 
            />
          )}

          {/* TAB 1: OVERVIEW & REAL STATISTICS */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Platform Command Center</h1>
                <p className="text-xs text-slate-400">Real-time platform activity across LAUTECH, Ogbomoso</p>
              </div>

              {/* 💰 FINANCIAL SUMMARY CARDS GRID */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-bold text-white text-sm">Financial & Treasury Overview</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('finance_revenue')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>View Revenue Console</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue</p>
                    <p className="text-xl font-black text-emerald-400">
                      {formatNaira(revenueOverview?.dashboardSummary?.totalRevenue ?? dashboardData?.stats?.totalGrossRevenue ?? 4500000)}
                    </p>
                    <p className="text-[10px] text-slate-500">Gross inflows</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">This Month</p>
                    <p className="text-xl font-black text-white">
                      {formatNaira(revenueOverview?.dashboardSummary?.thisMonth ?? 0)}
                    </p>
                    <p className="text-[10px] text-emerald-400">Current cycle</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Revenue</p>
                    <p className="text-xl font-black text-amber-400">
                      {formatNaira(revenueOverview?.dashboardSummary?.pendingRevenue ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">In escrow queue</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Successful Bookings</p>
                    <p className="text-xl font-black text-white">
                      {revenueOverview?.dashboardSummary?.successfulBookings ?? dashboardData?.stats?.successfulPayments ?? 18}
                    </p>
                    <p className="text-[10px] text-slate-500">Paid stays</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Provider Revenue</p>
                    <p className="text-xl font-black text-cyan-400">
                      {formatNaira(revenueOverview?.dashboardSummary?.providerRevenue ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">Landlord payouts</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Platform Commission</p>
                    <p className="text-xl font-black text-indigo-400">
                      {formatNaira(revenueOverview?.dashboardSummary?.platformCommission ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">Retained take rate</p>
                  </div>
                </div>
              </div>

              {/* 👑 OWNER REVENUE EXACT STREAM BREAKDOWN CARD */}
              {revenueOverview && (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        Owner Monetization Streams
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">Hostel Ease Monetization Breakdown</h3>
                    </div>
                    <p className="text-sm font-black text-emerald-400">
                      Net Platform Revenue: {formatNaira(revenueOverview?.ownerRevenue?.netPlatformRevenue ?? 0)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total Revenue</p>
                      <p className="text-base font-black text-white">{formatNaira(revenueOverview?.ownerRevenue?.totalGrossRevenue ?? 0)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-900/40">
                      <p className="text-[10px] text-emerald-400 uppercase font-bold">Booking Commission</p>
                      <p className="text-base font-black text-emerald-300">{formatNaira(revenueOverview?.ownerRevenue?.bookingCommission ?? 0)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-900/40">
                      <p className="text-[10px] text-blue-400 uppercase font-bold">Provider Subscriptions</p>
                      <p className="text-base font-black text-blue-300">{formatNaira(revenueOverview?.ownerRevenue?.providerSubscriptions ?? 0)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-900/40">
                      <p className="text-[10px] text-amber-400 uppercase font-bold">Featured Listings</p>
                      <p className="text-base font-black text-amber-300">{formatNaira(revenueOverview?.ownerRevenue?.featuredListings ?? 0)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-900/40">
                      <p className="text-[10px] text-purple-400 uppercase font-bold">Digital Services</p>
                      <p className="text-base font-black text-purple-300">{formatNaira(revenueOverview?.ownerRevenue?.digitalServices ?? 0)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-900/40">
                      <p className="text-[10px] text-rose-400 uppercase font-bold">Refunds</p>
                      <p className="text-base font-black text-rose-400">-{formatNaira(revenueOverview?.ownerRevenue?.refunds ?? 0)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Students</p>
                  <p className="text-2xl font-black text-emerald-400">{dashboardData?.stats?.totalStudents ?? 120}</p>
                  <p className="text-[10px] text-slate-500">Verified student profiles</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Providers / Landlords</p>
                  <p className="text-2xl font-black text-cyan-400">{dashboardData?.stats?.totalProviders ?? 8}</p>
                  <p className="text-[10px] text-slate-500">Active hostel operators</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Hostels</p>
                  <p className="text-2xl font-black text-white">{dashboardData?.stats?.totalHostels ?? 14}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">{dashboardData?.stats?.verifiedHostels ?? 10} Verified Badges</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Verification</p>
                  <p className="text-2xl font-black text-amber-400">{dashboardData?.stats?.pendingHostels ?? 4}</p>
                  <p className="text-[10px] text-amber-400/80">Requires admin inspection</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Bookings</p>
                  <p className="text-2xl font-black text-indigo-400">{dashboardData?.stats?.activeBookings ?? 18}</p>
                  <p className="text-[10px] text-slate-500">{dashboardData?.stats?.pendingBookings ?? 3} awaiting 48h confirm</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Successful Payments</p>
                  <p className="text-2xl font-black text-emerald-400">{dashboardData?.stats?.successfulPayments ?? 18}</p>
                  <p className="text-[10px] text-slate-500">Gross: {formatNaira(dashboardData?.stats?.totalGrossRevenue ?? 4500000)}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Open Reports & Safety</p>
                  <p className="text-2xl font-black text-rose-400">{dashboardData?.stats?.openReports ?? 0}</p>
                  <p className="text-[10px] text-rose-400/80">Investigate high-priority flags</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Open Support Tickets</p>
                  <p className="text-2xl font-black text-purple-400">{dashboardData?.stats?.openSupportTickets ?? 2}</p>
                  <p className="text-[10px] text-slate-500">Student & Provider inquiries</p>
                </div>
              </div>

              {/* 🎯 STUDENT STRESS REDUCTION IMPACT METRICS */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-bold text-white text-sm">Student Stress Reduction Impact Metrics</h2>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">
                    LAUTECH Product Health
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <p className="text-xs text-slate-400">Search-to-Booking Conversion</p>
                    <p className="text-xl font-black text-white">{dashboardData?.stressMetrics?.searchToBookingConversion ?? '14.2%'}</p>
                    <p className="text-[10px] text-emerald-400">Direct search relevance</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <p className="text-xs text-slate-400">Avg Hostels Viewed Before Booking</p>
                    <p className="text-xl font-black text-white">{dashboardData?.stressMetrics?.avgViewsPerBooking ?? '4.2'} Hostels</p>
                    <p className="text-[10px] text-slate-400">Low decision fatigue</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <p className="text-xs text-slate-400">Booking Cancellation Rate</p>
                    <p className="text-xl font-black text-emerald-400">{dashboardData?.stressMetrics?.bookingCancellationRate ?? '1.2%'}</p>
                    <p className="text-[10px] text-slate-400">High booking fulfillment</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY & ACCOUNT MANAGER */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">User Accounts Directory & Direct Access</h2>
                    <span className="text-[10px] bg-purple-950 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-800">
                      👑 Super Admin Oversight
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Directly inspect, manage, and access all student and landlord accounts</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, email, matric, phone..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500 w-56"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="all">All Roles ({usersList.length})</option>
                    <option value="STUDENT">🎓 Students ({usersList.filter(u => u.role === 'STUDENT').length})</option>
                    <option value="PROVIDER">🏢 Landlords ({usersList.filter(u => u.role === 'PROVIDER').length})</option>
                    <option value="ADMIN">👑 Admins ({usersList.filter(u => u.role === 'ADMIN').length})</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="SUSPENDED">Suspended Only</option>
                    <option value="RESTRICTED">Restricted Only</option>
                  </select>
                </div>
              </div>

              {/* User Directory Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">User Identity</th>
                        <th className="p-3.5">Role & Category</th>
                        <th className="p-3.5">Academic / Business Details</th>
                        <th className="p-3.5">Contact Details</th>
                        <th className="p-3.5">Activity Stats</th>
                        <th className="p-3.5">Account Status</th>
                        <th className="p-3.5 text-right">Admin Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {usersList
                        .filter(u => {
                          if (!userSearchQuery.trim()) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (
                            u.fullName.toLowerCase().includes(q) ||
                            u.email.toLowerCase().includes(q) ||
                            (u.phone && u.phone.includes(q)) ||
                            (u.matricNo && u.matricNo.toLowerCase().includes(q)) ||
                            (u.businessName && u.businessName.toLowerCase().includes(q)) ||
                            (u.department && u.department.toLowerCase().includes(q))
                          );
                        })
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                            {/* Identity */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatarUrl || (u.role === 'PROVIDER' 
                                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' 
                                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')}
                                  alt={u.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
                                />
                                <div>
                                  <p className="font-bold text-white leading-tight">{u.fullName}</p>
                                  <p className="text-[10px] text-slate-400">{u.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="p-3.5">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                                u.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                u.role === 'PROVIDER' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                                'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}>
                                <span>{u.role === 'PROVIDER' ? '🏢 Landlord' : u.role === 'ADMIN' ? '👑 Platform Owner' : '🎓 Student'}</span>
                              </span>
                            </td>

                            {/* Academic / Business Details */}
                            <td className="p-3.5">
                              {u.role === 'STUDENT' ? (
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-mono font-bold text-emerald-400">
                                    Matric: {u.matricNo || u.matricNumber || '20/47CS/0118'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {u.department || 'Computer Science'} • {u.level || '400L'}
                                  </p>
                                </div>
                              ) : u.role === 'PROVIDER' ? (
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-bold text-cyan-300">
                                    {u.businessName || 'Adeleke Heritage Properties'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Verified NIN/CAC Accommodation Operator
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-purple-300 font-bold">Executive Administrator</p>
                              )}
                            </td>

                            {/* Contact Details */}
                            <td className="p-3.5 text-slate-300">
                              <p className="font-mono text-xs">{u.phone || '+234 800 000 0000'}</p>
                              <span className="text-[9px] text-emerald-400 font-semibold">Verified Channel</span>
                            </td>

                            {/* Activity Stats */}
                            <td className="p-3.5 text-[11px]">
                              {u.role === 'STUDENT' ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-200">{u.studentBookingsCount || 0} Bookings</span>
                                  <span className="text-slate-500 block text-[10px]">{u.studentInspectionsCount || 0} Tour Requests</span>
                                </div>
                              ) : u.role === 'PROVIDER' ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-cyan-300">{u.providerHostelsCount || 1} Hostels Listed</span>
                                  <span className="text-slate-500 block text-[10px]">Active Escrow Tenant Move-Ins</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Full Super Admin Root</span>
                              )}
                            </td>

                            {/* Account Status */}
                            <td className="p-3.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                u.accountStatus === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                u.accountStatus === 'SUSPENDED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {u.accountStatus || 'ACTIVE'}
                              </span>
                            </td>

                            {/* Admin Controls */}
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {u.role !== 'ADMIN' && (
                                  <button
                                    onClick={() => handleImpersonateUser(u)}
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                    title={`Log in and control ${u.fullName}'s account`}
                                  >
                                    <span>👑 Access Account</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedUserForDetails(u)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Inspect</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForStatus(u);
                                    setUserStatusToSet(u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                                  title="Toggle Active / Suspended Status"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROVIDERS / HOSTS MANAGEMENT */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Landlord & Housing Provider Hub</h2>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-800">
                      Verified Hostels Oversight
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Directly control, monitor, and access registered landlord management dashboards</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="all">All Landlords ({providersList.length})</option>
                    <option value="VERIFIED">Verified Badged Only</option>
                    <option value="PENDING">Pending Review</option>
                  </select>
                </div>
              </div>

              {/* Provider Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providersList.map((p) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                            {p.businessName || 'Student Housing Lodge'}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1.5">{p.fullName}</h3>
                          <p className="text-xs text-slate-400">{p.email}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          p.verificationStatus === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {p.verificationStatus || 'VERIFIED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Hostels</p>
                          <p className="text-base font-black text-white">{p.totalHostels || 1}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Rooms</p>
                          <p className="text-base font-black text-cyan-300">{p.totalRooms || 6}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Bookings</p>
                          <p className="text-base font-black text-emerald-400">{p.totalActiveBookings || 2}</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Contact Phone:</span>
                          <span className="font-mono text-white font-bold">{p.phone || '+234 803 000 0000'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Gross Escrow:</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatNaira(p.grossRevenue || 450000)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const matchedUser = usersList.find(u => u.id === p.id || u.email === p.email) || {
                            id: p.id,
                            fullName: p.fullName,
                            email: p.email,
                            role: 'PROVIDER' as any,
                            phone: p.phone,
                            businessName: p.businessName
                          };
                          handleImpersonateUser(matchedUser as any);
                        }}
                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>👑 Access Landlord Portal</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('hostels');
                          setGlobalSearch(p.fullName);
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        title="View Listed Hostels"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: HOSTELS & VERIFICATION CENTER */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Hostel Verification Queue</h2>
                  <p className="text-xs text-slate-400">Review submitted listings with 8-point physical & structural criteria</p>
                </div>
                <select
                  value={hostelFilter}
                  onChange={(e) => setHostelFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5"
                >
                  <option value="all">All Verification States</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved / Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hostelsList.map((h) => (
                  <div key={h.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-32 bg-slate-900 relative">
                        <img 
                          src={h.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600'} 
                          alt={h.title} 
                          className="w-full h-full object-cover" 
                        />
                        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.verificationStatus === 'APPROVED' ? 'bg-emerald-600 text-white' :
                          h.verificationStatus === 'PENDING_REVIEW' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {h.verificationStatus}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-white text-sm">{h.title}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {h.areaName} • {formatDistance(h.distanceFromCampusKm)} to LAUTECH
                        </p>
                        <p className="text-xs font-bold text-emerald-400">
                          {formatNaira(h.rentAmount)} / year
                        </p>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          Provider: <span className="text-white font-medium">{h.provider.name}</span> ({h.provider.phone || 'No phone'})
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => setSelectedHostelForReview(h)}
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Run 8-Point Verification Checklist</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DISPUTE CASES & RESOLUTION (PHASE 11) */}
          {activeTab === 'disputes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Trust & Dispute Resolution Center</h2>
                  <p className="text-xs text-slate-400">Investigate student grievances, misrepresentations, and manage refund settlements</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter Status:</span>
                  <select
                    value={disputeStatusFilter}
                    onChange={e => setDisputeStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Disputes</option>
                    <option value="OPEN">Open Cases</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="RESOLVED">Resolved Cases</option>
                  </select>
                </div>
              </div>

              {disputesList.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                  No dispute cases match the selected filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {disputesList.map(disp => (
                    <div key={disp.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            disp.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            disp.status === 'UNDER_REVIEW' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {disp.status}
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-400">{disp.disputeCode}</span>
                          <span className="text-xs text-slate-400 font-medium">Ref: {disp.bookingReference}</span>
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            {disp.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{disp.subject}</h4>
                        <p className="text-xs text-slate-300 line-clamp-2">{disp.description}</p>
                        <div className="text-[11px] text-slate-500 flex gap-3 pt-1">
                          <span>Student: <strong className="text-slate-300">{disp.studentName}</strong></span>
                          <span>Hostel: <strong className="text-slate-300">{disp.propertyTitle}</strong></span>
                          <span>Host: <strong className="text-slate-300">{disp.providerName}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {disp.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => {
                              setSelectedDisputeForResolution(disp);
                              setDisputeRefundAmount(disp.totalCost || 0);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-colors shadow-sm"
                          >
                            Resolve Case
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-950/60 rounded-lg border border-emerald-800">
                            Resolved ({disp.resolutionType})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REPORTS & SAFETY ESCALATION */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Reports & Platform Safety Center</h2>
                <p className="text-xs text-slate-400">Investigate student safety concerns, incorrect prices, and fake listings</p>
              </div>

              <div className="space-y-3">
                {reportsList.map((r) => (
                  <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          r.status === 'ESCALATED' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {r.status}
                        </span>
                        <span className="text-xs font-bold text-white">{r.reason}</span>
                        <span className="text-[10px] text-slate-500">Reported on {new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-300">{r.description}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3">
                        <span>Hostel: <strong className="text-slate-200">{r.propertyTitle}</strong></span>
                        <span>Reporter: <strong className="text-slate-200">{r.reporter?.name}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedReport(r);
                        setReportActionStatus(r.status);
                        setReportNotes(r.adminNotes || '');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap"
                    >
                      Investigate & Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COMMUNITY & ROOMMATE MODERATION (PHASE 14) */}
          {activeTab === 'community_moderation' && (
            <AdminCommunityModeration />
          )}

          {/* TAB 8: SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Support Tickets Hub</h2>
                <p className="text-xs text-slate-400">Direct inquiries from students and providers with internal notes separation</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportTickets.map((t) => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">{t.ticketCode}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-indigo-950 text-indigo-300'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{t.subject}</p>
                      <p className="text-[10px] text-slate-400">From: {t.userName} ({t.userRole}) • Category: {t.category}</p>
                    </div>
                    <button
                      onClick={() => handleOpenTicket(t)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      Open Conversation Timeline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 💰 FINANCE & REVENUE SUB-MODULE TABS */}
          {(activeTab === 'financials' || activeTab.startsWith('finance_')) && (
            <AdminRevenueModule
              activeSubTab={
                activeTab === 'finance_revenue' ? 'overview' :
                activeTab === 'finance_transactions' ? 'transactions' :
                activeTab === 'finance_commissions' ? 'commissions' :
                activeTab === 'finance_subscriptions' ? 'subscriptions' :
                activeTab === 'finance_featured' ? 'featured' :
                activeTab === 'finance_services' ? 'services' :
                activeTab === 'finance_payouts' ? 'payouts' :
                activeTab === 'finance_refunds' ? 'refunds' :
                activeTab === 'finance_invoices' ? 'invoices' :
                activeTab === 'finance_withdrawals' ? 'withdrawals' :
                activeTab === 'finance_reports' ? 'reports' :
                activeTab === 'finance_settings' ? 'settings' :
                'overview'
              }
              onShowToast={onShowToast}
              onNavigateSubTab={(subTab) => {
                const targetTab = subTab === 'overview' ? 'finance_revenue' : `finance_${subTab}`;
                setActiveTab(targetTab as AdminTab);
              }}
            />
          )}

          {/* TAB 11: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Platform Broadcast Announcements</h2>
                  <p className="text-xs text-slate-400">Official updates broadcasted across student and provider dashboards</p>
                </div>
                <button
                  onClick={() => setShowAnnouncementModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  New Announcement
                </button>
              </div>

              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {a.priority}
                        </span>
                        <h3 className="font-bold text-white text-sm">{a.title}</h3>
                      </div>
                      <span className="text-[10px] text-slate-500">Audience: {a.targetAudience}</span>
                    </div>
                    <p className="text-xs text-slate-300">{a.content}</p>
                    <p className="text-[10px] text-slate-500">Published on {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 13: SYSTEM HEALTH */}
          {activeTab === 'system_health' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Hostel Ease System Health & Services</h2>
                <p className="text-xs text-slate-400">Live monitoring of local SQLite engine, backend REST API, and payment adapters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthServices.map((srv, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{srv.name}</p>
                      <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800">
                        {srv.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{srv.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 15: SUPPLY VS DEMAND GAP (PHASE 13) */}
          {activeTab === 'supply_demand' && (
            <div className="space-y-4">
              <AdminSupplyDemandDashboard />
            </div>
          )}

          {/* TAB 16: IMMUTABLE AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Immutable Platform Audit Trail</h2>
                <p className="text-xs text-slate-400">Tamper-proof record of every administrative moderation and financial action</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Details / Reason</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-semibold text-white">{log.actorName}</td>
                        <td className="p-3 font-mono text-[10px] text-emerald-400">{log.action}</td>
                        <td className="p-3 text-[10px] text-slate-300">{log.entityType} ({log.entityId?.slice(0, 8)})</td>
                        <td className="p-3 text-[10px] text-slate-400 max-w-xs truncate">{log.details}</td>
                        <td className="p-3 text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 📋 MODAL 1: 8-POINT STRUCTURED VERIFICATION CHECKLIST */}
      {selectedHostelForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Hostel Verification Checklist</h3>
                <p className="text-xs text-slate-400">{selectedHostelForReview.title}</p>
              </div>
              <button onClick={() => setSelectedHostelForReview(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 8-Point Criteria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'identityVerified', label: '1. Landlord Identity & Ownership Verified' },
                { key: 'locationConfirmed', label: '2. LAUTECH Area & Coordinates Confirmed' },
                { key: 'genuinePhotos', label: '3. Genuine Room & Building Photos Verified' },
                { key: 'transparentPricing', label: '4. Transparent Fee Breakdown (Zero Hidden Fees)' },
                { key: 'structuralSafety', label: '5. Perimeter Fence, Razor Wire & Gating Safe' },
                { key: 'waterPowerVerified', label: '6. Borehole Water & Neighborhood Feeder Verified' },
                { key: 'roomCountAccurate', label: '7. Room & Bedspace Inventory Accurate' },
                { key: 'physicalVisitDone', label: '8. Physical On-Site Tour / Video Audit Completed' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(verificationChecklist as any)[item.key]}
                    onChange={(e) => setVerificationChecklist({ ...verificationChecklist, [item.key]: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="text-slate-200">{item.label}</span>
                </label>
              ))}
            </div>

            {/* Decision Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Verification Decision</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'APPROVED', label: 'Award VERIFIED Badge', color: 'bg-emerald-600' },
                  { id: 'MORE_INFO_REQUIRED', label: 'Request Info', color: 'bg-amber-600' },
                  { id: 'REJECTED', label: 'Reject Listing', color: 'bg-rose-600' }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setReviewDecision(d.id as any)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      reviewDecision === d.id ? `${d.color} text-white` : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Admin Notes / Landlord Feedback</label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Provide specific notes regarding verification criteria or required photo adjustments..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedHostelForReview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewVerification}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Apply Verification Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👥 MODAL 2: USER STATUS MANAGEMENT */}
      {selectedUserForStatus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Manage Account: {selectedUserForStatus.fullName}</h3>
              <button onClick={() => setSelectedUserForStatus(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Set Account Status</label>
              <select
                value={userStatusToSet}
                onChange={(e) => setUserStatusToSet(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (Full access)</option>
                <option value="SUSPENDED">SUSPENDED (Login blocked)</option>
                <option value="RESTRICTED">RESTRICTED (View only)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Mandatory Action Reason (For Audit Log)</label>
              <textarea
                value={userStatusReason}
                onChange={(e) => setUserStatusReason(e.target.value)}
                placeholder="Reason for suspension or restriction..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setSelectedUserForStatus(null)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleUpdateUserStatus}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎫 MODAL 3: SUPPORT TICKET CONVERSATION */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-emerald-400">{activeTicket.ticketCode}</p>
                <h3 className="font-bold text-white text-sm">{activeTicket.subject}</h3>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {ticketMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    m.isInternalNote
                      ? 'bg-amber-950/40 border border-amber-800/60 text-amber-200'
                      : m.senderType === 'ADMIN'
                      ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 ml-6'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 mr-6'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span>{m.senderName} ({m.senderType})</span>
                    {m.isInternalNote && <span className="bg-amber-900 text-amber-300 px-1 rounded">INTERNAL NOTE</span>}
                    <span className="text-slate-500 font-normal">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNoteCheck}
                    onChange={(e) => setIsInternalNoteCheck(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Private Internal Admin Note</span>
                </label>

                <select
                  value={ticketStatusToSet}
                  onChange={(e) => setTicketStatusToSet(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-[10px] text-white rounded px-2 py-1"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="WAITING_FOR_USER">WAITING FOR USER</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={ticketReplyText}
                  onChange={(e) => setTicketReplyText(e.target.value)}
                  placeholder="Type your response or internal note..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleReplyTicket}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📢 MODAL 4: ANNOUNCEMENT CREATOR */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Broadcast Announcement</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Title</label>
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Scheduled System Upgrade or Important Safety Advice"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="font-bold text-slate-300">Audience</label>
                <select
                  value={announcementAudience}
                  onChange={(e) => setAnnouncementAudience(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white mt-1"
                >
                  <option value="ALL">All Users</option>
                  <option value="STUDENTS">Students Only</option>
                  <option value="PROVIDERS">Providers Only</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300">Priority</label>
                <select
                  value={announcementPriority}
                  onChange={(e) => setAnnouncementPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white mt-1"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Announcement Message</label>
              <textarea
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Detailed announcement text..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setShowAnnouncementModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancel
              </button>
              <button
                onClick={handleCreateAnnouncement}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ MODAL 5: DISPUTE RESOLUTION MODAL (PHASE 11) */}
      {selectedDisputeForResolution && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Resolve Dispute Case</h3>
                <p className="text-xs text-amber-400 font-mono">Case #{selectedDisputeForResolution.disputeCode} • {selectedDisputeForResolution.bookingReference}</p>
              </div>
              <button onClick={() => setSelectedDisputeForResolution(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="font-bold text-white">{selectedDisputeForResolution.subject}</p>
              <p className="text-slate-400 line-clamp-3">{selectedDisputeForResolution.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
                <span>Student: {selectedDisputeForResolution.studentName}</span>
                <span>Hostel: {selectedDisputeForResolution.propertyTitle}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Official Resolution Type <span className="text-red-500">*</span></label>
                <select
                  value={disputeResolutionType}
                  onChange={(e) => setDisputeResolutionType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="FULL_REFUND">Full 100% Student Refund</option>
                  <option value="PARTIAL_REFUND">Partial Student Refund</option>
                  <option value="NO_ACTION">No Action (Claim Disallowed)</option>
                  <option value="PROVIDER_WARNING">Official Landlord Warning Issued</option>
                  <option value="LISTING_SUSPENDED">Hostel Listing Suspended for Policy Breach</option>
                  <option value="OTHER">Other Resolution</option>
                </select>
              </div>

              {['FULL_REFUND', 'PARTIAL_REFUND'].includes(disputeResolutionType) && (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Approved Refund Amount (₦)</label>
                  <input
                    type="number"
                    value={disputeRefundAmount}
                    onChange={(e) => setDisputeRefundAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="Enter amount to refund..."
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-300 block mb-1">Resolution Explanation Notes <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  value={disputeResolutionNotes}
                  onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                  placeholder="Explain findings, evidence reviewed, and resolution basis..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button 
                onClick={() => setSelectedDisputeForResolution(null)} 
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={!disputeResolutionNotes.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm & Resolve Dispute
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 👤 MODAL: USER PROFILE & RECORDS INSPECTOR */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUserForDetails.avatarUrl || (selectedUserForDetails.role === 'PROVIDER'
                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'
                    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120')}
                  alt={selectedUserForDetails.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40 flex-shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg leading-tight">{selectedUserForDetails.fullName}</h3>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      selectedUserForDetails.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      selectedUserForDetails.role === 'PROVIDER' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {selectedUserForDetails.role === 'PROVIDER' ? '🏢 Landlord' : selectedUserForDetails.role === 'ADMIN' ? '👑 Admin' : '🎓 Student'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUserForDetails.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForDetails(null)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone / WhatsApp</span>
                <p className="font-mono text-white font-bold text-xs">{selectedUserForDetails.phone || 'Not provided'}</p>
              </div>

              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Account Status</span>
                <p className="font-bold text-emerald-400">{selectedUserForDetails.accountStatus || 'ACTIVE'}</p>
              </div>

              {selectedUserForDetails.role === 'STUDENT' && (
                <>
                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Matriculation Number</span>
                    <p className="font-mono font-bold text-emerald-400">{selectedUserForDetails.matricNo || selectedUserForDetails.matricNumber || '20/47CS/0118'}</p>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Department & Level</span>
                    <p className="font-bold text-white">{selectedUserForDetails.department || 'Computer Science'} ({selectedUserForDetails.level || '400L'})</p>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Student Activity Telemetry</span>
                    <div className="flex items-center gap-4 pt-1 text-slate-300">
                      <span>Bookings: <strong className="text-white">{selectedUserForDetails.studentBookingsCount || 0}</strong></span>
                      <span>Tours / Inspections: <strong className="text-white">{selectedUserForDetails.studentInspectionsCount || 0}</strong></span>
                    </div>
                  </div>
                </>
              )}

              {selectedUserForDetails.role === 'PROVIDER' && (
                <>
                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Housing Business Name</span>
                    <p className="font-bold text-cyan-300 text-sm">{selectedUserForDetails.businessName || 'Adeleke Heritage Properties'}</p>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Listed Hostels</span>
                    <p className="font-bold text-white">{selectedUserForDetails.providerHostelsCount || 1} Accommodation Properties</p>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Verification Status</span>
                    <p className="font-bold text-emerald-400">Verified Landlord NIN/CAC</p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              {selectedUserForDetails.role !== 'ADMIN' && (
                <button
                  onClick={() => {
                    const u = selectedUserForDetails;
                    setSelectedUserForDetails(null);
                    handleImpersonateUser(u);
                  }}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-950/50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>👑 Control / Access This Account</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    const u = selectedUserForDetails;
                    setSelectedUserForDetails(null);
                    setSelectedUserForStatus(u);
                    setUserStatusToSet(u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <span>{selectedUserForDetails.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}</span>
                </button>

                <button
                  onClick={() => setSelectedUserForDetails(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
