import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { getLogFilePath, getMonthDir } from '../calendar/paths';
import type { AppConfig, IsoDate, LogEntryResult, MonthLogState, SearchLogItem } from '../../shared/types';
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

const walkDir = async (targetDir: string, collector: string[]): Promise<void> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(targetDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, collector);
      continue;
    }
    if (entry.isFile() && LOG_FILE_PATTERN.test(entry.name)) {
      collector.push(fullPath);
    }
  }
};

export const searchLogs = async (config: AppConfig, query: string, limit = 30): Promise<SearchLogItem[]> => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const logsRoot = path.join(config.repoPath, config.logsRoot);
  const files: string[] = [];
  await walkDir(logsRoot, files);

  const results: SearchLogItem[] = [];
  for (const filePath of files) {
    const base = path.basename(filePath, '.md');
    const dateCandidate = base.match(/^\d{4}-\d{2}-\d{2}$/)?.[0] as IsoDate | undefined;
    if (!dateCandidate) {
      continue;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const lower = raw.toLowerCase();
    const matched = lower.includes(normalizedQuery) || dateCandidate.includes(normalizedQuery);
    if (!matched) {
      continue;
    }

    const index = lower.indexOf(normalizedQuery);
    const snippetStart = Math.max(0, index - 30);
    const snippetEnd = Math.min(raw.length, index + normalizedQuery.length + 60);
    const snippet = raw.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

    results.push({
      date: dateCandidate,
      filePath,
      snippet
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results.sort((a, b) => (a.date > b.date ? -1 : 1));
};
