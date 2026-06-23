// The place picker: categories (collapsible when "All") → optional sub-type headings →
// a grid of PlaceCards. Reads everything off the planner.
import { Box, Collapse, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { PICK_ORDER, SUB_ORDER, SUB_LABEL } from '../constants';
import { Grid, CatHead } from './Bits';
import PlaceCard from './PlaceCard';
import type { Planner } from '../usePlanner';

export default function PlacesPanel({ planner }: { planner: Planner }) {
  const { data, filter, byCat, collapsed, subFilter, toggleCat, isStop, driveMin, driveKm, addToggle, start } = planner;
  if (!data) return null;
  const placeCard = (i: number) => (
    <PlaceCard key={i} place={data.places[i]} added={isStop(i)} dm={driveMin(start, i)} dk={driveKm(start, i)} onToggle={() => addToggle(i)} />
  );
  const cats = filter === 'All' ? PICK_ORDER : PICK_ORDER.filter(c => c === filter);
  return (
    <Box>
      {cats.map(cat => {
        const items = byCat[cat]; if (!items) return null;
        const collapsible = filter === 'All';
        const isCollapsed = collapsible && collapsed.has(cat);
        const inner: ReactNode[] = [];
        const subOrder = SUB_ORDER[cat];
        if (subOrder) {
          const bySub: Record<string, number[]> = {}; items.forEach(i => { const s = data.places[i].sub || ''; (bySub[s] = bySub[s] || []).push(i); });
          let subs = subOrder.filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !subOrder.includes(s)));
          const single = filter === cat && subFilter !== 'All';
          if (single) subs = subs.filter(s => s === subFilter);
          subs.forEach(s => {
            if (s && !single) inner.push(<Typography key={cat + s} sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', mt: 1, mb: 0.5 }}>{SUB_LABEL[s] || s}</Typography>);
            inner.push(<Grid key={cat + s + 'g'}>{bySub[s].map(placeCard)}</Grid>);
          });
        } else {
          inner.push(<Grid key={cat + 'g'}>{items.map(placeCard)}</Grid>);
        }
        return (
          <Box key={cat} sx={{ mb: 1.5 }}>
            {collapsible
              ? <CatHead cat={cat} count={items.length} collapsed={isCollapsed} onToggle={() => toggleCat(cat)} />
              : null}
            {collapsible
              ? <Collapse in={!isCollapsed} timeout="auto" unmountOnExit><Box sx={{ mt: 0.6 }}>{inner}</Box></Collapse>
              : <Box>{inner}</Box>}
          </Box>
        );
      })}
    </Box>
  );
}
