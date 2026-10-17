import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { CustomerWorkspace } from './components/workspace/CustomerWorkspace';
import { PolicyConfigView } from './components/policies/PolicyConfigView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { NewCustomerModal } from './components/dialogs/NewCustomerModal';
import { DecisionModal } from './components/dialogs/DecisionModal';
import { Customer } from './types';
import { api } from './services/api';

function MainAppContent() {
  const { activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workspace' | 'policies' | 'audit'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dialogs
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT';
  }>({
    isOpen: false,
    action: 'APPROVE',
  });

  const fetchCustomers = async (maintainSelectedId?: string) => {
    try {
      setIsLoading(true);
      const data = await api.customers.list();
      setCustomers(data.customers);
      if (data.customers.length > 0) {
        if (maintainSelectedId && data.customers.some((c) => c.id === maintainSelectedId)) {
          setSelectedCustomerId(maintainSelectedId);
        } else if (!selectedCustomerId || !data.customers.some((c) => c.id === selectedCustomerId)) {
          setSelectedCustomerId(data.customers[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('workspace');
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    fetchCustomers(newCustomer.id);
    setSelectedCustomerId(newCustomer.id);
    setActiveTab('workspace');
  };

  const handleOpenDecisionModal = (action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT') => {
    setDecisionModal({ isOpen: true, action });
  };

  const handleRefreshWorkspace = async () => {
    if (selectedCustomerId) {
      try {
        const { customer } = await api.customers.getById(selectedCustomerId);
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
      } catch (_) {
        fetchCustomers(selectedCustomerId);
      }
    } else {
      fetchCustomers();
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCustomer={() => setIsNewCustomerModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8">
        {activeTab === 'dashboard' && (
          <OverviewDashboard
            customers={customers}
            onSelectCustomer={handleSelectCustomer}
            onOpenNewCustomer={() => setIsNewCustomerModalOpen(true)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'workspace' && selectedCustomer && (
          <CustomerWorkspace
            customers={customers}
            selectedCustomerId={selectedCustomer.id}
            onSelectCustomer={(id) => setSelectedCustomerId(id)}
            onRefreshCustomer={handleRefreshWorkspace}
            onOpenDecisionModal={handleOpenDecisionModal}
          />
        )}

        {activeTab === 'policies' && <PolicyConfigView />}

        {activeTab === 'audit' && <AuditTrailView />}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Apex Commercial Bank • Risk & Credit Underwriting Operating System</span>
          <span>Prudential Deterministic Amortization Mathematics • RBI Compliant Human Sign-off</span>
        </div>
      </footer>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      {selectedCustomer && (
        <DecisionModal
          isOpen={decisionModal.isOpen}
          action={decisionModal.action}
          customer={selectedCustomer}
          assessment={selectedCustomer.creditAssessments?.[0] || null}
          onClose={() => setDecisionModal({ ...decisionModal, isOpen: false })}
          onDecisionComplete={() => fetchCustomers(selectedCustomerId)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
