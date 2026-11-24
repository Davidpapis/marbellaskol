import { useEffect, useRef } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  unitCode: string;
  address: string;
  building: string;
  latitude: number;
  longitude: number;
}

export default function PropertyMap({
  lang,
  unitCode,
  address,
  building,
  latitude,
  longitude,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      L.circleMarker([latitude, longitude], {
        radius: 11,
        fillColor: '#0B6FA4',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95,
      })
        .bindPopup(
          `<div style="font-family:Plus Jakarta Sans,sans-serif;">
            <strong style="color:#0B6FA4;font-size:13px;">${unitCode}</strong>
            <div style="font-size:12px;color:#4A6278;margin-top:2px;">${building}</div>
          </div>`
        )
        .addTo(map)
        .openPopup();

      mapRef.current = map;
    }

    void init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, unitCode, building]);

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const isEs = lang === 'es';

  return (
    <section className="overflow-hidden rounded-3xl border border-[#DCE8F2] bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EBF3FA] px-6 py-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#199bd1] uppercase">
            {isEs ? 'Ubicación Exacta' : 'Exact Location'}
          </p>
          <h2 className="mt-0.5 flex items-center gap-1.5 font-serif text-xl font-semibold text-[#0B2239]">
            <MapPin className="h-4 w-4 text-[#199bd1]" aria-hidden="true" />
            <span>{address}</span>
          </h2>
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-tactile inline-flex items-center gap-1.5 rounded-full border border-[#DCE8F2] bg-[#F8FBFD] px-4 py-2 text-xs font-bold text-[#0B6FA4] hover:border-[#199bd1] hover:bg-[#E7F4FC]"
        >
          <span>{isEs ? 'Abrir en Google Maps' : 'Open in Google Maps'}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div ref={containerRef} className="h-[340px] w-full" />
    </section>
  );
}
