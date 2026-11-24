export type Lang = 'en' | 'es';

export const DEFAULT_LANG: Lang = 'en';

/**
 * Pares de rutas estáticas entre inglés (idioma principal en `/`)
 * y español (`/es/...`).
 */
const ROUTE_PAIRS: [string, string][] = [
  ['/', '/es'],
  ['/properties', '/es/propiedades'],
  ['/skol-building', '/es/edificio-skol'],
  ['/marbella', '/es/marbella'],
  ['/contact', '/es/contacto'],
  ['/legal', '/es/aviso-legal'],
  ['/privacy', '/es/privacidad'],
  ['/cookies', '/es/cookies'],
];

export function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

export function getLangFromPath(path: string): Lang {
  const norm = normalizePath(path);
  return norm === '/es' || norm.startsWith('/es/') ? 'es' : 'en';
}

export function getAlternatePath(currentPath: string, targetLang: Lang): string {
  const norm = normalizePath(currentPath);

  if (targetLang === 'es') {
    if (norm === '/es' || norm.startsWith('/es/')) return norm;
    const match = ROUTE_PAIRS.find(([en]) => en === norm);
    if (match) return match[1];
    if (norm.startsWith('/properties/')) {
      return norm.replace('/properties/', '/es/propiedades/');
    }
    return '/es';
  } else {
    if (norm !== '/es' && !norm.startsWith('/es/')) return norm;
    const match = ROUTE_PAIRS.find(([, es]) => es === norm);
    if (match) return match[0];
    if (norm.startsWith('/es/propiedades/')) {
      return norm.replace('/es/propiedades/', '/properties/');
    }
    return '/';
  }
}

export const NAV_ITEMS: Record<Lang, ReadonlyArray<{ label: string; href: string }>> = {
  en: [
    { label: 'Home', href: '/' },
    { label: 'Apartments', href: '/properties' },
    { label: 'Skol Building', href: '/skol-building' },
    { label: 'Marbella', href: '/marbella' },
    { label: 'Contact', href: '/contact' },
  ],
  es: [
    { label: 'Inicio', href: '/es' },
    { label: 'Apartamentos', href: '/es/propiedades' },
    { label: 'Edificio Skol', href: '/es/edificio-skol' },
    { label: 'Marbella', href: '/es/marbella' },
    { label: 'Contacto', href: '/es/contacto' },
  ],
};
