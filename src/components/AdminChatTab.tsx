import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImagePlus,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  ChannelIconStyle,
  ChatWidgetConfig,
  FloatingChatIconStyle,
  MessagingChannel,
  MessagingPlatform,
} from '../types';
import {
  buildChannelChatUrl,
  buildWhatsAppChatUrl,
  CHAT_COLOR_PRESETS,
  CHAT_SIZE_PRESETS,
  DEFAULT_CHAT_BUTTON_SIZE,
  DEFAULT_CHAT_WIDGET_CONFIG,
  isLightHexColor,
  isLiquidGlassColor,
  MAX_CHAT_BUTTON_SIZE,
  MESSAGING_PLATFORM_META,
  MIN_CHAT_BUTTON_SIZE,
  normalizeChatButtonSize,
  normalizeHexColor,
  sanitizeChatWidgetConfig,
  sanitizeSafeImageSrc,
} from '../utils/chatWidget';
import {
  ChannelBadgeIcon,
  ChatWidgetIcon,
  PlatformGlyph,
  WhatsAppLogoSvg,
} from './FloatingChatButton';

const ICON_STYLE_OPTIONS: { id: FloatingChatIconStyle; label: string }[] = [
  { id: 'whatsapp-classic', label: 'Classic' },
  { id: 'whatsapp-bubble', label: 'Bubble' },
  { id: 'chat-spark', label: 'Chat' },
  { id: 'headset', label: 'Support' },
  { id: 'send', label: 'Plane' },
  { id: 'custom-image', label: 'Custom' },
];

const CHANNEL_ICON_STYLE_OPTIONS: { id: ChannelIconStyle; label: string }[] = [
  { id: 'platform', label: 'App Logo' },
  { id: 'whatsapp-classic', label: 'WA Classic' },
  { id: 'whatsapp-bubble', label: 'Bubble' },
  { id: 'chat-spark', label: 'Chat' },
  { id: 'headset', label: 'Support' },
  { id: 'send', label: 'Plane' },
  { id: 'phone', label: 'Phone' },
  { id: 'custom-image', label: 'Custom' },
];

const QUICK_ADD_PLATFORMS: { platform: MessagingPlatform; label: string }[] = [
  { platform: 'whatsapp', label: 'WhatsApp' },
  { platform: 'messenger', label: 'Messenger' },
  { platform: 'telegram', label: 'Telegram' },
  { platform: 'imo', label: 'imo' },
  { platform: 'viber', label: 'Viber' },
  { platform: 'wechat', label: 'WeChat' },
  { platform: 'line', label: 'LINE' },
  { platform: 'discord', label: 'Discord' },
  { platform: 'signal', label: 'Signal' },
  { platform: 'instagram', label: 'Instagram' },
  { platform: 'facebook', label: 'Facebook' },
  { platform: 'phone', label: 'Phone Call' },
  { platform: 'email', label: 'Email' },
  { platform: 'custom', label: 'Custom Link' },
];

function compressIconToDataUrl(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read icon file'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          } else {
            width = Math.max(1, Math.round((width * maxDim) / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const AdminChatTab: React.FC = () => {
  const { chatWidgetConfig, updateChatWidgetConfig, showToast } = useStore();

  const [draft, setDraft] = useState<ChatWidgetConfig>(() =>
    sanitizeChatWidgetConfig(chatWidgetConfig)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    setDraft(sanitizeChatWidgetConfig(chatWidgetConfig));
  }, [chatWidgetConfig]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(sanitizeChatWidgetConfig(draft)) !==
      JSON.stringify(sanitizeChatWidgetConfig(chatWidgetConfig)),
    [draft, chatWidgetConfig]
  );

  const previewWhatsappUrl = useMemo(() => buildWhatsAppChatUrl(draft), [draft]);
  const enabledExtraChannels = useMemo(
    () =>
      draft.channels.filter(
        (ch) => ch.enabled && Boolean(buildChannelChatUrl(ch, draft.prefillMessage))
      ),
    [draft.channels, draft.prefillMessage]
  );
  const enabledExtraCount = enabledExtraChannels.length;

  const isMainLiquidGlass = isLiquidGlassColor(draft.buttonColor);
  const previewColor = normalizeHexColor(draft.buttonColor, '#25D366');
  const previewSize = normalizeChatButtonSize(draft.buttonSize, DEFAULT_CHAT_BUTTON_SIZE);
  const previewIconPx = Math.max(18, Math.round(previewSize * 0.5));
  const previewDarkGlyph = isLightHexColor(previewColor);
  const hasCustomPreviewImage =
    draft.iconStyle === 'custom-image' && Boolean(sanitizeSafeImageSrc(draft.customIconUrl));

  const handleAddChannel = (platform: MessagingPlatform) => {
    if (draft.channels.length >= 10) {
      showToast('Maximum 10 extra messaging channels allowed');
      return;
    }
    const meta = MESSAGING_PLATFORM_META[platform];
    const nextChannel: MessagingChannel = {
      id: `${platform}-${Date.now().toString(36)}`,
      platform,
      label: meta.defaultLabel,
      handle: '',
      url: '',
      prefillMessage: draft.prefillMessage || '',
      iconStyle: 'platform',
      customIconUrl: '',
      color: meta.color,
      enabled: true,
    };
    setDraft((prev) => ({
      ...prev,
      channels: [...prev.channels, nextChannel],
    }));
  };

  const handleUpdateChannel = (id: string, patch: Partial<MessagingChannel>) => {
    setDraft((prev) => ({
      ...prev,
      channels: prev.channels.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    }));
  };

  const handleMoveChannel = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= draft.channels.length) return;
    setDraft((prev) => {
      const next = [...prev.channels];
      const [item] = next.splice(index, 1);
      next.splice(targetIdx, 0, item);
      return { ...prev, channels: next };
    });
  };

  const handleDeleteChannel = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      channels: prev.channels.filter((ch) => ch.id !== id),
    }));
  };

  const handleIconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressIconToDataUrl(file, 256);
      if (dataUrl.length > 250000) {
        setError('Compressed image is still too large. Please pick a smaller PNG/JPG icon.');
        return;
      }
      setError('');
      setDraft((prev) => ({
        ...prev,
        iconStyle: 'custom-image',
        customIconUrl: dataUrl,
      }));
    } catch {
      setError('Could not load that image file. Please try PNG, JPG, or WebP.');
    }
  };

  const handleChannelIconFileUpload = async (
    channelId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressIconToDataUrl(file, 128);
      if (dataUrl.length > 75000) {
        setError('Channel icon image is too large. Please pick a smaller icon under 75KB.');
        return;
      }
      setError('');
      handleUpdateChannel(channelId, {
        iconStyle: 'custom-image',
        customIconUrl: dataUrl,
      });
    } catch {
      setError('Could not load that channel icon. Please try PNG, JPG, or WebP.');
    }
  };

  const handleSave = async () => {
    setError('');
    if (draft.enabled && !previewWhatsappUrl && enabledExtraCount === 0) {
      setError('Enter a WhatsApp number / chat link or add at least one enabled messaging channel.');
      return;
    }
    setSaving(true);
    const res = await updateChatWidgetConfig(draft);
    setSaving(false);
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  const handleReset = () => {
    setError('');
    setDraft(sanitizeChatWidgetConfig(DEFAULT_CHAT_WIDGET_CONFIG));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/45 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* 1. Live Preview + Visibility Toggle */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => setPreviewExpanded((prev) => !prev)}
                title="Click circle to test expanding messaging apps"
                className={`rounded-full flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-105 cursor-pointer relative ${
                  hasCustomPreviewImage
                    ? 'overflow-hidden p-0 ring-2 ring-white/80'
                    : isMainLiquidGlass
                    ? 'liquid-glass-circle'
                    : ''
                }`}
                style={
                  hasCustomPreviewImage
                    ? {
                        width: previewSize,
                        height: previewSize,
                        backgroundColor: '#ffffff',
                        color: previewDarkGlyph ? '#111827' : '#ffffff',
                        boxShadow: '0 10px 24px -6px rgba(0,0,0,0.28)',
                      }
                    : isMainLiquidGlass
                    ? {
                        width: previewSize,
                        height: previewSize,
                      }
                    : {
                        width: previewSize,
                        height: previewSize,
                        backgroundColor: previewColor,
                        color: previewDarkGlyph ? '#111827' : '#ffffff',
                        boxShadow: `0 10px 24px -6px ${previewColor}99`,
                      }
                }
              >
                {previewExpanded ? (
                  <X className="w-5 h-5" />
                ) : (
                  <ChatWidgetIcon
                    iconStyle={draft.iconStyle}
                    customIconUrl={draft.customIconUrl}
                    sizeClass=""
                    sizeStyle={{ width: previewIconPx, height: previewIconPx }}
                  />
                )}
              </button>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-[var(--text-main)]">
                  Bottom-Right Circle Chat Preview ({previewSize}px)
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {!draft.enabled
                    ? 'Hidden on storefront right now'
                    : enabledExtraCount === 0
                    ? 'Click the circle to expand and show WhatsApp with its name'
                    : `Click the circle to expand WhatsApp + ${enabledExtraCount} messaging app${
                        enabledExtraCount > 1 ? 's' : ''
                      } with names`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewExpanded((prev) => !prev)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent text-xs font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
              >
                {previewExpanded ? 'Collapse Preview' : 'Test Expand'}
              </button>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`min-h-[40px] px-4 py-2 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                  draft.enabled
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    draft.enabled ? 'bg-emerald-500' : 'bg-zinc-400'
                  }`}
                />
                <span>Floating Button: {draft.enabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {previewExpanded && (
            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col items-end gap-2">
              {previewWhatsappUrl && (
                <div className="chat-expand-item flex items-center gap-2.5">
                  <span className="liquid-glass-menu px-3 py-1.5 rounded-xl text-right">
                    <span className="block text-xs font-bold text-[var(--text-main)]">
                      {draft.whatsappLabel?.trim() || 'WhatsApp'}
                    </span>
                    <span className="block text-[10px] text-[var(--text-muted)]">
                      {draft.whatsappNumber.trim() || 'Instant chat on WhatsApp'}
                    </span>
                  </span>
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      hasCustomPreviewImage
                        ? 'overflow-hidden p-0 ring-1 ring-white/70'
                        : isMainLiquidGlass
                        ? 'liquid-glass-circle'
                        : ''
                    }`}
                    style={
                      hasCustomPreviewImage
                        ? { backgroundColor: '#ffffff' }
                        : isMainLiquidGlass
                        ? undefined
                        : {
                            backgroundColor: previewColor,
                            color: previewDarkGlyph ? '#111827' : '#ffffff',
                          }
                    }
                  >
                    <ChatWidgetIcon
                      iconStyle={draft.iconStyle}
                      customIconUrl={draft.customIconUrl}
                      sizeClass="w-4 h-4"
                    />
                  </span>
                </div>
              )}
              {enabledExtraChannels.map((ch) => {
                const preset = MESSAGING_PLATFORM_META[ch.platform];
                const isChGlass = isLiquidGlassColor(ch.color);
                const chHex = normalizeHexColor(ch.color, preset.color);
                const hasCustomImg =
                  ch.iconStyle === 'custom-image' && Boolean(sanitizeSafeImageSrc(ch.customIconUrl));
                return (
                  <div key={ch.id} className="chat-expand-item flex items-center gap-2.5">
                    <span className="liquid-glass-menu px-3 py-1.5 rounded-xl text-right">
                      <span className="block text-xs font-bold text-[var(--text-main)]">
                        {ch.label || preset.defaultLabel}
                      </span>
                      <span className="block text-[10px] text-[var(--text-muted)]">
                        {ch.handle.trim() || `Open ${ch.label || preset.defaultLabel}`}
                      </span>
                    </span>
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        hasCustomImg
                          ? 'overflow-hidden p-0 ring-1 ring-white/70'
                          : isChGlass
                          ? 'liquid-glass-circle'
                          : ''
                      }`}
                      style={
                        hasCustomImg
                          ? { backgroundColor: '#ffffff' }
                          : isChGlass
                          ? undefined
                          : {
                              backgroundColor: chHex,
                              color: isLightHexColor(chHex) ? '#111827' : '#ffffff',
                            }
                      }
                    >
                      <ChannelBadgeIcon
                        platform={ch.platform}
                        iconStyle={ch.iconStyle || 'platform'}
                        customIconUrl={ch.customIconUrl}
                        sizeClass="w-4 h-4"
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Primary WhatsApp Number & Direct Chat Link */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                <WhatsAppLogoSvg className="w-4 h-4" />
              </span>
              <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                WhatsApp Contact &amp; Direct Link
              </h3>
            </div>
            {previewWhatsappUrl && (
              <a
                href={previewWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
              >
                <span>Test WhatsApp Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={draft.whatsappNumber}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                }
                placeholder="+8801886338818 or 01886338818"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Bangladesh 01XXXXXXXXX auto-converts to +880.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                WhatsApp Label
              </label>
              <input
                type="text"
                value={draft.whatsappLabel || ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, whatsappLabel: e.target.value }))
                }
                maxLength={60}
                placeholder="WhatsApp"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Custom Direct WhatsApp Link (Optional Override)
            </label>
            <input
              type="url"
              value={draft.whatsappLink || ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, whatsappLink: e.target.value }))
              }
              maxLength={400}
              placeholder="https://wa.me/message/YOURCODE (leave empty to auto-build from number)"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Pre-filled Customer Greeting Message
            </label>
            <textarea
              rows={2}
              value={draft.prefillMessage}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, prefillMessage: e.target.value }))
              }
              maxLength={300}
              placeholder="Assalamu Alaikum! I would like to ask about a pen from Arefin Mart."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {previewWhatsappUrl && (
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-secondary)] break-all">
              <span className="font-semibold text-[var(--text-main)]">Direct Chat URL: </span>
              {previewWhatsappUrl}
            </div>
          )}
        </div>

        {/* 3. Customize Circle Icon, Colour, Size & Label */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3.5">
          <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
            Customize Main Circle Icon, Colour &amp; Size
          </h3>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Icon Style
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ICON_STYLE_OPTIONS.map((opt) => {
                const selected = draft.iconStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, iconStyle: opt.id }))
                    }
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                      selected
                        ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_14px_-4px_rgba(var(--accent-rgb),0.5)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                        isMainLiquidGlass &&
                        !(opt.id === 'custom-image' && sanitizeSafeImageSrc(draft.customIconUrl))
                          ? 'liquid-glass-circle'
                          : ''
                      }`}
                      style={
                        opt.id === 'custom-image' && sanitizeSafeImageSrc(draft.customIconUrl)
                          ? { backgroundColor: '#ffffff', color: '#111827' }
                          : isMainLiquidGlass
                          ? undefined
                          : {
                              backgroundColor: previewColor,
                              color: previewDarkGlyph ? '#111827' : '#ffffff',
                            }
                      }
                    >
                      <ChatWidgetIcon
                        iconStyle={opt.id}
                        customIconUrl={draft.customIconUrl}
                        sizeClass="w-4 h-4"
                      />
                    </span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text-main)]">
                Custom Icon Image (Optional)
              </p>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-accent text-xs font-semibold text-[var(--text-main)] inline-flex items-center gap-1.5 transition-colors">
                  <ImagePlus className="w-3.5 h-3.5 text-accent" />
                  <span>Upload Icon</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => void handleIconFileUpload(e)}
                    className="hidden"
                  />
                </label>
                {draft.customIconUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        customIconUrl: '',
                        iconStyle:
                          prev.iconStyle === 'custom-image'
                            ? 'whatsapp-classic'
                            : prev.iconStyle,
                      }))
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-rose-500/35 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <input
              type="url"
              value={
                draft.customIconUrl?.startsWith('data:')
                  ? ''
                  : draft.customIconUrl || ''
              }
              onChange={(e) => {
                const val = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  customIconUrl: val,
                  iconStyle: val.trim() ? 'custom-image' : prev.iconStyle,
                }));
              }}
              placeholder={
                draft.customIconUrl?.startsWith('data:')
                  ? 'Uploaded custom image saved — click Clear to replace with URL'
                  : 'Or paste an HTTPS icon/logo URL (https://...)'
              }
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Circle Colour
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {CHAT_COLOR_PRESETS.map((preset) => {
                  const active =
                    !isMainLiquidGlass &&
                    previewColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.label}
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, buttonColor: preset.hex }))
                      }
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform ${
                        active
                          ? 'scale-110 border-[var(--text-main)] ring-2 ring-accent/40'
                          : 'border-white/50 hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      aria-label={preset.label}
                    >
                      {active && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            isLightHexColor(preset.hex) ? 'text-black' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, buttonColor: 'liquid-glass' }))
                  }
                  className={`h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 border text-xs font-semibold transition-all ${
                    isMainLiquidGlass
                      ? 'border-accent bg-accent/15 text-[var(--text-main)] ring-2 ring-accent/35'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full liquid-glass-circle shrink-0" />
                  <span>Liquid Glass</span>
                </button>
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] cursor-pointer text-xs font-mono-num text-[var(--text-main)]">
                  <input
                    type="color"
                    value={previewColor}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, buttonColor: e.target.value }))
                    }
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer p-0"
                    aria-label="Pick custom circle colour"
                  />
                  <span>{isMainLiquidGlass ? 'LIQUID GLASS' : previewColor.toUpperCase()}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Floating Label / Popup Title
              </label>
              <input
                type="text"
                value={draft.buttonLabel || ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, buttonLabel: e.target.value }))
                }
                maxLength={60}
                placeholder="Chat with us"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-main)] focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Circle Shape Size Customizer */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label
                  htmlFor="chat-circle-size-slider"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                >
                  Circle Shape Size
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Adjust the diameter of the bottom-right floating circle ({MIN_CHAT_BUTTON_SIZE}px – {MAX_CHAT_BUTTON_SIZE}px).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-mono-num font-bold text-[var(--text-main)] tabular-nums">
                  {previewSize}px
                </span>
                {previewSize !== DEFAULT_CHAT_BUTTON_SIZE && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, buttonSize: DEFAULT_CHAT_BUTTON_SIZE }))
                    }
                    className="px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-accent text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                  >
                    Default
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {CHAT_SIZE_PRESETS.map((preset) => {
                const active = previewSize === preset.size;
                return (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, buttonSize: preset.size }))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'border-accent bg-accent/15 text-[var(--text-main)] shadow-[0_0_12px_-4px_rgba(var(--accent-rgb),0.45)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/60'
                    }`}
                  >
                    {preset.label} ({preset.size}px)
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-[11px] font-mono-num text-[var(--text-muted)] tabular-nums">
                {MIN_CHAT_BUTTON_SIZE}px
              </span>
              <input
                id="chat-circle-size-slider"
                type="range"
                min={MIN_CHAT_BUTTON_SIZE}
                max={MAX_CHAT_BUTTON_SIZE}
                step={2}
                value={previewSize}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    buttonSize: normalizeChatButtonSize(e.target.value),
                  }))
                }
                className="flex-1 h-2 accent-[var(--accent)] cursor-pointer"
                aria-label="Circle shape size in pixels"
              />
              <span className="text-[11px] font-mono-num text-[var(--text-muted)] tabular-nums">
                {MAX_CHAT_BUTTON_SIZE}px
              </span>
            </div>
          </div>
        </div>

        {/* 4. Additional Messaging Apps (Each customizable like WhatsApp: Icon, Colour & Pre-filled Message) */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-accent" />
                <span>More Messaging Apps (Icon, Colour &amp; Pre-filled Message)</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Add Messenger, Telegram, imo, Viber, WeChat, LINE, Discord, Signal, Instagram, or extra WhatsApp numbers with their own icon, colour, and greeting message.
              </p>
            </div>
            <span className="text-[11px] font-mono-num text-[var(--text-muted)]">
              {draft.channels.length} / 10 added
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD_PLATFORMS.map((item) => {
              const meta = MESSAGING_PLATFORM_META[item.platform];
              return (
                <button
                  key={item.platform}
                  type="button"
                  onClick={() => handleAddChannel(item.platform)}
                  disabled={draft.channels.length >= 10}
                  className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-accent text-xs font-semibold text-[var(--text-main)] inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-3 h-3 text-accent" />
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    <PlatformGlyph platform={item.platform} className="w-2.5 h-2.5" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {draft.channels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-5 text-center text-xs text-[var(--text-muted)]">
              No extra messaging apps added yet. Clicking the circle icon will open your WhatsApp chat directly.
            </div>
          ) : (
            <div className="space-y-3">
              {draft.channels.map((ch, idx) => {
                const meta = MESSAGING_PLATFORM_META[ch.platform];
                const resolvedHref = buildChannelChatUrl(ch, draft.prefillMessage);
                const isChLiquidGlass = isLiquidGlassColor(ch.color);
                const chColor = normalizeHexColor(ch.color, meta.color);
                const chIconStyle: ChannelIconStyle = ch.iconStyle || 'platform';
                const hasCustomChannelImg =
                  chIconStyle === 'custom-image' &&
                  Boolean(sanitizeSafeImageSrc(ch.customIconUrl));

                return (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            hasCustomChannelImg
                              ? 'overflow-hidden p-0 ring-1 ring-white/70'
                              : isChLiquidGlass
                              ? 'liquid-glass-circle'
                              : ''
                          }`}
                          style={
                            hasCustomChannelImg
                              ? { backgroundColor: '#ffffff', color: '#111827' }
                              : isChLiquidGlass
                              ? undefined
                              : {
                                  backgroundColor: chColor,
                                  color: isLightHexColor(chColor) ? '#111827' : '#ffffff',
                                }
                          }
                        >
                          <ChannelBadgeIcon
                            platform={ch.platform}
                            iconStyle={chIconStyle}
                            customIconUrl={ch.customIconUrl}
                            sizeClass="w-4 h-4"
                          />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                          {ch.label || meta.defaultLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateChannel(ch.id, { enabled: !ch.enabled })
                          }
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                            ch.enabled
                              ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                          }`}
                        >
                          {ch.enabled ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveChannel(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveChannel(idx, 1)}
                          disabled={idx === draft.channels.length - 1}
                          className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch.id)}
                          className="p-1.5 rounded-lg border border-rose-500/35 text-rose-500 hover:bg-rose-500/15"
                          aria-label={`Remove ${ch.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={ch.label}
                          maxLength={60}
                          onChange={(e) =>
                            handleUpdateChannel(ch.id, { label: e.target.value })
                          }
                          placeholder={meta.defaultLabel}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                          {meta.handleLabel}
                        </label>
                        <input
                          type="text"
                          value={ch.handle}
                          maxLength={180}
                          onChange={(e) =>
                            handleUpdateChannel(ch.id, { handle: e.target.value })
                          }
                          placeholder={meta.handlePlaceholder}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                          Direct Chat Link (Optional)
                        </label>
                        <input
                          type="text"
                          value={ch.url}
                          maxLength={400}
                          onChange={(e) =>
                            handleUpdateChannel(ch.id, { url: e.target.value })
                          }
                          placeholder={meta.linkPlaceholder}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    {/* Per-Channel Icon, Colour & Pre-filled Message (Like WhatsApp) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[var(--border-subtle)]/70">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Icon Style &amp; Custom Icon
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {CHANNEL_ICON_STYLE_OPTIONS.map((opt) => {
                            const selected = chIconStyle === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateChannel(ch.id, { iconStyle: opt.id })
                                }
                                className={`px-2 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 transition-colors ${
                                  selected
                                    ? 'border-accent bg-accent/15 text-[var(--text-main)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/50'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center overflow-hidden ${
                                    isChLiquidGlass &&
                                    !(
                                      opt.id === 'custom-image' &&
                                      sanitizeSafeImageSrc(ch.customIconUrl)
                                    )
                                      ? 'liquid-glass-circle'
                                      : ''
                                  }`}
                                  style={
                                    opt.id === 'custom-image' &&
                                    sanitizeSafeImageSrc(ch.customIconUrl)
                                      ? { backgroundColor: '#ffffff', color: '#111827' }
                                      : isChLiquidGlass
                                      ? undefined
                                      : {
                                          backgroundColor: chColor,
                                          color: isLightHexColor(chColor)
                                            ? '#111827'
                                            : '#ffffff',
                                        }
                                  }
                                >
                                  <ChannelBadgeIcon
                                    platform={ch.platform}
                                    iconStyle={opt.id}
                                    customIconUrl={ch.customIconUrl}
                                    sizeClass="w-2.5 h-2.5"
                                  />
                                </span>
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-accent text-[11px] font-semibold text-[var(--text-main)] inline-flex items-center gap-1 shrink-0">
                            <ImagePlus className="w-3 h-3 text-accent" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              onChange={(e) => void handleChannelIconFileUpload(ch.id, e)}
                              className="hidden"
                            />
                          </label>
                          <input
                            type="url"
                            value={
                              ch.customIconUrl?.startsWith('data:')
                                ? ''
                                : ch.customIconUrl || ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateChannel(ch.id, {
                                customIconUrl: val,
                                iconStyle: val.trim() ? 'custom-image' : chIconStyle,
                              });
                            }}
                            placeholder={
                              ch.customIconUrl?.startsWith('data:')
                                ? 'Uploaded icon saved'
                                : 'Or custom icon URL (https://...)'
                            }
                            className="w-full px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[11px] text-[var(--text-main)] focus:outline-none focus:border-accent"
                          />
                          {ch.customIconUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateChannel(ch.id, {
                                  customIconUrl: '',
                                  iconStyle:
                                    chIconStyle === 'custom-image' ? 'platform' : chIconStyle,
                                })
                              }
                              className="p-1 rounded-lg border border-rose-500/35 text-rose-500 hover:bg-rose-500/10 shrink-0"
                              aria-label="Clear custom channel icon"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            Badge Colour
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {CHAT_COLOR_PRESETS.slice(0, 6).map((preset) => {
                              const active =
                                !isChLiquidGlass &&
                                chColor.toLowerCase() === preset.hex.toLowerCase();
                              return (
                                <button
                                  key={preset.hex}
                                  type="button"
                                  title={preset.label}
                                  onClick={() =>
                                    handleUpdateChannel(ch.id, { color: preset.hex })
                                  }
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-transform ${
                                    active
                                      ? 'scale-110 border-[var(--text-main)] ring-1 ring-accent'
                                      : 'border-white/50 hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: preset.hex }}
                                  aria-label={preset.label}
                                />
                              );
                            })}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateChannel(ch.id, { color: 'liquid-glass' })
                              }
                              className={`h-6 px-2 rounded-full inline-flex items-center gap-1 border text-[10px] font-semibold transition-all ${
                                isChLiquidGlass
                                  ? 'border-accent bg-accent/15 text-[var(--text-main)] ring-1 ring-accent/40'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-accent/60'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full liquid-glass-circle shrink-0" />
                              <span>Liquid Glass</span>
                            </button>
                            <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer text-[10px] font-mono-num text-[var(--text-main)]">
                              <input
                                type="color"
                                value={chColor}
                                onChange={(e) =>
                                  handleUpdateChannel(ch.id, { color: e.target.value })
                                }
                                className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0"
                                aria-label="Pick channel colour"
                              />
                              <span>
                                {isChLiquidGlass ? 'LIQUID GLASS' : chColor.toUpperCase()}
                              </span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            Pre-filled Message (Optional)
                          </label>
                          <textarea
                            rows={2}
                            maxLength={300}
                            value={ch.prefillMessage ?? ''}
                            onChange={(e) =>
                              handleUpdateChannel(ch.id, { prefillMessage: e.target.value })
                            }
                            placeholder="Pre-filled greeting message when customer clicks this app..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[11px] text-[var(--text-main)] focus:outline-none focus:border-accent resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="truncate">
                        {resolvedHref ? (
                          <>
                            <span className="font-semibold text-[var(--text-secondary)]">
                              Opens:{' '}
                            </span>
                            {resolvedHref}
                          </>
                        ) : (
                          'Enter a username/handle or full chat link above to activate'
                        )}
                      </span>
                      {resolvedHref && (
                        <a
                          href={resolvedHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-semibold text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="shrink-0 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default</span>
        </button>

        <div className="flex items-center gap-2.5">
          {isDirty && (
            <span className="text-[11px] font-semibold text-amber-500">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[var(--accent-cta-text)] cta-glow-red disabled:opacity-60 inline-flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Chat Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
