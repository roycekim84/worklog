import type {
  AppBootstrapState,
  FilePickResult,
  LogEntryResult,
  MonthLogState,
  RepoHealth,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
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
      getLogEntry: (payload: { date: string }) => Promise<LogEntryResult>;
      saveLogEntry: (payload: SaveLogInput) => Promise<SaveLogResult>;
    };
  }
}

export {};
