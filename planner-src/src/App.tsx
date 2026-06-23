import { Fragment } from 'react';
import { Box, Stack, Paper, Card, CardActionArea, Chip, Button, IconButton, MenuItem, Typography, BottomNavigation, BottomNavigationAction, Snackbar, CircularProgress, ToggleButton, ToggleButtonGroup, Collapse, Menu, Dialog, DialogContent } from '@mui/material';

import FlagRounded from '@mui/icons-material/FlagRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import LightbulbOutlinedRounded from '@mui/icons-material/LightbulbOutlined';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import ShareRounded from '@mui/icons-material/ShareRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import InfoOutlinedRounded from '@mui/icons-material/InfoOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Map } from '@vis.gl/react-google-maps';

// ---- planner modules (extracted from this file; behaviour unchanged) ----
import { CAT_ICON, CAT_HEX, LEG_COLORS, CAT_LABEL, PICK_ORDER, SUB_ORDER, SUB_LABEL, DAY_COLORS } from './constants';
import { isPseudo, parseTime, fmtClock, mealTag, track } from './utils';
import { CURATED } from './curated';
import AboutPanel from './components/AboutPanel';
import RouteMap from './components/RouteMap';
import PlaceInfoCard from './components/PlaceInfoCard';
import { GlanceRow, Centered, Grid, CatHead } from './components/Bits';
import { computeSchedule } from './scheduler';
import TimelineNode from './components/TimelineNode';
import type { TimelineNodeProps } from './components/TimelineNode';
import Brand from './components/Brand';
import AiBar from './components/AiBar';
import Controls from './components/Controls';
import PlaceCard from './components/PlaceCard';
import type { ReactNode, TouchEvent } from 'react';
import type { PlaceStop, Category } from './types';
import { usePlanner } from './usePlanner';
/** The row-field subset App passes to the timeline (handlers/data are injected by the Node wrapper). */
type NodeProps = Omit<TimelineNodeProps, 'data' | 'setStay' | 'move' | 'removeAt' | 'selectPlace'>;

export default function App() {
  const {
    isMobile, data, err, start, setStart, startTime, setStartTime, endTime, setEndTime, stops, setStops, activeDay, setActiveDay, loadedId, setLoadedId, filter, setFilter, subFilter, setSubFilter, planFilter, setPlanFilter, browsing, setBrowsing, collapsed, toggleCat, shareAnchor, setShareAnchor, moreAnchor, setMoreAnchor, selectedIdx, setSelectedIdx, mobView, setMobView, itinView, setItinView, aboutOpen, setAboutOpen, deskTab, aiQuery, setAiQuery, aiBusy, snack, setSnack, mapActive, setMapActive, touchStartX, openView, selectPlace, driveMin, driveKm, isStop, starts, byCat, touched, addToggle, removeAt, addBreak, move, setStay, optimize, gmapsUrl, loadCurated, shareWhatsApp, copyShareLink, aiPlan,
  } = usePlanner();

  if (err) return <Centered>Could not load the places data. Please refresh.</Centered>;
  if (!data) return <Centered><CircularProgress /></Centered>;

  // ---------- timeline computation (extracted to scheduler.js; each day loops from start) ----------
  const { tripDays, dayData, tripDrive, tripKm } = computeSchedule(stops, start, startTime, driveMin, driveKm);
  const curDay = tripDays.includes(activeDay) ? activeDay : tripDays[0];   // active day tab
  const mapStops = stops.filter((s): s is PlaceStop => !isPseudo(s) && (s.day || 1) === curDay);   // map shows only the active day's real stops

  // ---------- render helpers ----------
  const categoryChips = () => {
    const rows: [string, string, number][] = [
      ['All', 'All places', Object.values(byCat).reduce((a, b) => a + b.length, 0)],
      ...PICK_ORDER.filter(c => byCat[c]).map((c): [string, string, number] => [c, CAT_LABEL[c] || c, byCat[c].length]),
    ];
    return (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {rows.map(([key, label, n]) => {
        const Icon = key === 'All' ? null : CAT_ICON[key as Category];
        return (
          <Chip key={key} label={`${label} ${n}`} icon={Icon ? <Icon /> : undefined} size="small"
            color={filter === key ? 'primary' : 'default'} variant={filter === key ? 'filled' : 'outlined'}
            onClick={() => { setFilter(key); setSubFilter('All'); }} sx={{ fontWeight: 600 }} />
        );
      })}
    </Stack>
    );
  };
  const planChips = () => {
    const opts: [string | number, string][] = [['all', 'All'], [1, '1 Day Itinerary'], [2, '2 Day Itinerary']];
    return (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {opts.map(([key, label]) => (
        <Chip key={key} label={label} size="small"
          color={planFilter === key ? 'primary' : 'default'} variant={planFilter === key ? 'filled' : 'outlined'}
          onClick={() => setPlanFilter(key)} sx={{ fontWeight: 600 }} />
      ))}
    </Stack>
    );
  };
  const subChips = () => {
    const subOrder = SUB_ORDER[filter];
    if (!subOrder) return null;
    const counts: Record<string, number> = {}; (byCat[filter] || []).forEach(i => { const sub = data.places[i].sub || ''; counts[sub] = (counts[sub] || 0) + 1; });
    const subs = subOrder.filter(s => counts[s]).concat(Object.keys(counts).filter(s => s && !subOrder.includes(s)));
    const rows: [string, string, number][] = [['All', 'All', Object.values(counts).reduce((a, b) => a + b, 0)], ...subs.map((s): [string, string, number] => [s, SUB_LABEL[s] || s, counts[s]])];
    return (
      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
        {rows.map(([key, label, n]) => (
          <Chip key={key} label={`${label} ${n}`} size="small" onClick={() => setSubFilter(key)}
            color={subFilter === key ? 'primary' : 'default'} variant={subFilter === key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
        ))}
      </Stack>
    );
  };

  const placeCard = (i: number) => (
    <PlaceCard key={i} place={data.places[i]} added={isStop(i)} dm={driveMin(start, i)} dk={driveKm(start, i)} onToggle={() => addToggle(i)} />
  );

  const PlacesPanel = () => {
    const cats = filter === 'All' ? PICK_ORDER : PICK_ORDER.filter(c => c === filter);
    return (
      <Box>
        {cats.map(cat => {
          const items = byCat[cat]; if (!items) return null;
          const collapsible = filter === 'All';
          const isCollapsed = collapsible && collapsed.has(cat);
          const inner: ReactNode[] = [];
          const subOrder = SUB_ORDER[cat];
          if (subOrder) {
            const bySub: Record<string, number[]> = {}; items.forEach(i => { const s = data.places[i].sub || ''; (bySub[s] = bySub[s] || []).push(i); });
            let subs = subOrder.filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !subOrder.includes(s)));
            const single = filter === cat && subFilter !== 'All';
            if (single) subs = subs.filter(s => s === subFilter);
            subs.forEach(s => {
              if (s && !single) inner.push(<Typography key={cat + s} sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', mt: 1, mb: 0.5 }}>{SUB_LABEL[s] || s}</Typography>);
              inner.push(<Grid key={cat + s + 'g'}>{bySub[s].map(placeCard)}</Grid>);
            });
          } else {
            inner.push(<Grid key={cat + 'g'}>{items.map(placeCard)}</Grid>);
          }
          return (
            <Box key={cat} sx={{ mb: 1.5 }}>
              {collapsible
                ? <CatHead cat={cat} count={items.length} collapsed={isCollapsed} onToggle={() => toggleCat(cat)} />
                : null}
              {collapsible
                ? <Collapse in={!isCollapsed} timeout="auto" unmountOnExit><Box sx={{ mt: 0.6 }}>{inner}</Box></Collapse>
                : <Box>{inner}</Box>}
            </Box>
          );
        })}
      </Box>
    );
  };

  const DayPanel = ({ hideBack }: { hideBack?: boolean } = {}) => {
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
            {isMobile && <Box sx={{ mb: 1.4 }}>{planChips()}</Box>}
            {[[1, '1-Day Itineraries'], [2, '2-Day Itineraries']].filter(([len]) => planFilter === 'all' || planFilter === len).map(([len, label]) => (
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
  };

  // Timeline row — rendering lives in components/TimelineNode.tsx; inject App data + handlers.
  const Node = (props: NodeProps) => TimelineNode({ ...props, data, setStay, move, removeAt, selectPlace });

  const MapView = () => (
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: '#0d0d10' }}>
      {mapActive ? (
        <>
          <RouteMap data={data} start={start} stops={mapStops} selected={selectedIdx} onSelect={setSelectedIdx} />
          {!stops.length && (
            <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2, px: 2, py: 1, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(18,20,26,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)', color: 'text.secondary', fontSize: '0.85rem', maxWidth: 'calc(100% - 32px)', pointerEvents: 'none' }}>
              <PlaceRounded sx={{ fontSize: 18, flexShrink: 0 }} /> Add places to start building your itinerary.
            </Paper>
          )}
        </>
      ) : (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: { xs: 2.5, md: 3.5 },
          backgroundImage: 'linear-gradient(0deg, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.35) 38%, rgba(10,10,12,0) 70%), url(/images/pondy-planner-bg.avif)',
          backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <MapRounded sx={{ fontSize: 20, color: 'primary.light' }} /> {isMobile ? 'Pick places to map your day' : 'Your live map appears here'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.4 }}>
                Add a place or ask the planner — the map and driving route load the moment you start.
              </Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<MapRounded />} onClick={() => setMapActive(true)} sx={{ flexShrink: 0 }}>Load map now</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    const loadedC = CURATED.find(c => c.id === loadedId);
    const showList = !stops.length || browsing;          // browsing the ready-made list
    const planView = mobView === 'itinerary' && !showList; // a loaded plan is on screen
    const swipeDays = (e: TouchEvent) => {                            // swipe left/right between Day 1 / Day 2
      const x0 = touchStartX.current; touchStartX.current = null;
      if (x0 == null || tripDays.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) < 60) return;
      const i = tripDays.indexOf(curDay);
      const ni = dx < 0 ? Math.min(tripDays.length - 1, i + 1) : Math.max(0, i - 1);
      if (ni !== i) { setActiveDay(tripDays[ni]); track('day_switch', { day: tripDays[ni] }); }
    };
    return (
      <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {planView ? (
          // ---- sticky plan header: back + customize + name + Timeline/Map toggle ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 8px)', pb: 1, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 40 }}>
              <IconButton onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ ml: -1, color: 'text.primary' }} aria-label="Back to itineraries"><ArrowBackRounded /></IconButton>
              <Typography sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', maxWidth: '54%', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loadedC ? loadedC.cohort : 'Your itinerary'}</Typography>
              <Button size="small" startIcon={<TuneRounded />} onClick={() => openView('places')} sx={{ ml: 'auto', px: 0.6 }}>Customize</Button>
            </Box>
            <ToggleButtonGroup exclusive fullWidth size="small" value={itinView} onChange={(_, v) => { if (v) { setItinView(v); if (v === 'map') setMapActive(true); } }} sx={{ mt: 0.8 }}>
              <ToggleButton value="timeline" sx={{ fontWeight: 700, py: 0.4 }}><CalendarMonthRounded sx={{ fontSize: 17, mr: 0.6 }} /> Timeline</ToggleButton>
              <ToggleButton value="map" sx={{ fontWeight: 700, py: 0.4 }}><MapRounded sx={{ fontSize: 17, mr: 0.6 }} /> Map</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ) : (
          // ---- itinerary list / places: brand + AI prompt (+ start/window only on Places) ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 8px)', flexShrink: 0 }}>
            <Box sx={{ mb: 1 }}>{<Brand />}</Box>
            {mobView !== 'about' && <Box sx={{ mb: 1 }}>{<AiBar isMobile={isMobile} query={aiQuery} setQuery={setAiQuery} onPlan={aiPlan} busy={aiBusy} />}</Box>}
            {mobView === 'places' && <Box sx={{ mb: 0.5 }}>{<Controls start={start} startTime={startTime} endTime={endTime} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} />}</Box>}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobView === 'about' ? null : mobView === 'places' ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{PlacesPanel()}</Box>
          ) : planView && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{MapView()}</Box>
          ) : (
            <Box onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={swipeDays}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{DayPanel({ hideBack: true })}</Box>
          )}
          {/* About — always mounted (in the DOM for crawlers), shown only when its tab is active */}
          <Box sx={{ display: mobView === 'about' ? 'block' : 'none', flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{AboutPanel()}</Box>
        </Box>
        {planView && selectedIdx != null && data.places[selectedIdx] && (
          <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} isMobile
            onShowOnMap={() => { setItinView('map'); setMapActive(true); }} />
        )}
        <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', pb: 'env(safe-area-inset-bottom)' }}>
          <BottomNavigation showLabels value={mobView}
            onChange={(_, v) => { if (!v) return; if (v === 'about') setMobView('about'); else if (v === 'itinerary') { setBrowsing(false); openView('day'); } else openView('places'); }} sx={{ bgcolor: 'transparent' }}>
            <BottomNavigationAction value="itinerary" label={`Itinerary${stops.length ? ` (${stops.filter(s => !isPseudo(s)).length})` : ''}`} icon={<CalendarMonthRounded />} />
            <BottomNavigationAction value="places" label="Places" icon={<PlaceRounded />} />
            <BottomNavigationAction value="about" label="About" icon={<InfoOutlinedRounded />} />
          </BottomNavigation>
        </Box>
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: 7 }} />
      </Box>
    );
  }

  // desktop — top search bar + two pane (rail + inset map)
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.25, overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* top bar card — Pondicherry French-quarter vibe behind a dark scrim */}
      <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 2, py: 1, flexShrink: 0, borderRadius: '14px', border: '1px solid', borderColor: 'divider',
        backgroundImage: 'linear-gradient(90deg, rgba(10,10,12,0.96) 28%, rgba(10,10,12,0.72) 60%, rgba(10,10,12,0.84)), url(/images/pondy-planner-bg.avif)',
        backgroundSize: 'cover', backgroundPosition: 'center 28%', backgroundRepeat: 'no-repeat' }}>
        {<Brand />}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 720, mx: 'auto' }}>{<AiBar isMobile={isMobile} query={aiQuery} setQuery={setAiQuery} onPlan={aiPlan} busy={aiBusy} />}</Box>
        <Button size="small" startIcon={<InfoOutlinedRounded />} onClick={() => setAboutOpen(true)} sx={{ flexShrink: 0, color: 'text.secondary' }}>About</Button>
      </Paper>
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundImage: 'none' } }}>
        <DialogContent sx={{ position: 'relative' }}>
          <IconButton onClick={() => setAboutOpen(false)} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Close"><CloseRounded /></IconButton>
          <AboutPanel />
        </DialogContent>
      </Dialog>
      {/* body */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1.25 }}>
        {/* left rail card */}
        <Paper elevation={0} sx={{ width: 510, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
          background: 'linear-gradient(180deg, #1C1A16 0%, #16161A 22%, #101013 100%)' }}>
          <Box sx={{ p: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            {<Controls start={start} startTime={startTime} endTime={endTime} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} />}
            <ToggleButtonGroup exclusive fullWidth size="small" value={deskTab} onChange={(_, v) => v && openView(v)} color="primary">
              <ToggleButton value="places" sx={{ fontWeight: 700, py: 0.6 }}>Add places</ToggleButton>
              <ToggleButton value="day" sx={{ fontWeight: 700, py: 0.6 }}>Itinerary{stops.length ? ` (${stops.length})` : ''}</ToggleButton>
            </ToggleButtonGroup>
            {deskTab === 'places' && SUB_ORDER[filter] && subChips()}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {deskTab === 'places' ? PlacesPanel() : DayPanel()}
          </Box>
        </Paper>
        {/* map card */}
        <Box sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
          {deskTab === 'places' && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999, maxWidth: 'calc(70% - 32px)',
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {categoryChips()}
            </Paper>
          )}
          {/* itinerary length filter floats over the map while picking a ready-made plan */}
          {deskTab === 'day' && (!stops.length || browsing) && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999,
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {planChips()}
            </Paper>
          )}
          {/* floating "Your day" overview on the sea — alternate entry point while browsing */}
          {deskTab === 'places' && stops.length > 0 && (
            <Paper sx={{ position: 'absolute', top: 16, right: 16, zIndex: 3, width: 300, maxHeight: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column',
              bgcolor: 'rgba(18,20,26,0.93)', backdropFilter: 'blur(12px)', border: '1px solid', borderColor: 'divider', borderRadius: '14px', boxShadow: '0 10px 34px rgba(0,0,0,0.55)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.7 }}><CalendarMonthRounded sx={{ fontSize: 18, color: 'primary.main' }} /> Itinerary</Typography>
                <Button size="small" variant="outlined" onClick={() => openView('day')} sx={{ py: 0.2 }}>Edit</Button>
              </Stack>
              <Stack direction="row" sx={{ px: 1.5, py: 0.8, gap: '2px 12px', flexWrap: 'wrap', fontSize: '0.76rem', color: 'text.secondary' }}>
                <span><b style={{ color: '#ECEDEE' }}>{stops.length}</b> stops{tripDays.length > 1 ? ` · ${tripDays.length} days` : ''}</span>
                <span>{tripDrive} min · {tripKm.toFixed(1)} km</span>
              </Stack>
              <Box sx={{ overflowY: 'auto', px: 1.5, pb: 1, minHeight: 0 }}>
                {dayData.map(d => d.tl.length > 0 && (
                  <Box key={d.day} sx={{ mb: tripDays.length > 1 ? 0.8 : 0 }}>
                    {tripDays.length > 1 && <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, color: DAY_COLORS[(d.day - 1) % DAY_COLORS.length], mt: 0.6, mb: 0.4 }}>DAY {d.day} · back {fmtClock(d.clock)}</Typography>}
                    <GlanceRow color="#F59E0B" dot="S" name={data.places[start].name} time={fmtClock(parseTime(startTime))}
                      legColor={LEG_COLORS[0]} drive={`${d.tl[0].dm} min · ${d.tl[0].dk} km`} />
                    {(() => { let rn = 0; return d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      const legColor = lastStop ? '#64748B' : LEG_COLORS[(ti + 1) % LEG_COLORS.length];
                      const drive = lastStop ? null : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                      if (t.brk || t.meal)   // free time / meal — no place lookup (matches the main timeline guard)
                        return <GlanceRow key={t.gi} color="#64748B" dot="•" name={t.meal || 'Free time'} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                      rn++;
                      const place = data.places[t.idx!];
                      return <GlanceRow key={t.gi} color={CAT_HEX[place.cat] || '#2196F3'} dot={rn} name={place.name} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                    }); })()}
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
          {MapView()}
          {selectedIdx != null && data.places[selectedIdx] && (
            <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} />
          )}
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}