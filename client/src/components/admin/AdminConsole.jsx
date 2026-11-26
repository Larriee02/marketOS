import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  KeyRound,
  UserCheck,
  UserX,
  PauseCircle,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { useDebounce } from '../../hooks/useDebounce';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

const STATUS_BADGE = {
  APPROVED: { variant: 'success', label: 'APPROVED' },
  PENDING: { variant: 'warning', label: 'PENDING' },
  SUSPENDED: { variant: 'danger', label: 'SUSPENDED' },
  REJECTED: { variant: 'danger', label: 'REJECTED' },
};

export function AdminConsole({ currentUser, onToast }) {
  const formatMoney = useCallback(
    (val, code) => formatCurrency(val, code || currentUser?.currency || 'NGN'),
    [currentUser?.currency]
  );
  const [subView, setSubView] = useState('users'); // 'users' | 'audit'
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [overview, setOverview] = useState({});
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionBusy, setActionBusy] = useState(false);

  // User Detail Modal
  const [inspectingUser, setInspectingUser] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [resetResult, setResetResult] = useState(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        sort: sortBy,
        order: sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('role', roleFilter);
      if (providerFilter) params.set('provider', providerFilter);

      const [ov, usr, aud] = await Promise.all([
        apiFetch('/api/v1/admin/overview'),
        apiFetch(`/api/v1/admin/users?${params.toString()}`),
        apiFetch('/api/v1/admin/audit-logs?pageSize=40'),
      ]);

      setOverview(ov || {});
      setUsers(usr?.users || []);
      setPagination(usr?.pagination || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
      setAuditLogs(aud?.logs || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, debouncedSearch, statusFilter, roleFilter, providerFilter, onToast]);

  useEffect(() => {
    loadAdminData();
    setSelectedIds([]);
  }, [loadAdminData]);

  const openUserDetail = async (u) => {
    setInspectingUser(u);
    setAdminNoteInput(u.admin_note || '');
    setResetResult(null);
    try {
      const detail = await apiFetch(`/api/v1/admin/users/${u.id}`);
      setDetailData(detail);
      setAdminNoteInput(detail?.user?.admin_note || '');
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (userId, nextStatus, note) => {
    setActionBusy(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, note }),
      });
      onToast?.(`Account status updated to ${nextStatus}`);
      if (inspectingUser && inspectingUser.id === userId) {
        setInspectingUser(res.user);
      }
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleBulkStatus = async (nextStatus) => {
    if (!selectedIds.length) return;
    setActionBusy(true);
    try {
      const res = await apiFetch('/api/v1/admin/users/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedIds, status: nextStatus }),
      });
      setSelectedIds([]);
      onToast?.(`Updated ${res.updatedCount} account(s) to ${nextStatus}`);
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    setActionBusy(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      onToast?.(`Role updated to ${nextRole}`);
      if (inspectingUser && inspectingUser.id === userId) {
        setInspectingUser(res.user);
      }
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!inspectingUser) return;
    setActionBusy(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users/${inspectingUser.id}/note`, {
        method: 'PATCH',
        body: JSON.stringify({ note: adminNoteInput }),
      });
      setInspectingUser(res.user);
      onToast?.('Admin note saved!');
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleResetPassword = async (userId) => {
    setActionBusy(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setResetResult(res);
      onToast?.('Temporary password generated!');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Delete "${user.full_name}" (${user.business_name}) and all their store records permanently?`
      )
    ) {
      return;
    }
    setActionBusy(true);
    try {
      await apiFetch(`/api/v1/admin/users/${user.id}`, { method: 'DELETE' });
      setInspectingUser(null);
      onToast?.(`Deleted ${user.email}`);
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleExportUsersCSV = async () => {
    try {
      const { users: all } = await apiFetch('/api/v1/admin/users/export');
      if (!all?.length) return;
      const headers = Object.keys(all[0]).join(',');
      const csv = [
        headers,
        ...all.map((r) =>
          Object.values(r)
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketos-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (users.every((user) => selectedIds.includes(user.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  return (
    <div className="admin-console">
      <dl className="admin-overview" aria-label="Account overview">
        {[
          ['Registered accounts', overview.total_users, `${overview.signups_7d || 0} joined · ${overview.active_7d || 0} active in the last 7 days`],
          ['Pending approval', overview.pending_users, null],
          ['Approved accounts', overview.approved_users, `${overview.suspended_users || 0} suspended · ${overview.admin_users || 0} administrators`],
          ['Email sign-ins', overview.email_users, `${overview.google_users || 0} Google accounts`],
        ].map(([title, count, note]) => (
          <div key={title}>
            <dt>{title}</dt><dd>{loading && !('total_users' in overview) ? '—' : count ?? 0}</dd>
            {note && <dd className="admin-metric-note">{note}</dd>}
            {title === 'Pending approval' && (
              <dd><button type="button" className="admin-button" onClick={() => {
                setSubView('users');
                setStatusFilter('PENDING');
                setPage(1);
              }}>Review queue</button></dd>
            )}
          </div>
        ))}
      </dl>

      {loadError && <p className="admin-empty" role="alert">{loadError}</p>}
      <section className="admin-panel" aria-label="Platform administration">
        <header className="admin-panel-header">
          <div className="admin-views" role="group" aria-label="Console view">
            <button type="button" aria-pressed={subView === 'users'} onClick={() => setSubView('users')}>Users</button>
            <button type="button" aria-pressed={subView === 'audit'} onClick={() => setSubView('audit')}>Audit log</button>
          </div>
          <div className="admin-actions">
            {subView === 'users' && <button type="button" className="admin-button" onClick={handleExportUsersCSV}>
              <Download size={16} aria-hidden="true" /> Export users
            </button>}
            <button type="button" className="admin-button" onClick={loadAdminData} disabled={loading} aria-label="Refresh" title="Refresh">
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

      {subView === 'users' ? (
        <div className="admin-section" aria-busy={loading}>
          <div className="admin-filters">
            <label className="admin-search">Search users
              <input type="search" value={search} placeholder="Name, shop, email or phone"
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <label>Status
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending approval</option>
                <option value="APPROVED">Approved</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <label>Role
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
                <option value="">All roles</option><option value="USER">Store owners</option><option value="ADMIN">Administrators</option>
              </select>
            </label>
            <label>Sign-in method
              <select value={providerFilter} onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}>
                <option value="">All methods</option><option value="EMAIL">Email &amp; password</option><option value="GOOGLE">Google</option>
              </select>
            </label>
            <label>Sort by
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                <option value="created_at">Date joined</option><option value="business_name">Shop name</option>
                <option value="full_name">Trader name</option><option value="email">Email</option>
                <option value="status">Status</option><option value="last_login_at">Last active</option>
              </select>
            </label>
            <button type="button" className="admin-button" onClick={() => {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              setPage(1);
            }} aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}>
              <ArrowUpDown size={15} aria-hidden="true" /> {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
          <div className="admin-results-bar">
            <p role="status">{loading ? 'Loading users…' : `${pagination.total} ${pagination.total === 1 ? 'account' : 'accounts'}`}</p>
            {users.length > 0 && (
              <label className="admin-select-all"><input type="checkbox" disabled={loading || actionBusy}
                checked={users.every((user) => selectedIds.includes(user.id))} onChange={toggleSelectAll} /> Select all shown</label>
            )}
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 liquid-glass-subtle px-3 py-1.5 rounded-2xl">
                <span className="text-xs font-extrabold text-theme-primary">
                  {selectedIds.length} selected:
                </span>
                <button
                  type="button"
                  disabled={actionBusy || loading}
                  onClick={() => handleBulkStatus('APPROVED')}
                  className="liquid-btn-primary px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  ✓ Approve Selected
                </button>
                <button
                  type="button"
                  disabled={actionBusy || loading}
                  onClick={() => handleBulkStatus('SUSPENDED')}
                  className="bg-amber-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Suspend Selected
                </button>
                <button
                  type="button"
                  disabled={actionBusy || loading}
                  onClick={() => handleBulkStatus('REJECTED')}
                  className="bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Reject Selected
                </button>
              </div>
            )}
          </div>

          {/* Users Table */}
          {users.length === 0 ? (
            !loading && !loadError && <div className="admin-empty">
              <strong>No matching accounts</strong>
              <p>Try a different search or change the filters.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-users" aria-label="User accounts" role="table">
                <thead role="rowgroup"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-outer)',
                  }}
                  className="text-[11px] font-bold uppercase tracking-wider border-y text-theme-secondary"
                >
                  <tr role="row">
                    <th scope="col" className="py-3 px-3 w-10">
                      <span className="sr-only">Selection</span>
                    </th>
                    <th scope="col" className="py-3 px-3">Trader & Store</th>
                    <th scope="col" className="py-3 px-3">Contact & Method</th>
                    <th scope="col" className="py-3 px-3">Status & Role</th>
                    <th scope="col" className="py-3 px-3 text-right">Store Activity</th>
                    <th scope="col" className="py-3 px-3">Joined</th>
                    <th scope="col" className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody role="rowgroup" className="divide-y theme-divider text-xs">
                  {users.map((u) => {
                    const statusMeta = STATUS_BADGE[u.status] || {
                      variant: 'neutral',
                      label: u.status,
                    };
                    return (
                      <tr role="row"
                        key={u.id}
                        className="hover:bg-white/25 dark:hover:bg-white/5 transition-colors"
                      >
                        <td role="cell" data-label="" className="py-3.5 px-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${u.business_name || u.full_name}`}
                            disabled={loading || actionBusy}
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleSelectUser(u.id)}
                          />
                        </td>

                        <td role="cell" data-label="Shop" className="py-3.5 px-3">
                          <div className="font-extrabold font-luxury text-sm text-theme-primary">
                            {u.business_name || 'Provision Store'}
                          </div>
                          <div className="text-theme-secondary font-medium">
                            {u.full_name} • <span className="text-[11px]">{u.city || 'Lagos'}</span>
                          </div>
                        </td>

                        <td role="cell" data-label="Contact" className="py-3.5 px-3">
                          <div className="font-bold text-theme-primary">{u.email}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="neutral">{u.auth_provider}</Badge>
                            {u.phone && (
                              <span className="text-theme-secondary tabular-nums">{u.phone}</span>
                            )}
                          </div>
                        </td>

                        <td role="cell" data-label="Status" className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            {u.role === 'ADMIN' && <Badge variant="info">ADMIN</Badge>}
                          </div>
                        </td>

                        <td role="cell" data-label="Store activity" className="py-3.5 px-3 text-right tabular-nums">
                          <div className="font-extrabold text-theme-inflow">
                            {formatMoney(u.total_inflow, u.currency)}
                          </div>
                          <div className="text-[11px] text-theme-secondary">
                            {u.product_count || 0} SKUs • {u.currency || 'NGN'}
                          </div>
                        </td>

                        <td role="cell" data-label="Joined" className="py-3.5 px-3 text-theme-secondary tabular-nums">
                          <div>{new Date(u.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px]">
                            {u.last_login_at
                              ? `Active ${new Date(u.last_login_at).toLocaleDateString()}`
                              : 'Never logged in'}
                          </div>
                        </td>

                        <td role="cell" data-label="" className="py-3.5 px-3 text-right">
                          <div className="admin-row-actions">
                            {u.status !== 'APPROVED' && (
                              <button
                                type="button"
                                disabled={actionBusy || loading}
                                onClick={() => handleStatusChange(u.id, 'APPROVED')}
                                className="liquid-btn-primary px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer flex items-center gap-1"
                                title="Approve Store Account"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {u.status === 'PENDING' && (
                              <button
                                type="button"
                                disabled={actionBusy || loading}
                                onClick={() => handleStatusChange(u.id, 'REJECTED')}
                                className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-theme-outflow cursor-pointer"
                                title="Decline Registration"
                              >
                                Reject
                              </button>
                            )}

                            {u.status === 'APPROVED' && u.id !== currentUser?.id && (
                              <button
                                type="button"
                                disabled={actionBusy || loading}
                                onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-theme-warning cursor-pointer"
                                title="Suspend Account"
                              >
                                Suspend
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openUserDetail(u)}
                              className="liquid-glass-subtle px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold text-theme-primary flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Manage</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-theme-secondary">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total accounts)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="liquid-glass-subtle px-3 py-1.5 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="liquid-glass-subtle px-3 py-1.5 rounded-xl font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-section" aria-busy={loading}>
          <div className="admin-results-bar"><h2>Recent audit events</h2></div>
          {!loading && !loadError && auditLogs.length === 0 && <p className="admin-empty">No audit events recorded yet.</p>}
          <div className="admin-table-wrap">
            <table className="admin-table admin-audit" aria-label="Audit events" role="table">
              <thead role="rowgroup"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-outer)',
                }}
                className="text-[11px] font-bold uppercase tracking-wider border-y text-theme-secondary"
              >
                <tr role="row">
                  <th scope="col" className="py-2.5 px-3">Timestamp</th>
                  <th scope="col" className="py-2.5 px-3">Event</th>
                  <th scope="col" className="py-2.5 px-3">Actor</th>
                  <th scope="col" className="py-2.5 px-3">Target Account</th>
                  <th scope="col" className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="divide-y theme-divider text-xs">
                {auditLogs.map((log) => (
                  <tr role="row" key={log.id}>
                    <td role="cell" data-label="Timestamp" className="py-3 px-3 text-theme-secondary tabular-nums whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td role="cell" data-label="Event" className="py-3 px-3">
                      <Badge variant="info">{log.action}</Badge>
                    </td>
                    <td role="cell" data-label="Actor" className="py-3 px-3 font-bold text-theme-primary">
                      {log.actor_name || log.actor_email || 'System'}
                    </td>
                    <td role="cell" data-label="Target account" className="py-3 px-3 text-theme-secondary">
                      {log.target_name ? `${log.target_name} (${log.target_email})` : '—'}
                    </td>
                    <td role="cell" data-label="Details" className="py-3 px-3 text-theme-secondary font-mono text-[11px]">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </section>

      {/* USER DETAIL & MANAGEMENT MODAL */}
      <Modal
        isOpen={Boolean(inspectingUser)}
        onClose={() => {
          setInspectingUser(null);
          setDetailData(null);
          setResetResult(null);
        }}
        title={`Manage Account: ${inspectingUser?.business_name || inspectingUser?.full_name}`}
        subtitle={`${inspectingUser?.full_name} • ${inspectingUser?.email} • Joined ${
          inspectingUser ? new Date(inspectingUser.created_at).toLocaleDateString() : ''
        }`}
      >
        {inspectingUser && (
          <div className="space-y-4 text-xs">
            {/* Store KPI Snapshot */}
            {detailData?.storeStats && (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="liquid-glass-subtle p-3 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-theme-secondary">
                    Inventory Value
                  </div>
                  <div className="text-sm font-extrabold font-luxury tabular-nums text-theme-primary mt-0.5">
                    {formatMoney(detailData.storeStats.stock_retail_value, inspectingUser?.currency)}
                  </div>
                  <div className="text-[10px] text-theme-secondary">
                    {detailData.storeStats.product_count} products
                  </div>
                </div>

                <div className="liquid-glass-subtle p-3 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-theme-secondary">
                    Total Inflow
                  </div>
                  <div className="text-sm font-extrabold font-luxury tabular-nums text-theme-inflow mt-0.5">
                    {formatMoney(detailData.storeStats.total_inflow, inspectingUser?.currency)}
                  </div>
                  <div className="text-[10px] text-theme-secondary">
                    {detailData.storeStats.sale_count} sales
                  </div>
                </div>

                <div className="liquid-glass-subtle p-3 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase text-theme-secondary">
                    Receivables
                  </div>
                  <div className="text-sm font-extrabold font-luxury tabular-nums text-theme-outflow mt-0.5">
                    {detailData.storeStats.active_debtors} active
                  </div>
                  <div className="text-[10px] text-theme-secondary">
                    Outflow: {formatMoney(detailData.storeStats.total_outflow, inspectingUser?.currency)}
                  </div>
                </div>
              </div>
            )}

            {/* Approval & Status Controls */}
            <div className="liquid-glass-subtle p-3.5 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-theme-primary">Account Approval & Access</span>
                <Badge variant={STATUS_BADGE[inspectingUser.status]?.variant || 'neutral'}>
                  {inspectingUser.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={actionBusy || inspectingUser.status === 'APPROVED'}
                  onClick={() => handleStatusChange(inspectingUser.id, 'APPROVED')}
                  className="liquid-btn-primary py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  disabled={actionBusy || inspectingUser.status === 'PENDING'}
                  onClick={() => handleStatusChange(inspectingUser.id, 'PENDING')}
                  className="liquid-glass py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Set Pending</span>
                </button>

                <button
                  type="button"
                  disabled={
                    actionBusy ||
                    inspectingUser.status === 'SUSPENDED' ||
                    inspectingUser.id === currentUser?.id
                  }
                  onClick={() => handleStatusChange(inspectingUser.id, 'SUSPENDED')}
                  className="liquid-glass py-2 px-2.5 rounded-xl font-bold text-theme-warning flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Suspend</span>
                </button>

                <button
                  type="button"
                  disabled={
                    actionBusy ||
                    inspectingUser.status === 'REJECTED' ||
                    inspectingUser.id === currentUser?.id
                  }
                  onClick={() => handleStatusChange(inspectingUser.id, 'REJECTED')}
                  className="liquid-glass py-2 px-2.5 rounded-xl font-bold text-theme-outflow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Role & Password Reset Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="liquid-glass-subtle p-3.5 rounded-2xl space-y-2">
                <div className="font-extrabold text-theme-primary">Platform Role</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionBusy || inspectingUser.role === 'USER'}
                    onClick={() => handleRoleChange(inspectingUser.id, 'USER')}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer ${
                      inspectingUser.role === 'USER' ? 'liquid-btn-primary' : 'liquid-glass'
                    }`}
                  >
                    Store Owner
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || inspectingUser.role === 'ADMIN'}
                    onClick={() => handleRoleChange(inspectingUser.id, 'ADMIN')}
                    className={`flex-1 py-2 rounded-xl font-bold cursor-pointer ${
                      inspectingUser.role === 'ADMIN' ? 'liquid-btn-primary' : 'liquid-glass'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="liquid-glass-subtle p-3.5 rounded-2xl space-y-2">
                <div className="font-extrabold text-theme-primary">Password Recovery</div>
                <button
                  type="button"
                  disabled={actionBusy || loading}
                  onClick={() => handleResetPassword(inspectingUser.id)}
                  className="liquid-glass w-full py-2 px-3 rounded-xl font-extrabold text-theme-brand flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Generate Temp Password</span>
                </button>
              </div>
            </div>

            {resetResult && (
              <div className="p-3.5 rounded-2xl liquid-glass border border-sky-400/40 space-y-2">
                <div className="font-extrabold text-theme-primary">
                  Temporary Password for {resetResult.email}:
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl liquid-glass-subtle font-mono text-sm font-extrabold text-theme-brand">
                  <span>{resetResult.temporaryPassword}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(resetResult.temporaryPassword);
                        onToast?.('Copied temporary password!');
                      }}
                      className="px-2.5 py-1 rounded-lg liquid-btn-primary text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    {inspectingUser.phone && (
                      <a
                        href={`https://wa.me/${inspectingUser.phone.replace(/^0/, '234').replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${inspectingUser.full_name}, you can recover access to MarketOS using Forgot password on the sign-in page.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-sans flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Note Form */}
            <form onSubmit={handleSaveNote} className="space-y-2">
              <label className="block font-extrabold text-theme-primary">
                Internal Admin Note (Only visible to administrators)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g. Verified shop at Oke-Arin market..."
                  className="liquid-input flex-1 rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  disabled={actionBusy || loading}
                  className="liquid-btn-primary px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>

            {/* Delete User Footer */}
            {inspectingUser.id !== currentUser?.id && (
              <div
                className="pt-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--divider-color)' }}
              >
                <span className="text-[11px] text-theme-secondary">
                  Permanently remove this account and its store records
                </span>
                <button
                  type="button"
                  disabled={actionBusy || loading}
                  onClick={() => handleDeleteUser(inspectingUser)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-theme-outflow font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
