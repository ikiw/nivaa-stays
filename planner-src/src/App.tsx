import { Box, Stack, Paper, Button, IconButton, Typography, BottomNavigation, BottomNavigationAction, Snackbar, CircularProgress, ToggleButton, ToggleButtonGroup, Dialog, DialogContent } from '@mui/material';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import InfoOutlinedRounded from '@mui/icons-material/InfoOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Map } from '@vis.gl/react-google-maps';
// ---- planner modules (extracted from this file; behaviour unchanged) ----
import { CAT_HEX, LEG_COLORS, SUB_ORDER, DAY_COLORS } from './constants';
import { isPseudo, parseTime, fmtClock, track } from './utils';
import { CURATED } from './curated';
import AboutPanel from './components/AboutPanel';
import PlaceInfoCard from './components/PlaceInfoCard';
import { GlanceRow, Centered } from './components/Bits';
import Brand from './components/Brand';
import AiBar from './components/AiBar';
import Controls from './components/Controls';
import type { TouchEvent } from 'react';
import { usePlanner } from './usePlanner';
 import { CategoryChips, PlanChips, SubChips } from './components/Chips';
import MapView from './components/MapView';
import PlacesPanel from './components/PlacesPanel';
import DayPanel from './components/DayPanel';


export default function App() {
  const planner = usePlanner();
  const {
    isMobile, data, err, start, setStart, startTime, setStartTime, endTime, setEndTime, stops, setStops, tripDate, setTripDate, weather, weatherLoading, setActiveDay, loadedId, filter, browsing, setBrowsing, selectedIdx, setSelectedIdx, mobView, setMobView, itinView, setItinView, aboutOpen, setAboutOpen, deskTab, aiQuery, setAiQuery, aiBusy, snack, setSnack, setMapActive, touchStartX, openView, starts, touched, aiPlan, tripDays, dayData, tripDrive, tripKm, curDay,
  } = planner;

  if (err) return <Centered>Could not load the places data. Please refresh.</Centered>;
  if (!data) return <Centered><CircularProgress /></Centered>;

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
            {mobView === 'places' && <Box sx={{ mb: 0.5 }}>{<Controls start={start} startTime={startTime} endTime={endTime} tripDate={tripDate} weather={weather} weatherLoading={weatherLoading} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} onDateChange={setTripDate} />}</Box>}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobView === 'about' ? null : mobView === 'places' ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{<PlacesPanel planner={planner} />}</Box>
          ) : planView && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{<MapView planner={planner} />}</Box>
          ) : (
            <Box onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={swipeDays}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{<DayPanel planner={planner} hideBack />}</Box>
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
            {<Controls start={start} startTime={startTime} endTime={endTime} tripDate={tripDate} weather={weather} weatherLoading={weatherLoading} starts={starts} onStartChange={(v) => { touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} onWindowChange={(st, et) => { touched(); setStartTime(st); setEndTime(et); }} onDateChange={setTripDate} />}
            <ToggleButtonGroup exclusive fullWidth size="small" value={deskTab} onChange={(_, v) => v && openView(v)} color="primary">
              <ToggleButton value="places" sx={{ fontWeight: 700, py: 0.6 }}>Add places</ToggleButton>
              <ToggleButton value="day" sx={{ fontWeight: 700, py: 0.6 }}>Itinerary{stops.length ? ` (${stops.length})` : ''}</ToggleButton>
            </ToggleButtonGroup>
            {deskTab === 'places' && SUB_ORDER[filter] && <SubChips planner={planner} />}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {deskTab === 'places' ? <PlacesPanel planner={planner} /> : <DayPanel planner={planner} />}
          </Box>
        </Paper>
        {/* map card */}
        <Box sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
          {deskTab === 'places' && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999, maxWidth: 'calc(70% - 32px)',
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {<CategoryChips planner={planner} />}
            </Paper>
          )}
          {/* itinerary length filter floats over the map while picking a ready-made plan */}
          {deskTab === 'day' && (!stops.length || browsing) && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999,
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {<PlanChips planner={planner} />}
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
          {<MapView planner={planner} />}
          {selectedIdx != null && data.places[selectedIdx] && (
            <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} />
          )}
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}