import React from 'react';
import {
  Building2,
  Shield,
  FileText,
  Sliders,
  History,
  PlusCircle,
  ChevronDown,
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
  const { activeRole, loginAsPredefined } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 lg:px-8">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 shadow-md shadow-indigo-600/25 border border-indigo-400/20">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading text-sm sm:text-base font-bold tracking-tight text-white lg:text-lg">
                  <span className="sm:hidden">Apex Bank</span>
                  <span className="hidden sm:inline">Apex Commercial Bank</span>
                </span>
                <span className="rounded-md bg-blue-500/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  Credit OS
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 leading-tight mt-0.5">
                Commercial & Retail Lending Underwriting Suite
              </p>
            </div>
          </div>

          {/* Center: Main Navigation Tabs (Desktop only) */}
          <div className="hidden lg:flex flex-1 justify-center px-6">
            <nav className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1.5 border border-slate-800/80 shadow-inner">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Applications</span>
              </button>

              <button
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'workspace'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Credit Workspace</span>
              </button>

              <button
                onClick={() => setActiveTab('policies')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'policies'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Lending Policies</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Audit Trail</span>
              </button>
            </nav>
          </div>

          {/* Right: Actions & User Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={onOpenNewCustomer}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 transition-all active:scale-[0.98]"
            >
              <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New Application</span>
              </span>
            </button>

            {/* Vertical Divider */}
            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Role Switcher Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-xl bg-slate-900/90 border border-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>

              <span className="hidden sm:inline text-[11px] font-medium text-slate-400 shrink-0">
                Role:
              </span>

              <div className="relative flex items-center">
                <select
                  value={activeRole}
                  onChange={(e) => loginAsPredefined(e.target.value as UserRole)}
                  className="appearance-none bg-transparent text-xs font-bold text-slate-200 pr-4 sm:pr-5 outline-none cursor-pointer focus:ring-0 border-0"
                >
                  <option value="ANALYST" className="bg-slate-900 text-slate-200">
                    Analyst
                  </option>
                  <option value="APPROVER" className="bg-slate-900 text-slate-200">
                    Approver
                  </option>
                  <option value="ADMIN" className="bg-slate-900 text-slate-200">
                    Admin
                  </option>
                </select>
                <ChevronDown className="absolute right-0 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet screens < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-blue-400 bg-blue-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span className="text-[10px] tracking-tight">Apps</span>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'workspace'
              ? 'text-blue-400 bg-blue-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="text-[10px] tracking-tight">Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'policies'
              ? 'text-blue-400 bg-blue-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span className="text-[10px] tracking-tight">Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'audit'
              ? 'text-blue-400 bg-blue-500/10 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span className="text-[10px] tracking-tight">Audit</span>
        </button>
      </nav>
    </>
  );
};
