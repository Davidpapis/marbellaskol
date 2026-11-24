import { useEffect, useState } from 'react';
import HeroSearchBar from './HeroSearchBar';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  kicker: string;
  headline: string;
  subheadline: string;
  totalCount: number;
}

const SLIDES = [
  {
    src: '/images/marbella/fontanilla-real.jpg',
    tagEn: 'Marbella Beach',
    tagEs: 'Mar y Playas',
    altEn: 'Playa de la Fontanilla beachfront in Marbella',
    altEs: 'Playa de la Fontanilla en Marbella',
  },
  {
    src: '/images/marbella/dining-espetos.jpg',
    tagEn: 'Beach Gastronomy',
    tagEs: 'Gastronomía en Playa',
    altEn: 'Traditional grilled sardine espetos on the beach in Marbella',
    altEs: 'Espetos de sardinas tradicionales en la playa de Marbella',
  },
  {
    src: '/images/real/estepona-golf.jpg',
    tagEn: 'Marbella Golf',
    tagEs: 'Campos de Golf',
    altEn: 'Aerial view of golf course in Marbella Costa del Sol',
    altEs: 'Vista aérea de campo de golf en Marbella Costa del Sol',
  },
  {
    src: '/images/marbella/paseo-skol-real.jpg',
    tagEn: 'Paseo Marítimo',
    tagEs: 'Paseo Marítimo',
    altEn: 'Marbella Paseo Marítimo beachfront promenade near Edificio Skol',
    altEs: 'Paseo Marítimo de Marbella cerca del Edificio Skol',
  },
];

export default function HeroReel({ lang, kicker, headline, subheadline }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative z-20 flex min-h-[calc(100svh-112px)] flex-col justify-between bg-[#064273]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              idx === active ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={slide.src}
              alt={lang === 'es' ? slide.altEs : slide.altEn}
              loading={idx === 0 ? 'eager' : 'lazy'}
              className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                idx === active ? 'scale-108' : 'scale-100'
              }`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#042A4A]/52 via-[#042A4A]/28 to-[#042A4A]/76" />
      </div>

      {/* Bloque central: Titulares + Buscador en burbujas, todo perfectamente centrado */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pt-12 pb-8 text-center sm:px-6 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-4 py-1.5 text-xs font-bold tracking-[0.16em] text-white uppercase backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#5CD2FF]" aria-hidden="true" />
          {kicker}
        </p>

        <h1 className="mt-5 max-w-4xl text-4xl leading-[1.06] font-semibold text-white drop-shadow-md sm:text-5xl lg:text-6xl">
          {headline}
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/92 drop-shadow-xs sm:text-lg">
          {subheadline}
        </p>

        <div className="mt-9 flex w-full justify-center">
          <HeroSearchBar lang={lang} />
        </div>
      </div>

      {/* Pie del Hero centrado: 4 escenas + línea sutil animada de scroll */}
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Hero scenes">
          {SLIDES.map((s, idx) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={idx === active}
              onClick={() => setActive(idx)}
              className={`btn-tactile cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${
                idx === active
                  ? 'bg-white text-[#064273] shadow-md'
                  : 'border border-white/30 bg-[#042A4A]/40 text-white/90 hover:bg-white/25'
              }`}
            >
              {lang === 'es' ? s.tagEs : s.tagEn}
            </button>
          ))}
        </div>

        {/* Línea vertical minimalista que sube y baja invitando a descubrir abajo */}
        <a
          href="#apartamentos"
          aria-label={lang === 'es' ? 'Desplazar hacia abajo' : 'Scroll down'}
          className="group flex flex-col items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/75 uppercase transition-colors hover:text-white"
        >
          <span className="relative block h-10 w-[1.5px] overflow-hidden rounded-full bg-white/25">
            <span className="hero-scroll-line absolute inset-x-0 top-0 block h-5 w-full rounded-full bg-white" />
          </span>
        </a>
      </div>
    </section>
  );
}
