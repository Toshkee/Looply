import type { TextStyle } from 'react-native';

import type { CategoryId } from '@/domain/subscription';

/**
 * Looply design tokens.
 *
 * Identity: warm "paper" surfaces, near-black ink, one persimmon accent used
 * sparingly (brand mark, the next payment, data marks). Primary actions are
 * ink-on-paper rather than accent-filled, so the accent stays meaningful.
 * Contrast of every text/background pair is ≥ 4.5:1 except `textTertiary`
 * (≥ 3.5:1, reserved for non-essential metadata and placeholders).
 */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfacePressed: string;
  /** Selected segment: must read as raised above `surfaceMuted` in both themes. */
  segmentSelected: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  separator: string;
  /** Brand accent for fills and marks (not small text). */
  accent: string;
  /** Accent variant that is legible as text. */
  accentText: string;
  accentSoft: string;
  /** Primary button fill and its label. */
  primary: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  positive: string;
  /** Single-series chart marks and their track. */
  chartMark: string;
  chartTrack: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  surfaceMuted: '#EBE7DE',
  surfacePressed: '#E2DDD2',
  segmentSelected: '#FFFFFF',
  text: '#17140F',
  textSecondary: '#5E594F',
  textTertiary: '#857F73',
  separator: 'rgba(23, 20, 15, 0.09)',
  accent: '#EF5A2A',
  accentText: '#B9400F',
  accentSoft: 'rgba(239, 90, 42, 0.12)',
  primary: '#17140F',
  onPrimary: '#F4F1EA',
  danger: '#C9362A',
  dangerSoft: 'rgba(201, 54, 42, 0.10)',
  positive: '#2A7348',
  chartMark: '#EF5A2A',
  chartTrack: '#EBE7DE',
  overlay: 'rgba(23, 20, 15, 0.35)',
};

export const darkColors: ColorTokens = {
  background: '#14110F',
  surface: '#221D19',
  surfaceMuted: '#2C2621',
  surfacePressed: '#352E28',
  segmentSelected: '#40372F',
  text: '#F6F1EA',
  textSecondary: '#AFA597',
  textTertiary: '#867C70',
  separator: 'rgba(246, 241, 234, 0.09)',
  accent: '#F2602F',
  accentText: '#FF8A5C',
  accentSoft: 'rgba(242, 96, 47, 0.16)',
  primary: '#EDE8E1',
  onPrimary: '#17140F',
  danger: '#FF7A6B',
  dangerSoft: 'rgba(255, 122, 107, 0.14)',
  positive: '#5BC48A',
  chartMark: '#F2602F',
  chartTrack: '#2C2621',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

/**
 * Soft drop shadows (RN `boxShadow`, identical on iOS and Android). In dark
 * mode a faint top highlight does the lifting that shadows cannot.
 */
export interface ShadowTokens {
  card: string;
  raised: string;
}

export const lightShadows: ShadowTokens = {
  card: '0px 1px 2px rgba(41, 30, 20, 0.05), 0px 8px 24px rgba(41, 30, 20, 0.07)',
  raised: '0px 2px 6px rgba(23, 20, 15, 0.14), 0px 12px 28px rgba(23, 20, 15, 0.12)',
};

export const darkShadows: ShadowTokens = {
  card: 'inset 0px 1px 0px rgba(255, 244, 230, 0.05), 0px 8px 24px rgba(0, 0, 0, 0.35)',
  raised: 'inset 0px 1px 0px rgba(255, 255, 255, 0.25), 0px 10px 28px rgba(0, 0, 0, 0.45)',
};

/** Category hues tint subscription avatars; the letter keeps ≥ 4.5:1 on its tile. */
export const categoryHues: Record<CategoryId, { light: string; dark: string }> = {
  entertainment: { light: '#BC3828', dark: '#FF8F7F' },
  music: { light: '#8340BF', dark: '#C9A2F2' },
  productivity: { light: '#2F5FC4', dark: '#93B3F5' },
  cloud: { light: '#1A6F94', dark: '#7CC6E6' },
  gaming: { light: '#3A7529', dark: '#98D182' },
  fitness: { light: '#9A5A00', dark: '#F2B860' },
  utilities: { light: '#6B6355', dark: '#C9BFAD' },
  telecom: { light: '#A8326F', dark: '#F091C4' },
  education: { light: '#1B7268', dark: '#72D3C5' },
  other: { light: '#5E594F', dark: '#ABA598' },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Horizontal page gutter shared by every screen. */
export const GUTTER = spacing.xl;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Minimum touch target (Apple HIG 44pt, Material 48dp → 44 + hitSlop). */
export const TOUCH_TARGET = 44;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const typography = {
  /** Hero amounts. */
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2, fontVariant: tabular },
  /** Screen titles. */
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.9 },
  /** Section and sheet titles, large amounts. */
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400', letterSpacing: -0.1 },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: -0.1 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4 },
  /** Amounts in lists: tabular so columns of numbers align. */
  amount: { fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, fontVariant: tabular },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
