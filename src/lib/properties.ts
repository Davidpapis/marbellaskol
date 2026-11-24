import type { CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type PropertyEntry = CollectionEntry<'properties'>;

export interface PropertyCardData {
  slug: string;
  unitCode: string;
  vftLicense: string;
  featured: boolean;
  ownerrezPropertyId: number;
  category: 'studio' | 'apartment' | 'duplex' | 'penthouse' | 'townhouse';
  building: string;
  zone: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  seaView: boolean;
  beachfront: boolean;
  latitude: number;
  longitude: number;
  title: string;
  summary: string;
  coverImage: string;
  href: string;
}

export function toPropertyCard(entry: PropertyEntry, lang: Lang): PropertyCardData {
  const d = entry.data;
  const localized = lang === 'es' ? d.contentEs : d.contentEn;
  const fallbackImg = '/images/hero-skol.jpg';
  return {
    slug: d.slug,
    unitCode: d.unitCode,
    vftLicense: d.vftLicense,
    featured: d.featured,
    ownerrezPropertyId: d.ownerrez.propertyId,
    category: d.category,
    building: d.building,
    zone: d.zone,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    maxGuests: d.maxGuests,
    seaView: d.seaView,
    beachfront: d.beachfront,
    latitude: d.location.latitude,
    longitude: d.location.longitude,
    title: localized.title,
    summary: localized.summary,
    coverImage: d.coverImage || d.gallery[0] || fallbackImg,
    href: lang === 'es' ? `/es/propiedades/${d.slug}` : `/properties/${d.slug}`,
  };
}

export function getCategoryLabel(
  category: PropertyCardData['category'],
  lang: Lang
): string {
  const map: Record<Lang, Record<PropertyCardData['category'], string>> = {
    en: {
      studio: 'Studio',
      apartment: 'Apartment',
      duplex: 'Duplex',
      penthouse: 'Penthouse',
      townhouse: 'Townhouse',
    },
    es: {
      studio: 'Estudio',
      apartment: 'Apartamento',
      duplex: 'Dúplex',
      penthouse: 'Ático',
      townhouse: 'Casa Adosada',
    },
  };
  return map[lang][category];
}
