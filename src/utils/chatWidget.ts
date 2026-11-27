import {
  ChannelIconStyle,
  ChatWidgetConfig,
  FloatingChatIconStyle,
  MessagingChannel,
  MessagingPlatform,
} from '../types';

export const MIN_CHAT_BUTTON_SIZE = 40;
export const MAX_CHAT_BUTTON_SIZE = 96;
export const DEFAULT_CHAT_BUTTON_SIZE = 56;

export const CHAT_SIZE_PRESETS: { label: string; size: number }[] = [
  { label: 'Compact', size: 44 },
  { label: 'Standard', size: 56 },
  { label: 'Large', size: 68 },
  { label: 'XL', size: 80 },
];

export const DEFAULT_CHAT_WIDGET_CONFIG: ChatWidgetConfig = {
  enabled: true,
  whatsappNumber: '+8801886338818',
  whatsappLink: '',
  whatsappLabel: 'WhatsApp',
  prefillMessage: 'Assalamu Alaikum! I would like to ask about a pen from Arefin Mart.',
  buttonLabel: 'Chat with us',
  iconStyle: 'whatsapp-classic',
  customIconUrl: '',
  buttonColor: '#25D366',
  buttonSize: DEFAULT_CHAT_BUTTON_SIZE,
  channels: [],
};

export interface PlatformPresetMeta {
  platform: MessagingPlatform;
  defaultLabel: string;
  color: string;
  handleLabel: string;
  handlePlaceholder: string;
  linkPlaceholder: string;
}

export const MESSAGING_PLATFORM_META: Record<MessagingPlatform, PlatformPresetMeta> = {
  whatsapp: {
    platform: 'whatsapp',
    defaultLabel: 'WhatsApp',
    color: '#25D366',
    handleLabel: 'WhatsApp Number',
    handlePlaceholder: '+8801886338818',
    linkPlaceholder: 'https://wa.me/8801886338818',
  },
  messenger: {
    platform: 'messenger',
    defaultLabel: 'Messenger',
    color: '#0084FF',
    handleLabel: 'Page / Username',
    handlePlaceholder: 'arefinmart.bd',
    linkPlaceholder: 'https://m.me/arefinmart.bd',
  },
  telegram: {
    platform: 'telegram',
    defaultLabel: 'Telegram',
    color: '#229ED9',
    handleLabel: 'Telegram Username',
    handlePlaceholder: '@arefinmart',
    linkPlaceholder: 'https://t.me/arefinmart',
  },
  imo: {
    platform: 'imo',
    defaultLabel: 'imo Chat',
    color: '#00A2FF',
    handleLabel: 'imo ID or Phone',
    handlePlaceholder: 'arefinmart',
    linkPlaceholder: 'https://imo.im/arefinmart',
  },
  viber: {
    platform: 'viber',
    defaultLabel: 'Viber',
    color: '#7360F2',
    handleLabel: 'Viber Phone Number',
    handlePlaceholder: '+8801886338818',
    linkPlaceholder: 'viber://chat?number=8801886338818',
  },
  wechat: {
    platform: 'wechat',
    defaultLabel: 'WeChat',
    color: '#07C160',
    handleLabel: 'WeChat ID or Link',
    handlePlaceholder: 'arefinmart',
    linkPlaceholder: 'https://u.wechat.com/...',
  },
  line: {
    platform: 'line',
    defaultLabel: 'LINE',
    color: '#06C755',
    handleLabel: 'LINE ID',
    handlePlaceholder: '@arefinmart',
    linkPlaceholder: 'https://line.me/R/ti/p/@arefinmart',
  },
  discord: {
    platform: 'discord',
    defaultLabel: 'Discord',
    color: '#5865F2',
    handleLabel: 'Invite Code or Link',
    handlePlaceholder: 'arefinmart',
    linkPlaceholder: 'https://discord.gg/arefinmart',
  },
  signal: {
    platform: 'signal',
    defaultLabel: 'Signal',
    color: '#3A76F0',
    handleLabel: 'Signal Phone / Link',
    handlePlaceholder: '+8801886338818',
    linkPlaceholder: 'https://signal.me/#p/+8801886338818',
  },
  instagram: {
    platform: 'instagram',
    defaultLabel: 'Instagram DM',
    color: '#E4405F',
    handleLabel: 'Instagram Handle',
    handlePlaceholder: '@arefinmart',
    linkPlaceholder: 'https://instagram.com/arefinmart',
  },
  facebook: {
    platform: 'facebook',
    defaultLabel: 'Facebook Page',
    color: '#1877F2',
    handleLabel: 'Facebook Page',
    handlePlaceholder: 'arefinmart.bd',
    linkPlaceholder: 'https://facebook.com/arefinmart.bd',
  },
  phone: {
    platform: 'phone',
    defaultLabel: 'Direct Call',
    color: '#10B981',
    handleLabel: 'Phone Number',
    handlePlaceholder: '+8801886338818',
    linkPlaceholder: 'tel:+8801886338818',
  },
  email: {
    platform: 'email',
    defaultLabel: 'Email Support',
    color: '#6366F1',
    handleLabel: 'Support Email',
    handlePlaceholder: 'support@arefinmart.com',
    linkPlaceholder: 'mailto:support@arefinmart.com',
  },
  custom: {
    platform: 'custom',
    defaultLabel: 'Live Chat Link',
    color: '#D90F22',
    handleLabel: 'Short Subtitle',
    handlePlaceholder: 'Direct message',
    linkPlaceholder: 'https://your-chat-link.com',
  },
};

export const CHAT_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'WhatsApp Green', hex: '#25D366' },
  { label: 'Deep Emerald', hex: '#128C7E' },
  { label: 'Messenger Blue', hex: '#0084FF' },
  { label: 'Viber Purple', hex: '#7360F2' },
  { label: 'Instagram Pink', hex: '#E4405F' },
  { label: 'Store Red', hex: '#D90F22' },
  { label: 'Royal Purple', hex: '#7E22CE' },
  { label: 'Obsidian', hex: '#18181B' },
];

export const VALID_ICON_STYLES: FloatingChatIconStyle[] = [
  'whatsapp-classic',
  'whatsapp-bubble',
  'chat-spark',
  'headset',
  'send',
  'custom-image',
];

export const VALID_CHANNEL_ICON_STYLES: ChannelIconStyle[] = [
  'platform',
  'whatsapp-classic',
  'whatsapp-bubble',
  'chat-spark',
  'headset',
  'send',
  'phone',
  'custom-image',
];

const SAFE_IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isLiquidGlassColor(value: string | undefined): boolean {
  return (value || '').trim().toLowerCase() === 'liquid-glass';
}

export function normalizeHexColor(value: string | undefined, fallback = '#25D366'): string {
  const trimmed = (value || '').trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : fallback;
}

export function normalizeChatColor(value: string | undefined, fallback = '#25D366'): string {
  if (isLiquidGlassColor(value)) return 'liquid-glass';
  return normalizeHexColor(value, fallback);
}

export function normalizeChatButtonSize(
  value: unknown,
  fallback = DEFAULT_CHAT_BUTTON_SIZE
): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(MAX_CHAT_BUTTON_SIZE, Math.max(MIN_CHAT_BUTTON_SIZE, Math.round(num)));
}

export function isLightHexColor(hex: string): boolean {
  const clean = normalizeHexColor(hex, '#25D366').slice(1);
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
}

export function sanitizeSafeChatUrl(
  rawUrl: string | undefined,
  allowContactSchemes = true
): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  let candidate = trimmed;
  if (
    /^(wa\.me|api\.whatsapp\.com|m\.me|t\.me|imo\.im|vb\.me|u\.wechat\.com|line\.me|discord\.gg|discord\.com|signal\.me|instagram\.com|www\.instagram\.com|facebook\.com|www\.facebook\.com|fb\.com)\//i.test(
      candidate
    )
  ) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'https:' || protocol === 'http:') {
      return parsed.toString();
    }
    if (
      allowContactSchemes &&
      (protocol === 'mailto:' ||
        protocol === 'tel:' ||
        protocol === 'viber:' ||
        protocol === 'tg:')
    ) {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function sanitizeSafeImageSrc(rawSrc: string | undefined): string {
  const trimmed = (rawSrc || '').trim();
  if (!trimmed) return '';
  if (SAFE_IMAGE_DATA_URL_REGEX.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'https:' || protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function normalizeWhatsAppDigits(rawPhone: string): string {
  const digitsOnly = (rawPhone || '').replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  if (digitsOnly.length === 11 && digitsOnly.startsWith('01')) {
    return `88${digitsOnly}`;
  }
  if (digitsOnly.startsWith('00')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

function appendPrefillParamIfSupported(baseUrl: string, prefillMsg: string): string {
  const cleanMsg = prefillMsg.trim();
  if (!cleanMsg) return baseUrl;
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();

    if (
      host === 'wa.me' ||
      host.endsWith('.whatsapp.com') ||
      host === 'm.me' ||
      host === 't.me' ||
      host === 'telegram.me'
    ) {
      if (!parsed.searchParams.has('text')) {
        parsed.searchParams.set('text', cleanMsg);
      }
      return parsed.toString();
    }

    if (protocol === 'mailto:') {
      if (!parsed.searchParams.has('subject')) {
        parsed.searchParams.set('subject', 'Product Inquiry — Arefin Mart');
      }
      if (!parsed.searchParams.has('body')) {
        parsed.searchParams.set('body', cleanMsg);
      }
      return parsed.toString();
    }
  } catch {
    // ignore URL parse error and return baseUrl
  }
  return baseUrl;
}

export function buildWhatsAppChatUrl(config: ChatWidgetConfig): string {
  const msg = (config.prefillMessage || '').trim();
  const customSafeLink = sanitizeSafeChatUrl(config.whatsappLink, false);
  if (customSafeLink) {
    return appendPrefillParamIfSupported(customSafeLink, msg);
  }
  const digits = normalizeWhatsAppDigits(config.whatsappNumber);
  if (!digits) return '';
  if (!msg) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function buildChannelChatUrl(
  channel: MessagingChannel,
  fallbackPrefill?: string
): string {
  const effectivePrefill = (channel.prefillMessage ?? fallbackPrefill ?? '').trim();
  const explicitUrl = sanitizeSafeChatUrl(channel.url, true);
  if (explicitUrl) {
    return appendPrefillParamIfSupported(explicitUrl, effectivePrefill);
  }

  const handle = (channel.handle || '').trim();
  if (!handle) return '';

  if (
    /^https?:\/\//i.test(handle) ||
    /^mailto:/i.test(handle) ||
    /^tel:/i.test(handle) ||
    /^viber:/i.test(handle) ||
    /^tg:/i.test(handle)
  ) {
    const safeHandleUrl = sanitizeSafeChatUrl(handle, true);
    return safeHandleUrl ? appendPrefillParamIfSupported(safeHandleUrl, effectivePrefill) : '';
  }

  const cleanUsername = handle.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
  if (!cleanUsername) return '';

  switch (channel.platform) {
    case 'whatsapp': {
      const digits = normalizeWhatsAppDigits(handle);
      if (!digits) return '';
      return effectivePrefill
        ? `https://wa.me/${digits}?text=${encodeURIComponent(effectivePrefill)}`
        : `https://wa.me/${digits}`;
    }
    case 'messenger': {
      const base = `https://m.me/${encodeURIComponent(cleanUsername)}`;
      const safe = sanitizeSafeChatUrl(base, false);
      return safe ? appendPrefillParamIfSupported(safe, effectivePrefill) : '';
    }
    case 'telegram': {
      const base = `https://t.me/${encodeURIComponent(cleanUsername)}`;
      const safe = sanitizeSafeChatUrl(base, false);
      return safe ? appendPrefillParamIfSupported(safe, effectivePrefill) : '';
    }
    case 'imo':
      return sanitizeSafeChatUrl(`https://imo.im/${encodeURIComponent(cleanUsername)}`, false);
    case 'viber': {
      const digits = normalizeWhatsAppDigits(handle);
      return digits ? sanitizeSafeChatUrl(`viber://chat?number=${digits}`, true) : '';
    }
    case 'wechat':
      return sanitizeSafeChatUrl(`https://u.wechat.com/${encodeURIComponent(cleanUsername)}`, false);
    case 'line': {
      const safeId = handle.startsWith('@') ? handle : `@${cleanUsername}`;
      if (effectivePrefill) {
        return sanitizeSafeChatUrl(
          `https://line.me/R/oaMessage/${encodeURIComponent(safeId)}/?${encodeURIComponent(effectivePrefill)}`,
          false
        );
      }
      return sanitizeSafeChatUrl(`https://line.me/R/ti/p/${encodeURIComponent(safeId)}`, false);
    }
    case 'discord':
      return sanitizeSafeChatUrl(`https://discord.gg/${encodeURIComponent(cleanUsername)}`, false);
    case 'signal': {
      const telClean = handle.replace(/[^\d+]/g, '');
      const normalized = telClean.startsWith('+')
        ? telClean
        : `+${normalizeWhatsAppDigits(handle)}`;
      return normalized && normalized.length > 4
        ? sanitizeSafeChatUrl(`https://signal.me/#p/${normalized}`, false)
        : '';
    }
    case 'instagram':
      return sanitizeSafeChatUrl(`https://instagram.com/${encodeURIComponent(cleanUsername)}`, false);
    case 'facebook':
      return sanitizeSafeChatUrl(`https://facebook.com/${encodeURIComponent(cleanUsername)}`, false);
    case 'phone': {
      const telClean = handle.replace(/[^\d+]/g, '');
      return telClean ? sanitizeSafeChatUrl(`tel:${telClean}`, true) : '';
    }
    case 'email': {
      if (!handle.includes('@')) return '';
      const baseMailto = `mailto:${handle.trim()}`;
      const safe = sanitizeSafeChatUrl(baseMailto, true);
      return safe ? appendPrefillParamIfSupported(safe, effectivePrefill) : '';
    }
    case 'custom':
    default:
      return sanitizeSafeChatUrl(
        handle.includes('.') && !handle.startsWith('http') ? `https://${handle}` : handle,
        true
      );
  }
}

export function sanitizeChannelForStorage(
  channel: MessagingChannel,
  index: number
): MessagingChannel | null {
  if (!channel || typeof channel !== 'object') return null;
  const platform: MessagingPlatform = MESSAGING_PLATFORM_META[channel.platform]
    ? channel.platform
    : 'custom';
  const preset = MESSAGING_PLATFORM_META[platform];
  const rawId = (channel.id || `${platform}-${index + 1}`)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 64);
  const label = (channel.label || preset.defaultLabel).trim().slice(0, 60) || preset.defaultLabel;
  const handle = (channel.handle || '').trim().slice(0, 180);
  const sanitizedUrl = sanitizeSafeChatUrl(channel.url, true).slice(0, 400);
  const prefillMessage =
    typeof channel.prefillMessage === 'string'
      ? channel.prefillMessage.trim().slice(0, 300)
      : '';
  const iconStyle: ChannelIconStyle = VALID_CHANNEL_ICON_STYLES.includes(
    channel.iconStyle as ChannelIconStyle
  )
    ? (channel.iconStyle as ChannelIconStyle)
    : 'platform';
  const customIconUrl = sanitizeSafeImageSrc(channel.customIconUrl).slice(0, 80000);
  const color = normalizeChatColor(channel.color, preset.color);

  return {
    id: rawId || `ch-${index + 1}`,
    platform,
    label,
    handle,
    url: sanitizedUrl,
    prefillMessage,
    iconStyle,
    customIconUrl,
    color,
    enabled: Boolean(channel.enabled),
  };
}

export function sanitizeChatWidgetConfig(raw: Partial<ChatWidgetConfig> | null | undefined): ChatWidgetConfig {
  const base = DEFAULT_CHAT_WIDGET_CONFIG;
  if (!raw || typeof raw !== 'object') return { ...base, channels: [] };

  const iconStyle: FloatingChatIconStyle = VALID_ICON_STYLES.includes(
    raw.iconStyle as FloatingChatIconStyle
  )
    ? (raw.iconStyle as FloatingChatIconStyle)
    : base.iconStyle;

  const channels = Array.isArray(raw.channels)
    ? raw.channels
        .slice(0, 10)
        .map((ch, idx) => sanitizeChannelForStorage(ch, idx))
        .filter((ch): ch is MessagingChannel => ch !== null)
    : [];

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled,
    whatsappNumber: String(raw.whatsappNumber ?? base.whatsappNumber).trim().slice(0, 30),
    whatsappLink: sanitizeSafeChatUrl(raw.whatsappLink, false).slice(0, 400),
    whatsappLabel:
      String(raw.whatsappLabel ?? base.whatsappLabel ?? 'WhatsApp').trim().slice(0, 60) ||
      'WhatsApp',
    prefillMessage: String(raw.prefillMessage ?? base.prefillMessage).trim().slice(0, 300),
    buttonLabel: String(raw.buttonLabel ?? base.buttonLabel ?? 'Chat with us').trim().slice(0, 60),
    iconStyle,
    customIconUrl: sanitizeSafeImageSrc(raw.customIconUrl).slice(0, 260000),
    buttonColor: normalizeChatColor(raw.buttonColor, base.buttonColor),
    buttonSize: normalizeChatButtonSize(raw.buttonSize, base.buttonSize ?? DEFAULT_CHAT_BUTTON_SIZE),
    channels,
  };
}
