import React from 'react';
import { FileText } from 'lucide-react';
import './history-entries.css';

const dayFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric', minute: '2-digit',
});

function stockQuantity(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number.isFinite(Number(value)) ? String(Number(value)) : '—';
}

export function HistoryEntries({ rows, formatCurrency, onReceipt, getMovementBadgeInfo }) {
  return (
    <table className="history-entries" aria-label="Stock movement records" role="table">
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col">Product</th>
          <th scope="col">Movement</th>
          <th scope="col">Recorded</th>
          <th scope="col">Stock change</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((entry) => {
          const kind = getMovementBadgeInfo(entry.movement_type);
          const date = new Date(entry.created_at);
          const validDate = entry.created_at != null && Number.isFinite(date.getTime());
          const change = stockQuantity(entry.quantity_change);
          const isSale = String(entry.movement_type).toUpperCase() === 'SALE';
          return (
            <tr key={entry.id} role="row">
              <th className="history-entry-product" scope="row">
                <strong>{entry.product_name || 'Unknown product'}</strong>
                {entry.sku && <small className="history-entry-sku">{entry.sku}</small>}
                {entry.counterparty_name && <small>{entry.counterparty_name}</small>}
                {entry.note && <small>{entry.note}</small>}
              </th>
              <td className="history-entry-kind">
                <span data-tone={kind.variant}>{isSale ? 'Sale' : kind.label.toLowerCase()}</span>
              </td>
              <td className="history-entry-date">
                {validDate ? (
                  <time dateTime={date.toISOString()}>
                    {dayFormat.format(date)} <small>{timeFormat.format(date)}</small>
                  </time>
                ) : '—'}
              </td>
              <td className="history-entry-stock">
                <span className="history-entry-mobile-label">Stock change</span>
                <strong>{Number(change) > 0 ? '+' : ''}{change} {entry.unit}</strong>
                <small>
                  <span className="sr-only">Before </span>{stockQuantity(entry.previous_stock)}
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> after </span>{stockQuantity(entry.new_stock)}
                </small>
              </td>
              <td className="history-entry-value">
                <span className="history-entry-mobile-label">Value</span>
                <strong>{formatCurrency(entry.total_value)}</strong>
                {isSale && (
                  <button type="button" onClick={() => onReceipt(entry)}
                    aria-label={`View receipt for ${entry.product_name || 'sale'}`}>
                    <FileText size={14} aria-hidden="true" /> Receipt
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
