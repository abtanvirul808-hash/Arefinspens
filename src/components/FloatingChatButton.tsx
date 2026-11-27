import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Headset,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Shield,
  Video,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ChannelIconStyle, FloatingChatIconStyle, MessagingPlatform } from '../types';
import {
  buildChannelChatUrl,
  buildWhatsAppChatUrl,
  isLightHexColor,
  isLiquidGlassColor,
  MESSAGING_PLATFORM_META,
  normalizeChatButtonSize,
  normalizeChatColor,
  normalizeHexColor,
  sanitizeSafeImageSrc,
} from '../utils/chatWidget';

export const WhatsAppLogoSvg: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = 'w-7 h-7', style }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 3C8.82 3 3 8.71 3 15.76c0 2.52.75 4.97 2.16 7.05L3.35 28.9a.75.75 0 0 0 .93.94l6.26-1.76A13.1 13.1 0 0 0 16 29c7.18 0 13-5.71 13-12.76S23.18 3 16 3Zm0 23.6c-1.88 0-3.73-.49-5.35-1.43a.75.75 0 0 0-.58-.07l-3.78 1.06 1.09-3.66a.75.75 0 0 0-.1-.62A10.37 10.37 0 0 1 5.45 15.76C5.45 10.05 10.18 5.4 16 5.4c5.82 0 10.55 4.65 10.55 10.36 0 5.71-4.73 10.84-10.55 10.84Z"
    />
    <path
      fill="currentColor"
      d="M21.85 18.88c-.32-.16-1.88-.92-2.17-1.02-.29-.11-.5-.16-.72.16-.21.31-.82 1.02-1.01 1.23-.18.21-.37.24-.69.08-.32-.16-1.35-.49-2.57-1.56-.95-.84-1.59-1.87-1.78-2.18-.18-.32-.02-.48.14-.64.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.72-1.7-.98-2.33-.26-.61-.52-.53-.72-.54h-.61c-.21 0-.55.08-.85.39-.29.32-1.11 1.07-1.11 2.61 0 1.54 1.14 3.02 1.3 3.23.16.21 2.24 3.36 5.43 4.71.76.32 1.35.52 1.81.66.76.24 1.45.2 2-.12.61-.35 1.88-.76 2.15-1.49.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z"
    />
  </svg>
);

export const WhatsAppBubbleSvg: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = 'w-7 h-7', style }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M16 3.5C8.96 3.5 3.25 9.04 3.25 15.88c0 2.58.81 5.05 2.28 7.1l-1.54 5.26a.75.75 0 0 0 .93.93l5.39-1.53A12.92 12.92 0 0 0 16 28.75c7.04 0 12.75-5.54 12.75-12.37S23.04 3.5 16 3.5Zm5.98 16.58c-.28.78-1.64 1.49-2.29 1.58-.59.09-1.33.12-2.15-.14-.5-.16-1.13-.37-1.95-.72-3.44-1.47-5.68-4.9-5.85-5.13-.17-.22-1.4-1.84-1.4-3.51s.88-2.49 1.2-2.83c.31-.34.68-.43.91-.43h.65c.21 0 .49-.08.76.58.28.68.96 2.34 1.04 2.51.09.17.14.37.03.6-.11.22-.17.37-.34.56-.17.2-.36.44-.51.59-.17.17-.35.35-.15.69.2.34.89 1.46 1.91 2.36 1.31 1.15 2.41 1.51 2.75 1.68.34.17.54.14.74-.08.2-.23.85-.98 1.08-1.32.23-.34.45-.28.77-.17.31.11 1.99.93 2.33 1.1.34.17.57.25.65.4.09.14.09.82-.19 1.6Z"
    />
  </svg>
);

export const MessengerLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.9 1.45 5.49 3.72 7.19V22l3.42-1.88c.91.25 1.87.39 2.86.39 5.52 0 10-4.14 10-9.26S17.52 2 12 2Zm1.02 12.46-2.55-2.72-4.97 2.72 5.47-5.8 2.61 2.72 4.91-2.72-5.47 5.8Z" />
  </svg>
);

export const FacebookLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M13.5 22v-8.3h2.8l.42-3.25H13.5V8.38c0-.94.26-1.58 1.61-1.58h1.72V3.89c-.3-.04-1.32-.13-2.5-.13-2.48 0-4.17 1.51-4.17 4.29v2.4H7.35v3.25h2.81V22h3.34Z" />
  </svg>
);

export const WeChatLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M9.6 4C5.4 4 2 6.9 2 10.5c0 2 1.1 3.8 2.8 5L4 18l2.8-1.4c.9.2 1.8.4 2.8.4h.5c-.2-.6-.3-1.2-.3-1.8 0-3.2 3-5.8 6.8-5.8h.5C16.4 6.2 13.3 4 9.6 4Zm-2.5 5.2a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4.5 1.7c-3.1 0-5.6 2.1-5.6 4.7s2.5 4.7 5.6 4.7c.7 0 1.4-.1 2.1-.3L21 21l-.6-2c1-.8 1.8-2 1.8-3.4 0-2.6-2.5-4.7-5.6-4.7Zm-1.9 3.7a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Zm3.8 0a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Z" />
  </svg>
);

export const DiscordLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.27 5.33A16.7 16.7 0 0 0 15.1 4l-.53 1.07a15.3 15.3 0 0 0-5.14 0L8.9 4a16.7 16.7 0 0 0-4.17 1.33C2.1 9.28 1.38 13.13 1.74 16.92a16.9 16.9 0 0 0 5.1 2.6l1.1-1.78a10.9 10.9 0 0 1-1.73-.84l.42-.33a12 12 0 0 0 10.74 0l.42.33c-.55.34-1.13.62-1.73.84l1.1 1.78a16.9 16.9 0 0 0 5.1-2.6c.43-4.4-.74-8.21-2.99-11.59ZM8.68 14.6c-.99 0-1.8-.91-1.8-2.03 0-1.11.79-2.02 1.8-2.02 1.01 0 1.82.91 1.8 2.02 0 1.12-.79 2.03-1.8 2.03Zm6.64 0c-.99 0-1.8-.91-1.8-2.03 0-1.11.79-2.02 1.8-2.02 1.01 0 1.82.91 1.8 2.02 0 1.12-.79 2.03-1.8 2.03Z" />
  </svg>
);

export const LineLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 3C6.48 3 2 6.65 2 11.15c0 4.02 3.56 7.38 8.38 8.02.33.07.77.22.88.5.1.25.07.65.03.91l-.14.86c-.04.25-.2.99.87.54 1.07-.45 5.79-3.41 7.9-5.84 1.45-1.6 2.08-3.22 2.08-4.99C22 6.65 17.52 3 12 3Z" />
  </svg>
);

export const ChatWidgetIcon: React.FC<{
  iconStyle: FloatingChatIconStyle;
  customIconUrl?: string;
  sizeClass?: string;
  sizeStyle?: React.CSSProperties;
}> = ({ iconStyle, customIconUrl, sizeClass = 'w-7 h-7', sizeStyle }) => {
  const safeCustomImg = sanitizeSafeImageSrc(customIconUrl);

  if (iconStyle === 'custom-image' && safeCustomImg) {
    return (
      <img
        src={safeCustomImg}
        alt="Chat icon"
        className="w-full h-full rounded-full object-cover"
        draggable={false}
      />
    );
  }

  switch (iconStyle) {
    case 'whatsapp-bubble':
      return <WhatsAppBubbleSvg className={sizeClass} style={sizeStyle} />;
    case 'chat-spark':
      return <MessageCircle className={sizeClass} style={sizeStyle} />;
    case 'headset':
      return <Headset className={sizeClass} style={sizeStyle} />;
    case 'send':
      return <Send className={sizeClass} style={sizeStyle} />;
    case 'whatsapp-classic':
    default:
      return <WhatsAppLogoSvg className={sizeClass} style={sizeStyle} />;
  }
};

export const PlatformGlyph: React.FC<{
  platform: MessagingPlatform;
  className?: string;
}> = ({ platform, className = 'w-4 h-4' }) => {
  switch (platform) {
    case 'whatsapp':
      return <WhatsAppBubbleSvg className={className} />;
    case 'messenger':
      return <MessengerLogoSvg className={className} />;
    case 'telegram':
      return <Send className={className} />;
    case 'imo':
      return <Video className={className} />;
    case 'viber':
      return <Phone className={className} />;
    case 'wechat':
      return <WeChatLogoSvg className={className} />;
    case 'line':
      return <LineLogoSvg className={className} />;
    case 'discord':
      return <DiscordLogoSvg className={className} />;
    case 'signal':
      return <Shield className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <FacebookLogoSvg className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'custom':
    default:
      return <Link2 className={className} />;
  }
};

export const ChannelBadgeIcon: React.FC<{
  platform: MessagingPlatform;
  iconStyle?: ChannelIconStyle;
  customIconUrl?: string;
  sizeClass?: string;
}> = ({ platform, iconStyle = 'platform', customIconUrl, sizeClass = 'w-5 h-5' }) => {
  const safeCustom = sanitizeSafeImageSrc(customIconUrl);
  if (iconStyle === 'custom-image' && safeCustom) {
    return (
      <img
        src={safeCustom}
        alt=""
        className="w-full h-full rounded-full object-cover"
        draggable={false}
      />
    );
  }
  switch (iconStyle) {
    case 'whatsapp-classic':
      return <WhatsAppLogoSvg className={sizeClass} />;
    case 'whatsapp-bubble':
      return <WhatsAppBubbleSvg className={sizeClass} />;
    case 'chat-spark':
      return <MessageCircle className={sizeClass} />;
    case 'headset':
      return <Headset className={sizeClass} />;
    case 'send':
      return <Send className={sizeClass} />;
    case 'phone':
      return <Phone className={sizeClass} />;
    case 'platform':
    default:
      return <PlatformGlyph platform={platform} className={sizeClass} />;
  }
};

interface ResolvedChatOption {
  id: string;
  platform: MessagingPlatform;
  label: string;
  subtitle: string;
  href: string;
  color: string;
  iconStyle: ChannelIconStyle;
  customIconUrl?: string;
}

export const FloatingChatButton: React.FC = () => {
  const { chatWidgetConfig, route } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const primaryWhatsappUrl = useMemo(
    () => buildWhatsAppChatUrl(chatWidgetConfig),
    [chatWidgetConfig]
  );

  const activeChannels = useMemo<ResolvedChatOption[]>(() => {
    const items: ResolvedChatOption[] = [];

    if (primaryWhatsappUrl) {
      items.push({
        id: 'primary-whatsapp',
        platform: 'whatsapp',
        label: chatWidgetConfig.whatsappLabel?.trim() || 'WhatsApp',
        subtitle:
          chatWidgetConfig.whatsappNumber.trim() || 'Instant chat on WhatsApp',
        href: primaryWhatsappUrl,
        color: normalizeChatColor(chatWidgetConfig.buttonColor, '#25D366'),
        iconStyle:
          chatWidgetConfig.iconStyle === 'custom-image'
            ? 'custom-image'
            : chatWidgetConfig.iconStyle,
        customIconUrl: chatWidgetConfig.customIconUrl,
      });
    }

    for (const ch of chatWidgetConfig.channels || []) {
      if (!ch.enabled) continue;
      const href = buildChannelChatUrl(ch, chatWidgetConfig.prefillMessage);
      if (!href) continue;
      const preset = MESSAGING_PLATFORM_META[ch.platform];
      const msgPreview = ch.prefillMessage?.trim();
      items.push({
        id: ch.id,
        platform: ch.platform,
        label: ch.label || preset.defaultLabel,
        subtitle:
          ch.handle.trim() ||
          (msgPreview ? `"${msgPreview}"` : `Open ${ch.label || preset.defaultLabel}`),
        href,
        color: normalizeChatColor(ch.color, preset.color),
        iconStyle: ch.iconStyle || 'platform',
        customIconUrl: ch.customIconUrl,
      });
    }

    return items;
  }, [chatWidgetConfig, primaryWhatsappUrl]);

  useEffect(() => {
    setMenuOpen(false);
  }, [route, chatWidgetConfig.enabled]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  if (!chatWidgetConfig.enabled || activeChannels.length === 0) {
    return null;
  }

  const isGlassButton = isLiquidGlassColor(chatWidgetConfig.buttonColor);
  const buttonColor = normalizeHexColor(chatWidgetConfig.buttonColor, '#25D366');
  const buttonSize = normalizeChatButtonSize(chatWidgetConfig.buttonSize, 56);
  const iconPx = Math.max(18, Math.round(buttonSize * 0.5));
  const closeIconPx = Math.max(18, Math.round(buttonSize * 0.43));
  const useDarkGlyph = !isGlassButton && isLightHexColor(buttonColor);
  const safeCustomImg =
    chatWidgetConfig.iconStyle === 'custom-image' &&
    Boolean(sanitizeSafeImageSrc(chatWidgetConfig.customIconUrl));

  const positionClass =
    route === 'product'
      ? 'bottom-20 right-4 lg:bottom-6 lg:right-6'
      : 'bottom-5 right-4 sm:bottom-6 sm:right-6';

  const labelText = chatWidgetConfig.buttonLabel?.trim() || 'Chat with us';

  const circleClasses =
    'group relative rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white cursor-pointer';

  const circleStyle: React.CSSProperties =
    safeCustomImg
      ? {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: '#ffffff',
          boxShadow: '0 12px 28px -6px rgba(0,0,0,0.35)',
        }
      : isGlassButton
      ? {
          width: buttonSize,
          height: buttonSize,
        }
      : {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: buttonColor,
          color: useDarkGlyph ? '#111827' : '#ffffff',
          boxShadow: `0 12px 28px -6px ${buttonColor}99, 0 4px 12px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.32)`,
        };

  return (
    <div
      ref={containerRef}
      className={`fixed ${positionClass} z-40 flex flex-col items-end`}
    >
      {/* Expanded Messaging Apps Speed-Dial Stack (Always expands when circle icon is selected) */}
      {menuOpen && (
        <div
          role="dialog"
          aria-label={labelText}
          className="mb-3 flex flex-col items-end gap-2.5 max-h-[62vh] overflow-y-auto overflow-x-visible pr-0.5 py-1"
        >
          <div className="chat-expand-item liquid-glass-menu px-3.5 py-2 flex items-center gap-2.5 shadow-lg">
            <span className="text-xs font-bold text-[var(--text-main)] whitespace-nowrap">
              {labelText}
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close chat options"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeChannels.map((item, idx) => {
            const isGlassChannel = isLiquidGlassColor(item.color);
            const darkText = !isGlassChannel && isLightHexColor(item.color);
            const hasCustomChannelImg =
              item.iconStyle === 'custom-image' &&
              Boolean(sanitizeSafeImageSrc(item.customIconUrl));
            const reverseIdx = activeChannels.length - 1 - idx;

            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                style={{ animationDelay: `${reverseIdx * 35}ms` }}
                className="chat-expand-item group flex items-center justify-end gap-2.5 max-w-[calc(100vw-2rem)] focus:outline-none"
              >
                <span className="liquid-glass-menu px-3.5 py-2 rounded-2xl flex items-center gap-2.5 max-w-[230px] sm:max-w-[260px] shadow-md group-hover:border-accent transition-all">
                  <span className="min-w-0 text-right">
                    <span className="block text-sm font-bold text-[var(--text-main)] truncate leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-accent shrink-0 transition-colors" />
                </span>

                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform duration-150 group-hover:scale-110 ${
                    hasCustomChannelImg
                      ? 'overflow-hidden p-0 ring-2 ring-white/80'
                      : isGlassChannel
                      ? 'liquid-glass-circle'
                      : ''
                  }`}
                  style={
                    hasCustomChannelImg
                      ? { backgroundColor: '#ffffff' }
                      : isGlassChannel
                      ? undefined
                      : {
                          backgroundColor: item.color,
                          color: darkText ? '#111827' : '#ffffff',
                          boxShadow: `0 8px 20px -6px ${item.color}aa`,
                        }
                  }
                >
                  <ChannelBadgeIcon
                    platform={item.platform}
                    iconStyle={item.iconStyle}
                    customIconUrl={item.customIconUrl}
                    sizeClass="w-5 h-5"
                  />
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Circle Floating Contact Button */}
      <div className="group relative flex items-center">
        {!menuOpen && (
          <span
            className="hidden sm:inline-flex items-center px-3 py-1.5 mr-2.5 rounded-full text-xs font-semibold bg-[var(--bg-card)]/95 text-[var(--text-main)] border border-[var(--border-subtle)] shadow-lg backdrop-blur-md opacity-0 translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap"
            aria-hidden="true"
          >
            {labelText}
          </span>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close contact channels' : labelText}
          title={labelText}
          style={circleStyle}
          className={`${circleClasses} ${
            safeCustomImg && !menuOpen
              ? 'p-0 overflow-hidden ring-2 ring-white/80'
              : isGlassButton
              ? 'liquid-glass-circle'
              : ''
          }`}
        >
          {menuOpen ? (
            <X style={{ width: closeIconPx, height: closeIconPx }} />
          ) : (
            <ChatWidgetIcon
              iconStyle={chatWidgetConfig.iconStyle}
              customIconUrl={chatWidgetConfig.customIconUrl}
              sizeClass=""
              sizeStyle={{ width: iconPx, height: iconPx }}
            />
          )}
        </button>
      </div>
    </div>
  );
};
