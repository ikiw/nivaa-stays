// The live map: numbered day markers + a real driving route drawn as per-leg
// polylines, with an animated car and tap-to-spotlight a single leg. RouteMap is the
// only export; RouteLayer / PinChip / DirectionsRoute are internal collaborators.
import { useEffect, useMemo, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MAP_ID } from '../config.js';
import { DAY_COLORS, CAT_HEX, LEG_COLORS, CAR_SVG } from '../constants.js';

/**
 * The planner map. Renders the start + stop markers and the routed driving path.
 * @param {{ data:object, start:number, stops:object[], selected:number|null, onSelect:(idx:number)=>void }} props
 */
export default function RouteMap({ data, start, stops, selected, onSelect }) {
  return (
    <Map mapId={MAP_ID} defaultCenter={{ lat: 11.934, lng: 79.83 }} defaultZoom={12} gestureHandling="greedy"
      mapTypeControl={false} streetViewControl={false} fullscreenControl={false} clickableIcons={false}
      style={{ width: '100%', height: '100%' }}>
      <RouteLayer data={data} start={start} stops={stops} selected={selected} onSelect={onSelect} />
    </Map>
  );
}

/** Markers (start + numbered stops, coloured by day) + the route, panning to the selection. */
function RouteLayer({ data, start, stops, selected, onSelect }) {
  const map = useMap();
  // markers: start (S) + each stop numbered within its day; coloured by day when 2 days.
  const markers = useMemo(() => {
    const out = [{ idx: start, label: 'S', color: '#F59E0B', isStart: true }];
    const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
    const multi = days.length > 1;
    days.forEach(dn => {
      stops.filter(s => (s.day || 1) === dn).forEach((s, k) => {
        out.push({ idx: s.idx, label: (multi ? `${dn}·` : '') + (k + 1), color: multi ? DAY_COLORS[(dn - 1) % DAY_COLORS.length] : (CAT_HEX[data.places[s.idx]?.cat] || '#2196F3') });
      });
    });
    return out;
  }, [start, stops, data]);

  // Centre on the start when there's no route (Directions auto-fits otherwise).
  useEffect(() => {
    if (!map || stops.length || !data.places[start]) return;
    map.setCenter({ lat: data.places[start].lat, lng: data.places[start].lng });
    map.setZoom(13);
  }, [map, start, stops.length, data]);

  // Pan to the place picked from the timeline or a marker, so the info card has context.
  useEffect(() => {
    if (!map || selected == null || !data.places[selected]) return;
    map.panTo({ lat: data.places[selected].lat, lng: data.places[selected].lng });
    if ((map.getZoom() || 0) < 14) map.setZoom(15);
  }, [map, selected, data]);

  return (
    <>
      {markers.map((m, i) => {
        const p = data.places[m.idx]; if (!p) return null;
        return (
          <AdvancedMarker key={m.idx + '-' + i} position={{ lat: p.lat, lng: p.lng }} zIndex={m.idx === selected ? 10000 : (m.isStart ? 9999 : 100 + i)} onClick={() => onSelect(m.idx)}>
            <PinChip label={m.label} name={p.name} color={m.color} active={m.idx === selected} />
          </AdvancedMarker>
        );
      })}
      <DirectionsRoute data={data} start={start} stops={stops} selected={selected} />
    </>
  );
}

/** A pill marker: coloured numbered badge + the place name, sitting above its point. */
function PinChip({ label, name, color, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 3px', transform: active ? 'translateY(-6px) scale(1.08)' : 'translateY(-6px)',
      background: active ? '#23262e' : '#15171c', border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.16)', borderRadius: 999,
      boxShadow: active ? `0 0 0 3px ${color}44, 0 3px 12px rgba(0,0,0,0.5)` : '0 3px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'transform .12s ease' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: '#0B1020', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ECEDEE', fontSize: 12.5, fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    </div>
  );
}

/**
 * Draws the day's driving route as per-leg polylines, runs a car along it, and
 * spotlights one leg when a stop is selected (dims the rest) — so an 8-stop tangle
 * becomes readable. `stops` is a single day's ordered stops (leg k arrives at stop k).
 * Renders nothing (imperatively manages google.maps overlays); returns null.
 */
function DirectionsRoute({ data, start, stops, selected }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');
  const markerLib = useMapsLibrary('marker');
  const linesRef = useRef([]);          // [{ line, leg }]
  const carRef = useRef(null);
  const carElRef = useRef(null);
  const rotRef = useRef(null);
  const rafRef = useRef(null);
  const pathRef = useRef(null);         // { pts, segLen, total, legOf }
  const lastLegRef = useRef(-2);        // last leg the car lit up (car mode)

  const activeLeg = selected != null ? stops.findIndex(s => s.idx === selected) : -1;  // leg arriving at the tapped stop
  const activeLegRef = useRef(-1);
  activeLegRef.current = activeLeg;

  // car mode (no selection): ONLY the leg the car is on is lit; the rest ghost to a faint grey
  const ghostLeg = (focus) => {
    linesRef.current.forEach(({ line, leg }) => {
      if (leg === focus) line.setOptions({ strokeColor: LEG_COLORS[leg % LEG_COLORS.length], strokeOpacity: 1, strokeWeight: 6, zIndex: 20 });
      else line.setOptions({ strokeColor: '#64748B', strokeOpacity: 0.18, strokeWeight: 3, zIndex: 1 });
    });
  };
  // tap mode: spotlight the selected leg, dim the rest (car hidden)
  const selectLeg = (al) => {
    linesRef.current.forEach(({ line, leg }) => {
      if (leg === al) line.setOptions({ strokeColor: LEG_COLORS[leg % LEG_COLORS.length], strokeOpacity: 1, strokeWeight: 8, zIndex: 30 });
      else line.setOptions({ strokeColor: '#64748B', strokeOpacity: 0.16, strokeWeight: 3, zIndex: 1 });
    });
  };
  const fullRoute = () => linesRef.current.forEach(({ line, leg }) => line.setOptions({ strokeColor: LEG_COLORS[leg % LEG_COLORS.length], strokeOpacity: 0.9, strokeWeight: 5, zIndex: 1 }));

  useEffect(() => {
    if (!map || !routesLib || !geometryLib || !markerLib) return;
    let cancelled = false;
    const clear = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      linesRef.current.forEach(o => o.line.setMap(null)); linesRef.current = [];
      if (carRef.current) { carRef.current.map = null; carRef.current = null; }
      carElRef.current = null; pathRef.current = null;
    };
    clear();
    if (!stops.length || !data.places[start]) return;
    const g = window.google.maps;
    const pt = i => ({ lat: data.places[i].lat, lng: data.places[i].lng });
    const idxs = stops.map(s => s.idx);
    const bounds = new g.LatLngBounds();
    new routesLib.DirectionsService().route({
      origin: pt(start), destination: pt(idxs[idxs.length - 1]),
      waypoints: idxs.slice(0, -1).map(idx => ({ location: pt(idx), stopover: true })),
      travelMode: g.TravelMode.DRIVING, optimizeWaypoints: false,
    }, (res, status) => {
      if (cancelled || status !== 'OK' || !res.routes[0]) return;
      const full = [], legOf = [];
      res.routes[0].legs.forEach((leg, li) => {
        const path = [];
        leg.steps.forEach(st => (st.path || []).forEach(q => { path.push(q); bounds.extend(q); full.push(q); legOf.push(li); }));
        const line = new g.Polyline({ path, map, strokeColor: LEG_COLORS[li % LEG_COLORS.length], strokeOpacity: 0.9, strokeWeight: 5, zIndex: 1 });
        linesRef.current.push({ line, leg: li });
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
      const canRun = full.length > 1;
      if (activeLegRef.current >= 0) selectLeg(activeLegRef.current);
      else if (canRun) ghostLeg(legOf[0]);
      else fullRoute();

      // ---- animated car; only its current leg stays lit ----
      if (canRun) {
        const segLen = []; let total = 0;
        for (let i = 1; i < full.length; i++) { const d = geometryLib.spherical.computeDistanceBetween(full[i - 1], full[i]); segLen.push(d); total += d; }
        pathRef.current = { pts: full, segLen, total, legOf };
        const el = document.createElement('div');
        el.style.cssText = 'width:24px;height:24px;';
        el.innerHTML = `<div style="width:24px;height:24px;transform:translateY(50%);"><div style="width:24px;height:24px;transform-origin:center center;">${CAR_SVG}</div></div>`;
        carElRef.current = el; rotRef.current = el.firstElementChild.firstElementChild;
        if (activeLegRef.current >= 0) el.style.opacity = '0';
        carRef.current = new markerLib.AdvancedMarkerElement({ map, position: full[0], content: el, zIndex: 9998 });
        const DURATION = Math.min(18000, Math.max(8000, total / 2));
        let startTs = 0;
        const tick = (ts) => {
          const pd = pathRef.current; if (!pd || pd.total <= 0 || !carRef.current) return;
          if (!startTs) startTs = ts;
          const target = (((ts - startTs) % DURATION) / DURATION) * pd.total;
          let acc = 0, i = 1;
          while (i < pd.pts.length && acc + pd.segLen[i - 1] < target) { acc += pd.segLen[i - 1]; i++; }
          if (i >= pd.pts.length) i = pd.pts.length - 1;
          const sf = pd.segLen[i - 1] ? (target - acc) / pd.segLen[i - 1] : 0;
          carRef.current.position = geometryLib.spherical.interpolate(pd.pts[i - 1], pd.pts[i], sf);
          rotRef.current.style.transform = `rotate(${geometryLib.spherical.computeHeading(pd.pts[i - 1], pd.pts[i])}deg)`;
          const curLeg = pd.legOf[Math.min(i, pd.legOf.length - 1)];   // light only the leg the car is on
          if (activeLegRef.current < 0 && curLeg !== lastLegRef.current) { lastLegRef.current = curLeg; ghostLeg(curLeg); }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    });
    return () => { cancelled = true; clear(); };
  }, [map, routesLib, geometryLib, markerLib, data, start, stops]);

  useEffect(() => {                                        // selection changed → tap-mode highlight, or back to the moving car
    if (!linesRef.current.length) return;
    if (activeLeg >= 0) { selectLeg(activeLeg); if (carElRef.current) carElRef.current.style.opacity = '0'; }
    else if (carElRef.current) { carElRef.current.style.opacity = '1'; lastLegRef.current = -2; }
    else fullRoute();
  }, [activeLeg]);

  return null;
}
