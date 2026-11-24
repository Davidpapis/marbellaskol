import { useEffect, useRef, useState } from 'react';
import { Wind, Thermometer, Sunrise, Sunset, MapPin, X } from 'lucide-react';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  maxTemp: number;
  minTemp: number;
  windKmh: number;
  code: number;
  isDay: boolean;
  sunrise: string; // HH:MM
  sunset: string;  // HH:MM
  sunriseMin: number;
  sunsetMin: number;
}

const CACHE_KEY = 'marbellaskol_weather_v2';
const CACHE_TTL_MS = 15 * 60 * 1000;

function parseTimeToMinutes(isoOrHm: string): { hm: string; mins: number } {
  const hm = isoOrHm.includes('T') ? isoOrHm.split('T')[1]?.slice(0, 5) ?? '08:00' : isoOrHm.slice(0, 5);
  const [hStr, mStr] = hm.split(':');
  const h = Number.parseInt(hStr || '8', 10);
  const m = Number.parseInt(mStr || '0', 10);
  return { hm, mins: h * 60 + m };
}

function getMarbellaMinutesNow(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '12');
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Calcula la fase lunar real exacta para la fecha actual
 * usando la época de luna nueva conocida (2000-01-06 18:14 UTC) y ciclo sinódico 29.53058867 días.
 */
function getMoonPhaseInfo(lang: Lang): {
  phase: number; // 0..1
  illumination: number; // 0..100
  name: string;
} {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (Date.now() - knownNewMoon) / 86400000;
  const phase = ((diffDays % synodic) + synodic) % synodic / synodic;
  const illumination = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100);

  const namesEn = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ];
  const namesEs = [
    'Luna Nueva',
    'Luna Creciente',
    'Cuarto Creciente',
    'Gibosa Creciente',
    'Luna Llena',
    'Gibosa Menguante',
    'Cuarto Menguante',
    'Luna Menguante',
  ];

  const idx = Math.floor(((phase * 8) + 0.5) % 8);
  return {
    phase,
    illumination,
    name: (lang === 'es' ? namesEs[idx] : namesEn[idx]) || 'Full Moon',
  };
}

function MoonPhaseSvg({ phase, size = 20 }: { phase: number; size?: number }) {
  // Dibuja un disco lunar preciso con la zona iluminada según la fase 0..1
  const r = 9;
  const cx = 12;
  const cy = 12;
  const waxing = phase <= 0.5;
  const k = Math.cos(phase * 2 * Math.PI); // +1 en nueva, 0 en cuartos, -1 en llena
  const rx = Math.abs(k) * r;
  const sweepTerminator = waxing ? (phase < 0.25 ? 0 : 1) : phase < 0.75 ? 1 : 0;
  const outerSweep = waxing ? 1 : 0;

  // Path de la parte iluminada
  const litPath =
    phase < 0.02 || phase > 0.98
      ? ''
      : phase > 0.48 && phase < 0.52
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
        : `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminator} ${cx} ${cy - r} Z`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="#1E3A5F" stroke="#93C5FD" strokeWidth="1" />
      {litPath && <path d={litPath} fill="#FEF08A" />}
    </svg>
  );
}

function SkyIcon({
  mode,
  phase,
  size = 20,
}: {
  mode: 'day' | 'golden' | 'night';
  phase: number;
  size?: number;
}) {
  if (mode === 'night') {
    return <MoonPhaseSvg phase={phase} size={size} />;
  }
  if (mode === 'golden') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <path d="M12 3v2M5.6 6.6l1.4 1.4M18.4 6.6 17 8M3 14h2M19 14h2" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 15a5 5 0 0 1 10 0" fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" />
        <path d="M3 18h18" stroke="#0B6FA4" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 21h12" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="4.5" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function MarbellaWeather({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 22,
    feelsLike: 22,
    maxTemp: 24,
    minTemp: 16,
    windKmh: 11,
    code: 0,
    isDay: true,
    sunrise: '07:55',
    sunset: '18:15',
    sunriseMin: 7 * 60 + 55,
    sunsetMin: 18 * 60 + 15,
  });

  useEffect(() => {
    try {
      const cachedRaw = sessionStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as { ts: number; data: WeatherData };
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          setWeather(parsed.data);
          return;
        }
      }
    } catch {
      // ignore
    }

    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=36.5099&longitude=-4.8864&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=1'
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          json: {
            current?: {
              temperature_2m?: number;
              apparent_temperature?: number;
              weather_code?: number;
              wind_speed_10m?: number;
              is_day?: number;
            };
            daily?: {
              sunrise?: string[];
              sunset?: string[];
              temperature_2m_max?: number[];
              temperature_2m_min?: number[];
            };
          } | null
        ) => {
          if (!json?.current || typeof json.current.temperature_2m !== 'number') return;
          const sr = parseTimeToMinutes(json.daily?.sunrise?.[0] ?? '07:55');
          const ss = parseTimeToMinutes(json.daily?.sunset?.[0] ?? '18:15');
          const next: WeatherData = {
            temp: Math.round(json.current.temperature_2m),
            feelsLike: Math.round(json.current.apparent_temperature ?? json.current.temperature_2m),
            maxTemp: Math.round(json.daily?.temperature_2m_max?.[0] ?? json.current.temperature_2m + 2),
            minTemp: Math.round(json.daily?.temperature_2m_min?.[0] ?? json.current.temperature_2m - 4),
            windKmh: Math.round(json.current.wind_speed_10m ?? 10),
            code: json.current.weather_code ?? 0,
            isDay: json.current.is_day === 1,
            sunrise: sr.hm,
            sunset: ss.hm,
            sunriseMin: sr.mins,
            sunsetMin: ss.mins,
          };
          setWeather(next);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: next }));
          } catch {
            // ignore
          }
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const nowMin = getMarbellaMinutesNow();
  const nearSunrise = Math.abs(nowMin - weather.sunriseMin) <= 50;
  const nearSunset = Math.abs(nowMin - weather.sunsetMin) <= 50;
  const skyMode: 'day' | 'golden' | 'night' =
    nearSunrise || nearSunset ? 'golden' : weather.isDay ? 'day' : 'night';

  const moon = getMoonPhaseInfo(lang);
  const guideHref = lang === 'es' ? '/es/marbella' : '/marbella';

  const momentLabel =
    skyMode === 'golden'
      ? nearSunrise
        ? lang === 'es'
          ? 'Amanecer'
          : 'Sunrise'
        : lang === 'es'
          ? 'Atardecer'
          : 'Sunset'
      : skyMode === 'night'
        ? moon.name
        : lang === 'es'
          ? 'Sol de Marbella'
          : 'Marbella Sun';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`btn-tactile hidden cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors xl:inline-flex ${
          skyMode === 'night'
            ? 'border-[#1E3A5F]/25 bg-[#0B2239] text-white hover:bg-[#133354]'
            : skyMode === 'golden'
              ? 'border-orange-200 bg-gradient-to-r from-amber-50 to-orange-50 text-[#0B2239] hover:border-orange-300'
              : 'border-[#DCE8F2] bg-[#F3F8FC] text-[#0B2239] hover:border-[#199bd1] hover:bg-[#E7F4FC]'
        }`}
      >
        <SkyIcon mode={skyMode} phase={moon.phase} size={18} />
        <span className="flex flex-col items-start leading-none">
          <span className="font-mono text-xs font-bold tabular-nums">{weather.temp}°C Marbella</span>
          <span
            className={`mt-0.5 text-[10px] font-medium ${
              skyMode === 'night' ? 'text-sky-200' : 'text-[#4A6278]'
            }`}
          >
            {momentLabel}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={lang === 'es' ? 'Clima y cielo en Marbella' : 'Marbella live weather & sky'}
          style={{ transformOrigin: 'top right' }}
          className="absolute right-0 z-50 mt-2.5 w-80 overflow-hidden rounded-2xl border border-[#DCE8F2] bg-white shadow-xl shadow-[#064273]/15"
        >
          <div
            className={`flex items-center justify-between px-4 py-3.5 text-white ${
              skyMode === 'night'
                ? 'bg-gradient-to-r from-[#0B2239] to-[#163B63]'
                : skyMode === 'golden'
                  ? 'bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#0B6FA4]'
                  : 'bg-gradient-to-r from-[#0B6FA4] to-[#199bd1]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SkyIcon mode={skyMode} phase={moon.phase} size={28} />
              <div>
                <p className="text-xs font-semibold text-white/85">Marbella · Costa del Sol</p>
                <p className="font-mono text-xl font-bold leading-tight tabular-nums">
                  {weather.temp}°C · <span className="font-sans text-xs font-medium">{momentLabel}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-4 text-xs text-[#334E68]">
            {/* Amanecer y Atardecer */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] p-3">
                <p className="flex items-center gap-1.5 font-semibold text-[#4A6278]">
                  <Sunrise className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  {lang === 'es' ? 'Amanecer' : 'Sunrise'}
                </p>
                <p className="mt-1 font-mono text-base font-bold text-[#0B2239] tabular-nums">
                  {weather.sunrise}
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] p-3">
                <p className="flex items-center gap-1.5 font-semibold text-[#4A6278]">
                  <Sunset className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  {lang === 'es' ? 'Atardecer' : 'Sunset'}
                </p>
                <p className="mt-1 font-mono text-base font-bold text-[#0B2239] tabular-nums">
                  {weather.sunset}
                </p>
              </div>
            </div>

            {/* Fase Lunar Real de Hoy */}
            <div className="flex items-center justify-between rounded-xl border border-[#DCE8F2] bg-[#0B2239] px-3.5 py-2.5 text-white">
              <div className="flex items-center gap-2.5">
                <MoonPhaseSvg phase={moon.phase} size={26} />
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-sky-300 uppercase">
                    {lang === 'es' ? 'Luna de hoy' : 'Tonight’s Moon'}
                  </p>
                  <p className="text-xs font-bold">{moon.name}</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums">
                {moon.illumination}%
              </span>
            </div>

            {/* Máx/Mín + Viento */}
            <div className="flex items-center justify-between rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3.5 py-2.5 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold text-[#0B2239]">
                <Thermometer className="h-3.5 w-3.5 text-[#199bd1]" aria-hidden="true" />
                {weather.minTemp}° / {weather.maxTemp}°C
              </span>
              <span className="flex items-center gap-1.5 text-[#4A6278]">
                <Wind className="h-3.5 w-3.5 text-[#199bd1]" aria-hidden="true" />
                {weather.windKmh} km/h
              </span>
            </div>

            <a
              href={guideHref}
              onClick={() => setOpen(false)}
              className="btn-tactile flex w-full items-center justify-center gap-1.5 rounded-full bg-[#199bd1] px-4 py-2 text-xs font-bold text-white hover:bg-[#0B6FA4]"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'es' ? 'Explorar Guía de Marbella →' : 'Explore Marbella Guide →'}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
