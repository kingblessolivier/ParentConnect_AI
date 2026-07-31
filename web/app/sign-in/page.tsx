'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { apiPost, ApiError } from '../../lib/api';
import { setToken } from '../../lib/session';

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
    <div className="auth-wrap">
      <div className="card pad auth-card">
        <div className="auth-badge"><ShieldCheck size={22} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Staff sign in</h1>
        <p className="muted" style={{ margin: '0 0 22px', fontSize: 13.5 }}>
          Staff use the same phone + OTP flow as parents — access is granted by role, not by which door you came in through.
        </p>

        {step === 'phone' ? (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <span className="field-label"><Phone size={14} /> Phone number</span>
              <input
                type="tel"
                required
                className="input"
                placeholder="+250700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div> : null}
            <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Code sent to <strong>{phone}</strong>.</p>
            <div className="field">
              <span className="field-label"><KeyRound size={14} /> 6-digit code</span>
              <input
                type="text"
                required
                className="input"
                inputMode="numeric"
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error ? <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div> : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={() => setStep('phone')}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="btn primary" type="submit" disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>
                {busy ? 'Verifying…' : 'Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
