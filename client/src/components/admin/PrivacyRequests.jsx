import { useState } from 'react';
import { apiFetch } from '../../services/api';

export function PrivacyRequests() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(reference) {
    if (busy) return;
    if (reference && !window.confirm('Have you verified the request and sent a response? Closing removes the request and its contact details.')) return;
    setBusy(true);
    setError('');
    try {
      if (reference) await apiFetch('/api/v1/admin/privacy-requests/' + reference, { method: 'DELETE' });
      setRows(await apiFetch('/api/v1/admin/privacy-requests'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="workspace-panel space-y-3">
    <h2>Privacy requests</h2>
    <button type="button" className="admin-button" disabled={busy} onClick={() => review()}>{busy ? 'Loading…' : rows ? 'Refresh queue' : 'Review queue'}</button>
    {error && <p role="alert">{error}</p>}
    {rows && <p role="status">{rows.length ? 'Oldest requests first, up to 50 at a time. Confirm identity and shop before sharing, correcting or deleting personal data. Reply to the requester before closing.' : 'No open requests.'}</p>}
    {rows?.map(row => <article key={row.reference} className="border-t py-3 break-words">
      <h3>{row.kind} · {row.shop || 'Shop unspecified'}</h3>
      <p>{row.email}</p><p>{new Date(row.created_at).toLocaleDateString()} · {row.reference}</p>
      <button type="button" className="admin-button" disabled={busy} onClick={() => review(row.reference)}>Close request</button>
    </article>)}
  </section>;
}
