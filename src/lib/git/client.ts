import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { AppConfig, RepoHealth, RepoSetupCloneInput, RepoSetupExistingInput } from '../../shared/types';

const execFileAsync = promisify(execFile);

class GitError extends Error {
  constructor(message: string, readonly stderr?: string) {
    super(message);
    this.name = 'GitError';
  }
}

const toUserFriendlyGitMessage = (context: string, detail: string): string => {
  const lower = detail.toLowerCase();

  if (lower.includes('not a git repository')) {
    return `${context}: Git 저장소가 아닙니다. 경로를 다시 확인하세요.`;
  }

  if (lower.includes('fatal: could not read from remote repository') || lower.includes('authentication failed')) {
    return `${context}: 원격 저장소 인증에 실패했습니다. SSH 키 또는 PAT를 확인하세요.`;
  }

  if (lower.includes('could not resolve host') || lower.includes('name or service not known')) {
    return `${context}: 원격 저장소 주소를 확인할 수 없습니다. 네트워크/URL을 점검하세요.`;
  }

  if (lower.includes('src refspec') && lower.includes('does not match any')) {
    return `${context}: 브랜치가 비어 있거나 존재하지 않습니다. 브랜치명을 확인하세요.`;
  }

  if (lower.includes('detached head')) {
    return `${context}: 현재 detached HEAD 상태입니다. 브랜치를 체크아웃하세요.`;
  }

  if (lower.includes('non-fast-forward') || lower.includes('rejected')) {
    return `${context}: push가 거절되었습니다. 원격 변경사항을 먼저 반영해야 합니다.`;
  }

  if (lower.includes('merge conflict') || lower.includes('could not apply')) {
    return `${context}: 병합 충돌이 발생했습니다. 충돌을 해결한 뒤 다시 시도하세요.`;
  }

  if (lower.includes('no such remote')) {
    return `${context}: 원격 저장소가 설정되어 있지 않습니다. remote 설정을 확인하세요.`;
  }

  if (lower.includes('nothing to commit')) {
    return 'nothing to commit';
  }

  return `${context}: ${detail}`;
};

const runGit = async (repoPath: string, args: string[]) => {
  try {
    return await execFileAsync('git', args, { cwd: repoPath });
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    const detail = err.stderr?.trim() || err.message;
    throw new GitError(detail, err.stderr);
  }
};

const isGithubRemote = (url: string): boolean => url.toLowerCase().includes('github.com');
const PUBLIC_REMOTE_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org'];

const parseAllowedRemoteHosts = (hosts?: string[]): string[] =>
  (hosts ?? []).map((host) => host.trim().toLowerCase()).filter(Boolean);

const extractRemoteHost = (remoteUrl: string): string | null => {
  const value = remoteUrl.trim();
  if (!value) {
    return null;
  }

  if (value.includes('://')) {
    try {
      const url = new URL(value);
      return url.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  const sshMatch = value.match(/^[^@]+@([^:]+):/);
  if (sshMatch?.[1]) {
    return sshMatch[1].toLowerCase();
  }

  return null;
};

const getOriginRemoteUrl = async (repoPath: string): Promise<string | null> => {
  try {
    const result = await runGit(repoPath, ['remote', 'get-url', 'origin']);
    const url = result.stdout.trim();
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
};

const ensureGitRepo = async (repoPath: string): Promise<void> => {
  const dotGit = path.join(repoPath, '.git');
  try {
    await fs.access(dotGit);
  } catch {
    throw new GitError('Git 저장소를 찾을 수 없습니다. .git 폴더가 없습니다.');
  }
};

const normalizeConfig = (base: {
  repoPath: string;
  remoteUrl?: string;
  branch: string;
  logsRoot?: string;
  autoPush?: boolean;
  pullBeforeSave?: boolean;
  allowedRemoteHosts?: string[];
}): AppConfig => ({
  repoPath: base.repoPath,
  remoteUrl: base.remoteUrl,
  branch: base.branch,
  logsRoot: base.logsRoot?.trim() || 'logs',
  autoPush: base.autoPush ?? true,
  pullBeforeSave: base.pullBeforeSave ?? false,
  allowedRemoteHosts: parseAllowedRemoteHosts(base.allowedRemoteHosts)
});

const checkoutBranch = async (repoPath: string, branch: string): Promise<void> => {
  try {
    await runGit(repoPath, ['checkout', branch]);
  } catch (error) {
    const err = error as GitError;
    const detail = err.message;

    if (detail.includes('pathspec')) {
      await runGit(repoPath, ['checkout', '-b', branch]);
      return;
    }

    throw new GitError(toUserFriendlyGitMessage('브랜치 체크아웃 실패', detail), detail);
  }
};

export const setupExistingRepo = async (input: RepoSetupExistingInput): Promise<AppConfig> => {
  const repoPath = path.resolve(input.repoPath);
  await ensureGitRepo(repoPath);
  await checkoutBranch(repoPath, input.branch);
  const originUrl = await getOriginRemoteUrl(repoPath);

  return normalizeConfig({
    repoPath,
    remoteUrl: originUrl ?? undefined,
    branch: input.branch,
    logsRoot: input.logsRoot,
    autoPush: originUrl && isGithubRemote(originUrl) ? false : input.autoPush,
    pullBeforeSave: input.pullBeforeSave,
    allowedRemoteHosts: input.allowedRemoteHosts
  });
};

export const cloneRepo = async (input: RepoSetupCloneInput): Promise<AppConfig> => {
  const destinationPath = path.resolve(input.destinationPath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await execFileAsync('git', ['clone', input.remoteUrl, destinationPath]);
  } catch (error) {
    const err = error as { stderr?: string; message: string };
    const detail = err.stderr?.trim() || err.message;
    throw new GitError(toUserFriendlyGitMessage('clone 실패', detail), detail);
  }

  await checkoutBranch(destinationPath, input.branch);

  return normalizeConfig({
    repoPath: destinationPath,
    remoteUrl: input.remoteUrl,
    branch: input.branch,
    logsRoot: input.logsRoot,
    autoPush: isGithubRemote(input.remoteUrl) ? false : input.autoPush,
    pullBeforeSave: input.pullBeforeSave,
    allowedRemoteHosts: input.allowedRemoteHosts
  });
};

export const validateRepo = async (config: AppConfig): Promise<{ ok: boolean; message: string }> => {
  const health = await getRepoHealth(config);
  return { ok: health.level !== 'error', message: health.message };
};

export const getRepoHealth = async (config: AppConfig): Promise<RepoHealth> => {
  try {
    await ensureGitRepo(config.repoPath);
    await runGit(config.repoPath, ['rev-parse', '--is-inside-work-tree']);

    const head = await runGit(config.repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const currentHead = head.stdout.trim();
    if (currentHead === 'HEAD') {
      return {
        level: 'error',
        message: '저장소 검증 실패: detached HEAD 상태입니다.',
        configuredBranch: config.branch,
        currentBranch: currentHead
      };
    }

    if (currentHead !== config.branch) {
      return {
        level: 'error',
        message: `저장소 검증 실패: 현재 브랜치(${currentHead})가 설정 브랜치(${config.branch})와 다릅니다.`,
        configuredBranch: config.branch,
        currentBranch: currentHead
      };
    }

    const originUrl = await getOriginRemoteUrl(config.repoPath);
    const originHost = originUrl ? extractRemoteHost(originUrl) : null;
    const allowedHosts = parseAllowedRemoteHosts(config.allowedRemoteHosts);

    if (!originUrl) {
      return {
        level: 'warning',
        message: '저장소와 브랜치는 유효하지만 origin remote가 없습니다.',
        configuredBranch: config.branch,
        currentBranch: currentHead
      };
    }

    if (originHost && allowedHosts.length > 0 && !allowedHosts.includes(originHost)) {
      return {
        level: 'error',
        message: `저장소 검증 실패: origin host(${originHost})가 허용 목록(${allowedHosts.join(', ')})에 없습니다.`,
        originUrl,
        configuredBranch: config.branch,
        currentBranch: currentHead
      };
    }

    if (originHost && PUBLIC_REMOTE_HOSTS.includes(originHost)) {
      return {
        level: 'warning',
        message: `저장소와 브랜치는 유효합니다. 주의: origin remote가 외부 서비스(${originHost})입니다. 회사 로그는 사내 Git Enterprise를 사용하세요.`,
        originUrl,
        configuredBranch: config.branch,
        currentBranch: currentHead
      };
    }

    return {
      level: 'safe',
      message: '저장소와 브랜치가 유효합니다.',
      originUrl: originUrl ?? undefined,
      configuredBranch: config.branch,
      currentBranch: currentHead
    };
  } catch (error) {
    const err = error as GitError;
    return {
      level: 'error',
      message: toUserFriendlyGitMessage('저장소 검증 실패', err.message),
      configuredBranch: config.branch
    };
  }
};

export const syncAfterSave = async (params: {
  config: AppConfig;
  filePath: string;
  date: string;
}): Promise<{ committed: boolean; pushed: boolean; commitMessage: string; statusMessage: string }> => {
  const { config, filePath, date } = params;
  const commitMessage = `worklog: update ${date}`;
  const relativePath = path.relative(config.repoPath, filePath);

  if (config.pullBeforeSave) {
    try {
      await runGit(config.repoPath, ['pull', '--rebase', 'origin', config.branch]);
    } catch (error) {
      const err = error as GitError;
      throw new GitError(toUserFriendlyGitMessage('pull 실패', err.message), err.stderr);
    }
  }

  try {
    await runGit(config.repoPath, ['add', relativePath]);
  } catch (error) {
    const err = error as GitError;
    throw new GitError(toUserFriendlyGitMessage('add 실패', err.message), err.stderr);
  }

  let committed = false;
  try {
    await runGit(config.repoPath, ['commit', '-m', commitMessage]);
    committed = true;
  } catch (error) {
    const err = error as GitError;
    const friendly = toUserFriendlyGitMessage('commit 실패', err.message);
    if (friendly !== 'nothing to commit') {
      throw new GitError(friendly, err.stderr);
    }
  }

  let pushed = false;
  if (committed && config.autoPush) {
    const originUrl = await getOriginRemoteUrl(config.repoPath);
    const originHost = originUrl ? extractRemoteHost(originUrl) : null;
    const allowedHosts = parseAllowedRemoteHosts(config.allowedRemoteHosts);

    if (!originUrl) {
      throw new GitError('push 차단: origin remote가 없습니다. remote 설정 후 다시 시도하세요.');
    }

    if (originHost && allowedHosts.length > 0 && !allowedHosts.includes(originHost)) {
      throw new GitError(
        `push 차단: origin host(${originHost})가 허용 목록(${allowedHosts.join(', ')})에 없습니다.`,
        originUrl
      );
    }

    if (originHost && PUBLIC_REMOTE_HOSTS.includes(originHost)) {
      throw new GitError(
        `push 차단: origin remote가 외부 서비스(${originHost})입니다. 회사 로그 보호를 위해 auto-push를 중단했습니다.`,
        originUrl
      );
    }

    try {
      await runGit(config.repoPath, ['push', 'origin', config.branch]);
      pushed = true;
    } catch (error) {
      const err = error as GitError;
      throw new GitError(toUserFriendlyGitMessage('push 실패', err.message), err.stderr);
    }
  }

  const statusMessage = committed
    ? pushed
      ? '저장, 커밋, 푸시 완료'
      : '저장, 커밋 완료'
    : '파일은 저장되었고 변경 사항이 없어 커밋은 생략되었습니다.';

  return { committed, pushed, commitMessage, statusMessage };
};
