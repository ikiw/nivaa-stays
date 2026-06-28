// Formatters, colour rules, and the analytics fetch. Pure (no React).
import type { AnalyticsData, MonthRec } from './types';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkdwbDe8eSoYuapo2xp6XRYmiosBWfACvHVp9D6hOGHnN0c39YHGA-ecZFLhFDrFb/exec';
export const TARGET_DEFAULT = 100000;

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(APPS_SCRIPT_URL + '?analytics=1');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// ---- colour rules ----
//  Occupancy: <40% low · 40–65% mid · ≥65% good.  Revenue vs target: <70% low · 70–99% mid · ≥100% good.
export type Level = 'good' | 'mid' | 'low';
export const CLR: Record<Level, string> = { good: '#1a7a44', mid: '#b8860b', low: '#c45a3a' };
export const CBG: Record<Level, string> = { good: 'rgba(26,122,68,0.12)', mid: 'rgba(184,134,11,0.14)', low: 'rgba(196,90,58,0.12)' };
export const occLevel = (pct: number): Level => (pct >= 65 ? 'good' : pct >= 40 ? 'mid' : 'low');
export const tgtLevel = (pctOfTarget: number): Level => (pctOfTarget >= 100 ? 'good' : pctOfTarget >= 70 ? 'mid' : 'low');

export const CHART_PALETTE = ['#0E3B35', '#C9A227', '#C56B3E', '#5B6B68', '#14524a', '#E6C35A', '#94A3B8', '#8a6d12'];

// ---- formatters ----
export function fmtINR(n: number): string {
  n = Math.round(Number(n) || 0);
  if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + n.toLocaleString('en-IN');
}
export function fmtFull(n: number): string {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
}
export function monthLabel(ym: string): string {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}
export function monthLabelLong(ym: string): string {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
export function dateLabelShort(ymd: string): string {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}

// ---- comparison helpers ----
export function completedMonths(months: MonthRec[]): MonthRec[] {
  return months.length > 1 ? months.slice(0, -1) : months;
}
export function avgField(ms: MonthRec[], f: keyof MonthRec): number {
  if (!ms.length) return 0;
  return ms.reduce((a, m) => a + (Number(m[f]) || 0), 0) / ms.length;
}
export const isWeekend = (dow: number): boolean => dow === 5 || dow === 6 || dow === 0;
