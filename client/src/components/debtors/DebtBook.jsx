import { Plus, MessageCircle, FileText } from 'lucide-react';
import { ListPagination } from '../ui/ListPagination';
import './debt-book.css';

export function DebtBook({ metrics, accountCount, slipCount, view, onView, status, onStatus,
  search, onSearch, page, loading, error, formatMoney, onAdd, onReminder, onStatement, onPayment }) {
  const accounts = view === 'ACCOUNTS';
  const filtered = Boolean(search.trim()) || status !== 'ALL';
  const noun = accounts ? 'accounts' : 'slips';
  const clearFilters = () => {
    onSearch('');
    onStatus('ALL');
  };
  const unavailable = loading || Boolean(error && !slipCount);
  const money = (value) => unavailable ? '—' : formatMoney(value);

  return (
    <section className="debt-book">
      <header className="debt-heading">
        <h1 className="workspace-title">Customer debts</h1>
        <button type="button" className="workspace-primary" onClick={onAdd}><Plus size={16} />Record credit sale</button>
      </header>
      <dl className="debt-summary">
        <div><dt>Outstanding balance</dt><dd>{money(metrics.outstanding)}</dd></div>
        <div><dt>Past due</dt><dd>{money(metrics.overdue)}</dd>
          {!unavailable && metrics.overdueSlips > 0 && <small>{metrics.overdueSlips} overdue {metrics.overdueSlips === 1 ? 'slip' : 'slips'}</small>}
        </div>
        <div><dt>Total collected</dt><dd>{money(metrics.collected)}</dd></div>
      </dl>
      <section className="debt-ledger" aria-label="Credit ledger">
        <div className="debt-views" role="group" aria-label="Ledger view">
          {[['ACCOUNTS', 'Customer accounts', accountCount], ['SLIPS', 'Credit slips', slipCount]].map(([id, label, count]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => onView(id)}>
              {label} <span>{unavailable ? '—' : count}</span>
            </button>
          ))}
        </div>
        <div className="debt-tools">
          <label>Search {noun}<input type="search" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder={accounts ? 'Name, phone, address or notes' : 'Name, phone, address or goods'} /></label>
          <label>Payment status<select value={status} onChange={(e) => onStatus(e.target.value)}>
            <option value="ALL">All statuses</option><option value="OWING">Owing</option>
            <option value="OVERDUE">Overdue</option><option value="SETTLED">Settled</option>
          </select></label>
          {filtered && <button type="button" className="workspace-chip" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div id="debt-results">
          {page.total === 0 ? (
            <div className="debt-empty" role="status">
              <h2>{loading ? 'Loading ledger…' : error ? 'Ledger unavailable' : filtered ? 'No matching ' + noun
                : accounts ? 'No customer accounts yet' : 'No credit slips yet'}</h2>
              {!loading && !error && <p>{filtered ? 'Try another search or payment status.'
                : 'Record a credit sale to start tracking a customer’s balance and due date.'}</p>}
            </div>
          ) : (
            <>
              <div className="debt-columns" aria-hidden="true"><span>{accounts ? 'Customer' : 'Credit slip'}</span><span>Balance</span><span>Payment status</span><span>Actions</span></div>
              <ul className="debt-rows">
                {page.rows.map((row) => {
                  const balance = Number(accounts ? row.total_balance_due : row.balance_due);
                  const owing = balance > 0 && (accounts || row.status === 'OWING');
                  const due = accounts ? row.earliest_due_date : row.due_date;
                  const overdueDays = accounts ? row.max_days_overdue : row.days_overdue;
                  return (
                    <li key={accounts ? row.customer_name : row.id}>
                      <div className="debt-person"><strong>{row.customer_name}</strong>
                        <small>{[row.phone, row.customer_address].filter(Boolean).join(' · ')}</small>
                        <small>{accounts ? `${row.active_credits_count} open / ${row.credit_count} slips` : row.items_summary}</small>
                      </div>
                      <div className="debt-amount"><strong>{formatMoney(balance)}</strong>
                        <small>Billed {formatMoney(accounts ? row.total_credit_taken : row.total_amount)}</small>
                        <small>Paid {formatMoney(accounts ? row.total_paid : row.amount_paid)}</small>
                      </div>
                      <div className="debt-status"><strong data-overdue={owing && row.is_overdue}>
                        {owing ? row.is_overdue ? 'Overdue' : 'Owing' : 'Settled'}
                      </strong>{owing && due && <small>Due {String(due).slice(0, 10)}</small>}
                        {owing && row.is_overdue && overdueDays > 0 && <small>{overdueDays} {overdueDays === 1 ? 'day' : 'days'} late</small>}
                      </div>
                      <div className="debt-row-actions">
                        {owing && <button className="workspace-chip" onClick={() => onPayment(row)}>Record payment</button>}
                        <button title="WhatsApp reminder" aria-label={'WhatsApp reminder for ' + row.customer_name} onClick={() => onReminder(row)}><MessageCircle size={16} /></button>
                        <button title="Customer statement" aria-label={'Statement for ' + row.customer_name} onClick={() => onStatement(row.customer_name)}><FileText size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <ListPagination list={page} label={accounts ? 'Customer accounts' : 'Credit slips'} targetId="debt-results" />
            </>
          )}
        </div>
      </section>
    </section>
  );
}
