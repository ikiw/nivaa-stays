import { Card, Box, Typography, LinearProgress, Chip, Stack } from '@mui/material';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import type { AnalyticsData } from '../types';
import {
  fmtINR, fmtFull, monthLabelLong, dateLabelShort, completedMonths, avgField,
  CLR, CBG, occLevel, tgtLevel, isWeekend, TARGET_DEFAULT,
} from '../lib';
import { KpiRow } from './Kpis';

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Box sx={{ bgcolor: 'background.default', borderRadius: 2, py: 1, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.15rem', color: color || 'text.primary' }}>{value}</Typography>
      <Typography variant="overline" sx={{ fontSize: 9.5, color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

export default function CurrentMonth({ data }: { data: AnalyticsData }) {
  const c = data.current;
  const curM = data.months[data.months.length - 1];
  const target = data.revenueTarget || TARGET_DEFAULT;
  const pct = Math.round((c.revenue / target) * 100);
  const gap = Math.max(0, target - c.revenue);
  const elapsed = Math.max(1, c.dayOfMonth);
  // pace-based forecast (from booking-lead history) when reliable, else naive linear
  const usePace = data.pace && data.pace.forecast.expected > 0 && data.pace.coverage >= 0.5;
  const projected = usePace ? data.pace.forecast.expected : Math.round((c.revenue / elapsed) * c.daysInMonth);
  const projPct = Math.round((projected / target) * 100);
  const occ = c.availNights ? Math.round((c.nights / c.availNights) * 1000) / 10 : 0;
  const upcoming = c.days.filter((d) => d.date >= c.today && d.free > 0);
  const openNights = upcoming.reduce((s, d) => s + d.free, 0);
  const openWknd = upcoming.filter((d) => isWeekend(d.dow));
  const openWkndNights = openWknd.reduce((s, d) => s + d.free, 0);
  const adr = Math.round(avgField(completedMonths(data.months), 'adr'))
    || (data.totals.nights ? Math.round(data.totals.revenue / data.totals.nights) : 0) || 2000;
  const nightsNeeded = adr ? Math.ceil(gap / adr) : 0;
  const curWeekIdx = Math.floor((elapsed - 1) / 7);
  const monShort = monthLabelLong(c.month).split(' ')[0];

  const tips: React.ReactNode[] = [];
  if (gap > 0) tips.push(<><b>{fmtFull(gap)}</b> to hit the {fmtINR(target)} target — about <b>{nightsNeeded}</b> more room-night{nightsNeeded === 1 ? '' : 's'} at ~{fmtINR(adr)}/night.</>);
  else tips.push(<>🎉 Target met — <b>{fmtFull(c.revenue)}</b> vs {fmtINR(target)}.</>);
  if (c.revenue > 0) tips.push(projected >= target
    ? <>On pace for <b>{fmtFull(projected)}</b> ({projPct}% of target).</>
    : <>At the current pace you'll land ~<b>{fmtFull(projected)}</b> ({projPct}%) — close the gap below.</>);
  if (openWkndNights > 0) tips.push(<><b>{openWkndNights}</b> weekend room-night{openWkndNights === 1 ? '' : 's'} open (premium rate) — fill {openWknd.slice(0, 3).map((d) => dateLabelShort(d.date)).join(', ')} first.</>);
  if (openNights > 0) tips.push(<><b>{openNights}</b> room-night{openNights === 1 ? '' : 's'} still open this month — push direct bookings (code NIVAA10) and refresh OTA calendars.</>);
  else tips.push(<>Rest of the month is fully booked 🙌</>);

  const lvl = tgtLevel(pct);
  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3, border: '2px solid rgba(14,59,53,0.15)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
          <Typography variant="h5">This month · {monthLabelLong(c.month)}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Day {c.dayOfMonth} of {c.daysInMonth} · {c.daysRemaining} days left</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 14 }}>
            <Box component="span" sx={{ fontSize: '1.15rem', fontWeight: 700, color: CLR[lvl] }}>{fmtFull(c.revenue)}</Box>
            <Box component="span" sx={{ color: 'text.secondary' }}> / {fmtINR(target)} ({pct}%)</Box>
          </Typography>
          <Typography sx={{ fontSize: 12, color: CLR[tgtLevel(projPct)] }}>projected {fmtINR(projected)} · {projPct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(100, pct)}
          sx={{ height: 12, borderRadius: 999, bgcolor: '#eef0ee', '& .MuiLinearProgress-bar': { bgcolor: CLR[lvl], borderRadius: 999 } }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mt: 2 }}>
          <Stat label="Occupancy" value={occ + '%'} color={CLR[occLevel(occ)]} />
          <Stat label="Open nights" value={openNights} color={openNights ? CLR.mid : CLR.good} />
          <Stat label="Open weekend" value={openWkndNights} color={openWkndNights ? CLR.low : CLR.good} />
          <Stat label="Bookings" value={c.bookings} />
        </Box>

        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mt: 2.5, mb: 1 }}>Weekly</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1 }}>
          {c.weeks.map((w, i) => {
            const wocc = w.availNights ? Math.round((w.nights / w.availNights) * 100) : 0;
            const active = i === curWeekIdx;
            return (
              <Box key={i} sx={{ borderRadius: 2, p: 1.25, border: '1px solid', borderColor: active ? 'secondary.main' : 'rgba(14,59,53,0.10)', bgcolor: active ? '#FBF7EC' : '#fff' }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>W{i + 1} · {monShort} {w.from}–{w.to}{active ? ' · now' : ''}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'primary.main', mt: 0.25 }}>{fmtINR(w.revenue)}</Typography>
                <Typography sx={{ fontSize: 10.5, color: CLR[occLevel(wocc)] }}>{w.nights}/{w.availNights} nts · {wocc}%</Typography>
              </Box>
            );
          })}
        </Box>

        {upcoming.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Open slots to fill (today →) · weekends in gold</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {upcoming.slice(0, 24).map((d) => {
                const wknd = isWeekend(d.dow);
                return (
                  <Chip key={d.date} size="small" label={dateLabelShort(d.date) + (d.free === 2 ? ' ·2' : '')}
                    sx={{ fontWeight: wknd ? 700 : 500, bgcolor: wknd ? 'rgba(201,162,39,0.18)' : '#eef2f0', color: wknd ? '#8a6d12' : 'primary.main' }} />
                );
              })}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2.5, borderRadius: 2, p: 1.5, bgcolor: '#FBF7EC', border: '1px solid #EADFC0' }}>
          <Typography variant="overline" sx={{ color: '#8a6d12', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <LightbulbOutlined sx={{ fontSize: 15 }} /> Suggestions
          </Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2.5, gap: 0.75 }}>
            {tips.map((t, i) => <Typography key={i} component="li" sx={{ fontSize: 13.5 }}>{t}</Typography>)}
          </Stack>
        </Box>
      </Card>

      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>This month vs your monthly average</Typography>
      <KpiRow m={curM} data={data} bookingsLabel="Bookings" />
    </Box>
  );
}
