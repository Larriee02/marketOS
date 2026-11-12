import { useEffect } from 'react';

/**
 * Global 3D Tilt Controller
 * Gives every compact `.liquid-glass` card (stat tiles, product cards, panels) a subtle
 * cursor-driven 3D tilt with a moving specular glare — without editing each component.
 * Large panels, modals, tables, and form-heavy cards are skipped so they stay stable.
 */
const MAX_TILT_DEG = 5;
const MAX_WIDTH = 560;
const MAX_HEIGHT = 440;

export function Tilt3DController() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduceMotion || !finePointer) return undefined;

    let active = null;
    let frame = 0;
    let lastEvent = null;

    const reset = (el) => {
      if (!el) return;
      el.classList.remove('tilt-active');
      el.style.removeProperty('transform');
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    };

    const findCard = (target) => {
      if (!(target instanceof Element)) return null;
      // Never tilt while interacting with form controls, inside dialogs, or tables
      if (target.closest('input, select, textarea, [role="dialog"], table')) return null;
      const card = target.closest('.liquid-glass, .tilt-3d');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      if (!card.classList.contains('tilt-3d') && (rect.width > MAX_WIDTH || rect.height > MAX_HEIGHT)) {
        return null;
      }
      return card;
    };

    const apply = () => {
      frame = 0;
      if (!lastEvent) return;
      const card = findCard(lastEvent.target);

      if (card !== active) {
        reset(active);
        active = card;
      }
      if (!active) return;

      const rect = active.getBoundingClientRect();
      const x = (lastEvent.clientX - rect.left) / rect.width; // 0..1
      const y = (lastEvent.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * 2 * MAX_TILT_DEG;
      const rotX = (0.5 - y) * 2 * MAX_TILT_DEG;

      active.classList.add('tilt-active');
      active.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      active.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      active.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
        2
      )}deg) translateZ(0)`;
    };

    const onMove = (e) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      reset(active);
      active = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('scroll', onLeave, { passive: true });

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('scroll', onLeave);
      if (frame) cancelAnimationFrame(frame);
      reset(active);
    };
  }, []);

  return null;
}
