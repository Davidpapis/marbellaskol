import type { APIRoute } from 'astro';

export const prerender = false;

interface GooglePlaceReview {
  authorName: string;
  authorPhoto?: string;
  rating: number;
  relativeTime: string;
  text: string;
}

interface CachedPayload {
  ts: number;
  data: {
    live: boolean;
    rating: number | null;
    userRatingCount: number | null;
    googleMapsUri: string;
    reviews: GooglePlaceReview[];
  };
}

let cache: CachedPayload | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

function getEnv(key: string): string {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const fromProc = typeof process !== 'undefined' ? process.env[key] : undefined;
  return (fromMeta || fromProc || '').trim();
}

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const apiKey = getEnv('GOOGLE_PLACES_API_KEY');
  const placeId = getEnv('GOOGLE_PLACE_ID');

  if (!apiKey || !placeId) {
    return new Response(
      JSON.stringify({
        live: false,
        rating: null,
        userRatingCount: null,
        googleMapsUri: 'https://g.page/marbellaskol/review?gm',
        reviews: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cache.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  try {
    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`;
    const res = await fetch(endpoint, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Google Places API ${res.status}`);
    }

    const raw = (await res.json()) as {
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      reviews?: Array<{
        rating?: number;
        relativePublishTimeDescription?: string;
        text?: { text?: string };
        authorAttribution?: { displayName?: string; photoUri?: string };
      }>;
    };

    const reviews: GooglePlaceReview[] = (raw.reviews ?? [])
      .filter((r) => (r.rating ?? 0) >= 4 && r.text?.text)
      .slice(0, 6)
      .map((r) => ({
        authorName: r.authorAttribution?.displayName || 'Verified Guest',
        authorPhoto: r.authorAttribution?.photoUri,
        rating: r.rating ?? 5,
        relativeTime: r.relativePublishTimeDescription || '',
        text: r.text?.text || '',
      }));

    const payload: CachedPayload['data'] = {
      live: true,
      rating: raw.rating ?? null,
      userRatingCount: raw.userRatingCount ?? null,
      googleMapsUri: raw.googleMapsUri || 'https://g.page/marbellaskol/review?gm',
      reviews,
    };

    cache = { ts: Date.now(), data: payload };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new Response(
      JSON.stringify({
        live: false,
        rating: null,
        userRatingCount: null,
        googleMapsUri: 'https://g.page/marbellaskol/review?gm',
        reviews: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
