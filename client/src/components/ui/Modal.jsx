import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, subtitle, maxWidth = 'max-w-lg', children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const element = dialog.current;
    element.focus({ preventScroll: true });
    const handleKeyDown = (event) => {
      if (!element.contains(document.activeElement)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
        .filter((node) => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && [element, first].includes(document.activeElement)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.addEventListener('keydown', handleKeyDown);
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B1220]/65 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        style={{ color: 'var(--text-primary)' }}
        className={`liquid-glass-elevated rounded-t-3xl sm:rounded-3xl ${maxWidth} w-full p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain pb-safe modal-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ borderColor: 'var(--border-outer)' }}
          className="flex items-start justify-between gap-4 border-b pb-3.5"
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base sm:text-lg font-extrabold font-luxury tracking-tight break-words"
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{ color: 'var(--text-secondary)' }}
                className="text-xs mt-0.5 break-words font-medium"
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ color: 'var(--text-secondary)' }}
            className="liquid-glass-subtle p-2 -mr-1 rounded-xl hover:opacity-80 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
