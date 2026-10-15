import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ISODate } from '@/domain/calendarDate';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { MonthCalendar } from '../MonthCalendar';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

interface DateFieldProps {
  value: ISODate | null;
  onChange: (date: ISODate) => void;
  error?: string | null;
  initiallyOpen?: boolean;
  accessibilityLabel: string;
}

/** A date row that expands into an inline, app-localized month calendar. */
export function DateField({ value, onChange, error, initiallyOpen = false, accessibilityLabel }: DateFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();
  const today = useToday();
  const [open, setOpen] = useState(initiallyOpen);
  const [month, setMonth] = useState<ISODate>(value ?? today);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => !current);
  };

  return (
    <View style={styles.wrapper}>
      <Card padded={false} style={error ? { borderWidth: 1.5, borderColor: colors.danger } : null}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel}, ${value ? format.date(value, 'full') : t('form.selectDate')}`}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={styles.row}
        >
          <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
          <View style={styles.texts}>
            <AppText variant="body" tone={value ? 'primary' : 'tertiary'}>
              {value ? format.date(value, 'full') : t('form.selectDate')}
            </AppText>
            {value ? (
              <AppText variant="caption" tone="secondary">
                {format.relativeDay(value, today)}
              </AppText>
            ) : null}
          </View>
          <Icon name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textTertiary} />
        </Pressable>
        {open ? (
          <View style={[styles.calendar, { borderTopColor: colors.separator }]}>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selected={value}
              today={today}
              onSelect={(date) => {
                onChange(date);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen(false);
              }}
            />
          </View>
        ) : null}
      </Card>
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  texts: { flex: 1, gap: 2 },
  calendar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, paddingTop: spacing.xs },
  error: { marginLeft: spacing.xs },
});
