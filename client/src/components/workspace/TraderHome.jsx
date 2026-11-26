import { useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarCheck, ChevronDown, Download, Package, ShoppingBasket, Store, TriangleAlert, Users, Wallet } from 'lucide-react';

import './trader-home.css';

const paymentLabels = { CASH: 'Cash', BANK_TRANSFER: 'Transfer', POS: 'POS', MOBILE_MONEY: 'Mobile wallet' };

export function WorkspaceMetric({ label, value, detail, icon: Icon }) {
  return (
    <article className="workspace-panel workspace-metric">
      <div className="workspace-metric-label"><span>{label}</span><span className="workspace-glyph"><Icon size={17} /></span></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function WorkspaceLedger({ entries, formatMoney, locale, timeZone, onViewAll, title = 'Today’s Live Ledger' }) {
  const [kind, setKind] = useState('ALL');
  const filtered = entries.filter((entry) => kind === 'ALL' || entry.type === kind);
  return (
    <section className="workspace-panel space-y-3">
      <div className="workspace-panel-header">
        <div><h2>{title}</h2><p>Sales and cash movements</p></div>
        <div className="flex flex-wrap gap-1.5">
          <select className="workspace-chip" aria-label="Filter ledger entries" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="ALL">All entries</option><option value="INFLOW">Money in</option><option value="OUTFLOW">Money out</option>
          </select>
          <button className="workspace-chip" onClick={onViewAll}>View all</button>
        </div>
      </div>
      {filtered.length === 0 && <p className="workspace-muted py-4 text-sm">No entries for this view.</p>}
      <ul className="divide-y divide-[var(--border-outer)]">
        {filtered.slice(0, 5).map((entry) => {
          const outgoing = entry.type === 'OUTFLOW';
          const Icon = outgoing ? ArrowUpRight : ArrowDownLeft;
          return (
            <li className="workspace-ledger-row" key={entry.id}>
              <span className={`workspace-glyph ${outgoing ? 'workspace-negative' : 'workspace-positive'}`}><Icon size={17} /></span>
              <div className="min-w-0">
                <p className="break-words font-semibold">{entry.description || entry.category || 'Cash entry'}</p>
                <p className="workspace-muted text-xs">{new Date(entry.transaction_date || entry.created_at).toLocaleTimeString(locale, { timeZone, hour: '2-digit', minute: '2-digit' })} · {paymentLabels[entry.payment_method] || entry.payment_method || 'Cash'}</p>
              </div>
              <b className={outgoing ? 'workspace-negative' : 'workspace-positive'}>{outgoing ? '−' : '+'}{formatMoney(entry.amount)}</b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TraderHome({ user, dashboard, products, session, report, loading, period, onPeriod, entries, formatMoney, onSelect, onRestock, onAddProduct, onMoney, onCredit, onClosing, onExport }) {
  const stockWarnings = products.filter((product) => Number(product.stock_quantity) <= Number(product.reorder_level));
  const metrics = report?.data?.metrics;
  const firstName = user.full_name?.trim().split(/\s+/)[0];
  const timeZone = user.time_zone || 'UTC';
  const locale = user.locale || 'en-NG';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const label = period === 'TODAY' ? 'Today’s' : period === 'WEEK' ? 'This week’s' : 'This month’s';
  const hasCatalog = products.length > 0 || loading;
  const today = new Date();
  return (
    <div className="workspace-home trader-home">
      <header className="trader-heading">
        <div className="trader-shop-name"><Store size={17} aria-hidden="true" />{user.business_name || 'Your shop'}</div>
        <h1>{greeting}{firstName && <>, <em>{firstName}</em></>}</h1>
        <time className="trader-date" dateTime={today.toLocaleDateString('en-CA', { timeZone })}>
          {today.toLocaleDateString(locale, { timeZone, weekday: 'long', month: 'long', day: 'numeric' })}
        </time>
      </header>

      <section aria-label="Shop tasks" className="trader-tasks">
        <button type="button" className="trader-sale" onClick={() => onSelect('counter')}>
          <span className="trader-sale-icon"><ShoppingBasket size={25} aria-hidden="true" /></span>
          <span className="trader-sale-footer">
            <span>Make a sale</span>
            <span className="trader-sale-arrow"><ArrowRight size={20} aria-hidden="true" /></span>
          </span>
        </button>

        <button type="button" className="trader-task trader-stock" aria-label={hasCatalog ? 'Check stock' : 'Add your first product'} onClick={hasCatalog ? () => onSelect('inventory') : onAddProduct}>
          <span className="trader-task-icon"><Package aria-hidden="true" /></span>
          <span className="trader-task-body">
            <strong>{hasCatalog ? 'Check stock' : 'Add your first product'}</strong>
            {!loading && products.length > 0 && <small>{products.length} {products.length === 1 ? 'product' : 'products'}{stockWarnings.length > 0 && ` · ${stockWarnings.length} running low`}</small>}
          </span>
          <ArrowUpRight size={19} className="trader-task-arrow" aria-hidden="true" />
        </button>

        <button type="button" className="trader-task trader-money" onClick={onMoney}>
          <span className="trader-task-icon"><Wallet aria-hidden="true" /></span>
          <span className="trader-task-body"><strong>Record money in or out</strong></span>
          <ArrowUpRight size={19} className="trader-task-arrow" aria-hidden="true" />
        </button>
      </section>

      <details className="workspace-panel trader-figures">
        <summary><span>Shop figures and activity</span><ChevronDown size={18} className="trader-disclosure" aria-hidden="true" /></summary>
        <div className="trader-figures-toolbar">
          <div className="workspace-period" aria-label="Reporting period">
            {[['TODAY', 'Today'], ['WEEK', 'This Week'], ['MONTH', 'This Month']].map(([id, text]) => (
              <button key={id} aria-pressed={period === id} onClick={() => onPeriod(id)}>{text}</button>
            ))}
          </div>
          <button className="workspace-icon-button" onClick={onExport} aria-label="Export cash ledger"><Download size={16} aria-hidden="true" /> Export ledger</button>
        </div>
      {report?.error && <p className="workspace-negative text-sm" role="status">{report.error}</p>}
      <div className="workspace-metrics trader-figures-metrics">
        <WorkspaceMetric label={`${label} sales`} value={metrics ? formatMoney(metrics.salesRevenue) : '—'} detail={metrics ? `${metrics.salesCount} sales recorded` : 'Sales report'} icon={ArrowUpRight} />
        <WorkspaceMetric label="Cash in drawer" value={session ? formatMoney(session.expectedClosingCash) : '—'} detail={session ? 'Expected cash balance' : 'Daily register'} icon={Wallet} />
        <WorkspaceMetric label="Total stock value" value={loading ? '—' : formatMoney(dashboard.inventory_retail_value)} detail={`${products.length} ${products.length === 1 ? 'product' : 'products'} in the catalog`} icon={Package} />
        <WorkspaceMetric label="Estimated profit" value={metrics ? formatMoney(metrics.netOperatingProfit) : '—'} detail={metrics ? `Net margin: ${metrics.netMarginPercent.toFixed(1)}%` : 'Sales less cost and expenses'} icon={BarChart3} />
      </div>
      <div className="workspace-columns">
        <div className="workspace-home-feed min-w-0">
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header">
              <h2><TriangleAlert size={17} className="inline-block workspace-negative mr-1" />Running low</h2>
              <button className="workspace-chip" onClick={() => onSelect('inventory')}>View stock</button>
            </div>
            {stockWarnings.length === 0 && <p className="workspace-muted text-sm">No items are running low.</p>}
            <ul className="space-y-2">
              {stockWarnings.slice(0, 4).map((product) => (
                <li className="workspace-warning-row" key={product.id}>
                  <span className="workspace-glyph"><Package size={17} /></span>
                  <div className="min-w-0 flex-1"><b>{product.name}</b><p className="workspace-muted">{product.stock_quantity} {product.unit} left · Reorder at {product.reorder_level}</p></div>
                  <button className="workspace-chip" onClick={() => onRestock(product)}>Restock</button>
                </li>
              ))}
            </ul>
          </section>
          <WorkspaceLedger locale={locale} timeZone={timeZone} entries={entries} formatMoney={formatMoney} onViewAll={() => onSelect('cashbook')} title={`${label} money in and out`} />
        </div>
        <div className="space-y-4 min-w-0">
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header"><h2>Customers who owe you</h2><Users size={18} /></div>
            <div className="workspace-inset"><p>Outstanding customer debt</p><strong>{loading ? '—' : formatMoney(dashboard.total_credit_owed)}</strong><p>{dashboard.active_debtors_count || 0} active accounts</p></div>
            <button className="workspace-chip" onClick={() => onSelect('debtors')}>See customer debts</button>
            <button className="workspace-chip" onClick={onCredit}>Record a debt</button>
          </section>
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header"><h2>End of day</h2><CalendarCheck size={18} /></div>
            <div className="workspace-inset">{session?.todaySession?.status === 'CLOSED' ? 'Today’s register is closed.' : 'Count your cash and check it against your sales.'}</div>
            <button className="workspace-chip" onClick={onClosing}>Check today’s cash</button>
          </section>
        </div>
      </div>
      </details>
    </div>
  );
}
