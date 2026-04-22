import type { IsoDate, LogEntryFields } from './types';

const cleanLine = (line: string) => line.trimEnd();

const bulletLinesToArray = (value: string): string[] => {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0);
};

const getSectionBody = (markdown: string, heading: string): string => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const match = markdown.match(regex);
  return (match?.[1] ?? '').trim();
};

export const makeDefaultFields = (): LogEntryFields => ({
  project: '',
  workLog: [''],
  notes: '',
  nextAction: ['']
});

export const parseMarkdownToFields = (markdown: string): LogEntryFields => {
  const project = getSectionBody(markdown, 'Project');
  const workLog = bulletLinesToArray(getSectionBody(markdown, 'Work Log'));
  const notes = getSectionBody(markdown, 'Notes');
  const nextAction = bulletLinesToArray(getSectionBody(markdown, 'Next Action'));

  return {
    project,
    workLog: workLog.length > 0 ? workLog : [''],
    notes,
    nextAction: nextAction.length > 0 ? nextAction : ['']
  };
};

const renderBullets = (items: string[]): string => {
  const normalized = items.map((item) => cleanLine(item).trim()).filter(Boolean);
  if (normalized.length === 0) {
    return '- ';
  }
  return normalized.map((item) => `- ${item}`).join('\n');
};

export const renderMarkdownFromFields = (date: IsoDate, fields: LogEntryFields): string => {
  const lines = [
    `# ${date}`,
    '',
    '## Project',
    cleanLine(fields.project ?? ''),
    '',
    '',
    '## Work Log',
    renderBullets(fields.workLog),
    '',
    '## Notes',
    cleanLine(fields.notes ?? ''),
    '',
    '',
    '## Next Action',
    renderBullets(fields.nextAction),
    ''
  ];

  return lines.join('\n');
};
