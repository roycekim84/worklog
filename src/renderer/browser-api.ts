import type {
  AppBootstrapState,
  ExportPdfInput,
  ExportPdfResult,
  FilePickResult,
  LogEntryResult,
  MonthSummary,
  MonthLogState,
  RepoHealth,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SearchLogItem,
  SearchLogsInput,
  SaveLogInput,
  SaveLogResult
} from '../shared/types';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? '요청 실패');
  }
  return payload;
};

if (!window.worklogApi) {
  window.worklogApi = {
    getBootstrapState: () => request<AppBootstrapState>('/api/bootstrap'),
    setupExistingRepo: (payload: RepoSetupExistingInput) =>
      request<AppBootstrapState>('/api/repo/setup-existing', { method: 'POST', body: JSON.stringify(payload) }),
    cloneRepo: (payload: RepoSetupCloneInput) =>
      request<AppBootstrapState>('/api/repo/clone', { method: 'POST', body: JSON.stringify(payload) }),
    pickDirectory: async (): Promise<FilePickResult> => {
      const path = window.prompt('폴더 경로를 입력하세요');
      return path ? { canceled: false, path } : { canceled: true };
    },
    preflightRepo: () => request<RepoHealth>('/api/repo/preflight', { method: 'POST' }),
    createProfile: (payload: { name: string }) =>
      request<AppBootstrapState>('/api/profiles/create', { method: 'POST', body: JSON.stringify(payload) }),
    switchProfile: (payload: { profileId: string }) =>
      request<AppBootstrapState>('/api/profiles/switch', { method: 'POST', body: JSON.stringify(payload) }),
    deleteProfile: (payload: { profileId: string }) =>
      request<AppBootstrapState>('/api/profiles/delete', { method: 'POST', body: JSON.stringify(payload) }),
    listMonthLogs: (payload: { year: number; month: number }) =>
      request<MonthLogState>(`/api/calendar/month-logs?year=${payload.year}&month=${payload.month}`),
    getMonthSummary: (payload: { year: number; month: number }) =>
      request<MonthSummary>(`/api/calendar/month-summary?year=${payload.year}&month=${payload.month}`),
    searchLogs: (payload: SearchLogsInput) =>
      request<SearchLogItem[]>(`/api/logs/search?query=${encodeURIComponent(payload.query)}&limit=${payload.limit ?? 30}`),
    getLogEntry: (payload: { date: string }) => request<LogEntryResult>(`/api/log?date=${payload.date}`),
    saveLogEntry: (payload: SaveLogInput) =>
      request<SaveLogResult>('/api/log/save', { method: 'POST', body: JSON.stringify(payload) }),
    exportLogPdf: (payload: ExportPdfInput) =>
      request<ExportPdfResult>('/api/log/export-pdf', { method: 'POST', body: JSON.stringify(payload) })
  };
}
