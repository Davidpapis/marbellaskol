import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

interface CreatePropertyBody {
  slug: string;
  unitCode: string;
  internalRef?: string;
  vftLicense?: string;
  featured?: boolean;
  ownerrezId: number;
  propertyUuid?: string;
  calendarWidgetIdEn?: string;
  calendarWidgetIdEs?: string;
  bookingWidgetIdEn?: string;
  bookingWidgetIdEs?: string;
  reviewWidgetId?: string;
  publicUrl?: string;
  category: 'studio' | 'apartment' | 'duplex' | 'penthouse' | 'townhouse';
  building: string;
  zone: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqm?: number;
  seaView?: boolean;
  beachfront?: boolean;
  address: string;
  latitude: number;
  longitude: number;
  titleEn: string;
  summaryEn?: string;
  descriptionEn?: string;
  amenitiesEn?: string[];
  titleEs: string;
  summaryEs?: string;
  descriptionEs?: string;
  amenitiesEs?: string[];
  thumbnailFallbackUrl?: string;
  webpImages?: Array<{ name: string; dataUrl: string }>;
}

function sanitizeSlug(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as CreatePropertyBody;
    const slug = sanitizeSlug(body.slug || body.unitCode || '');

    if (!slug || slug.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El identificador (slug) o código de unidad es obligatorio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.titleEn || body.titleEn.trim().length < 5 || !body.titleEs || body.titleEs.trim().length < 5) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Introduce un título válido (mín. 5 caracteres) en Inglés y Español.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rootDir = process.cwd();
    const savedGallery: string[] = [];

    // Guardar fotos WebP optimizadas en public/uploads/properties/<slug>/
    if (Array.isArray(body.webpImages) && body.webpImages.length > 0) {
      const uploadDir = path.join(rootDir, 'public', 'uploads', 'properties', slug);
      await fs.mkdir(uploadDir, { recursive: true });

      for (let i = 0; i < body.webpImages.length; i++) {
        const item = body.webpImages[i];
        if (!item?.dataUrl?.startsWith('data:image/')) continue;
        const base64Part = item.dataUrl.split(',')[1];
        if (!base64Part) continue;
        const buf = Buffer.from(base64Part, 'base64');
        const filename = `${String(i + 1).padStart(2, '0')}.webp`;
        await fs.writeFile(path.join(uploadDir, filename), buf);
        savedGallery.push(`/uploads/properties/${slug}/${filename}`);
      }
    }

    const coverImage = savedGallery[0] || body.thumbnailFallbackUrl || '';
    const finalGallery = savedGallery.length > 0 ? savedGallery : coverImage ? [coverImage] : [];

    const propJson = {
      slug,
      unitCode: body.unitCode.trim().slice(0, 40),
      internalRef: (body.internalRef ?? '').trim(),
      vftLicense: (body.vftLicense ?? '').trim(),
      isActive: true,
      featured: Boolean(body.featured),
      ownerrez: {
        propertyId: Number.isFinite(body.ownerrezId) ? Math.max(0, Math.trunc(body.ownerrezId)) : 0,
        propertyUuid: (body.propertyUuid ?? '').trim().replace(/-/g, ''),
        calendarWidgetIdEn: (body.calendarWidgetIdEn ?? '').trim(),
        calendarWidgetIdEs: (body.calendarWidgetIdEs ?? '').trim(),
        bookingWidgetIdEn: (body.bookingWidgetIdEn ?? '').trim(),
        bookingWidgetIdEs: (body.bookingWidgetIdEs ?? '').trim(),
        reviewWidgetId: (body.reviewWidgetId ?? '').trim(),
        publicUrl: (body.publicUrl ?? '').trim(),
      },
      category: body.category || 'apartment',
      building: (body.building || 'Edificio Skol').trim(),
      zone: (body.zone || 'Marbella Centre').trim(),
      bedrooms: Math.max(0, Math.min(10, Math.trunc(body.bedrooms ?? 1))),
      bathrooms: Math.max(1, Math.min(10, Number(body.bathrooms ?? 1))),
      maxGuests: Math.max(1, Math.min(16, Math.trunc(body.maxGuests ?? 2))),
      areaSqm: Math.max(0, Math.trunc(body.areaSqm ?? 0)),
      seaView: Boolean(body.seaView),
      beachfront: Boolean(body.beachfront),
      orientation: '',
      location: {
        address: (body.address || 'Avenida Arias Maldonado 16, Marbella').trim(),
        latitude: Number.isFinite(body.latitude) ? body.latitude : 36.5076,
        longitude: Number.isFinite(body.longitude) ? body.longitude : -4.8902,
      },
      contentEn: {
        title: body.titleEn.trim().slice(0, 140),
        summary: (body.summaryEn || body.descriptionEn || '').replace(/\s+/g, ' ').trim().slice(0, 255),
        description: (body.descriptionEn ?? '').trim(),
        amenities: Array.isArray(body.amenitiesEn) ? body.amenitiesEn.filter(Boolean) : [],
      },
      contentEs: {
        title: body.titleEs.trim().slice(0, 140),
        summary: (body.summaryEs || body.descriptionEs || '').replace(/\s+/g, ' ').trim().slice(0, 255),
        description: (body.descriptionEs ?? '').trim(),
        amenities: Array.isArray(body.amenitiesEs) ? body.amenitiesEs.filter(Boolean) : [],
      },
      coverImage,
      gallery: finalGallery,
      legacyWpUrlEn: '',
      legacyWpUrlEs: '',
    };

    const propsDir = path.join(rootDir, 'src', 'content', 'properties');
    await fs.mkdir(propsDir, { recursive: true });
    await fs.writeFile(
      path.join(propsDir, `${slug}.json`),
      `${JSON.stringify(propJson, null, 2)}\n`,
      'utf-8'
    );

    return new Response(
      JSON.stringify({
        ok: true,
        slug,
        photosSaved: savedGallery.length,
        urlEn: `/properties/${slug}`,
        urlEs: `/es/propiedades/${slug}`,
        keystaticUrl: `/keystatic/collection/properties/item/${slug}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo guardar la propiedad.';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
