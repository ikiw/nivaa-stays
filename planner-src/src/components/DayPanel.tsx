// The itinerary panel: when empty/browsing it shows the ready-made plan list; otherwise
// the live day — totals, day tabs, and the timeline (start → stops → back to start).
import { Fragment } from 'react';
import { Box, Stack, Button, Card, CardActionArea, Chip, Menu, MenuItem, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import ShareRounded from '@mui/icons-material/ShareRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import LightbulbOutlinedRounded from '@mui/icons-material/LightbulbOutlined';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import { CURATED } from '../curated';
import { LEG_COLORS, DAY_COLORS } from '../constants';
import { isPseudo, parseTime, fmtClock, mealTag, track } from '../utils';
import TimelineNode from './TimelineNode';
import type { TimelineNodeProps } from './TimelineNode';
import { PlanChips } from './Chips';
import type { Planner } from '../usePlanner';

type NodeProps = Omit<TimelineNodeProps, 'data' | 'setStay' | 'move' | 'removeAt' | 'selectPlace'>;

export default function DayPanel({ planner, hideBack }: { planner: Planner; hideBack?: boolean }) {
  const {
    data, start, startTime, endTime, stops, browsing, setBrowsing, loadedId, optimize, addBreak, isMobile,
    shareAnchor, setShareAnchor, moreAnchor, setMoreAnchor, shareWhatsApp, copyShareLink, gmapsUrl,
    setStops, setActiveDay, setLoadedId, planFilter, loadCurated, dayData, curDay, tripDays, tripDrive, tripKm,
    setStay, move, removeAt, selectPlace,
  } = planner;
  if (!data) return null;

  // Timeline row — rendering lives in TimelineNode; inject data + handlers.
  const Node = (props: NodeProps) => TimelineNode({ ...props, data, setStay, move, removeAt, selectPlace });

  const showList = !stops.length || browsing;          // browse the ready-made list (current plan kept)
  const loadedC = CURATED.find(c => c.id === loadedId);
  return (
    <Box>
      {!showList && (<>
        {!hideBack && <Button size="small" startIcon={<ArrowBackRounded />} onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ mb: 1, px: 0.6, color: 'text.secondary' }}>Itineraries</Button>}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          {!loadedId && <Button size="small" variant="outlined" startIcon={<RouteRounded />} disabled={stops.length < 2} onClick={optimize}>Optimize</Button>}
          <Button size="small" variant="outlined" startIcon={<SelfImprovementRounded />} onClick={addBreak}>Free time</Button>
          <Button size="small" variant="outlined" startIcon={<ShareRounded />} onClick={(e) => {
            if (isMobile && navigator.share) { navigator.share({ title: 'Pondicherry day plan', text: 'Check out this Pondicherry day plan ✨', url: window.location.href }).then(() => track('plan_share', { method: 'native' })).catch(() => {}); }
            else setShareAnchor(e.currentTarget);
          }}>Share</Button>
          <Button size="small" variant="outlined" color="inherit" startIcon={<MoreVertRounded />} onClick={(e) => setMoreAnchor(e.currentTarget)}>More</Button>
          <Menu anchorEl={shareAnchor} open={!!shareAnchor} onClose={() => setShareAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            <MenuItem onClick={shareWhatsApp}><WhatsApp sx={{ fontSize: 18, mr: 1, color: '#25D366' }} /> Share on WhatsApp</MenuItem>
            <MenuItem onClick={copyShareLink}><ContentCopyRounded sx={{ fontSize: 17, mr: 1 }} /> Copy link</MenuItem>
          </Menu>
          <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            <MenuItem component="a" href={gmapsUrl()} target="_blank" rel="noopener" onClick={() => { track('plan_open_maps', { stops: stops.filter(s => !isPseudo(s)).length }); setMoreAnchor(null); }}><OpenInNewRounded sx={{ fontSize: 17, mr: 1 }} /> Open in Google Maps</MenuItem>
            <MenuItem onClick={() => { track('plan_clear', {}); setStops([]); setActiveDay(1); setLoadedId(null); setBrowsing(false); setMoreAnchor(null); }}><DeleteOutlineRounded sx={{ fontSize: 17, mr: 1 }} /> Clear itinerary</MenuItem>
          </Menu>
        </Stack>
        {loadedC?.why && (
          <Box sx={{ display: 'flex', gap: 0.9, p: 1.1, mb: 1.5, borderRadius: '10px', bgcolor: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)' }}>
            <LightbulbOutlinedRounded sx={{ fontSize: 18, color: 'secondary.main', mt: '1px', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>Why this order — </Box>{loadedC.why}
            </Typography>
          </Box>
        )}
      </>)}
      {showList
        ? (
          <Box sx={{ pt: 0.5 }}>
            {browsing && stops.length > 0 && (
              <Button size="small" startIcon={<ArrowBackRounded />} onClick={() => setBrowsing(false)} sx={{ mb: 1, px: 0.6 }}>Back to your itinerary</Button>
            )}
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>Start from a ready-made plan</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.1 }}>Pick a trip — tap to load, then tweak it your way.</Typography>
            {isMobile && <Box sx={{ mb: 1.4 }}><PlanChips planner={planner} /></Box>}
            {([[1, '1-Day Itineraries'], [2, '2-Day Itineraries']] as [number, string][]).filter(([len]) => planFilter === 'all' || planFilter === len).map(([len, label]) => (
              <Box key={len} sx={{ mb: 1.5 }}>
                {planFilter === 'all' && <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 0.7 }}>{label}</Typography>}
                <Stack spacing={1}>
                  {CURATED.filter(c => c.plan.length === len).map(c => {
                    const count = c.plan.reduce((a, d) => a + d.length, 0);
                    return (
                      <Card key={c.id} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.10)', transition: 'border-color .15s ease, box-shadow .15s ease', '&:hover': { borderColor: 'secondary.main', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' } }}>
                        <CardActionArea onClick={() => loadCurated(c)} sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(251,191,36,0.16)', color: 'secondary.main' }}>
                            <RouteRounded sx={{ fontSize: 20 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.cohort}</Typography>
                            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{c.tag} · {count} stops</Typography>
                          </Box>
                          <ChevronRightRounded sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )
        : (() => {
            const d = dayData.find(x => x.day === curDay) || dayData[0];
            const over = Math.round(d.clock) - parseTime(endTime);
            return (<>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25, fontSize: '0.82rem', flexWrap: 'wrap' }} useFlexGap>
                <span><b>{stops.filter(s => !isPseudo(s)).length}</b> stops{tripDays.length > 1 ? ` · ${tripDays.length} days` : ''}</span>
                <span><DirectionsCarRounded sx={{ fontSize: 15, verticalAlign: '-3px' }} /> <b>{tripDrive} min</b> · {tripKm.toFixed(1)} km</span>
              </Stack>
              {tripDays.length > 1 && (
                <ToggleButtonGroup exclusive fullWidth size="small" value={curDay} onChange={(_, v) => { if (v) { setActiveDay(v); track('day_switch', { day: v }); } }} sx={{ mb: 1.25 }}>
                  {tripDays.map(dn => (
                    <ToggleButton key={dn} value={dn} sx={{ fontWeight: 700, py: 0.55 }}>
                      <Box component="span" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: DAY_COLORS[(dn - 1) % DAY_COLORS.length], mr: 0.8 }} /> Day {dn}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, fontSize: '0.8rem', color: 'text.secondary', flexWrap: 'wrap' }} useFlexGap>
                <span>{d.drive} min · {d.km.toFixed(1)} km</span>
                <span>back <b style={{ color: '#ECEDEE' }}>{fmtClock(d.clock)}</b></span>
                <Chip size="small" variant="outlined" color={over > 0 ? 'warning' : 'success'} label={over > 0 ? `over by ${Math.floor(over / 60) ? Math.floor(over / 60) + 'h ' : ''}${over % 60}m` : 'fits'} />
              </Stack>
              {!d.tl.length
                ? <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', py: 1.5, textAlign: 'center' }}>No stops on Day {d.day} yet — add places.</Typography>
                : (<>
                    {Node({ icon: FlagRounded, title: data.places[start].name, sub: `Depart ${fmtClock(parseTime(startTime))}`, dot: 'S',
                      legColor: LEG_COLORS[0], drive: `${d.tl[0].dm} min · ${d.tl[0].dk} km` })}
                    {(() => { let rn = 0; return d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      const legColor = lastStop ? '#64748B' : LEG_COLORS[(ti + 1) % LEG_COLORS.length];
                      const drive = lastStop ? `${d.rMin} min · ${d.rKm} km · back to start` : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                      if (t.brk || t.meal) return <Fragment key={t.gi}>{Node({ gi: t.gi, brk: t.brk, meal: t.meal, sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay, day: d.day, upDisabled: ti === 0, downDisabled: lastStop, legColor, drive })}</Fragment>;
                      rn++;
                      const place = data.places[t.idx!];
                      return <Fragment key={t.gi}>{Node({
                        idx: t.idx, gi: t.gi, dot: rn, title: place.name, cat: place.cat, day: d.day,
                        tag: mealTag(place.cat, t.arrive),
                        sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay,
                        upDisabled: ti === 0, downDisabled: lastStop, legColor, drive,
                      })}</Fragment>;
                    }); })()}
                    {Node({ icon: FlagRounded, title: `Back at ${data.places[start].name}`, sub: `Arrive ${fmtClock(d.clock)}`, dot: 'S', last: true })}
                  </>)}
            </>);
          })()}
    </Box>
  );
}
