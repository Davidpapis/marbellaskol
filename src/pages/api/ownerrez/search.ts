import type { APIRoute } from 'astro';
import { searchAvailableProperties } from '../../../lib/ownerrez';

export const prerender = false;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: APIRoute = async ({ url }) => {
  const availabilityFrom = url.searchParams.get('availabilityFrom') ?? '';
  const availabilityTo = url.searchParams.get('availabilityTo') ?? '';
  const guestsRaw = url.searchParams.get('guests');
  const bedroomsRaw = url.searchParams.get('bedroomsFrom');

  if (!ISO_DATE_RE.test(availabilityFrom) || !ISO_DATE_RE.test(availabilityTo)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid date format. Expected YYYY-MM-DD for availabilityFrom and availabilityTo.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (availabilityTo <= availabilityFrom) {
    return new Response(
      JSON.stringify({
        error: 'Check-out date (availabilityTo) must be strictly after check-in date (availabilityFrom).',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const guests = guestsRaw ? Number.parseInt(guestsRaw, 10) : undefined;
  const bedroomsFrom = bedroomsRaw ? Number.parseInt(bedroomsRaw, 10) : undefined;

  try {
    const result = await searchAvailableProperties({
      availabilityFrom,
      availabilityTo,
      guests: Number.isFinite(guests) && (guests ?? 0) > 0 ? guests : undefined,
      bedroomsFrom: Number.isFinite(bedroomsFrom) && (bedroomsFrom ?? 0) >= 0 ? bedroomsFrom : undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OwnerRez search failed';
    return new Response(
      JSON.stringify({
        configured: true,
        availablePropertyIds: [],
        items: [],
        source: 'ownerrez_live',
        error: message,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
