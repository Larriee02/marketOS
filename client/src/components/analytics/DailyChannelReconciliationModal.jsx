import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import './reconciliation.css';

const channelLabels = ['Cash drawer', 'POS terminal', 'Bank & mobile wallet'];
const roundMoney = (amount) => Number(amount.toFixed(2));

export function DailyChannelReconciliationModal({
  isOpen, onClose, tradingDate, apiFetch, formatNaira, storeName, onSuccess,
}) {
  const [date, setDate] = useState(tradingDate);
  const [result, setResult] = useState(null);
  const [actuals, setActuals] = useState(['', '', '']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    apiFetch('/api/v1/cashbook/sessions?' + new URLSearchParams({ date }), { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ date, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ date, error: 'Could not load balances for this date.' });
      });
    return () => controller.abort();
  }, [apiFetch, date]);

  const selected = result?.date === date ? result : null;
  const data = selected?.data;
  const expected = data ? [
    data.expectedClosingCash,
    data.dayPosNet,
    roundMoney(data.expectedClosingBankPos - data.dayPosNet),
  ] : [];
  const complete = Boolean(data) && actuals.every((value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0);
  const actualTotal = roundMoney(actuals.reduce((sum, value) => sum + Number(value), 0));
  const expectedTotal = data ? roundMoney(expected.reduce((sum, value) => sum + value, 0)) : null;

  function varianceText(actual, systemAmount) {
    if (systemAmount === undefined || actual === '') return '—';
    const diff = roundMoney(Number(actual) - systemAmount);
    if (diff === 0) return 'Matched';
    return `${formatNaira(Math.abs(diff))} ${diff > 0 ? 'over' : 'short'}`;
  }

  function changeDate(value) {
    setDate(value);
    setResult(null);
    setActuals(['', '', '']);
    setError('');
    setCopyStatus('');
  }

  const summary = complete ? [
    'Daily reconciliation',
    storeName,
    date,
    '',
    ...channelLabels.map((channel, index) =>
      `${channel}: expected ${formatNaira(expected[index])}, actual ${formatNaira(Number(actuals[index]))}, ${varianceText(actuals[index], expected[index])}`),
    '',
    `Total expected: ${formatNaira(expectedTotal)}`,
    `Total actual: ${formatNaira(actualTotal)}`,
    `Net difference: ${varianceText(actualTotal, expectedTotal)}`,
    notes.trim() && `Notes: ${notes.trim()}`,
  ].join('\n') : '';

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('Summary copied.');
    } catch {
      setCopyStatus('Could not copy the summary.');
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/api/v1/cashbook/sessions/close', {
        method: 'POST',
        body: JSON.stringify({
          session_date: date,
          actual_closing_balance: actualTotal,
          actual_closing_cash: Number(actuals[0]),
          actual_closing_bank_pos: roundMoney(Number(actuals[1]) + Number(actuals[2])),
          closing_note: notes.trim() || undefined,
        }),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not close the register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!submitting) onClose(); }} title="Daily reconciliation"
      subtitle="Compare your recorded balances with what you counted." maxWidth="max-w-3xl" panelClassName="reconcile-panel">
      <form className="reconcile-form" onSubmit={save}>
        <div className="reconcile-body">
          <div className="reconcile-toolbar">
            <label>Register date<input type="date" value={date} onChange={(e) => changeDate(e.target.value)}
              required disabled={submitting} /></label>
            {data?.todaySession?.status === 'CLOSED' && <span>Register already closed</span>}
          </div>
          {date && !selected && <p role="status">Loading expected balances…</p>}
          {selected?.error && <p role="alert">{selected.error} Select another date or reopen reconciliation to retry.</p>}

          <div className="reconcile-columns" aria-hidden="true">
            <span>Channel</span><span>Expected</span><span>Actual</span><span>Difference</span>
          </div>
          {channelLabels.map((channel, index) => (
            <div className="reconcile-row" key={channel}>
              <h3>{channel}</h3>
              <div><span className="reconcile-mobile-label">Expected</span><strong>{data ? formatNaira(expected[index]) : '—'}</strong></div>
              <label><span className="sr-only">Actual for {channel}</span><span className="reconcile-mobile-label" aria-hidden="true">Actual</span>
                <input type="number" step="any" min="0" inputMode="decimal" required disabled={!data || submitting}
                  placeholder="0.00" value={actuals[index]} onChange={(e) => {
                    setActuals(actuals.map((amount, position) => position === index ? e.target.value : amount));
                    setCopyStatus('');
                  }} />
              </label>
              <div><span className="reconcile-mobile-label">Difference</span>{varianceText(actuals[index], expected[index])}</div>
            </div>
          ))}

          <label className="reconcile-notes">Notes <span>(optional)</span>
            <textarea rows={2} value={notes} disabled={submitting} onChange={(e) => { setNotes(e.target.value); setCopyStatus(''); }}
              placeholder="Explain any differences" />
          </label>
        </div>
        <footer className="reconcile-footer">
          <dl className="reconcile-totals">
            <div><dt>Total expected</dt><dd>{data ? formatNaira(expectedTotal) : '—'}</dd></div>
            <div><dt>Total actual</dt><dd>{complete ? formatNaira(actualTotal) : '—'}</dd></div>
            <div><dt>Net difference</dt><dd>{complete ? varianceText(actualTotal, expectedTotal) : '—'}</dd></div>
          </dl>
          {error && <p role="alert">{error}</p>}
          {copyStatus && <p role="status">{copyStatus}</p>}
          <div className="reconcile-actions">
            <button className="workspace-chip" type="button" disabled={!complete} onClick={copySummary}><Copy size={15} aria-hidden="true" /> Copy</button>
            <button className="workspace-chip" type="button" disabled={!complete} onClick={() => window.print()}><Printer size={15} aria-hidden="true" /> Print</button>
            <button className="workspace-primary" type="submit" disabled={!complete || submitting}>
              {submitting ? 'Saving…' : 'Save and close day'}
            </button>
          </div>
        </footer>
      </form>
      {complete && createPortal(<pre className="reconcile-print">{summary}</pre>, document.body)}
    </Modal>
  );
}
