import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { SafeImage } from './SafeImage';

export interface LightboxSlide {
  src: string;
  label?: string;
  colorHex?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  slides: LightboxSlide[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  slides,
  initialIndex = 0,
  title = 'Pen Photo Preview',
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const bounded =
      slides.length > 0 ? Math.max(0, Math.min(initialIndex, slides.length - 1)) : 0;
    setActiveIndex(bounded);
    setZoomed(false);
  }, [isOpen, initialIndex, slides.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' && slides.length > 1) {
        setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
        setZoomed(false);
      } else if (e.key === 'ArrowRight' && slides.length > 1) {
        setActiveIndex((prev) => (prev + 1) % slides.length);
        setZoomed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, slides.length, onClose]);

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[activeIndex] || slides[0];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} full-screen viewer`}
    >
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/60 flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
            {title}
          </h3>
          {currentSlide.label && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-medium text-white/95 shrink-0">
              {currentSlide.colorHex && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50 shrink-0"
                  style={{ backgroundColor: currentSlide.colorHex }}
                />
              )}
              <span>{currentSlide.label}</span>
            </span>
          )}
          {slides.length > 1 && (
            <span className="text-xs font-mono-num text-white/60 shrink-0">
              {activeIndex + 1} / {slides.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              zoomed
                ? 'border-accent bg-accent text-[var(--accent-cta-text)]'
                : 'border-white/20 bg-white/10 text-white hover:border-accent'
            }`}
            aria-label={zoomed ? 'Zoom out to fit screen' : 'Zoom in to inspect colour details'}
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            <span className="hidden sm:inline">{zoomed ? 'Fit Screen' : 'Zoom In'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:border-accent hover:bg-accent/20 inline-flex items-center justify-center transition-colors"
            aria-label="Close full-screen photo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Pen Viewport */}
      <div
        className="relative flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          onClick={() => setZoomed((z) => !z)}
          className={`relative transition-all duration-200 ${
            zoomed
              ? 'cursor-zoom-out min-w-[min(92vw,1100px)]'
              : 'cursor-zoom-in w-full h-full flex items-center justify-center'
          }`}
          title={zoomed ? 'Click to fit screen' : 'Click to zoom in'}
        >
          <SafeImage
            src={currentSlide.src}
            alt={currentSlide.label ? `${title} — ${currentSlide.label}` : title}
            className={
              zoomed
                ? 'w-full h-auto max-w-[1400px] mx-auto rounded-2xl object-contain shadow-2xl'
                : 'max-w-full max-h-[74dvh] w-auto h-auto rounded-2xl object-contain shadow-2xl'
            }
          />
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
                setZoomed(false);
              }}
              aria-label="Previous pen photo"
              className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 border border-white/25 text-white hover:border-accent hover:bg-black/90 flex items-center justify-center shadow-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev + 1) % slides.length);
                setZoomed(false);
              }}
              aria-label="Next pen photo"
              className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 border border-white/25 text-white hover:border-accent hover:bg-black/90 flex items-center justify-center shadow-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Slide Thumbnails */}
      {slides.length > 1 && (
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-black/75 flex items-center justify-center gap-2.5 overflow-x-auto shrink-0">
          {slides.map((slide, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={`${slide.src}-${idx}`}
                type="button"
                onClick={() => {
                  setActiveIndex(idx);
                  setZoomed(false);
                }}
                className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                  active
                    ? 'border-accent ring-2 ring-accent/40 scale-105'
                    : 'border-white/15 opacity-60 hover:opacity-100'
                }`}
                aria-label={slide.label || `View slide ${idx + 1}`}
              >
                <SafeImage
                  src={slide.src}
                  alt={slide.label || `${title} view ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
