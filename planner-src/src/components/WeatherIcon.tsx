// The weather condition as a crisp, colour-coded MUI icon (from a WMO code) — replaces
// the cross-platform-inconsistent emoji. Used by the day chip and each timeline stop.
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import WbCloudyRounded from '@mui/icons-material/WbCloudyRounded';
import CloudRounded from '@mui/icons-material/CloudRounded';
import GrainRounded from '@mui/icons-material/GrainRounded';
import WaterDropRounded from '@mui/icons-material/WaterDropRounded';
import ThunderstormRounded from '@mui/icons-material/ThunderstormRounded';
import AcUnitRounded from '@mui/icons-material/AcUnitRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { weatherInfo } from '../utils';
import type { WeatherKind } from '../types';

const ICONS: Record<WeatherKind, SvgIconComponent> = {
  sun: WbSunnyRounded, partly: WbCloudyRounded, cloud: CloudRounded, fog: CloudRounded,
  drizzle: WaterDropRounded, rain: GrainRounded, showers: GrainRounded, snow: AcUnitRounded, storm: ThunderstormRounded,
};

export default function WeatherIcon({ code, size = 16, title }: { code: number; size?: number; title?: string }) {
  const { icon, color, label } = weatherInfo(code);
  const Icon = ICONS[icon];
  return <Icon titleAccess={title || label} sx={{ fontSize: size, color }} />;
}
