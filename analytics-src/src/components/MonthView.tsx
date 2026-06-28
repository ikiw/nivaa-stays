import { Card, Box, Typography, LinearProgress } from '@mui/material';
import type { AnalyticsData } from '../types';
import { fmtINR, fmtFull, monthLabelLong, CLR, occLevel, tgtLevel, TARGET_DEFAULT } from '../lib';
import { KpiRow } from './Kpis';

export default function MonthView({ data, monthKey }: { data: AnalyticsData; monthKey: string }) {
  const m = data.months.find((x) => x.month === monthKey);
  if (!m) return null;
  const target = data.revenueTarget || TARGET_DEFAULT;
  const revPct = Math.round((m.revenue / target) * 100);
  const lvl = tgtLevel(revPct);
  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Typography variant="h5">{monthLabelLong(m.month)}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{m.bookings} bookings · {m.nights} room-nights · ADR {fmtINR(m.adr)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography sx={{ fontSize: 14 }}>
            <Box component="span" sx={{ fontSize: '1.15rem', fontWeight: 700, color: CLR[lvl] }}>{fmtFull(m.revenue)}</Box>
            <Box component="span" sx={{ color: 'text.secondary' }}> / {fmtINR(target)} ({revPct}%)</Box>
          </Typography>
          <Typography sx={{ fontSize: 12, color: CLR[occLevel(m.occupancy)] }}>{m.occupancy}% occupancy</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(100, revPct)}
          sx={{ height: 12, borderRadius: 999, bgcolor: '#eef0ee', '& .MuiLinearProgress-bar': { bgcolor: CLR[lvl], borderRadius: 999 } }} />
      </Card>

      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>{monthLabelLong(m.month)} vs your monthly average</Typography>
      <KpiRow m={m} data={data} />
    </Box>
  );
}
