import type {
  AdminCategory,
  AdminLoginInput,
  AdminReport,
  AdminReportsQuery,
  AdminSession,
  AdminUser,
  AdminUserState,
  AdminVerification,
  AdminWithdrawal,
  AuditLog,
  CreateCategoryInput,
  DocumentLink,
  Page,
  ReportActionInput,
  ReportActionResult,
  UpdateCategoryInput,
  VerificationRequestStatus,
  WithdrawalStatus,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/** `?a=1&b=2` from the defined entries only. */
export function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** The browser calls for `/v1/admin/*`. The API guards and audit-logs every one. */
export const adminApi = {
  login: (body: AdminLoginInput) =>
    api.request<AdminSession>('/v1/admin/auth/login', { method: 'POST', body }),
  logout: () => api.request('/v1/auth/logout', { method: 'POST' }),

  verifications: (status: VerificationRequestStatus, cursor?: string) =>
    api.request<Page<AdminVerification>>(
      `/v1/admin/verifications${queryString({ status, cursor })}`,
    ),
  documentLink: (verificationId: string, documentId: string) =>
    api.request<DocumentLink>(`/v1/admin/verifications/${verificationId}/documents/${documentId}`),
  approve: (id: string) =>
    api.request<AdminVerification>(`/v1/admin/verifications/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) =>
    api.request<AdminVerification>(`/v1/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),

  reports: (query: Partial<AdminReportsQuery>) =>
    api.request<Page<AdminReport>>(
      `/v1/admin/reports${queryString({ status: query.status, targetType: query.targetType, cursor: query.cursor })}`,
    ),
  actOnReport: (id: string, body: ReportActionInput) =>
    api.request<ReportActionResult>(`/v1/admin/reports/${id}/action`, { method: 'POST', body }),

  users: (q: string | undefined, cursor?: string) =>
    api.request<Page<AdminUser>>(`/v1/admin/users${queryString({ q, cursor })}`),
  suspend: (id: string, reason: string) =>
    api.request<AdminUserState>(`/v1/admin/users/${id}/suspend`, {
      method: 'POST',
      body: { reason },
    }),
  restore: (id: string) =>
    api.request<AdminUserState>(`/v1/admin/users/${id}/restore`, { method: 'POST' }),

  categories: () => api.request<{ data: AdminCategory[] }>('/v1/admin/categories'),
  createCategory: (body: CreateCategoryInput) =>
    api.request<AdminCategory>('/v1/admin/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: UpdateCategoryInput) =>
    api.request<AdminCategory>(`/v1/admin/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id: string) => api.request(`/v1/admin/categories/${id}`, { method: 'DELETE' }),

  withdrawals: (status: WithdrawalStatus, cursor?: string) =>
    api.request<Page<AdminWithdrawal>>(`/v1/admin/withdrawals${queryString({ status, cursor })}`),
  approveWithdrawal: (id: string) =>
    api.request<AdminWithdrawal>(`/v1/admin/withdrawals/${id}/approve`, { method: 'POST' }),
  rejectWithdrawal: (id: string, reason: string) =>
    api.request<AdminWithdrawal>(`/v1/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  retryWithdrawal: (id: string) =>
    api.request<AdminWithdrawal>(`/v1/admin/withdrawals/${id}/retry`, { method: 'POST' }),

  auditLogs: (filters: { action?: string; targetId?: string }, cursor?: string) =>
    api.request<Page<AuditLog>>(`/v1/admin/audit-logs${queryString({ ...filters, cursor })}`),
};

export const adminKeys = {
  all: ['admin'] as const,
  verifications: (status: string) => ['admin', 'verifications', status] as const,
  withdrawals: (status: string) => ['admin', 'withdrawals', status] as const,
  reports: (status: string, targetType: string) =>
    ['admin', 'reports', status, targetType] as const,
  users: (q: string) => ['admin', 'users', q] as const,
  categories: ['admin', 'categories'] as const,
  auditLogs: (action: string, targetId: string) =>
    ['admin', 'audit-logs', action, targetId] as const,
};

export class PopupBlockedError extends Error {
  constructor() {
    super('Allow pop-ups for this site to open documents in a new tab.');
    this.name = 'PopupBlockedError';
  }
}

/**
 * Opens a KYC document in a new tab (web spec: never embedded or cached). The
 * tab opens synchronously in the click, so popup blockers allow it, and then
 * goes to the 5-minute link once the API returns it. Clearing `opener` keeps
 * the document's page from reaching back into the admin tab. When pop-ups are
 * blocked nothing is opened (and no link is fetched or logged): the admin tab
 * itself never navigates to a document.
 */
export async function openInNewTab(
  getUrl: () => Promise<string>,
  open: (url: string, target: string, features: string) => Window | null = (...args) =>
    window.open(...args),
): Promise<void> {
  const tab = open('about:blank', '_blank', 'noopener=no');
  if (!tab) throw new PopupBlockedError();
  try {
    const url = await getUrl();
    tab.opener = null;
    tab.location.replace(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
