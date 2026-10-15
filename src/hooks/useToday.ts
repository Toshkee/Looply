import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayLocal, type ISODate } from '@/domain/calendarDate';

/**
 * Today's local date that stays correct when the app is left open past
 * midnight or resumed on a later day.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayLocal());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setToday(todayLocal());
    const scheduleMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, nextMidnight.getTime() - now.getTime());
    };
    scheduleMidnight();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
