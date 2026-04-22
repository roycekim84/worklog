import { getMonthMeta, toIsoDate } from '../../shared/dates';
import type { IsoDate } from '../../shared/types';

interface CalendarViewProps {
  year: number;
  month: number;
  selectedDate: IsoDate;
  daysWithLogs: number[];
  loading: boolean;
  onSelectDate: (date: IsoDate) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const CalendarView = ({
  year,
  month,
  selectedDate,
  daysWithLogs,
  loading,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday
}: CalendarViewProps) => {
  const { firstWeekday, daysInMonth } = getMonthMeta(year, month);
  const todayIso = toIsoDate(new Date());

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null });
  }

  return (
    <section className="calendar-panel">
      <div className="panel-header">
        <h2>{year}년 {month}월</h2>
        <div className="calendar-actions">
          <button onClick={onPrevMonth}>이전</button>
          <button onClick={onToday}>오늘</button>
          <button onClick={onNextMonth}>다음</button>
        </div>
      </div>
      <div className="calendar-grid weekdays">
        {WEEKDAYS.map((label) => (
          <div key={label} className="weekday-cell">{label}</div>
        ))}
      </div>
      <div className="calendar-grid days">
        {cells.map((cell, index) => {
          if (!cell.day) {
            return <div key={`empty-${index}`} className="day-cell empty" />;
          }

          const iso = `${year}-${String(month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}` as IsoDate;
          const hasLog = daysWithLogs.includes(cell.day);
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;

          const className = [
            'day-cell',
            hasLog ? 'has-log' : 'no-log',
            isSelected ? 'selected' : '',
            isToday ? 'today' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button key={iso} className={className} onClick={() => onSelectDate(iso)}>
              <span className="day-number">{cell.day}</span>
              {hasLog ? <span className="log-dot" /> : null}
            </button>
          );
        })}
      </div>
      <div className="calendar-footer">{loading ? '로그 존재 여부 갱신 중...' : '날짜 점은 로그 파일 존재를 의미합니다.'}</div>
    </section>
  );
};
