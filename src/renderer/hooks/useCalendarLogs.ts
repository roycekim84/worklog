import { useCallback, useEffect, useState } from 'react';

export const useCalendarLogs = (year: number, month: number) => {
  const [daysWithLogs, setDaysWithLogs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const monthState = await window.worklogApi.listMonthLogs({ year, month });
      setDaysWithLogs(monthState.daysWithLog);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { daysWithLogs, loading, reload };
};
