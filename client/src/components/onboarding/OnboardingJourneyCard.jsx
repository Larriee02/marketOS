import { useState } from 'react';
import { Check, ChevronDown, ClipboardList, X } from 'lucide-react';

export function OnboardingJourneyCard({
  currentUser,
  products = [],
  transactions = [],
  movements = [],
  cashbookSession,
  onOpenBusinessSetup,
  onSeedStarter,
  onAddProduct,
  onOpenQuickStock,
  onGoToCounter,
  isDismissed,
  onToggleDismiss,
  formatCurrency,
}) {
  const [expanded, setExpanded] = useState(false);
  const shopReady = Boolean(currentUser?.business_name && (currentUser.address || currentUser.city) && cashbookSession?.todaySession);
  const hasProducts = products.length > 0;
  const hasStock = products.some((p) => Number(p.stock_quantity) > 0);
  const hasSale = movements.some((m) => m.movement_type === 'SALE') ||
    transactions.some((t) => t.type === 'INFLOW' && (t.category === 'SALES' || t.description?.toLowerCase().includes('sale')));

  const steps = [
    { title: 'Create your account', detail: currentUser?.email, done: true },
    { title: 'Set up your shop', done: shopReady,
      detail: shopReady ? `Starting cash: ${formatCurrency(cashbookSession.todaySession.opening_balance || 0)}` : 'Add your shop details and the cash you start with.',
      action: onOpenBusinessSetup, label: shopReady ? 'Edit shop details' : 'Set up shop' },
    { title: 'Add your products', done: hasProducts,
      detail: hasProducts ? `${products.length} in your catalog` : 'Enter an item yourself or start with 12 everyday Lagos provisions.',
      action: onAddProduct, label: 'Add product' },
    { title: 'Count your stock', done: hasStock, detail: 'Enter how many of each item you have on the shelf.',
      action: onOpenQuickStock, label: 'Set stock counts', disabled: !hasProducts },
    { title: 'Make your first sale', done: hasSale, detail: 'Choose an item, take payment and issue a receipt.',
      action: onGoToCounter, label: 'Open counter', disabled: !hasStock },
  ];
  const complete = steps.filter((step) => step.done).length;
  if (complete === steps.length) return null;

  if (isDismissed) {
    return <button className="setup-restore" onClick={() => { setExpanded(true); onToggleDismiss(); }}><ClipboardList size={16} /> Show shop setup</button>;
  }

  return (
    <section className="setup-sheet" aria-label="Shop setup">
      <div className="setup-head">
        <button className="setup-disclosure" aria-expanded={expanded} aria-controls="shop-setup-steps" onClick={() => setExpanded(!expanded)}>
          <ClipboardList size={21} aria-hidden="true" />
          <span className="setup-label"><strong>Set up your shop</strong><small>{complete} of {steps.length} steps complete</small></span>
          <span className="setup-meter" aria-hidden="true">
            {steps.map((step) => <i key={step.title} className={step.done ? 'done' : ''} />)}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button className="setup-hide" onClick={onToggleDismiss} aria-label="Hide checklist"><X size={16} /></button>
      </div>
      <ol id="shop-setup-steps" hidden={!expanded}>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="setup-step-icon" aria-hidden="true">{step.done ? <Check size={15} /> : index + 1}</span>
            <div className="setup-step-copy"><strong>{step.title}</strong>{step.done && <span className="sr-only">, completed</span>}<p>{step.detail}</p></div>
            {step.action && <div className="setup-actions">
              <button className="workspace-chip" disabled={step.disabled} onClick={step.action}>{step.label}</button>
              {!hasProducts && step.action === onAddProduct && <button className="workspace-chip" onClick={onSeedStarter}>Load starter products</button>}
            </div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
