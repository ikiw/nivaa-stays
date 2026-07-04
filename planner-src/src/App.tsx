import { Box, Stack, Paper, Button, IconButton, Typography, BottomNavigation, BottomNavigationAction, Snackbar, CircularProgress, ToggleButton, ToggleButtonGroup, Dialog, DialogContent } from '@mui/material';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import InfoOutlinedRounded from '@mui/icons-material/InfoOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { Map } from '@vis.gl/react-google-maps';
// ---- planner modules (extracted from this file; behaviour unchanged) ----
import { NODE_BG, ROUTE_HEX, SUB_ORDER, DAY_COLORS } from './constants';
import { isPseudo, parseTime, fmtClock, fmtDur, track } from './utils';
import { CURATED } from './curated';
import AboutPanel from './components/AboutPanel';
import PlaceInfoCard from './components/PlaceInfoCard';
import { GlanceRow, Centered } from './components/Bits';
import Brand from './components/Brand';
import AiBar from './components/AiBar';
import Controls from './components/Controls';
import { useState } from 'react';
import type { TouchEvent } from 'react';
import { usePlanner } from './usePlanner';
 import { CategoryChips, SubChips } from './components/Chips';
import MapView from './components/MapView';
import PlacesPanel from './components/PlacesPanel';
import DayPanel from './components/DayPanel';
import PlannerLanding from './components/PlannerLanding';
import MobileLanding from './components/landing/MobileLanding';
import ThemePicker from './components/ThemePicker';
import CohortIcon, { COHORT_COLORS, cohortKey } from './components/CohortIcon';
import PlaceThumb from './components/PlaceThumb';
import HotelsDialog from './components/HotelsDialog';
import HotelRounded from '@mui/icons-material/HotelRounded';
import RentalsDialog from './components/RentalsDialog';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';


export default function App() {
  const planner = usePlanner();
  const [aiOpen, setAiOpen] = useState(false);
  const {
    isMobile, data, err, start, setStart, startTime, setStartTime, endTime, setEndTime, stops, setStops, tripDate, setTripDate, weather, weatherLoading, setActiveDay, loadedId, filter, browsing, setBrowsing, selectedIdx, setSelectedIdx, mobView, setMobView, itinView, setItinView, aboutOpen, setAboutOpen, hotelsOpen, setHotelsOpen, rentalsOpen, setRentalsOpen, deskTab, aiQuery, setAiQuery, aiBusy, snack, setSnack, setMapActive, touchStartX, openView, switchView, resetPlanner, activateMap, starts, touched, aiPlan, tripDays, dayData, tripDrive, tripKm, curDay, buildSearch,
  } = planner;

  if (err) return <Centered>Could not load the places data. Please refresh.</Centered>;
  if (!data) return <Centered><CircularProgress /></Centered>;

  const selectedContext = selectedIdx == null ? null : (() => {
    if (selectedIdx === start) return { time: `Depart ${fmtClock(parseTime(startTime))}`, stay: 'Start point' };
    for (const d of dayData) {
      const entry = d.tl.find(t => t.idx === selectedIdx);
      if (entry) return { time: fmtClock(entry.arrive), stay: `${fmtDur(entry.stay)} stop`, drive: `${entry.dm} min drive in` };
    }
    return null;
  })();
  const popularPlaceNames = [
    'Promenade Beach',
    'Matrimandir (Auroville)',
    'Sri Aurobindo Ashram',
    'Paradise Beach',
    'Serenity Beach',
    'Chunnambar Boat House',
    'Our Lady of Angels Church',
    'Auroville Visitor Centre',
    'Botanical Garden',
    'Cafe des Arts',
  ];
  const popularPlaceIndices = popularPlaceNames
    .map(name => data.places.findIndex(p => p.name === name))
    .filter((i, pos, arr) => i >= 0 && arr.indexOf(i) === pos);
  const desktopGridColumns = (deskTab === 'places' && stops.length > 0)
    ? {
        md: 'minmax(360px, 410px) minmax(420px, 1fr) minmax(260px, 300px)',
        lg: 'minmax(390px, 440px) minmax(520px, 1fr) minmax(280px, 320px)',
        xl: 'minmax(420px, 470px) minmax(620px, 1fr) minmax(300px, 340px)',
      }
    : (deskTab === 'day' && stops.length > 0 && !browsing)
    ? {
        md: 'minmax(540px, 580px) minmax(440px, 1fr)',
        lg: 'minmax(590px, 660px) minmax(520px, 1fr)',
        xl: 'minmax(620px, 700px) minmax(560px, 1fr)',
      }
    : {
        md: 'minmax(500px, 540px) minmax(440px, 1fr)',
        lg: 'minmax(540px, 600px) minmax(520px, 1fr)',
        xl: 'minmax(560px, 620px) minmax(560px, 1fr)',
      };
  const showDesktopLanding = deskTab === 'day' && !stops.length && !browsing;

  if (isMobile) {
    const loadedC = CURATED.find(c => c.id === loadedId);
    const loadedCohortColor = loadedC ? COHORT_COLORS[cohortKey(loadedC.cohort)] : '#E6C35A';
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
      <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        {planView ? (
          // ---- sticky plan header: back + customize + name + Timeline/Map toggle ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 8px)', pb: 0.9, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0D121B' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 42 }}>
              <IconButton onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ ml: -1, color: 'text.primary' }} aria-label="Back to itineraries"><ArrowBackRounded /></IconButton>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.03rem', lineHeight: 1.12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 0.45 }}>
                  {loadedC && <Box component="span" sx={{ color: loadedCohortColor, display: 'inline-flex', flexShrink: 0 }}><CohortIcon cohort={loadedC.cohort} size={17} /></Box>}{loadedC ? loadedC.cohort : 'Your itinerary'}
                </Typography>
                <Typography sx={{ mt: 0.12, color: 'text.secondary', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stops.filter(s => !isPseudo(s)).length} stops · {tripDays.length || 1} day{(tripDays.length || 1) > 1 ? 's' : ''} · {tripDrive} min drive · {tripKm.toFixed(1)} km
                </Typography>
              </Box>
              <Button size="small" startIcon={<TuneRounded sx={{ fontSize: 16 }} />} onClick={() => switchView('places')} sx={{ ml: 'auto', px: 0.9, minHeight: 34, flexShrink: 0, color: '#F5F0E4', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', textTransform: 'none', fontWeight: 850 }}>Customize</Button>
            </Box>
            <ToggleButtonGroup exclusive fullWidth size="small" value={itinView} onChange={(_, v) => { if (v) { track('view_switch', { view: v }); setItinView(v); if (v === 'map') activateMap('view_toggle'); const next = buildSearch('day', v); if (next !== window.location.pathname + window.location.search) window.history.pushState(window.history.state, '', next); } }} sx={{ mt: 0.95, p: 0.25, borderRadius: '13px', border: '1px solid rgba(255,255,255,0.10)', bgcolor: '#111721',
              '& .MuiToggleButton-root': { border: 0, borderRadius: '10px !important', color: 'text.secondary', fontWeight: 900, py: 0.55 },
              '& .Mui-selected': { color: '#F9E8A8 !important', bgcolor: 'rgba(230,195,90,0.16) !important', boxShadow: 'inset 0 0 0 1px rgba(230,195,90,0.22)' } }}>
              <ToggleButton value="timeline"><CalendarMonthRounded sx={{ fontSize: 16, mr: 0.6, color: itinView === 'timeline' ? '#E6C35A' : 'inherit' }} /> Timeline</ToggleButton>
              <ToggleButton value="map"><MapRounded sx={{ fontSize: 16, mr: 0.6, color: itinView === 'map' ? '#E6C35A' : 'inherit' }} /> Map</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ) : (
          // ---- itinerary list / places: brand + collapsible AI (+ start/window only on Places) ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 6px)', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: mobView === 'places' ? 0.8 : 1.25 }}>
              <Brand onClick={resetPlanner} />
              <Box sx={{ flex: 1 }} />
              <IconButton onClick={() => setHotelsOpen(true)} aria-label="Where to stay" sx={{ flexShrink: 0, color: 'text.secondary' }}><HotelRounded sx={{ fontSize: 20 }} /></IconButton>
              <IconButton onClick={() => setRentalsOpen(true)} aria-label="Bike & car rentals" sx={{ flexShrink: 0, color: 'text.secondary' }}><TwoWheelerRounded sx={{ fontSize: 20 }} /></IconButton>
              <ThemePicker />
              {mobView !== 'about' && (
                <IconButton onClick={() => setAiOpen(o => !o)} aria-label="Plan with AI"
                  sx={{ flexShrink: 0, borderRadius: '11px', p: 0.9, color: aiOpen ? 'secondary.main' : 'text.secondary',
                    border: '1px solid', borderColor: aiOpen ? 'secondary.main' : 'divider', bgcolor: aiOpen ? 'rgba(251,191,36,0.12)' : 'transparent' }}>
                  <AutoAwesomeRounded sx={{ fontSize: 20 }} />
                </IconButton>
              )}
            </Box>
            {mobView !== 'about' && aiOpen && <Box sx={{ mb: 1 }}>{<AiBar isMobile={isMobile} query={aiQuery} setQuery={setAiQuery} onPlan={aiPlan} busy={aiBusy} autoFocus />}</Box>}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobView === 'about' ? null : mobView === 'places' && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 0.8 }}>{<MapView planner={planner} showBrowsePlaces />}</Box>
          ) : mobView === 'places' ? (
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 0.8, pb: stops.length ? 9.5 : 1.5 }}>
                <Box sx={{ mb: 0.85, p: 0.8, borderRadius: '14px', bgcolor: '#111721', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                  {<Controls start={start} startTime={startTime} endTime={endTime} tripDate={tripDate} weather={weather} weatherLoading={weatherLoading} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} onDateChange={setTripDate} />}
                </Box>
                {filter === 'All' && (
                  <Box sx={{ mb: 0.65 }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Popular
                    </Typography>
                    <Box sx={{ mx: -1.5, px: 1.5, overflowX: 'auto', display: 'flex', gap: 0.85, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                      {popularPlaceIndices.map(i => {
                        const p = data.places[i];
                        return (
                          <Box key={i} role="button" tabIndex={0} onClick={() => planner.selectPlace(i, 'popular_rail')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); planner.selectPlace(i, 'popular_rail'); } }}
                            sx={{ flex: '0 0 92px', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', bgcolor: '#111721', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <PlaceThumb place={p} size={76} width={92} height={76} tint="#E6C35A" radius="0" />
                            <Typography sx={{ px: 0.65, py: 0.55, color: '#fff', fontSize: '0.72rem', fontWeight: 750, lineHeight: 1.18, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
                <Box sx={{ position: 'sticky', top: 0, zIndex: 2, mx: -1.5, px: 1.5, py: 0.5, mb: 0.7, bgcolor: 'rgba(25,28,36,0.94)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ pb: 0.35, '& .MuiStack-root': { alignItems: 'center' } }}>
                    <CategoryChips planner={planner} />
                  </Box>
                  {SUB_ORDER[filter] && (
                    <Box sx={{ pb: 0.1 }}>
                      <SubChips planner={planner} />
                    </Box>
                  )}
                </Box>
                {<PlacesPanel planner={planner} />}
              </Box>
              {stops.length > 0 && (
                <Box sx={{ position: 'absolute', left: 10, right: 10, bottom: 8, zIndex: 3, display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center',
                  p: 0.85, borderRadius: '13px', bgcolor: 'rgba(23,19,13,0.96)', border: '1px solid rgba(230,195,90,0.42)', boxShadow: '0 -10px 30px rgba(0,0,0,0.34)', backdropFilter: 'blur(12px)' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 27, height: 27, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E6C35A', border: '1px solid rgba(230,195,90,0.38)', flexShrink: 0 }}>✓</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '0.86rem', lineHeight: 1.15 }}>{stops.filter(s => !isPseudo(s)).length} place{stops.filter(s => !isPseudo(s)).length === 1 ? '' : 's'} selected</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.66rem', mt: 0.15 }} noWrap>Add more places to your itinerary</Typography>
                    </Box>
                  </Stack>
                  <Button variant="contained" disableElevation onClick={() => switchView('day')} sx={{ minHeight: 38, px: 1.5, borderRadius: '10px', bgcolor: '#E6C35A', color: '#211A06', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: '#F1D171' } }}>
                    View itinerary
                  </Button>
                </Box>
              )}
              {!stops.length && (
                <Button size="small" variant="contained" disableElevation startIcon={<MapRounded sx={{ fontSize: 16 }} />} onClick={() => { track('view_switch', { view: 'places_map' }); setMobView('places'); setItinView('map'); activateMap('places_view_map'); const next = buildSearch('places', 'map'); if (next !== window.location.pathname + window.location.search) window.history.pushState(window.history.state, '', next); }}
                  sx={{ position: 'absolute', right: 14, bottom: 14, zIndex: 4, minHeight: 38, px: 1.4, borderRadius: 999, textTransform: 'none', bgcolor: '#E6C35A', color: '#211A06', fontWeight: 900, boxShadow: '0 12px 28px rgba(0,0,0,0.34)', '&:hover': { bgcolor: '#F1D171' } }}>
                  View map
                </Button>
              )}
            </Box>
          ) : planView && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{<MapView planner={planner} />}</Box>
          ) : showList ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1, pb: 9 }}>
              {<MobileLanding planner={planner} showBackToItinerary={browsing && stops.length > 0} onBackToItinerary={() => setBrowsing(false)} />}
            </Box>
          ) : (
            <Box onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={swipeDays}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{<DayPanel planner={planner} hideBack />}</Box>
          )}
          {/* About — always mounted (in the DOM for crawlers), shown only when its tab is active */}
          <Box sx={{ display: mobView === 'about' ? 'block' : 'none', flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{<AboutPanel />}</Box>
        </Box>
        {planView && selectedIdx != null && data.places[selectedIdx] && (
          <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} isMobile
            context={selectedContext}
            onShowOnMap={() => { track('view_switch', { view: 'map' }); setItinView('map'); activateMap('show_on_map'); }} />
        )}
        <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', pb: 'env(safe-area-inset-bottom)' }}>
          <BottomNavigation showLabels value={mobView}
            onChange={(_, v) => { if (!v) return; if (v === 'about') { track('view_switch', { view: 'about' }); openView('about', 'push'); } else if (v === 'itinerary') { setBrowsing(false); switchView('day'); } else switchView('places'); }} sx={{ bgcolor: 'transparent' }}>
            <BottomNavigationAction value="itinerary" label={`Itinerary${stops.length ? ` (${stops.filter(s => !isPseudo(s)).length})` : ''}`} icon={<CalendarMonthRounded />} />
            <BottomNavigationAction value="places" label="Places" icon={<PlaceRounded />} />
            <BottomNavigationAction value="about" label="About" icon={<InfoOutlinedRounded />} />
          </BottomNavigation>
        </Box>
        <HotelsDialog open={hotelsOpen} onClose={() => setHotelsOpen(false)} isMobile />
        <RentalsDialog open={rentalsOpen} onClose={() => setRentalsOpen(false)} isMobile />
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: 7 }} />
      </Box>
    );
  }

  // desktop — top search bar + two pane (rail + inset map)
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.25, overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* top bar card — Pondicherry French-quarter vibe behind a dark scrim */}
      <Paper elevation={0} sx={{ flexShrink: 0, borderRadius: 0, border: 'none',
        bgcolor: 'transparent' }}>
        <Box sx={{ width: '100%', maxWidth: showDesktopLanding ? 1300 : 'none', mx: 'auto', display: 'flex', alignItems: 'center', gap: 2, px: 0.75, py: 0.75 }}>
          <Box sx={{ flex: '0 0 300px', minWidth: 0 }}>{<Brand onClick={resetPlanner} />}</Box>
          <Box sx={{ flex: '0 1 540px', minWidth: 360 }}>{<AiBar isMobile={isMobile} query={aiQuery} setQuery={setAiQuery} onPlan={aiPlan} busy={aiBusy} />}</Box>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ ml: 'auto', minWidth: 0 }}>
            <Button size="small" startIcon={<HotelRounded />} onClick={() => setHotelsOpen(true)} sx={{ flexShrink: 0, color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}>Stays</Button>
            <Button size="small" startIcon={<TwoWheelerRounded />} onClick={() => setRentalsOpen(true)} sx={{ flexShrink: 0, color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}>Rentals</Button>
            <Button size="small" startIcon={<InfoOutlinedRounded />} onClick={() => { track('view_switch', { view: 'about' }); setAboutOpen(true); }} sx={{ flexShrink: 0, color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}>About</Button>
            <Box sx={{ width: 1, height: 28, bgcolor: 'divider', opacity: 0.7 }} />
            <ThemePicker />
          </Stack>
        </Box>
      </Paper>
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundImage: 'none' } }}>
        <DialogContent sx={{ position: 'relative' }}>
          <IconButton onClick={() => setAboutOpen(false)} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Close"><CloseRounded /></IconButton>
          <AboutPanel />
        </DialogContent>
      </Dialog>
      <HotelsDialog open={hotelsOpen} onClose={() => setHotelsOpen(false)} />
      <RentalsDialog open={rentalsOpen} onClose={() => setRentalsOpen(false)} />
      {showDesktopLanding ? (
        <Box sx={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1300, mx: 'auto' }}>
          <PlannerLanding planner={planner} />
        </Box>
      ) : (
      <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'grid', gap: 1.25,
        gridTemplateColumns: desktopGridColumns }}>
        {/* left rail card */}
        <Paper elevation={0} sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.09)',
          bgcolor: 'background.paper',
          boxShadow: stops.length && deskTab === 'day' ? '0 20px 60px rgba(0,0,0,0.22)' : undefined }}>
          <Box sx={{ p: 1.45, pb: 1.2, display: 'flex', flexDirection: 'column', gap: 1.1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {(deskTab === 'places' || !stops.length) && <Controls start={start} startTime={startTime} endTime={endTime} tripDate={tripDate} weather={weather} weatherLoading={weatherLoading} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} onDateChange={setTripDate} />}
            <ToggleButtonGroup exclusive fullWidth size="small" value={deskTab} onChange={(_, v) => v && switchView(v)} color="primary"
              sx={{ p: 0.35, borderRadius: '13px', border: '1px solid rgba(255,255,255,0.07)', bgcolor: '#0D121A', overflow: 'hidden',
                '& .MuiToggleButton-root': { border: 0, borderRadius: '9px !important', py: 0.65, color: 'text.secondary', fontWeight: 900, textTransform: 'none', position: 'relative' },
                '& .Mui-selected': { color: '#F9E8A8 !important', bgcolor: 'rgba(230,195,90,0.13) !important', boxShadow: 'inset 0 0 0 1px rgba(230,195,90,0.20), 0 12px 30px rgba(230,195,90,0.15)' },
                '& .Mui-selected::after': { content: '""', position: 'absolute', left: '42%', right: '42%', bottom: 0, height: 2, borderRadius: 999, bgcolor: '#E6C35A', boxShadow: '0 0 14px #E6C35A' } }}>
              <ToggleButton value="day">Itinerary{stops.length ? ` (${stops.filter(s => !isPseudo(s)).length})` : ''}</ToggleButton>
              <ToggleButton value="places">{stops.length ? 'Customize' : 'Create'}</ToggleButton>
            </ToggleButtonGroup>
            {deskTab === 'places' && (
              <Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.65 }}>Categories</Typography>
                <CategoryChips planner={planner} />
              </Box>
            )}
            {deskTab === 'places' && SUB_ORDER[filter] && <SubChips planner={planner} />}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: stops.length && deskTab === 'day' ? 1.35 : 2 }}>
            {deskTab === 'places'
              ? <PlacesPanel planner={planner} />
              : browsing
                ? <PlannerLanding planner={planner} />
                : <DayPanel planner={planner} />}
          </Box>
        </Paper>
        {/* map card */}
        <Box sx={{ minWidth: 0, height: '100%', position: 'relative' }}>
          {deskTab === 'places' && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999, maxWidth: 'calc(100% - 32px)',
              bgcolor: 'background.paper', backdropFilter: 'blur(10px)', border: '1px solid', borderColor: 'divider', boxShadow: '0 6px 22px rgba(0,0,0,0.18)' }}>
              {<CategoryChips planner={planner} />}
            </Paper>
          )}
          {/* 1-day/2-day length now lives in the rail's "Ready-made trips" toggle */}
          {<MapView planner={planner} showBrowsePlaces={deskTab === 'places'} />}
          {selectedIdx != null && data.places[selectedIdx] && (
            <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} context={selectedContext} />
          )}
        </Box>
        {deskTab === 'places' && stops.length > 0 && (
          <Paper elevation={0} sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.09)', bgcolor: 'background.paper', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1.15, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '0.98rem', color: '#fff' }}>Itinerary</Typography>
                <Typography sx={{ mt: 0.2, fontSize: '0.72rem', color: 'text.secondary' }}>{stops.filter(s => !isPseudo(s)).length} stops · {tripDays.length || 1} day{(tripDays.length || 1) > 1 ? 's' : ''} · {tripDrive} min · {tripKm.toFixed(1)} km</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => switchView('day')} sx={{ py: 0.25, borderRadius: '10px', textTransform: 'none', fontWeight: 850 }}>Edit</Button>
            </Stack>
            <Box sx={{ overflowY: 'auto', px: 1.25, py: 1, minHeight: 0 }}>
              {dayData.map(d => d.tl.length > 0 && (
                <Box key={d.day} sx={{ mb: tripDays.length > 1 ? 0.8 : 0 }}>
                  {tripDays.length > 1 && <Typography sx={{ fontSize: '0.66rem', fontWeight: 900, color: DAY_COLORS[(d.day - 1) % DAY_COLORS.length], mt: 0.6, mb: 0.55 }}>DAY {d.day} · back {fmtClock(d.clock)}</Typography>}
                  <GlanceRow color="#60A5FA" dot="S" name={data.places[start].name} time={fmtClock(parseTime(startTime))}
                    legColor={ROUTE_HEX} drive={`${d.tl[0].dm} min · ${d.tl[0].dk} km`} />
                  {(() => { let rn = 0; return d.tl.map((t, ti) => {
                    const lastStop = ti === d.tl.length - 1;
                    const legColor = lastStop ? '#64748B' : ROUTE_HEX;
                    const drive = lastStop ? null : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                    if (t.brk || t.meal)
                      return <GlanceRow key={t.gi} color="#64748B" dot="•" name={t.meal || 'Free time'} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                    rn++;
                    const place = data.places[t.idx!];
                    return <GlanceRow key={t.gi} color={ROUTE_HEX} dot={rn} name={place.name} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                  }); })()}
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </Box>
      )}
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}