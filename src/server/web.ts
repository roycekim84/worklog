import fs from 'node:fs/promises';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { createProfile, deleteProfile, listProfiles, loadConfig, saveConfig, switchProfile } from '../lib/config/store';
import { listMonthLogs, readLogEntry, searchLogs, summarizeMonth, writeLogEntry } from '../lib/files/logs';
import { buildSimplePdf } from '../lib/files/pdf';
import { cloneRepo, getRepoHealth, setupExistingRepo, syncAfterSave, validateRepo } from '../lib/git/client';
import { renderMarkdownFromFields } from '../shared/markdown';
import type {
  AppBootstrapState,
  ExportPdfInput,
  IsoDate,
  RepoSetupCloneInput,
  RepoSetupExistingInput,
  SaveLogInput,
  SearchLogsInput
} from '../shared/types';

const rootDir = path.resolve(__dirname, '../..');
const staticDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT ?? 3210);

const readBody = async <T>(request: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as T) : ({} as T);
};

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown): void => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const sendText = (response: ServerResponse, statusCode: number, text: string): void => {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
};

const buildBootstrapState = async (): Promise<AppBootstrapState> => {
  const profileState = await listProfiles();
  const config = await loadConfig();
  if (!config) {
    return {
      config: null,
      repoReady: false,
      validationMessage: '저장소 설정이 필요합니다.',
      profiles: profileState.profiles,
      activeProfileId: profileState.activeProfileId
    };
  }

  const repoHealth = await getRepoHealth(config);
  return {
    config,
    repoReady: repoHealth.level !== 'error',
    validationMessage: repoHealth.message,
    repoHealth,
    profiles: profileState.profiles,
    activeProfileId: profileState.activeProfileId
  };
};

const handleApi = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  if (!url.pathname.startsWith('/api/')) {
    return false;
  }

  try {
    if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/repo/setup-existing') {
      const payload = await readBody<RepoSetupExistingInput>(request);
      await saveConfig(await setupExistingRepo(payload));
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/repo/clone') {
      const payload = await readBody<RepoSetupCloneInput>(request);
      await saveConfig(await cloneRepo(payload));
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/repo/preflight') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }
      sendJson(response, 200, await getRepoHealth(config));
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/profiles/create') {
      const payload = await readBody<{ name: string }>(request);
      await createProfile(payload.name);
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/profiles/switch') {
      const payload = await readBody<{ profileId: string }>(request);
      await switchProfile(payload.profileId);
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/profiles/delete') {
      const payload = await readBody<{ profileId: string }>(request);
      await deleteProfile(payload.profileId);
      sendJson(response, 200, await buildBootstrapState());
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/api/calendar/month-logs') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }
      const year = Number(url.searchParams.get('year'));
      const month = Number(url.searchParams.get('month'));
      sendJson(response, 200, await listMonthLogs(config, year, month));
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/api/calendar/month-summary') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }
      const year = Number(url.searchParams.get('year'));
      const month = Number(url.searchParams.get('month'));
      sendJson(response, 200, await summarizeMonth(config, year, month));
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/api/logs/search') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }
      const payload: SearchLogsInput = {
        query: url.searchParams.get('query') ?? '',
        limit: Number(url.searchParams.get('limit') ?? '30')
      };
      sendJson(response, 200, await searchLogs(config, payload.query, payload.limit));
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/api/log') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }
      const date = (url.searchParams.get('date') ?? '') as IsoDate;
      sendJson(response, 200, await readLogEntry(config, date));
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/log/save') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }

      const payload = await readBody<SaveLogInput>(request);
      const validation = await validateRepo(config);
      if (!validation.ok) {
        throw new Error(validation.message);
      }

      const markdown = renderMarkdownFromFields(payload.date, payload.fields);
      const filePath = await writeLogEntry(config, payload.date, markdown);
      const syncResult = await syncAfterSave({ config, filePath, date: payload.date });

      sendJson(response, 200, {
        filePath,
        committed: syncResult.committed,
        pushed: syncResult.pushed,
        commitMessage: syncResult.commitMessage,
        statusMessage: syncResult.statusMessage
      });
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/log/export-pdf') {
      const config = await loadConfig();
      if (!config) {
        throw new Error('설정이 없습니다.');
      }

      const payload = await readBody<ExportPdfInput>(request);
      const markdown = renderMarkdownFromFields(payload.date, payload.fields);
      const [year, month] = payload.date.split('-');
      const outputDir = path.join(config.repoPath, 'exports', year, month);
      await fs.mkdir(outputDir, { recursive: true });
      const pdfPath = path.join(outputDir, `${payload.date}.pdf`);
      await fs.writeFile(pdfPath, buildSimplePdf(payload.date, markdown));
      sendJson(response, 200, { filePath: pdfPath });
      return true;
    }

    sendJson(response, 404, { message: 'Not found' });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    sendJson(response, 500, { message });
    return true;
  }
};

const contentTypes = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png']
]);

const serveStatic = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(staticDir, requested);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      throw new Error('directory');
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream'
    });
    response.end(await fs.readFile(filePath));
  } catch {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await fs.readFile(path.join(staticDir, 'index.html')));
  }
};

http
  .createServer(async (request, response) => {
    if (!request.url) {
      sendText(response, 400, 'Invalid request');
      return;
    }

    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (await handleApi(request, response, url)) {
      return;
    }
    await serveStatic(request, response, url);
  })
  .listen(port, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`Worklog web app running at http://127.0.0.1:${port}`);
  });
