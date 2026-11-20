import { useState } from 'react';

const PAGE_SIZE = 32;

export function useListPage(items, filterKey) {
  const [selection, setSelection] = useState(null);
  const lastPage = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
  const page = selection?.filterKey === filterKey ? Math.min(selection.page, lastPage) : 0;
  const start = page * PAGE_SIZE;
  return {
    rows: items.slice(start, start + PAGE_SIZE),
    start,
    end: Math.min(start + PAGE_SIZE, items.length),
    total: items.length,
    setPage: (offset) => setSelection({ filterKey, page: Math.max(0, Math.min(lastPage, page + offset)) }),
  };
}

export function ListPagination({ list, label, targetId }) {
  if (list.total <= PAGE_SIZE) return null;

  const move = (offset) => {
    list.setPage(offset);
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  };

  return (
    <nav className="list-pagination" aria-label={`${label} pages`}>
      <span aria-live="polite">{list.start + 1}–{list.end} of {list.total}</span>
      <div className="flex gap-2">
        <button type="button" className="workspace-chip" onClick={() => move(-1)} disabled={list.start === 0}>Previous</button>
        <button type="button" className="workspace-chip" onClick={() => move(1)} disabled={list.end >= list.total}>Next</button>
      </div>
    </nav>
  );
}
