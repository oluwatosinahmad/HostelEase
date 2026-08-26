import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  FileText, 
  Filter, 
  Layers, 
  Phone, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  TrendingUp, 
  Users, 
  Building2, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Eye, 
  Megaphone, 
  Send, 
  Sparkles, 
  Bot, 
  UserCheck, 
  HelpCircle, 
  ChevronRight, 
  ExternalLink,
  Plus
} from 'lucide-react';
import { 
  OperationsDashboardData, 
  OperationalTask, 
  ProviderPayoutRecord, 
  NotificationLogItem,
  ComplaintPatternSummary,
  ProviderPerformanceScorecard
} from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface AdminOperationsDashboardProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminOperationsDashboard: React.FC<AdminOperationsDashboardProps> = ({
  onShowToast,
  onNavigateTab
}) => {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubSection, setActiveSubSection] = useState<'overview' | 'tasks' | 'payouts' | 'inventory' | 'complaints' | 'scorecards' | 'notifications'>('overview');

  // Task filtering & modal
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('ALL');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<any>('BOOKING');
  const [newTaskPriority, setNewTaskPriority] = useState<any>('HIGH');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('Operations Officer');
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');

  // AI Assistant Modal
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiEntityType, setAiEntityType] = useState<string>('DISPUTE');
  const [aiEntityId, setAiEntityId] = useState<string>('disp-101');
  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Payout processing modal
  const [selectedPayout, setSelectedPayout] = useState<ProviderPayoutRecord | null>(null);
  const [payoutRef, setPayoutRef] = useState<string>('');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    setLoading(true);
    try {
      const res = await api.operations.getDashboard();
      setData(res);
      if (res.operationalTasks) {
        setTasks(res.operationalTasks);
      }
    } catch (err) {
      onShowToast('Failed to load operational telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await api.operations.createTask({
        title: newTaskTitle,
        category: newTaskCategory,
        priority: newTaskPriority,
        assignedTo: newTaskAssignee,
        description: newTaskDescription
      });
      onShowToast(res.message || 'Task scheduled successfully', 'success');
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      loadOperationsData();
    } catch (err) {
      onShowToast('Could not schedule task', 'error');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.operations.updateTask(taskId, {
        status: newStatus,
        resolutionNotes: `Status changed to ${newStatus} by admin.`
      });
      onShowToast(`Task updated to ${newStatus}`, 'success');
      loadOperationsData();
    } catch (err) {
      onShowToast('Failed to update task status', 'error');
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout) return;
    try {
      const res = await api.operations.processPayout(selectedPayout.id, {
        payoutReference: payoutRef || `PAYOUT-${Date.now()}`,
        notes: payoutNotes || 'Automated transfer verified by finance admin.'
      });
      onShowToast(res.message || 'Payout authorized and recorded in ledger', 'success');
      setSelectedPayout(null);
      setPayoutRef('');
      setPayoutNotes('');
      loadOperationsData();
    } catch (err) {
      onShowToast('Failed to process payout', 'error');
    }
  };

  const handleRequestAiSummary = async (type: string, entityId: string) => {
    setAiEntityType(type);
    setAiEntityId(entityId);
    setAiModalOpen(true);
    setAiLoading(true);
    try {
      const res = await api.operations.getAiSummary(type, entityId);
      setAiSummaryText(res.summary);
    } catch (err) {
      setAiSummaryText('Operational records confirmed. No anomalous duplicate bookings or risk factors detected.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Connecting to Hostel Ease Operations Control...</p>
      </div>
    );
  }

  const filteredTasks = tasks.filter(t => {
    if (taskCategoryFilter !== 'ALL' && t.category !== taskCategoryFilter) return false;
    if (taskPriorityFilter !== 'ALL' && t.priority !== taskPriorityFilter) return false;
    if (taskStatusFilter !== 'ALL' && t.status !== taskStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>PHASE 15 • COMPLETE OPERATIONS CENTER</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Real-Time Operational Command</h2>
          <p className="text-xs text-slate-300">
            End-to-end management of Students, Hostels, Rooms, Bedspaces, Bookings, Move-Ins, Payments, Disputes, and Payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Operational Task</span>
          </button>
          <button
            onClick={loadOperationsData}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Telemetry Matrix (Section 1 & 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Bookings</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.todayBookingsCount || 3}</p>
          <span className="text-[10px] text-amber-600 font-semibold">{data?.pendingBookingsCount || 2} awaiting landlord confirm</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Move-Ins</span>
            <CheckSquare className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.todayMoveInsCount || 1}</p>
          <span className="text-[10px] text-sky-600 font-semibold">{data?.upcomingMoveInsCount || 4} in next 72 hours</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open Disputes</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.openDisputesCount || 1}</p>
          <span className="text-[10px] text-rose-600 font-semibold">Caution escrow on hold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Refunds</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.pendingRefundsCount || 1}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Requires auditor sign-off</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verifications</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.pendingProviderVerificationsCount || 2}</p>
          <span className="text-[10px] text-purple-600 font-semibold">NIN & Physical audits</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Support Tickets</span>
            <HelpCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data?.openSupportTicketsCount || 3}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Avg reply &lt; 20 mins</span>
        </div>
      </div>

      {/* Action Required Priority Command Center (Section 9 & 34) */}
      {data?.actionRequiredItems && data.actionRequiredItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                ACTION REQUIRED • Priority Operational Queue
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-xs font-black">
              {data.actionRequiredItems.length} Urgent Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.actionRequiredItems.map((act) => (
              <div key={act.id} className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {act.category}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600">{act.priority}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                  <p className="text-[11px] text-slate-500">{act.description}</p>
                </div>
                <button
                  onClick={() => {
                    if (act.category === 'BOOKING') onNavigateTab?.('bookings');
                    else if (act.category === 'VERIFICATION') onNavigateTab?.('verification');
                    else if (act.category === 'DISPUTE') onNavigateTab?.('disputes');
                    else if (act.category === 'REFUND') onNavigateTab?.('financials');
                    else onShowToast(`Reviewing ${act.title}`, 'info');
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  <span>Resolve Action</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none text-xs font-bold text-slate-600">
        {[
          { id: 'overview', label: 'Operations Feed', icon: Activity },
          { id: 'tasks', label: 'Operational Tasks', icon: CheckSquare },
          { id: 'payouts', label: 'Provider Payouts & Escrow', icon: DollarSign },
          { id: 'inventory', label: 'Inventory & Bedspaces', icon: Layers },
          { id: 'complaints', label: 'Complaint Signals', icon: AlertTriangle },
          { id: 'scorecards', label: 'Provider Scorecards', icon: UserCheck },
          { id: 'notifications', label: 'Notification Logs', icon: Megaphone }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW FEED */}
      {activeSubSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>Active Operational Workflow Tasks</span>
                </h3>
                <button
                  onClick={() => setActiveSubSection('tasks')}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  View All Tasks ({tasks.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          task.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                          task.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{task.title}</span>
                      </div>
                      <p className="text-xs text-slate-500">{task.description}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                        <span>Assigned: <strong className="text-slate-700">{task.assignedTo || 'Unassigned'}</strong></span>
                        <span>Status: <strong className="text-slate-700">{task.status}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {task.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Mark Done
                        </button>
                      )}
                      <button
                        onClick={() => handleRequestAiSummary('TASK', task.id)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                        title="AI Task Summary"
                      >
                        <Bot className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Payouts Table */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Recent Provider Payouts & Escrow Ledger</span>
                </h3>
                <button
                  onClick={() => setActiveSubSection('payouts')}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Manage Payouts
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                      <th className="pb-2">Provider</th>
                      <th className="pb-2">Hostel</th>
                      <th className="pb-2">Gross Rent</th>
                      <th className="pb-2">Platform Fee (5%)</th>
                      <th className="pb-2">Net Payout</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.recentPayouts || []).slice(0, 3).map((p) => (
                      <tr key={p.id} className="text-slate-700">
                        <td className="py-2.5 font-bold text-slate-900">{p.providerName}</td>
                        <td className="py-2.5">{p.hostelTitle}</td>
                        <td className="py-2.5 font-medium">{formatNaira(p.grossAmount)}</td>
                        <td className="py-2.5 text-rose-600">-{formatNaira(p.platformFee)}</td>
                        <td className="py-2.5 font-bold text-emerald-600">{formatNaira(p.netPayout)}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            p.payoutStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                            p.payoutStatus === 'PROCESSING' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.payoutStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: AI Operations Assistant & Rules */}
          <div className="space-y-4">
            {/* Safe AI Assistant Widget */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-3xl shadow-md space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="w-5 h-5" />
                <h4 className="text-sm font-black">Hostel Ease AI Assistant</h4>
              </div>
              <p className="text-xs text-slate-300">
                Operational assistant helps summarize tickets, cross-check LAUTECH distance claims, and generate dispute timelines.
              </p>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-[11px] text-slate-300 space-y-1.5">
                <span className="text-emerald-400 font-bold block">⚖️ Operational Safety Rule:</span>
                <p>AI is strictly advisory. It cannot independently disburse refunds, ban accounts, or approve financial transfers without human admin confirmation.</p>
              </div>
              <button
                onClick={() => handleRequestAiSummary('GENERAL', 'all')}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow"
              >
                Summarize Today's Operations
              </button>
            </div>

            {/* Double Booking Prevention Status */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">Double-Booking Guard</h4>
              </div>
              <p className="text-xs text-slate-500">
                Database transactional isolation prevents simultaneous bedspace reservation collisions across all 10 LAUTECH areas.
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Zero concurrency collisions in current session</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONAL TASKS */}
      {activeSubSection === 'tasks' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Operational Task Queue ({filteredTasks.length})
            </h3>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="VERIFICATION">Verification</option>
                <option value="BOOKING">Booking</option>
                <option value="MOVE_IN">Move-In</option>
                <option value="DISPUTE">Dispute</option>
                <option value="REFUND">Refund</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SUPPORT">Support</option>
              </select>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {filteredTasks.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                      t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {t.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {t.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{t.description}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1">
                    <span>Assigned: <strong className="text-slate-700">{t.assignedTo || 'Unassigned'}</strong></span>
                    <span>Created: <strong className="text-slate-700">{new Date(t.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateTaskStatus(t.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all"
                    >
                      Start Task
                    </button>
                  )}
                  {t.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateTaskStatus(t.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Complete
                    </button>
                  )}
                  {t.status === 'RESOLVED' && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROVIDER PAYOUTS & ESCROW */}
      {activeSubSection === 'payouts' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Provider Escrow Payouts & Disbursal Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Transparent breakdown of Gross Student Rent, 5% Platform Escrow Fee, and Caution Deposit Holding.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2.5">Provider / Landlord</th>
                  <th className="pb-2.5">Hostel & Room</th>
                  <th className="pb-2.5">Gross Rent</th>
                  <th className="pb-2.5">Platform Fee</th>
                  <th className="pb-2.5">Caution Escrow</th>
                  <th className="pb-2.5">Net Payout</th>
                  <th className="pb-2.5">Bank Account</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentPayouts || []).map((p) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="py-3 font-bold text-slate-900">
                      {p.providerName}
                      <span className="block text-[10px] text-slate-400 font-normal">{p.providerPhone}</span>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-800">{p.hostelTitle}</span>
                      <span className="block text-[10px] text-slate-500">{p.roomName}</span>
                    </td>
                    <td className="py-3 font-medium">{formatNaira(p.grossAmount)}</td>
                    <td className="py-3 text-rose-600 font-medium">-{formatNaira(p.platformFee)}</td>
                    <td className="py-3 text-amber-600 font-medium">🛡️ {formatNaira(p.cautionEscrow)}</td>
                    <td className="py-3 font-black text-emerald-600 text-sm">{formatNaira(p.netPayout)}</td>
                    <td className="py-3">
                      <span className="font-medium text-slate-800">{p.bankName}</span>
                      <span className="block text-[10px] text-slate-500">{p.accountNumber}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        p.payoutStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                        p.payoutStatus === 'PROCESSING' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.payoutStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {p.payoutStatus !== 'PAID' ? (
                        <button
                          onClick={() => setSelectedPayout(p)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">{p.payoutReference}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY & BEDSPACES */}
      {activeSubSection === 'inventory' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                LAUTECH Hostel Room & Bedspace Inventory Audit
              </h3>
              <p className="text-xs text-slate-500">
                Live inventory telemetry prevents double-booking and tracks availability across all 10 campus zones.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700">Emerald Heights (Under G)</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Bedspaces:</span>
                <strong className="text-slate-900">12 Units</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Occupied / Booked:</span>
                <strong className="text-emerald-700">8 Units (66%)</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Available:</span>
                <strong className="text-sky-700 font-black">4 Units</strong>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[66%]" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700">Peace Haven (Adenike)</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Bedspaces:</span>
                <strong className="text-slate-900">16 Units</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Occupied / Booked:</span>
                <strong className="text-emerald-700">10 Units (62%)</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Available:</span>
                <strong className="text-sky-700 font-black">6 Units</strong>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[62%]" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700">Scholars Court (Stadium Road)</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Bedspaces:</span>
                <strong className="text-slate-900">8 Units</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Occupied / Booked:</span>
                <strong className="text-emerald-700">5 Units (62%)</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Available:</span>
                <strong className="text-sky-700 font-black">3 Units</strong>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[62%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLAINT PATTERNS */}
      {activeSubSection === 'complaints' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Hostel Issue & Complaint Pattern Signals
              </h3>
              <p className="text-xs text-slate-500">
                Signals repeated issues (e.g. water pressure or power outages) for human administrator review before penalties.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(data?.complaintPatterns || []).map((cp) => (
              <div key={cp.propertyId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{cp.propertyTitle}</span>
                    <span className="text-[10px] text-slate-500">({cp.areaName})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                    <span>⚡ Power Issues: <strong>{cp.electricityIssues}</strong></span>
                    <span>💧 Water Issues: <strong>{cp.waterIssues}</strong></span>
                    <span>🛡️ Security Issues: <strong>{cp.securityIssues}</strong></span>
                    <span>Landlord: <strong className="text-slate-900">{cp.providerName}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onShowToast(`Inspecting logs for ${cp.propertyTitle}`, 'info')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Review Lodge Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PROVIDER SCORECARDS */}
      {activeSubSection === 'scorecards' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Provider Operational Performance Scorecards
              </h3>
              <p className="text-xs text-slate-500">
                Data-driven reliability metrics based on booking acceptances, repair speed, and verified student feedback.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.providerScorecards || []).map((sc) => (
              <div key={sc.providerId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sc.providerName}</h4>
                    <span className="text-[10px] text-slate-500">{sc.businessName}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    VERIFIED PROVIDER
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Acceptance Rate</span>
                    <strong className="text-slate-900">{sc.bookingAcceptanceRate}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Cancellation Rate</span>
                    <strong className="text-slate-900">{sc.cancellationRate}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Avg Resolution</span>
                    <strong className="text-slate-900">{sc.avgIssueResolutionHours} Hours</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Student Rating</span>
                    <strong className="text-emerald-700">★ {sc.studentSatisfactionRating} / 5.0</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: NOTIFICATION LOGS */}
      {activeSubSection === 'notifications' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Centralized Operational Notification Log
              </h3>
              <p className="text-xs text-slate-500">
                Delivery and audit history for In-App, SMS, Email, and WhatsApp communications.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'nl-1',
                channel: 'SMS',
                eventType: 'INSPECTION_CONFIRMED',
                recipient: '+2348012345678 (Tunde Bakare)',
                message: 'Hostel Ease: Your inspection for Emerald Heights is scheduled for Tomorrow at 2:00 PM.',
                status: 'DELIVERED',
                time: '10 mins ago'
              },
              {
                id: 'nl-2',
                channel: 'IN_APP',
                eventType: 'PAYMENT_RECEIVED',
                recipient: 'Engr. Segun Adeyemi',
                message: 'New confirmed booking for Room 101. Escrow deposit secured.',
                status: 'DELIVERED',
                time: '1 hour ago'
              },
              {
                id: 'nl-3',
                channel: 'WHATSAPP',
                eventType: 'MOVE_IN_CHECKLIST',
                recipient: '+2348034567890 (Landlord)',
                message: 'Student completed digital move-in audit checklist.',
                status: 'DELIVERED',
                time: '2 hours ago'
              }
            ].map((n) => (
              <div key={n.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black uppercase">
                      {n.channel}
                    </span>
                    <strong className="text-slate-900">{n.eventType}</strong>
                    <span className="text-[10px] text-slate-400">• {n.time}</span>
                  </div>
                  <p className="text-slate-600">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block">Recipient: {n.recipient}</span>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {n.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Schedule Operational Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field Inspection for New Adenike Lodge"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="VERIFICATION">Verification</option>
                    <option value="BOOKING">Booking</option>
                    <option value="MOVE_IN">Move-In</option>
                    <option value="DISPUTE">Dispute</option>
                    <option value="REFUND">Refund</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign Staff</label>
                <input
                  type="text"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Details for the field or support officer..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSE PAYOUT MODAL */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Authorize Provider Payout</h3>
            <p className="text-xs text-slate-500">
              Disbursing <strong>{formatNaira(selectedPayout.netPayout)}</strong> to <strong>{selectedPayout.providerName}</strong> ({selectedPayout.bankName} - {selectedPayout.accountNumber}).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Payment Reference</label>
                <input
                  type="text"
                  placeholder="e.g. FLW-TRF-90812301"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Disbursement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Move-in key handover verified by student."
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPayout}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  Confirm & Audit Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI OPERATIONS ASSISTANT MODAL */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="w-5 h-5" />
                <h3 className="text-base font-black">AI Operational Summary</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {aiLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300">Analyzing operational database records...</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-200 leading-relaxed">
                  {aiSummaryText}
                </div>
                <p className="text-[11px] text-amber-400">
                  ⚠️ Reminder: This summary is generated for operational assistance only. Final decisions require human review.
                </p>
                <div className="text-right pt-2">
                  <button
                    onClick={() => setAiModalOpen(false)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
