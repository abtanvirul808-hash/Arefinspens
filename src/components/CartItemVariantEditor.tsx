import React, { useState } from 'react';
import { Check, Droplets } from 'lucide-react';
import { getVariantInkColors } from '../data/products';
import { Product } from '../types';

interface CartItemVariantEditorProps {
  product: Product;
  currentColorId: string;
  currentInkColorId?: string;
  compact?: boolean;
  onPreviewColorChange?: (colorId: string) => void;
  onSave: (nextColorId: string, nextInkColorId: string) => void;
  onCancel: () => void;
}

export const CartItemVariantEditor: React.FC<CartItemVariantEditorProps> = ({
  product,
  currentColorId,
  currentInkColorId,
  compact = false,
  onPreviewColorChange,
  onSave,
  onCancel,
}) => {
  const selectableColors = product.colors.filter((c) => c.inStock);
  const bodyColors = selectableColors.length > 0 ? selectableColors : product.colors;

  const initialColor =
    bodyColors.find((c) => c.id === currentColorId) || bodyColors[0];
  const initialInks = getVariantInkColors(product, initialColor);
  const initialInk =
    initialInks.find((i) => i.id === currentInkColorId) || initialInks[0];

  const [draftColorId, setDraftColorId] = useState<string>(initialColor?.id || '');
  const [draftInkId, setDraftInkId] = useState<string>(initialInk?.id || 'black');

  const activeBodyColor =
    bodyColors.find((c) => c.id === draftColorId) || bodyColors[0];
  const variantInks = getVariantInkColors(product, activeBodyColor);
  const activeInk =
    variantInks.find((i) => i.id === draftInkId) ||
    variantInks[0] || { id: 'black', name: 'Black', hex: '#111827' };

  const handleSelectBodyColor = (colorId: string) => {
    setDraftColorId(colorId);
    onPreviewColorChange?.(colorId);
    const chosenVariant = bodyColors.find((c) => c.id === colorId);
    const nextInks = getVariantInkColors(product, chosenVariant);
    if (!nextInks.some((i) => i.id === draftInkId)) {
      setDraftInkId(nextInks[0]?.id || 'black');
    }
  };

  return (
    <div
      className={`border-t border-[var(--border-subtle)]/70 ${
        compact ? 'pt-3 mt-2.5 space-y-3' : 'pt-4 mt-3 space-y-3.5'
      }`}
    >
      {/* Body Colour Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[var(--text-secondary)]">Body Colour</span>
          <span className="font-semibold text-accent dark:text-accent-bright truncate">
            {activeBodyColor?.name}
          </span>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={`Select body colour for ${product.name}`}
        >
          {bodyColors.map((color) => {
            const selected = color.id === activeBodyColor?.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => handleSelectBodyColor(color.id)}
                title={color.name}
                aria-label={`Body colour ${color.name}`}
                aria-pressed={selected}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                  selected
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg-card)] scale-105'
                    : 'ring-1 ring-black/20 dark:ring-white/25 hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {selected && (
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ink Colour Selector (filtered dynamically for the active body colour) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-accent-bright" />
            <span>Ink Colour</span>
          </span>
          <span className="font-semibold text-accent dark:text-accent-bright truncate">
            {activeInk.name} Ink
          </span>
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label={`Select ink colour for ${product.name}`}
        >
          {variantInks.map((ink) => {
            const selected = ink.id === activeInk.id;
            return (
              <button
                key={ink.id}
                type="button"
                onClick={() => setDraftInkId(ink.id)}
                aria-pressed={selected}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  selected
                    ? 'border-accent bg-accent/15 text-[var(--text-main)] font-semibold'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-accent/60 hover:text-[var(--text-main)]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/20 dark:border-white/30 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: ink.hex }}
                >
                  {selected && (
                    <Check className="w-2 h-2 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
                  )}
                </span>
                <span>{ink.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save / Cancel Controls */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-accent/60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSave(activeBodyColor?.id || currentColorId, activeInk.id)
          }
          className="min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-cta-text)] cta-glow-red inline-flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};
