// Filter chip rows for the picker + plan list. Each reads what it needs off the
// shared planner object.
import { Stack, Chip } from '@mui/material';
import { CAT_ICON, CAT_LABEL, PICK_ORDER, SUB_ORDER, SUB_LABEL } from '../constants';
import type { Category } from '../types';
import type { Planner } from '../usePlanner';

/** Category filter chips (All + each category with a count). */
export function CategoryChips({ planner }: { planner: Planner }) {
  const { byCat, filter, selectFilter } = planner;
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
            onClick={() => selectFilter(key)} sx={{ fontWeight: 600 }} />
        );
      })}
    </Stack>
  );
}

/** 1-day / 2-day ready-made-plan filter chips. */
export function PlanChips({ planner }: { planner: Planner }) {
  const { planFilter, setPlanFilter } = planner;
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
}

/** Sub-type filter chips for the active category — null when the category has no sub-types. */
export function SubChips({ planner }: { planner: Planner }) {
  const { data, byCat, filter, subFilter, selectSubFilter } = planner;
  const subOrder = SUB_ORDER[filter];
  if (!subOrder || !data) return null;
  const counts: Record<string, number> = {}; (byCat[filter] || []).forEach(i => { const sub = data.places[i].sub || ''; counts[sub] = (counts[sub] || 0) + 1; });
  const subs = subOrder.filter(s => counts[s]).concat(Object.keys(counts).filter(s => s && !subOrder.includes(s)));
  const rows: [string, string, number][] = [['All', 'All', Object.values(counts).reduce((a, b) => a + b, 0)], ...subs.map((s): [string, string, number] => [s, SUB_LABEL[s] || s, counts[s]])];
  return (
    <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
      {rows.map(([key, label, n]) => (
        <Chip key={key} label={`${label} ${n}`} size="small" onClick={() => selectSubFilter(key)}
          color={subFilter === key ? 'primary' : 'default'} variant={subFilter === key ? 'filled' : 'outlined'}
          sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
      ))}
    </Stack>
  );
}
