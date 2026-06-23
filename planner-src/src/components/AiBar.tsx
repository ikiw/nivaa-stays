// The "prompt your ideal day" AI input bar (gold-rimmed pill). Controlled input;
// the parent owns the query string + the plan action.
import { Paper, TextField, Button, CircularProgress } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';

interface AiBarProps {
  isMobile: boolean;
  query: string;
  setQuery: (v: string) => void;
  onPlan: () => void;
  busy: boolean;
}

export default function AiBar({ isMobile, query, setQuery, onPlan, busy }: AiBarProps) {
  return (
    <Paper elevation={0} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', px: 0.6, py: 0.4, borderRadius: 999,
      backgroundColor: 'rgba(18,19,22,0.42)', backdropFilter: 'blur(14px)',
      boxShadow: '0 0 14px rgba(251,191,36,0.16), 0 4px 18px rgba(0,0,0,0.4)', transition: 'box-shadow .18s ease',
      '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1.5px', pointerEvents: 'none',
        background: 'linear-gradient(90deg, #0A0A0C 0%, #5B4A12 45%, #FBBF24 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' },
      '&:focus-within': { boxShadow: '0 0 0 3px rgba(251,191,36,0.20), 0 0 22px rgba(251,191,36,0.40), 0 4px 18px rgba(0,0,0,0.45)' } }}>
      <TextField fullWidth variant="standard" placeholder={isMobile ? 'Describe your ideal day…' : 'Prompt your ideal day — e.g. “beaches & filter coffee, relaxed pace”'}
        value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onPlan(); }}
        InputProps={{ disableUnderline: true, startAdornment: <AutoAwesomeRounded sx={{ color: 'secondary.main', ml: 0.8, mr: 1 }} />, sx: { fontSize: '0.95rem' } }} />
      <Button variant="contained" color="secondary" onClick={onPlan} disabled={busy} aria-label="Plan my day"
        startIcon={isMobile ? undefined : (busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRounded />)}
        sx={{ borderRadius: 999, flexShrink: 0, minWidth: isMobile ? 44 : undefined, px: isMobile ? 0 : 2 }}>
        {isMobile ? (busy ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />) : (busy ? 'Planning…' : 'Plan my day')}
      </Button>
    </Paper>
  );
}
