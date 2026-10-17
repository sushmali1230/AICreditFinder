import {
  Customer,
  BankStatement,
  ItrRecord,
  CreditAssessment,
  LendingPolicyConfig,
  AuditLog,
  User,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('apex_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API Error (${response.status}): ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch (_) {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Authentication
  auth: {
    login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
      const data = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('apex_auth_token', data.token);
      return data;
    },
    getMe: async (): Promise<{ user: User }> => {
      return request<{ user: User }>('/auth/me');
    },
    logout: () => {
      localStorage.removeItem('apex_auth_token');
    },
  },

  // Customers
  customers: {
    list: async (params?: { search?: string; employmentType?: string; riskCategory?: string }): Promise<{ customers: Customer[] }> => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.employmentType) query.append('employmentType', params.employmentType);
      if (params?.riskCategory) query.append('riskCategory', params.riskCategory);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return request<{ customers: Customer[] }>(`/customers${qs}`);
    },
    getById: async (id: string): Promise<{ customer: Customer }> => {
      return request<{ customer: Customer }>(`/customers/${id}`);
    },
    create: async (data: Partial<Customer>): Promise<{ customer: Customer }> => {
      return request<{ customer: Customer }>('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Customer>): Promise<{ customer: Customer }> => {
      return request<{ customer: Customer }>(`/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  },

  // Bank Statements
  statements: {
    upload: async (customerId: string, formData: FormData): Promise<{ statement: BankStatement; analysisSummary: any }> => {
      return request<{ statement: BankStatement; analysisSummary: any }>(`/customers/${customerId}/statements/upload`, {
        method: 'POST',
        headers: getAuthHeader(), // Note: do NOT set Content-Type for FormData, browser sets boundary
        body: formData,
      });
    },
    getById: async (id: string): Promise<{ statement: BankStatement }> => {
      return request<{ statement: BankStatement }>(`/statements/${id}`);
    },
  },

  // ITR Records
  itr: {
    uploadFile: async (customerId: string, formData: FormData): Promise<{ itr: ItrRecord }> => {
      return request<{ itr: ItrRecord }>(`/customers/${customerId}/itr/upload`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });
    },
    uploadData: async (customerId: string, data: Partial<ItrRecord>): Promise<{ itr: ItrRecord }> => {
      return request<{ itr: ItrRecord }>(`/customers/${customerId}/itr/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    listByCustomer: async (customerId: string): Promise<{ itrs: ItrRecord[] }> => {
      return request<{ itrs: ItrRecord[] }>(`/customers/${customerId}/itr`);
    },
  },

  // Assessments & Underwriting
  assessments: {
    run: async (
      customerId: string,
      payload?: {
        customInterestRate?: number;
        customTenureMonths?: number;
        customRequestedAmount?: number;
        analystNotes?: string;
      }
    ): Promise<{ assessment: CreditAssessment }> => {
      return request<{ assessment: CreditAssessment }>(`/customers/${customerId}/assessments/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
    },
    recordDecision: async (
      assessmentId: string,
      payload: {
        action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT';
        approvedAmount?: number;
        approvedTenureMonths?: number;
        approvedInterestRate?: number;
        approverNotes?: string;
      }
    ): Promise<{ message: string; assessment: CreditAssessment }> => {
      return request<{ message: string; assessment: CreditAssessment }>(`/assessments/${assessmentId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    getPDFDownloadUrl: (assessmentId: string): string => {
      return `${API_BASE}/assessments/${assessmentId}/pdf`;
    },
  },

  // Lending Policies
  policies: {
    list: async (): Promise<{ policies: LendingPolicyConfig[] }> => {
      return request<{ policies: LendingPolicyConfig[] }>('/policies');
    },
    update: async (id: string, data: Partial<LendingPolicyConfig>): Promise<{ policy: LendingPolicyConfig }> => {
      return request<{ policy: LendingPolicyConfig }>(`/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  },

  // Audit Logs
  audit: {
    list: async (params?: { action?: string; entityType?: string; limit?: number }): Promise<{ logs: AuditLog[] }> => {
      const query = new URLSearchParams();
      if (params?.action) query.append('action', params.action);
      if (params?.entityType) query.append('entityType', params.entityType);
      if (params?.limit) query.append('limit', String(params.limit));
      const qs = query.toString() ? `?${query.toString()}` : '';
      return request<{ logs: AuditLog[] }>(`/audit-logs${qs}`);
    },
  },
};
