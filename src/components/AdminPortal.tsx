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
  Download
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

export const AdminPortal: React.FC<AdminPortalProps> = ({
  areas,
  onShowToast
}) => {
  const { loginDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [revenueOverview, setRevenueOverview] = useState<RevenueOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Tab Data Lists
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

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

  // Modals & Action States
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

      if (dash) setDashboardData(dash);
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
              {dashboardData?.admin.fullName || 'Super Administrator'}
            </p>
            <p className="text-[10px] text-emerald-400 font-medium">
              {dashboardData?.admin.role || 'SUPER_ADMIN'}
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
                { id: 'users', label: 'User Directory', icon: Users, badge: dashboardData?.stats.totalStudents },
                { id: 'providers', label: 'Providers / Hosts', icon: Building2, badge: dashboardData?.stats.totalProviders },
                { id: 'hostels', label: 'Hostel Listings', icon: Layers, badge: dashboardData?.stats.totalHostels },
                { id: 'bookings', label: 'Bookings Oversight', icon: Calendar, badge: dashboardData?.stats.activeBookings }
              ]
            },
            {
              category: 'TRUST & SAFETY',
              items: [
                { id: 'verification', label: 'Verification Center', icon: ShieldCheck, badge: dashboardData?.stats.pendingHostels, badgeColor: 'bg-amber-500/20 text-amber-300' },
                { id: 'disputes', label: 'Dispute Cases', icon: ShieldAlert, badge: disputesList.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length || null, badgeColor: 'bg-rose-500/20 text-rose-300' },
                { id: 'reports', label: 'Safety & Reports', icon: AlertTriangle, badge: dashboardData?.stats.openReports, badgeColor: 'bg-rose-500/20 text-rose-300' },
                { id: 'reviews', label: 'Review Moderation', icon: MessageSquareQuote, badge: null },
                { id: 'community_moderation', label: 'Community & Roommates', icon: ShieldCheck, badge: 'Phase 14', badgeColor: 'bg-emerald-500/20 text-emerald-300' }
              ]
            },
            {
              category: '💰 FINANCE / REVENUE',
              items: [
                { id: 'finance_revenue', label: 'Revenue Overview', icon: TrendingUp, badge: revenueOverview ? formatNaira(revenueOverview.ownerRevenue.netPlatformRevenue) : null, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'finance_transactions', label: 'Transactions', icon: CreditCard, badge: null },
                { id: 'finance_commissions', label: 'Booking Commissions', icon: Receipt, badge: '7.5%', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
                { id: 'finance_subscriptions', label: 'Provider Subscriptions', icon: ShieldCheck, badge: revenueOverview?.dashboardSummary.activeSubscribers || null },
                { id: 'finance_featured', label: 'Featured Listings', icon: Sparkles, badge: revenueOverview?.dashboardSummary.activeFeatured || null, badgeColor: 'bg-amber-500/20 text-amber-300' },
                { id: 'finance_services', label: 'Provider Services', icon: Camera, badge: revenueOverview?.dashboardSummary.completedServices || null },
                { id: 'finance_payouts', label: 'Payouts', icon: ArrowUpRight, badge: revenueOverview?.dashboardSummary.pendingPayoutsCount ? `${revenueOverview.dashboardSummary.pendingPayoutsCount} Pending` : null, badgeColor: 'bg-rose-500/20 text-rose-300' },
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
                { id: 'support', label: 'Support Inquiries', icon: LifeBuoy, badge: dashboardData?.stats.openSupportTickets, badgeColor: 'bg-indigo-500/20 text-indigo-300' },
                { id: 'announcements', label: 'Broadcast Updates', icon: Megaphone, badge: announcements.length },
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
                      {formatNaira(revenueOverview?.dashboardSummary.totalRevenue ?? dashboardData.stats.totalGrossRevenue)}
                    </p>
                    <p className="text-[10px] text-slate-500">Gross inflows</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">This Month</p>
                    <p className="text-xl font-black text-white">
                      {formatNaira(revenueOverview?.dashboardSummary.thisMonth ?? 0)}
                    </p>
                    <p className="text-[10px] text-emerald-400">Current cycle</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Revenue</p>
                    <p className="text-xl font-black text-amber-400">
                      {formatNaira(revenueOverview?.dashboardSummary.pendingRevenue ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">In escrow queue</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Successful Bookings</p>
                    <p className="text-xl font-black text-white">
                      {revenueOverview?.dashboardSummary.successfulBookings ?? dashboardData.stats.successfulPayments}
                    </p>
                    <p className="text-[10px] text-slate-500">Paid stays</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Provider Revenue</p>
                    <p className="text-xl font-black text-cyan-400">
                      {formatNaira(revenueOverview?.dashboardSummary.providerRevenue ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">Landlord payouts</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Platform Commission</p>
                    <p className="text-xl font-black text-indigo-400">
                      {formatNaira(revenueOverview?.dashboardSummary.platformCommission ?? 0)}
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
                      Net Platform Revenue: {formatNaira(revenueOverview.ownerRevenue.netPlatformRevenue)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total Revenue</p>
                      <p className="text-base font-black text-white">{formatNaira(revenueOverview.ownerRevenue.totalGrossRevenue)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-900/40">
                      <p className="text-[10px] text-emerald-400 uppercase font-bold">Booking Commission</p>
                      <p className="text-base font-black text-emerald-300">{formatNaira(revenueOverview.ownerRevenue.bookingCommission)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-900/40">
                      <p className="text-[10px] text-blue-400 uppercase font-bold">Provider Subscriptions</p>
                      <p className="text-base font-black text-blue-300">{formatNaira(revenueOverview.ownerRevenue.providerSubscriptions)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-900/40">
                      <p className="text-[10px] text-amber-400 uppercase font-bold">Featured Listings</p>
                      <p className="text-base font-black text-amber-300">{formatNaira(revenueOverview.ownerRevenue.featuredListings)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-900/40">
                      <p className="text-[10px] text-purple-400 uppercase font-bold">Digital Services</p>
                      <p className="text-base font-black text-purple-300">{formatNaira(revenueOverview.ownerRevenue.digitalServices)}</p>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-900/40">
                      <p className="text-[10px] text-rose-400 uppercase font-bold">Refunds</p>
                      <p className="text-base font-black text-rose-400">-{formatNaira(revenueOverview.ownerRevenue.refunds)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Students</p>
                  <p className="text-2xl font-black text-emerald-400">{dashboardData.stats.totalStudents}</p>
                  <p className="text-[10px] text-slate-500">Verified student profiles</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Providers / Landlords</p>
                  <p className="text-2xl font-black text-cyan-400">{dashboardData.stats.totalProviders}</p>
                  <p className="text-[10px] text-slate-500">Active hostel operators</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Hostels</p>
                  <p className="text-2xl font-black text-white">{dashboardData.stats.totalHostels}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">{dashboardData.stats.verifiedHostels} Verified Badges</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Verification</p>
                  <p className="text-2xl font-black text-amber-400">{dashboardData.stats.pendingHostels}</p>
                  <p className="text-[10px] text-amber-400/80">Requires admin inspection</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Bookings</p>
                  <p className="text-2xl font-black text-indigo-400">{dashboardData.stats.activeBookings}</p>
                  <p className="text-[10px] text-slate-500">{dashboardData.stats.pendingBookings} awaiting 48h confirm</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Successful Payments</p>
                  <p className="text-2xl font-black text-emerald-400">{dashboardData.stats.successfulPayments}</p>
                  <p className="text-[10px] text-slate-500">Gross: {formatNaira(dashboardData.stats.totalGrossRevenue)}</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Open Reports & Safety</p>
                  <p className="text-2xl font-black text-rose-400">{dashboardData.stats.openReports}</p>
                  <p className="text-[10px] text-rose-400/80">Investigate high-priority flags</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Open Support Tickets</p>
                  <p className="text-2xl font-black text-purple-400">{dashboardData.stats.openSupportTickets}</p>
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
                    <p className="text-xl font-black text-white">{dashboardData.stressMetrics.searchToBookingConversion}</p>
                    <p className="text-[10px] text-emerald-400">Direct search relevance</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <p className="text-xs text-slate-400">Avg Hostels Viewed Before Booking</p>
                    <p className="text-xl font-black text-white">{dashboardData.stressMetrics.avgViewsPerBooking} Hostels</p>
                    <p className="text-[10px] text-slate-400">Low decision fatigue</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <p className="text-xs text-slate-400">Booking Cancellation Rate</p>
                    <p className="text-xl font-black text-emerald-400">{dashboardData.stressMetrics.bookingCancellationRate}</p>
                    <p className="text-[10px] text-slate-400">High booking fulfillment</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">User Accounts Directory</h2>
                  <p className="text-xs text-slate-400">Manage students, providers, and administrator roles</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="STUDENT">Students</option>
                    <option value="PROVIDER">Providers</option>
                    <option value="ADMIN">Admins</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Activity</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-white">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            u.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            u.role === 'PROVIDER' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{u.phone || '—'}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            u.accountStatus === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' :
                            u.accountStatus === 'SUSPENDED' ? 'bg-rose-950 text-rose-400' :
                            'bg-amber-950 text-amber-400'
                          }`}>
                            {u.accountStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-slate-400">
                          {u.role === 'STUDENT' ? `${u.studentBookingsCount || 0} Bookings` : `${u.providerHostelsCount || 0} Hostels`}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedUserForStatus(u);
                              setUserStatusToSet(u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                            }}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                          >
                            Manage Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </div>
  );
};
