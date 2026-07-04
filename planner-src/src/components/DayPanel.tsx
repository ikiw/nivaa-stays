// The itinerary panel: when empty/browsing it shows the ready-made plan list; otherwise
// the live day — totals, day tabs, and the timeline (start → stops → back to start).
import { Fragment, useState } from 'react';
import { Box, Stack, Button, Menu, MenuItem, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import ShareRounded from '@mui/icons-material/ShareRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import NotesRounded from '@mui/icons-material/NotesRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import LightbulbOutlinedRounded from '@mui/icons-material/LightbulbOutlined';
import FlagRounded from '@mui/icons-material/FlagRounded';
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import { CURATED } from '../curated';
import { ROUTE_HEX, DAY_COLORS } from '../constants';
import { isPseudo, parseTime, fmtClock, mealTagsForDay, weatherAtHour, track } from '../utils';
import TimelineNode from './TimelineNode';
import type { TimelineNodeProps } from './TimelineNode';
import type { Planner } from '../usePlanner';
import { HERO_IMAGE, coverFor } from './landing/shared';
import { ACCENT, ACCENT_INK, accentBorder, accentSoftBg, activeRailBg, cardBg, mutedColor, panelBorder, softBorder, titleColor } from '../theme/surfaces';

type NodeProps = Omit<TimelineNodeProps, 'data' | 'setStay' | 'move' | 'removeAt' | 'selectPlace'>;

export default function DayPanel({ planner, hideBack }: { planner: Planner; hideBack?: boolean }) {
  const {
    data, start, startTime, endTime, stops, browsing, setBrowsing, loadedId, optimize, addBreak, isMobile,
    shareAnchor, setShareAnchor, moreAnchor, setMoreAnchor, shareWhatsApp, copyShareLink, copyPlanText, gmapsUrl,
    setStops, setActiveDay, setLoadedId, planFilter, loadCurated, dayData, curDay, tripDays, tripDrive, tripKm,
    setStay, move, removeAt, selectPlace, selectedIdx, switchView, weather,
  } = planner;
  const [routeInsightOpen, setRouteInsightOpen] = useState(false);
  if (!data) return null;

  // Timeline row — rendering lives in TimelineNode; inject data + handlers.
  const renderNode = (props: NodeProps) => <TimelineNode {...props} isMobile={isMobile} data={data} setStay={setStay} move={move} removeAt={removeAt} selectPlace={selectPlace} />;

  const showList = !stops.length || browsing;          // browse the ready-made list (current plan kept)
  const loadedC = CURATED.find(c => c.id === loadedId);
  if (showList) return null;                          // list/landing is owned by App (PlannerLanding/MobileLanding)
  const realStopCount = stops.filter(s => !isPseudo(s)).length;
  const activeDaySummary = dayData.find(x => x.day === curDay) || dayData[0];
  const routeInsight = loadedC?.why ? loadedC.why.split('. ').slice(0, 1).join('. ').replace(/\.$/, '') + '.' : '';
  const cover = loadedC ? (isMobile ? HERO_IMAGE : coverFor(loadedC.cohort, data, loadedC)) : null;
  return (
    <Box>
      {!showList && (<>
        {!hideBack && isMobile && <Button size="small" startIcon={<ArrowBackRounded />} onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ mb: 1, px: 0.6, color: 'text.secondary' }}>Itineraries</Button>}
        <Box sx={{ p: { xs: 1.2, md: 1.4 }, mb: 1.05, borderRadius: { xs: '16px', md: '14px' }, border: `1px solid ${softBorder}`,
          background: cardBg, overflow: 'hidden', position: 'relative',
          boxShadow: '0 16px 42px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
          ...(isMobile && cover ? {
            minHeight: 112,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundImage: `linear-gradient(90deg, rgba(9,13,20,0.95) 0%, rgba(9,13,20,0.78) 45%, rgba(9,13,20,0.18) 100%), url(${cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 0, flex: '1 1 190px' }}>
              <Typography sx={{ fontFamily: isMobile ? '"Playfair Display", serif' : undefined, fontWeight: 900, fontSize: { xs: '1.45rem', md: '1.18rem' }, letterSpacing: '-0.02em', color: isMobile && cover ? '#fff' : titleColor, lineHeight: 1.05 }}>
                {isMobile ? `Day ${curDay}` : loadedC ? loadedC.cohort : 'Your Pondicherry itinerary'}
              </Typography>
              <Typography sx={{ mt: 0.35, color: isMobile && cover ? 'rgba(245,240,228,0.66)' : mutedColor, fontSize: '0.78rem', lineHeight: 1.35, display: { xs: 'none', md: 'block' } }}>
                {realStopCount} stops · {tripDays.length || 1} day{(tripDays.length || 1) > 1 ? 's' : ''} · {tripDrive} min drive · {tripKm.toFixed(1)} km
              </Typography>
              {activeDaySummary && (
                <Typography sx={{ mt: { xs: 0.55, md: 0.3 }, color: { xs: isMobile && cover ? 'rgba(245,240,228,0.78)' : mutedColor, md: mutedColor }, fontSize: { xs: '0.78rem', md: '0.76rem' }, lineHeight: 1.35, fontWeight: { xs: 750, md: 500 } }}>
                  Day {curDay} · {activeDaySummary.drive} min drive · {activeDaySummary.km.toFixed(1)} km · ends by {fmtClock(activeDaySummary.clock)}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexShrink: 0, flexWrap: 'wrap', display: { xs: 'none', md: 'flex' } }}>
              <Button size="small" variant="contained" disableElevation onClick={() => switchView('places')} sx={{ px: 1.3, minHeight: 34, fontWeight: 900, textTransform: 'none', bgcolor: ACCENT, color: ACCENT_INK, borderRadius: '10px', boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 8px 18px rgba(230,195,90,0.16)', '&:hover': { bgcolor: ACCENT } }}>Customize</Button>
              <Button size="small" variant="outlined" startIcon={<ShareRounded />} onClick={(e) => {
                if (isMobile && navigator.share) { navigator.share({ title: 'Pondicherry day plan', text: 'Check out this Pondicherry day plan ✨', url: window.location.href }).then(() => track('plan_share', { method: 'native' })).catch(() => {}); }
                else setShareAnchor(e.currentTarget);
              }} sx={{ px: 1.05, minHeight: 34, textTransform: 'none', borderColor: accentBorder, color: ACCENT, borderRadius: '10px', fontWeight: 800, bgcolor: accentSoftBg }}>Share</Button>
              <Button size="small" variant="outlined" color="inherit" startIcon={<MoreVertRounded />} onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ px: 1.05, minHeight: 34, textTransform: 'none', borderColor: panelBorder, color: titleColor, borderRadius: '10px', fontWeight: 800 }}>Trip</Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.8} sx={{ display: { xs: 'flex', md: 'none' }, mt: 1.15 }}>
            <Button size="small" variant="outlined" startIcon={<ShareRounded />} onClick={(e) => {
              if (navigator.share) { navigator.share({ title: 'Pondicherry day plan', text: 'Check out this Pondicherry day plan ✨', url: window.location.href }).then(() => track('plan_share', { method: 'native' })).catch(() => {}); }
              else setShareAnchor(e.currentTarget);
            }} sx={{ minHeight: 34, px: 1.15, textTransform: 'none', borderColor: 'rgba(230,195,90,0.24)', color: '#E6C35A', borderRadius: '10px', fontWeight: 850, bgcolor: 'rgba(0,0,0,0.22)' }}>Share</Button>
            <Button size="small" variant="outlined" color="inherit" startIcon={<MoreVertRounded />} onClick={(e) => setMoreAnchor(e.currentTarget)}
              sx={{ minHeight: 34, px: 1.15, textTransform: 'none', borderColor: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.9)', borderRadius: '10px', fontWeight: 850, bgcolor: 'rgba(0,0,0,0.18)' }}>Trip</Button>
          </Stack>
          <Menu anchorEl={shareAnchor} open={!!shareAnchor} onClose={() => setShareAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            <MenuItem onClick={shareWhatsApp}><WhatsApp sx={{ fontSize: 18, mr: 1, color: '#25D366' }} /> Share on WhatsApp</MenuItem>
            <MenuItem onClick={copyShareLink}><ContentCopyRounded sx={{ fontSize: 17, mr: 1 }} /> Copy link</MenuItem>
            <MenuItem onClick={copyPlanText}><NotesRounded sx={{ fontSize: 18, mr: 1 }} /> Copy as text</MenuItem>
          </Menu>
          <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            {!loadedId && <MenuItem disabled={stops.length < 2} onClick={() => { optimize(); setMoreAnchor(null); }}><RouteRounded sx={{ fontSize: 17, mr: 1 }} /> Optimize route</MenuItem>}
            <MenuItem onClick={() => { addBreak(); setMoreAnchor(null); }}><SelfImprovementRounded sx={{ fontSize: 17, mr: 1 }} /> Add free time</MenuItem>
            <MenuItem component="a" href={gmapsUrl()} target="_blank" rel="noopener" onClick={() => { track('plan_open_maps', { stops: stops.filter(s => !isPseudo(s)).length }); setMoreAnchor(null); }}><OpenInNewRounded sx={{ fontSize: 17, mr: 1 }} /> Open in Google Maps</MenuItem>
            {isMobile && <MenuItem onClick={copyPlanText}><NotesRounded sx={{ fontSize: 17, mr: 1 }} /> Copy as text</MenuItem>}
            <MenuItem onClick={() => { track('plan_clear', {}); setStops([]); setActiveDay(1); setLoadedId(null); setBrowsing(false); setMoreAnchor(null); }}><DeleteOutlineRounded sx={{ fontSize: 17, mr: 1 }} /> Clear itinerary</MenuItem>
          </Menu>
        </Box>
      </>)}
      {(() => {
            const d = dayData.find(x => x.day === curDay) || dayData[0];
            return (<>
              {tripDays.length > 1 && (
                <ToggleButtonGroup exclusive fullWidth size="small" value={curDay} onChange={(_, v) => { if (v) { setActiveDay(v); track('day_switch', { day: v }); } }} sx={{ mb: 1.05, p: 0.35, borderRadius: '14px', border: `1px solid ${panelBorder}`, bgcolor: activeRailBg,
                  '& .MuiToggleButton-root': { border: 0, borderRadius: '10px !important', color: 'text.secondary', fontWeight: 900, position: 'relative' },
                  '& .Mui-selected': { color: `${ACCENT} !important`, bgcolor: `${accentSoftBg} !important`, boxShadow: `inset 0 0 0 1px ${accentBorder}` },
                  '& .Mui-selected::after': { content: '""', position: 'absolute', left: '44%', right: '44%', bottom: 0, height: 2, borderRadius: 999, bgcolor: ACCENT, boxShadow: `0 0 14px ${ACCENT}` } }}>
                  {tripDays.map(dn => {
                    const DayIcon = dn === 1 ? WbSunnyRounded : DarkModeRounded;
                    return (
                      <ToggleButton key={dn} value={dn} sx={{ fontWeight: 700, py: 0.55 }}>
                        <DayIcon sx={{ fontSize: 16, mr: 0.65, color: curDay === dn ? ACCENT : DAY_COLORS[(dn - 1) % DAY_COLORS.length] }} /> Day {dn}
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              )}
              {loadedC?.why && (
                <Box sx={{ display: 'flex', gap: 0.85, p: { xs: 1.15, md: 1 }, mb: 1.05, borderRadius: '12px', bgcolor: accentSoftBg, border: `1px solid ${accentBorder}` }}>
                  <LightbulbOutlinedRounded sx={{ fontSize: 18, color: ACCENT, mt: '1px', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ color: titleColor, fontWeight: 850, fontSize: '0.86rem', lineHeight: 1.25 }}>Why this route works</Typography>
                      <KeyboardArrowDownRounded sx={{ fontSize: 18, color: 'text.secondary', transform: routeInsightOpen ? 'rotate(180deg)' : 'none', transition: 'transform .12s' }} />
                    </Stack>
                    <Typography sx={{ mt: 0.35, fontSize: '0.76rem', color: 'text.secondary', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: routeInsightOpen ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {routeInsightOpen ? loadedC.why : routeInsight}
                    </Typography>
                    <Button size="small" onClick={() => setRouteInsightOpen(v => !v)} sx={{ mt: 0.25, px: 0, minWidth: 0, color: ACCENT, textTransform: 'none', fontWeight: 850 }}>
                      {routeInsightOpen ? 'Show less' : 'Read more'}
                    </Button>
                  </Box>
                </Box>
              )}
              {!d.tl.length
                ? <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', py: 1.5, textAlign: 'center' }}>No stops on Day {d.day} yet — add places.</Typography>
                : (<>
                    {renderNode({ icon: FlagRounded, title: data.places[start].name, sub: `Depart ${fmtClock(parseTime(startTime))}`, dot: 'S',
                      legColor: ROUTE_HEX, drive: `${d.tl[0].dm} min · ${d.tl[0].dk} km`, wx: weatherAtHour(weather, parseTime(startTime)), readOnly: true, active: selectedIdx === start })}
                    {(() => { let rn = 0; const dayTags = mealTagsForDay(d.tl.map(e => ({ cat: e.idx != null ? data.places[e.idx].cat : '', arrive: e.arrive }))); return d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      const legColor = lastStop ? '#64748B' : ROUTE_HEX;
                      const drive = lastStop ? `${d.rMin} min · ${d.rKm} km · back to start` : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                      if (t.brk || t.meal) return <Fragment key={t.gi}>{renderNode({ gi: t.gi, brk: t.brk, meal: t.meal, sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay, day: d.day, upDisabled: ti === 0, downDisabled: lastStop, legColor, drive, wx: weatherAtHour(weather, t.arrive), readOnly: true })}</Fragment>;
                      rn++;
                      const place = data.places[t.idx!];
                      return <Fragment key={t.gi}>{renderNode({
                        idx: t.idx, gi: t.gi, dot: rn, title: place.name, cat: place.cat, day: d.day,
                        tag: dayTags[ti],
                        sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay,
                        upDisabled: ti === 0, downDisabled: lastStop, legColor, drive,
                        wx: weatherAtHour(weather, t.arrive),
                        readOnly: true,
                        active: selectedIdx === t.idx,
                      })}</Fragment>;
                    }); })()}
                    {renderNode({ icon: FlagRounded, title: `Back at ${data.places[start].name}`, sub: `Arrive ${fmtClock(d.clock)}`, dot: 'S', last: true, readOnly: true, active: selectedIdx === start })}
                  </>)}
            </>);
          })()}
    </Box>
  );
}
