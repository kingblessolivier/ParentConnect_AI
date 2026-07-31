'use client';

import { useMemo, useState } from 'react';
import { apiPatch } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { toast } from '../../lib/toast';
import { SAMPLE_USERS } from '../../lib/sample';
import { ROLES, type AdminUser, type Role } from '../../lib/types';
import { getSession } from '../../lib/session';
import { DemoBanner, PageHead, SearchInput, EmptyState } from '../../components/ui';

const ROLE_LABEL: Record<Role, string> = {
  parent: 'Parent',
  chw: 'CHW',
  champion: 'Champion',
  school: 'School',
  cpo: 'CPO',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

export default function UsersPage() {
  const { data, demo } = useApiData<AdminUser[]>('/api/v1/admin/users', SAMPLE_USERS);
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const list = rows ?? data;
  const mySub = getSession()?.sub;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((u) => {
      if (filter !== 'all' && u.role !== filter) return false;
      if (!q) return true;
      return `${u.displayAlias ?? ''} ${u.id} ${u.district ?? ''} ${u.sector ?? ''}`.toLowerCase().includes(q);
    });
  }, [list, filter, query]);

  async function changeRole(user: AdminUser, role: Role) {
    if (role === user.role) return;
    setPending(user.id);
    try {
      if (demo) {
        setRows(list.map((u) => (u.id === user.id ? { ...u, role } : u)));
      } else {
        const updated = await apiPatch<AdminUser>(`/api/v1/admin/users/${user.id}/role`, { role });
        setRows(list.map((u) => (u.id === user.id ? updated : u)));
      }
      toast(`${user.displayAlias ?? user.id} is now ${ROLE_LABEL[role]}.`);
    } catch {
      toast(`Could not update ${user.displayAlias ?? user.id}'s role.`, 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <PageHead title="Users & roles">
        Every staff account is granted access by role (FR-33, FR-05). An admin cannot change their own role here — ask another admin.
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="toolbar">
        <div className="toolbar-group">
          <button className={`btn sm ${filter === 'all' ? 'primary' : ''}`} onClick={() => setFilter('all')}>
            All ({list.length})
          </button>
          {ROLES.map((r) => {
            const count = list.filter((u) => u.role === r).length;
            if (count === 0) return null;
            return (
              <button key={r} className={`btn sm ${filter === r ? 'primary' : ''}`} onClick={() => setFilter(r)}>
                {ROLE_LABEL[r]} ({count})
              </button>
            );
          })}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search alias, district…" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Role</th>
              <th>Location</th>
              <th>Language</th>
              <th>Channel</th>
              <th>Change role</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const isSelf = u.id === mySub;
              return (
                <tr key={u.id}>
                  <td>{u.displayAlias ?? <span className="muted mono">{u.id}</span>}</td>
                  <td style={{ fontWeight: 600, color: u.role === 'admin' ? 'var(--brand)' : undefined }}>
                    {ROLE_LABEL[u.role]}
                    {isSelf ? <span className="muted"> (you)</span> : null}
                  </td>
                  <td className="muted">{[u.district, u.sector].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="muted">{u.preferredLanguage}</td>
                  <td className="muted">{u.preferredChannel}</td>
                  <td>
                    <select
                      className="select"
                      value={u.role}
                      disabled={isSelf || pending === u.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? <EmptyState title="No matching accounts" hint="Try a different search or role filter." /> : null}
      </div>
    </>
  );
}
