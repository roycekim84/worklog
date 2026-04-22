import path from 'node:path';
import type { AppConfig, IsoDate } from '../../shared/types';

export const getLogFilePath = (repoPath: string, logsRoot: string, isoDate: IsoDate): string => {
  const [year, month] = isoDate.split('-');
  return path.join(repoPath, logsRoot, year, month, `${isoDate}.md`);
};

export const getMonthDir = (repoPath: string, logsRoot: string, year: number, month: number): string => {
  return path.join(repoPath, logsRoot, String(year), String(month).padStart(2, '0'));
};

export const getResolvedLogsRoot = (config: AppConfig): string => {
  return config.logsRoot?.trim() ? config.logsRoot.trim() : 'logs';
};
