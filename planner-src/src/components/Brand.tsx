// The planner's brand mark — gradient icon tile + name/tagline. Static, no props.
import { Stack, Box, Typography } from '@mui/material';
import BeachAccessRounded from '@mui/icons-material/BeachAccessRounded';

export default function Brand() {
  return (
    <Stack direction="row" spacing={1.3} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)', color: '#231A00', boxShadow: '0 4px 14px rgba(245,158,11,0.45)' }}>
        <BeachAccessRounded />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.05, letterSpacing: '-0.01em' }}>Pondicherry Planner</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>Plan a day trip · driving times · r/pondicherry picks</Typography>
      </Box>
    </Stack>
  );
}
