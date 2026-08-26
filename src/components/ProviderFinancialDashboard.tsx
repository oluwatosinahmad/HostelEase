import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  Save, 
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ProviderFinancialsData } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDate } from '../utils/formatters';

interface ProviderFinancialDashboardProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ProviderFinancialDashboard: React.FC<ProviderFinancialDashboardProps> = ({
  onShowToast
}) => {
  const [data, setData] = useState<ProviderFinancialsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bank payout form state
  const [bankCode, setBankCode] = useState<string>('058'); // GTBank default
  const [bankName, setBankName] = useState<string>('Guaranty Trust Bank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [savingAccount, setSavingAccount] = useState<boolean>(false);

  const fetchFinancials = () => {
    setLoading(true);
    api.payments.getProviderFinancials()
      .then(res => {
        setData(res);
        if (res.payoutAccount) {
          setBankName(res.payoutAccount.bankName);
          setBankCode(res.payoutAccount.bankCode);
          setAccountName(res.payoutAccount.accountName);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load provider financials:', err);
        setError(err.message || 'Could not fetch financials');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const handleSavePayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || accountNumber.length < 10) {
      onShowToast('Please enter a valid 10-digit Nigerian NUBAN account number', 'error');
      return;
    }
    if (!accountName.trim()) {
      onShowToast('Please enter the account name registered with the bank', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      await api.payments.savePayoutAccount({
        bankCode,
        bankName,
        accountNumber,
        accountName
      });
      onShowToast('Settlement bank account saved and verified successfully! 🏦', 'success');
      fetchFinancials();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save payout account', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const NIGERIAN_BANKS = [
    { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
    { code: '044', name: 'Access Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '033', name: 'United Bank for Africa (UBA)' },
    { code: '057', name: 'Zenith Bank' },
    { code: '214', name: 'First City Monument Bank (FCMB)' },
    { code: '035', name: 'Wema Bank / ALAT' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '090267', name: 'Kuda Microfinance Bank' },
    { code: '100004', name: 'OPay' },
    { code: '100033', name: 'PalmPay' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Received Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {loading ? '...' : formatNaira(data?.metrics.totalRevenue || 0)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{data?.metrics.paidBookingsCount || 0} Paid Tenant Reservations</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {loading ? '...' : formatNaira(data?.metrics.pendingRevenue || 0)}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">
            {data?.metrics.pendingPaymentsCount || 0} Pending Confirmed Holds
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {loading ? '...' : data?.metrics.totalTransactionsCount || 0}
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">
            Real-time Immutable Ledger
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Revenue by Hostel & Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Revenue by Property */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Revenue by Hostel Property</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">LAUTECH Portfolio</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading properties...</div>
            ) : !data?.propertyRevenue || data.propertyRevenue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No properties recorded.</div>
            ) : (
              <div className="space-y-3">
                {data.propertyRevenue.map(prop => (
                  <div 
                    key={prop.propertyId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{prop.propertyTitle}</h4>
                      <p className="text-[11px] text-slate-500">{prop.areaName} • {prop.paidCount} Paid Bookings</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-emerald-700">{formatNaira(prop.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments Stream */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Recent Tenant Payments</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Live Feed</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading transactions...</div>
            ) : !data?.recentTransactions || data.recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No tenant payments yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentTransactions.map(tx => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{tx.studentName}</p>
                      <p className="text-[11px] text-slate-500">
                        {tx.propertyTitle} ({tx.roomName}) • Ref: <span className="font-mono">{tx.paymentReference}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatNaira(tx.amount)}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Col: Payout Bank Account Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Settlement Bank Account</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bank account for automated accommodation payouts.
              </p>
            </div>

            <form onSubmit={handleSavePayoutAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Bank</label>
                <select
                  value={bankCode}
                  onChange={e => {
                    const sel = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                    setBankCode(e.target.value);
                    if (sel) setBankName(sel.name);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {NIGERIAN_BANKS.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Number (10 Digits)</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm tracking-wider"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. ADEYEMI TUNDE SAMUEL"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-semibold"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {savingAccount ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying with NUBAN...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Settlement Account</span>
                    </>
                  )}
                </button>
              </div>

              {data?.payoutAccount && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Active Settlement Destination</p>
                    <p>{data.payoutAccount.bankName}</p>
                    <p className="font-mono">{data.payoutAccount.accountNumberMasked} • {data.payoutAccount.accountName}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
