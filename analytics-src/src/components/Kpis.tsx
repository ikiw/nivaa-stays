import { Card, Typography, Box } from '@mui/material';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import type { AnalyticsData, MonthRec } from '../types';
import { fmtINR, completedMonths, avgField, CLR, occLevel, tgtLevel, TARGET_DEFAULT } from '../lib';

export function KpiCard({ label, value, sub, subColor, valueColor }: {
  label: string; value: string | number; sub?: React.ReactNode; subColor?: string; valueColor?: string;
}) {
  return (
    <Card sx={{ p: 1.75, height: '100%' }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.4 }}>{label}</Typography>
      <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.15, mt: 0.25, color: valueColor || 'text.primary' }}>{value}</Typography>
      {sub != null && (
        <Typography sx={{ fontSize: 11, mt: 0.25, color: subColor || 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.25 }}>{sub}</Typography>
      )}
    </Card>
  );
}

function VsAvg({ cur, field, fmt, data }: { cur: number; field: keyof MonthRec; fmt: (n: number) => string; data: AnalyticsData }) {
  const avg = avgField(completedMonths(data.months), field);
  if (!avg) return <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>no prior months</Typography>;
  const up = cur >= avg;
  const pct = Math.round(((cur - avg) / avg) * 100);
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: up ? CLR.good : CLR.low, fontSize: 11 }}>
      {up ? <ArrowUpwardRounded sx={{ fontSize: 13 }} /> : <ArrowDownwardRounded sx={{ fontSize: 13 }} />}
      {Math.abs(pct)}% vs avg ({fmt(avg)})
    </Box>
  );
}

// 5-metric KPI row for a month, compared to the average of all completed months.
export function KpiRow({ m, data, bookingsLabel }: { m: MonthRec; data: AnalyticsData; bookingsLabel?: string }) {
  const target = data.revenueTarget || TARGET_DEFAULT;
  const revColor = CLR[tgtLevel(Math.round((m.revenue / target) * 100))];
  const occColor = CLR[occLevel(m.occupancy)];
  const cards: Array<{ label: string; value: string | number; field: keyof MonthRec; fmt: (n: number) => string; valueColor?: string }> = [
    { label: bookingsLabel || 'Bookings', value: m.bookings, field: 'bookings', fmt: (v) => String(Math.round(v)) },
    { label: 'Revenue', value: fmtINR(m.revenue), field: 'revenue', fmt: fmtINR, valueColor: revColor },
    { label: 'Occupancy', value: m.occupancy + '%', field: 'occupancy', fmt: (v) => Math.round(v * 10) / 10 + '%', valueColor: occColor },
    { label: 'ADR', value: fmtINR(m.adr), field: 'adr', fmt: fmtINR },
    { label: 'RevPAR', value: fmtINR(m.revpar), field: 'revpar', fmt: fmtINR },
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
      {cards.map((c) => (
        <KpiCard key={c.label} label={c.label} value={c.value} valueColor={c.valueColor}
          sub={<VsAvg cur={Number(m[c.field])} field={c.field} fmt={c.fmt} data={data} />} />
      ))}
    </Box>
  );
}
