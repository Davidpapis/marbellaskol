import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Users, BedDouble, Search, MapPin, Waves, RotateCcw, Sparkles } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import type { PropertyCardData } from '../../lib/properties';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  properties: PropertyCardData[];
}

interface SearchApiResponse {
  configured: boolean;
  availablePropertyIds: number[];
  source: 'ownerrez_live' | 'unconfigured';
  error?: string;
}

function addDaysIso(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

export default function PropertiesExplorer({ lang, properties }: Props) {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [guests, setGuests] = useState<number>(2);
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [category, setCategory] = useState<string>('all');
  const [building, setBuilding] = useState<string>('all');
  const [seaViewOnly, setSeaViewOnly] = useState<boolean>(false);

  const [availableIds, setAvailableIds] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [searchActive, setSearchActive] = useState<boolean>(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const markersLayerRef = useRef<import('leaflet').LayerGroup | null>(null);

  const t =
    lang === 'es'
      ? {
          checkIn: 'Entrada',
          checkOut: 'Salida',
          guests: 'Huéspedes',
          bedrooms: 'Dormitorios',
          any: 'Todos',
          search: 'Comprobar disponibilidad',
          searching: 'Buscando disponibilidad...',
          allTypes: 'Todos',
          studio: 'Estudios',
          apartment: 'Apartamentos',
          duplex: 'Dúplex',
          penthouse: 'Áticos',
          townhouse: 'Casas',
          allBuildings: 'Todos los edificios',
          seaView: 'Vistas al mar',
          reset: 'Restablecer filtros',
          liveBadge: 'Disponibilidad verificada en tiempo real',
          catalogBadge: 'Catálogo completo · Selecciona fechas para ver disponibilidad real',
          showing: 'apartamentos disponibles',
          showingCatalog: 'apartamentos en catálogo',
          emptyTitle: 'No hay apartamentos disponibles para esos criterios',
          emptyDesc: 'Prueba a modificar las fechas de entrada/salida, reducir los dormitorios o restablecer los filtros.',
          bed: 'dorm.',
          studioLabel: 'Estudio',
          bath: 'baño',
          baths: 'baños',
          guestsShort: 'huésp.',
          viewApt: 'Ver apartamento y reservar',
          mapNote: 'Mapa gratuito OpenStreetMap',
        }
      : {
          checkIn: 'Check-in',
          checkOut: 'Check-out',
          guests: 'Guests',
          bedrooms: 'Bedrooms',
          any: 'Any',
          search: 'Check Availability',
          searching: 'Checking live dates...',
          allTypes: 'All',
          studio: 'Studios',
          apartment: 'Apartments',
          duplex: 'Duplex',
          penthouse: 'Penthouses',
          townhouse: 'Townhouses',
          allBuildings: 'All buildings',
          seaView: 'Sea View',
          reset: 'Reset filters',
          liveBadge: 'Verified live availability',
          catalogBadge: 'Full catalogue · Choose dates for live availability',
          showing: 'available apartments',
          showingCatalog: 'apartments in catalogue',
          emptyTitle: 'No apartments match your dates or filters',
          emptyDesc: 'Try adjusting your check-in/check-out dates, guest count or resetting the filters.',
          bed: 'bed',
          studioLabel: 'Studio',
          bath: 'bath',
          baths: 'baths',
          guestsShort: 'guests',
          viewApt: 'View & Book Direct',
          mapNote: 'Free OpenStreetMap',
        };

  const buildings = useMemo(() => {
    const set = new Set(properties.map((p) => p.building).filter(Boolean));
    return Array.from(set).sort();
  }, [properties]);

  const runOwnerRezSearch = async (from: string, to: string, g: number, b: number) => {
    if (!from || !to || to <= from) return;
    setLoading(true);
    setSearchError('');
    setSearchActive(true);

    try {
      const qs = new URLSearchParams({
        availabilityFrom: from,
        availabilityTo: to,
        guests: String(g),
      });
      if (b > 0) qs.set('bedroomsFrom', String(b));

      const res = await fetch(`/api/ownerrez/search?${qs.toString()}`);
      const data = (await res.json()) as SearchApiResponse;

      if (!res.ok) {
        throw new Error(data.error || 'OwnerRez API error');
      }

      if (!data.configured) {
        setAvailableIds(null);
        setSearchActive(false);
        return;
      }

      setAvailableIds(new Set(data.availablePropertyIds));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to check live availability.');
      setAvailableIds(null);
    } finally {
      setLoading(false);
    }
  };

  // Leer parámetros iniciales de la URL (?from=&to=&guests=&bedrooms=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qFrom = params.get('from') || '';
    const qTo = params.get('to') || '';
    const qGuests = Number.parseInt(params.get('guests') || '2', 10);
    const qBeds = Number.parseInt(params.get('bedrooms') || '0', 10);

    if (qFrom && qTo && qTo > qFrom) {
      setDateFrom(qFrom);
      setDateTo(qTo);
      const validGuests = Number.isFinite(qGuests) && qGuests > 0 ? qGuests : 2;
      const validBeds = Number.isFinite(qBeds) && qBeds >= 0 ? qBeds : 0;
      setGuests(validGuests);
      setBedrooms(validBeds);
      void runOwnerRezSearch(qFrom, qTo, validGuests, validBeds);
    } else {
      setDateFrom(addDaysIso(1));
      setDateTo(addDaysIso(3));
    }
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (searchActive && availableIds !== null) {
        if (!p.ownerrezPropertyId || !availableIds.has(p.ownerrezPropertyId)) {
          return false;
        }
      }
      if (guests > 0 && p.maxGuests < guests) return false;
      if (bedrooms > 0 && p.bedrooms < bedrooms) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (building !== 'all' && p.building !== building) return false;
      if (seaViewOnly && !p.seaView) return false;
      return true;
    });
  }, [properties, searchActive, availableIds, guests, bedrooms, category, building, seaViewOnly]);

  // Inicializar mapa gratuito Leaflet + Carto Voyager
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = await import('leaflet');
      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [36.5076, -4.8902],
        zoom: 15,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersLayerRef.current = group;
    }

    void initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores del mapa al cambiar los resultados filtrados
  useEffect(() => {
    let cancelled = false;

    async function updateMarkers() {
      const map = mapInstanceRef.current;
      const group = markersLayerRef.current;
      if (!map || !group) return;

      const L = await import('leaflet');
      if (cancelled) return;

      group.clearLayers();
      const bounds: [number, number][] = [];

      // Agrupar ligeramente propiedades con coordenadas idénticas (mismo Edificio Skol)
      const coordCounter = new Map<string, number>();

      filteredProperties.forEach((prop) => {
        const key = `${prop.latitude.toFixed(4)},${prop.longitude.toFixed(4)}`;
        const count = coordCounter.get(key) ?? 0;
        coordCounter.set(key, count + 1);

        // Micro-espiral de pocos metros para distinguir apartamentos dentro del mismo edificio
        const angle = count * 0.9;
        const radius = count === 0 ? 0 : 0.00008 * Math.sqrt(count);
        const lat = prop.latitude + Math.cos(angle) * radius;
        const lng = prop.longitude + Math.sin(angle) * radius;
        bounds.push([lat, lng]);

        const isHovered = hoveredSlug === prop.slug;
        const marker = L.circleMarker([lat, lng], {
          radius: isHovered ? 10 : 7,
          fillColor: isHovered ? '#1589C9' : '#0B5D8E',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.94,
        });

        marker.bindPopup(
          `<div style="min-width:180px;font-family:Plus Jakarta Sans,sans-serif;">
            <strong style="color:#0A4D68;font-size:13px;">${prop.unitCode}</strong>
            <div style="font-size:12px;color:#525A63;margin:4px 0 8px;">${prop.building} · ${prop.maxGuests} ${t.guestsShort}</div>
            <a href="${prop.href}" style="display:inline-block;background:#0A4D68;color:#fff;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:600;text-decoration:none;">${t.viewApt}</a>
          </div>`
        );

        marker.addTo(group);
      });

      if (bounds.length > 0 && !hoveredSlug) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      }
    }

    void updateMarkers();

    return () => {
      cancelled = true;
    };
  }, [filteredProperties, hoveredSlug, t.guestsShort, t.viewApt]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (dateFrom) qs.set('from', dateFrom);
    if (dateTo) qs.set('to', dateTo);
    qs.set('guests', String(guests));
    if (bedrooms > 0) qs.set('bedrooms', String(bedrooms));
    window.history.replaceState(null, '', `${window.location.pathname}?${qs.toString()}`);
    void runOwnerRezSearch(dateFrom, dateTo, guests, bedrooms);
  };

  const resetAll = () => {
    setSearchActive(false);
    setAvailableIds(null);
    setSearchError('');
    setGuests(2);
    setBedrooms(0);
    setCategory('all');
    setBuilding('all');
    setSeaViewOnly(false);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const typeTabs = [
    { id: 'all', label: t.allTypes },
    { id: 'studio', label: t.studio },
    { id: 'apartment', label: t.apartment },
    { id: 'duplex', label: t.duplex },
    { id: 'penthouse', label: t.penthouse },
    { id: 'townhouse', label: t.townhouse },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda unificada con calendario de rango + luna */}
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-sand-200 bg-surface p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-[1.6fr_0.75fr_0.75fr_auto] lg:items-end"
      >
        <DateRangePicker
          lang={lang}
          dateFrom={dateFrom}
          dateTo={dateTo}
          bubble={false}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />

        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            <Users className="h-3.5 w-3.5 text-sea" aria-hidden="true" />
            {t.guests}
          </span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="h-10 rounded-lg border border-sand-200 bg-sand-50 px-3 text-sm font-medium text-ink tabular-nums focus:border-sea focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            <BedDouble className="h-3.5 w-3.5 text-sea" aria-hidden="true" />
            {t.bedrooms}
          </span>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(Number(e.target.value))}
            className="h-10 rounded-lg border border-sand-200 bg-sand-50 px-3 text-sm font-medium text-ink tabular-nums focus:border-sea focus:outline-none"
          >
            <option value={0}>{t.any}</option>
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-tactile flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-sea px-5 text-sm font-semibold text-white hover:bg-sea-dark disabled:opacity-60 sm:col-span-2 lg:col-span-1"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>{loading ? t.searching : t.search}</span>
        </button>
      </form>

      {/* Filtros secundarios */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`btn-tactile cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                category === tab.id
                  ? 'bg-sea text-white'
                  : 'border border-sand-200 bg-surface text-ink-muted hover:border-sea hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            aria-label={t.allBuildings}
            className="h-9 rounded-full border border-sand-200 bg-surface px-3.5 text-xs font-medium text-ink focus:border-sea focus:outline-none"
          >
            <option value="all">{t.allBuildings}</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSeaViewOnly((v) => !v)}
            className={`btn-tactile inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ${
              seaViewOnly
                ? 'bg-sea-tint text-sea border border-sea/30'
                : 'border border-sand-200 bg-surface text-ink-muted hover:text-ink'
            }`}
          >
            <Waves className="h-3.5 w-3.5" aria-hidden="true" />
            {t.seaView}
          </button>

          {(searchActive || category !== 'all' || building !== 'all' || seaViewOnly || bedrooms > 0) && (
            <button
              type="button"
              onClick={resetAll}
              className="btn-tactile inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-sand-300 bg-sand-100 px-3.5 text-xs font-semibold text-ink hover:bg-sand-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Estado de disponibilidad */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-sand-200 py-3 text-sm">
        <p className="font-medium text-ink tabular-nums">
          <span className="font-mono font-semibold text-sea">{filteredProperties.length}</span>{' '}
          {searchActive ? t.showing : t.showingCatalog}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            searchActive
              ? 'bg-saving-tint text-saving'
              : 'bg-sand-100 text-ink-muted'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {searchActive ? `${t.liveBadge} · ${dateFrom} → ${dateTo}` : t.catalogBadge}
        </span>
      </div>

      {searchError && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {searchError}
        </div>
      )}

      {/* Split View: Lista de tarjetas izquierda + Mapa Leaflet derecha */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-start">
        <div>
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-sand-200 bg-surface p-3"
                >
                  <div className="aspect-[16/10] animate-pulse rounded-xl bg-sand-200" />
                  <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-sand-200" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-sand-100" />
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-sand-200 bg-surface px-6 py-16 text-center">
              <p className="font-serif text-2xl font-semibold text-ink">{t.emptyTitle}</p>
              <p className="mt-2 max-w-md text-sm text-ink-muted">{t.emptyDesc}</p>
              <button
                type="button"
                onClick={resetAll}
                className="btn-tactile mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-sea px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-dark"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t.reset}
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {filteredProperties.map((prop) => (
                <article
                  key={prop.slug}
                  onMouseEnter={() => setHoveredSlug(prop.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-surface shadow-xs"
                >
                  <a href={prop.href} className="relative block aspect-[16/10] overflow-hidden bg-sand-100">
                    <img
                      src={prop.coverImage}
                      alt={prop.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      {prop.featured && (
                        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                          ★ {lang === 'es' ? 'Destacado' : 'Featured'}
                        </span>
                      )}
                      <span className="rounded-full bg-surface/92 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink backdrop-blur-xs">
                        {prop.unitCode}
                      </span>
                    </div>
                    {prop.seaView && (
                      <span className="absolute top-3 right-3 rounded-full bg-sea/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                        {t.seaView}
                      </span>
                    )}
                  </a>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="flex items-center gap-1 text-xs font-medium text-ink-muted">
                      <MapPin className="h-3.5 w-3.5 text-terracotta" aria-hidden="true" />
                      {prop.building} · {prop.zone}
                    </p>
                    <h2 className="mt-1.5 line-clamp-2 font-serif text-lg leading-snug font-semibold text-ink">
                      <a href={prop.href} className="hover:text-sea">
                        {prop.title}
                      </a>
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-muted tabular-nums">
                      <span>
                        {prop.bedrooms === 0 ? t.studioLabel : `${prop.bedrooms} ${t.bed}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {prop.bathrooms} {prop.bathrooms === 1 ? t.bath : t.baths}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {prop.maxGuests} {t.guestsShort}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-sand-100 pt-3.5 mt-4">
                      <span className="font-mono text-[11px] text-ink-muted">
                        {prop.vftLicense || prop.unitCode}
                      </span>
                      <a
                        href={prop.href}
                        className="text-xs font-semibold text-sea hover:text-sea-dark"
                      >
                        {t.viewApt} →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Mapa interactivo gratuito sticky en desktop */}
        <aside className="lg:sticky lg:top-22">
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-2.5 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Marbella · Edificio Skol</span>
              <span>{t.mapNote}</span>
            </div>
            <div ref={mapContainerRef} className="h-[420px] w-full lg:h-[640px]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
