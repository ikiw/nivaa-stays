import { useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { CAT_HEX, CAT_LABEL, PICK_ORDER } from '../../constants';
import type { Category } from '../../types';
import type { Planner } from '../../usePlanner';
import PlaceThumb from '../PlaceThumb';
import { ACCENT, ACCENT_INK, accentBorder, accentSoftBg, cardBg, chipBg, hoverBg, mutedColor, panelBg, panelBorder, shadowSoft, titleColor } from '../../theme/surfaces';

export default function PlacesRail({ planner }: { planner: Planner }) {
  const { data, switchView, selectFilter, selectPlace, byCat } = planner;
  const [cat, setCat] = useState<'All' | Category>('All');
  const openPlace = typeof selectPlace === 'function' ? selectPlace : () => {};

  const rows = useMemo(() => {
    if (!data) return [];
    if (cat === 'All') {
      return PICK_ORDER.flatMap((c) => byCat?.[c] || []);
    }
    return byCat?.[cat] || data.places.map((p, i) => ({ p, i })).filter(({ p }) => p.cat === cat).map(({ i }) => i);
  }, [byCat, cat, data]);

  if (!data) return null;

  const openAllPlaces = () => {
    selectFilter?.(cat);
    switchView?.('places');
  };

  return (
    <Paper elevation={0} sx={{ display: 'none', '@media (min-width: 1660px)': { display: 'flex' }, minWidth: 0, minHeight: 0, height: '100%', maxHeight: 'calc(100dvh - 76px)', overflow: 'hidden', flexDirection: 'column', p: 1.35, borderRadius: '18px', border: `1px solid ${panelBorder}`, background: panelBg, boxShadow: shadowSoft }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.15 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: titleColor, fontWeight: 850, fontSize: '1.04rem', lineHeight: 1.2 }}>Explore places</Typography>
          <Typography sx={{ mt: 0.3, color: mutedColor, fontSize: '0.72rem' }}>Handpicked spots to preview before adding</Typography>
        </Box>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />} onClick={openAllPlaces}
          sx={{ flexShrink: 0, color: ACCENT, textTransform: 'none', fontWeight: 800, minWidth: 0, px: 0.5 }}>
          View all
        </Button>
      </Stack>

      <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
        {(['All', ...PICK_ORDER] as ('All' | Category)[]).slice(0, 6).map((key) => {
          const active = cat === key;
          return (
            <Box key={key} role="button" tabIndex={0} onClick={() => setCat(key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCat(key); } }}
              sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.85, py: 0.45, borderRadius: '10px',
                bgcolor: active ? accentSoftBg : chipBg, color: active ? titleColor : mutedColor, border: `1px solid ${active ? accentBorder : panelBorder}`,
                fontSize: '0.72rem', fontWeight: 850, lineHeight: 1 }}>
              {key === 'All' ? 'All' : CAT_LABEL[key] || key}
            </Box>
          );
        })}
      </Stack>

      <Stack spacing={0.95} sx={{ minHeight: 0, flex: 1, overflowY: 'auto', pr: 0.35, scrollbarWidth: 'thin' }}>
        {rows.map((i, pos) => {
          const p = data.places[i];
          const color = CAT_HEX[p.cat] || ACCENT;
          return (
            <Box key={p.name} role="button" tabIndex={0} onClick={() => openPlace(i, 'landing_places')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlace(i, 'landing_places'); } }}
              sx={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', gap: 1.05, alignItems: 'center', p: 1, minHeight: 92, borderRadius: '16px', border: `1px solid ${panelBorder}`, background: cardBg, cursor: 'pointer', transition: 'border-color .15s, background-color .15s, transform .15s', '&:hover': { borderColor: accentBorder, bgcolor: hoverBg, transform: 'translateY(-1px)' } }}>
              <Box>
                <PlaceThumb place={p} size={76} width={92} height={76} tint={color} radius="12px" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: titleColor, fontWeight: 850, fontSize: '0.9rem', lineHeight: 1.18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                  <Box component="span" sx={{ flexShrink: 0, px: 0.5, py: '2px', borderRadius: '6px', bgcolor: `${color}22`, color, fontSize: '0.52rem', fontWeight: 900, textTransform: 'uppercase' }}>{p.cat}</Box>
                </Stack>
                {p.rating && (
                  <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.65, fontSize: '0.75rem', color: mutedColor }}>
                    <StarRounded sx={{ fontSize: 14, color: ACCENT }} />
                    <Box component="span" sx={{ color: titleColor, fontWeight: 800 }}>{p.rating}</Box>
                    {p.reviews ? <Box component="span">({Number(p.reviews).toLocaleString()})</Box> : null}
                  </Stack>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Button fullWidth variant="outlined" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />} onClick={openAllPlaces}
        sx={{ mt: 1, minHeight: 38, borderColor: accentBorder, color: ACCENT, fontWeight: 850, borderRadius: '11px', '&:hover': { borderColor: ACCENT, bgcolor: accentSoftBg } }}>
        View all places in Pondicherry
      </Button>
    </Paper>
  );
}
