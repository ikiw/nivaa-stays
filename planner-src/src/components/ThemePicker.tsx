// Theme toggle — one icon flips between the light and dark theme (we ship exactly one of
// each: Heritage White / Studio Dark). Saves the choice and reloads, since colours resolve
// at module-load; the plan lives in the URL, so it survives the reload.
import { IconButton, Tooltip } from '@mui/material';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import { THEMES, ACTIVE, setTheme } from '../theme/tokens';

export default function ThemePicker() {
  const isDark = ACTIVE.mode === 'dark';
  // Flip to the first theme of the opposite mode.
  const target = Object.entries(THEMES).find(([, t]) => t.mode === (isDark ? 'light' : 'dark'));
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <Tooltip title={label}>
      <IconButton onClick={() => target && setTheme(target[0])} size="small" aria-label={label} sx={{ color: 'text.secondary', flexShrink: 0 }}>
        {isDark ? <LightModeRounded sx={{ fontSize: 20 }} /> : <DarkModeRounded sx={{ fontSize: 20 }} />}
      </IconButton>
    </Tooltip>
  );
}
