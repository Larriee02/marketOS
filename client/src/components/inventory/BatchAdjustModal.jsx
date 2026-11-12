import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  X,
  PackageCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const MOVEMENT_TYPES = [
  { id: 'SALE', label: 'Sold (- Record Items Sold)', direction: 'subtract', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { id: 'RESTOCK', label: 'Restock (+ Add Stock)', direction: 'add', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'DAMAGED', label: 'Damaged / Broken (-)', direction: 'subtract', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'EXPIRED', label: 'Expired (-)', direction: 'subtract', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'MISSING', label: 'Missing / Loss (-)', direction: 'subtract', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'SURPLUS', label: 'Surplus (+ Found Extra)', direction: 'add', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { id: 'ADJUSTMENT', label: 'Manual Adjustment', direction: 'neutral', color: 'text-zinc-300 bg-zinc-800 border-zinc-700' },
];

export function BatchAdjustModal({
  isOpen,
  onClose,
  products = [],
  apiFetch,
  formatCurrency,
  toastSuccess,
  toastError,
  onSuccess,
}) {
  // Map of product_id -> { quantity: number|string, mode: 'DELTA'|'SET_COUNT', movement_type: string, note: string }
  const [items, setItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [globalReason, setGlobalReason] = useState('RESTOCK');
  const [globalNote, setGlobalNote] = useState('Multi-Product Inventory Adjustment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available products not yet added to batch
  const unselectedProducts = useMemo(() => {
    return products.filter((p) => !items[p.id]);
  }, [products, items]);

  const filteredUnselected = useMemo(() => {
    if (!searchTerm.trim()) return unselectedProducts.slice(0, 10);
    const q = searchTerm.toLowerCase();
    return unselectedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [unselectedProducts, searchTerm]);

  // Selected products list with metadata
  const selectedList = useMemo(() => {
    const list = [];
    for (const [idStr, state] of Object.entries(items)) {
      const prod = products.find((p) => String(p.id) === String(idStr));
      if (prod) {
        list.push({ product: prod, ...state });
      }
    }
    return list;
  }, [items, products]);

  // Add single product
  const handleAddProduct = (prod) => {
    setItems((prev) => ({
      ...prev,
      [prod.id]: {
        quantity: '',
        mode: 'DELTA',
        movement_type: globalReason,
        note: '',
      },
    }));
  };

  // Add all visible filtered products
  const handleAddAllFiltered = () => {
    setItems((prev) => {
      const updated = { ...prev };
      filteredUnselected.forEach((prod) => {
        if (!updated[prod.id]) {
          updated[prod.id] = {
            quantity: '',
            mode: 'DELTA',
            movement_type: globalReason,
            note: '',
          };
        }
      });
      return updated;
    });
  };

  // Remove single product
  const handleRemoveProduct = (productId) => {
    setItems((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Update item field
  const updateItemField = (productId, field, value) => {
    setItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  // Apply reason to all currently added items
  const handleApplyGlobalReason = (reason) => {
    setGlobalReason(reason);
    setItems((prev) => {
      const updated = {};
      for (const [k, v] of Object.entries(prev)) {
        updated[k] = { ...v, movement_type: reason };
      }
      return updated;
    });
  };

  // Metrics summary
  const summary = useMemo(() => {
    let totalItems = 0;
    let validAdjustments = 0;
    let netStockDiff = 0;
    let netValueImpact = 0;
    const errors = [];

    selectedList.forEach(({ product, quantity, mode, movement_type }) => {
      totalItems++;
      const curStock = Number(product.stock_quantity) || 0;
      const numVal = Number(quantity);

      if (quantity === '' || Number.isNaN(numVal)) {
        return;
      }

      validAdjustments++;
      let stockDiff = 0;

      if (mode === 'SET_COUNT') {
        if (numVal < 0) {
          errors.push(`${product.name}: Count cannot be negative`);
          return;
        }
        stockDiff = numVal - curStock;
      } else {
        // DELTA
        if (['SALE', 'DAMAGED', 'EXPIRED', 'MISSING'].includes(movement_type)) {
          const deduct = Math.abs(numVal);
          if (curStock < deduct) {
            errors.push(`${product.name}: Deduction (${deduct}) exceeds current stock (${curStock})`);
          }
          stockDiff = -deduct;
        } else if (['RESTOCK', 'SURPLUS'].includes(movement_type)) {
          stockDiff = Math.abs(numVal);
        } else {
          // Manual general adjustment
          stockDiff = numVal;
          if (curStock + stockDiff < 0) {
            errors.push(`${product.name}: Resulting stock cannot be negative`);
          }
        }
      }

      netStockDiff += stockDiff;
      const unitPrice =
        movement_type === 'SALE'
          ? Number(product.selling_price) || 0
          : Number(product.cost_price) || 0;
      netValueImpact +=
        movement_type === 'SALE'
          ? Math.abs(stockDiff) * unitPrice
          : stockDiff * unitPrice;
    });

    return {
      totalItems,
      validAdjustments,
      netStockDiff,
      netValueImpact,
      errors,
    };
  }, [selectedList]);

  const handleSubmit = async () => {
    if (summary.validAdjustments === 0) {
      toastError?.('Please enter valid quantities for at least one product.');
      return;
    }
    if (summary.errors.length > 0) {
      toastError?.(summary.errors[0]);
      return;
    }

    const payload = {
      adjustments: selectedList
        .filter((item) => item.quantity !== '' && !Number.isNaN(Number(item.quantity)))
        .map((item) => ({
          product_id: item.product.id,
          quantity: Number(item.quantity),
          mode: item.mode,
          movement_type: item.movement_type,
          note: item.note?.trim() || globalNote,
        })),
    };

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/api/v1/inventory/batch-adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toastSuccess?.(
        `Successfully updated ${data?.updatedCount || payload.adjustments.length} product(s) and logged in History!`
      );
      setItems({});
      onSuccess?.();
      onClose();
    } catch (err) {
      toastError?.(err.message || 'An error occurred while saving batch adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Multi-Product Stock Adjustments"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5">
        {/* Banner / Instructions */}
        <div className="p-4 liquid-glass-subtle rounded-2xl text-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              style={{
                backgroundColor: 'var(--brand-blue-soft)',
                borderColor: 'var(--brand-blue-border)',
                color: 'var(--brand-blue)',
              }}
              className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-theme-primary">
                Simultaneous Batch Stock Update
              </p>
              <p className="text-xs text-theme-secondary">
                Record sales, log restocks, write off expired or damaged goods, or adjust shelves across multiple products simultaneously.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-theme-secondary">Quick Reason:</span>
            <select
              value={globalReason}
              onChange={(e) => handleApplyGlobalReason(e.target.value)}
              className="liquid-input text-xs rounded-xl px-2.5 py-1.5 font-semibold"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Picker Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Product Search & Quick Add */}
          <div className="md:col-span-5 liquid-glass-subtle rounded-2xl p-3 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider">
                Select Products ({unselectedProducts.length} available)
              </span>
              {filteredUnselected.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllFiltered}
                  className="text-xs text-theme-brand hover:underline font-bold cursor-pointer"
                >
                  + Add Filtered ({filteredUnselected.length})
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-theme-muted" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 liquid-input rounded-xl text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredUnselected.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-theme-muted">
                  <PackageCheck className="w-8 h-8 mb-2 opacity-60 text-theme-brand" />
                  <p className="text-xs">
                    {unselectedProducts.length === 0
                      ? 'All store products are in the batch list.'
                      : 'No unselected products match search.'}
                  </p>
                </div>
              ) : (
                filteredUnselected.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="flex items-center justify-between p-2.5 rounded-xl liquid-glass hover:opacity-90 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-theme-primary truncate group-hover:text-theme-brand">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-theme-secondary">
                        SKU: {prod.sku || 'N/A'} • On Hand:{' '}
                        <span className="font-bold text-theme-primary">{prod.stock_quantity}</span>{' '}
                        {prod.unit || 'units'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-lg liquid-glass-subtle group-hover:liquid-btn-primary text-theme-secondary flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Selected Adjustment Table */}
          <div className="md:col-span-7 liquid-glass-subtle rounded-2xl p-3 flex flex-col h-[400px]">
            <div
              style={{ borderColor: 'var(--border-outer)' }}
              className="flex items-center justify-between mb-2 pb-2 border-b"
            >
              <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-theme-brand" />
                Adjustment Batch ({selectedList.length} item{selectedList.length === 1 ? '' : 's'})
              </span>
              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems({})}
                  className="text-xs font-bold text-theme-outflow hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-theme-muted">
                  <SlidersHorizontal className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-bold text-theme-secondary">Batch is currently empty</p>
                  <p className="text-[11px] text-theme-muted mt-1 max-w-xs">
                    Select products from the left panel to build your stock adjustment batch.
                  </p>
                </div>
              ) : (
                selectedList.map(({ product, quantity, mode, movement_type, note }) => {
                  const curStock = Number(product.stock_quantity) || 0;
                  const numVal = Number(quantity);
                  let projectedStock = curStock;
                  let diff = 0;

                  if (quantity !== '' && !Number.isNaN(numVal)) {
                    if (mode === 'SET_COUNT') {
                      projectedStock = numVal;
                      diff = projectedStock - curStock;
                    } else {
                      if (['SALE', 'DAMAGED', 'EXPIRED', 'MISSING'].includes(movement_type)) {
                        diff = -Math.abs(numVal);
                      } else if (['RESTOCK', 'SURPLUS'].includes(movement_type)) {
                        diff = Math.abs(numVal);
                      } else {
                        diff = numVal;
                      }
                      projectedStock = curStock + diff;
                    }
                  }

                  const isError =
                    projectedStock < 0 ||
                    (mode === 'SET_COUNT' && numVal < 0);

                  return (
                    <div
                      key={product.id}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isError
                          ? 'bg-red-500/10 border-red-500/40'
                          : 'liquid-glass'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-theme-primary truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-theme-secondary">
                            <span>SKU: {product.sku || 'N/A'}</span>
                            <span>•</span>
                            <span>
                              Shelf: <strong className="text-theme-primary">{curStock}</strong> {product.unit}
                            </span>
                            {product.cost_price > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  {movement_type === 'SALE'
                                    ? `Price: ${formatCurrency(product.selling_price)}`
                                    : `Cost: ${formatCurrency(product.cost_price)}`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-theme-muted hover:text-theme-outflow p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Controls grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        {/* Reason / Movement Type */}
                        <div>
                          <label className="block text-[9px] text-theme-secondary uppercase font-bold mb-0.5">
                            Reason
                          </label>
                          <select
                            value={movement_type}
                            onChange={(e) =>
                              updateItemField(product.id, 'movement_type', e.target.value)
                            }
                            className="w-full liquid-input rounded-lg px-2 py-1 text-[11px] font-semibold"
                          >
                            {MOVEMENT_TYPES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mode & Quantity */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[9px] text-theme-secondary uppercase font-bold">
                              {mode === 'DELTA' ? 'Units Change' : 'New Total'}
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateItemField(
                                  product.id,
                                  'mode',
                                  mode === 'DELTA' ? 'SET_COUNT' : 'DELTA'
                                )
                              }
                              className="text-[9px] font-bold text-theme-brand hover:underline cursor-pointer"
                            >
                              Switch to {mode === 'DELTA' ? 'Set Total' : '+/- Diff'}
                            </button>
                          </div>
                          <input
                            type="number"
                            min={mode === 'SET_COUNT' ? '0' : undefined}
                            placeholder={mode === 'DELTA' ? 'e.g. 10 or 3' : `Shelf count`}
                            value={quantity}
                            onChange={(e) =>
                              updateItemField(product.id, 'quantity', e.target.value)
                            }
                            className="w-full liquid-input rounded-lg px-2 py-1 text-xs font-bold"
                          />
                        </div>

                        {/* Outcome Preview */}
                        <div className="flex flex-col justify-end liquid-glass-subtle p-1.5 rounded-lg">
                          <span className="text-[9px] text-theme-secondary uppercase font-bold">Projected Stock</span>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-theme-primary">
                              {curStock} <ArrowRight className="w-3 h-3 inline text-theme-muted mx-0.5" />
                              <span
                                className={
                                  isError
                                    ? 'text-theme-outflow'
                                    : diff > 0
                                    ? 'text-theme-inflow'
                                    : diff < 0
                                    ? 'text-theme-warning'
                                    : 'text-theme-primary'
                                }
                              >
                                {projectedStock}
                              </span>
                            </span>
                            {diff !== 0 && (
                              <span
                                className={`text-[10px] font-bold ${
                                  diff > 0 ? 'text-theme-inflow' : 'text-theme-outflow'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Optional Note */}
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="Optional line note (e.g., invoice #, rack location, customer)"
                          value={note}
                          onChange={(e) => updateItemField(product.id, 'note', e.target.value)}
                          className="w-full liquid-input rounded-lg px-2 py-1 text-[10px]"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Global Batch Notes & Impact Summary */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3.5 liquid-glass-subtle rounded-2xl">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-theme-primary mb-1">
              General Batch Reference Note
            </label>
            <input
              type="text"
              value={globalNote}
              onChange={(e) => setGlobalNote(e.target.value)}
              placeholder="e.g. Weekly restock from Alaba Market or Counter sales batch"
              className="w-full liquid-input rounded-xl px-3 py-1.5 text-xs"
            />
          </div>

          <div className="md:col-span-6 grid grid-cols-3 gap-2 text-center">
            <div className="liquid-glass p-2 rounded-xl">
              <span className="text-[10px] font-bold text-theme-secondary block uppercase">Products Ready</span>
              <span className="text-sm font-extrabold font-luxury text-theme-primary">
                {summary.validAdjustments} / {summary.totalItems}
              </span>
            </div>
            <div className="liquid-glass p-2 rounded-xl">
              <span className="text-[10px] font-bold text-theme-secondary block uppercase">Net Units</span>
              <span
                className={`text-sm font-extrabold font-luxury ${
                  summary.netStockDiff > 0
                    ? 'text-theme-inflow'
                    : summary.netStockDiff < 0
                    ? 'text-theme-outflow'
                    : 'text-theme-primary'
                }`}
              >
                {summary.netStockDiff > 0 ? `+${summary.netStockDiff}` : summary.netStockDiff}
              </span>
            </div>
            <div className="liquid-glass p-2 rounded-xl">
              <span className="text-[10px] font-bold text-theme-secondary block uppercase">Est. Value</span>
              <span
                className={`text-xs font-extrabold font-luxury truncate block ${
                  summary.netValueImpact > 0
                    ? 'text-theme-inflow'
                    : summary.netValueImpact < 0
                    ? 'text-theme-outflow'
                    : 'text-theme-primary'
                }`}
              >
                {formatCurrency(summary.netValueImpact)}
              </span>
            </div>
          </div>
        </div>

        {summary.errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-theme-outflow text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{summary.errors[0]}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div
          style={{ borderColor: 'var(--border-outer)' }}
          className="flex items-center justify-end gap-3 pt-2 border-t"
        >
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || summary.validAdjustments === 0 || summary.errors.length > 0}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Applying Batch Adjustments...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Apply {summary.validAdjustments} Stock Adjustment{summary.validAdjustments === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
