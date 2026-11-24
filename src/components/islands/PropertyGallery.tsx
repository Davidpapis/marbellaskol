import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Images } from 'lucide-react';

interface Props {
  images: string[];
  title: string;
  lang: 'en' | 'es';
}

export default function PropertyGallery({ images, title, lang }: Props) {
  const safeImages = images.length > 0 ? images : ['/images/hero-skol.jpg'];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openAt = (idx: number) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  };

  const prev = () => setActiveIndex((i) => (i === 0 ? safeImages.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === safeImages.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, safeImages.length]);

  const mosaic = safeImages.slice(0, 5);
  const seeAllLabel =
    lang === 'es' ? `Ver las ${safeImages.length} fotos` : `See all ${safeImages.length} photos`;

  return (
    <>
      {/* Mosaico Bento de 5 fotos a ancho completo (estilo lujo / Airbnb) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE8F2] bg-[#F3F8FC]">
        {mosaic.length >= 5 ? (
          <div className="grid gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[460px] lg:h-[520px]">
            <button
              type="button"
              onClick={() => openAt(0)}
              className="group relative col-span-2 row-span-2 h-72 cursor-pointer overflow-hidden md:h-full"
            >
              <img
                src={mosaic[0]}
                alt={`${title} — 1`}
                loading="eager"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>

            {mosaic.slice(1, 5).map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                type="button"
                onClick={() => openAt(idx + 1)}
                className="group relative hidden cursor-pointer overflow-hidden md:block"
              >
                <img
                  src={src}
                  alt={`${title} — ${idx + 2}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {idx === 3 && safeImages.length > 5 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[#064273]/45 text-sm font-semibold text-white backdrop-blur-[1px] transition-colors group-hover:bg-[#064273]/55">
                    +{safeImages.length - 5} {lang === 'es' ? 'fotos' : 'photos'}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="group relative block aspect-[16/9] w-full cursor-pointer overflow-hidden"
          >
            <img
              src={mosaic[0]}
              alt={title}
              loading="eager"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </button>
        )}

        <button
          type="button"
          onClick={() => openAt(0)}
          className="btn-tactile absolute right-4 bottom-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/95 px-4 py-2 text-xs font-semibold text-[#0B2239] shadow-md backdrop-blur-sm hover:bg-white"
        >
          <Images className="h-4 w-4 text-[#0B6FA4]" aria-hidden="true" />
          <span>{seeAllLabel}</span>
        </button>
      </div>

      {/* Lightbox a pantalla completa */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex flex-col bg-[#061829]/95 p-4 backdrop-blur-md sm:p-8"
        >
          <div className="flex items-center justify-between text-white">
            <span className="font-mono text-sm font-medium tabular-nums">
              {activeIndex + 1} / {safeImages.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={lang === 'es' ? 'Cerrar galería' : 'Close gallery'}
              className="btn-tactile flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative my-4 flex flex-1 items-center justify-center overflow-hidden">
            <button
              type="button"
              onClick={prev}
              aria-label={lang === 'es' ? 'Foto anterior' : 'Previous photo'}
              className="btn-tactile absolute left-2 z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              src={safeImages[activeIndex]}
              alt={`${title} — ${activeIndex + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] max-w-full rounded-xl object-contain"
            />

            <button
              type="button"
              onClick={next}
              aria-label={lang === 'es' ? 'Siguiente foto' : 'Next photo'}
              className="btn-tactile absolute right-2 z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-1">
            {safeImages.map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-opacity ${
                  idx === activeIndex ? 'border-[#5CD2FF] opacity-100' : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
