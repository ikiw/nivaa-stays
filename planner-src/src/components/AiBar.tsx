// The "prompt your ideal day" AI input bar (gold-rimmed pill). Controlled input;
// the parent owns the query string + the plan action.
import { Paper, TextField, Button, CircularProgress } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { ACTIVE } from '../theme/tokens';

interface AiBarProps {
  isMobile: boolean;
  query: string;
  setQuery: (v: string) => void;
  onPlan: () => void;
  busy: boolean;
  autoFocus?: boolean;
}

export default function AiBar({ isMobile, query, setQuery, onPlan, busy, autoFocus }: AiBarProps) {
  return (
    <Paper elevation={0} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', px: 0.6, py: 0.4, borderRadius: 999,
      backgroundColor: ACTIVE.mode === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(18,19,22,0.42)', backdropFilter: 'blur(14px)',
      boxShadow: '0 0 14px rgba(251,191,36,0.16), 0 4px 18px rgba(0,0,0,0.4)', transition: 'box-shadow .18s ease',
      '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1.5px', pointerEvents: 'none',
        background: ACTIVE.mode === 'light' ? 'linear-gradient(90deg, #C2611B 0%, #E3A21A 100%)' : 'linear-gradient(90deg, #A57C1E 0%, #E3A21A 50%, #FBBF24 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' },
      '&:focus-within': { boxShadow: '0 0 0 3px rgba(251,191,36,0.20), 0 0 22px rgba(251,191,36,0.40), 0 4px 18px rgba(0,0,0,0.45)' } }}>
      <TextField fullWidth variant="standard" autoFocus={autoFocus} placeholder={isMobile ? 'Describe your ideal day…' : 'Prompt your ideal day — e.g. “beaches & filter coffee, relaxed pace”'}
        value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onPlan(); }}
        InputProps={{ disableUnderline: true, startAdornment: <AutoAwesomeRounded sx={{ color: 'secondary.main', ml: 0.8, mr: 1 }} />, sx: { fontSize: '0.95rem' } }} />
      <Button variant="contained" onClick={onPlan} disabled={busy} aria-label="Plan my day"
        startIcon={isMobile ? undefined : (busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRounded />)}
        sx={{ borderRadius: 999, flexShrink: 0, minWidth: isMobile ? 44 : undefined, px: isMobile ? 0 : 2,
          bgcolor: '#E6C35A', color: '#2A2100', boxShadow: 'none', '&:hover': { bgcolor: '#D9B441', boxShadow: 'none' },
          '&.Mui-disabled': { bgcolor: 'rgba(230,195,90,0.5)', color: 'rgba(42,33,0,0.55)' } }}>
        {isMobile ? (busy ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />) : (busy ? 'Planning…' : 'Plan my day')}
      </Button>
    </Paper>
  );
}
