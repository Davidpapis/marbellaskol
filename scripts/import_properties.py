#!/usr/bin/env python3
"""
Importador masivo de propiedades desde www.marbellaskol.com (WordPress WPResidence)
hacia src/content/properties/*.json (esquema Keystatic + Zod de MarbellaSkol).

Empareja automáticamente las versiones EN y ES mediante el `ownerrez.propertyId`
numérico (con respaldo por referencia interna / VFT / código de unidad) y genera
redirecciones 301 en vercel.json para preservar el SEO de WordPress.
"""

from __future__ import annotations

import concurrent.futures
import html as html_lib
import json
import os
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PROPS_DIR = ROOT / "src" / "content" / "properties"
VERCEL_JSON = ROOT / "vercel.json"
SITEMAP_URL = "https://www.marbellaskol.com/estate_property-sitemap.xml"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MarbellaSkolMigrator/1.0"}


def fetch_text(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def clean_html_text(raw: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_lib.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text[:80] or "apartment-marbella"


def extract_unit_code(title: str, internal_ref: str) -> str:
    # Intenta detectar "Skol 130", "Skol 408A", "Palm Beach 2F", "Cibeles 904", "Mediterráneo 6.9", "Casa Gina", etc.
    patterns = [
        r"\b(Skol\s+\d+\s*[A-Za-z]?)\b",
        r"\b(Palm\s+Beach\s+\d+[A-Za-z]?)\b",
        r"\b(Cibeles\s+\d+[A-Za-z]?)\b",
        r"\b(Mediterr[aá]neo\s+[\d\.\-]+[A-Za-z]?)\b",
        r"\b(Casa\s+Gina)\b",
        r"\b(PM\s*1\s*[- ]?\s*7A)\b",
        r"\b(Mar\s+Azul)\b",
    ]
    for pat in patterns:
        m = re.search(pat, title, re.I)
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    if internal_ref:
        return internal_ref[:40]
    words = [w for w in re.split(r"[\s\-–—\.]+", title) if w]
    return " ".join(words[:3])[:40] or "Marbella Unit"


def detect_building_and_zone(title: str, address: str, area: str) -> tuple[str, str]:
    blob = f"{title} {address} {area}".lower()
    if "skol" in blob or "arias maldonado" in blob:
        return "Edificio Skol", "Marbella Centre"
    if "mediterr" in blob:
        return "Edificio Mediterráneo", "Marbella Centre"
    if "palm beach" in blob:
        return "Palm Beach", "Marbella Centre"
    if "cibeles" in blob:
        return "Edificio Cibeles", "Marbella Centre"
    if "casa gina" in blob or "old town" in blob or "casco antiguo" in blob:
        return "Casa Gina", "Marbella Old Town"
    if "mar azul" in blob or "estepona" in blob:
        return "Mar Azul", "Estepona"
    return "Marbella Centre", area.strip() or "Marbella Centre"


def detect_category(cats: list[str], title: str, bedrooms: int) -> str:
    blob = " ".join(cats).lower() + " " + title.lower()
    if "duplex" in blob or "dúplex" in blob:
        return "duplex"
    if "penthouse" in blob or "atico" in blob or "ático" in blob:
        return "penthouse"
    if "townhouse" in blob or "adosad" in blob or "casa gina" in blob:
        return "townhouse"
    if "studio" in blob or "estudio" in blob or bedrooms == 0:
        return "studio"
    return "apartment"


def parse_property_page(url: str, lang: str) -> dict[str, Any] | None:
    try:
        html = fetch_text(url)
    except Exception as exc:
        print(f"  [WARN] Error fetching {url}: {exc}", file=sys.stderr)
        return None

    h1_m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S | re.I)
    title = clean_html_text(h1_m.group(1)) if h1_m else ""
    if not title:
        return None

    # Extraer bloques listing_detail
    details_raw = re.findall(r'<div class="listing_detail[^>]*>(.*?)</div>', html, re.S | re.I)
    fields_map: dict[str, str] = {}
    for d in details_raw:
        m = re.search(r"<strong>([^<]+):?\s*</strong>\s*(.*)", d, re.S | re.I)
        if m:
            k = clean_html_text(m.group(1)).rstrip(":").strip().lower()
            v = clean_html_text(m.group(2)).strip()
            fields_map[k] = v

    def get_int(keys: list[str], default: int) -> int:
        for k in keys:
            for fk, fv in fields_map.items():
                if k in fk:
                    num = re.search(r"\d+", fv)
                    if num:
                        return int(num.group(0))
        return default

    def get_float(keys: list[str], default: float) -> float:
        for k in keys:
            for fk, fv in fields_map.items():
                if k in fk:
                    num = re.search(r"\d+(?:[.,]\d+)?", fv)
                    if num:
                        return float(num.group(0).replace(",", "."))
        return default

    def get_str(keys: list[str], default: str = "") -> str:
        for k in keys:
            for fk, fv in fields_map.items():
                if fk == k or k in fk:
                    if fv:
                        return fv
        return default

    ownerrez_id = get_int(["owner rez id", "ownerrez"], 0)
    bedrooms = get_int(["bedrooms", "dormitorios", "habitaciones"], 1)
    bathrooms = max(1.0, get_float(["bathrooms", "baños", "banos"], 1.0))
    max_guests = max(1, get_int(["maximum", "huéspedes", "huespedes", "guests", "personas"], 2))
    vft = get_str(["vft", "vut"], "")
    # Property ID de oficina (SK-00130-C) vs Property Id numérico interno de WP
    internal_ref = ""
    for d in details_raw:
        m = re.search(r"<strong>Property ID:</strong>\s*([^<]+)", d, re.I)
        if m:
            val = clean_html_text(m.group(1))
            if not val.isdigit():
                internal_ref = val
                break

    address = get_str(["address", "dirección", "direccion"], "Avenida Arias Maldonado 16, Marbella")
    area = get_str(["area", "zona"], "Marbella Centre")

    # Coordenadas
    lat_m = re.search(r'data-cur_lat="([^"]+)"', html)
    lng_m = re.search(r'data-cur_long="([^"]+)"', html)
    try:
        lat = float(lat_m.group(1)) if lat_m and lat_m.group(1) else 36.5076
        lng = float(lng_m.group(1)) if lng_m and lng_m.group(1) else -4.8902
    except ValueError:
        lat, lng = 36.5076, -4.8902

    # Widgets OwnerRez
    property_uuid = ""
    cal_widget = ""
    book_widget = ""
    for wtag in re.findall(r'<div class="ownerrez-widget"[^>]*>', html, re.I):
        pu = re.search(r'data-propertyid="([^"]+)"', wtag, re.I)
        wt = re.search(r'data-widget-type="([^"]+)"', wtag, re.I)
        wi = re.search(r'data-widgetid="([^"]+)"', wtag, re.I)
        if pu and not property_uuid:
            property_uuid = pu.group(1).strip()
        if wi:
            wid = wi.group(1).strip()
            wtype = (wt.group(1) if wt else "").lower()
            if "calendar" in wtype or "calendario" in wtype:
                cal_widget = wid
            elif "book" in wtype or "inquire" in wtype or "reserv" in wtype:
                book_widget = wid
            elif not cal_widget:
                cal_widget = wid
            elif not book_widget:
                book_widget = wid

    # Descripción
    desc_m = re.search(r'id="wpestate_property_description_section"[^>]*>(.*?)</div>\s*</div>', html, re.S | re.I)
    if not desc_m:
        desc_m = re.search(r'class="wpestate_property_description[^"]*"[^>]*>(.*?)</div>', html, re.S | re.I)
    description = clean_html_text(desc_m.group(1)) if desc_m else ""
    # Limpiar cabecera "Description" / "Descripción" al inicio
    description = re.sub(r"^(Description|Descripción)\s*", "", description, flags=re.I).strip()
    summary = re.sub(r"\s+", " ", description)[:240].strip()

    # Amenities
    amenities_raw = re.findall(r'<i class="fas fa-check checkon"></i>\s*([^<]+)', html, re.I)
    amenities = list(dict.fromkeys(clean_html_text(a) for a in amenities_raw if clean_html_text(a)))

    # Galería de imágenes (preferir resolución 1110x623 o full, deduplicando por nombre base)
    gal_matches = re.findall(
        r'class="prettygalery"[^>]*href="([^"]+)"|class="lightbox_trigger"[^>]*src="([^"]+)"|background-image:\s*url\(([^)]+)\)',
        html,
        re.I,
    )
    by_base: dict[str, tuple[int, str]] = {}
    for g in gal_matches:
        u = next((x for x in g if x), "").strip("'\" ")
        if not u or "wp-content/uploads" not in u:
            continue
        if any(skip in u.lower() for skip in ("logo", "favicon", "avatar", "grupo.jpg")):
            continue
        # Score por resolución
        dim_m = re.search(r"-(\d+)x(\d+)\.(jpg|jpeg|png|webp)$", u, re.I)
        if dim_m:
            w = int(dim_m.group(1))
            base_key = re.sub(r"-\d+x\d+(?=\.[a-z]+$)", "", u, flags=re.I)
            score = w
        else:
            base_key = u
            score = 9999
        prev = by_base.get(base_key)
        if not prev or score > prev[0]:
            by_base[base_key] = (score, u)

    gallery = [u for _, u in by_base.values()][:16]

    # Categorías
    cats = list(dict.fromkeys(re.findall(r"/listings/([^/\"']+)/", html, re.I)))

    # URL relativa legacy
    legacy_path = re.sub(r"^https?://[^/]+", "", url)

    return {
        "lang": lang,
        "url": url,
        "legacyPath": legacy_path,
        "title": title[:140],
        "summary": summary,
        "description": description,
        "amenities": amenities,
        "ownerrezId": ownerrez_id,
        "propertyUuid": property_uuid,
        "calWidget": cal_widget,
        "bookWidget": book_widget,
        "internalRef": internal_ref,
        "vft": vft,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "maxGuests": max_guests,
        "address": address,
        "area": area,
        "lat": lat,
        "lng": lng,
        "gallery": gallery,
        "cats": cats,
    }


def main() -> None:
    print("1. Descargando sitemap de propiedades de marbellaskol.com...")
    xml = fetch_text(SITEMAP_URL)
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)

    en_urls = [u for u in locs if "/properties/" in u and "/es/properties/" not in u and not u.endswith("/properties/")]
    es_urls = [u for u in locs if "/es/properties/" in u and not u.endswith("/es/properties/")]
    print(f"   Encontradas {len(en_urls)} URLs EN y {len(es_urls)} URLs ES.")

    tasks: list[tuple[str, str]] = [(u, "en") for u in en_urls] + [(u, "es") for u in es_urls]
    parsed_en: list[dict[str, Any]] = []
    parsed_es: list[dict[str, Any]] = []

    print("2. Extrayendo fichas de propiedades en paralelo (10 hilos)...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(parse_property_page, u, lg): (u, lg) for u, lg in tasks}
        done = 0
        for fut in concurrent.futures.as_completed(futs):
            done += 1
            res = fut.result()
            if res:
                if res["lang"] == "en":
                    parsed_en.append(res)
                else:
                    parsed_es.append(res)
            if done % 30 == 0 or done == len(tasks):
                print(f"   Procesadas {done}/{len(tasks)} páginas...")

    print(f"   Extraídas con éxito: {len(parsed_en)} EN, {len(parsed_es)} ES.")

    # Emparejar EN y ES por ownerrezId -> internalRef -> vft -> unitCode
    def match_key(item: dict[str, Any]) -> str:
        if item["ownerrezId"] > 0:
            return f"or:{item['ownerrezId']}"
        if item["internalRef"]:
            return f"ref:{item['internalRef'].upper()}"
        if item["vft"]:
            return f"vft:{item['vft'].upper()}"
        return f"unit:{slugify(extract_unit_code(item['title'], ''))}"

    merged: dict[str, dict[str, Any]] = {}
    for en_item in parsed_en:
        k = match_key(en_item)
        merged[k] = {"en": en_item, "es": None}

    for es_item in parsed_es:
        k = match_key(es_item)
        if k in merged and merged[k]["es"] is None:
            merged[k]["es"] = es_item
        else:
            # Buscar por coincidencia secundaria si el key primario no cuadró
            matched = False
            for existing in merged.values():
                if existing["es"] is not None:
                    continue
                en = existing["en"]
                if en and (
                    (es_item["ownerrezId"] > 0 and en["ownerrezId"] == es_item["ownerrezId"])
                    or (es_item["vft"] and en["vft"] and es_item["vft"].upper() == en["vft"].upper())
                    or (es_item["internalRef"] and en["internalRef"] and es_item["internalRef"].upper() == en["internalRef"].upper())
                ):
                    existing["es"] = es_item
                    matched = True
                    break
            if not matched:
                merged[f"esonly:{k}:{len(merged)}"] = {"en": None, "es": es_item}

    # Limpiar carpeta de propiedades antes de escribir catálogo real
    PROPS_DIR.mkdir(parents=True, exist_ok=True)
    for old in PROPS_DIR.glob("*.json"):
        old.unlink()

    used_slugs: set[str] = set()
    redirects: list[dict[str, Any]] = []
    written = 0
    featured_count = 0

    for pair in merged.values():
        en = pair["en"]
        es = pair["es"]
        primary = en or es
        assert primary is not None

        unit_code = extract_unit_code(primary["title"], primary["internalRef"])
        building, zone = detect_building_and_zone(primary["title"], primary["address"], primary["area"])
        bedrooms = primary["bedrooms"]
        category = detect_category(primary["cats"], primary["title"], bedrooms)

        base_slug = slugify(f"{unit_code}-{category}-{zone}" if "skol" not in unit_code.lower() else f"{unit_code}-{category}")
        if not base_slug or base_slug in used_slugs:
            suffix = str(primary["ownerrezId"] or written + 1)
            base_slug = f"{base_slug}-{suffix}"
        while base_slug in used_slugs:
            base_slug = f"{base_slug}-2"
        used_slugs.add(base_slug)

        gallery = (en["gallery"] if en and en["gallery"] else []) or (es["gallery"] if es and es["gallery"] else [])
        cover = gallery[0] if gallery else ""

        sea_view = any(
            w in (primary["title"] + " " + " ".join(primary["amenities"])).lower()
            for w in ("sea view", "vistas al mar", "beachfront", "primera línea", "primera linea", "ocean", "seaside")
        )
        beachfront = any(
            w in (primary["title"] + " " + " ".join(primary["amenities"]) + " " + building).lower()
            for w in ("skol", "beachfront", "beach front", "primera línea", "primera linea", "frontline")
        )

        # Destacar las primeras 8 unidades del Edificio Skol con fotos y OwnerRez ID válido
        is_featured = False
        if (
            featured_count < 8
            and building == "Edificio Skol"
            and primary["ownerrezId"] > 0
            and len(gallery) >= 3
            and sea_view
        ):
            is_featured = True
            featured_count += 1

        en_title = (en["title"] if en else es["title"])[:140]
        es_title = (es["title"] if es else en["title"])[:140]
        en_desc = en["description"] if en else es["description"]
        es_desc = es["description"] if es else en["description"]
        en_sum = (en["summary"] if en else es["summary"])[:255]
        es_sum = (es["summary"] if es else en["summary"])[:255]
        en_am = en["amenities"] if en and en["amenities"] else (es["amenities"] if es else [])
        es_am = es["amenities"] if es and es["amenities"] else (en["amenities"] if en else [])

        prop_json = {
            "slug": base_slug,
            "unitCode": unit_code[:40],
            "internalRef": (en["internalRef"] if en and en["internalRef"] else (es["internalRef"] if es else "")),
            "vftLicense": (en["vft"] if en and en["vft"] else (es["vft"] if es else "")),
            "isActive": True,
            "featured": is_featured,
            "ownerrez": {
                "propertyId": (en["ownerrezId"] if en and en["ownerrezId"] else (es["ownerrezId"] if es else 0)),
                "propertyUuid": (en["propertyUuid"] if en and en["propertyUuid"] else (es["propertyUuid"] if es else "")),
                "calendarWidgetIdEn": (en["calWidget"] if en else ""),
                "calendarWidgetIdEs": (es["calWidget"] if es else ""),
                "bookingWidgetIdEn": (en["bookWidget"] if en else ""),
                "bookingWidgetIdEs": (es["bookWidget"] if es else ""),
                "publicUrl": "",
            },
            "category": category,
            "building": building,
            "zone": zone,
            "bedrooms": bedrooms,
            "bathrooms": primary["bathrooms"],
            "maxGuests": primary["maxGuests"],
            "areaSqm": 0,
            "seaView": sea_view,
            "beachfront": beachfront,
            "orientation": "",
            "location": {
                "address": primary["address"],
                "latitude": primary["lat"],
                "longitude": primary["lng"],
            },
            "contentEn": {
                "title": en_title if len(en_title) >= 5 else f"{unit_code} Marbella",
                "summary": en_sum,
                "description": en_desc,
                "amenities": en_am,
            },
            "contentEs": {
                "title": es_title if len(es_title) >= 5 else f"{unit_code} Marbella",
                "summary": es_sum,
                "description": es_desc,
                "amenities": es_am,
            },
            "coverImage": cover,
            "gallery": gallery,
            "legacyWpUrlEn": en["legacyPath"] if en else "",
            "legacyWpUrlEs": es["legacyPath"] if es else "",
        }

        out_path = PROPS_DIR / f"{base_slug}.json"
        out_path.write_text(json.dumps(prop_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written += 1

        # Redirecciones 301 SEO desde WordPress
        if en and en["legacyPath"] and en["legacyPath"].rstrip("/") != f"/properties/{base_slug}":
            redirects.append({
                "source": en["legacyPath"].rstrip("/"),
                "destination": f"/properties/{base_slug}",
                "permanent": True,
            })
        if es and es["legacyPath"] and es["legacyPath"].rstrip("/") != f"/es/propiedades/{base_slug}":
            redirects.append({
                "source": es["legacyPath"].rstrip("/"),
                "destination": f"/es/propiedades/{base_slug}",
                "permanent": True,
            })

    # Guardar redirecciones 301 en vercel.json
    vercel_cfg = {
        "redirects": redirects,
    }
    VERCEL_JSON.write_text(json.dumps(vercel_cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with_or = sum(
        1
        for p in PROPS_DIR.glob("*.json")
        if json.loads(p.read_text(encoding="utf-8"))["ownerrez"]["propertyId"] > 0
    )
    print(f"\n✓ Importación completada:")
    print(f"  - Propiedades unificadas EN+ES creadas: {written}")
    print(f"  - Con OwnerRez ID numérico enlazado: {with_or}/{written}")
    print(f"  - Destacadas en portada: {featured_count}")
    print(f"  - Redirecciones 301 generadas en vercel.json: {len(redirects)}")


if __name__ == "__main__":
    main()
