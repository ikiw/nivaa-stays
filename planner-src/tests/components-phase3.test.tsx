// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import DayPanel from '../src/components/DayPanel';
import PlaceInfoCard from '../src/components/PlaceInfoCard';
import RouteMap from '../src/components/RouteMap';
import TimelineNode from '../src/components/TimelineNode';
import AboutPanel from '../src/components/AboutPanel';
import AiBar from '../src/components/AiBar';
import Brand from '../src/components/Brand';
import CohortCard from '../src/components/CohortCard';
import CohortIcon from '../src/components/CohortIcon';
import Controls from '../src/components/Controls';
import DateStrip from '../src/components/DateStrip';
import HotelsDialog from '../src/components/HotelsDialog';
import MapView from '../src/components/MapView';
import { CatHead, Centered, GlanceRow, Grid } from '../src/components/Bits';
import { CategoryChips, PlanChips, SubChips } from '../src/components/Chips';
import PlaceCard from '../src/components/PlaceCard';
import PlacesPanel from '../src/components/PlacesPanel';
import PlaceThumb from '../src/components/PlaceThumb';
import RentalsDialog from '../src/components/RentalsDialog';
import ThemePicker from '../src/components/ThemePicker';
import WeatherChip from '../src/components/WeatherChip';
import WeatherIcon from '../src/components/WeatherIcon';
import type { ItineraryData, Place, Stop } from '../src/types';

vi.mock('@vis.gl/react-google-maps', () => ({
  Map: ({ children }: { children?: React.ReactNode }) => <div data-testid="route-map">{children}</div>,
  AdvancedMarker: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" data-testid="map-marker" onClick={onClick}>{children}</button>
  ),
  useMap: () => ({
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    getZoom: () => 13,
    panTo: vi.fn(),
    fitBounds: vi.fn(),
  }),
  useMapsLibrary: () => undefined,
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const places: Place[] = [
  { name: 'Pondicherry Bus Stand', cat: 'Area', desc: 'Start point', lat: 11.93, lng: 79.82, img: '/images/places/bus.avif' },
  { name: 'Promenade Beach', cat: 'Beach', desc: 'A rocky shoreline with a long promenade.', lat: 11.93, lng: 79.83, rating: 4.5, reviews: 1200, img: '/images/places/beach.avif' },
  { name: 'Sacred Heart Basilica', cat: 'Attraction', sub: 'spiritual', desc: 'Gothic-style church with stained glass.', lat: 11.92, lng: 79.82, rating: 4.6, reviews: 13007, img: '/images/places/basilica.avif' },
];

const data: ItineraryData = {
  generated: 'test',
  origin: 0,
  places,
  minutes: [
    [0, 10, 12],
    [10, 0, 8],
    [12, 8, 0],
  ],
  km: [
    [0, 2.4, 3.1],
    [2.4, 0, 1.7],
    [3.1, 1.7, 0],
  ],
};

function planner(overrides: Record<string, unknown> = {}) {
  const stops = (overrides.stops as Stop[] | undefined) ?? [];
  return {
    data,
    start: 0,
    startTime: '09:00',
    endTime: '23:00',
    stops,
    browsing: false,
    setBrowsing: vi.fn(),
    loadedId: null,
    optimize: vi.fn(),
    addBreak: vi.fn(),
    isMobile: false,
    shareAnchor: null,
    setShareAnchor: vi.fn(),
    moreAnchor: null,
    setMoreAnchor: vi.fn(),
    shareWhatsApp: vi.fn(),
    copyShareLink: vi.fn(),
    copyPlanText: vi.fn(),
    gmapsUrl: () => 'https://maps.example/route',
    setStops: vi.fn(),
    setActiveDay: vi.fn(),
    setLoadedId: vi.fn(),
    planFilter: 'all',
    loadCurated: vi.fn(),
    dayData: [{
      day: 1,
      tl: [
        { gi: 0, idx: 1, dm: 10, dk: 2.4, arrive: 550, depart: 625, stay: 75 },
        { gi: 1, idx: 2, dm: 8, dk: 1.7, arrive: 633, depart: 663, stay: 30 },
      ],
      drive: 30,
      km: 7.2,
      clock: 675,
      rMin: 12,
      rKm: 3.1,
    }],
    curDay: 1,
    tripDays: [1],
    tripDrive: 30,
    tripKm: 7.2,
    setStay: vi.fn(),
    move: vi.fn(),
    removeAt: vi.fn(),
    selectPlace: vi.fn(),
    selectedIdx: null,
    switchView: vi.fn(),
    weather: null,
    ...overrides,
  } as any;
}

describe('phase 3 planner UX components', () => {
  it('DayPanel empty state presents an intentional create flow', () => {
    const p = planner();
    render(<DayPanel planner={p} />);

    expect(screen.getByText('Pick a Pondicherry itinerary')).toBeInTheDocument();
    expect(screen.getByText('Browse ready-made trips')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Create your own'));
    expect(p.switchView).toHaveBeenCalledWith('places');
  });

  it('DayPanel clean itinerary uses local stop notes and read-mode actions', () => {
    render(<DayPanel planner={planner({ stops: [{ idx: 1, stay: 75, day: 1 }, { idx: 2, stay: 30, day: 1 }] })} />);

    expect(screen.getByText('Your Pondicherry itinerary')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
    expect(screen.getByText(/sea breeze/i)).toBeInTheDocument();
    expect(screen.getByText(/calm cultural stop/i)).toBeInTheDocument();
    expect(screen.queryByText('Optimize')).not.toBeInTheDocument();
  });

  it('TimelineNode highlights the active read-only row and selects the place on click', () => {
    const selectPlace = vi.fn();
    render(
      <TimelineNode
        idx={1}
        gi={0}
        dot={1}
        title="Promenade Beach"
        sub="9:10 AM - 10:25 AM"
        stay={75}
        readOnly
        active
        data={data}
        setStay={vi.fn()}
        move={vi.fn()}
        removeAt={vi.fn()}
        selectPlace={selectPlace}
      />,
    );

    fireEvent.click(screen.getByText('Promenade Beach'));
    expect(selectPlace).toHaveBeenCalledWith(1, 'timeline');
    expect(screen.getByText(/sea breeze/i)).toBeInTheDocument();
  });

  it('PlaceInfoCard shows itinerary context and plan tip', () => {
    render(
      <PlaceInfoCard
        place={places[2]}
        onClose={vi.fn()}
        context={{ time: '10:33 AM', stay: '30m stop', drive: '8 min drive in' }}
      />,
    );

    expect(screen.getByText('Sacred Heart Basilica')).toBeInTheDocument();
    expect(screen.getByText('10:33 AM')).toBeInTheDocument();
    expect(screen.getByText('30m stop')).toBeInTheDocument();
    expect(screen.getByText('8 min drive in')).toBeInTheDocument();
    expect(screen.getByText(/quieter pace/i)).toBeInTheDocument();
  });

  it('RouteMap keeps place names visible on map pins', () => {
    render(<RouteMap data={data} start={0} stops={[{ idx: 1, stay: 75, day: 1 }, { idx: 2, stay: 30, day: 1 }]} selected={null} onSelect={vi.fn()} />);

    const map = screen.getByTestId('route-map');
    expect(within(map).getByText('Pondicherry Bus Stand')).toBeInTheDocument();
    expect(within(map).getByText('Promenade Beach')).toBeInTheDocument();
    expect(within(map).getByText('Sacred Heart Basilica')).toBeInTheDocument();
  });

  it('renders the main leaf components without crashing', () => {
    const basePlanner = planner({
      byCat: { Beach: [1], Attraction: [2] },
      collapsed: new Set(),
      filter: 'Attraction',
      subFilter: 'All',
      selectFilter: vi.fn(),
      selectSubFilter: vi.fn(),
      planFilter: 'all',
      setPlanFilter: vi.fn(),
      toggleCat: vi.fn(),
      isStop: () => false,
      driveMin: (a: number, b: number) => data.minutes[a]?.[b] ?? 0,
      driveKm: (a: number, b: number) => data.km[a]?.[b] ?? 0,
      addToggle: vi.fn(),
      mapStops: [{ idx: 1, stay: 75, day: 1 }],
      selectedIdx: null,
      mapActive: false,
      activateMap: vi.fn(),
    });
    const curated = { id: 'family-2d', cohort: 'Family with kids', tag: 'Easy family route', start: 'Pondicherry Bus Stand', plan: [['Promenade Beach'], ['Sacred Heart Basilica']] };
    const weather = { date: '2026-07-02', code: 2, tMax: 33, tMin: 27, precip: 40, sunrise: '2026-07-02T05:55', sunset: '2026-07-02T18:35' };

    render(
      <div>
        <Brand />
        <AiBar isMobile={false} query="" setQuery={vi.fn()} onPlan={vi.fn()} busy={false} />
        <AboutPanel />
        <CohortIcon cohort="Family with kids" />
        <CohortCard cohort="Family with kids" oneDay={curated} twoDay={curated} len={2} onLoad={vi.fn()} />
        <Controls start={0} startTime="09:00" endTime="19:00" tripDate="2026-07-02" weather={weather} weatherLoading={false} starts={[{ p: places[0], i: 0 }]} onStartChange={vi.fn()} onWindowChange={vi.fn()} onDateChange={vi.fn()} />
        <DateStrip value="2026-07-02" onChange={vi.fn()} days={2} />
        <MapView planner={basePlanner} />
        <PlacesPanel planner={basePlanner} />
        <GlanceRow color="#5B8AC7" dot={1} name="Promenade Beach" time="9:10 AM" drive="10 min" />
        <Centered>Loading</Centered>
        <Grid><span>Grid item</span></Grid>
        <CatHead cat="Beach" count={1} collapsed={false} onToggle={vi.fn()} />
        <CategoryChips planner={basePlanner} />
        <PlanChips planner={basePlanner} />
        <SubChips planner={basePlanner} />
        <PlaceCard place={places[1]} added={false} dm={10} dk={2.4} onToggle={vi.fn()} />
        <PlaceThumb place={places[1]} size={32} tint="#5B8AC7" />
        <ThemePicker />
        <WeatherChip weather={weather} loading={false} outOfRange={false} />
        <WeatherIcon code={2} />
        <HotelsDialog open={false} onClose={vi.fn()} />
        <RentalsDialog open={false} onClose={vi.fn()} />
      </div>,
    );

    expect(screen.getByText('Pondicherry Planner')).toBeInTheDocument();
    expect(screen.getByText('Family with kids')).toBeInTheDocument();
    expect(screen.getByText('Your live map appears here')).toBeInTheDocument();
    expect(screen.getAllByText('Promenade Beach').length).toBeGreaterThan(0);
    expect(screen.getAllByText('33°').length).toBeGreaterThan(0);
  });
});
