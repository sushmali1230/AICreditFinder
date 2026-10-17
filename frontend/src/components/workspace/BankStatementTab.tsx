import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  Building,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { BankStatement, BankTransaction } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';

interface BankStatementTabProps {
  customerId: string;
  statements: BankStatement[];
  onRefreshCustomer: () => void;
}

export const BankStatementTab: React.FC<BankStatementTabProps> = ({
  customerId,
  statements,
  onRefreshCustomer,
}) => {
  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number>(0);
  const [txSearch, setTxSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const statement = statements[selectedStatementIndex] || null;
  const transactions: BankTransaction[] = statement?.transactions || [];

  // Filter transactions
  const filteredTxns = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.referenceNo && t.referenceNo.toLowerCase().includes(txSearch.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'BOUNCES' ? t.isBounced : t.category === categoryFilter);

    return matchesSearch && matchesCategory;
  });

  // Calculate monthly cashflow for Recharts
  const monthlyData: { [key: string]: { month: string; credits: number; debits: number; balance: number } } = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    if (!monthlyData[key]) {
      monthlyData[key] = { month: monthLabel, credits: 0, debits: 0, balance: t.balanceAfter || 0 };
    }

    if (t.type === 'CREDIT') monthlyData[key].credits += t.amount;
    else monthlyData[key].debits += t.amount;
    if (t.balanceAfter !== undefined && t.balanceAfter !== null) {
      monthlyData[key].balance = t.balanceAfter;
    }
  }

  const chartData = Object.keys(monthlyData)
    .sort()
    .map((k) => monthlyData[k]);

  // Detected EMIs
  const emiDebits = transactions.filter((t) => t.category === 'EMI_OUTFLOW');
  const emiGroups: { [key: string]: { narration: string; amount: number; count: number } } = {};
  for (const e of emiDebits) {
    const rounded = Math.round(e.amount / 100) * 100;
    if (!emiGroups[rounded]) {
      emiGroups[rounded] = { narration: e.description, amount: e.amount, count: 1 };
    } else {
      emiGroups[rounded].count += 1;
    }
  }
  const detectedEmis = Object.values(emiGroups);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankName', file.name.includes('HDFC') ? 'HDFC Bank' : file.name.includes('ICICI') ? 'ICICI Bank' : 'Commercial Bank');
      formData.append('accountType', 'SAVINGS');

      await api.statements.upload(customerId, formData);
      e.target.value = '';
      onRefreshCustomer();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload statement');
    } finally {
      setIsUploading(false);
    }
  };

  const generateSampleCsv = () => {
    return `Date,Narration,Chq/Ref No,Withdrawal,Deposit,Balance
01/05/2024,SALARY CR INFOSYS TECH,SAL8811,,185000,245000
05/05/2024,HDFC BANK HOME LOAN EMI,EMI9912,28500,,216500
10/05/2024,UPI SWIGGY FOOD ORDER,UPI4810,1250,,215250
15/05/2024,ELECTRICITY BILL BESCOM,ELEC991,3400,,211850
25/05/2024,ATM CASH WDL WHITEFIELD,ATM102,10000,,201850
01/06/2024,SALARY CR INFOSYS TECH,SAL8812,,185000,386850
05/06/2024,HDFC BANK HOME LOAN EMI,EMI9913,28500,,358350
12/06/2024,MUTUAL FUND SIP GROWW,SIP3301,15000,,343350
18/06/2024,GROCERY DMART RETAIL,POS9912,8200,,335150
01/07/2024,SALARY CR INFOSYS TECH,SAL8813,,185000,520150
05/07/2024,HDFC BANK HOME LOAN EMI,EMI9914,28500,,491650
15/07/2024,MAHAVITARAN ELECTRICITY,ELEC992,3600,,488050
01/08/2024,SALARY CR INFOSYS TECH,SAL8814,,185000,673050
05/08/2024,HDFC BANK HOME LOAN EMI,EMI9915,28500,,644550
12/08/2024,MUTUAL FUND SIP GROWW,SIP3302,15000,,629550
01/09/2024,SALARY CR INFOSYS TECH,SAL8815,,185000,814550
05/09/2024,HDFC BANK HOME LOAN EMI,EMI9916,28500,,786050
22/09/2024,AIRTEL BROADBAND BILL,TEL401,1499,,784551
01/10/2024,SALARY CR INFOSYS TECH,SAL8816,,185000,969551
05/10/2024,HDFC BANK HOME LOAN EMI,EMI9917,28500,,941051
`;
  };

  const handleLoadSampleStatement = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);
      const csvData = generateSampleCsv();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'hdfc_statement_6months.csv');
      formData.append('bankName', 'HDFC Bank');
      formData.append('accountType', 'SAVINGS');

      await api.statements.upload(customerId, formData);
      onRefreshCustomer();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to auto-ingest sample statement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvData = generateSampleCsv();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_statement_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!statement) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-500 mb-3" />
        <h3 className="text-lg font-bold text-white">No Bank Statement Uploaded</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Upload bank transaction statements in CSV, Excel (.xlsx/.xls), or PDF formats to analyze monthly cash flow, payroll deposits, EMIs, and bounces.
        </p>

        {uploadError && (
          <div className="mt-4 max-w-md mx-auto rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300 text-left">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>Statement Processing Notice</span>
            </div>
            <p>{uploadError}</p>
          </div>
        )}

        <div className="mt-5 max-w-sm mx-auto space-y-2.5">
          <label className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg cursor-pointer transition-all">
            <Upload className="h-4 w-4" />
            <span>{isUploading ? 'Ingesting Statement...' : 'Upload Statement (CSV/XLSX/PDF)'}</span>
            <input type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleLoadSampleStatement}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Load Sample 6-Month Statement</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 pt-1"
          >
            <Download className="h-3 w-3" />
            <span>Download Sample Banking CSV Template</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statement Header Card */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-white">
                  {statement.bankName}
                </h3>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300 border border-slate-700">
                  {statement.accountNumberMasked}
                </span>
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  {statement.accountType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statement Span: {formatDate(statement.statementPeriodStart)} – {formatDate(statement.statementPeriodEnd)} • {statement.fileFormat} Format
              </p>
            </div>
          </div>

          {/* Upload new statement button */}
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition-all">
              <Upload className="h-3.5 w-3.5 text-blue-400" />
              <span>{isUploading ? 'Ingesting...' : 'Upload New Statement'}</span>
              <input type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 rounded-xl bg-rose-950/50 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {uploadError}
          </div>
        )}
      </div>

      {/* Banking Conduct & Cash Flow Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Total Inflows */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Inflows</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-400">
            {formatINR(statement.totalCredits)}
          </div>
          <span className="text-[10px] text-slate-400">Credits across period</span>
        </div>

        {/* Total Outflows */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Outflows</span>
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-rose-400">
            {formatINR(statement.totalDebits)}
          </div>
          <span className="text-[10px] text-slate-400">Total debits & expenses</span>
        </div>

        {/* Average Balance */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Average Monthly Balance</span>
          <div className="mt-2 text-lg font-bold text-white">
            {formatINR(statement.averageMonthlyBalance)}
          </div>
          <span className="text-[10px] text-slate-400">Min threshold: ₹10,000</span>
        </div>

        {/* Identified EMIs */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Identified Active EMIs</span>
          <div className="mt-2 text-lg font-bold text-amber-400">
            {formatINR(statement.recurringEmiDetected)}
          </div>
          <span className="text-[10px] text-slate-400">{detectedEmis.length} facility obligations</span>
        </div>

        {/* Inward Return Bounces */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Clearing Bounces / Ret</span>
          <div
            className={`mt-2 text-lg font-bold ${
              statement.bounceCount === 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {statement.bounceCount} Dishonor(s)
          </div>
          <span className="text-[10px] text-slate-400">
            {statement.bounceCount === 0 ? 'Clean clearing record' : 'NACH/Cheque failures'}
          </span>
        </div>
      </div>

      {/* CHARTS: MONTHLY CASH FLOW & BALANCE TRENDLINE */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Inflows vs Outflows Bar Chart */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h4 className="text-sm font-bold text-white mb-1">
              Monthly Inflow vs Outflow Velocity
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Green denotes verified deposits; Red denotes operational debits & living expenses
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(value: any) => [formatINR(Number(value)), '']}
                  />
                  <Bar dataKey="credits" fill="#10b981" name="Credits (Inflow)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debits" fill="#ef4444" name="Debits (Outflow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Closing Balance Trendline */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h4 className="text-sm font-bold text-white mb-1">
              Month-End Liquidity & Closing Balance
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Evaluates cash balance buffer against end-of-month EMI debits
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(value: any) => [formatINR(Number(value)), 'Closing Balance']}
                  />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* IDENTIFIED RECURRING EMIs LIST */}
      {detectedEmis.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-amber-400" />
            <span>Identified Existing Debt Obligations ({detectedEmis.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {detectedEmis.map((emi, idx) => (
              <div key={idx} className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-semibold truncate">
                  <span className="truncate">{emi.narration}</span>
                  <span className="text-amber-400 shrink-0 ml-2">{formatINR(emi.amount)}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Detected {emi.count} consecutive monthly debit installments
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTERABLE TRANSACTIONS AUDIT TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search narration, UPI, or ref..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Categories ({transactions.length})</option>
              <option value="SALARY">Salary Inflows</option>
              <option value="BUSINESS_CREDIT">Business Receipts</option>
              <option value="EMI_OUTFLOW">EMI Outflows</option>
              <option value="BOUNCES">Bounced Returns Only</option>
              <option value="UTILITIES_RENT">Rent / Utilities</option>
              <option value="CASH_WITHDRAWAL">Cash Withdrawals</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase tracking-wider font-semibold border-b border-slate-800 z-10">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Narration / Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTxns.map((t, idx) => (
                  <tr
                    key={t.id || idx}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      t.isBounced ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs truncate text-slate-200 font-medium">
                      <span>{t.description}</span>
                      {t.isBounced && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.5 text-[10px] font-bold border border-rose-500/30">
                          BOUNCE / RET
                        </span>
                      )}
                      {t.isUnusual && !t.isBounced && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold border border-amber-500/30">
                          HIGH VALUE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        {t.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-rose-400 whitespace-nowrap">
                      {t.type === 'DEBIT' ? formatINR(t.amount) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-400 whitespace-nowrap">
                      {t.type === 'CREDIT' ? formatINR(t.amount) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">
                      {t.balanceAfter !== undefined && t.balanceAfter !== null
                        ? formatINR(t.balanceAfter)
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
