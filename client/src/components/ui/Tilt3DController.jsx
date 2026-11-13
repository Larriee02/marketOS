import { useEffect } from 'react';

/**
 * Global 3D Specular Light Controller
 * Projects a subtle cursor-tracking specular rim highlight (--mx, --my) onto
 * interactive `.liquid-glass` cards without tilting or distorting text/layout.
 */
const MAX_WIDTH = 640;
const MAX_HEIGHT = 480;

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
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    };

    const findCard = (target) => {
      if (!(target instanceof Element)) return null;
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
      const x = ((lastEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((lastEvent.clientY - rect.top) / rect.height) * 100;

      active.classList.add('tilt-active');
      active.style.setProperty('--mx', `${x.toFixed(1)}%`);
      active.style.setProperty('--my', `${y.toFixed(1)}%`);
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
