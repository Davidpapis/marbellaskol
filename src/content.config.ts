import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const properties = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/properties' }),
  schema: z.object({
    slug: z.string().min(2),
    unitCode: z.string().min(2).max(40),
    internalRef: z.string().optional().default(''),
    vftLicense: z.string().optional().default(''),
    isActive: z.boolean().default(true),
    featured: z.boolean().default(false),
    ownerrez: z.object({
      propertyId: z.number().int().min(0),
      propertyUuid: z.string().optional().default(''),
      calendarWidgetIdEn: z.string().optional().default(''),
      calendarWidgetIdEs: z.string().optional().default(''),
      bookingWidgetIdEn: z.string().optional().default(''),
      bookingWidgetIdEs: z.string().optional().default(''),
      reviewWidgetId: z.string().optional().default(''),
      publicUrl: z.string().optional().default(''),
    }),
    category: z.enum(['studio', 'apartment', 'duplex', 'penthouse', 'townhouse']).default('apartment'),
    building: z.string().default('Edificio Skol'),
    zone: z.string().default('Marbella Centre'),
    bedrooms: z.number().int().min(0).max(10).default(1),
    bathrooms: z.number().min(1).max(10).default(1),
    maxGuests: z.number().int().min(1).max(16).default(2),
    areaSqm: z.number().int().min(0).optional().default(0),
    seaView: z.boolean().default(true),
    beachfront: z.boolean().default(true),
    orientation: z.string().optional().default(''),
    location: z.object({
      address: z.string().default('Avenida Arias Maldonado 16, Marbella'),
      latitude: z.number().default(36.5076),
      longitude: z.number().default(-4.8902),
    }),
    contentEn: z.object({
      title: z.string().min(5).max(140),
      summary: z.string().max(260).optional().default(''),
      description: z.string().optional().default(''),
      amenities: z.array(z.string()).default([]),
    }),
    contentEs: z.object({
      title: z.string().min(5).max(140),
      summary: z.string().max(260).optional().default(''),
      description: z.string().optional().default(''),
      amenities: z.array(z.string()).default([]),
    }),
    coverImage: z.string().optional().default(''),
    gallery: z.array(z.string()).default([]),
    legacyWpUrlEn: z.string().optional().default(''),
    legacyWpUrlEs: z.string().optional().default(''),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faqs' }),
  schema: z.object({
    slug: z.string().min(2),
    order: z.number().int().default(10),
    questionEn: z.string().min(5).max(180),
    answerEn: z.string().min(20).max(900),
    questionEs: z.string().min(5).max(180),
    answerEs: z.string().min(20).max(900),
  }),
});

export const collections = {
  properties,
  faqs,
};
