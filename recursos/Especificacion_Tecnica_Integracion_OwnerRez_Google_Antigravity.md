# **Arquitectura de Integración API OwnerRez para Aplicaciones Web de Alquiler Vacacional**

# **Documento de Especificación Técnica para Agentes AI (Google Antigravity / AI Studio)**

## **1\. Objetivo del Proyecto y Contexto para el Agente**

El propósito de este documento es definir la arquitectura técnica integral para desarrollar una plataforma moderna, escalable y de alto rendimiento de alquileres vacacionales (utilizando frameworks modernos como Next.js, React y Node.js). Esta nueva plataforma reemplazará la arquitectura heredada basada en WordPress y scripts PHP manuales, conectándose directamente con la **API de OwnerRez** en tiempo real.

### **Objetivos Clave de Arquitectura:**

* **Separación de Responsabilidades:** El cliente (frontend) maneja únicamente la interfaz de usuario, interactividad de búsqueda e i18n. Toda la comunicación con la API de OwnerRez se realiza a través de backend proxy endpoints o Server Actions en el servidor.  
* **Seguridad Estricta de Credenciales:** El *Personal Access Token* de OwnerRez jamás debe exponerse en el código cliente ni en peticiones públicas del navegador. Se almacenará en variables de entorno estrictamente del lado del servidor (`OWNERREZ_API_USER` y `OWNERREZ_API_TOKEN`).  
* **Sincronización Transparente:** Mapeo desacoplado entre el catálogo de propiedades local (CMS/Base de datos) y la API mediante identificadores únicos `ownerrez_property_id`.

---

## **2\. Arquitectura de Conexión y Autenticación con la API de OwnerRez**

### **Configuración de Endpoints**

* **Base URL de Producción:** `https://secure.ownerreservations.com/api/`  
* **Notas de Migración v2:** Mantener compatibilidad estructural con las entidades v2 (`https://api.ownerrez.com/v2/`) asegurando un modelo de datos extensible para cotizaciones dinámicas y webhooks directos.

### **Método de Autenticación**

La autenticación se realiza mediante **HTTP Basic Authentication**. Cada petición a la API de OwnerRez debe incluir la cabecera `Authorization` codificada en Base64 con las credenciales del sistema.

```
Authorization: Basic Base64(OWNERREZ_API_USER + ":" + OWNERREZ_API_TOKEN)
```

Directiva de Depreciación Importante: Las cabeceras personalizadas legadas (`X-OwnerRez-App`, `X-OwnerRez-User`) quedan estrictamente obsoletas. El agente no debe generar código que implemente o dependa de estas cabeceras en el nuevo desarrollo.

### **Variables de Entorno (.env.local)**

El sistema debe configurar y validar la presencia de las siguientes variables en la inicialización del servidor:

```
# Variables del Lado del Servidor (Privadas)
OWNERREZ_API_USER="usuario@dominio.com"
OWNERREZ_API_TOKEN="pt_xxxxxxxxxxxxxxxxxxxxxxxx"

# Opciones de Configuración API
OWNERREZ_API_BASE_URL="https://secure.ownerreservations.com/api/"
```

---

## **3\. Endpoints Clave y Flujo de Datos**

### **3.1 Sincronización y Listado de Propiedades**

Para construir la base de datos local o hidratar la caché del sistema, se utilizan los endpoints de consulta de propiedades.

| Endpoint | Método | Descripción |
| :---- | :---- | :---- |
| `properties/lookup` | `GET` | Recupera el catálogo ligero de propiedades (IDs, nombres, imágenes clave). |
| `properties/{id}` | `GET` | Recupera el detalle completo de una propiedad (habitación, baños, ocupación, fotos). |

#### **Mapeo de Campos Básicos:**

* `Id` \$\\rightarrow\$ `ownerrez_property_id`  
* `Name` \$\\rightarrow\$ Nombre principal de la propiedad.  
* `PublicUrl` \$\\rightarrow\$ Enlace público directo a OwnerRez.  
* `MaxGuests` \$\\rightarrow\$ Capacidad máxima de huéspedes.

### **3.2 Búsqueda de Disponibilidad en Tiempo Real**

El motor de búsqueda debe ejecutar validaciones estrictas invocando el endpoint de disponibilidad de OwnerRez desde el backend.

```
GET https://secure.ownerreservations.com/api/properties/search
```

#### **Parámetros de Consulta (Query Parameters):**

| Parámetro | Tipo | Requerido | Descripción / Regla de Negocio |
| :---- | :---- | :---- | :---- |
| `availabilityFrom` | `string` | **Sí** | Fecha de entrada en formato `YYYY-MM-DD`. |
| `availabilityTo` | `string` | **Sí** | Fecha de salida en formato `YYYY-MM-DD`. |
| `bedroomsFrom` | `integer` | No | Filtro de dormitorios mínimos (ej. `0`, `1`, `2`). |
| `guests` | `integer` | No | Ocupantes esperados. Filtrar por `MaxGuests >= guests`. |
| `evaluateAvailabilityRules` | `boolean` | **Sí** | **CRÍTICO:** Debe asignarse en `true`. Fuerza a OwnerRez a validar días de cambio, estancia mínima y bloqueos de calendario. |

#### **Lógica de Procesamiento de Respuestas:**

1. Parsear la respuesta JSON recibida de OwnerRez.  
2. Filtrar propiedades retornadas: verificar que cada elemento posea un `Id` válido.  
3. **Validación de Reglas:** Verificar que el nodo `RuleViolations` no contenga elementos o esté indefinido (`!property.RuleViolations || property.RuleViolations.length === 0`). Si hay violaciones de regla, la propiedad **no** está disponible para la venta en esas fechas.  
4. Intersectar la lista de `Id` válidos con la base de datos local para renderizar solo las propiedades disponibles en la UI.

---

## **4\. Arquitectura Funcional Requerida para la Nueva Web**

### **4.1 Buscador Principal (Hero Search Bar)**

* **Campos Requeridos:**  
  * Fecha de Entrada (`dateFrom`) y Fecha de Salida (`dateTo`).  
  * Selector de Huéspedes (`guests`, valor por defecto: `2`).  
  * Selector de Dormitorios (`bedrooms`, valor por defecto: `0` / todos).  
  * Botón de Acción "Buscar Disponibilidad".  
* **Reglas UX y Validación:**  
  * Implementar un selector de rango de fechas fluido e i18n sin dependencias obsoletas.  
  * Autovalidación: `dateTo` debe ser estrictamente posterior a `dateFrom`.  
  * Valores por defecto dinámicos: Fecha de entrada \= mañana; Fecha de salida \= mañana \+ 2 días.

### **4.2 Página de Resultados y Mapa Interactivo**

* **Layout:** Vista dividida (*Split View*) con tarjeta de propiedades a la izquierda y mapa interactivo a la derecha con marcadores dinámicos.  
* **Filtrado:** Mostrar **únicamente** las propiedades devueltas como disponibles por la API de OwnerRez para el rango de fechas seleccionado.  
* **Manejo de Estados Vacíos (*Empty States*):** Si no hay resultados para las fechas seleccionadas, presentar un mensaje claro recomendando modificar las fechas o ajustar el número de huéspedes.

### **4.3 Ficha de Propiedad y Widget de Reserva / Cotización**

* **Ficha de Propiedad:** Renderizado dinámico de galería de fotos, lista de servicios (amenities), reglas de la casa y ubicación aproximada.  
* **Widget de Cotización:** Formulario en tiempo real que consulte el endpoint de cotizaciones de OwnerRez (`GET /quotes`) para mostrar el desglose de tarifas, impuestos y cargos por limpieza antes del redireccionamiento al checkout directo de OwnerRez.

### **4.4 Soporte Multi-idioma (i18n)**

* Arquitectura de rutas localizadas (`/es/propiedades/...`, `/en/properties/...`).  
* Base de datos local: Mantener un único `ownerrez_property_id` asignado al registro multi-idioma para evitar duplicación de llamadas API o desincronización de disponibilidad.

---

## **5\. Modelo de Datos Recomendado (Esquema JSON)**

El siguiente esquema define la estructura de datos que debe implementar la base de datos o CMS local para asociar las propiedades locales con la API de OwnerRez:

```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Property",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "UUID único interno del sistema / CMS"
    },
    "ownerrez_property_id": {
      "type": "integer",
      "description": "ID numérico correspondiente en la API de OwnerRez"
    },
    "slug": {
      "type": "string",
      "description": "URL amigable de la propiedad"
    },
    "is_active": {
      "type": "boolean",
      "default": true
    },
    "featured": {
      "type": "boolean",
      "default": false
    },
    "max_guests": {
      "type": "integer"
    },
    "bedrooms": {
      "type": "integer"
    },
    "bathrooms": {
      "type": "number"
    },
    "location": {
      "type": "object",
      "properties": {
        "address": { "type": "string" },
        "city": { "type": "string" },
        "latitude": { "type": "number" },
        "longitude": { "type": "number" }
      }
    },
    "translations": {
      "type": "object",
      "properties": {
        "es": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" },
            "amenities": { "type": "array", "items": { "type": "string" } }
          }
        },
        "en": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "description": { "type": "string" },
            "amenities": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  },
  "required": ["id", "ownerrez_property_id", "slug", "max_guests", "bedrooms"]
}
```

---

## **6\. Prompt de Arranque para Google Antigravity (AG) / AI Studio**

Copiar y pegar el siguiente bloque de instrucciones en Google Antigravity IDE para iniciar la construcción estructurada del proyecto:

```
[SYSTEM PROMPT / INITIALIZATION]

Actúa como un Desarrollador Full-Stack Senior experto en Next.js (App Router), TypeScript, Tailwind CSS y arquitecturas de integración de APIs de alquiler vacacional.

Tu objetivo es construir la plataforma web de alquiler vacacional conectada en tiempo real con la API de OwnerRez, siguiendo estrictamente las especificaciones descritas a continuación:

1. CONFIGURACIÓN Y SEGURIDAD API:
   - Crea un cliente API seguro en el backend (/lib/ownerrez.ts) usando fetch nativo.
   - Implementa la autenticación HTTP Basic usando Base64(OWNERREZ_API_USER:OWNERREZ_API_TOKEN).
   - NUNCA expongas las credenciales ni realices peticiones a OwnerRez desde el cliente.
   - Utiliza la URL base: https://secure.ownerreservations.com/api/

2. SERVICIOS Y ENDPOINTS BACKEND:
   - Implementa la función `searchAvailableProperties(params)` que llame al endpoint `GET properties/search` pasando obligatoriamente:
     * `availabilityFrom` (YYYY-MM-DD)
     * `availabilityTo` (YYYY-MM-DD)
     * `bedroomsFrom`
     * `guests`
     * `evaluateAvailabilityRules=true`
   - Filtra la respuesta de OwnerRez descartando cualquier propiedad que contenga violaciones en `RuleViolations`.

3. COMPONENTES FRONTEND Y UI:
   - Diseña una barra de búsqueda Hero con inputs de fechas (Check-in / Check-out), selección de huéspedes y selector de dormitorios.
   - Construye la página de resultados con vista dividida (Lista de Propiedades + Mapa Interactivo).
   - Implementa los estados de carga (Skeletons) y el estado vacío (Empty State) cuando no se encuentren propiedades disponibles.

4. MODELO DE DATOS Y i18n:
   - Configura la estructura i18n desacoplada donde el ID de OwnerRez (`ownerrez_property_id`) relaciona las variantes de idioma sin duplicar llamadas.

Por favor, comienza generando la estructura global del proyecto, el archivo de configuración de variables de entorno `.env.local.example` y el cliente backend para OwnerRez en TypeScript.
```

