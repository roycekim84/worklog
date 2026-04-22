import { useEffect, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { RepoSetupDialog } from './components/RepoSetupDialog';
import type { AppBootstrapState, RepoHealth } from '../shared/types';
type PreflightEntry = { at: string; level: RepoHealth['level'] | 'error'; message: string };

const getHealthBadgeLabel = (health?: RepoHealth): string => {
  if (!health) {
    return 'UNKNOWN';
  }
  if (health.level === 'safe') {
    return 'SAFE';
  }
  if (health.level === 'warning') {
    return 'WARNING';
  }
  return 'ERROR';
};

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [state, setState] = useState<AppBootstrapState | null>(null);
  const [setupError, setSetupError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [preflightMessage, setPreflightMessage] = useState('');
  const [preflightHistory, setPreflightHistory] = useState<PreflightEntry[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const result = await window.worklogApi.getBootstrapState();
        setState(result);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const refreshState = async () => {
    const result = await window.worklogApi.getBootstrapState();
    setState(result);
    setPreflightMessage('');
  };

  const runPreflight = async () => {
    setWorking(true);
    try {
      const health = await window.worklogApi.preflightRepo();
      setState((prev) => (prev ? { ...prev, repoHealth: health, validationMessage: health.message } : prev));
      setPreflightMessage(`Preflight: ${health.message}`);
      setPreflightHistory((prev): PreflightEntry[] => {
        const next: PreflightEntry[] = [
          { at: new Date().toISOString(), level: health.level, message: health.message },
          ...prev
        ];
        return next.slice(0, 5);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preflight 실패';
      setPreflightMessage(`Preflight 실패: ${message}`);
      setPreflightHistory((prev): PreflightEntry[] => {
        const next: PreflightEntry[] = [
          { at: new Date().toISOString(), level: 'error', message: `Preflight 실패: ${message}` },
          ...prev
        ];
        return next.slice(0, 5);
      });
    } finally {
      setWorking(false);
    }
  };

  const pickDirectory = async () => {
    const picked = await window.worklogApi.pickDirectory();
    return picked.canceled ? null : picked.path ?? null;
  };

  if (loading) {
    return <div className="loading-screen">초기 상태 로딩 중...</div>;
  }

  if (!state?.repoReady || showSetup) {
    return (
      <RepoSetupDialog
        loading={working}
        state={state}
        initialConfig={state?.config}
        onCancel={state?.repoReady ? () => setShowSetup(false) : undefined}
        onPickDirectory={pickDirectory}
        onSubmitExisting={async (params) => {
          setWorking(true);
          try {
            const next = await window.worklogApi.setupExistingRepo(params);
            setState(next);
            setSetupError('');
            setShowSetup(false);
          } catch (error) {
            setSetupError(error instanceof Error ? error.message : '기존 저장소 설정 실패');
          } finally {
            setWorking(false);
          }
        }}
        onSubmitClone={async (params) => {
          setWorking(true);
          try {
            const next = await window.worklogApi.cloneRepo(params);
            setState(next);
            setSetupError('');
            setShowSetup(false);
          } catch (error) {
            setSetupError(error instanceof Error ? error.message : '저장소 클론/설정 실패');
          } finally {
            setWorking(false);
          }
        }}
        errorMessage={setupError}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Worklog Calendar</h1>
          <p className="repo-meta">
            {state?.config?.repoPath} | branch: {state?.config?.branch} | auto-push: {state?.config?.autoPush ? 'on' : 'off'}
          </p>
          <p className="repo-meta">
            allowed-hosts: {(state?.config?.allowedRemoteHosts ?? []).join(', ') || '(not set)'}
          </p>
          <div className="repo-health-line">
            <span className={`repo-health-badge ${state.repoHealth?.level ?? 'error'}`}>{getHealthBadgeLabel(state.repoHealth)}</span>
            <span className="repo-health-message">{state.repoHealth?.message ?? state.validationMessage}</span>
          </div>
          {preflightMessage ? <p className="repo-preflight-message">{preflightMessage}</p> : null}
          {preflightHistory.length > 0 ? (
            <div className="preflight-history">
              {preflightHistory.map((item) => (
                <div key={`${item.at}-${item.message}`} className="preflight-item">
                  <span className={`repo-health-badge ${item.level}`}>{item.level.toUpperCase()}</span>
                  <span className="preflight-item-message">{item.message}</span>
                  <span className="preflight-item-time">{new Date(item.at).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="header-actions">
          <button
            onClick={() => {
              setSetupError('');
              setShowSetup(true);
            }}
            disabled={working}
          >
            저장소 재설정
          </button>
          <button onClick={() => void runPreflight()} disabled={working}>Preflight 검사</button>
          <button onClick={() => void refreshState()} disabled={working}>저장소 상태 재확인</button>
        </div>
      </header>
      <HomePage />
    </div>
  );
};
