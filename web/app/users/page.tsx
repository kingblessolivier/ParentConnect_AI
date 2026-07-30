'use client';

import { useState, type CSSProperties } from 'react';
import { apiPatch } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { SAMPLE_USERS } from '../../lib/sample';
import { ROLES, type AdminUser, type Role } from '../../lib/types';
import { getSession } from '../../lib/session';
import { DemoBanner, PageHead } from '../../components/ui';

const ROLE_LABEL: Record<Role, string> = {
  parent: 'Parent',
  chw: 'CHW',
  champion: 'Champion',
  school: 'School',
  cpo: 'CPO',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

const selectStyle: CSSProperties = {
  padding: '5px 8px',
  borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'var(--panel-2)',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 600,
};

export default function UsersPage() {
  const { data, demo } = useApiData<AdminUser[]>('/api/v1/admin/users', SAMPLE_USERS);
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = rows ?? data;
  const mySub = getSession()?.sub;
  const visible = filter === 'all' ? list : list.filter((u) => u.role === filter);

  async function changeRole(user: AdminUser, role: Role) {
    if (role === user.role) return;
    setError(null);
    setPending(user.id);
    try {
      if (demo) {
        setRows(list.map((u) => (u.id === user.id ? { ...u, role } : u)));
      } else {
        const updated = await apiPatch<AdminUser>(`/api/v1/admin/users/${user.id}/role`, { role });
        setRows(list.map((u) => (u.id === user.id ? updated : u)));
      }
    } catch {
      setError(`Could not update ${user.displayAlias ?? user.id}'s role.`);
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
      {error ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className={`btn ${filter === 'all' ? 'primary' : ''}`} onClick={() => setFilter('all')}>
          All ({list.length})
        </button>
        {ROLES.map((r) => {
          const count = list.filter((u) => u.role === r).length;
          if (count === 0) return null;
          return (
            <button key={r} className={`btn ${filter === r ? 'primary' : ''}`} onClick={() => setFilter(r)}>
              {ROLE_LABEL[r]} ({count})
            </button>
          );
        })}
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
                  <td>{u.displayAlias ?? <span className="muted">{u.id}</span>}</td>
                  <td style={{ fontWeight: 600, color: u.role === 'admin' ? 'var(--brand)' : undefined }}>
                    {ROLE_LABEL[u.role]}
                    {isSelf ? <span className="muted"> (you)</span> : null}
                  </td>
                  <td className="muted">{[u.district, u.sector].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="muted">{u.preferredLanguage}</td>
                  <td className="muted">{u.preferredChannel}</td>
                  <td>
                    <select
                      style={selectStyle}
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
      </div>
    </>
  );
}
