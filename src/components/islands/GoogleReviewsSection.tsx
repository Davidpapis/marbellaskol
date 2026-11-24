import { useEffect, useState } from 'react';
import { Star, ExternalLink } from 'lucide-react';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
}

interface ReviewItem {
  authorName: string;
  authorPhoto?: string;
  rating: number;
  relativeTime: string;
  text: string;
  source?: string;
}

// Testimonios reales verificados extraídos de www.marbellaskol.com (respaldo hasta activar GOOGLE_PLACES_API_KEY)
const VERIFIED_FALLBACK_REVIEWS: ReviewItem[] = [
  {
    authorName: 'Carol (UK)',
    rating: 5,
    relativeTime: 'Skol 326 · Marbella',
    source: 'Verified Stay',
    text: 'Excellent location could not be any better, right on the beach and a stroll away from everything. Pool and garden area very nice, handy on-site cafe. Very well equipped apartment and spotless clean. Would highly recommend.',
  },
  {
    authorName: 'Julie (France)',
    rating: 5,
    relativeTime: 'Edificio Skol · Marbella',
    source: 'Verified Stay',
    text: 'Très bon séjour dans le studio de Kathy, il est fonctionnel et pratique, très bien placé et la vue est juste splendide ! Réception 24/24 très pratique, accès direct à la plage et piscines.',
  },
  {
    authorName: 'Jackie (Ireland)',
    rating: 5,
    relativeTime: 'Marbella Centre',
    source: 'Verified Stay',
    text: 'The location was quite central and was near everything! The apartment was nice and spacious for 4 people. Everything spotless and very helpful team.',
  },
  {
    authorName: 'Amelie (Denmark)',
    rating: 5,
    relativeTime: 'Marbella Beachfront',
    source: 'Verified Stay',
    text: 'Skøn lejlighed, der bestemt lever op til forventningerne. Alt var rent og pænt. Beliggenheden kunne ikke være bedre; utrolig tæt på bymidten og strandpromenaden.',
  },
];

export default function GoogleReviewsSection({ lang }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>(VERIFIED_FALLBACK_REVIEWS);
  const [liveRating, setLiveRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [isLiveGoogle, setIsLiveGoogle] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/google-reviews?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            live?: boolean;
            rating?: number | null;
            userRatingCount?: number | null;
            reviews?: ReviewItem[];
          } | null
        ) => {
          if (data?.live && Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
            setLiveRating(data.rating ?? null);
            setReviewCount(data.userRatingCount ?? null);
            setIsLiveGoogle(true);
          }
        }
      )
      .catch(() => {});
  }, [lang]);

  const isEs = lang === 'es';

  return (
    <section className="border-y border-[#DCE8F2] bg-[#F3F8FC] py-16 lg:py-22">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE8F2] bg-white px-3.5 py-1.5 shadow-2xs">
              {/* Google G oficial */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-xs font-bold text-[#0B2239]">
                {isLiveGoogle && liveRating
                  ? `Google ${liveRating.toFixed(1)} ★ (${reviewCount ?? ''})`
                  : isEs
                    ? 'Reseñas Verificadas · Google Business'
                    : 'Verified Guest Reviews · Google Business'}
              </span>
            </div>

            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0B2239] sm:text-4xl">
              {isEs ? 'Lo que opinan nuestros huéspedes' : 'What Our Guests Say'}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#4A6278]">
              {isEs
                ? 'Opiniones reales de viajeros que han disfrutado de sus vacaciones en el Edificio Skol y Marbella con nuestro equipo.'
                : 'Real feedback from international guests who enjoyed their Marbella beachfront holiday with our local team.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.google.com/maps/search/?api=1&query=MarbellaSkol+Marbella"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile inline-flex items-center gap-1.5 rounded-full border border-[#DCE8F2] bg-white px-4 py-2.5 text-xs font-bold text-[#0B2239] hover:border-[#199bd1] hover:text-[#0B6FA4]"
            >
              <span>{isEs ? 'Ver ficha en Google' : 'View on Google'}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href="https://g.page/marbellaskol/review?gm"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile inline-flex items-center gap-1.5 rounded-full bg-[#199bd1] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0B6FA4]"
            >
              <span>{isEs ? 'Escribir reseña en Google' : 'Leave a Google Review'}</span>
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((rev, idx) => (
            <article
              key={`${rev.authorName}-${idx}`}
              className="card-lift flex flex-col rounded-2xl border border-[#DCE8F2] bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${rev.rating} out of 5 stars`}>
                  {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-[#199bd1]">
                  {isLiveGoogle ? 'Google' : rev.source || 'Verified'}
                </span>
              </div>

              <p className="mt-3.5 flex-1 text-xs leading-relaxed text-[#334E68]">
                “{rev.text}”
              </p>

              <div className="mt-4 flex items-center gap-2.5 border-t border-[#EBF3FA] pt-3">
                {rev.authorPhoto ? (
                  <img
                    src={rev.authorPhoto}
                    alt={rev.authorName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F4FC] font-serif text-xs font-bold text-[#0B6FA4]">
                    {rev.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#0B2239]">{rev.authorName}</p>
                  <p className="truncate text-[11px] text-[#4A6278]">{rev.relativeTime}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
