import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { AppConfig } from '../../shared/types';

const CONFIG_FILE = 'worklog-config.json';

const getConfigPath = () => path.join(app.getPath('userData'), CONFIG_FILE);

export const loadConfig = async (): Promise<AppConfig | null> => {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as AppConfig;
    if (!parsed.repoPath || !parsed.branch) {
      return null;
    }

    return {
      ...parsed,
      logsRoot: parsed.logsRoot?.trim() || 'logs',
      autoPush: parsed.autoPush ?? true,
      pullBeforeSave: parsed.pullBeforeSave ?? false,
      allowedRemoteHosts: parsed.allowedRemoteHosts ?? []
    };
  } catch {
    return null;
  }
};

export const saveConfig = async (config: AppConfig): Promise<void> => {
  const target = getConfigPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(config, null, 2), 'utf8');
};
