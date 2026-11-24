import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Sparkles, Upload, Trash2, CheckCircle2, ArrowRight, ImageIcon } from 'lucide-react';

interface OptimizedPhoto {
  id: string;
  name: string;
  originalKb: number;
  webpKb: number;
  dataUrl: string;
}

/**
 * Si la empleada pega el bloque HTML completo de OwnerRez (<div class="ownerrez-widget" ...>),
 * extrae automáticamente `data-widgetid` (y opcionalmente `data-propertyid`).
 */
function extractWidgetId(input: string): { widgetId: string; propertyUuid?: string } {
  const trimmed = input.trim();
  const widMatch = trimmed.match(/data-widgetid=["']([^"']+)["']/i);
  const pidMatch = trimmed.match(/data-propertyid=["']([^"']+)["']/i);
  return {
    widgetId: widMatch?.[1]?.trim() || trimmed,
    propertyUuid: pidMatch?.[1]?.trim(),
  };
}

/**
 * Convierte cualquier foto (JPG/PNG/HEIC-compatible) a WebP ligero (máx 1400px, calidad 0.82)
 * directamente en el navegador antes de guardarla.
 */
async function convertToWebp(file: File): Promise<OptimizedPhoto> {
  const originalKb = Math.max(1, Math.round(file.size / 1024));
  const bitmapUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
      el.src = bitmapUrl;
    });

    const maxW = 1400;
    const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    const base64Len = dataUrl.split(',')[1]?.length ?? 0;
    const webpKb = Math.max(1, Math.round((base64Len * 3) / 4 / 1024));

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      originalKb,
      webpKb,
      dataUrl,
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export default function PropertyQuickCreate() {
  const [ownerrezId, setOwnerrezId] = useState('');
  const [fetchingOr, setFetchingOr] = useState(false);
  const [orMessage, setOrMessage] = useState('');
  const [orError, setOrError] = useState('');

  const [unitCode, setUnitCode] = useState('');
  const [slug, setSlug] = useState('');
  const [internalRef, setInternalRef] = useState('');
  const [vftLicense, setVftLicense] = useState('');
  const [propertyUuid, setPropertyUuid] = useState('');
  const [calendarWidgetIdEn, setCalendarWidgetIdEn] = useState('');
  const [calendarWidgetIdEs, setCalendarWidgetIdEs] = useState('');
  const [bookingWidgetIdEn, setBookingWidgetIdEn] = useState('');
  const [bookingWidgetIdEs, setBookingWidgetIdEs] = useState('');
  const [reviewWidgetId, setReviewWidgetId] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [thumbnailFallbackUrl, setThumbnailFallbackUrl] = useState('');

  const [category, setCategory] = useState<'studio' | 'apartment' | 'duplex' | 'penthouse' | 'townhouse'>('apartment');
  const [building, setBuilding] = useState('Edificio Skol');
  const [zone, setZone] = useState('Marbella Centre');
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxGuests, setMaxGuests] = useState(2);
  const [areaSqm, setAreaSqm] = useState(0);
  const [seaView, setSeaView] = useState(true);
  const [beachfront, setBeachfront] = useState(true);
  const [featured, setFeatured] = useState(false);

  const [address, setAddress] = useState('Avenida Arias Maldonado 16, Marbella');
  const [latitude, setLatitude] = useState(36.5076);
  const [longitude, setLongitude] = useState(-4.8902);

  const [titleEn, setTitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [descriptionEs, setDescriptionEs] = useState('');

  const [photos, setPhotos] = useState<OptimizedPhoto[]>([]);
  const [converting, setConverting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [createdResult, setCreatedResult] = useState<{
    slug: string;
    urlEn: string;
    urlEs: string;
    keystaticUrl: string;
    photosSaved: number;
  } | null>(null);

  const handleImportFromOwnerRez = async () => {
    setOrError('');
    setOrMessage('');
    const num = Number.parseInt(ownerrezId.trim(), 10);
    if (!Number.isFinite(num) || num <= 0) {
      setOrError('Escribe primero el ID numérico de OwnerRez (ej. 33837).');
      return;
    }

    setFetchingOr(true);
    try {
      const res = await fetch(`/api/ownerrez/property?id=${num}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        property?: {
          ownerrezId: number;
          propertyUuid: string;
          name: string;
          unitCode: string;
          bedrooms: number;
          bathrooms: number;
          maxGuests: number;
          areaSqm: number;
          category: 'studio' | 'apartment' | 'duplex' | 'penthouse' | 'townhouse';
          building: string;
          zone: string;
          address: string;
          latitude: number;
          longitude: number;
          publicUrl: string;
          thumbnailUrl: string;
        };
      };

      if (!res.ok || !data.ok || !data.property) {
        setOrError(data.error || 'No se pudo obtener la propiedad.');
        return;
      }

      const p = data.property;
      setUnitCode(p.unitCode);
      setSlug(
        `${p.unitCode}-${p.category}`
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
      setPropertyUuid(p.propertyUuid);
      setCategory(p.category);
      setBuilding(p.building);
      setZone(p.zone);
      setBedrooms(p.bedrooms);
      setBathrooms(p.bathrooms);
      setMaxGuests(p.maxGuests);
      setAreaSqm(p.areaSqm);
      setAddress(p.address);
      setLatitude(p.latitude);
      setLongitude(p.longitude);
      setPublicUrl(p.publicUrl);
      setThumbnailFallbackUrl(p.thumbnailUrl);

      if (!titleEn) setTitleEn(`${p.unitCode} — Holiday Apartment in ${p.zone}`);
      if (!titleEs) setTitleEs(`${p.unitCode} — Apartamento Vacacional en ${p.zone}`);

      setOrMessage(
        `¡Datos importados automáticamente! (${p.name} · ${p.bedrooms} dorm · ${p.bathrooms} baño(s) · máx. ${p.maxGuests} huésp. · mapa listo)`
      );
    } catch {
      setOrError('Error de conexión al consultar los datos.');
    } finally {
      setFetchingOr(false);
    }
  };

  const handleWidgetPaste = (raw: string, setter: (v: string) => void) => {
    const parsed = extractWidgetId(raw);
    setter(parsed.widgetId);
    if (parsed.propertyUuid && !propertyUuid) {
      setPropertyUuid(parsed.propertyUuid);
    }
  };

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setConverting(true);
    try {
      const converted: OptimizedPhoto[] = [];
      for (const f of Array.from(fileList)) {
        if (!f.type.startsWith('image/')) continue;
        converted.push(await convertToWebp(f));
      }
      setPhotos((prev) => [...prev, ...converted]);
    } finally {
      setConverting(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);

    try {
      const res = await fetch('/api/properties/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug || unitCode,
          unitCode,
          internalRef,
          vftLicense,
          featured,
          ownerrezId: Number.parseInt(ownerrezId || '0', 10) || 0,
          propertyUuid,
          calendarWidgetIdEn,
          calendarWidgetIdEs,
          bookingWidgetIdEn,
          bookingWidgetIdEs,
          reviewWidgetId,
          publicUrl,
          category,
          building,
          zone,
          bedrooms,
          bathrooms,
          maxGuests,
          areaSqm,
          seaView,
          beachfront,
          address,
          latitude,
          longitude,
          titleEn,
          descriptionEn,
          titleEs,
          descriptionEs,
          thumbnailFallbackUrl,
          webpImages: photos.map((p) => ({ name: p.name, dataUrl: p.dataUrl })),
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        slug?: string;
        urlEn?: string;
        urlEs?: string;
        keystaticUrl?: string;
        photosSaved?: number;
      };

      if (!res.ok || !data.ok || !data.slug) {
        setSaveError(data.error || 'No se pudo guardar la propiedad.');
        return;
      }

      setCreatedResult({
        slug: data.slug,
        urlEn: data.urlEn || `/properties/${data.slug}`,
        urlEs: data.urlEs || `/es/propiedades/${data.slug}`,
        keystaticUrl: data.keystaticUrl || '/keystatic',
        photosSaved: data.photosSaved ?? 0,
      });
    } catch {
      setSaveError('Error al guardar la propiedad.');
    } finally {
      setSaving(false);
    }
  };

  if (createdResult) {
    return (
      <div className="rounded-3xl border border-[#BFE6DA] bg-[#EDF9F5] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#0D7A67]" />
        <h2 className="mt-4 font-serif text-3xl font-semibold text-[#0B2239]">
          ¡Propiedad creada y optimizada!
        </h2>
        <p className="mt-2 text-sm text-[#334E68]">
          Se ha guardado la ficha completa y {createdResult.photosSaved} foto(s) convertidas automáticamente a WebP ligero.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={createdResult.urlEn}
            className="btn-tactile rounded-full bg-[#199bd1] px-6 py-3 text-sm font-bold text-white hover:bg-[#0B6FA4]"
          >
            Ver ficha en Inglés →
          </a>
          <a
            href={createdResult.urlEs}
            className="btn-tactile rounded-full border border-[#199bd1] bg-white px-6 py-3 text-sm font-bold text-[#0B6FA4] hover:bg-[#E7F4FC]"
          >
            Ver ficha en Español →
          </a>
          <a
            href={createdResult.keystaticUrl}
            className="btn-tactile rounded-full border border-[#DCE8F2] bg-white px-6 py-3 text-sm font-semibold text-[#0B2239] hover:border-[#0B6FA4]"
          >
            Abrir en Keystatic
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreatedResult(null);
            setOwnerrezId('');
            setUnitCode('');
            setSlug('');
            setPhotos([]);
            setTitleEn('');
            setTitleEs('');
            setDescriptionEn('');
            setDescriptionEs('');
          }}
          className="mt-6 cursor-pointer text-xs font-semibold text-[#0B6FA4] underline"
        >
          Dar de alta otra propiedad
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* PASO 1: AUTOCOMPLETADO INSTANTÁNEO DESDE OWNERREZ */}
      <section className="rounded-3xl border-2 border-[#199bd1]/35 bg-gradient-to-br from-[#F2F9FD] to-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#199bd1] uppercase">
          <Sparkles className="h-4 w-4" />
          Paso 1 · Autocompletar automáticamente
        </div>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-[#0B2239]">
          Introduce el ID numérico de OwnerRez
        </h2>
        <p className="mt-1 text-sm text-[#4A6278]">
          Al pulsar el botón, rellenamos solos el nombre, UUID, dormitorios, baños, huéspedes, m², dirección, coordenadas del mapa y foto de portada.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min={1}
            placeholder="Ej. 33837 o 461450"
            value={ownerrezId}
            onChange={(e) => setOwnerrezId(e.target.value)}
            className="h-12 flex-1 rounded-xl border border-[#DCE8F2] bg-white px-4 font-mono text-base font-semibold text-[#0B2239] focus:border-[#199bd1] focus:outline-none"
          />
          <button
            type="button"
            disabled={fetchingOr}
            onClick={handleImportFromOwnerRez}
            className="btn-tactile inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0B6FA4] px-6 text-sm font-bold text-white hover:bg-[#064273] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            <span>{fetchingOr ? 'Importando...' : 'Traer datos automáticamente'}</span>
          </button>
        </div>

        {orMessage && (
          <p className="mt-3 rounded-xl bg-[#EDF9F5] px-4 py-2.5 text-xs font-semibold text-[#0D7A67]">
            ✓ {orMessage}
          </p>
        )}
        {orError && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
            {orError}
          </p>
        )}
      </section>

      {/* PASO 2: DATOS PRINCIPALES Y CÓDIGOS DE WIDGETS */}
      <section className="rounded-3xl border border-[#DCE8F2] bg-white p-6 shadow-xs sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#199bd1] uppercase">
          Paso 2 · Datos y códigos de reserva
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-[#0B2239]">
          Ficha técnica y widgets (puedes pegar el HTML entero y lo limpiamos solos)
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Código apartamento *</span>
            <input
              required
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              placeholder="Ej. Skol 925A"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 text-sm font-semibold text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Licencia Turística (VFT/VUT)</span>
            <input
              value={vftLicense}
              onChange={(e) => setVftLicense(e.target.value)}
              placeholder="Ej. VUT/MA/98086"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-sm text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Referencia interna</span>
            <input
              value={internalRef}
              onChange={(e) => setInternalRef(e.target.value)}
              placeholder="Ej. SK-00925-A"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-sm text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Tipología</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 text-sm font-semibold text-[#0B2239]"
            >
              <option value="studio">Estudio</option>
              <option value="apartment">Apartamento</option>
              <option value="duplex">Dúplex</option>
              <option value="penthouse">Ático</option>
              <option value="townhouse">Casa Adosada</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Edificio / Complejo</span>
            <input
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 text-sm text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Dormitorios (0 = Estudio)</span>
            <input
              type="number"
              min={0}
              max={10}
              value={bedrooms}
              onChange={(e) => setBedrooms(Number(e.target.value))}
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-sm text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Baños</span>
            <input
              type="number"
              min={1}
              max={10}
              step="0.5"
              value={bathrooms}
              onChange={(e) => setBathrooms(Number(e.target.value))}
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-sm text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Máx. huéspedes</span>
            <input
              type="number"
              min={1}
              max={16}
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-sm text-[#0B2239]"
            />
          </label>
        </div>

        {/* Códigos de widgets (acepta pegar el snippet entero HTML o solo el ID) */}
        <div className="mt-6 grid gap-4 border-t border-[#EBF3FA] pt-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Widget Calendario EN (pega el código o ID)</span>
            <input
              value={calendarWidgetIdEn}
              onChange={(e) => handleWidgetPaste(e.target.value, setCalendarWidgetIdEn)}
              placeholder="Pega el <div ...> de OwnerRez o el data-widgetid"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-xs text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Widget Reserva / Pago EN (pega el código o ID)</span>
            <input
              value={bookingWidgetIdEn}
              onChange={(e) => handleWidgetPaste(e.target.value, setBookingWidgetIdEn)}
              placeholder="Pega el <div ...> Book/Inquire o el data-widgetid"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-xs text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Widget Calendario ES (opcional)</span>
            <input
              value={calendarWidgetIdEs}
              onChange={(e) => handleWidgetPaste(e.target.value, setCalendarWidgetIdEs)}
              placeholder="Si se deja vacío usa el de Inglés"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-xs text-[#0B2239]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#4A6278]">Widget Opiniones / Reviews (opcional)</span>
            <input
              value={reviewWidgetId}
              onChange={(e) => handleWidgetPaste(e.target.value, setReviewWidgetId)}
              placeholder="Pega el <div ...> de Reviews o el data-widgetid"
              className="mt-1 h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3 font-mono text-xs text-[#0B2239]"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-[#0B2239]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={seaView} onChange={(e) => setSeaView(e.target.checked)} />
            Vistas al mar
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={beachfront} onChange={(e) => setBeachfront(e.target.checked)} />
            Primera línea de playa
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Destacar en portada
          </label>
        </div>
      </section>

      {/* PASO 3: FOTOS CON CONVERSIÓN AUTOMÁTICA A WEBP ULTRA LIGERO */}
      <section className="rounded-3xl border border-[#DCE8F2] bg-white p-6 shadow-xs sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#0D7A67] uppercase">
          Paso 3 · Optimización automática WebP
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-[#0B2239]">
          Sube las fotografías (se convierten solas a WebP ligero)
        </h2>
        <p className="mt-1 text-sm text-[#4A6278]">
          Selecciona todas las fotos JPG o PNG desde tu ordenador. Las reducimos automáticamente a máx. 1400px en formato <strong>.webp</strong> (~80 KB por foto con máxima nitidez). La primera foto será la portada.
        </p>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#199bd1]/50 bg-[#F5FAFE] px-6 py-10 text-center transition-colors hover:border-[#0B6FA4] hover:bg-[#EBF5FC]">
          <Upload className="h-8 w-8 text-[#199bd1]" />
          <span className="mt-2 text-sm font-bold text-[#0B2239]">
            {converting ? 'Convirtiendo fotos a WebP...' : 'Pulsa aquí o arrastra las fotos de la propiedad'}
          </span>
          <span className="mt-1 text-xs text-[#4A6278]">JPG, PNG o WebP · Varias fotos a la vez</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>

        {photos.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-[#DCE8F2] bg-[#F8FBFD]"
              >
                <img src={photo.dataUrl} alt={photo.name} className="aspect-[16/10] w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-[#0B6FA4] px-2 py-0.5 text-[10px] font-bold text-white">
                    Portada
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                  aria-label="Eliminar foto"
                  className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-red-600/90 text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px] text-[#4A6278]">
                  <span className="line-through">{photo.originalKb} KB</span>
                  <span className="font-bold text-[#0D7A67]">{photo.webpKb} KB WebP</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && thumbnailFallbackUrl && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] p-3 text-xs text-[#4A6278]">
            <ImageIcon className="h-4 w-4 text-[#199bd1]" />
            <span>Portada automática detectada de OwnerRez lista como respaldo si aún no subes galería.</span>
          </div>
        )}
      </section>

      {/* PASO 4: TEXTOS BILINGÜES (INGLÉS + ESPAÑOL) */}
      <section className="rounded-3xl border border-[#DCE8F2] bg-white p-6 shadow-xs sm:p-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#199bd1] uppercase">
          Paso 4 · Textos en Inglés y Español
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold text-[#0B2239]">English (Principal)</h3>
            <input
              required
              minLength={5}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Title in English (e.g. Skol 925A — Sea View Duplex)"
              className="h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3.5 text-sm font-semibold text-[#0B2239]"
            />
            <textarea
              rows={5}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Full description in English..."
              className="w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] p-3.5 text-sm text-[#0B2239]"
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold text-[#0B2239]">Español</h3>
            <input
              required
              minLength={5}
              value={titleEs}
              onChange={(e) => setTitleEs(e.target.value)}
              placeholder="Título en Español (ej. Skol 925A — Dúplex Vistas al Mar)"
              className="h-11 w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] px-3.5 text-sm font-semibold text-[#0B2239]"
            />
            <textarea
              rows={5}
              value={descriptionEs}
              onChange={(e) => setDescriptionEs(e.target.value)}
              placeholder="Descripción completa en Español..."
              className="w-full rounded-xl border border-[#DCE8F2] bg-[#F8FBFD] p-3.5 text-sm text-[#0B2239]"
            />
          </div>
        </div>
      </section>

      {saveError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <a href="/keystatic" className="text-sm font-semibold text-[#4A6278] hover:text-[#0B6FA4]">
          ← Ir al panel completo Keystatic
        </a>
        <button
          type="submit"
          disabled={saving || converting}
          className="btn-tactile inline-flex h-13 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#199bd1] to-[#0B6FA4] px-8 text-sm font-bold text-white shadow-lg hover:from-[#0B6FA4] hover:to-[#064273] disabled:opacity-60"
        >
          <span>{saving ? 'Guardando propiedad...' : 'Guardar y Publicar Propiedad'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
