import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  ShieldCheck, 
  Sparkles, 
  Camera, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  Sliders, 
  Building2, 
  AlertTriangle, 
  Eye, 
  Send, 
  Layers, 
  CreditCard,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira, formatDate } from '../utils/formatters';
import { 
  RevenueOverviewResponse, 
  BookingCommissionItem, 
  ProviderSubscriptionItem, 
  FeaturedListingItem, 
  ProviderDigitalServiceItem, 
  PayoutRequestItem, 
  PlatformInvoiceItem, 
  PlatformWithdrawalItem, 
  FinancialReportRow, 
  RevenueSettingItem 
} from '../types/hostelEase';

export type RevenueSubTab = 
  | 'overview'
  | 'transactions'
  | 'commissions'
  | 'subscriptions'
  | 'featured'
  | 'services'
  | 'payouts'
  | 'refunds'
  | 'invoices'
  | 'withdrawals'
  | 'reports'
  | 'settings';

interface AdminRevenueModuleProps {
  activeSubTab?: RevenueSubTab;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateSubTab?: (subTab: RevenueSubTab) => void;
}

export const AdminRevenueModule: React.FC<AdminRevenueModuleProps> = ({
  activeSubTab = 'overview',
  onShowToast,
  onNavigateSubTab
}) => {
  const [currentTab, setCurrentTab] = useState<RevenueSubTab>(activeSubTab);
  const [loading, setLoading] = useState<boolean>(true);

  // Data States
  const [overviewData, setOverviewData] = useState<RevenueOverviewResponse | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<BookingCommissionItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProviderSubscriptionItem[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListingItem[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderDigitalServiceItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<PlatformWithdrawalItem[]>([]);
  const [reportRows, setReportRows] = useState<FinancialReportRow[]>([]);
  const [settings, setSettings] = useState<RevenueSettingItem[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoiceItem | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [showPayoutActionModal, setShowPayoutActionModal] = useState<PayoutRequestItem | null>(null);
  const [payoutActionType, setPayoutActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [payoutActionNotes, setPayoutActionNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // New Withdrawal Form
  const [wdrAmount, setWdrAmount] = useState<string>('');
  const [wdrBank, setWdrBank] = useState<string>('First Bank of Nigeria');
  const [wdrAccountNum, setWdrAccountNum] = useState<string>('');
  const [wdrAccountName, setWdrAccountName] = useState<string>('');
  const [wdrPurpose, setWdrPurpose] = useState<string>('Platform operations reimbursement');

  // Settings Edit State
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab);
    }
  }, [activeSubTab]);

  const loadTabData = async (tabToLoad: RevenueSubTab = currentTab) => {
    setLoading(true);
    try {
      if (tabToLoad === 'overview') {
        const res = await api.admin.revenue.getOverview();
        setOverviewData(res);
      } else if (tabToLoad === 'transactions') {
        const res = await api.admin.revenue.getTransactions({ search: searchQuery, status: statusFilter });
        setTransactions(res.transactions || []);
      } else if (tabToLoad === 'commissions') {
        const res = await api.admin.revenue.getCommissions();
        setCommissions(res.commissions || []);
      } else if (tabToLoad === 'subscriptions') {
        const res = await api.admin.revenue.getSubscriptions();
        setSubscriptions(res.subscriptions || []);
        setSubscriptionPlans(res.plans || []);
      } else if (tabToLoad === 'featured') {
        const res = await api.admin.revenue.getFeaturedListings();
        setFeaturedListings(res.featured || []);
      } else if (tabToLoad === 'services') {
        const res = await api.admin.revenue.getProviderServices();
        setProviderServices(res.services || []);
      } else if (tabToLoad === 'payouts') {
        const res = await api.admin.revenue.getPayouts();
        setPayouts(res.payouts || []);
      } else if (tabToLoad === 'refunds') {
        const res = await api.admin.revenue.getRefunds();
        setRefunds(res.refunds || []);
      } else if (tabToLoad === 'invoices') {
        const res = await api.admin.revenue.getInvoices({ search: searchQuery, status: statusFilter });
        setInvoices(res.invoices || []);
      } else if (tabToLoad === 'withdrawals') {
        const res = await api.admin.revenue.getWithdrawals();
        setWithdrawals(res.withdrawals || []);
      } else if (tabToLoad === 'reports') {
        const res = await api.admin.revenue.getReports();
        setReportRows(res.report || []);
      } else if (tabToLoad === 'settings') {
        const res = await api.admin.revenue.getSettings();
        setSettings(res.settings || []);
        const initialMap: Record<string, string> = {};
        res.settings.forEach(s => { initialMap[s.setting_key] = s.setting_value; });
        setEditedSettings(initialMap);
      }
    } catch (err: any) {
      console.error('Failed to load revenue data:', err);
      onShowToast(err.message || 'Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(currentTab);
  }, [currentTab]);

  const handleTabChange = (tab: RevenueSubTab) => {
    setCurrentTab(tab);
    if (onNavigateSubTab) {
      onNavigateSubTab(tab);
    }
  };

  // Payout action
  const handleExecutePayoutAction = async () => {
    if (!showPayoutActionModal) return;
    setIsProcessing(true);
    try {
      const res = await api.admin.revenue.actionPayout(showPayoutActionModal.id, {
        action: payoutActionType,
        adminNotes: payoutActionNotes
      });
      onShowToast(res.message, 'success');
      setShowPayoutActionModal(null);
      setPayoutActionNotes('');
      loadTabData('payouts');
    } catch (err: any) {
      onShowToast(err.message || 'Action failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create Withdrawal
  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wdrAmount || !wdrAccountNum || !wdrAccountName) {
      onShowToast('Please fill all bank details', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.admin.revenue.createWithdrawal({
        amount: Number(wdrAmount),
        destinationBank: wdrBank,
        destinationAccountNumber: wdrAccountNum,
        destinationAccountName: wdrAccountName,
        purpose: wdrPurpose
      });
      onShowToast(res.message, 'success');
      setShowWithdrawalModal(false);
      setWdrAmount('');
      setWdrAccountNum('');
      setWdrAccountName('');
      loadTabData('withdrawals');
    } catch (err: any) {
      onShowToast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsProcessing(true);
    try {
      const settingsArray = Object.entries(editedSettings).map(([key, value]) => ({ key, value }));
      const res = await api.admin.revenue.updateSettings(settingsArray);
      onShowToast(res.message, 'success');
      loadTabData('settings');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportRows || reportRows.length === 0) {
      onShowToast('No financial report rows to export', 'info');
      return;
    }
    const headers = ['Month', 'Paid Bookings', 'Gross Volume (NGN)', 'Commissions (NGN)', 'Subscriptions (NGN)', 'Featured (NGN)', 'Digital Services (NGN)', 'Total Gross (NGN)', 'Refunds (NGN)', 'Net Earnings (NGN)', 'Provider Payouts (NGN)'];
    const csvContent = [
      headers.join(','),
      ...reportRows.map(r => [
        r.monthPeriod,
        r.paidBookings,
        r.grossBookingVolume,
        r.bookingCommission,
        r.subscriptionRevenue,
        r.featuredRevenue,
        r.digitalServiceRevenue,
        r.totalPlatformGross,
        r.refundsTotal,
        r.netPlatformEarnings,
        r.providerDisbursements
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hostel_Ease_Financial_Report_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Financial report CSV downloaded! 📊', 'success');
  };

  const navItems = [
    { id: 'overview', label: 'Revenue Overview', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'commissions', label: 'Booking Commissions', icon: Receipt },
    { id: 'subscriptions', label: 'Provider Subscriptions', icon: ShieldCheck },
    { id: 'featured', label: 'Featured Listings', icon: Sparkles },
    { id: 'services', label: 'Provider Services', icon: Camera },
    { id: 'payouts', label: 'Payouts', icon: ArrowUpRight },
    { id: 'refunds', label: 'Refunds', icon: ArrowDownLeft },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
    { id: 'reports', label: 'Financial Reports', icon: Download },
    { id: 'settings', label: 'Revenue Settings', icon: Sliders }
  ];

  return (
    <div className="space-y-6">
      {/* 🧭 Header & Sub-Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Hostel Ease Financial Treasury & Monetization</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">💰 Finance & Revenue Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-stream income tracking, landlord subscriptions, commissions, and automated disbursements for LAUTECH.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadTabData(currentTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {currentTab === 'reports' && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            {currentTab === 'withdrawals' && (
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-950 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Withdrawal</span>
              </button>
            )}
          </div>
        </div>

        {/* 12-Tab Subnavigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as RevenueSubTab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-bold">Synchronizing financial ledger & revenue metrics...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REVENUE OVERVIEW & OWNER BREAKDOWN */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'overview' && overviewData && (
        <div className="space-y-6">
          {/* 👑 OWNER REVENUE GENERATION SUMMARY CARD */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800/80 pb-5">
              <div>
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700">
                  Platform Owner Revenue Breakdown
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  Net Platform Earnings: <span className="text-emerald-400">{formatNaira(overviewData.ownerRevenue.netPlatformRevenue)}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Total revenue generated across all booking fees, subscriptions, promotions, and add-on services.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Gross Platform Volume</p>
                <p className="text-xl font-black text-white">{formatNaira(overviewData.ownerRevenue.totalGrossRevenue)}</p>
              </div>
            </div>

            {/* Exact Owner Revenue Streams Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue</p>
                <p className="text-base font-black text-white">{formatNaira(overviewData.ownerRevenue.totalGrossRevenue)}</p>
                <p className="text-[9px] text-emerald-400">Gross inflows</p>
              </div>

              <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Booking Commission</p>
                <p className="text-base font-black text-emerald-300">{formatNaira(overviewData.ownerRevenue.bookingCommission)}</p>
                <p className="text-[9px] text-slate-400">7.5% platform fee</p>
              </div>

              <div className="bg-slate-900/90 border border-blue-900/40 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-blue-400 uppercase">Provider Subscriptions</p>
                <p className="text-base font-black text-blue-300">{formatNaira(overviewData.ownerRevenue.providerSubscriptions)}</p>
                <p className="text-[9px] text-slate-400">Pro & Enterprise</p>
              </div>

              <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-amber-400 uppercase">Featured Listings</p>
                <p className="text-base font-black text-amber-300">{formatNaira(overviewData.ownerRevenue.featuredListings)}</p>
                <p className="text-[9px] text-slate-400">Search spotlights</p>
              </div>

              <div className="bg-slate-900/90 border border-purple-900/40 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-purple-400 uppercase">Digital Services</p>
                <p className="text-base font-black text-purple-300">{formatNaira(overviewData.ownerRevenue.digitalServices)}</p>
                <p className="text-[9px] text-slate-400">Photos & 3D tours</p>
              </div>

              <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-rose-400 uppercase">Refunds Issued</p>
                <p className="text-base font-black text-rose-400">-{formatNaira(overviewData.ownerRevenue.refunds)}</p>
                <p className="text-[9px] text-rose-400/80">Disputes reversed</p>
              </div>
            </div>
          </div>

          {/* 📊 SUMMARY CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">This Month</p>
              <p className="text-xl font-black text-emerald-400">{formatNaira(overviewData.dashboardSummary.thisMonth)}</p>
              <p className="text-[10px] text-slate-500">Current calendar month</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Revenue</p>
              <p className="text-xl font-black text-amber-400">{formatNaira(overviewData.dashboardSummary.pendingRevenue)}</p>
              <p className="text-[10px] text-slate-500">Awaiting bank verification</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Successful Bookings</p>
              <p className="text-xl font-black text-white">{overviewData.dashboardSummary.successfulBookings}</p>
              <p className="text-[10px] text-emerald-400">Completed reservations</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Provider Revenue</p>
              <p className="text-xl font-black text-cyan-400">{formatNaira(overviewData.dashboardSummary.providerRevenue)}</p>
              <p className="text-[10px] text-slate-500">Net landlord payouts</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Platform Commission</p>
              <p className="text-xl font-black text-indigo-400">{formatNaira(overviewData.dashboardSummary.platformCommission)}</p>
              <p className="text-[10px] text-slate-500">Fee retained</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Payouts</p>
              <p className="text-xl font-black text-rose-400">{formatNaira(overviewData.dashboardSummary.pendingPayouts)}</p>
              <p className="text-[10px] text-slate-500">{overviewData.dashboardSummary.pendingPayoutsCount} requests in queue</p>
            </div>
          </div>

          {/* 📈 REVENUE STREAMS & AREA DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stream Breakdown Progress */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Monetization Stream Contribution</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                  4 Active Streams
                </span>
              </div>

              <div className="space-y-3.5">
                {overviewData.streams.map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">{s.name}</span>
                      <span className="font-bold text-white">{formatNaira(s.amount)} ({s.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Area Distribution */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>LAUTECH Ogbomoso Area Performance</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Under G & Adenike Top
                </span>
              </div>

              <div className="space-y-2.5">
                {overviewData.areaRevenue.slice(0, 5).map((a) => (
                  <div key={a.areaName} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                    <div>
                      <p className="font-bold text-white">{a.areaName}</p>
                      <p className="text-[10px] text-slate-400">{a.paymentsCount} successful student payments</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">{formatNaira(a.grossAmount)}</p>
                      <p className="text-[10px] text-slate-400">Commission: {formatNaira(a.commissionEarned)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TRANSACTIONS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search payment reference, student name, or hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTabData('transactions')}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(() => loadTabData('transactions'), 50);
                }}
                className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Hostel & Room</th>
                    <th className="p-3">Total Paid</th>
                    <th className="p-3">Commission</th>
                    <th className="p-3">Provider Net</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-400">{t.payment_reference}</td>
                        <td className="p-3">
                          <p className="font-bold text-white">{t.studentName}</p>
                          <p className="text-[10px] text-slate-400">{t.studentEmail}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-white">{t.propertyTitle}</p>
                          <p className="text-[10px] text-slate-400">{t.roomName}</p>
                        </td>
                        <td className="p-3 font-bold text-white">{formatNaira(t.amount)}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatNaira(t.platform_fee)}</td>
                        <td className="p-3 font-bold text-cyan-400">{formatNaira(t.provider_amount)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            t.status === 'REFUNDED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-slate-400">{formatDate(t.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BOOKING COMMISSIONS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'commissions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Commissions Earned</p>
              <p className="text-2xl font-black text-emerald-400">
                {formatNaira(commissions.reduce((acc, c) => acc + c.commissionEarned, 0))}
              </p>
              <p className="text-[10px] text-slate-500">From successful student bookings</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Commissioned Bookings</p>
              <p className="text-2xl font-black text-white">{commissions.length}</p>
              <p className="text-[10px] text-emerald-400">Active student move-ins</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Average Commission / Booking</p>
              <p className="text-2xl font-black text-cyan-400">
                {formatNaira(commissions.length > 0 ? commissions.reduce((acc, c) => acc + c.commissionEarned, 0) / commissions.length : 0)}
              </p>
              <p className="text-[10px] text-slate-500">Effective platform take rate ~7.5%</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Booking Ref</th>
                    <th className="p-3">Hostel & Area</th>
                    <th className="p-3">Landlord</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Total Rent</th>
                    <th className="p-3">Commission Earned</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {commissions.map((c) => (
                    <tr key={c.paymentId} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{c.bookingReference}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{c.hostelTitle}</p>
                        <p className="text-[10px] text-slate-400">{c.areaName}</p>
                      </td>
                      <td className="p-3 text-slate-300">{c.providerName}</td>
                      <td className="p-3 text-slate-300">{c.studentName}</td>
                      <td className="p-3 font-bold text-white">{formatNaira(c.grossRentPaid)}</td>
                      <td className="p-3 font-black text-emerald-400">{formatNaira(c.commissionEarned)}</td>
                      <td className="p-3 font-bold text-indigo-300">{c.commissionRatePercent}%</td>
                      <td className="p-3 text-[10px] text-slate-400">{formatDate(c.paidAt || c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PROVIDER SUBSCRIPTIONS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Subscription Tiers Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 relative">
                {plan.id === 'PRO_LANDLORD' && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-bold text-white text-base">{plan.name}</h3>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {plan.price === 0 ? 'FREE' : `${formatNaira(plan.price)}`}{' '}
                    <span className="text-xs text-slate-400 font-normal">/{plan.billingCycle.toLowerCase()}</span>
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Included Features:</p>
                  {plan.features?.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Active Subscribers Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Active Provider Subscriptions</h3>
              <span className="text-xs text-emerald-400 font-bold">{subscriptions.length} active subscribers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Landlord / Provider</th>
                    <th className="p-3">Business Name</th>
                    <th className="p-3">Active Plan</th>
                    <th className="p-3">Fee Paid</th>
                    <th className="p-3">Cycle</th>
                    <th className="p-3">Renewal Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-white">{s.providerName}</p>
                        <p className="text-[10px] text-slate-400">{s.providerEmail}</p>
                      </td>
                      <td className="p-3 text-slate-300">{s.businessName || 'Independent Landlord'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          {s.plan_name}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{formatNaira(s.amount)}</td>
                      <td className="p-3 text-slate-400">{s.billing_cycle}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{s.end_date}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FEATURED LISTINGS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'featured' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Promoted & Featured Hostels</h3>
                <p className="text-xs text-slate-400">High-visibility promotional placements across Under G, Adenike, Stadium</p>
              </div>
              <span className="text-xs text-amber-400 font-bold">{featuredListings.length} active boosts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Hostel Title</th>
                    <th className="p-3">Area</th>
                    <th className="p-3">Promotion Tier</th>
                    <th className="p-3">Fee Paid</th>
                    <th className="p-3">Impressions</th>
                    <th className="p-3">Clicks</th>
                    <th className="p-3">Active Window</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {featuredListings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-white">{f.propertyTitle}</p>
                        <p className="text-[10px] text-slate-400">{f.propertyAddress}</p>
                      </td>
                      <td className="p-3 text-slate-300">{f.areaName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          {f.feature_tier}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{formatNaira(f.amount)}</td>
                      <td className="p-3 font-bold text-indigo-400">{f.impressions_count.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-400">{f.clicks_count.toLocaleString()}</td>
                      <td className="p-3 text-[10px] text-slate-400">{f.start_date} → {f.end_date}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PROVIDER DIGITAL SERVICES TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'services' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Add-On Digital & Verification Services</h3>
                <p className="text-xs text-slate-400">Professional photography, 3D tours, and verification inspections ordered by landlords</p>
              </div>
              <span className="text-xs text-purple-400 font-bold">{providerServices.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Service Name</th>
                    <th className="p-3">Landlord</th>
                    <th className="p-3">Hostel</th>
                    <th className="p-3">Fee Paid</th>
                    <th className="p-3">Assigned Field Agent</th>
                    <th className="p-3">Delivery Notes</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {providerServices.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-white">{s.service_name}</p>
                        <span className="text-[9px] font-mono text-purple-400">{s.service_type}</span>
                      </td>
                      <td className="p-3 text-slate-300">
                        <p className="font-bold text-white">{s.providerName}</p>
                        <p className="text-[10px] text-slate-400">{s.providerPhone}</p>
                      </td>
                      <td className="p-3 text-slate-300">{s.propertyTitle || 'General Account'}</td>
                      <td className="p-3 font-bold text-emerald-400">{formatNaira(s.amount)}</td>
                      <td className="p-3 text-slate-300">{s.assigned_agent || 'Unassigned'}</td>
                      <td className="p-3 text-[11px] text-slate-400 max-w-xs truncate">{s.delivery_notes || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PAYOUTS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Landlord Payout Requests & Disbursements</h3>
                <p className="text-xs text-slate-400">Review verified student move-ins and disburse funds to Nigerian bank accounts</p>
              </div>
              <span className="text-xs text-amber-400 font-bold">
                {payouts.filter(p => p.status === 'PENDING').length} Pending Approval
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Payout Ref</th>
                    <th className="p-3">Landlord</th>
                    <th className="p-3">Bank Destination</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Requested Date</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{p.payout_reference}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{p.providerName}</p>
                        <p className="text-[10px] text-slate-400">{p.businessName || p.providerEmail}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-white">{p.account_name}</p>
                        <p className="text-[10px] text-slate-400">{p.bank_name} • {p.account_number}</p>
                      </td>
                      <td className="p-3 font-black text-white text-sm">{formatNaira(p.amount)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          p.status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">{formatDate(p.created_at)}</td>
                      <td className="p-3">
                        {p.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setShowPayoutActionModal(p);
                              setPayoutActionType('APPROVE');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                          >
                            Review & Pay
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold">{p.processed_by || 'Processed'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. REFUNDS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'refunds' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Disputes & Processed Refunds</h3>
                <p className="text-xs text-slate-400">Authorized student refund logs protecting students against misrepresentation</p>
              </div>
              <span className="text-xs text-rose-400 font-bold">{refunds.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Refund Ref</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Hostel</th>
                    <th className="p-3">Amount Refunded</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {refunds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No refund requests logged.
                      </td>
                    </tr>
                  ) : (
                    refunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-rose-400">{r.refund_reference}</td>
                        <td className="p-3 text-white font-bold">{r.studentName}</td>
                        <td className="p-3 text-slate-300">{r.propertyTitle}</td>
                        <td className="p-3 font-black text-rose-400">{formatNaira(r.amount)}</td>
                        <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">{r.reason}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] text-slate-400">{formatDate(r.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. INVOICES TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Official Platform Invoices & Receipts</h3>
                <p className="text-xs text-slate-400">Generated tax-compliant invoices for student fees and landlord services</p>
              </div>
              <span className="text-xs text-emerald-400 font-bold">{invoices.length} invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Billed User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{inv.invoice_number}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{inv.user_name}</p>
                        <p className="text-[10px] text-slate-400">{inv.user_email}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {inv.user_role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{inv.item_description}</td>
                      <td className="p-3 font-black text-white">{formatNaira(inv.total_amount)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">{formatDate(inv.created_at)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. WITHDRAWALS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Platform Owner & Treasury Withdrawals</h3>
                <p className="text-xs text-slate-400">Withdrawals from the platform escrow/clearing account to owner corporate bank accounts</p>
              </div>
              <span className="text-xs text-emerald-400 font-bold">
                Total Withdrawn: {formatNaira(withdrawals.reduce((acc, w) => acc + w.amount, 0))}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Withdrawal Ref</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Destination Account</th>
                    <th className="p-3">Bank</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{w.withdrawal_reference}</td>
                      <td className="p-3 font-black text-white">{formatNaira(w.amount)}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{w.destination_account_name}</p>
                        <p className="text-[10px] text-slate-400">{w.destination_account_number}</p>
                      </td>
                      <td className="p-3 text-slate-300">{w.destination_bank}</td>
                      <td className="p-3 text-slate-400">{w.purpose}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">{formatDate(w.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. FINANCIAL REPORTS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-sm">Fiscal Year 2026 Financial Statement</h3>
                <p className="text-xs text-slate-400">Consolidated multi-stream performance report ready for accounting and audit</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Paid Bookings</th>
                    <th className="p-3">Gross Volume</th>
                    <th className="p-3">Commissions</th>
                    <th className="p-3">Subscriptions</th>
                    <th className="p-3">Featured Listings</th>
                    <th className="p-3">Services</th>
                    <th className="p-3">Total Gross</th>
                    <th className="p-3">Net Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {reportRows.map((r) => (
                    <tr key={r.monthPeriod} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-bold text-white">{r.monthPeriod}</td>
                      <td className="p-3 text-slate-300">{r.paidBookings}</td>
                      <td className="p-3 text-slate-300">{formatNaira(r.grossBookingVolume)}</td>
                      <td className="p-3 text-emerald-400 font-bold">{formatNaira(r.bookingCommission)}</td>
                      <td className="p-3 text-blue-400 font-bold">{formatNaira(r.subscriptionRevenue)}</td>
                      <td className="p-3 text-amber-400 font-bold">{formatNaira(r.featuredRevenue)}</td>
                      <td className="p-3 text-purple-400 font-bold">{formatNaira(r.digitalServiceRevenue)}</td>
                      <td className="p-3 text-white font-black">{formatNaira(r.totalPlatformGross)}</td>
                      <td className="p-3 text-emerald-300 font-black">{formatNaira(r.netPlatformEarnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. REVENUE SETTINGS TAB */}
      {/* ========================================================================= */}
      {!loading && currentTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Platform Revenue & Pricing Configuration</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure commission rates, landlord subscription tiers, featured promotion prices, and payout thresholds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.map((s) => (
                <div key={s.setting_key} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white capitalize">
                      {s.setting_key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{s.description}</p>
                  <input
                    type="text"
                    value={editedSettings[s.setting_key] || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, [s.setting_key]: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={handleSaveSettings}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Revenue Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW INVOICE */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-6 text-white">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  OFFICIAL TAX INVOICE
                </span>
                <h3 className="text-xl font-black mt-1">Hostel Ease Technologies</h3>
                <p className="text-xs text-slate-400">LAUTECH Student Accommodation Network, Ogbomoso</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Number</p>
                <p className="font-mono font-bold text-emerald-400">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Issue Date</p>
                <p className="font-bold text-white">{formatDate(selectedInvoice.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Billed To</p>
                <p className="font-bold text-white">{selectedInvoice.user_name}</p>
                <p className="text-[10px] text-slate-400">{selectedInvoice.user_email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 inline-block mt-0.5">
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">{selectedInvoice.item_description}</span>
                <span className="font-black text-white">{formatNaira(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <span>VAT / Platform Fee (0%)</span>
                <span>₦0</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-emerald-400 pt-2 border-t border-slate-800">
                <span>Total Amount Paid</span>
                <span>{formatNaira(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYOUT ACTION */}
      {/* ========================================================================= */}
      {showPayoutActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-white shadow-2xl">
            <h3 className="text-lg font-bold">Review Landlord Payout</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p><span className="text-slate-400">Landlord:</span> <strong className="text-white">{showPayoutActionModal.providerName}</strong></p>
              <p><span className="text-slate-400">Bank Destination:</span> <strong className="text-white">{showPayoutActionModal.bank_name} ({showPayoutActionModal.account_number})</strong></p>
              <p><span className="text-slate-400">Account Name:</span> <strong className="text-emerald-400">{showPayoutActionModal.account_name}</strong></p>
              <p className="text-base font-black text-white pt-1">Amount: {formatNaira(showPayoutActionModal.amount)}</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-300">Action Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutActionType('APPROVE')}
                  className={`p-2 rounded-xl font-bold border transition-colors ${
                    payoutActionType === 'APPROVE' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  ✓ Approve & Disburse
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutActionType('REJECT')}
                  className={`p-2 rounded-xl font-bold border transition-colors ${
                    payoutActionType === 'REJECT' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  ✕ Reject Request
                </button>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-300">Administrative Notes</label>
              <textarea
                value={payoutActionNotes}
                onChange={(e) => setPayoutActionNotes(e.target.value)}
                placeholder="e.g. Move-in confirmed by student. Disbursed via Access Bank transfer."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPayoutActionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePayoutAction}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD TREASURY WITHDRAWAL */}
      {/* ========================================================================= */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleCreateWithdrawal} className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold">Record Treasury Withdrawal</h3>
              <button type="button" onClick={() => setShowWithdrawalModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Withdrawal Amount (₦)</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={wdrAmount}
                  onChange={(e) => setWdrAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Destination Bank</label>
                <input
                  type="text"
                  required
                  value={wdrBank}
                  onChange={(e) => setWdrBank(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="2031122334"
                  value={wdrAccountNum}
                  onChange={(e) => setWdrAccountNum(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="Hostel Ease Technologies Ltd"
                  value={wdrAccountName}
                  onChange={(e) => setWdrAccountName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Purpose</label>
                <input
                  type="text"
                  value={wdrPurpose}
                  onChange={(e) => setWdrPurpose(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowWithdrawalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {isProcessing ? 'Recording...' : 'Record Withdrawal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
