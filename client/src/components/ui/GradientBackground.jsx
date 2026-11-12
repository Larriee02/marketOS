import React from 'react';

/**
 * Immersive 3D Spatial Background Canvas
 * Renders layered volumetric lighting, subtle architectural perspective grid,
 * and silky-smooth Light <-> Dark mode atmosphere transitions.
 */
export function GradientBackground({ darkMode }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 no-print"
      style={{
        backgroundColor: darkMode ? '#060B16' : '#EEF2F9',
        transition: 'background-color 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Subtle 3D Architectural Perspective Grid */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: darkMode
            ? 'linear-gradient(to right, rgba(148, 163, 184, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.04) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 30%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 75% at 50% 30%, #000 40%, transparent 100%)',
          transition: 'opacity 0.55s ease',
        }}
      />

      {/* Top-Left 3D Volumetric Emerald Sphere */}
      <div
        className="absolute -top-36 -left-32 w-[34rem] h-[34rem] rounded-full blur-3xl animate-float-slow"
        style={{
          background: darkMode
            ? 'radial-gradient(circle at 35% 35%, rgba(16, 185, 129, 0.24), rgba(6, 182, 212, 0.08) 55%, transparent 75%)'
            : 'radial-gradient(circle at 35% 35%, rgba(16, 185, 129, 0.20), rgba(14, 165, 233, 0.10) 55%, transparent 75%)',
          transition: 'background 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Top-Right 3D Volumetric Indigo / Cobalt Sphere */}
      <div
        className="absolute -top-24 -right-28 w-[32rem] h-[32rem] rounded-full blur-3xl animate-float-reverse"
        style={{
          background: darkMode
            ? 'radial-gradient(circle at 60% 35%, rgba(99, 102, 241, 0.24), rgba(56, 189, 248, 0.09) 55%, transparent 75%)'
            : 'radial-gradient(circle at 60% 35%, rgba(79, 70, 229, 0.14), rgba(56, 189, 248, 0.10) 55%, transparent 75%)',
          transition: 'background 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Bottom Center Ambient Horizon Glow */}
      <div
        className="absolute -bottom-44 left-1/2 -translate-x-1/2 w-[54rem] h-[26rem] rounded-full blur-3xl"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12) 0%, rgba(79, 70, 229, 0.10) 45%, transparent 75%)'
            : 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.11) 0%, rgba(99, 102, 241, 0.07) 45%, transparent 75%)',
          transition: 'background 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}
