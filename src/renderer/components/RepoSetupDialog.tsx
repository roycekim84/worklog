import { useEffect, useState } from 'react';
import type { AppBootstrapState, AppConfig } from '../../shared/types';

type Mode = 'existing' | 'clone';
const DEFAULT_ALLOWED_HOST = 'git.company.local';

const extractHostFromRemote = (value: string): string | null => {
  const remote = value.trim();
  if (!remote) {
    return null;
  }

  if (remote.includes('://')) {
    try {
      return new URL(remote).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  const sshMatch = remote.match(/^[^@]+@([^:]+):/);
  if (sshMatch?.[1]) {
    return sshMatch[1].toLowerCase();
  }

  return null;
};

interface RepoSetupDialogProps {
  loading: boolean;
  errorMessage?: string;
  onCancel?: () => void;
  onSubmitExisting: (params: {
    repoPath: string;
    branch: string;
    logsRoot: string;
    autoPush: boolean;
    pullBeforeSave: boolean;
    allowedRemoteHosts: string[];
  }) => Promise<void>;
  onSubmitClone: (params: {
    remoteUrl: string;
    destinationPath: string;
    branch: string;
    logsRoot: string;
    autoPush: boolean;
    pullBeforeSave: boolean;
    allowedRemoteHosts: string[];
  }) => Promise<void>;
  onPickDirectory: () => Promise<string | null>;
  state?: AppBootstrapState | null;
  initialConfig?: AppConfig | null;
}

export const RepoSetupDialog = ({
  loading,
  errorMessage,
  onCancel,
  onSubmitExisting,
  onSubmitClone,
  onPickDirectory,
  state,
  initialConfig
}: RepoSetupDialogProps) => {
  const [mode, setMode] = useState<Mode>('existing');
  const [repoPath, setRepoPath] = useState(initialConfig?.repoPath ?? '');
  const [destinationPath, setDestinationPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState(initialConfig?.remoteUrl ?? '');
  const [branch, setBranch] = useState(initialConfig?.branch ?? 'main');
  const [logsRoot, setLogsRoot] = useState(initialConfig?.logsRoot ?? 'logs');
  const [autoPush, setAutoPush] = useState(initialConfig?.autoPush ?? true);
  const [pullBeforeSave, setPullBeforeSave] = useState(initialConfig?.pullBeforeSave ?? false);
  const [allowedHostsText, setAllowedHostsText] = useState((initialConfig?.allowedRemoteHosts ?? []).join(','));
  const cloneRemoteIsGithub = remoteUrl.toLowerCase().includes('github.com');
  const normalizedHostTokens = allowedHostsText
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const duplicateHosts = normalizedHostTokens.filter((host, index) => normalizedHostTokens.indexOf(host) !== index);
  const invalidHosts = normalizedHostTokens.filter((host) => !/^[a-z0-9.-]+$/.test(host));
  const hostValidationError =
    invalidHosts.length > 0
      ? `허용 host 형식 오류: ${invalidHosts.join(', ')}`
      : duplicateHosts.length > 0
        ? `허용 host 중복: ${Array.from(new Set(duplicateHosts)).join(', ')}`
        : '';
  const parseAllowedHosts = (): string[] => Array.from(new Set(normalizedHostTokens));

  useEffect(() => {
    if (!initialConfig) {
      return;
    }

    setRepoPath(initialConfig.repoPath);
    setRemoteUrl(initialConfig.remoteUrl ?? '');
    setBranch(initialConfig.branch);
    setLogsRoot(initialConfig.logsRoot);
    setAutoPush(initialConfig.autoPush);
    setPullBeforeSave(initialConfig.pullBeforeSave);
    const presetHosts =
      initialConfig.allowedRemoteHosts && initialConfig.allowedRemoteHosts.length > 0
        ? initialConfig.allowedRemoteHosts
        : initialConfig.remoteUrl
          ? [extractHostFromRemote(initialConfig.remoteUrl) ?? DEFAULT_ALLOWED_HOST]
          : [DEFAULT_ALLOWED_HOST];
    setAllowedHostsText(presetHosts.filter(Boolean).join(','));
  }, [initialConfig]);

  useEffect(() => {
    if (allowedHostsText.trim()) {
      return;
    }

    const remoteHost = extractHostFromRemote(remoteUrl);
    if (remoteHost) {
      setAllowedHostsText(remoteHost);
    }
  }, [remoteUrl, allowedHostsText]);

  useEffect(() => {
    if (!allowedHostsText.trim()) {
      setAllowedHostsText(DEFAULT_ALLOWED_HOST);
    }
  }, [allowedHostsText]);

  return (
    <section className="setup-wrap">
      <h1>Worklog 저장소 설정</h1>
      <p>최초 1회 저장소 설정이 필요합니다. 회사 환경에서는 사내 Git Enterprise 주소만 사용하세요.</p>
      <p className="setup-message">상태: {state?.validationMessage ?? '설정 필요'}</p>
      {errorMessage ? <p className="setup-error">{errorMessage}</p> : null}
      {onCancel ? (
        <div className="setup-cancel">
          <button onClick={onCancel} disabled={loading}>설정 화면 닫기</button>
        </div>
      ) : null}

      <div className="mode-switch">
        <button className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>기존 로컬 저장소</button>
        <button className={mode === 'clone' ? 'active' : ''} onClick={() => setMode('clone')}>원격 저장소 클론</button>
      </div>

      {mode === 'existing' ? (
        <div className="setup-form">
          <label>
            로컬 저장소 경로
            <div className="input-with-button">
              <input value={repoPath} onChange={(event) => setRepoPath(event.target.value)} placeholder="/path/to/repo" />
              <button
                onClick={async () => {
                  const selected = await onPickDirectory();
                  if (selected) {
                    setRepoPath(selected);
                  }
                }}
                disabled={loading}
              >
                선택
              </button>
            </div>
          </label>

          <label>
            브랜치
            <input value={branch} onChange={(event) => setBranch(event.target.value)} />
          </label>

          <label>
            로그 루트
            <input value={logsRoot} onChange={(event) => setLogsRoot(event.target.value)} />
          </label>

          <label className="inline-check">
            <input type="checkbox" checked={autoPush} onChange={(event) => setAutoPush(event.target.checked)} />
            저장 후 자동 push
          </label>

          <label className="inline-check">
            <input type="checkbox" checked={pullBeforeSave} onChange={(event) => setPullBeforeSave(event.target.checked)} />
            저장 전 pull --rebase
          </label>

          <label>
            허용 remote host 목록 (쉼표 구분)
            <input
              value={allowedHostsText}
              onChange={(event) => setAllowedHostsText(event.target.value)}
              placeholder="git.company.local,git.internal.company"
            />
          </label>

          <button
            onClick={() =>
              onSubmitExisting({
                repoPath,
                branch,
                logsRoot,
                autoPush,
                pullBeforeSave,
                allowedRemoteHosts: parseAllowedHosts()
              })
            }
            disabled={loading || !repoPath.trim() || !branch.trim() || Boolean(hostValidationError)}
          >
            설정 저장
          </button>
          {hostValidationError ? <p className="setup-error">{hostValidationError}</p> : null}
        </div>
      ) : (
        <div className="setup-form">
          <label>
            원격 URL
            <input
              value={remoteUrl}
              onChange={(event) => setRemoteUrl(event.target.value)}
              placeholder="ssh://git.company.local/worklog.git"
            />
          </label>

          <label>
            로컬 대상 경로
            <div className="input-with-button">
              <input value={destinationPath} onChange={(event) => setDestinationPath(event.target.value)} placeholder="/path/to/clone" />
              <button
                onClick={async () => {
                  const selected = await onPickDirectory();
                  if (selected) {
                    setDestinationPath(selected);
                  }
                }}
                disabled={loading}
              >
                선택
              </button>
            </div>
          </label>

          <label>
            브랜치
            <input value={branch} onChange={(event) => setBranch(event.target.value)} />
          </label>

          <label>
            로그 루트
            <input value={logsRoot} onChange={(event) => setLogsRoot(event.target.value)} />
          </label>

          <label className="inline-check">
            <input
              type="checkbox"
              checked={autoPush}
              onChange={(event) => setAutoPush(event.target.checked)}
              disabled={cloneRemoteIsGithub}
            />
            저장 후 자동 push
          </label>
          {cloneRemoteIsGithub ? (
            <p className="setup-warning">GitHub remote 감지: 로그 유출 방지를 위해 auto-push는 비활성화됩니다.</p>
          ) : null}

          <label className="inline-check">
            <input type="checkbox" checked={pullBeforeSave} onChange={(event) => setPullBeforeSave(event.target.checked)} />
            저장 전 pull --rebase
          </label>

          <label>
            허용 remote host 목록 (쉼표 구분)
            <input
              value={allowedHostsText}
              onChange={(event) => setAllowedHostsText(event.target.value)}
              placeholder="git.company.local,git.internal.company"
            />
          </label>

          <button
            onClick={() =>
              onSubmitClone({
                remoteUrl,
                destinationPath,
                branch,
                logsRoot,
                autoPush,
                pullBeforeSave,
                allowedRemoteHosts: parseAllowedHosts()
              })
            }
            disabled={loading || !remoteUrl.trim() || !destinationPath.trim() || !branch.trim() || Boolean(hostValidationError)}
          >
            클론 및 설정 저장
          </button>
          {hostValidationError ? <p className="setup-error">{hostValidationError}</p> : null}
        </div>
      )}
    </section>
  );
};
