import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarCheck, Download, Package, Plus, ShoppingCart, TriangleAlert, Users, Wallet } from 'lucide-react';

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

export function WorkspaceLedger({ entries, formatMoney, onViewAll, title = 'Today’s Live Ledger' }) {
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
                <p className="workspace-muted text-xs">{new Date(entry.transaction_date || entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {paymentLabels[entry.payment_method] || entry.payment_method || 'Cash'}</p>
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
  const actions = [
    ['Record Sale', 'Record New Sale', ShoppingCart, () => onSelect('counter')],
    ['Add Product', 'Add Stock', Plus, onAddProduct],
    ['Restock Goods', 'Restock', Package, () => onRestock()],
    ['Money In / Out', 'Cash Entry', Wallet, onMoney],
    ['Record Credit', 'Credit', Users, onCredit],
    ['Daily Closing', 'Closing', CalendarCheck, onClosing],
  ];
  const metrics = report?.data?.metrics;
  const firstName = user.full_name?.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const label = period === 'TODAY' ? 'Today’s' : period === 'WEEK' ? 'This week’s' : 'This month’s';
  return (
    <div className="workspace-home space-y-5">
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-title">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="workspace-muted">{user.business_name || 'Your shop'} · {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="workspace-period" aria-label="Reporting period">
            {[['TODAY', 'Today'], ['WEEK', 'This Week'], ['MONTH', 'This Month']].map(([id, text]) => (
              <button key={id} aria-pressed={period === id} onClick={() => onPeriod(id)}>{text}</button>
            ))}
          </div>
          <button className="workspace-icon-button" onClick={onExport} aria-label="Export cash ledger"><Download size={17} /></button>
        </div>
      </div>
      {report?.error && <p className="workspace-negative text-sm" role="status">{report.error}</p>}
      <div className="workspace-metrics">
        <WorkspaceMetric label={`${label} revenue`} value={metrics ? formatMoney(metrics.salesRevenue) : '—'} detail={metrics ? `${metrics.salesCount} sales recorded` : 'Sales report'} icon={ArrowUpRight} />
        <WorkspaceMetric label="Cash in drawer" value={session ? formatMoney(session.expectedClosingCash) : '—'} detail={session ? 'Expected cash balance' : 'Daily register'} icon={Wallet} />
        <WorkspaceMetric label="Total stock value" value={loading ? '—' : formatMoney(dashboard.inventory_retail_value)} detail={`${products.length} ${products.length === 1 ? 'product' : 'products'} in the catalog`} icon={Package} />
        <WorkspaceMetric label="Estimated profit" value={metrics ? formatMoney(metrics.netOperatingProfit) : '—'} detail={metrics ? `Net margin: ${metrics.netMarginPercent.toFixed(1)}%` : 'Sales less cost and expenses'} icon={BarChart3} />
      </div>
      <section className="workspace-quick-actions">
        <h2 className="workspace-caption">Immediate Desk Actions</h2>
        <div>
          {actions.map(([text, mobileLabel, Icon, handler], index) => (
            <button className={index === 0 ? 'workspace-primary' : 'workspace-action'} key={text} onClick={handler}><Icon size={18} /><span className="hidden sm:inline">{text}</span><span className="sm:hidden">{mobileLabel}</span></button>
          ))}
        </div>
      </section>
      <div className="workspace-columns">
        <div className="workspace-home-feed min-w-0">
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header">
              <h2><TriangleAlert size={17} className="inline-block workspace-negative mr-1" />Stock Warnings</h2>
              <button className="workspace-chip" onClick={() => onSelect('inventory')}>Manage inventory</button>
            </div>
            {stockWarnings.length === 0 && <p className="workspace-muted text-sm">No products at the reorder threshold.</p>}
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
          <WorkspaceLedger entries={entries} formatMoney={formatMoney} onViewAll={() => onSelect('cashbook')} title={`${label} live ledger`} />
        </div>
        <div className="space-y-4 min-w-0">
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header"><h2>Credit &amp; Debtors</h2><Users size={18} /></div>
            <div className="workspace-inset"><p>Outstanding customer debt</p><strong>{loading ? '—' : formatMoney(dashboard.total_credit_owed)}</strong><p>{dashboard.active_debtors_count || 0} active accounts</p></div>
            <button className="workspace-chip" onClick={() => onSelect('debtors')}>View debtors</button>
          </section>
          <section className="workspace-panel space-y-3">
            <div className="workspace-panel-header"><h2>Closing Prep</h2><CalendarCheck size={18} /></div>
            <div className="workspace-inset">{session?.todaySession?.status === 'CLOSED' ? 'Today’s register is closed.' : 'Compare the physical drawer against the recorded cash balance.'}</div>
            <button className="workspace-chip" onClick={onClosing}>Preview daily closing</button>
          </section>
        </div>
      </div>
    </div>
  );
}
