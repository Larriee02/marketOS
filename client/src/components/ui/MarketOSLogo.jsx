import React from 'react';

/**
 * MarketOS 3D Folded "M" Growth-Arrow Brand Mark & Wordmark
 * Variants:
 *  - horizontal: 3D M-arrow icon + "MarketOS" wordmark (default)
 *  - icon: App icon squircle badge only
 *  - monochrome: White mark for dark navy / blue surfaces
 */
export function MarketOSLogo({
  variant = 'horizontal',
  size = 'md',
  darkBg = false,
  showTagline = false,
  className = '',
}) {
  const iconDims = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size] || 'w-10 h-10';

  const textSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size] || 'text-xl';

  const isIconOnly = variant === 'icon';
  const isMono = variant === 'monochrome';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {isIconOnly ? (
        <div
          className={`${iconDims} rounded-2xl flex items-center justify-center shrink-0 shadow-md`}
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 45%, #0B1F44 100%)',
            boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.55), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}
        >
          <svg viewBox="0 0 48 48" className="w-[68%] h-[68%]" fill="none" aria-hidden="true">
            <path d="M8 38V14L17 21V38H8Z" fill="#FFFFFF" />
            <path d="M17 21L24 28L29.5 22.5V33L24 37.5L17 30.5V21Z" fill="#BFDBFE" />
            <path d="M24 28L34.5 15.5L31 13L41 9.5L40 20L37 17.8V38H29.5V23.5L24 28Z" fill="#FFFFFF" />
          </svg>
        </div>
      ) : (
        <svg
          viewBox="0 0 48 48"
          className={`${iconDims} shrink-0 drop-shadow-sm`}
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mosLeft" x1="8" y1="12" x2="18" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isMono ? '#FFFFFF' : '#2563EB'} />
              <stop offset="100%" stopColor={isMono ? '#DBEAFE' : '#0B1F44'} />
            </linearGradient>
            <linearGradient id="mosMid" x1="17" y1="21" x2="29" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isMono ? '#93C5FD' : '#1D4ED8'} />
              <stop offset="100%" stopColor={isMono ? '#60A5FA' : '#0B1F44'} />
            </linearGradient>
            <linearGradient id="mosRight" x1="24" y1="10" x2="41" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isMono ? '#FFFFFF' : '#60A5FA'} />
              <stop offset="50%" stopColor={isMono ? '#EFF6FF' : '#2563EB'} />
              <stop offset="100%" stopColor={isMono ? '#DBEAFE' : '#1E40AF'} />
            </linearGradient>
          </defs>
          <path d="M7 38V14L17 22V38H7Z" fill="url(#mosLeft)" />
          <path d="M17 22L24 29L30 23V33.5L24 38L17 31V22Z" fill="url(#mosMid)" />
          <path d="M24 29L35 15.5L31 12.5L42 9L41 20.5L37.5 18V38H29.5V24L24 29Z" fill="url(#mosRight)" />
        </svg>
      )}

      {!isIconOnly && (
        <div className="min-w-0 leading-none">
          <div className={`${textSizes} font-extrabold font-luxury tracking-tight truncate`}>
            <span className={darkBg || isMono ? 'text-white' : 'text-[#0B1F44] dark:text-white'}>
              Market
            </span>
            <span className={darkBg || isMono ? 'text-[#60A5FA]' : 'text-[#2563EB] dark:text-[#60A5FA]'}>
              OS
            </span>
          </div>
          {showTagline && (
            <p
              className={`text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5 truncate ${
                darkBg || isMono ? 'text-blue-200/90' : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              Run your market. Smarter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
