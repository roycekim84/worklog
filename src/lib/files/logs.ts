import fs from 'node:fs/promises';
import path from 'node:path';
import { getLogFilePath, getMonthDir } from '../calendar/paths';
import type { AppConfig, IsoDate, LogEntryResult, MonthLogState } from '../../shared/types';
import { makeDefaultFields, parseMarkdownToFields, renderMarkdownFromFields } from '../../shared/markdown';

const LOG_FILE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

export const listMonthLogs = async (config: AppConfig, year: number, month: number): Promise<MonthLogState> => {
  const targetDir = getMonthDir(config.repoPath, config.logsRoot, year, month);
  const daysWithLog: number[] = [];

  try {
    const files = await fs.readdir(targetDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const match = file.name.match(LOG_FILE_PATTERN);
      if (!match) {
        continue;
      }

      const fileYear = Number(match[1]);
      const fileMonth = Number(match[2]);
      const day = Number(match[3]);

      if (fileYear === year && fileMonth === month) {
        daysWithLog.push(day);
      }
    }
  } catch {
    return { year, month, daysWithLog: [] };
  }

  return { year, month, daysWithLog: daysWithLog.sort((a, b) => a - b) };
};

export const readLogEntry = async (config: AppConfig, isoDate: IsoDate): Promise<LogEntryResult> => {
  const filePath = getLogFilePath(config.repoPath, config.logsRoot, isoDate);

  try {
    const rawMarkdown = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);

    return {
      exists: true,
      fields: parseMarkdownToFields(rawMarkdown),
      rawMarkdown,
      filePath,
      lastSavedAt: stats.mtime.toISOString()
    };
  } catch {
    const rawMarkdown = renderMarkdownFromFields(isoDate, makeDefaultFields());
    return {
      exists: false,
      fields: makeDefaultFields(),
      rawMarkdown,
      filePath
    };
  }
};

export const writeLogEntry = async (config: AppConfig, isoDate: IsoDate, markdown: string): Promise<string> => {
  const filePath = getLogFilePath(config.repoPath, config.logsRoot, isoDate);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, markdown, 'utf8');
  return filePath;
};
