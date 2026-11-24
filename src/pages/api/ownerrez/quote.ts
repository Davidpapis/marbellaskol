import type { APIRoute } from 'astro';
import { getPropertyQuote, isOwnerRezConfigured } from '../../../lib/ownerrez';

export const prerender = false;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: APIRoute = async ({ url }) => {
  const propertyIdRaw = url.searchParams.get('propertyId') ?? '';
  const arrival = url.searchParams.get('arrival') ?? '';
  const departure = url.searchParams.get('departure') ?? '';
  const adultsRaw = url.searchParams.get('adults');

  const propertyId = Number.parseInt(propertyIdRaw, 10);
  if (!Number.isFinite(propertyId) || propertyId <= 0) {
    return new Response(
      JSON.stringify({ error: 'Valid numeric propertyId is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!ISO_DATE_RE.test(arrival) || !ISO_DATE_RE.test(departure) || departure <= arrival) {
    return new Response(
      JSON.stringify({ error: 'Valid arrival and departure dates (YYYY-MM-DD) are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isOwnerRezConfigured()) {
    return new Response(
      JSON.stringify({ configured: false, quote: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const adults = adultsRaw ? Number.parseInt(adultsRaw, 10) : 2;
    const quote = await getPropertyQuote({
      propertyId,
      arrival,
      departure,
      adults: Number.isFinite(adults) && adults > 0 ? adults : 2,
    });

    return new Response(JSON.stringify({ configured: true, quote }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Quote request failed';
    return new Response(JSON.stringify({ configured: true, quote: null, error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
