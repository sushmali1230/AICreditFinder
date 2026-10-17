import React, { useState, useEffect } from 'react';
import { Sliders, Shield, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { LendingPolicyConfig } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const PolicyConfigView: React.FC = () => {
  const { activeRole } = useAuth();
  const [policies, setPolicies] = useState<LendingPolicyConfig[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<LendingPolicyConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [maxFoirSalaried, setMaxFoirSalaried] = useState(50);
  const [maxFoirSelfEmployed, setMaxFoirSelfEmployed] = useState(55);
  const [minCreditScore, setMinCreditScore] = useState(650);
  const [minAverageMonthlyBalance, setMinAverageMonthlyBalance] = useState(10000);
  const [baseInterestRate, setBaseInterestRate] = useState(10.5);
  const [haircutUnverifiedIncome, setHaircutUnverifiedIncome] = useState(20);
  const [maxAllowedBouncesLast6Months, setMaxAllowedBouncesLast6Months] = useState(1);

  const fetchPolicies = async () => {
    try {
      const data = await api.policies.list();
      setPolicies(data.policies);
      if (data.policies.length > 0) {
        const pol = data.policies[0];
        setSelectedPolicy(pol);
        setMaxFoirSalaried(pol.maxFoirSalaried);
        setMaxFoirSelfEmployed(pol.maxFoirSelfEmployed);
        setMinCreditScore(pol.minCreditScore);
        setMinAverageMonthlyBalance(pol.minAverageMonthlyBalance);
        setBaseInterestRate(pol.baseInterestRate);
        setHaircutUnverifiedIncome(pol.haircutUnverifiedIncome);
        setMaxAllowedBouncesLast6Months(pol.maxAllowedBouncesLast6Months);
      }
    } catch (err: any) {
      console.error('Failed to load policies:', err);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;

    if (activeRole !== 'ADMIN') {
      setErrorMsg('Access Restricted: Only Risk Operations Administrators can alter institutional lending policies.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await api.policies.update(selectedPolicy.id, {
        maxFoirSalaried: Number(maxFoirSalaried),
        maxFoirSelfEmployed: Number(maxFoirSelfEmployed),
        minCreditScore: Number(minCreditScore),
        minAverageMonthlyBalance: Number(minAverageMonthlyBalance),
        baseInterestRate: Number(baseInterestRate),
        haircutUnverifiedIncome: Number(haircutUnverifiedIncome),
        maxAllowedBouncesLast6Months: Number(maxAllowedBouncesLast6Months),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchPolicies();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Institutional Lending Policy Configuration</h2>
            <p className="text-xs text-slate-400">
              Prudential underwriting rules, FOIR ceilings, CIBIL benchmark thresholds, and risk haircuts
            </p>
          </div>
        </div>

        {activeRole !== 'ADMIN' && (
          <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> You are currently logged in as {activeRole}. Only users with the <strong>Admin</strong> role can modify bank credit policies. Use the role switcher in the top bar to switch to Admin.
            </span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Salaried FOIR */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Max Permissible FOIR (Salaried)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Maximum fixed debt obligations percentage allowed for prime salaried borrowers.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={maxFoirSalaried}
                  onChange={(e) => setMaxFoirSalaried(Number(e.target.value))}
                  disabled={activeRole !== 'ADMIN'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Self Employed FOIR */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Max Permissible FOIR (Self-Employed)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Maximum debt servicing ceiling for business owners and self-employed professionals.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={maxFoirSelfEmployed}
                  onChange={(e) => setMaxFoirSelfEmployed(Number(e.target.value))}
                  disabled={activeRole !== 'ADMIN'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Minimum CIBIL Score */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Minimum Bureau Score (CIBIL Benchmark)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Applications with credit scores below this threshold require committee escalation.
              </p>
              <input
                type="number"
                value={minCreditScore}
                onChange={(e) => setMinCreditScore(Number(e.target.value))}
                disabled={activeRole !== 'ADMIN'}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            {/* Minimum Average Balance */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Minimum Average Monthly Balance (AMB)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Threshold for assessing borrower banking liquidity buffer.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  value={minAverageMonthlyBalance}
                  onChange={(e) => setMinAverageMonthlyBalance(Number(e.target.value))}
                  disabled={activeRole !== 'ADMIN'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Base Interest Rate */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Base Benchmark Interest Rate
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Default annual rate for Prime Risk Grade A retail applicants.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={baseInterestRate}
                  onChange={(e) => setBaseInterestRate(Number(e.target.value))}
                  disabled={activeRole !== 'ADMIN'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
                />
                <span className="text-slate-400 font-bold">% p.a.</span>
              </div>
            </div>

            {/* Max Allowed Bounces */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800">
              <label className="text-slate-200 font-bold block mb-1">
                Max Allowed Inward Clearing Returns (6 Months)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Threshold for cheque/NACH returns before categorizing as High Risk.
              </p>
              <input
                type="number"
                value={maxAllowedBouncesLast6Months}
                onChange={(e) => setMaxAllowedBouncesLast6Months(Number(e.target.value))}
                disabled={activeRole !== 'ADMIN'}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-950/50 border border-rose-500/30 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Lending policy updated successfully. Live re-assessments will utilize these parameters.</span>
            </div>
          )}

          {activeRole === 'ADMIN' && (
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Lending Policy'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
