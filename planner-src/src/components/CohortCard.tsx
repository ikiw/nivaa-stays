// One ready-made trip per cohort — a clean single-row card. The length (1-day /
// 2-day) is chosen globally by the toggle at the top of the list; tapping the card
// loads that length in one tap.
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CohortIcon, { cohortKey, COHORT_COLORS } from './CohortIcon';
import type { Curated } from '../types';

export default function CohortCard({ cohort, oneDay, twoDay, len, onLoad }: {
  cohort: string; oneDay?: Curated; twoDay?: Curated; len: 1 | 2; onLoad: (c: Curated) => void;
}) {
  const color = COHORT_COLORS[cohortKey(cohort)];
  const c = (len === 2 ? twoDay : oneDay) || oneDay || (twoDay as Curated);   // fall back if a length is missing
  const count = c.plan.reduce((a, d) => a + d.length, 0);
  return (
    <Card variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.07)', transition: 'border-color .15s ease', '&:hover': { borderColor: color } }}>
      <CardActionArea onClick={() => onLoad(c)} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: color + '22', color }}>
          <CohortIcon cohort={cohort} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }} noWrap>{cohort}</Typography>
          <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary' }} noWrap>{c.tag} · {count} stops</Typography>
        </Box>
        <ChevronRightRounded sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
      </CardActionArea>
    </Card>
  );
}
