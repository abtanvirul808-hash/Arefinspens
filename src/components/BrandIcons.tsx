import React from 'react';
import { CategoryId } from '../types';

export const BrandNibLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M20 3L30.5 18.5L26 31.5H14L9.5 18.5L20 3Z"
      fill="url(#nibGrad)"
      style={{ stroke: 'var(--accent-bright)' }}
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M20 3V19.5" stroke="#050505" strokeWidth="1.8" strokeLinecap="round" />
    <circle
      cx="20"
      cy="21"
      r="2.2"
      fill="#050505"
      style={{ stroke: 'var(--accent-bright)' }}
      strokeWidth="0.8"
    />
    <path
      d="M14 31.5H26V35.5C26 36.3284 25.3284 37 24.5 37H15.5C14.6716 37 14 36.3284 14 35.5V31.5Z"
      style={{ fill: 'var(--accent-deep)', stroke: 'var(--accent-bright)' }}
      strokeWidth="1.1"
    />
    <defs>
      <linearGradient id="nibGrad" x1="20" y1="3" x2="20" y2="32" gradientUnits="userSpaceOnUse">
        <stop style={{ stopColor: 'var(--accent-bright)' }} />
        <stop offset="1" style={{ stopColor: 'var(--accent-deep)' }} />
      </linearGradient>
    </defs>
  </svg>
);

export const SparkleAccentIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
      style={{ fill: 'var(--accent-primary)' }}
    />
  </svg>
);

export const CategoryVectorIcon: React.FC<{ category: CategoryId; className?: string }> = ({
  category,
  className = 'w-7 h-7',
}) => {
  switch (category) {
    case 'all':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M19.8 4.4L23.6 8.2L9.5 22.3L4.5 23.5L5.7 18.5L19.8 4.4Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M16.5 7.7L20.3 11.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'gel-pens':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M14 4C14 4 7.5 12.2 7.5 17.2C7.5 20.8 10.4 23.5 14 23.5C17.6 23.5 20.5 20.8 20.5 17.2C20.5 12.2 14 4 14 4Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M11.2 17.6C11.2 19.1 12.4 20.3 13.9 20.3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ballpoint-pens':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M18.6 5.2L22.8 9.4L10.8 21.4L5.6 22.4L6.6 17.2L18.6 5.2Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M14.5 9.3L18.7 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M20.7 7.3L23.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'marker-pens':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M17.5 4.5L23.5 10.5L12 22H6V16L17.5 4.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M6 22L4.5 23.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M14.5 7.5L20.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'mechanical-pencils':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M18.2 5.2L22.8 9.8L11.2 21.4L5.8 22.2L6.6 16.8L18.2 5.2Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M15.4 8L20 12.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7.8 18.2L9.8 20.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.2 23.8L5.8 22.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'highlighters':
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M14 4.2L16.9 10.1L23.4 11L18.7 15.6L19.8 22.1L14 19L8.2 22.1L9.3 15.6L4.6 11L11.1 10.1L14 4.2Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M14 4L21 15L18 23H10L7 15L14 4Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M14 4V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="14" cy="15.5" r="1.5" fill="currentColor" />
        </svg>
      );
  }
};
