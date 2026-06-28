import { Card, Box, Typography, Chip, Stack, LinearProgress, Divider } from '@mui/material';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import type { AnalyticsData, DayCell } from '../types';
import { fmtINR, fmtFull, monthLabelLong, dateLabelShort, CLR, tgtLevel, isWeekend, TARGET_DEFAULT } from '../lib';
import { LeadTimeChart } from '../charts';

const pctOf = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ p: 2.5, mb: 3 }}>
      <Typography variant="overline" sx={{ color: 'secondary.dark', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        {icon} {title}
      </Typography>
      {children}
    </Card>
  );
}

export default function Insights({ data }: { data: AnalyticsData }) {
  const c = data.current;
  const lt = data.leadTime;
  const pace = data.pace;
  const target = data.revenueTarget || TARGET_DEFAULT;

  // ---- forecast (pace-based, fall back to linear) ----
  const naive = c.dayOfMonth ? Math.round((c.revenue / c.dayOfMonth) * c.daysInMonth) : c.revenue;
  const usePace = pace && pace.forecast.expected > 0 && pace.coverage >= 0.5;
  const forecast = usePace ? pace.forecast.expected : naive;
  const fLow = usePace ? pace.forecast.low : naive;
  const fHigh = usePace ? pace.forecast.high : naive;
  const gap = target - forecast;
  const pickup = Math.max(0, forecast - c.revenue);
  const fLevel = tgtLevel(pctOf(forecast, target));

  // ---- lead-time profile ----
  const within3 = pctOf((lt.buckets[0]?.count || 0) + (lt.buckets[1]?.count || 0), lt.sampleSize);
  const within7 = within3 + pctOf(lt.buckets[2]?.count || 0, lt.sampleSize);

  // ---- fill plan: classify the remaining open nights ----
  const byDay = new Map<number, DayCell>(c.days.map((d) => [d.day, d]));
  const upcoming = c.days.filter((d) => d.date >= c.today && d.free > 0);
  const openNights = upcoming.reduce((s, d) => s + d.free, 0);
  const weekendOpen = upcoming.filter((d) => isWeekend(d.dow));
  const weekendNights = weekendOpen.reduce((s, d) => s + d.free, 0);
  const orphans = upcoming.filter((d) => {
    const prev = byDay.get(d.day - 1), next = byDay.get(d.day + 1);
    return (!prev || prev.free === 0) && (!next || next.free === 0);
  });
  const blocks: DayCell[][] = [];
  let run: DayCell[] = [];
  for (let day = c.dayOfMonth; day <= c.daysInMonth; day++) {
    const d = byDay.get(day);
    if (d && d.free > 0) run.push(d);
    else { if (run.length >= 2) blocks.push(run); run = []; }
  }
  if (run.length >= 2) blocks.push(run);

  const directCh = data.channels.find((ch) => /direct/i.test(ch.name));
  const directShare = directCh ? pctOf(directCh.revenue, data.totals.revenue) : 0;

  // ---- action items (prioritized) ----
  const actions: React.ReactNode[] = [];
  if (gap > 0) actions.push(<>Tracking to finish <b>{fmtFull(forecast)}</b> — <b style={{ color: CLR.low }}>{fmtFull(gap)} short</b> of the {fmtINR(target)} target, with {c.daysRemaining} day{c.daysRemaining === 1 ? '' : 's'} of pickup left.</>);
  else actions.push(<>Tracking to <b style={{ color: CLR.good }}>beat the {fmtINR(target)} target</b> (~{fmtFull(forecast)}). Protect rate on the remaining nights.</>);
  actions.push(<><b>{within3}% of guests book within 3 days</b> (median {lt.median}-day lead) — open nights fill close-in, so keep OTA calendars open, reply on WhatsApp fast, and hold rate: demand comes late, pre-discounting leaves money on the table.</>);
  if (weekendNights > 0) actions.push(<><b>{weekendNights} weekend room-night{weekendNights === 1 ? '' : 's'}</b> open ({weekendOpen.slice(0, 3).map((d) => dateLabelShort(d.date)).join(', ')}) — your premium nights; fill first and consider a small uplift, they go quickest.</>);
  if (orphans.length > 0) actions.push(<><b>Lone open nights</b> ({orphans.slice(0, 4).map((d) => dateLabelShort(d.date)).join(', ')}) sit between booked nights — pitch as 1-night / transit / JIPMER-visit stays.</>);
  if (blocks.length > 0) actions.push(<><b>Open runs</b> ({blocks.map((b) => `${dateLabelShort(b[0].date)}–${dateLabelShort(b[b.length - 1].date)}`).join(', ')}) — pitch a multi-night or WFH / long-stay package.</>);
  if (directShare > 0) actions.push(<>Direct is <b>{directShare}% of revenue</b> at your best rate — push your WhatsApp number + NIVAA10 for these last nights before the OTAs take a cut.</>);
  if (usePace && pickup > 0) actions.push(<>History says <b>~{fmtFull(pickup)}</b> more typically books in the time you have left.</>);

  return (
    <Box>
      {/* ---- forecast ---- */}
      <Section icon={<TrendingUpRounded sx={{ fontSize: 16 }} />} title={`End-of-month forecast · ${monthLabelLong(c.month)}`}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '2rem', fontWeight: 600, color: CLR[fLevel] }}>{fmtFull(forecast)}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>likely finish · range {fmtINR(fLow)}–{fmtINR(fHigh)}</Typography>
          <Chip size="small" label={`${pctOf(forecast, target)}% of ${fmtINR(target)}`} sx={{ bgcolor: 'rgba(14,59,53,0.06)', fontWeight: 700 }} />
        </Box>
        <LinearProgress variant="determinate" value={Math.min(100, pctOf(forecast, target))}
          sx={{ height: 10, borderRadius: 999, bgcolor: '#eef0ee', '& .MuiLinearProgress-bar': { bgcolor: CLR[fLevel], borderRadius: 999 } }} />
        <Stack direction="row" flexWrap="wrap" sx={{ mt: 1.5, gap: { xs: 2, sm: 4 } }}>
          <Stat label="Booked so far" value={fmtFull(c.revenue)} />
          <Stat label="Still to book" value={`~${fmtFull(pickup)}`} />
          <Stat label={`% locked by day ${pace?.asOfDay ?? c.dayOfMonth}`} value={usePace ? `${pace.typicalPctByNow}%` : '—'} hint="typical, from history" />
          <Stat label="Days left" value={String(c.daysRemaining)} />
        </Stack>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
          {usePace
            ? `Pace-based forecast from ${pace.sampleMonths} months of booking history — by day ${pace.asOfDay} you've typically locked ${pace.typicalPctByNow}% of the month. (Naive linear projection would say ${fmtINR(naive)}.)`
            : `Linear projection (not enough booking-date history yet for a pace model).`}
        </Typography>
      </Section>

      {/* ---- lead-time profile ---- */}
      <Section icon={<ScheduleRounded sx={{ fontSize: 16 }} />} title="How far ahead guests book (lead time)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: 2.5, alignItems: 'center' }}>
          <Box sx={{ position: 'relative', height: 200 }}><LeadTimeChart buckets={lt.buckets} /></Box>
          <Box>
            <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '1.4rem', color: 'primary.main', mb: 0.5 }}>A last-minute business</Typography>
            <Typography sx={{ fontSize: 13.5, color: 'text.primary', mb: 1.5 }}>
              <b>{within3}%</b> of bookings arrive within <b>3 days</b> and <b>{within7}%</b> within a week — median lead just <b>{lt.median} days</b> (avg {lt.mean}). Based on {lt.sampleSize} bookings.
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              Open nights next week aren't a worry — they fill close-in. The edge is being instantly bookable and responsive in the final days, and holding rate rather than discounting early.
            </Typography>
          </Box>
        </Box>
      </Section>

      {/* ---- fill plan ---- */}
      <Section icon={<ChecklistRounded sx={{ fontSize: 16 }} />} title={`Fill ${monthLabelLong(c.month).split(' ')[0]} — action plan`}>
        {openNights === 0 ? (
          <Typography sx={{ fontSize: 14 }}>Every remaining night is booked 🙌 Nothing to chase — focus on next month.</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
              {openNights} room-night{openNights === 1 ? '' : 's'} open across {upcoming.length} day{upcoming.length === 1 ? '' : 's'} — prioritized by what moves the needle:
            </Typography>
            <Stack component="ol" sx={{ m: 0, pl: 2.5, gap: 1 }}>
              {actions.map((a, i) => <Typography key={i} component="li" sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{a}</Typography>)}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Open nights (today →) · weekends gold · ⚠ lone nights</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {upcoming.map((d) => {
                const wknd = isWeekend(d.dow);
                const orphan = orphans.includes(d);
                return (
                  <Chip key={d.date} size="small"
                    label={(orphan ? '⚠ ' : '') + dateLabelShort(d.date) + (d.free === 2 ? ' ·2' : '')}
                    sx={{ fontWeight: wknd ? 700 : 500, bgcolor: wknd ? 'rgba(201,162,39,0.18)' : '#eef2f0', color: wknd ? '#8a6d12' : 'primary.main' }} />
                );
              })}
            </Box>
          </>
        )}
      </Section>
    </Box>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '1.05rem', fontWeight: 600 }}>{value}</Typography>
      <Typography variant="overline" sx={{ fontSize: 9, color: 'text.secondary', display: 'block', lineHeight: 1.3 }}>{label}</Typography>
      {hint && <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontStyle: 'italic' }}>{hint}</Typography>}
    </Box>
  );
}
