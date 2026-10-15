import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { addMonths, daysInMonth, getParts, isoWeekday, makeDate, startOfMonth, type ISODate } from '@/domain/calendarDate';
import { useFormatters } from '@/hooks/useFormatters';
import { haptics } from '@/services/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { AppText } from './ui/AppText';
import { IconButton } from './ui/IconButton';

interface MonthCalendarProps {
  /** Any day in the month to show. */
  month: ISODate;
  onMonthChange: (month: ISODate) => void;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
  today: ISODate;
  /** Days with payments get a dot. */
  markedDates?: ReadonlySet<string>;
}

/**
 * A Monday-first month grid rendered with the app's own translated names,
 * so it always matches the app language (the native picker follows the
 * device language instead).
 */
export function MonthCalendar({ month, onMonthChange, selected, onSelect, today, markedDates }: MonthCalendarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();

  const weeks = useMemo(() => {
    const first = startOfMonth(month);
    const { year, month: monthNumber } = getParts(first);
    const leading = isoWeekday(first) - 1;
    const cells: (ISODate | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth(year, monthNumber); day += 1) cells.push(makeDate(year, monthNumber, day));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (ISODate | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="headline" accessibilityRole="header" style={styles.title}>
          {format.monthYear(month)}
        </AppText>
        <IconButton icon="chevron-back" variant="plain" size={40} accessibilityLabel={t('calendar.previousMonth')} onPress={() => onMonthChange(addMonths(startOfMonth(month), -1))} />
        <IconButton icon="chevron-forward" variant="plain" size={40} accessibilityLabel={t('calendar.nextMonth')} onPress={() => onMonthChange(addMonths(startOfMonth(month), 1))} />
      </View>
      <View style={styles.week}>
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <AppText key={weekday} variant="micro" tone="tertiary" align="center" style={styles.cell}>
            {format.weekdayMin(weekday)}
          </AppText>
        ))}
      </View>
      {weeks.map((week, rowIndex) => (
        <View key={rowIndex} style={styles.week}>
          {week.map((date, columnIndex) => {
            if (!date) return <View key={columnIndex} style={styles.cell} />;
            const isSelected = date === selected;
            const isToday = date === today;
            const marked = markedDates?.has(date) ?? false;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={format.date(date, 'full')}
                onPress={() => {
                  haptics.selection();
                  onSelect(date);
                }}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <AppText
                    variant={isSelected || isToday ? 'bodyStrong' : 'body'}
                    tone={isSelected ? 'onPrimary' : isToday ? 'accent' : 'primary'}
                    maxFontSizeMultiplier={1.2}
                  >
                    {getParts(date).day}
                  </AppText>
                </View>
                <View style={[styles.marker, { backgroundColor: marked ? colors.accent : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  title: { flex: 1 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  marker: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
});
