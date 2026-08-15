'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiDelete, apiPost } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { toast } from '../../lib/toast';
import { SAMPLE_DIRECTORY } from '../../lib/sample';
import type { DirectoryAdminView, DirectoryEntry, ReferralContactType } from '../../lib/types';
import { DemoBanner, PageHead } from '../../components/ui';

const TYPES: { value: ReferralContactType; label: string }[] = [
  { value: 'one_stop_centre', label: 'Isange One Stop Centre' },
  { value: 'child_helpline', label: 'Child helpline' },
  { value: 'health_facility', label: 'Health facility' },
];

const EMPTY = { name: '', phone: '', type: 'one_stop_centre' as ReferralContactType, district: '' };

export default function ReferralDirectoryPage() {
  const { data, demo } = useApiData<DirectoryAdminView>('/api/v1/admin/referral-directory', SAMPLE_DIRECTORY);
  const [view, setView] = useState<DirectoryAdminView | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const current = view ?? data;

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: draft.name,
      phone: draft.phone,
      type: draft.type,
      ...(draft.district.trim() ? { district: draft.district.trim() } : {}),
    };
    try {
      if (demo) {
        const entry: DirectoryEntry = { ...payload, id: `d-${Date.now()}`, updatedAt: new Date().toISOString() };
        setView({ ...current, entries: [...current.entries, entry], usingBaseline: false });
      } else {
        const entry = await apiPost<DirectoryEntry>('/api/v1/admin/referral-directory', payload);
        setView({ ...current, entries: [...current.entries, entry], usingBaseline: false });
      }
      setDraft(EMPTY);
      toast(`Added ${payload.name}.`);
    } catch {
      toast('Could not add that contact.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: DirectoryEntry) {
    setBusy(true);
    try {
      if (!demo) await apiDelete(`/api/v1/admin/referral-directory/${entry.id}`);
      const entries = current.entries.filter((x) => x.id !== entry.id);
      setView({ ...current, entries, usingBaseline: entries.length === 0 });
      toast(`Removed ${entry.name}.`);
    } catch {
      toast(`Could not remove ${entry.name}.`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Referral directory">
        The contacts a parent sees on a disclosure (FR-21). Editing here takes effect immediately —
        no redeploy. Changes are audited (NFR-11).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className={`callout ${current.usingBaseline ? 'callout-warn' : ''}`} style={{ marginBottom: 20 }}>
        {current.usingBaseline ? (
          <>
            <strong>Using the deployment baseline.</strong> No overrides are set, so the contacts
            shipped in the config bundle are being served. Adding one below replaces them.
          </>
        ) : (
          <>
            <strong>Using {current.entries.length} override{current.entries.length === 1 ? '' : 's'}.</strong>{' '}
            Removing them all falls back to the deployment baseline — a parent in crisis always sees
            a referral pathway, even if this list is emptied or the database is unreachable (NFR-06).
          </>
        )}
      </div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Phone</th>
              <th>Type</th>
              <th>District</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {current.entries.map((entry) => (
              <tr key={entry.id}>
                <td style={{ fontWeight: 600 }}>{entry.name}</td>
                <td className="mono">{entry.phone}</td>
                <td className="muted">{TYPES.find((t) => t.value === entry.type)?.label ?? entry.type}</td>
                <td className="muted">{entry.district ?? 'National'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn sm" onClick={() => remove(entry)} disabled={busy}>
                    <Trash2 size={13} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {current.entries.length === 0 ? (
          <div style={{ padding: 18 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Baseline contacts currently being served:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
              {current.baseline.map((c) => (
                <li key={c.name}>
                  {c.name} — <span className="mono">{c.phone}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="section-title">Add a contact</div>
      <form className="card pad" onSubmit={add} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
        <div className="field">
          <span className="field-label">Service name</span>
          <input
            className="input"
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Isange One Stop Centre — Kacyiru"
          />
        </div>
        <div className="field">
          <span className="field-label">Phone</span>
          <input
            className="input"
            required
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+250…"
          />
        </div>
        <div className="field">
          <span className="field-label">Type</span>
          <select
            className="select"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as ReferralContactType })}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">District — leave blank for a national service</span>
          <input
            className="input"
            value={draft.district}
            onChange={(e) => setDraft({ ...draft, district: e.target.value })}
            placeholder="Gasabo"
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy} style={{ justifySelf: 'start' }}>
          <Plus size={14} /> {busy ? 'Saving…' : 'Add contact'}
        </button>
      </form>
    </>
  );
}
