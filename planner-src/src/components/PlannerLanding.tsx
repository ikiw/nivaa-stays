import { Box, Stack } from '@mui/material';
import HeroPanel from './landing/HeroPanel';
import ItinerariesPanel from './landing/ItinerariesPanel';
import InfoPanel from './landing/InfoPanel';
import StepperPanel from './landing/StepperPanel';
import type { Planner } from '../usePlanner';

/** Desktop landing = four stacked panels: Hero (detail) → Itineraries → Info → Stepper. */
export default function PlannerLanding({ planner }: { planner: Planner }) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '18px',
      border: '1px solid rgba(255,255,255,0.10)', bgcolor: '#07090D', p: 0.75,
      backgroundImage: 'radial-gradient(circle at 50% -8%, rgba(230,195,90,0.08), transparent 34%), radial-gradient(circle at 100% 8%, rgba(91,138,199,0.08), transparent 30%)' }}>
      <Stack spacing={0.6} sx={{ flex: 1, minHeight: 0 }}>
        <HeroPanel planner={planner} />
        <ItinerariesPanel planner={planner} />
        <InfoPanel />
        <StepperPanel />
      </Stack>
    </Box>
  );
}
