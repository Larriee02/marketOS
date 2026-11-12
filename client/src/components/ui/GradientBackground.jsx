import React from 'react';

/**
 * Navy & Emerald Design System Background Canvas
 *
 * Light Mode Specification:
 *  - App Background: #F5F7FA
 *  - Primary Navy:   #142B45
 *  - Primary Emerald:#15966A
 *
 * Dark Mode Specification:
 *  - Dark Background:#0B1220
 *  - Dark Surface:   #111C2E
 *  - Elevated Surface:#18263A
 *  - Dark Emerald:   #34D399
 */
export function GradientBackground({ darkMode }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 no-print transition-colors duration-300"
      style={{
        backgroundColor: darkMode ? '#0B1220' : '#F5F7FA',
      }}
    >
      {/* Subtle architectural Navy & Emerald ambient light accents */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-300"
        style={{
          background: darkMode
            ? 'radial-gradient(circle at 12% 8%, rgba(24, 38, 58, 0.65) 0%, transparent 45%), radial-gradient(circle at 88% 12%, rgba(52, 211, 153, 0.06) 0%, transparent 42%), radial-gradient(circle at 50% 92%, rgba(17, 28, 46, 0.70) 0%, transparent 55%)'
            : 'radial-gradient(circle at 10% 6%, rgba(20, 43, 69, 0.04) 0%, transparent 42%), radial-gradient(circle at 90% 10%, rgba(21, 150, 106, 0.05) 0%, transparent 42%)',
        }}
      />
    </div>
  );
}
