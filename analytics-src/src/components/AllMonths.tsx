import { Card, Box, Typography, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import type { AnalyticsData } from '../types';
import { fmtINR, fmtFull, monthLabel, CLR, occLevel, tgtLevel, TARGET_DEFAULT } from '../lib';
import { RevenueChart, ChannelChart } from '../charts';
import { KpiCard } from './Kpis';

export default function AllMonths({ data }: { data: AnalyticsData }) {
  const t = data.totals, p = data.payments, r = data.repeat, w = data.weekday, rs = data.roomSplit;
  const wkTot = w.weekday + w.weekend;
  const wkPct = wkTot ? Math.round((w.weekend / wkTot) * 100) : 0;
  const roomStr = Object.keys(rs).sort().map((k) => `Room ${k}: ${rs[k]}`).join(' · ') || '—';
  const target = data.revenueTarget || TARGET_DEFAULT;
  const rows = data.months.slice().reverse();

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2.5, mb: 3 }}>
        <Card sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Revenue &amp; occupancy</Typography>
          <Box sx={{ position: 'relative', height: 300, mt: 1 }}><RevenueChart months={data.months} /></Box>
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Channel mix (revenue)</Typography>
          <Box sx={{ position: 'relative', height: 300, mt: 1 }}><ChannelChart channels={data.channels} /></Box>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        <KpiCard label="Repeat guests" value={r.rate + '%'} sub={`${r.returning} of ${r.guests} returned`} />
        <KpiCard label="Avg stay" value={t.alos + ' nights'} sub={`avg party ${t.avgGuests} guests`} />
        <KpiCard label="Weekend share" value={wkPct + '%'} sub={`${w.weekend} wknd / ${w.weekday} wkday nts`} />
        <KpiCard label="Advance pending" value={fmtINR(p.pending)} sub={`collected ${fmtINR(p.collected)} of ${fmtINR(p.revenue)}`} valueColor={p.pending ? CLR.low : CLR.good} />
        <Card sx={{ gridColumn: { xs: 'span 2', md: 'span 4' }, p: 1.5, px: 2 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5 }}>
            <span><b style={{ color: '#0E3B35' }}>All-time:</b> {t.bookings} bookings · {t.nights} room-nights · {fmtFull(t.revenue)}</span>
            <span><b style={{ color: '#0E3B35' }}>Room split:</b> {roomStr}</span>
          </Typography>
        </Card>
      </Box>

      <Card sx={{ p: 2, overflowX: 'auto' }}>
        <Typography variant="overline" color="text.secondary">Month by month</Typography>
        <Table size="small" sx={{ mt: 1, '& td, & th': { borderColor: 'rgba(14,59,53,0.08)' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Bk</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Nights</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Occ</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>ADR</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>RevPAR</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((m) => {
              const revPct = Math.round((m.revenue / target) * 100);
              return (
                <TableRow key={m.month} hover>
                  <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{monthLabel(m.month)}</TableCell>
                  <TableCell align="right">{m.bookings}</TableCell>
                  <TableCell align="right">{m.nights}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: CLR[occLevel(m.occupancy)] }}>{m.occupancy}%</TableCell>
                  <TableCell align="right">{fmtINR(m.adr)}</TableCell>
                  <TableCell align="right">{fmtINR(m.revpar)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: CLR[tgtLevel(revPct)] }}>{fmtFull(m.revenue)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
