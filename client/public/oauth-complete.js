if (window.opener && !window.opener.closed) {
  window.opener.postMessage({ type: 'MARKETOS_OAUTH_SUCCESS' }, location.origin);
  window.close();
} else {
  location.replace('/store/home');
}
