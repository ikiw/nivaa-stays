// SEO/About content — rendered in the DOM (mobile keeps it mounted so crawlers index
// it), revealed by the user via the "About" tab. Real <h1>/<h2>/<h3> + the itineraries
// + FAQ.
import { Box, Typography, Link } from '@mui/material';
import { CURATED, FAQ } from '../curated.js';

/** The crawlable "About this planner" panel: intro + ready-made itineraries + FAQ. */
export default function AboutPanel() {
  const h2 = { fontSize: '1.05rem', fontWeight: 700, color: 'text.primary', mt: 2.5, mb: 1.2 };
  const h3 = { fontSize: '0.9rem', fontWeight: 700, color: 'text.primary', mb: 0.2 };
  const p = { fontSize: '0.85rem', lineHeight: 1.55, color: 'text.secondary' };
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: 3 }}>
      <Typography component="h1" sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', mb: 1 }}>Pondicherry Itinerary Planner</Typography>
      <Typography sx={{ ...p, mb: 1 }}>Build a routed Pondicherry day trip in seconds — pick the beaches, French-Quarter heritage, Auroville sights, cafés and nightlife you want, set your start time, and get an opening-hours-aware plan with driving times and a live map. Free, with no sign-up.</Typography>

      <Typography component="h2" sx={h2}>Ready-made Pondicherry itineraries</Typography>
      {CURATED.map(c => (
        <Box key={c.id} sx={{ mb: 1.5 }}>
          <Typography component="h3" sx={h3}>{c.cohort} — {c.tag} <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled' }}>· {c.plan.length}-day</Box></Typography>
          <Typography sx={p}>{c.why}</Typography>
        </Box>
      ))}

      <Typography component="h2" sx={h2}>Pondicherry trip planning FAQ</Typography>
      {FAQ.map((f, i) => (
        <Box key={i} sx={{ mb: 1.4 }}>
          <Typography component="h3" sx={h3}>{f.q}</Typography>
          <Typography sx={p}>{f.a}</Typography>
        </Box>
      ))}

      <Typography sx={{ ...p, mt: 2.5 }}>
        More from Nivaa Stays: <Link href="https://nivaastays.com/" target="_blank" rel="noopener" sx={{ color: 'secondary.main' }}>home</Link> · <Link href="https://nivaastays.com/pondicherry-travel-guide" target="_blank" rel="noopener" sx={{ color: 'secondary.main' }}>Pondicherry travel guide</Link> · <Link href="https://nivaastays.com/booking" target="_blank" rel="noopener" sx={{ color: 'secondary.main' }}>book your stay near JIPMER</Link>.
      </Typography>
    </Box>
  );
}
