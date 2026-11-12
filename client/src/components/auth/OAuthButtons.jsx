import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { apiFetch, getStoredToken, setStoredToken } from '../../services/api';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '7652655046-941j1no6adnoimmiqfa7laef255iv2su.apps.googleusercontent.com';

export const BUSINESS_TYPES = [
  'Supermarket & Grocery',
  'Provision & Convenience Store',
  'Wholesale & Distribution',
  'Beverage & Drinks Outlet',
  'Pharmacy & Health Store',
  'Cosmetics & Household Retail',
  'General Merchandise',
];

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

export function OAuthButtons({ actionLabel = 'Continue', onAuthenticated, onError }) {
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const popupRef = useRef(null);
  const pollTimerRef = useRef(null);
  const initialTokenRef = useRef('');

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'STOCKFLOW_OAUTH_SUCCESS') return;

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (data.token) {
        setStoredToken(data.token);
      }

      setConnectingGoogle(false);
      if (data.user && onAuthenticated) {
        onAuthenticated(data.user);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [onAuthenticated]);

  const startGoogleOAuthPopup = () => {
    if (onError) onError('');

    // Use official Google Identity Services (accounts.google.com/gsi/client) popup when available
    if (
      GOOGLE_CLIENT_ID &&
      typeof window !== 'undefined' &&
      window.google?.accounts?.oauth2?.initTokenClient
    ) {
      setConnectingGoogle(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              setConnectingGoogle(false);
              if (tokenResponse.error !== 'popup_closed_by_user' && onError) {
                onError(tokenResponse.error_description || 'Google sign-in was cancelled.');
              }
              return;
            }
            if (!tokenResponse?.access_token) {
              setConnectingGoogle(false);
              return;
            }
            try {
              const data = await apiFetch('/api/v1/auth/oauth', {
                method: 'POST',
                body: JSON.stringify({
                  provider: 'GOOGLE',
                  access_token: tokenResponse.access_token,
                  client_id: GOOGLE_CLIENT_ID,
                }),
              });
              if (data?.token) {
                setStoredToken(data.token);
              }
              setConnectingGoogle(false);
              if (data?.user && onAuthenticated) {
                onAuthenticated(data.user);
              }
            } catch (err) {
              setConnectingGoogle(false);
              if (onError) onError(err.message || 'Failed to verify Google account.');
            }
          },
          error_callback: (err) => {
            setConnectingGoogle(false);
            if (err?.type && err.type !== 'popup_closed' && onError) {
              onError('Google sign-in window closed before completing.');
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch {
        // Fall through to standard OAuth 2.0 /authorize popup redirect
      }
    }

    const authorizeUrl = '/api/v1/auth/oauth/google/authorize';

    initialTokenRef.current = getStoredToken() || '';
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
    const popup = window.open(authorizeUrl, 'stockflow_google_oauth', features);

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
      // Check if localStorage token was updated by the callback window
      const currentToken = getStoredToken() || '';
      if (currentToken && currentToken !== initialTokenRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        try {
          const meData = await apiFetch('/api/v1/auth/me');
          if (meData?.user && onAuthenticated) {
            setConnectingGoogle(false);
            onAuthenticated(meData.user);
            return;
          }
        } catch {
          // Continue waiting or let close handler clean up
        }
      }

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

      {connectingGoogle && (
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
