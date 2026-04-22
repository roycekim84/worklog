import type {
  AppBootstrapState,
  ExportPdfInput,
  ExportPdfResult,
  FilePickResult,
  LogEntryResult,
  MonthLogState,
  RepoHealth,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SearchLogItem,
  SearchLogsInput,
  SaveLogInput,
  SaveLogResult
} from '../shared/types';

declare global {
  interface Window {
    worklogApi: {
      getBootstrapState: () => Promise<AppBootstrapState>;
      setupExistingRepo: (payload: RepoSetupExistingInput) => Promise<AppBootstrapState>;
      cloneRepo: (payload: RepoSetupCloneInput) => Promise<AppBootstrapState>;
      pickDirectory: () => Promise<FilePickResult>;
      preflightRepo: () => Promise<RepoHealth>;
      listMonthLogs: (payload: { year: number; month: number }) => Promise<MonthLogState>;
      searchLogs: (payload: SearchLogsInput) => Promise<SearchLogItem[]>;
      getLogEntry: (payload: { date: string }) => Promise<LogEntryResult>;
      saveLogEntry: (payload: SaveLogInput) => Promise<SaveLogResult>;
      exportLogPdf: (payload: ExportPdfInput) => Promise<ExportPdfResult>;
    };
  }
}

export {};
