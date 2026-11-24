import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: {
      name: 'MarbellaSkol CMS',
    },
    navigation: {
      'Catálogo de Apartamentos': ['properties'],
      'Páginas Principales': ['home', 'skolBuilding', 'contactPage'],
      'SEO y Configuración': ['faqs', 'siteSettings'],
    },
  },
  singletons: {
    siteSettings: singleton({
      label: 'Ajustes Globales y Contacto',
      path: 'src/content/singletons/site-settings',
      format: { data: 'json' },
      schema: {
        brandName: fields.text({
          label: 'Nombre comercial de la marca',
          description: 'Aparece en la cabecera, pie de página y títulos de Google',
          validation: { length: { min: 2, max: 60 } },
        }),
        domain: fields.text({
          label: 'Dominio oficial de la web',
          description: 'URL completa sin barra final (ej: https://www.marbellaskol.com)',
          validation: { length: { min: 10, max: 120 } },
        }),
        email: fields.text({
          label: 'Correo de reservas y contacto',
          description: 'Dirección principal donde llegan las consultas de clientes',
        }),
        phoneMobile: fields.text({
          label: 'Teléfono móvil y WhatsApp',
          description: 'Número visible con prefijo internacional (ej: +34 682 808 047)',
        }),
        phoneLandline: fields.text({
          label: 'Teléfono fijo de oficina',
          description: 'Número de oficina en Marbella (ej: +34 952 02 67 24)',
        }),
        whatsappNumber: fields.text({
          label: 'Número para enlace directo de WhatsApp',
          description: 'Solo dígitos con prefijo de país, sin espacios ni símbolo + (ej: 34682808047)',
        }),
        address: fields.text({
          label: 'Dirección física del Edificio Skol',
          description: 'Dirección completa que aparece en el pie de página y Google Maps',
        }),
        facebookUrl: fields.text({
          label: 'Enlace de Facebook',
          description: 'URL completa de la página oficial de Facebook',
        }),
        instagramUrl: fields.text({
          label: 'Enlace de Instagram',
          description: 'URL completa del perfil oficial de Instagram',
        }),
        youtubeUrl: fields.text({
          label: 'Enlace de YouTube',
          description: 'URL completa del canal de YouTube',
        }),
        legalCompanyName: fields.text({
          label: 'Titular legal o empresa (Aviso Legal)',
          description: 'Nombre legal o razón social para las páginas de Aviso Legal y Privacidad',
        }),
        legalTaxId: fields.text({
          label: 'NIF / CIF (Aviso Legal)',
          description: 'Identificación fiscal para cumplimiento LSSI-CE',
        }),
      },
    }),

    home: singleton({
      label: 'Portada (Home)',
      path: 'src/content/singletons/home',
      format: { data: 'json' },
      schema: {
        seo: fields.object(
          {
            titleEn: fields.text({
              label: 'Título para Google en Inglés',
              description: 'Máximo 60 caracteres. Palabra clave principal delante.',
              validation: { length: { min: 20, max: 65 } },
            }),
            descriptionEn: fields.text({
              label: 'Descripción corta para Google en Inglés',
              description: 'Resumen que aparece bajo el título en Google (140–160 caracteres)',
              multiline: true,
              validation: { length: { min: 80, max: 165 } },
            }),
            titleEs: fields.text({
              label: 'Título para Google en Español',
              description: 'Máximo 60 caracteres. Palabra clave principal delante.',
              validation: { length: { min: 20, max: 65 } },
            }),
            descriptionEs: fields.text({
              label: 'Descripción corta para Google en Español',
              description: 'Resumen que aparece bajo el título en Google (140–160 caracteres)',
              multiline: true,
              validation: { length: { min: 80, max: 165 } },
            }),
          },
          { label: 'Posicionamiento en Google (SEO)' }
        ),
        hero: fields.object(
          {
            kickerEn: fields.text({
              label: 'Etiqueta superior en Inglés',
              description: 'Texto corto sobre el titular principal (ej: Frontline Beach · Marbella Centre)',
            }),
            kickerEs: fields.text({
              label: 'Etiqueta superior en Español',
              description: 'Texto corto sobre el titular principal (ej: Primera Línea de Playa · Marbella Centro)',
            }),
            headlineEn: fields.text({
              label: 'Titular principal de la portada en Inglés (H1)',
              description: 'El título grande que ve el visitante nada más entrar',
              validation: { length: { min: 10, max: 90 } },
            }),
            headlineEs: fields.text({
              label: 'Titular principal de la portada en Español (H1)',
              description: 'El título grande que ve el visitante nada más entrar',
              validation: { length: { min: 10, max: 90 } },
            }),
            subheadlineEn: fields.text({
              label: 'Subtítulo explicativo en Inglés',
              description: 'Dos líneas claras explicando la ventaja de reservar directo',
              multiline: true,
            }),
            subheadlineEs: fields.text({
              label: 'Subtítulo explicativo en Español',
              description: 'Dos líneas claras explicando la ventaja de reservar directo',
              multiline: true,
            }),
          },
          { label: 'Cabecera Principal (Hero)' }
        ),
        featuredSection: fields.object(
          {
            titleEn: fields.text({
              label: 'Título de sección Apartamentos Destacados (Inglés)',
            }),
            titleEs: fields.text({
              label: 'Título de sección Apartamentos Destacados (Español)',
            }),
            subtitleEn: fields.text({
              label: 'Subtítulo de sección Destacados (Inglés)',
              multiline: true,
            }),
            subtitleEs: fields.text({
              label: 'Subtítulo de sección Destacados (Español)',
              multiline: true,
            }),
          },
          { label: 'Bloque de Apartamentos Destacados' }
        ),
      },
    }),

    skolBuilding: singleton({
      label: 'Página Edificio Skol y Entorno',
      path: 'src/content/singletons/skol-building',
      format: { data: 'json' },
      schema: {
        titleEn: fields.text({ label: 'Titular principal en Inglés (H1)' }),
        titleEs: fields.text({ label: 'Titular principal en Español (H1)' }),
        introEn: fields.text({ label: 'Introducción del Edificio Skol en Inglés', multiline: true }),
        introEs: fields.text({ label: 'Introducción del Edificio Skol en Español', multiline: true }),
        seoTitleEn: fields.text({ label: 'Título SEO en Inglés (máx. 60 car.)' }),
        seoDescEn: fields.text({ label: 'Descripción SEO en Inglés (máx. 160 car.)', multiline: true }),
        seoTitleEs: fields.text({ label: 'Título SEO en Español (máx. 60 car.)' }),
        seoDescEs: fields.text({ label: 'Descripción SEO en Español (máx. 160 car.)', multiline: true }),
      },
    }),

    contactPage: singleton({
      label: 'Página de Contacto',
      path: 'src/content/singletons/contact-page',
      format: { data: 'json' },
      schema: {
        titleEn: fields.text({ label: 'Titular de Contacto en Inglés (H1)' }),
        titleEs: fields.text({ label: 'Titular de Contacto en Español (H1)' }),
        introEn: fields.text({ label: 'Texto de bienvenida en Inglés', multiline: true }),
        introEs: fields.text({ label: 'Texto de bienvenida en Español', multiline: true }),
        officeHoursEn: fields.text({ label: 'Horario de atención en Inglés' }),
        officeHoursEs: fields.text({ label: 'Horario de atención en Español' }),
      },
    }),
  },

  collections: {
    properties: collection({
      label: 'Apartamentos y Propiedades',
      slugField: 'slug',
      path: 'src/content/properties/*',
      format: { data: 'json' },
      columns: ['unitCode', 'building', 'vftLicense', 'bedrooms', 'maxGuests', 'isActive'],
      schema: {
        slug: fields.slug({
          name: {
            label: 'Identificador URL amigable (slug)',
            description: 'En minúsculas y con guiones, sin tildes ni espacios (ej: skol-130-one-bedroom-sea-view)',
          },
        }),
        unitCode: fields.text({
          label: 'Código de apartamento o referencia',
          description: 'Nombre corto visible en tarjetas y listados (ej: Skol 130, Skol 508, Palm Beach 2F)',
          validation: { length: { min: 2, max: 40 } },
        }),
        internalRef: fields.text({
          label: 'Referencia interna de oficina',
          description: 'Código interno opcional (ej: SK-00130-C)',
        }),
        vftLicense: fields.text({
          label: 'Licencia Turística de Andalucía (VFT / VUT)',
          description: 'Número de registro turístico obligatorio (ej: VFT/MA/47693)',
        }),
        isActive: fields.checkbox({
          label: 'Publicar en la web',
          description: 'Desmarca esta casilla si el apartamento está temporalmente fuera de catálogo',
          defaultValue: true,
        }),
        featured: fields.checkbox({
          label: 'Destacar en la portada',
          description: 'Actívalo para que aparezca en la selección principal de la página de inicio',
          defaultValue: false,
        }),

        // Bloque OwnerRez: el corazón de la búsqueda y los pagos
        ownerrez: fields.object(
          {
            propertyId: fields.integer({
              label: 'ID numérico de OwnerRez (OBLIGATORIO para buscador)',
              description: 'Solo números (ej: 33837). Conecta este apartamento con la disponibilidad real de OwnerRez.',
              validation: { min: 0 },
            }),
            propertyUuid: fields.text({
              label: 'ID alfanumérico de propiedad OwnerRez (data-propertyid)',
              description: 'Código largo que aparece en el embed de OwnerRez (ej: 5f389d72c014436782ae462b9c6a4b05)',
            }),
            calendarWidgetIdEn: fields.text({
              label: 'Código Widget Calendario en Inglés (data-widgetid)',
              description: 'ID del widget Multiple Month Calendar en Inglés copiado de OwnerRez',
            }),
            calendarWidgetIdEs: fields.text({
              label: 'Código Widget Calendario en Español (data-widgetid)',
              description: 'ID del widget Multiple Month Calendar en Español (si no tiene, usará el de Inglés)',
            }),
            bookingWidgetIdEn: fields.text({
              label: 'Código Widget Reserva / Pago en Inglés (data-widgetid)',
              description: 'ID del widget Book/Inquire en Inglés copiado de OwnerRez',
            }),
            bookingWidgetIdEs: fields.text({
              label: 'Código Widget Reserva / Pago en Español (data-widgetid)',
              description: 'ID del widget Book/Inquire en Español (si no tiene, usará el de Inglés)',
            }),
            reviewWidgetId: fields.text({
              label: 'Código Widget de Opiniones / Reseñas (data-widgetid, opcional)',
              description: 'ID del widget de Reviews verificadas si la propiedad dispone de él',
            }),
            publicUrl: fields.text({
              label: 'Enlace directo en OwnerRez (opcional)',
              description: 'URL pública directa en OwnerRez si se desea botón de respaldo',
            }),
          },
          {
            label: 'Conexión OwnerRez (Buscador, Calendario y Pagos)',
            description: 'Pega aquí los códigos de OwnerRez de esta propiedad. OwnerRez gestiona precios, disponibilidad y pagos.',
          }
        ),

        // Características físicas
        category: fields.select({
          label: 'Tipología de vivienda',
          options: [
            { label: 'Estudio (Studio)', value: 'studio' },
            { label: 'Apartamento (Apartment)', value: 'apartment' },
            { label: 'Dúplex (Duplex)', value: 'duplex' },
            { label: 'Ático (Penthouse)', value: 'penthouse' },
            { label: 'Casa Adosada (Townhouse)', value: 'townhouse' },
          ],
          defaultValue: 'apartment',
        }),
        building: fields.text({
          label: 'Edificio o complejo',
          description: 'Ej: Edificio Skol, Mediterráneo, Palm Beach, Cibeles, Casa Gina, Mar Azul',
          defaultValue: 'Edificio Skol',
        }),
        zone: fields.text({
          label: 'Zona / Ciudad',
          description: 'Ej: Marbella Centre, Marbella Old Town, Estepona',
          defaultValue: 'Marbella Centre',
        }),
        bedrooms: fields.integer({
          label: 'Dormitorios',
          description: 'Pon 0 si es un Estudio',
          defaultValue: 1,
          validation: { min: 0, max: 10 },
        }),
        bathrooms: fields.number({
          label: 'Baños',
          defaultValue: 1,
          validation: { min: 1, max: 10 },
        }),
        maxGuests: fields.integer({
          label: 'Capacidad máxima de huéspedes',
          defaultValue: 2,
          validation: { min: 1, max: 16 },
        }),
        areaSqm: fields.integer({
          label: 'Superficie aproximada (m²)',
          description: 'Opcional. Déjalo en 0 si no aplica',
          defaultValue: 0,
        }),
        seaView: fields.checkbox({
          label: 'Tiene vistas al mar',
          defaultValue: true,
        }),
        beachfront: fields.checkbox({
          label: 'Primera línea de playa',
          defaultValue: true,
        }),
        orientation: fields.text({
          label: 'Orientación (opcional)',
          description: 'Ej: South, West, South-West, East',
        }),

        // Ubicación para el mapa gratuito Leaflet
        location: fields.object(
          {
            address: fields.text({
              label: 'Dirección aproximada',
              defaultValue: 'Avenida Arias Maldonado 16, Marbella',
            }),
            latitude: fields.number({
              label: 'Latitud (para el mapa)',
              defaultValue: 36.5076,
            }),
            longitude: fields.number({
              label: 'Longitud (para el mapa)',
              defaultValue: -4.8902,
            }),
          },
          { label: 'Ubicación en el Mapa' }
        ),

        // Textos en Inglés y Español en la misma pantalla
        contentEn: fields.object(
          {
            title: fields.text({
              label: 'Título del apartamento en Inglés',
              description: 'Ej: Skol 130 — One Bedroom Apartment with Sea Views in Marbella Centre',
              validation: { length: { min: 5, max: 140 } },
            }),
            summary: fields.text({
              label: 'Resumen breve en Inglés (para tarjetas y Google)',
              multiline: true,
              validation: { length: { min: 0, max: 260 } },
            }),
            description: fields.text({
              label: 'Descripción completa en Inglés',
              multiline: true,
            }),
            amenities: fields.array(
              fields.text({ label: 'Equipamiento (Inglés)' }),
              {
                label: 'Servicios y equipamiento (Inglés)',
                itemLabel: (props) => props.value || 'Nuevo equipamiento',
              }
            ),
          },
          { label: 'Textos en Inglés (Idioma principal)' }
        ),

        contentEs: fields.object(
          {
            title: fields.text({
              label: 'Título del apartamento en Español',
              description: 'Ej: Skol 130 — Apartamento de 1 Dormitorio con Vistas al Mar en Marbella Centro',
              validation: { length: { min: 5, max: 140 } },
            }),
            summary: fields.text({
              label: 'Resumen breve en Español (para tarjetas y Google)',
              multiline: true,
              validation: { length: { min: 0, max: 260 } },
            }),
            description: fields.text({
              label: 'Descripción completa en Español',
              multiline: true,
            }),
            amenities: fields.array(
              fields.text({ label: 'Equipamiento (Español)' }),
              {
                label: 'Servicios y equipamiento (Español)',
                itemLabel: (props) => props.value || 'Nuevo equipamiento',
              }
            ),
          },
          { label: 'Textos en Español' }
        ),

        // Galería de imágenes (soporta URLs importadas y nuevas imágenes subidas)
        coverImage: fields.text({
          label: 'Foto principal de portada (URL o ruta)',
          description: 'Imagen destacada que aparece en la tarjeta y arriba de la ficha',
        }),
        gallery: fields.array(
          fields.text({ label: 'URL o ruta de foto' }),
          {
            label: 'Galería de fotografías del apartamento',
            itemLabel: (props) => props.value || 'Foto de galería',
          }
        ),

        // URLs antiguas de WordPress para generar redirecciones 301 automáticas
        legacyWpUrlEn: fields.text({
          label: 'URL antigua en WordPress (Inglés — solo SEO 301)',
          description: 'No modificar: sirve para conservar el posicionamiento de Google',
        }),
        legacyWpUrlEs: fields.text({
          label: 'URL antigua en WordPress (Español — solo SEO 301)',
          description: 'No modificar: sirve para conservar el posicionamiento de Google',
        }),
      },
    }),

    faqs: collection({
      label: 'Preguntas Frecuentes (SEO / GEO)',
      slugField: 'slug',
      path: 'src/content/faqs/*',
      format: { data: 'json' },
      columns: ['questionEn', 'order'],
      schema: {
        slug: fields.slug({
          name: {
            label: 'Identificador URL (slug)',
            description: 'En minúsculas y con guiones (ej: direct-booking-savings)',
          },
        }),
        order: fields.integer({
          label: 'Orden de aparición',
          defaultValue: 10,
        }),
        questionEn: fields.text({
          label: 'Pregunta en Inglés',
          validation: { length: { min: 5, max: 180 } },
        }),
        answerEn: fields.text({
          label: 'Respuesta clara en Inglés (60–100 palabras)',
          multiline: true,
          validation: { length: { min: 20, max: 900 } },
        }),
        questionEs: fields.text({
          label: 'Pregunta en Español',
          validation: { length: { min: 5, max: 180 } },
        }),
        answerEs: fields.text({
          label: 'Respuesta clara en Español (60–100 palabras)',
          multiline: true,
          validation: { length: { min: 20, max: 900 } },
        }),
      },
    }),
  },
});
