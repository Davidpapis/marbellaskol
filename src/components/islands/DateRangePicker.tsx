import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  bubble?: boolean;
}

function toIso(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function formatShort(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const d = parseIso(iso);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(d);
}

function nightsBetween(from: string, to: string): number {
  if (!from || !to || to <= from) return 0;
  const ms = parseIso(to).getTime() - parseIso(from).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function buildMonthGrid(year: number, month: number): Array<{ iso: string; day: number } | null> {
  const firstDay = new Date(year, month, 1);
  // Lunes = 0 ... Domingo = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toIso(year, month, day), day });
  }
  return cells;
}

export default function DateRangePicker({ lang, dateFrom, dateTo, onChange, bubble = false }: Props) {
  const [open, setOpen] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [tempFrom, setTempFrom] = useState<string>(dateFrom);
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const initialDate = dateFrom ? parseIso(dateFrom) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    setTempFrom(dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickingEnd(false);
        setHoverIso(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPickingEnd(false);
        setHoverIso(null);
      }
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (iso: string) => {
    if (iso < todayIso) return;

    if (!pickingEnd) {
      // Primer clic: fecha de entrada
      setTempFrom(iso);
      setPickingEnd(true);
      onChange(iso, '');
    } else {
      // Segundo clic: fecha de salida
      if (iso <= tempFrom) {
        // Si pulsa una fecha anterior o igual, reinicia como nueva entrada
        setTempFrom(iso);
        onChange(iso, '');
      } else {
        onChange(tempFrom, iso);
        setPickingEnd(false);
        setHoverIso(null);
        setOpen(false);
      }
    }
  };

  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const months = [
    { year: viewYear, month: viewMonth, cells: buildMonthGrid(viewYear, viewMonth) },
    { year: secondYear, month: secondMonth, cells: buildMonthGrid(secondYear, secondMonth) },
  ];

  const weekdays =
    lang === 'es'
      ? ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
      : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const nights = nightsBetween(dateFrom, dateTo);
  const effectiveStart = pickingEnd ? tempFrom : dateFrom;
  const effectiveEnd = pickingEnd ? (hoverIso && hoverIso > tempFrom ? hoverIso : '') : dateTo;

  const monthLabel = (year: number, month: number) =>
    new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month, 1));

  return (
    <div ref={rootRef} className="relative">
      {bubble ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="btn-tactile bubble-glow flex h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-full bg-white/88 px-5 text-left text-sm font-semibold text-[#0B2239] shadow-lg shadow-[#041C32]/20 backdrop-blur-md hover:bg-white sm:w-auto sm:min-w-[275px]"
        >
          <span className="flex items-center gap-2.5 tabular-nums">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7F4FC] text-[#0B6FA4]">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold tracking-[0.1em] text-[#4A6278] uppercase">
                {lang === 'es' ? 'Entrada — Salida' : 'Check-in — Check-out'}
              </span>
              <span className="text-xs font-bold text-[#0B2239] sm:text-sm">
                {dateFrom ? formatShort(dateFrom, lang) : lang === 'es' ? 'Entrada' : 'Check-in'}
                <span className="mx-1.5 text-[#199bd1]">→</span>
                {dateTo ? formatShort(dateTo, lang) : lang === 'es' ? 'Salida' : 'Check-out'}
              </span>
            </span>
          </span>
          {nights > 0 && (
            <span
              title={`${nights} ${lang === 'es' ? (nights === 1 ? 'noche' : 'noches') : nights === 1 ? 'night' : 'nights'}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0B6FA4] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white"
            >
              <span>{nights}</span>
              <Moon className="h-3 w-3 fill-[#FEF08A] text-[#FEF08A]" aria-hidden="true" />
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex w-full cursor-pointer flex-col gap-1 px-2 py-1 text-left"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-muted uppercase">
            <Calendar className="h-3.5 w-3.5 text-[#199bd1]" aria-hidden="true" />
            {lang === 'es' ? 'Entrada — Salida' : 'Check-in — Check-out'}
          </span>
          <span className="flex h-10 items-center justify-between gap-2 rounded-lg border border-sand-200 bg-sand-50 px-3 text-sm font-medium text-ink tabular-nums transition-colors hover:border-[#199bd1]">
            <span className="truncate">
              {dateFrom ? formatShort(dateFrom, lang) : lang === 'es' ? 'Entrada' : 'Check-in'}
              <span className="mx-1.5 text-[#199bd1]">→</span>
              {dateTo ? formatShort(dateTo, lang) : lang === 'es' ? 'Salida' : 'Check-out'}
            </span>
            {nights > 0 && (
              <span
                title={`${nights} ${lang === 'es' ? (nights === 1 ? 'noche' : 'noches') : nights === 1 ? 'night' : 'nights'}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0B6FA4] px-2 py-0.5 font-mono text-[11px] font-bold text-white"
              >
                <span>{nights}</span>
                <Moon className="h-3 w-3 fill-[#FEF08A] text-[#FEF08A]" aria-hidden="true" />
              </span>
            )}
          </span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={lang === 'es' ? 'Seleccionar fechas de estancia' : 'Select stay dates'}
          style={{ transformOrigin: 'top left' }}
          className="absolute left-0 z-50 mt-2 w-[310px] rounded-2xl border border-[#DCE8F2] bg-white p-4 shadow-2xl shadow-[#064273]/20 md:w-[600px]"
        >
          {/* Cabecera instructiva paso 1 / paso 2 */}
          <div className="mb-3 flex items-center justify-between border-b border-[#EBF3FA] pb-2.5">
            <button
              type="button"
              onClick={prevMonth}
              aria-label={lang === 'es' ? 'Mes anterior' : 'Previous month'}
              className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#DCE8F2] text-[#0B2239] hover:border-[#199bd1] hover:text-[#0B6FA4]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-bold text-[#0B6FA4]">
              {pickingEnd
                ? lang === 'es'
                  ? '2. Elige tu fecha de salida'
                  : '2. Select your check-out date'
                : lang === 'es'
                  ? '1. Elige tu fecha de entrada'
                  : '1. Select your check-in date'}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              aria-label={lang === 'es' ? 'Mes siguiente' : 'Next month'}
              className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#DCE8F2] text-[#0B2239] hover:border-[#199bd1] hover:text-[#0B6FA4]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Cuadrícula de 1 mes en móvil / 2 meses en desktop */}
          <div className="grid gap-6 md:grid-cols-2">
            {months.map((m, mIdx) => (
              <div key={`${m.year}-${m.month}`} className={mIdx === 1 ? 'hidden md:block' : ''}>
                <p className="mb-2.5 text-center font-serif text-sm font-semibold capitalize text-[#0B2239]">
                  {monthLabel(m.year, m.month)}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#4A6278]">
                  {weekdays.map((wd) => (
                    <span key={wd} className="py-1">
                      {wd}
                    </span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-xs tabular-nums">
                  {m.cells.map((cell, idx) => {
                    if (!cell) return <span key={`empty-${idx}`} />;
                    const disabled = cell.iso < todayIso;
                    const isStart = cell.iso === effectiveStart;
                    const isEnd = Boolean(effectiveEnd && cell.iso === effectiveEnd);
                    const inRange = Boolean(
                      effectiveStart &&
                        effectiveEnd &&
                        cell.iso > effectiveStart &&
                        cell.iso < effectiveEnd
                    );

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDayClick(cell.iso)}
                        onMouseEnter={() => pickingEnd && setHoverIso(cell.iso)}
                        className={`flex h-9 w-full items-center justify-center font-medium transition-colors ${
                          disabled
                            ? 'cursor-not-allowed text-slate-300'
                            : isStart || isEnd
                              ? 'cursor-pointer rounded-full bg-[#0B6FA4] font-bold text-white shadow-xs'
                              : inRange
                                ? 'cursor-pointer bg-[#E7F4FC] text-[#064273]'
                                : 'cursor-pointer rounded-full text-[#0B2239] hover:bg-[#F3F8FC] hover:text-[#0B6FA4]'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
