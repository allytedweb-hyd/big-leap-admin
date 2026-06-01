import React, { useState, useRef, useEffect } from 'react';
import styles from './Login.module.css';
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, RefreshCw } from 'lucide-react';
import { httpClient } from '../../lib/httpClient';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

interface LoginProps {
  onLogin: (user: any) => void;
}

interface DecodedToken {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

interface LoginResponse {
  message: string;
  token: string;
  admin: {
    id: string;
    email: string;
    createdAt: string;
  };
}

// ─── Forgot-password steps ─────────────────────────────────────────────────────
type ForgotStep = 'email' | 'otp' | 'reset';

// ─── Floating tech logos config ────────────────────────────────────────────────
const techLogos = [
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',         alt: 'React',      style: { top: '8%',  left: '12%' }, delay: '0s',   size: 48 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', alt: 'TypeScript', style: { top: '18%', left: '72%' }, delay: '0.4s', size: 40 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',         alt: 'Python',     style: { top: '38%', left: '6%'  }, delay: '0.8s', size: 44 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',         alt: 'Node.js',    style: { top: '55%', left: '78%' }, delay: '1.2s', size: 46 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', alt: 'JavaScript', style: { top: '72%', left: '14%' }, delay: '0.6s', size: 42 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',         alt: 'Docker',     style: { top: '82%', left: '68%' }, delay: '1.0s', size: 44 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',       alt: 'MongoDB',    style: { top: '25%', left: '86%' }, delay: '1.4s', size: 38 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',   alt: 'C++',        style: { top: '65%', left: '4%'  }, delay: '0.3s', size: 36 },
  { src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',         alt: 'Kotlin',     style: { top: '90%', left: '40%' }, delay: '1.6s', size: 38 },
];

// ─── OTP Input Component ───────────────────────────────────────────────────────
interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, disabled }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, '').split('').slice(0, 4);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const next = [...digits];
    next[index] = char.slice(-1);
    onChange(next.join(''));
    if (char && index < 3) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      onChange(pasted.padEnd(4, ''));
      inputsRef.current[Math.min(pasted.length, 3)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0' }}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 52,
            height: 56,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            borderRadius: 10,
            border: digits[i] ? '2px solid #0ea5e9' : '2px solid #e5e7eb',
            outline: 'none',
            background: digits[i] ? '#f0f9ff' : '#f9fafb',
            color: '#1a1a2e',
            transition: 'all 0.15s',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      ))}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Login state
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot]         = useState(false);
  const [forgotStep, setForgotStep]         = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail]       = useState('');
  const [forgotOtp, setForgotOtp]           = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd]         = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [forgotLoading, setForgotLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Login submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const loadingToast = toast.loading('Authenticating...');
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', { email, password });
      const { token, admin } = response.data;
      jwtDecode(token) as DecodedToken;
      const user = {
        id: admin.id,
        email: admin.email,
        full_name: admin.email.split('@')[0],
        createdAt: admin.createdAt,
      };
      localStorage.setItem('userjwttoken', token);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success(`Welcome back, ${user.full_name}!`, { id: loadingToast, icon: '👋', duration: 3000 });
      setTimeout(() => onLogin(user), 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      setError(msg);
      toast.error(msg, { id: loadingToast, duration: 4000 });
      setLoading(false);
    }
  };

  // ── Forgot: open / close ──────────────────────────────────────────────────────
  const openForgot = () => {
    setForgotEmail('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotStep('email');
    setShowForgot(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
  };

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const t = toast.loading('Sending OTP...');
    try {
      await httpClient.post('/auth/forgot-password/send-otp', { email: forgotEmail });
      toast.success('OTP sent! Check your inbox.', { id: t });
      setForgotStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP', { id: t });
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 1 resend ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    const t = toast.loading('Resending OTP...');
    try {
      await httpClient.post('/auth/forgot-password/send-otp', { email: forgotEmail });
      toast.success('OTP resent!', { id: t });
      setResendCooldown(60);
      setForgotOtp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP', { id: t });
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp.length < 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }
    setForgotLoading(true);
    const t = toast.loading('Verifying OTP...');
    try {
      await httpClient.post('/auth/forgot-password/verify-otp', { email: forgotEmail, otp: forgotOtp });
      toast.success('OTP verified!', { id: t });
      setForgotStep('reset');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP', { id: t });
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 3: Reset Password ────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setForgotLoading(true);
    const t = toast.loading('Resetting password...');
    try {
      await httpClient.post('/auth/forgot-password/reset-password', {
        email: forgotEmail,
        otp: forgotOtp,
        password: newPassword,
      });
      toast.success('Password reset successfully! Please sign in.', { id: t, duration: 4000 });
      closeForgot();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password', { id: t });
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Floating background logos */}
      <div className={styles.logosLayer} aria-hidden="true">
        {techLogos.map((logo, i) => (
          <img
            key={i}
            src={logo.src}
            alt={logo.alt}
            className={styles.floatingLogo}
            style={{ ...logo.style, width: logo.size, height: logo.size, animationDelay: logo.delay } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Login card ── */}
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <img src="/assets/images/logo1.png" alt="Logo" className={styles.logo} />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && (
            <div className={styles.errorBanner}>
              <span className={styles.errorIcon}>⚠</span>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="password" className={styles.label} style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={openForgot}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: '#0ea5e9', fontSize: 13, cursor: 'pointer',
                  fontWeight: 500, textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${styles.passwordInput}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Sign in'}
          </button>
        </form>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) closeForgot(); }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              overflow: 'hidden', animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {forgotStep !== 'email' && (
                <button
                  type="button"
                  onClick={() => setForgotStep(forgotStep === 'reset' ? 'otp' : 'email')}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: 8,
                    width: 32, height: 32, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <ArrowLeft size={16} color="#64748b" />
                </button>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                  {forgotStep === 'email' && 'Forgot Password'}
                  {forgotStep === 'otp'   && 'Enter OTP'}
                  {forgotStep === 'reset' && 'New Password'}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  {forgotStep === 'email' && "We'll send a 4-digit OTP to your email"}
                  {forgotStep === 'otp'   && `Code sent to ${forgotEmail}`}
                  {forgotStep === 'reset' && 'Choose a strong new password'}
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div style={{ padding: '12px 24px 0', display: 'flex', gap: 6 }}>
              {(['email', 'otp', 'reset'] as ForgotStep[]).map((s, i) => (
                <div
                  key={s}
                  style={{
                    flex: 1, height: 3, borderRadius: 99,
                    background: ['email', 'otp', 'reset'].indexOf(forgotStep) >= i ? '#0ea5e9' : '#e2e8f0',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>

            <div style={{ padding: 24 }}>

              {/* ── Step 1: Email ── */}
              {forgotStep === 'email' && (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      <Mail size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                      background: forgotLoading ? '#bae6fd' : '#0ea5e9', color: '#fff',
                      fontWeight: 700, fontSize: 14, cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {forgotLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgot}
                    style={{
                      width: '100%', padding: '10px', marginTop: 10, borderRadius: 8,
                      border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* ── Step 2: OTP ── */}
              {forgotStep === 'otp' && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, textAlign: 'center' }}>
                      Enter the 4-digit code
                    </label>
                    <OtpInput value={forgotOtp} onChange={setForgotOtp} disabled={forgotLoading} />
                  </div>

                  {/* Resend row */}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    {resendCooldown > 0 ? (
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        style={{
                          background: 'none', border: 'none', color: '#0ea5e9',
                          fontSize: 13, cursor: 'pointer', fontWeight: 500,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <RefreshCw size={13} /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length < 4}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                      background: forgotLoading || forgotOtp.length < 4 ? '#bae6fd' : '#0ea5e9',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      cursor: forgotLoading || forgotOtp.length < 4 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </form>
              )}

              {/* ── Step 3: Reset ── */}
              {forgotStep === 'reset' && (
                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      <KeyRound size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        style={{
                          width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                          border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                        onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                      />
                      <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                        {showNewPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        style={{
                          width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                          border: `1.5px solid ${confirmPassword && newPassword !== confirmPassword ? '#f87171' : '#e5e7eb'}`,
                          fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                        onBlur={e => (e.target.style.borderColor = confirmPassword && newPassword !== confirmPassword ? '#f87171' : '#e5e7eb')}
                      />
                      <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                        {showConfirmPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || newPassword !== confirmPassword || newPassword.length < 6}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                      background: (forgotLoading || newPassword !== confirmPassword || newPassword.length < 6) ? '#bae6fd' : '#0ea5e9',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      cursor: (forgotLoading || newPassword !== confirmPassword || newPassword.length < 6) ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;