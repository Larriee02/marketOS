import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import './stock-count.css';

/**
 * Physical Stock Count / Audit Workflow Modal
 *
 * Compares system expected inventory against physical counted quantities on shelves,
 * highlights variances, tags loss reasons (damaged, expired, missing, surplus),
 * and reconciles the store inventory in one atomic operation.
 */
export function PhysicalStockAuditModal({
  isOpen,
  onClose,
  products = [],
  apiFetch,
  formatCurrency,
  toastSuccess,
  toastError,
  onReconcileSuccess,
}) {
  const [counts, setCounts] = useState({}); // { [productId]: { actual_count: number|string, reason: string, note: string } }
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [auditNote, setAuditNote] = useState('Weekly Physical Shelf Audit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'Provisions'));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (category !== 'ALL' && (p.category || 'Provisions') !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [products, category, search]);

  const handleSetActualCount = (productId, val) => {
    setCounts((prev) => {
      const existing = prev[productId] || {};
      return {
        ...prev,
        [productId]: {
          ...existing,
          actual_count: val,
        },
      };
    });
  };

  const handleSetReason = (productId, reason) => {
    setCounts((prev) => {
      const existing = prev[productId] || {};
      return {
        ...prev,
        [productId]: {
          ...existing,
          reason,
        },
      };
    });
  };

  // Prefill all physical counts with current expected stock for rapid audits
  const handlePrefillExpected = () => {
    setCounts((previous) => {
      const next = { ...previous };
      for (const product of products) {
        if (next[product.id]?.actual_count == null || next[product.id].actual_count === '') {
          next[product.id] = { actual_count: Number(product.stock_quantity) };
        }
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setCounts({});
  };

  // Summary Metrics
  const auditSummary = useMemo(() => {
    let auditedCount = 0;
    let balancedCount = 0;
    let discrepancyCount = 0;
    let netVarianceValue = 0;

    for (const p of products) {
      const item = counts[p.id];
      if (item && item.actual_count !== '' && item.actual_count !== undefined) {
        auditedCount++;
        const actual = Number(item.actual_count);
        const expected = Number(p.stock_quantity);
        const diff = Number((actual - expected).toFixed(2));
        const valDiff = diff * Number(p.cost_price || 0);
        netVarianceValue += valDiff;

        if (diff === 0) {
          balancedCount++;
        } else {
          discrepancyCount++;
        }
      }
    }

    return {
      auditedCount,
      balancedCount,
      discrepancyCount,
      netVarianceValue,
    };
  }, [products, counts]);

  const handleSaveAudit = async () => {
    if (isSubmitting) return;
    const payloadCounts = [];

    for (const p of products) {
      const item = counts[p.id];
      if (item && item.actual_count !== '' && !Number.isNaN(Number(item.actual_count))) {
        const actual = Number(item.actual_count);
        const expected = Number(p.stock_quantity);
        const diff = Number((actual - expected).toFixed(2));

        if (!Number.isFinite(actual) || actual < 0) {
          toastError?.('Counts must be zero or greater.');
          return;
        }
        let autoReason = item.reason || (diff > 0 ? 'SURPLUS' : 'MISSING');
        if (diff === 0) autoReason = 'ADJUSTMENT';

        payloadCounts.push({
          product_id: p.id,
          actual_count: actual,
          reason: autoReason,
          note: item.note || auditNote,
        });
      }
    }

    if (payloadCounts.length === 0) {
      toastError?.('Please enter physical counts for at least one product.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/v1/inventory/stock-count', {
        method: 'POST',
        body: JSON.stringify({
          counts: payloadCounts,
          auditNote,
        }),
      });

      toastSuccess?.(
        `Audit saved! Reconciled ${res.totalAudited} items (${res.discrepancyCount} discrepancy movements logged).`
      );
      setCounts({});
      onReconcileSuccess?.();
      onClose();
    } catch (err) {
      toastError?.(err.message || 'Failed to reconcile stock count.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Count stock"
      subtitle="Enter shelf counts to review differences before saving."
      maxWidth="max-w-5xl"
      panelClassName="stock-count-panel"
    >
      <div className="stock-count-layout">
        <dl className="stock-count-summary">
          <div><dt>Counted</dt><dd>{auditSummary.auditedCount} / {products.length}</dd></div>
          <div><dt>Matched</dt><dd>{auditSummary.balancedCount}</dd></div>
          <div><dt>Differences</dt><dd>{auditSummary.discrepancyCount}</dd></div>
          <div><dt>Net cost difference</dt><dd>{formatCurrency(auditSummary.netVarianceValue)}</dd></div>
        </dl>

        {/* Filters & Rapid Tools */}
        <div className="stock-count-toolbar">
          <div className="stock-count-filters">
            <div className="relative min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                type="text"
                placeholder="Search product or SKU"
                aria-label="Search product or SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="liquid-input w-full pl-8 pr-3 py-1.5 text-xs rounded-xl"
              />
            </div>

            <select
              aria-label="Product category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="liquid-input text-xs rounded-xl px-2.5 py-1.5"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrefillExpected}
              className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-xs font-bold text-theme-brand hover:opacity-80 flex items-center gap-1 cursor-pointer"
            >
              <span>Fill blanks with expected</span>
            </button>
            {Object.keys(counts).length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-theme-outflow hover:bg-white/10 rounded-lg px-2 cursor-pointer"
              >
                Clear counts
              </button>
            )}
          </div>
        </div>

        {/* Audit Sheet Table */}
        <div className="stock-count-sheet">
          <table className="stock-count-table w-full text-left text-sm">
            <thead className="stock-count-table-header">
              <tr>
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3 text-right">Expected Stock</th>
                <th className="py-2.5 px-3 text-center w-28">Actual Count</th>
                <th className="py-2.5 px-3 text-right">Difference</th>
                <th className="py-2.5 px-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-divider">
              {filteredProducts.length === 0 && <tr><td colSpan={5} className="p-5 text-theme-secondary">{products.length ? "No products match your filters." : "Add products before starting a stock count."}</td></tr>}
              {filteredProducts.map((p) => {
                const item = counts[p.id] || {};
                const hasInput = item.actual_count !== '' && item.actual_count !== undefined;
                const actual = hasInput ? Number(item.actual_count) : null;
                const expected = Number(p.stock_quantity);
                const diff = hasInput ? Number((actual - expected).toFixed(2)) : null;
                const costPrice = Number(p.cost_price || 0);

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-white/30 dark:hover:bg-white/5 transition ${
                      hasInput && diff !== 0
                        ? diff < 0
                          ? 'bg-rose-500/5'
                          : 'bg-blue-500/5'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 min-w-[140px]">
                      <p className="font-extrabold text-theme-primary">{p.name}</p>
                      <p className="text-[10px] text-theme-secondary font-mono">
                        {p.sku} • {p.unit}
                      </p>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-theme-secondary tabular-nums">
                      {expected} {p.unit}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Actual count for ${p.name}`}
                        placeholder="Count"
                        value={item.actual_count ?? ''}
                        onChange={(e) => handleSetActualCount(p.id, e.target.value)}
                        className={`liquid-input w-24 text-center py-1 px-2 rounded-xl text-xs font-mono font-bold ${
                          hasInput && diff !== 0
                            ? diff < 0
                              ? 'border-rose-500 font-black'
                              : 'border-blue-500 font-black'
                            : ''
                        }`}
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {hasInput ? (
                        diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 0
                          </span>
                        ) : diff < 0 ? (
                          <div className="text-right">
                            <span className="text-[11px] font-black text-rose-500">
                              {diff} {p.unit}
                            </span>
                            <p className="text-[9px] text-theme-secondary">
                              -{formatCurrency(Math.abs(diff) * costPrice)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[11px] font-black text-blue-500">
                              +{diff} {p.unit}
                            </span>
                            <p className="text-[9px] text-theme-secondary">
                              +{formatCurrency(diff * costPrice)}
                            </p>
                          </div>
                        )
                      ) : (
                        <span className="text-theme-secondary text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 min-w-[140px]">
                      {hasInput && diff !== 0 ? (
                        diff < 0 ? (
                          <select
                            aria-label={`Reason for ${p.name}`}
                            value={item.reason || 'MISSING'}
                            onChange={(e) => handleSetReason(p.id, e.target.value)}
                            className="liquid-input text-[11px] py-1 px-2 rounded-xl font-bold w-full"
                          >
                            <option value="MISSING">Missing / Theft / Loss</option>
                            <option value="DAMAGED">Damaged / Broken / Spilled</option>
                            <option value="EXPIRED">Expired Goods</option>
                            <option value="ADJUSTMENT">Recount Adjustment</option>
                          </select>
                        ) : (
                          <select
                            aria-label={`Reason for ${p.name}`}
                            value={item.reason || 'SURPLUS'}
                            onChange={(e) => handleSetReason(p.id, e.target.value)}
                            className="liquid-input text-[11px] py-1 px-2 rounded-xl font-bold w-full"
                          >
                            <option value="SURPLUS">Surplus / Extra Found</option>
                            <option value="ADJUSTMENT">Recount Adjustment</option>
                          </select>
                        )
                      ) : (
                        <span className="text-theme-secondary text-[10px]">
                          {hasInput ? 'In Balance' : 'Uncounted'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="stock-count-footer">
          <label className="stock-count-note">
            Audit note
            <input type="text" value={auditNote} onChange={(event) => setAuditNote(event.target.value)}
              className="liquid-input w-full px-3 py-2 rounded-lg text-sm" />
          </label>
          <div className="stock-count-actions">
            <button type="button" className="workspace-chip" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="button" className="workspace-primary" disabled={isSubmitting || auditSummary.auditedCount === 0}
              onClick={handleSaveAudit}>
              {isSubmitting ? 'Saving…' : 'Save stock count'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
