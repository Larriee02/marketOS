import { useState } from 'react';
import { apiFetch } from '../services/api';
import './shop-settings.css';

export function PrivacyPage() {
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch('/api/v1/privacy/requests', { method: 'POST', body: JSON.stringify(payload) });
      setReference(result.reference);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="shop-settings">
      <div className="settings-wrap settings-main">
        <a className="settings-button" href="/">Back to MarketOS</a>
        <h1>Privacy and your data</h1>
        <section className="settings-panel">
          <header>
            <h2>How MarketOS uses your information</h2>
            <p>MarketOS uses account details to sign merchants in and manage their shops. Merchants can record customers’ names, contact details, purchases, credit balances and repayments. Shop owners can download their shop records in Settings.</p>
          </header>
          {reference ? <div className="settings-save" role="status">
            <p>Request received. Save your reference <strong>{reference}</strong>. The operator can follow up using the email you provided.</p>
          </div> : <form onSubmit={submit}>
            <header><h2>Send a privacy request</h2>
              <p>You can use this form without an account. The platform operator uses these details to locate the right shop and verify your request before sharing or changing records. Include only the information requested below. Contact details in the request queue are removed when the operator closes your case.</p>
            </header>
            <fieldset className="settings-fields" disabled={busy}>
              <label>Reply email<input name="email" type="email" maxLength={254} autoComplete="email" required /></label>
              <label>Shop name (if known)<input name="shop" maxLength={150} /></label>
              <label>Request type<select name="kind">{['Access', 'Correction', 'Deletion', 'Restriction', 'Objection', 'Other'].map(kind => <option key={kind}>{kind}</option>)}</select></label>
            </fieldset>
            <div className="settings-save">{error && <p role="alert">{error}</p>}
              <button className="settings-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </div>
          </form>}
        </section>
        <p className="settings-save">You can also lodge a complaint with the <a href="https://ndpc.gov.ng/">Nigeria Data Protection Commission</a>.</p>
      </div>
    </main>
  );
}
