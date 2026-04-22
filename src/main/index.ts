import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { loadConfig, saveConfig } from '../lib/config/store';
import { cloneRepo, getRepoHealth, setupExistingRepo, syncAfterSave, validateRepo } from '../lib/git/client';
import { listMonthLogs, readLogEntry, writeLogEntry } from '../lib/files/logs';
import type {
  AppBootstrapState,
  FilePickResult,
  IsoDate,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SaveLogInput,
  SaveLogResult
} from '../shared/types';
import { renderMarkdownFromFields } from '../shared/markdown';

let mainWindow: BrowserWindow | null = null;

const createMainWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#f4f2ea',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
};

const buildBootstrapState = async (): Promise<AppBootstrapState> => {
  const config = await loadConfig();
  if (!config) {
    return {
      config: null,
      repoReady: false,
      validationMessage: '저장소 설정이 필요합니다.'
    };
  }

  const repoHealth = await getRepoHealth(config);
  return {
    config,
    repoReady: repoHealth.level !== 'error',
    validationMessage: repoHealth.message,
    repoHealth
  };
};

app.whenReady().then(async () => {
  ipcMain.handle('bootstrap:get-state', async () => buildBootstrapState());

  ipcMain.handle('repo:setup-existing', async (_event, payload: RepoSetupExistingInput) => {
    const config = await setupExistingRepo(payload);
    await saveConfig(config);
    return buildBootstrapState();
  });

  ipcMain.handle('repo:clone', async (_event, payload: RepoSetupCloneInput) => {
    const config = await cloneRepo(payload);
    await saveConfig(config);
    return buildBootstrapState();
  });

  ipcMain.handle('repo:pick-directory', async (): Promise<FilePickResult> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('repo:preflight', async () => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }

    return getRepoHealth(config);
  });

  ipcMain.handle('calendar:list-month-logs', async (_event, payload: { year: number; month: number }) => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }

    return listMonthLogs(config, payload.year, payload.month);
  });

  ipcMain.handle('log:get-entry', async (_event, payload: { date: string }) => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }

    return readLogEntry(config, payload.date as IsoDate);
  });

  ipcMain.handle('log:save-entry', async (_event, payload: SaveLogInput): Promise<SaveLogResult> => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }

    const validation = await validateRepo(config);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const markdown = renderMarkdownFromFields(payload.date, payload.fields);
    const filePath = await writeLogEntry(config, payload.date, markdown);
    const syncResult = await syncAfterSave({ config, filePath, date: payload.date });

    return {
      filePath,
      committed: syncResult.committed,
      pushed: syncResult.pushed,
      commitMessage: syncResult.commitMessage,
      statusMessage: syncResult.statusMessage
    };
  });

  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
