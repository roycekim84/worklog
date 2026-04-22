import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppBootstrapState,
  ExportPdfInput,
  ExportPdfResult,
  FilePickResult,
  MonthLogState,
  RepoHealth,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SearchLogItem,
  SearchLogsInput,
  SaveLogInput,
  SaveLogResult
} from '../shared/types';

const api = {
  getBootstrapState: (): Promise<AppBootstrapState> => ipcRenderer.invoke('bootstrap:get-state'),
  setupExistingRepo: (payload: RepoSetupExistingInput): Promise<AppBootstrapState> =>
    ipcRenderer.invoke('repo:setup-existing', payload),
  cloneRepo: (payload: RepoSetupCloneInput): Promise<AppBootstrapState> => ipcRenderer.invoke('repo:clone', payload),
  pickDirectory: (): Promise<FilePickResult> => ipcRenderer.invoke('repo:pick-directory'),
  preflightRepo: (): Promise<RepoHealth> => ipcRenderer.invoke('repo:preflight'),
  listMonthLogs: (payload: { year: number; month: number }): Promise<MonthLogState> =>
    ipcRenderer.invoke('calendar:list-month-logs', payload),
  searchLogs: (payload: SearchLogsInput): Promise<SearchLogItem[]> => ipcRenderer.invoke('logs:search', payload),
  getLogEntry: (payload: { date: string }) => ipcRenderer.invoke('log:get-entry', payload),
  saveLogEntry: (payload: SaveLogInput): Promise<SaveLogResult> => ipcRenderer.invoke('log:save-entry', payload),
  exportLogPdf: (payload: ExportPdfInput): Promise<ExportPdfResult> => ipcRenderer.invoke('log:export-pdf', payload)
};

contextBridge.exposeInMainWorld('worklogApi', api);
