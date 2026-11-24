/**
 * Cliente backend seguro para la API de OwnerRez.
 * IMPORTANTE: Este módulo SOLO debe importarse desde endpoints/páginas del servidor.
 * Nunca expone OWNERREZ_API_USER ni OWNERREZ_API_TOKEN al navegador.
 */

const DEFAULT_BASE_URL = 'https://secure.ownerreservations.com/api/';

export interface OwnerRezSearchParams {
  availabilityFrom: string; // YYYY-MM-DD
  availabilityTo: string;   // YYYY-MM-DD
  bedroomsFrom?: number;
  guests?: number;
}

export interface OwnerRezRuleViolation {
  Code?: string;
  Message?: string;
}

export interface OwnerRezSearchItem {
  Id: number;
  Name?: string;
  PublicUrl?: string;
  MaxGuests?: number;
  Bedrooms?: number;
  Bathrooms?: number;
  RuleViolations?: OwnerRezRuleViolation[] | null;
}

export interface OwnerRezSearchResult {
  configured: boolean;
  availablePropertyIds: number[];
  items: OwnerRezSearchItem[];
  source: 'ownerrez_live' | 'unconfigured';
  error?: string;
}

export interface OwnerRezQuoteParams {
  propertyId: number;
  arrival: string;   // YYYY-MM-DD
  departure: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
}

function getServerEnv(key: string): string {
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const fromProcess = typeof process !== 'undefined' ? process.env[key] : undefined;
  return (fromImportMeta || fromProcess || '').trim();
}

export function isOwnerRezConfigured(): boolean {
  const user = getServerEnv('OWNERREZ_API_USER');
  const token = getServerEnv('OWNERREZ_API_TOKEN');
  return Boolean(user && token && !token.includes('xxxxxxxx'));
}

function getBaseUrl(): string {
  const raw = getServerEnv('OWNERREZ_API_BASE_URL') || DEFAULT_BASE_URL;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function buildAuthHeader(): string {
  const user = getServerEnv('OWNERREZ_API_USER');
  const token = getServerEnv('OWNERREZ_API_TOKEN');
  if (!user || !token) {
    throw new Error('OwnerRez API credentials (OWNERREZ_API_USER / OWNERREZ_API_TOKEN) are missing.');
  }
  const encoded = Buffer.from(`${user}:${token}`, 'utf-8').toString('base64');
  return `Basic ${encoded}`;
}

async function ownerRezFetch<T>(endpoint: string, searchParams?: URLSearchParams): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(cleanEndpoint, baseUrl);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  // Solo HTTP Basic Auth estándar (sin cabeceras obsoletas X-OwnerRez-App / X-OwnerRez-User)
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: buildAuthHeader(),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const bodyPreview = await response.text().catch(() => '');
    throw new Error(`OwnerRez API error ${response.status}: ${bodyPreview.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

/**
 * Busca propiedades disponibles en tiempo real en OwnerRez.
 * Aplica obligatoriamente `evaluateAvailabilityRules=true` y descarta
 * cualquier propiedad con violaciones en `RuleViolations`.
 */
export async function searchAvailableProperties(
  params: OwnerRezSearchParams
): Promise<OwnerRezSearchResult> {
  if (!isOwnerRezConfigured()) {
    return {
      configured: false,
      availablePropertyIds: [],
      items: [],
      source: 'unconfigured',
    };
  }

  const query = new URLSearchParams();
  query.set('availabilityFrom', params.availabilityFrom);
  query.set('availabilityTo', params.availabilityTo);
  query.set('evaluateAvailabilityRules', 'true');

  if (typeof params.bedroomsFrom === 'number' && params.bedroomsFrom > 0) {
    query.set('bedroomsFrom', String(params.bedroomsFrom));
  }
  if (typeof params.guests === 'number' && params.guests > 0) {
    query.set('guests', String(params.guests));
  }

  const raw = await ownerRezFetch<OwnerRezSearchItem[] | { items?: OwnerRezSearchItem[] }>(
    'properties/search',
    query
  );

  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];

  // Filtrado estricto: ID válido y cero violaciones de reglas (estancia mínima, días de cambio, bloqueos)
  const validItems = list.filter((item) => {
    const hasValidId = typeof item?.Id === 'number' && Number.isFinite(item.Id) && item.Id > 0;
    const noRuleViolations = !item.RuleViolations || item.RuleViolations.length === 0;
    const meetsGuests =
      !params.guests ||
      typeof item.MaxGuests !== 'number' ||
      item.MaxGuests >= params.guests;
    return hasValidId && noRuleViolations && meetsGuests;
  });

  return {
    configured: true,
    availablePropertyIds: validItems.map((item) => item.Id),
    items: validItems,
    source: 'ownerrez_live',
  };
}

/**
 * Catálogo ligero de propiedades en OwnerRez (útil para sincronización).
 */
export async function lookupProperties(): Promise<OwnerRezSearchItem[]> {
  if (!isOwnerRezConfigured()) return [];
  const raw = await ownerRezFetch<OwnerRezSearchItem[] | { items?: OwnerRezSearchItem[] }>(
    'properties/lookup'
  );
  return Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
}

/**
 * Detalle completo de una propiedad en OwnerRez.
 */
export async function getPropertyDetail(propertyId: number): Promise<Record<string, unknown> | null> {
  if (!isOwnerRezConfigured()) return null;
  return ownerRezFetch<Record<string, unknown>>(`properties/${propertyId}`);
}

/**
 * Cotización en vivo desde OwnerRez (`GET quotes`).
 */
export async function getPropertyQuote(params: OwnerRezQuoteParams): Promise<Record<string, unknown> | null> {
  if (!isOwnerRezConfigured()) return null;

  const query = new URLSearchParams();
  query.set('propertyId', String(params.propertyId));
  query.set('arrival', params.arrival);
  query.set('departure', params.departure);
  if (params.adults) query.set('adults', String(params.adults));
  if (params.children) query.set('children', String(params.children));

  return ownerRezFetch<Record<string, unknown>>('quotes', query);
}
