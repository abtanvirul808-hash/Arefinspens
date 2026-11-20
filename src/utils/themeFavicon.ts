import { AccentThemeColor } from '../types';

interface FaviconPalette {
  bg: string;
  border: string;
  bright: string;
  primary: string;
  deep: string;
  detail: string;
  themeColor: string;
}

const DARK_PALETTES: Record<AccentThemeColor, FaviconPalette> = {
  red: {
    bg: '#0b0506',
    border: '#ff3547',
    bright: '#ff5263',
    primary: '#ff1428',
    deep: '#7a000c',
    detail: '#090304',
    themeColor: '#ff1428',
  },
  purple: {
    bg: '#09050e',
    border: '#c084fc',
    bright: '#d8b4fe',
    primary: '#a855f7',
    deep: '#4c1d95',
    detail: '#08040d',
    themeColor: '#a855f7',
  },
  yellow: {
    bg: '#0b0903',
    border: '#fde047',
    bright: '#fef08a',
    primary: '#facc15',
    deep: '#854d0e',
    detail: '#0a0802',
    themeColor: '#facc15',
  },
  green: {
    bg: '#040c08',
    border: '#34d399',
    bright: '#6ee7b7',
    primary: '#10b981',
    deep: '#065f46',
    detail: '#030a07',
    themeColor: '#10b981',
  },
  'sky-blue': {
    bg: '#040a10',
    border: '#7dd3fc',
    bright: '#bae6fd',
    primary: '#38bdf8',
    deep: '#075985',
    detail: '#03080e',
    themeColor: '#38bdf8',
  },
  monochrome: {
    bg: '#09090b',
    border: '#ffffff',
    bright: '#ffffff',
    primary: '#e4e4e7',
    deep: '#52525b',
    detail: '#09090b',
    themeColor: '#18181b',
  },
};

const LIGHT_PALETTES: Record<AccentThemeColor, FaviconPalette> = {
  red: {
    bg: '#ffffff',
    border: '#d90f22',
    bright: '#ff3547',
    primary: '#d90f22',
    deep: '#650008',
    detail: '#ffffff',
    themeColor: '#d90f22',
  },
  purple: {
    bg: '#ffffff',
    border: '#7e22ce',
    bright: '#a855f7',
    primary: '#7e22ce',
    deep: '#3b0764',
    detail: '#ffffff',
    themeColor: '#7e22ce',
  },
  yellow: {
    bg: '#ffffff',
    border: '#b45309',
    bright: '#facc15',
    primary: '#d97706',
    deep: '#713f12',
    detail: '#ffffff',
    themeColor: '#d97706',
  },
  green: {
    bg: '#ffffff',
    border: '#047857',
    bright: '#10b981',
    primary: '#047857',
    deep: '#064e3b',
    detail: '#ffffff',
    themeColor: '#047857',
  },
  'sky-blue': {
    bg: '#ffffff',
    border: '#0284c7',
    bright: '#38bdf8',
    primary: '#0284c7',
    deep: '#0c4a6e',
    detail: '#ffffff',
    themeColor: '#0284c7',
  },
  monochrome: {
    bg: '#ffffff',
    border: '#18181b',
    bright: '#3f3f46',
    primary: '#18181b',
    deep: '#09090b',
    detail: '#ffffff',
    themeColor: '#ffffff',
  },
};

export function buildThemedFaviconDataUrl(
  theme: 'dark' | 'light',
  accentColor: AccentThemeColor = 'red'
): { iconUrl: string; themeColor: string } {
  const map = theme === 'light' ? LIGHT_PALETTES : DARK_PALETTES;
  const p = map[accentColor] || map.red;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="fg" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${p.bright}"/>
      <stop offset="55%" stop-color="${p.primary}"/>
      <stop offset="100%" stop-color="${p.deep}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="${p.bg}" stroke="${p.border}" stroke-width="3"/>
  <path d="M22 10L30 23.5L26.8 34.5H17.2L14 23.5L22 10Z" fill="url(#fg)" stroke="${p.bright}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M22 10.5V23.5" stroke="${p.detail}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="22" cy="25.5" r="2.2" fill="${p.detail}"/>
  <rect x="16.8" y="36" width="10.4" height="4.5" rx="1.4" fill="url(#fg)"/>
  <path d="M41.5 18L52 23.8V36.2L41.5 42L31 36.2V23.8L41.5 18Z" fill="url(#fg)" stroke="${p.bright}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M31 23.8L41.5 29.6L52 23.8" stroke="${p.detail}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M41.5 29.6V42" stroke="${p.detail}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M12 42.5C15 51.5 38 54.5 52.5 41.5C41.5 50 18.5 49 12 42.5Z" fill="url(#fg)"/>
</svg>`;

  return {
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    themeColor: p.themeColor,
  };
}

export function applyDynamicFavicon(
  theme: 'dark' | 'light',
  accentColor: AccentThemeColor = 'red'
): void {
  if (typeof document === 'undefined') return;
  const { iconUrl, themeColor } = buildThemedFaviconDataUrl(theme, accentColor);

  let link = document.querySelector<HTMLLinkElement>('link#app-favicon, link[rel*="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.id = 'app-favicon';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = iconUrl;

  let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = themeColor;
}
