import type { GitActionStatus } from '../../shared/types';

interface StatusBarProps {
  status: GitActionStatus;
}

export const StatusBar = ({ status }: StatusBarProps) => {
  return (
    <footer className={`status-bar ${status.type}`}>
      <div className="status-main">
        <span>{status.message}</span>
        {status.guide ? <span className="status-guide">조치: {status.guide}</span> : null}
      </div>
      <span>{status.at ? new Date(status.at).toLocaleString('ko-KR') : ''}</span>
    </footer>
  );
};
