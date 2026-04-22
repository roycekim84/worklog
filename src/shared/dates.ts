import type { IsoDate } from './types';

export const toIsoDate = (date: Date): IsoDate => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as IsoDate;
};

export const fromIsoDate = (isoDate: IsoDate): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getMonthMeta = (year: number, month: number) => {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return { firstWeekday, daysInMonth };
};

export const formatDisplayDate = (isoDate: IsoDate): string => {
  const date = fromIsoDate(isoDate);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
};

export const getYearMonthFromDate = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1
});
