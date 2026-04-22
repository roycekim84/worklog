export type IsoDate = `${number}-${number}-${number}`;

export interface AppConfig {
  repoPath: string;
  remoteUrl?: string;
  branch: string;
  logsRoot: string;
  autoPush: boolean;
  pullBeforeSave: boolean;
  allowedRemoteHosts: string[];
}

export interface RepoSetupExistingInput {
  repoPath: string;
  branch: string;
  logsRoot?: string;
  autoPush?: boolean;
  pullBeforeSave?: boolean;
  allowedRemoteHosts?: string[];
}

export interface RepoSetupCloneInput {
  remoteUrl: string;
  destinationPath: string;
  branch: string;
  logsRoot?: string;
  autoPush?: boolean;
  pullBeforeSave?: boolean;
  allowedRemoteHosts?: string[];
}

export interface RepoValidationResult {
  ok: boolean;
  message: string;
}

export interface LogEntryFields {
  project: string;
  workLog: string[];
  notes: string;
  nextAction: string[];
}

export interface LogEntryResult {
  exists: boolean;
  fields: LogEntryFields;
  rawMarkdown: string;
  filePath: string;
  lastSavedAt?: string;
}

export interface SaveLogInput {
  date: IsoDate;
  fields: LogEntryFields;
}

export interface SaveLogResult {
  filePath: string;
  committed: boolean;
  pushed: boolean;
  commitMessage: string;
  statusMessage: string;
}

export interface SearchLogItem {
  date: IsoDate;
  filePath: string;
  snippet: string;
}

export interface SearchLogsInput {
  query: string;
  limit?: number;
}

export interface ExportPdfInput {
  date: IsoDate;
  fields: LogEntryFields;
}

export interface ExportPdfResult {
  filePath: string;
}

export interface MonthLogState {
  year: number;
  month: number;
  daysWithLog: number[];
}

export interface AppBootstrapState {
  config: AppConfig | null;
  repoReady: boolean;
  validationMessage: string;
  repoHealth?: RepoHealth;
}

export interface GitActionStatus {
  type: 'idle' | 'success' | 'error' | 'info';
  message: string;
  guide?: string;
  at?: string;
}

export interface FilePickResult {
  canceled: boolean;
  path?: string;
}

export interface RepoHealth {
  level: 'safe' | 'warning' | 'error';
  message: string;
  originUrl?: string;
  configuredBranch?: string;
  currentBranch?: string;
}
