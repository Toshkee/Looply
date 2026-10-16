import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CATEGORY_ICONS } from '@/components/categoryVisuals';
import { SelectSheet } from '@/components/SelectSheet';
import { SubscriptionRow } from '@/components/SubscriptionRow';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_LIST_QUERY, filterAndSortSubscriptions, isDefaultQuery, type CategoryFilter, type ListQuery, type SortKey, type StatusFilter } from '@/domain/listing';
import { FREE_SUBSCRIPTION_LIMIT } from '@/domain/pro';
import { CATEGORY_IDS } from '@/domain/subscription';
import { useAddSubscription } from '@/hooks/useAddSubscription';
import { useToday } from '@/hooks/useToday';
import { useIsPro } from '@/state/pro';
import { useSubscriptionStore } from '@/state/subscriptionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const addSubscription = useAddSubscription();
  const isPro = useIsPro();
  const { colors } = useTheme();
  const today = useToday();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const [query, setQuery] = useState<ListQuery>(DEFAULT_LIST_QUERY);
  const [sheet, setSheet] = useState<'category' | 'sort' | null>(null);

  const results = useMemo(() => filterAndSortSubscriptions(subscriptions, query, today), [subscriptions, query, today]);
  const patch = (value: Partial<ListQuery>) => setQuery((current) => ({ ...current, ...value }));

  const sortLabels: Record<SortKey, string> = {
    nextPayment: t('subscriptions.sortNextPayment'),
    name: t('subscriptions.sortName'),
    amount: t('subscriptions.sortAmount'),
  };
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('subscriptions.filterAll') },
    { value: 'active', label: t('subscriptions.filterActive') },
    { value: 'paused', label: t('subscriptions.filterPaused') },
    { value: 'cancelled', label: t('subscriptions.filterCancelled') },
  ];

  return (
    <ScreenScroll
      title={t('subscriptions.title')}
      headerRight={<IconButton icon="add" accessibilityLabel={t('a11y.addSubscription')} onPress={addSubscription} />}
    >
      {subscriptions.length === 0 ? (
        <Card>
          <EmptyState
            icon="albums-outline"
            title={t('home.emptyTitle')}
            body={t('home.emptyBody')}
            actionLabel={t('home.emptyAction')}
            onAction={addSubscription}
          />
        </Card>
      ) : (
        <>
          <View style={styles.controls}>
            <TextField
              placeholder={t('subscriptions.searchPlaceholder')}
              accessibilityLabel={t('subscriptions.searchPlaceholder')}
              value={query.search}
              onChangeText={(search) => patch({ search })}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="never"
              trailing={
                query.search !== '' ? (
                  <Pressable onPress={() => patch({ search: '' })} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.clearSearch')} style={styles.clear}>
                    <Icon name="close-circle" size={20} color={colors.textTertiary} />
                  </Pressable>
                ) : (
                  <View style={styles.clear}>
                    <Icon name="search" size={18} color={colors.textTertiary} />
                  </View>
                )
              }
            />
            <SegmentedControl options={statusOptions} value={query.status} onChange={(status) => patch({ status })} />
            <View style={styles.chips}>
              <Chip
                icon={query.category === 'all' ? 'funnel-outline' : CATEGORY_ICONS[query.category]}
                label={query.category === 'all' ? t('subscriptions.allCategories') : t(`category.${query.category}`)}
                selected={query.category !== 'all'}
                accessibilityLabel={t('a11y.categoryFilter')}
                onPress={() => setSheet('category')}
              />
              <Chip icon="swap-vertical" label={sortLabels[query.sort]} accessibilityLabel={t('a11y.sortOptions')} onPress={() => setSheet('sort')} />
            </View>
          </View>

          {results.length === 0 ? (
            <Card>
              <EmptyState icon="search" title={t('subscriptions.noResultsTitle')} body={t('subscriptions.noResultsBody')} />
              {!isDefaultQuery(query) ? (
                <Pressable onPress={() => setQuery({ ...DEFAULT_LIST_QUERY, sort: query.sort })} accessibilityRole="button" style={styles.reset}>
                  <AppText variant="bodyStrong" tone="accent">
                    {t('subscriptions.resetFilters')}
                  </AppText>
                </Pressable>
              ) : null}
            </Card>
          ) : (
            <View style={styles.list}>
              <View style={styles.countRow}>
                <AppText variant="caption" tone="secondary">
                  {t('counts.subscriptions', { count: results.length })}
                </AppText>
                {!isPro ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/pro', params: { feature: 'limit' } })}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <AppText variant="label" tone="accent">
                      {t('pro.freeUsage', { used: Math.min(subscriptions.length, FREE_SUBSCRIPTION_LIMIT), limit: FREE_SUBSCRIPTION_LIMIT })}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              {results.map((subscription) => (
                <SubscriptionRow key={subscription.id} subscription={subscription} today={today} />
              ))}
            </View>
          )}
        </>
      )}

      <SelectSheet<CategoryFilter>
        visible={sheet === 'category'}
        title={t('form.category')}
        closeLabel={t('common.close')}
        value={query.category}
        onSelect={(category) => patch({ category })}
        onClose={() => setSheet(null)}
        options={[
          { value: 'all', label: t('subscriptions.allCategories') },
          ...CATEGORY_IDS.map((category) => ({
            value: category,
            label: t(`category.${category}`),
            leading: <Icon name={CATEGORY_ICONS[category]} size={20} color={colors.textSecondary} />,
          })),
        ]}
      />
      <SelectSheet<SortKey>
        visible={sheet === 'sort'}
        title={t('subscriptions.sortBy')}
        closeLabel={t('common.close')}
        value={query.sort}
        onSelect={(sort) => patch({ sort })}
        onClose={() => setSheet(null)}
        options={(['nextPayment', 'name', 'amount'] as const).map((sort) => ({ value: sort, label: sortLabels[sort] }))}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  controls: { gap: spacing.md },
  clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reset: { alignItems: 'center', paddingBottom: spacing.xl, minHeight: 44, justifyContent: 'center' },
  list: { gap: spacing.sm + 2 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginHorizontal: spacing.xs },
});
