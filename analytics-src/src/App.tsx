import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar, Toolbar, Box, Typography, Button, IconButton, Container, Stack,
  ToggleButtonGroup, ToggleButton, CircularProgress, Card, Link, Tooltip,
} from '@mui/material';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import { useAuth } from './useAuth';
import { fetchAnalytics, monthLabel, fmtINR, TARGET_DEFAULT } from './lib';
import type { AnalyticsData } from './types';
import CurrentMonth from './components/CurrentMonth';
import MonthView from './components/MonthView';
import AllMonths from './components/AllMonths';

const NAV = [
  { href: '/admin.html', label: 'Bookings' },
  { href: '/admin-rank.html', label: 'Rank tracker' },
  { href: '/admin-competitors.html', label: 'Competitors' },
];

function Centered({ children }: { children: React.ReactNode }) {
  return <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>{children}</Box>;
}

export default function App() {
  const auth = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<string>('current');
  const signinDone = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fetchAnalytics()); }
    catch { setError('Could not load analytics. Refresh, or check the Apps Script deployment.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (auth.isAdmin) load(); }, [auth.isAdmin, load]);

  // Render the Google sign-in button once the login view is on screen.
  useEffect(() => {
    if (auth.ready && !auth.isAdmin && !signinDone.current) {
      signinDone.current = true;
      auth.renderSignInButton('g-signin-analytics');
    }
    if (auth.isAdmin) signinDone.current = false;
  }, [auth.ready, auth.isAdmin, auth]);

  // ---- auth gates ----
  if (!auth.ready) return <Centered><CircularProgress /></Centered>;

  if (!auth.isAdmin) {
    return (
      <Centered>
        <Card sx={{ p: 4, maxWidth: 400, textAlign: 'center', border: '1px dashed', borderColor: 'secondary.main' }}>
          <Typography variant="h5" color="primary" sx={{ mb: 1 }}>Admin sign-in</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>
            Sign in with the Nivaa Stays Google account to view booking analytics.
          </Typography>
          <Box id="g-signin-analytics" sx={{ display: 'flex', justifyContent: 'center' }} />
          {auth.email && (
            <Typography sx={{ fontSize: 12, color: 'error.main', mt: 2 }}>
              {auth.email} isn’t the admin account. Sign in with {auth.adminEmail}.
            </Typography>
          )}
        </Card>
      </Centered>
    );
  }

  // ---- dashboard ----
  const months = data?.months || [];
  const curKey = data?.current?.month || months[months.length - 1]?.month || '';
  const pastMonths = months.filter((m) => m.month !== curKey).reverse();
  const validView = view === 'current' || view === 'all' || months.some((m) => m.month === view) ? view : 'current';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.dark', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Box component="img" src="/assets/logo.png" alt="" sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"Fraunces", serif', fontSize: '1.05rem', lineHeight: 1.1, color: '#fff' }}>Nivaa Stays</Typography>
            <Typography sx={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'secondary.light' }}>Admin · Analytics</Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} underline="hover" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>{n.label}</Link>
            ))}
            {auth.name && <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>· {auth.name}</Typography>}
          </Stack>
          <Tooltip title="Refresh"><span>
            <IconButton onClick={load} disabled={loading} sx={{ color: '#fff', ml: { xs: 'auto', md: 1 } }}>
              {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <RefreshRounded />}
            </IconButton>
          </span></Tooltip>
          <Tooltip title="Sign out"><IconButton onClick={auth.logout} sx={{ color: 'rgba(255,255,255,0.85)' }}><LogoutRounded /></IconButton></Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="overline" color="secondary.dark">Monthly Analytics</Typography>
          <Typography variant="h4" color="primary" sx={{ mb: 0.5 }}>Booking analytics</Typography>
          {data && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              As of {data.generated} · {data.rooms} rooms · target {fmtINR(data.revenueTarget || TARGET_DEFAULT)}/mo
            </Typography>
          )}
        </Box>

        {error && <Card sx={{ p: 3, textAlign: 'center', color: 'error.main', mb: 3 }}>{error}</Card>}

        {!data && loading && <Centered><CircularProgress /></Centered>}

        {data && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <ToggleButtonGroup exclusive size="small" value={validView}
                onChange={(_, v) => { if (v) setView(v); }}
                sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center', '& .MuiToggleButtonGroup-grouped': { border: '1px solid rgba(14,59,53,0.18)', borderRadius: '999px !important', mx: 0.25 } }}>
                <ToggleButton value="current">This month</ToggleButton>
                {pastMonths.map((m) => <ToggleButton key={m.month} value={m.month}>{monthLabel(m.month)}</ToggleButton>)}
                <ToggleButton value="all">All months</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {validView === 'current' && <CurrentMonth data={data} />}
            {validView === 'all' && <AllMonths data={data} />}
            {validView !== 'current' && validView !== 'all' && <MonthView data={data} monthKey={validView} />}
          </>
        )}
      </Container>
    </Box>
  );
}
