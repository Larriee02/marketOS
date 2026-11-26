export function OperatingExpenseBreakdown({ expenseBreakdown, formatNaira }) {
  return (
    <section className="report-panel report-expenses" aria-labelledby="report-expenses-title">
      <header><h2 id="report-expenses-title">Operating expenses by category</h2></header>
      {expenseBreakdown.length > 0 ? (
        <dl className="report-figures">
          {expenseBreakdown.map(({ category, amount }) => (
            <div key={category}><dt>{category}</dt><dd>{formatNaira(amount)}</dd></div>
          ))}
        </dl>
      ) : <p className="report-empty">No operating expenses in this period.</p>}
    </section>
  );
}
