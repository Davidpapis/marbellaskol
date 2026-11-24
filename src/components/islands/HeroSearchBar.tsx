import { useState, type FormEvent } from 'react';
import { Users, BedDouble, Search } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
}

function addDaysIso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

export default function HeroSearchBar({ lang }: Props) {
  const [dateFrom, setDateFrom] = useState<string>(() => addDaysIso(1));
  const [dateTo, setDateTo] = useState<string>(() => addDaysIso(3));
  const [guests, setGuests] = useState<number>(2);
  const [bedrooms, setBedrooms] = useState<number>(0);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalFrom = dateFrom || addDaysIso(1);
    let finalTo = dateTo;
    if (!finalTo || finalTo <= finalFrom) {
      const next = new Date(finalFrom);
      next.setDate(next.getDate() + 2);
      finalTo = next.toISOString().slice(0, 10);
    }

    const params = new URLSearchParams();
    params.set('from', finalFrom);
    params.set('to', finalTo);
    params.set('guests', String(guests));
    if (bedrooms > 0) params.set('bedrooms', String(bedrooms));
    const base = lang === 'es' ? '/es/propiedades' : '/properties';
    window.location.href = `${base}?${params.toString()}`;
  };

  const t =
    lang === 'es'
      ? {
          guests: 'Huéspedes',
          bedrooms: 'Dormitorios',
          anyBedrooms: 'Todos',
          submit: 'Buscar',
        }
      : {
          guests: 'Guests',
          bedrooms: 'Bedrooms',
          anyBedrooms: 'Any',
          submit: 'Search',
        };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      aria-label={lang === 'es' ? 'Buscador de disponibilidad' : 'Availability search'}
    >
      {/* Burbuja 1: Entrada — Salida */}
      <DateRangePicker
        lang={lang}
        dateFrom={dateFrom}
        dateTo={dateTo}
        bubble={true}
        onChange={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />

      {/* Burbuja 2: Huéspedes */}
      <label className="bubble-glow flex h-13 cursor-pointer items-center gap-2.5 rounded-full bg-white/88 px-5 shadow-lg shadow-[#041C32]/20 backdrop-blur-md hover:bg-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7F4FC] text-[#0B6FA4]">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold tracking-[0.1em] text-[#4A6278] uppercase">
            {t.guests}
          </span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="cursor-pointer bg-transparent pr-2 text-xs font-bold text-[#0B2239] tabular-nums focus:outline-none sm:text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} {lang === 'es' ? (n === 1 ? 'huésped' : 'huéspedes') : n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
        </span>
      </label>

      {/* Burbuja 3: Dormitorios */}
      <label className="bubble-glow flex h-13 cursor-pointer items-center gap-2.5 rounded-full bg-white/88 px-5 shadow-lg shadow-[#041C32]/20 backdrop-blur-md hover:bg-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7F4FC] text-[#0B6FA4]">
          <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold tracking-[0.1em] text-[#4A6278] uppercase">
            {t.bedrooms}
          </span>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(Number(e.target.value))}
            className="cursor-pointer bg-transparent pr-2 text-xs font-bold text-[#0B2239] tabular-nums focus:outline-none sm:text-sm"
          >
            <option value={0}>{t.anyBedrooms}</option>
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
          </select>
        </span>
      </label>

      {/* Burbuja 4: Botón de Búsqueda Azul Mediterráneo */}
      <button
        type="submit"
        className="btn-tactile bubble-glow flex h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#199bd1] to-[#0B6FA4] px-8 text-sm font-bold text-white shadow-xl shadow-[#041C32]/30 hover:from-[#0B6FA4] hover:to-[#064273]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>{t.submit}</span>
      </button>
    </form>
  );
}
