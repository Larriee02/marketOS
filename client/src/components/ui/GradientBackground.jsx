import React, { useEffect, useRef } from 'react';

/**
 * Immersive 3D Spatial Background
 * - Perspective floor grid that tilts with the cursor (parallax depth)
 * - Volumetric emerald / indigo / cyan light orbs on separate depth layers
 * - Floating 3D wireframe cube + glass ring rendered with CSS 3D transforms
 * - Smooth Light <-> Dark atmosphere crossfade
 * Respects prefers-reduced-motion and disables parallax on touch devices.
 */
export function GradientBackground({ darkMode }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduceMotion || !finePointer) return undefined;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 .. 1
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      root.style.setProperty('--px', currentX.toFixed(4));
      root.style.setProperty('--py', currentY.toFixed(4));
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`sf-scene fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 no-print ${
        darkMode ? 'sf-scene--dark' : 'sf-scene--light'
      }`}
    >
      {/* Depth Layer 0: Atmosphere base (crossfades between themes) */}
      <div className="sf-atmo sf-atmo--light" />
      <div className="sf-atmo sf-atmo--dark" />

      {/* Depth Layer 1: 3D perspective floor grid + horizon glow */}
      <div className="sf-grid-wrap">
        <div className="sf-grid" />
        <div className="sf-horizon-beam" />
      </div>

      {/* Depth Layer 2: Volumetric light orbs (different parallax depths) */}
      <div className="sf-orb sf-orb--emerald" />
      <div className="sf-orb sf-orb--indigo" />
      <div className="sf-orb sf-orb--cyan" />

      {/* Depth Layer 3: Floating 3D architectural objects */}
      <div className="sf-object sf-object--cube">
        <div className="sf-cube">
          <span className="sf-face sf-face--front" />
          <span className="sf-face sf-face--back" />
          <span className="sf-face sf-face--right" />
          <span className="sf-face sf-face--left" />
          <span className="sf-face sf-face--top" />
          <span className="sf-face sf-face--bottom" />
        </div>
      </div>

      <div className="sf-object sf-object--ring">
        <div className="sf-ring" />
      </div>

      <div className="sf-object sf-object--ring-sm">
        <div className="sf-ring-sm" />
      </div>

      <div className="sf-object sf-object--pill">
        <div className="sf-pill" />
      </div>

      <div className="sf-object sf-object--prism">
        <div className="sf-prism" />
      </div>

      {/* Fine film grain for a premium, tactile finish */}
      <div className="sf-grain" />
    </div>
  );
}
