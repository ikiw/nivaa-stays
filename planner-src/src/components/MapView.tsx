// The map pane: the live RouteMap once engaged, else a "load map" teaser (a Map mount
// is a billed Dynamic-Maps load, so it's deferred until the visitor interacts).
import { Box, Paper, Stack, Typography, Button } from '@mui/material';
import MapRounded from '@mui/icons-material/MapRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import RouteMap from './RouteMap';
import type { Planner } from '../usePlanner';
import { ACTIVE } from '../theme/tokens';

export default function MapView({ planner }: { planner: Planner }) {
  const { data, start, mapStops, selectedIdx, stops, mapActive, activateMap, selectPlace, isMobile } = planner;
  if (!data) return null;
  return (
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: 'background.default' }}>
      {mapActive ? (
        <>
          <RouteMap data={data} start={start} stops={mapStops} selected={selectedIdx} onSelect={(i) => selectPlace(i, 'map')} />
          {!stops.length && (
            <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2, px: 2, py: 1, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: 'background.paper', backdropFilter: 'blur(8px)', border: '1px solid', borderColor: 'divider', boxShadow: '0 6px 22px rgba(0,0,0,0.18)', color: 'text.secondary', fontSize: '0.85rem', maxWidth: 'calc(100% - 32px)', pointerEvents: 'none' }}>
              <PlaceRounded sx={{ fontSize: 18, flexShrink: 0 }} /> Add places to start building your itinerary.
            </Paper>
          )}
        </>
      ) : (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: { xs: 2.5, md: 3.5 },
          backgroundImage: (ACTIVE.mode === 'light'
            ? 'linear-gradient(0deg, ' + ACTIVE.bg + 'D9 0%, ' + ACTIVE.bg + '40 32%, ' + ACTIVE.bg + '00 60%)'
            : 'linear-gradient(0deg, ' + ACTIVE.bg + 'EB 0%, ' + ACTIVE.bg + '59 38%, ' + ACTIVE.bg + '00 72%)') + ', url(' + ACTIVE.bgImage + ')',
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
            <Button variant="contained" size="small" startIcon={<MapRounded />} onClick={() => activateMap('load_button')} sx={{ flexShrink: 0 }}>Load map now</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
