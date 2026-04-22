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

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const markdownToHtml = (markdown: string): string => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, '').trim())}</li>`);
      continue;
    }

    if (line.trim().length === 0) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<p>${escapeHtml(line.trim())}</p>`);
  }

  if (inList) {
    html.push('</ul>');
  }

  return html.join('\n');
};
