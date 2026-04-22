import { useMemo, useState } from 'react';
import type { IsoDate } from '../../shared/types';
import { toIsoDate } from '../../shared/dates';

export const useSelectedDate = () => {
  const [selectedDate, setSelectedDate] = useState<IsoDate>(() => toIsoDate(new Date()));

  const selected = useMemo(() => selectedDate, [selectedDate]);

  return {
    selectedDate: selected,
    setSelectedDate
  };
};
