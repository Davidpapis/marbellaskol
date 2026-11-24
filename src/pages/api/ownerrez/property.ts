import type { APIRoute } from 'astro';
import { isOwnerRezConfigured } from '../../../lib/ownerrez';

export const prerender = false;

function getServerEnv(key: string): string {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const fromProc = typeof process !== 'undefined' ? process.env[key] : undefined;
  return (fromMeta || fromProc || '').trim();
}

function mapCategory(rawType: string, bedrooms: number, name: string): 'studio' | 'apartment' | 'duplex' | 'penthouse' | 'townhouse' {
  const blob = `${rawType} ${name}`.toLowerCase();
  if (blob.includes('duplex') || blob.includes('dúplex')) return 'duplex';
  if (blob.includes('penthouse') || blob.includes('ático') || blob.includes('atico')) return 'penthouse';
  if (blob.includes('townhouse') || blob.includes('house') || blob.includes('casa')) return 'townhouse';
  if (blob.includes('studio') || blob.includes('estudio') || bedrooms === 0) return 'studio';
  return 'apartment';
}

export const GET: APIRoute = async ({ url }) => {
  const idRaw = (url.searchParams.get('id') ?? '').trim();
  const id = Number.parseInt(idRaw, 10);

  if (!Number.isFinite(id) || id <= 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Introduce un ID numérico válido de OwnerRez (ej. 33837).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isOwnerRezConfigured()) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Faltan las credenciales de OwnerRez en el servidor (.env.local).' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const user = getServerEnv('OWNERREZ_API_USER');
    const token = getServerEnv('OWNERREZ_API_TOKEN');
    const auth = Buffer.from(`${user}:${token}`, 'utf-8').toString('base64');

    const res = await fetch(`https://api.ownerrez.com/v2/properties/${id}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'User-Agent': 'MarbellaSkol-Admin/1.0',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            res.status === 404
              ? `No existe ninguna propiedad con el ID ${id} en OwnerRez.`
              : `Error ${res.status} al consultar OwnerRez.`,
        }),
        { status: res.status === 404 ? 404 : 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const d = (await res.json()) as {
      id?: number;
      key?: string;
      name?: string;
      bedrooms?: number;
      bathrooms?: number;
      max_guests?: number;
      living_area?: number;
      property_type?: string;
      latitude?: number;
      longitude?: number;
      public_url?: string;
      thumbnail_url_large?: string;
      thumbnail_url?: string;
      address?: {
        street1?: string;
        street2?: string;
        city?: string;
        postal_code?: string;
      };
    };

    const bedrooms = typeof d.bedrooms === 'number' ? d.bedrooms : 1;
    const name = (d.name ?? '').trim();
    const streetParts = [d.address?.street1, d.address?.street2, d.address?.city]
      .filter(Boolean)
      .map((s) => String(s).replace(/,\s*$/, '').trim());

    const propertyUuid = (d.key ?? '').replace(/-/g, '');
    const isSkol = name.toLowerCase().includes('skol') || streetParts.join(' ').toLowerCase().includes('skol');

    return new Response(
      JSON.stringify({
        ok: true,
        property: {
          ownerrezId: d.id ?? id,
          propertyUuid,
          name,
          unitCode: name.replace(/Edificio\s+/i, '').replace(/Nº\s*/i, '').trim().slice(0, 40),
          bedrooms,
          bathrooms: typeof d.bathrooms === 'number' && d.bathrooms >= 1 ? d.bathrooms : 1,
          maxGuests: typeof d.max_guests === 'number' && d.max_guests >= 1 ? d.max_guests : 2,
          areaSqm: typeof d.living_area === 'number' && d.living_area > 0 ? Math.round(d.living_area) : 0,
          category: mapCategory(d.property_type ?? '', bedrooms, name),
          building: isSkol ? 'Edificio Skol' : d.address?.city || 'Marbella Centre',
          zone: d.address?.city || 'Marbella Centre',
          address: streetParts.join(', ') || 'Avenida Arias Maldonado 16, Marbella',
          latitude: typeof d.latitude === 'number' && d.latitude !== 0 ? d.latitude : 36.5076,
          longitude: typeof d.longitude === 'number' && d.longitude !== 0 ? d.longitude : -4.8902,
          publicUrl: d.public_url ?? '',
          thumbnailUrl: d.thumbnail_url_large || d.thumbnail_url || '',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
