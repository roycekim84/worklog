import { useEffect, useMemo, useState } from 'react';
import { formatDisplayDate } from '../../shared/dates';
import type { IsoDate, LogEntryFields } from '../../shared/types';
import { markdownToHtml, renderMarkdownFromFields } from '../../shared/markdown';

interface EditorPanelProps {
  selectedDate: IsoDate;
  fields: LogEntryFields;
  filePath: string;
  lastSavedAt?: string;
  loading: boolean;
  saving: boolean;
  onSave: (fields: LogEntryFields) => void;
  onExportPdf: (fields: LogEntryFields) => void;
  exportingPdf: boolean;
}

const textToBullets = (text: string): string[] => {
  const items = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return items.length > 0 ? items : [''];
};

const bulletsToText = (items: string[]): string => items.join('\n');

export const EditorPanel = ({
  selectedDate,
  fields,
  filePath,
  lastSavedAt,
  loading,
  saving,
  onSave,
  onExportPdf,
  exportingPdf
}: EditorPanelProps) => {
  const [project, setProject] = useState(fields.project);
  const [workLogText, setWorkLogText] = useState(bulletsToText(fields.workLog));
  const [notes, setNotes] = useState(fields.notes);
  const [nextActionText, setNextActionText] = useState(bulletsToText(fields.nextAction));

  useEffect(() => {
    setProject(fields.project);
    setWorkLogText(bulletsToText(fields.workLog));
    setNotes(fields.notes);
    setNextActionText(bulletsToText(fields.nextAction));
  }, [fields]);

  const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);
  const draftFields = useMemo(
    () => ({ project, notes, workLog: textToBullets(workLogText), nextAction: textToBullets(nextActionText) }),
    [project, notes, workLogText, nextActionText]
  );
  const generatedMarkdown = useMemo(() => renderMarkdownFromFields(selectedDate, draftFields), [selectedDate, draftFields]);
  const previewHtml = useMemo(() => markdownToHtml(generatedMarkdown), [generatedMarkdown]);

  return (
    <section className="editor-panel">
      <div className="panel-header">
        <h2>{displayDate}</h2>
        <div className="editor-actions">
          <button onClick={() => onExportPdf(draftFields)} disabled={loading || saving || exportingPdf}>
            {exportingPdf ? 'PDF 생성 중...' : 'PDF 내보내기'}
          </button>
          <button onClick={() => onSave(draftFields)} disabled={loading || saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <label>
        Project
        <textarea value={project} onChange={(event) => setProject(event.target.value)} rows={3} disabled={loading || saving} />
      </label>

      <label>
        Work Log (줄바꿈으로 항목 구분)
        <textarea value={workLogText} onChange={(event) => setWorkLogText(event.target.value)} rows={7} disabled={loading || saving} />
      </label>

      <label>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} disabled={loading || saving} />
      </label>

      <label>
        Next Action (줄바꿈으로 항목 구분)
        <textarea value={nextActionText} onChange={(event) => setNextActionText(event.target.value)} rows={4} disabled={loading || saving} />
      </label>

      <div className="editor-meta">
        <div>파일: {filePath || '-'}</div>
        <div>마지막 저장 시각: {lastSavedAt ? new Date(lastSavedAt).toLocaleString('ko-KR') : '-'}</div>
        <div className="warning">주의: 비밀번호, 토큰, 사내 기밀 정보는 기록하지 마세요.</div>
      </div>

      <div className="preview-grid">
        <section className="preview-panel">
          <h3>Generated Markdown</h3>
          <pre>{generatedMarkdown}</pre>
        </section>
        <section className="preview-panel">
          <h3>Rendered Preview</h3>
          <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </section>
      </div>
    </section>
  );
};
