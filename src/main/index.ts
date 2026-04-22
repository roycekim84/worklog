import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, saveConfig } from '../lib/config/store';
import { cloneRepo, getRepoHealth, setupExistingRepo, syncAfterSave, validateRepo } from '../lib/git/client';
import { listMonthLogs, readLogEntry, searchLogs, writeLogEntry } from '../lib/files/logs';
import type {
  AppBootstrapState,
  ExportPdfInput,
  ExportPdfResult,
  FilePickResult,
  IsoDate,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SearchLogsInput,
  SaveLogInput,
  SaveLogResult
} from '../shared/types';
import { markdownToHtml, renderMarkdownFromFields } from '../shared/markdown';

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

const buildPdfHtml = (title: string, markdownHtml: string): string => `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; padding: 36px; color: #222; }
    h1 { font-size: 28px; margin-bottom: 12px; }
    h2 { font-size: 20px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    ul { margin: 6px 0 12px 18px; }
    p, li { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="meta">Worklog PDF Export</div>
  <h1>${title}</h1>
  ${markdownHtml}
</body>
</html>`;

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

  ipcMain.handle('logs:search', async (_event, payload: SearchLogsInput) => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }
    return searchLogs(config, payload.query, payload.limit ?? 30);
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

  ipcMain.handle('log:export-pdf', async (_event, payload: ExportPdfInput): Promise<ExportPdfResult> => {
    const config = await loadConfig();
    if (!config) {
      throw new Error('설정이 없습니다.');
    }

    const markdown = renderMarkdownFromFields(payload.date, payload.fields);
    const markdownHtml = markdownToHtml(markdown);
    const html = buildPdfHtml(payload.date, markdownHtml);

    const [year, month] = payload.date.split('-');
    const outputDir = path.join(config.repoPath, 'exports', year, month);
    await fs.mkdir(outputDir, { recursive: true });
    const pdfPath = path.join(outputDir, `${payload.date}.pdf`);

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdfBuffer = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4'
      });
      await fs.writeFile(pdfPath, pdfBuffer);
    } finally {
      printWindow.destroy();
    }

    return { filePath: pdfPath };
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
