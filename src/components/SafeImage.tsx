import React, { useEffect, useState } from 'react';
import { PenTool } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center bg-gradient-to-br from-[var(--surface-edge)] to-[#080506] text-[#B8B8B8]"
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-full border border-accent/40 bg-accent/15 flex items-center justify-center text-accent-bright">
          <PenTool className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium tracking-wide text-white/80 line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
};
