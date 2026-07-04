import { ACTIVE } from './tokens';

export const IS_DARK = ACTIVE.mode === 'dark';
export const ACCENT = IS_DARK ? '#E6C35A' : ACTIVE.highlight;
export const ACCENT_INK = IS_DARK ? '#211A06' : ACTIVE.highlightInk;

export const panelBorder = IS_DARK ? 'rgba(255,255,255,0.10)' : 'rgba(90,70,40,0.16)';
export const softBorder = IS_DARK ? 'rgba(255,255,255,0.08)' : 'rgba(90,70,40,0.12)';
export const softDivider = IS_DARK ? 'rgba(255,255,255,0.08)' : 'rgba(90,70,40,0.10)';
export const panelBg = IS_DARK
  ? 'linear-gradient(180deg, rgba(255,255,255,0.060), rgba(255,255,255,0.032))'
  : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,246,236,0.90))';
export const cardBg = IS_DARK
  ? 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))'
  : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,243,235,0.86))';
export const hoverBg = IS_DARK ? 'rgba(255,255,255,0.075)' : 'rgba(154,91,37,0.055)';
export const shadowSoft = IS_DARK
  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
  : '0 10px 28px rgba(90,70,40,0.08), inset 0 1px 0 rgba(255,255,255,0.86)';

export const chipBg = IS_DARK ? '#171B24' : 'rgba(255,255,255,0.72)';
export const activeRailBg = IS_DARK ? '#0D121A' : 'rgba(255,255,255,0.68)';

export const accentSoftBg = IS_DARK ? 'rgba(230,195,90,0.08)' : 'rgba(217,154,18,0.10)';
export const accentBorder = IS_DARK ? 'rgba(230,195,90,0.35)' : 'rgba(154,91,37,0.24)';
export const accentHoverBorder = IS_DARK ? 'rgba(230,195,90,0.50)' : 'rgba(154,91,37,0.42)';
export const iconHalo = IS_DARK
  ? 'radial-gradient(circle at 35% 20%, rgba(230,195,90,0.22), rgba(230,195,90,0.06))'
  : 'radial-gradient(circle at 35% 20%, rgba(217,154,18,0.20), rgba(217,154,18,0.07))';

export const titleColor = ACTIVE.textPrimary;
export const mutedColor = ACTIVE.textSecondary;
