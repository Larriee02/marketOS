// Google returns the ID token in the fragment for clients without a server secret.
const params = new URLSearchParams(location.hash.slice(1));
history.replaceState(null, '', location.pathname);
if (params.has('id_token') && params.has('state')) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/v1/auth/oauth/google/callback';
  for (const name of ['state', 'id_token']) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = params.get(name);
    form.append(input);
  }
  document.body.append(form);
  form.submit();
} else {
  location.replace('/login?oauth_error=1');
}
