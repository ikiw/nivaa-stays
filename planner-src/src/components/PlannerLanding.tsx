import { Box, Stack } from '@mui/material';
import HeroPanel from './landing/HeroPanel';
import ItinerariesPanel from './landing/ItinerariesPanel';
import InfoPanel from './landing/InfoPanel';
import StepperPanel from './landing/StepperPanel';
import PlacesRail from './landing/PlacesRail';
import type { Planner } from '../usePlanner';
import { IS_DARK, panelBorder } from '../theme/surfaces';

/** Desktop landing = four stacked panels: Hero (detail) → Itineraries → Info → Stepper. */
export default function PlannerLanding({ planner }: { planner: Planner }) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '18px',
      border: `1px solid ${panelBorder}`, bgcolor: IS_DARK ? '#07090D' : 'rgba(250,246,236,0.96)', p: 0.75,
      backgroundImage: 'none' }}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0.75, '@media (min-width: 1660px)': { display: 'grid', gridTemplateColumns: 'minmax(0, 1300px) minmax(330px, 1fr)', alignItems: 'stretch' } }}>
        <Stack spacing={0.6} sx={{ flex: 1, minHeight: 0, minWidth: 0, '@media (min-width: 1660px)': { flex: '0 0 auto', minHeight: 'auto', alignSelf: 'start' } }}>
          <HeroPanel planner={planner} />
          <ItinerariesPanel planner={planner} />
          <InfoPanel />
          <StepperPanel />
        </Stack>
        <PlacesRail planner={planner} />
      </Box>
    </Box>
  );
}
