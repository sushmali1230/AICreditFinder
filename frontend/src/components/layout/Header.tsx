import React from 'react';
import {
  Building2,
  Shield,
  FileText,
  Sliders,
  History,
  UserCheck,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'workspace' | 'policies' | 'audit';
  setActiveTab: (tab: 'dashboard' | 'workspace' | 'policies' | 'audit') => void;
  onOpenNewCustomer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewCustomer,
}) => {
  const { currentUser, activeRole, loginAsPredefined } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold tracking-tight text-white">
                Apex Commercial Bank
              </span>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                Credit Risk OS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Commercial & Retail Lending Underwriting Suite
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Applications
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'workspace'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Credit Workspace
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'policies'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Lending Policies
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Audit Trail
          </button>
        </nav>

        {/* Action Buttons & User Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewCustomer}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all shadow-indigo-600/30"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Application</span>
          </button>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Role:</span>
            </div>

            <select
              value={activeRole}
              onChange={(e) => loginAsPredefined(e.target.value as UserRole)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:ring-0 border-0 py-0.5"
            >
              <option value="ANALYST" className="bg-slate-900 text-slate-200">
                Analyst (Vikram M.)
              </option>
              <option value="APPROVER" className="bg-slate-900 text-slate-200">
                Approver (Ananya D.)
              </option>
              <option value="ADMIN" className="bg-slate-900 text-slate-200">
                Admin (Suresh N.)
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
