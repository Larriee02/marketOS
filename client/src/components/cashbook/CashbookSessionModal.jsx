import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import './cashbook-session.css';

export function CashbookSessionModal({
  isOpen,
  onClose,
  initialMode = 'OPEN', // 'OPEN' | 'CLOSE'
  tradingDate,
  apiFetch,
  formatCurrency,
  currencySymbol = '₦',
  toastSuccess,
  toastError,
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [sessionDate, setSessionDate] = useState(tradingDate);
  const [sessionState, setSessionState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const ready = sessionState?.targetDate === sessionDate;
  const [openingCash, setOpeningCash] = useState('');
  const [openingBankPos, setOpeningBankPos] = useState('');
  const [openingNote, setOpeningNote] = useState('');

  const [actualClosingCash, setActualClosingCash] = useState('');
  const [actualClosingBankPos, setActualClosingBankPos] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionDate) return;
    const controller = new AbortController();
    const { signal } = controller;
    setSessionState(null);
    setLoadError('');
    apiFetch('/api/v1/cashbook/sessions?' + new URLSearchParams({ date: sessionDate }), { signal })
      .then((data) => { if (!signal.aborted) setSessionState(data); })
      .catch(() => { if (!signal.aborted) setLoadError('Could not load this register. Reopen it to retry.'); });
    return () => controller.abort();
  }, [apiFetch, sessionDate]);

  useEffect(() => {
    if (sessionState) {
      const curSess = sessionState?.todaySession;
      const initOpenCash =
        curSess?.opening_cash !== undefined && curSess?.opening_cash !== null
          ? String(curSess.opening_cash)
          : String(sessionState?.effectiveOpeningCash ?? sessionState?.suggestedOpeningCash ?? 0);
      const initOpenBank =
        curSess?.opening_bank_pos !== undefined && curSess?.opening_bank_pos !== null
          ? String(curSess.opening_bank_pos)
          : String(sessionState?.effectiveOpeningBankPos ?? sessionState?.suggestedOpeningBankPos ?? 0);

      setOpeningCash(initOpenCash);
      setOpeningBankPos(initOpenBank);
      setOpeningNote(curSess?.opening_note || '');

      const initCloseCash =
        curSess?.actual_closing_cash !== undefined && curSess?.actual_closing_cash !== null
          ? String(curSess.actual_closing_cash)
          : String(sessionState?.expectedClosingCash ?? 0);
      const initCloseBank =
        curSess?.actual_closing_bank_pos !== undefined && curSess?.actual_closing_bank_pos !== null
          ? String(curSess.actual_closing_bank_pos)
          : String(sessionState?.expectedClosingBankPos ?? 0);

      setActualClosingCash(initCloseCash);
      setActualClosingBankPos(initCloseBank);
      setClosingNote(curSess?.closing_note || '');
    }
  }, [sessionState]);

  const totalOpeningInput = useMemo(() => {
    const c = Number(openingCash || 0);
    const b = Number(openingBankPos || 0);
    return Number(((Number.isNaN(c) ? 0 : c) + (Number.isNaN(b) ? 0 : b)).toFixed(2));
  }, [openingCash, openingBankPos]);

  const totalActualClosingInput = useMemo(() => {
    const c = Number(actualClosingCash || 0);
    const b = Number(actualClosingBankPos || 0);
    return Number(((Number.isNaN(c) ? 0 : c) + (Number.isNaN(b) ? 0 : b)).toFixed(2));
  }, [actualClosingCash, actualClosingBankPos]);

  const dayInflow = Number(sessionState?.dayInflow || 0);
  const dayOutflow = Number(sessionState?.dayOutflow || 0);
  const expectedClosing = useMemo(() => {
    return Number((totalOpeningInput + dayInflow - dayOutflow).toFixed(2));
  }, [totalOpeningInput, dayInflow, dayOutflow]);

  const variance = useMemo(() => {
    return Number((totalActualClosingInput - expectedClosing).toFixed(2));
  }, [totalActualClosingInput, expectedClosing]);

  const handlePrefillSuggestedOpening = () => {
    setOpeningCash(String(sessionState?.suggestedOpeningCash ?? 0));
    setOpeningBankPos(String(sessionState?.suggestedOpeningBankPos ?? 0));
    setOpeningNote('Carried forward from previous closing balance');
  };

  const handleMatchExpectedClosing = () => {
    const expCash = Number(openingCash || 0) + Number(sessionState?.dayCashInflow || 0) - Number(sessionState?.dayCashOutflow || 0);
    const expBank = Number(openingBankPos || 0) + Number(sessionState?.dayBankPosInflow || 0) - Number(sessionState?.dayBankPosOutflow || 0);
    setActualClosingCash(String(Number(expCash.toFixed(2))));
    setActualClosingBankPos(String(Number(expBank.toFixed(2))));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (mode === 'OPEN') {
        await apiFetch('/api/v1/cashbook/sessions/open', {
          method: 'POST',
          body: JSON.stringify({
            session_date: sessionDate,
            opening_cash: Number(openingCash || 0),
            opening_bank_pos: Number(openingBankPos || 0),
            opening_balance: totalOpeningInput,
            opening_note: openingNote,
          }),
        });
        toastSuccess?.(`Opening balance (${formatCurrency(totalOpeningInput)}) saved for ${sessionDate}!`);
      } else {
        await apiFetch('/api/v1/cashbook/sessions/close', {
          method: 'POST',
          body: JSON.stringify({
            session_date: sessionDate,
            opening_cash: Number(openingCash || 0),
            opening_bank_pos: Number(openingBankPos || 0),
            opening_balance: totalOpeningInput,
            actual_closing_cash: Number(actualClosingCash || 0),
            actual_closing_bank_pos: Number(actualClosingBankPos || 0),
            actual_closing_balance: totalActualClosingInput,
            closing_note: closingNote,
          }),
        });
        toastSuccess?.(`Daily cashbook reconciled & closed for ${sessionDate}!`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toastError?.(err.message || 'Failed to save cashbook session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const opening = mode === 'OPEN';
  const closed = sessionState?.todaySession?.status === 'CLOSED';
  const sessions = sessionState?.sessions ?? [];
  const fields = opening
    ? [
        { label: 'Cash in drawer', value: openingCash, setValue: setOpeningCash },
        { label: 'POS and bank float', value: openingBankPos, setValue: setOpeningBankPos },
      ]
    : [
        { label: 'Cash counted', value: actualClosingCash, setValue: setActualClosingCash, expected: Number(openingCash || 0) + Number(sessionState?.dayCashInflow || 0) - Number(sessionState?.dayCashOutflow || 0) },
        { label: 'POS and bank balance', value: actualClosingBankPos, setValue: setActualClosingBankPos, expected: Number(openingBankPos || 0) + Number(sessionState?.dayBankPosInflow || 0) - Number(sessionState?.dayBankPosOutflow || 0) },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily cash register"
      maxWidth="max-w-2xl"
      panelClassName="cashbook-register"
    >
      <form onSubmit={handleSubmit}>
        <div className="register-switch" role="group" aria-label="Register action">
          <button type="button" aria-pressed={opening} onClick={() => setMode('OPEN')}>
            Opening balance
          </button>
          <button type="button" aria-pressed={!opening} onClick={() => setMode('CLOSE')}>
            Close the day
          </button>
        </div>

        <div className="register-body" key={mode}>
          <div className="register-date-row">
            <label>
              Register date
              <input type="date" required value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </label>
            {sessionDate === sessionState?.targetDate && (
              <span className="register-status">{closed ? 'Register closed' : 'Register open'}</span>
            )}
          </div>

          {!ready && <p role="status">{loadError || (sessionDate ? 'Loading register…' : 'Choose a register date.')}</p>}
          {ready && <>
          {!opening && (
            <dl className="register-ledger">
              {[
                ['Opening balance', formatCurrency(totalOpeningInput)],
                ['Money in', `+${formatCurrency(dayInflow)}`],
                ['Money out', `−${formatCurrency(dayOutflow)}`],
                ['Expected close', formatCurrency(expectedClosing)],
              ].map(([label, amount]) => (
                <div key={label}><dt>{label}</dt><dd>{amount}</dd></div>
              ))}
            </dl>
          )}

          <div className="register-section">
            <div className="register-section-heading">
              <h3>{opening ? 'Starting balances' : 'Actual closing balances'}</h3>
              <button type="button" onClick={opening ? handlePrefillSuggestedOpening : handleMatchExpectedClosing}>
                {opening
                  ? `Carry forward ${formatCurrency(sessionState?.suggestedOpeningBalance || 0)}`
                  : 'Use expected amounts'}
              </button>
            </div>
            <div className="register-amounts">
              {fields.map(({ label, value, setValue, expected }) => (
                <label key={label}>
                  {label}
                  <span className="register-amount">
                    <span aria-hidden="true">{currencySymbol}</span>
                    <input type="number" step="any" inputMode="decimal" value={value}
                      onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
                  </span>
                  {expected !== undefined && <small>Expected {formatCurrency(expected)}</small>}
                </label>
              ))}
            </div>
          </div>

          {!opening && (
            <div className="register-variance" data-state={variance === 0 ? 'balanced' : variance > 0 ? 'surplus' : 'shortage'}>
              <strong>{variance === 0 ? 'Balances match' : variance > 0 ? 'Surplus' : 'Shortage'}</strong>
              <span>{formatCurrency(Math.abs(variance))}</span>
            </div>
          )}

          <label className="register-note">
            {opening ? 'Opening note' : 'Closing note'} <small>(optional)</small>
            <input type="text" value={opening ? openingNote : closingNote}
              onChange={(e) => (opening ? setOpeningNote : setClosingNote)(e.target.value)}
              placeholder={opening ? 'e.g. Float counted before opening' : 'e.g. POS settlements checked'} />
          </label>

          {sessions.length > 0 && (
            <details className="register-history">
              <summary>Recent register activity</summary>
              <ul>
                {sessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <strong>{String(session.session_date).slice(0, 10)}</strong>
                    <span>Opened {formatCurrency(session.opening_balance)}</span>
                    {session.status === 'CLOSED' && (
                      <span>Closed {formatCurrency(session.actual_closing_balance)}
                        {Number(session.variance) !== 0 && session.variance != null &&
                          ` (${Number(session.variance) > 0 ? '+' : ''}${formatCurrency(session.variance)})`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          </>}
        </div>

        <div className="register-footer">
          <div className="register-total" aria-live="polite">
            <span>{opening ? 'Total opening balance' : 'Total counted'}</span>
            <strong>{ready ? formatCurrency(opening ? totalOpeningInput : totalActualClosingInput) : '—'}</strong>
          </div>
          <div className="register-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" disabled={!ready || isSubmitting}>
              {isSubmitting ? 'Saving…' : opening ? 'Save opening balance' : 'Save and close day'}
              {isSubmitting
                ? <RefreshCw aria-hidden="true" size={16} className="animate-spin" />
                : <ArrowRight aria-hidden="true" size={16} />}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
