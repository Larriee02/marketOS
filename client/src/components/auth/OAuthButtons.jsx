import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../services/api';

import { BUSINESS_TYPES } from '../../utils/businessCategories';

export { BUSINESS_TYPES };

export const LAGOS_LOCATIONS = [
  'Ikeja / Yaba / Surulere',
  'Lagos Island / Marina',
  'Lekki / Victoria Island / Ajah',
  'Mushin / Oshodi / Isolo',
  'Alimosho / Egbeda',
  'Festac / Amuwo-Odofin',
  'Ikorodu / Ketu',
  'Agege / Ogba / Berger',
  'Other Location',
];

export function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function OAuthButtons({ actionLabel = 'Continue', showPopupNotice = true, onAuthenticated, onError }) {
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const popupRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin || event.source !== popupRef.current) return;
      const data = event.data;
      if (!data || data.type !== 'MARKETOS_OAUTH_SUCCESS') return;

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      try {
        const session = await apiFetch('/api/v1/auth/me');
        onAuthenticated?.(session.user);
      } catch (err) {
        onError?.(err.message);
      } finally {
        setConnectingGoogle(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [onAuthenticated, onError]);

  const startGoogleOAuthPopup = () => {
    if (onError) onError('');

    const authorizeUrl = '/api/v1/auth/oauth/google/authorize';

    setConnectingGoogle(true);

    // Center the OAuth 2.0 popup window over the current browser window
    const width = 500;
    const height = 660;
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;
    const left = Math.max(0, Math.round(dualScreenLeft + (screenWidth - width) / 2));
    const top = Math.max(0, Math.round(dualScreenTop + (screenHeight - height) / 2));

    const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`;
    const popup = window.open(authorizeUrl, 'marketos_google_oauth', features);

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Popup blocked (common on mobile browsers) -> perform standard full-page OAuth redirect
      window.location.href = authorizeUrl;
      return;
    }

    popupRef.current = popup;
    try {
      popup.focus();
    } catch {
      // Ignore focus error
    }

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      if (!popupRef.current || popupRef.current.closed) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setConnectingGoogle(false);
      }
    }, 450);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={connectingGoogle}
        onClick={startGoogleOAuthPopup}
        className="w-full liquid-glass-subtle hover:scale-[1.01] active:scale-[0.99] py-3 px-4 rounded-2xl text-xs font-extrabold text-theme-primary flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 transition-all"
      >
        {connectingGoogle ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
        ) : (
          <GoogleIcon />
        )}
        <span>{connectingGoogle ? 'Connecting to Google...' : `${actionLabel} with Google`}</span>
      </button>

      {connectingGoogle && showPopupNotice && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-theme-secondary">
          <span className="flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            Complete sign-in in the Google popup window
          </span>
          <button
            type="button"
            onClick={() => {
              if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
              }
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              setConnectingGoogle(false);
            }}
            className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
