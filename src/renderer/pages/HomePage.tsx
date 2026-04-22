import { useEffect, useMemo, useState } from 'react';
import { CalendarView } from '../components/CalendarView';
import { EditorPanel } from '../components/EditorPanel';
import { StatusBar } from '../components/StatusBar';
import { useSelectedDate } from '../hooks/useSelectedDate';
import { useCalendarLogs } from '../hooks/useCalendarLogs';
import { getYearMonthFromDate, fromIsoDate, toIsoDate } from '../../shared/dates';
import type { GitActionStatus, IsoDate, LogEntryFields } from '../../shared/types';
import { makeDefaultFields } from '../../shared/markdown';

const getActionGuide = (message: string): string | undefined => {
  const lower = message.toLowerCase();

  if (lower.includes('인증') || lower.includes('authentication')) {
    return 'SSH 키 또는 PAT 권한을 확인한 뒤 다시 저장하세요.';
  }
  if (lower.includes('브랜치') || lower.includes('detached head')) {
    return '저장소 재설정에서 올바른 브랜치를 다시 선택하세요.';
  }
  if (lower.includes('push') && lower.includes('거절')) {
    return '원격 변경사항을 pull/rebase 반영 후 다시 저장하세요.';
  }
  if (lower.includes('충돌') || lower.includes('conflict')) {
    return '충돌 파일을 해결한 뒤 커밋 상태를 정리하고 다시 시도하세요.';
  }
  if (lower.includes('git 저장소') || lower.includes('저장소')) {
    return '저장소 경로와 remote 설정을 다시 확인하세요.';
  }
  if (lower.includes('github')) {
    return '회사 로그는 사내 Git Enterprise remote로 변경하세요.';
  }
  if (lower.includes('허용 목록') || lower.includes('allowed')) {
    return '저장소 재설정에서 허용 remote host 목록을 수정하거나 origin 주소를 사내 도메인으로 변경하세요.';
  }

  return undefined;
};

export const HomePage = () => {
  const { selectedDate, setSelectedDate } = useSelectedDate();

  const [viewDate, setViewDate] = useState(() => fromIsoDate(selectedDate));
  const { year, month } = useMemo(() => getYearMonthFromDate(viewDate), [viewDate]);
  const { daysWithLogs, loading: monthLoading, reload } = useCalendarLogs(year, month);

  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<LogEntryFields>(makeDefaultFields());
  const [filePath, setFilePath] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<GitActionStatus>({ type: 'idle', message: '준비됨' });

  const firstDayOfMonthIso = (date: Date): IsoDate =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01` as IsoDate;

  useEffect(() => {
    const next = fromIsoDate(selectedDate);
    setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    const fetchEntry = async () => {
      setEntryLoading(true);
      try {
        const response = await window.worklogApi.getLogEntry({ date: selectedDate });
        setFields(response.fields);
        setFilePath(response.filePath);
        setLastSavedAt(response.lastSavedAt);
        setStatus({
          type: 'info',
          message: response.exists ? '기존 로그를 불러왔습니다.' : '해당 날짜 로그가 없어 기본 템플릿을 불러왔습니다.',
          at: new Date().toISOString()
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '로그 로드 실패';
        setStatus({ type: 'error', message, guide: getActionGuide(message), at: new Date().toISOString() });
      } finally {
        setEntryLoading(false);
      }
    };

    void fetchEntry();
  }, [selectedDate]);

  const handleSave = async (nextFields: LogEntryFields) => {
    setSaving(true);
    try {
      const result = await window.worklogApi.saveLogEntry({
        date: selectedDate,
        fields: nextFields
      });
      setFields(nextFields);
      setStatus({ type: 'success', message: result.statusMessage, at: new Date().toISOString() });
      setFilePath(result.filePath);
      setLastSavedAt(new Date().toISOString());
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장 실패';
      setStatus({ type: 'error', message, guide: getActionGuide(message), at: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  const shiftMonth = (offset: number) => {
    const target = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(target);
    setSelectedDate(firstDayOfMonthIso(target));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toIsoDate(today));
  };

  return (
    <div className="home-layout">
      <CalendarView
        year={year}
        month={month}
        selectedDate={selectedDate}
        daysWithLogs={daysWithLogs}
        loading={monthLoading}
        onSelectDate={setSelectedDate}
        onPrevMonth={() => shiftMonth(-1)}
        onNextMonth={() => shiftMonth(1)}
        onToday={handleToday}
      />
      <EditorPanel
        selectedDate={selectedDate}
        fields={fields}
        filePath={filePath}
        lastSavedAt={lastSavedAt}
        loading={entryLoading}
        saving={saving}
        onSave={handleSave}
      />
      <StatusBar status={status} />
    </div>
  );
};
