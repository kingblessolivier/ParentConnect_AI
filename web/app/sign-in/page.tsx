'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Phone } from 'lucide-react';
import { apiPost, ApiError } from '../../lib/api';
import { setToken } from '../../lib/session';
import { PageHead } from '../../components/ui';

type Step = 'phone' | 'code';

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiPost('/api/v1/auth/otp/request', { phone });
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? 'Could not send a code — check the phone number.' : 'Network error — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { accessToken } = await apiPost<{ accessToken: string }>('/api/v1/auth/otp/verify', { phone, code });
      setToken(accessToken);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? 'That code is wrong or expired.' : 'Network error — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Sign in">
        Staff use the same phone + OTP flow as parents — access is granted by role, not by which door you came in through.
      </PageHead>

      <div className="card pad" style={{ maxWidth: 380 }}>
        {step === 'phone' ? (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Phone size={14} /> Phone number
              </span>
              <input
                type="tel"
                required
                placeholder="+250700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Code sent to {phone}.</p>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <KeyRound size={14} /> 6-digit code
              </span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div> : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={() => setStep('phone')}>
                Back
              </button>
              <button className="btn primary" type="submit" disabled={busy} style={{ flex: 1 }}>
                {busy ? 'Verifying…' : 'Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--panel-2)',
  color: 'var(--text)',
  fontSize: 14,
};
