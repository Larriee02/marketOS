import './reports.css';

function ReportFigures({ rows, formatMoney }) {
  return (
    <dl className="report-figures">
      {rows.map(([label, amount, note]) => (
        <div key={label}>
          <dt>{label}{note && <small>{note}</small>}</dt>
          <dd>{formatMoney(amount)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FinancialMetricsOverview({ metrics, formatNaira, dateRangeLabel }) {
  const {
    salesRevenue, salesCount, cogs, grossProfit, operatingExpenses, netOperatingProfit,
    grossMarginPercent, netMarginPercent, cashAvailable, cashInDrawer, posBalance,
    bankBalance, inventoryCostValue, inventoryRetailValue,
  } = metrics;

  return (
    <div className="report-overview">
      <section className="report-panel report-performance" aria-labelledby="report-performance-title">
        <header>
          <h2 id="report-performance-title">Profit &amp; loss</h2>
          <p>{dateRangeLabel}</p>
        </header>
        <ReportFigures formatMoney={formatNaira} rows={[
          ['Sales revenue', salesRevenue, `${salesCount} ${salesCount === 1 ? 'sale' : 'sales'}`],
          ['Cost of goods sold', cogs],
          ['Gross profit', grossProfit, salesRevenue > 0 ? `${grossMarginPercent.toFixed(1)}% gross margin` : null],
          ['Operating expenses', operatingExpenses],
        ]} />
        <div className="report-profit">
          <div><h3>{netOperatingProfit < 0 ? 'Net operating loss' : 'Net operating profit'}</h3>
            {salesRevenue > 0 && <small>{netMarginPercent.toFixed(1)}% net margin</small>}
          </div>
          <strong>{formatNaira(netOperatingProfit)}</strong>
        </div>
      </section>
      <section className="report-panel report-position" aria-labelledby="report-position-title">
        <header>
          <h2 id="report-position-title">Cash &amp; stock today</h2>
          <p>Current balances</p>
        </header>
        <ReportFigures formatMoney={formatNaira} rows={[
          ['Cash available', cashAvailable],
          ['Cash drawer', cashInDrawer],
          ['POS', posBalance],
          ['Bank', bankBalance],
        ]} />
        <div className="report-stock">
          <ReportFigures formatMoney={formatNaira} rows={[
            ['Inventory at cost', inventoryCostValue],
            ['Inventory at selling price', inventoryRetailValue],
          ]} />
        </div>
      </section>
    </div>
  );
}
