import { apiFetch } from './api';

export async function downloadShopExport(shopId, signal) {
  const { profile, collections } = await apiFetch('/api/v1/shop-export', { signal });
  const checkOwner = (id) => {
    if (String(id) !== String(shopId)) throw new Error('Your signed-in shop changed. Start the download again.');
  };
  checkOwner(profile.id);
  const exported = { format_version: 1, export_started_at: new Date().toISOString(), profile };
  for (const collection of collections) {
    const records = [];
    let after = 0;
    do {
      const page = await apiFetch(`/api/v1/shop-export/${collection}?after=${after}`, { signal });
      checkOwner(page.shopId);
      records.push(...page.records);
      after = page.next;
    } while (after !== null);
    exported[collection] = records;
  }
  if (signal.aborted) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `marketos-shop-${shopId}-${exported.export_started_at.slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
