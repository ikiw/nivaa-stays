// The live map: numbered day markers + a real driving route drawn as per-leg
// polylines, with an animated car and tap-to-spotlight a single leg. RouteMap is the
// only export; RouteLayer / PinChip / DirectionsRoute are internal collaborators.
import { useEffect, useMemo, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MAP_ID } from '../config';
import { CAT_HEX, ROUTE_HEX, START_HEX, PIN_BG, PIN_BG_ACTIVE, PIN_INK, NODE_BG, NODE_INK, CAR_SVG } from '../constants';
import type { ItineraryData, PlaceStop } from '../types';

interface RouteMapProps {
  data: ItineraryData;
  start: number;
  stops: PlaceStop[];        // the active day's real stops (pseudo rows never reach the map)
  selected: number | null;
  onSelect: (idx: number) => void;
  browseCatalog?: boolean;
  browsePlaceIndices?: number[];
}

/** The planner map. Renders the start + stop markers and the routed driving path. */
export default function RouteMap({ data, start, stops, selected, onSelect, browseCatalog = false, browsePlaceIndices }: RouteMapProps) {
  return (
    <Map mapId={MAP_ID} defaultCenter={{ lat: 11.934, lng: 79.83 }} defaultZoom={12} gestureHandling="greedy"
      colorScheme="DARK" renderingType="VECTOR"
      mapTypeControl={false} streetViewControl={false} fullscreenControl={false} clickableIcons={false}
      style={{ width: '100%', height: '100%' }}>
      <RouteLayer data={data} start={start} stops={stops} selected={selected} onSelect={onSelect} browseCatalog={browseCatalog} browsePlaceIndices={browsePlaceIndices} />
    </Map>
  );
}

interface Marker { idx: number; label: string; color: string; isStart?: boolean }

/** Markers (start + numbered stops, coloured by day) + the route, panning to the selection. */
function RouteLayer({ data, start, stops, selected, onSelect, browseCatalog = false, browsePlaceIndices }: RouteMapProps) {
  const map = useMap();
  // markers: start (S) + each stop numbered within its day; coloured by day when 2 days.
  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [{ idx: start, label: 'S', color: START_HEX, isStart: true }];
    const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
    const multi = days.length > 1;
    if (browseCatalog && !stops.length) {
      const browse = browsePlaceIndices || data.places.map((_, idx) => idx);
      browse.forEach((idx) => {
        const p = data.places[idx];
        if (idx === start || p.cat === 'Stay' || p.cat === 'Area') return;
        out.push({ idx, label: String(out.length), color: CAT_HEX[p.cat] || ROUTE_HEX });
      });
      return out.slice(0, 55);
    }
    days.forEach(dn => {
      stops.filter(s => (s.day || 1) === dn).forEach((s, k) => {
        out.push({ idx: s.idx, label: (multi ? `${dn}·` : '') + (k + 1), color: ROUTE_HEX });   // gold route markers to match the route line
      });
    });
    if (browsePlaceIndices?.length) {
      const routeIdxs = new Set([start, ...stops.map(s => s.idx)]);
      let n = 1;
      browsePlaceIndices.forEach(idx => {
        const p = data.places[idx];
        if (!p || routeIdxs.has(idx) || p.cat === 'Stay' || p.cat === 'Area') return;
        out.push({ idx, label: String(n++), color: CAT_HEX[p.cat] || ROUTE_HEX });
      });
    }
    return out;
  }, [start, stops, data, browseCatalog, browsePlaceIndices]);

  // Centre on the start when there's no route (Directions auto-fits otherwise).
  useEffect(() => {
    if (!map || !data.places[start]) return;
    if (browseCatalog || (browsePlaceIndices?.length && !stops.length)) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => {
        const p = data.places[m.idx];
        if (p) bounds.extend({ lat: p.lat, lng: p.lng });
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 55);
      return;
    }
    map.setCenter({ lat: data.places[start].lat, lng: data.places[start].lng });
    map.setZoom(13);
  }, [map, start, stops.length, data, browseCatalog, browsePlaceIndices, markers]);

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
      {!browseCatalog && <DirectionsRoute data={data} start={start} stops={stops} selected={selected} />}
    </>
  );
}

/** A pill marker: coloured numbered badge + the place name, sitting above its point. */
function PinChip({ label, name, color, active }: { label: string; name: string; color: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 3px', transform: active ? 'translateY(-6px) scale(1.08)' : 'translateY(-6px)',
      background: active ? PIN_BG_ACTIVE : PIN_BG, border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.16)', borderRadius: 999,
      boxShadow: active ? `0 0 0 3px ${color}44, 0 3px 12px rgba(0,0,0,0.5)` : '0 3px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'transform .12s ease' }}>
      <span style={{ width: 24, height: 25, position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 1, left: 2, width: 20, height: 20, borderRadius: '50% 50% 50% 0', background: color, transform: 'rotate(-45deg)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.22)' }} />
        <span style={{ position: 'relative', color: NODE_INK, fontWeight: 800, fontSize: label.length > 1 ? 10.5 : 12, lineHeight: 1, letterSpacing: label.length > 1 ? '-0.06em' : 0 }}>{label}</span>
      </span>
      <span style={{ color: PIN_INK, fontSize: 12.5, fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    </div>
  );
}

/**
 * Draws the day's driving route as per-leg polylines, runs a car along it, and
 * spotlights one leg when a stop is selected (dims the rest) — so an 8-stop tangle
 * becomes readable. `stops` is a single day's ordered stops (leg k arrives at stop k).
 * Renders nothing (imperatively manages google.maps overlays); returns null.
 */
function DirectionsRoute({ data, start, stops, selected }: Omit<RouteMapProps, 'onSelect'>) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');
  const markerLib = useMapsLibrary('marker');
  const linesRef = useRef<{ line: google.maps.Polyline; leg: number }[]>([]);
  const carRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const carElRef = useRef<HTMLDivElement | null>(null);
  const rotRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pathRef = useRef<{ pts: google.maps.LatLng[]; segLen: number[]; total: number; legOf: number[] } | null>(null);
  const lastLegRef = useRef(-2);        // last leg the car lit up (car mode)

  const activeLeg = selected != null ? stops.findIndex(s => s.idx === selected) : -1;  // leg arriving at the tapped stop
  const activeLegRef = useRef(-1);
  activeLegRef.current = activeLeg;

  // car mode (no selection): ONLY the leg the car is on is lit; the rest ghost to a faint grey
  const ghostLeg = (focus: number) => {
    linesRef.current.forEach(({ line, leg }) => {
      if (leg === focus) line.setOptions({ strokeColor: ROUTE_HEX, strokeOpacity: 1, strokeWeight: 6, zIndex: 20 });
      else line.setOptions({ strokeColor: '#64748B', strokeOpacity: 0.18, strokeWeight: 3, zIndex: 1 });
    });
  };
  // tap mode: spotlight the selected leg, dim the rest (car hidden)
  const selectLeg = (al: number) => {
    linesRef.current.forEach(({ line, leg }) => {
      if (leg === al) line.setOptions({ strokeColor: ROUTE_HEX, strokeOpacity: 1, strokeWeight: 8, zIndex: 30 });
      else line.setOptions({ strokeColor: '#64748B', strokeOpacity: 0.16, strokeWeight: 3, zIndex: 1 });
    });
  };
  const fullRoute = () => linesRef.current.forEach(({ line, leg }) => line.setOptions({ strokeColor: ROUTE_HEX, strokeOpacity: 0.9, strokeWeight: 5, zIndex: 1 }));

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
    const g = google.maps;
    const pt = (i: number): google.maps.LatLngLiteral => ({ lat: data.places[i].lat, lng: data.places[i].lng });
    const idxs = stops.map(s => s.idx);
    const bounds = new g.LatLngBounds();
    new routesLib.DirectionsService().route({
      origin: pt(start), destination: pt(idxs[idxs.length - 1]),
      waypoints: idxs.slice(0, -1).map(idx => ({ location: pt(idx), stopover: true })),
      travelMode: g.TravelMode.DRIVING, optimizeWaypoints: false,
    }, (res, status) => {
      if (cancelled || status !== g.DirectionsStatus.OK || !res || !res.routes[0]) return;
      const full: google.maps.LatLng[] = [], legOf: number[] = [];
      res.routes[0].legs.forEach((leg, li) => {
        const path: google.maps.LatLng[] = [];
        leg.steps.forEach(st => (st.path || []).forEach(q => { path.push(q); bounds.extend(q); full.push(q); legOf.push(li); }));
        const line = new g.Polyline({ path, map, strokeColor: ROUTE_HEX, strokeOpacity: 0.9, strokeWeight: 5, zIndex: 1 });
        linesRef.current.push({ line, leg: li });
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 110);
      const canRun = full.length > 1;
      if (activeLegRef.current >= 0) selectLeg(activeLegRef.current);
      else if (canRun) ghostLeg(legOf[0]);
      else fullRoute();

      // ---- animated car; only its current leg stays lit ----
      if (canRun) {
        const segLen: number[] = []; let total = 0;
        for (let i = 1; i < full.length; i++) { const d = geometryLib.spherical.computeDistanceBetween(full[i - 1], full[i]); segLen.push(d); total += d; }
        pathRef.current = { pts: full, segLen, total, legOf };
        const el = document.createElement('div');
        el.style.cssText = 'width:24px;height:24px;';
        el.innerHTML = `<div style="width:24px;height:24px;transform:translateY(50%);"><div style="width:24px;height:24px;transform-origin:center center;">${CAR_SVG}</div></div>`;
        carElRef.current = el; rotRef.current = (el.firstElementChild?.firstElementChild ?? null) as HTMLElement | null;
        if (activeLegRef.current >= 0) el.style.opacity = '0';
        carRef.current = new markerLib.AdvancedMarkerElement({ map, position: full[0], content: el, zIndex: 9998 });
        const DURATION = Math.min(36000, Math.max(16000, total));   // ms per full loop — slower, calmer car
        let startTs = 0;
        const tick = (ts: number) => {
          const pd = pathRef.current; const car = carRef.current;
          if (!pd || pd.total <= 0 || !car) return;
          if (!startTs) startTs = ts;
          const target = (((ts - startTs) % DURATION) / DURATION) * pd.total;
          let acc = 0, i = 1;
          while (i < pd.pts.length && acc + pd.segLen[i - 1] < target) { acc += pd.segLen[i - 1]; i++; }
          if (i >= pd.pts.length) i = pd.pts.length - 1;
          const sf = pd.segLen[i - 1] ? (target - acc) / pd.segLen[i - 1] : 0;
          car.position = geometryLib.spherical.interpolate(pd.pts[i - 1], pd.pts[i], sf);
          if (rotRef.current) rotRef.current.style.transform = `rotate(${geometryLib.spherical.computeHeading(pd.pts[i - 1], pd.pts[i])}deg)`;
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
