import React, { useState } from 'react';
import styles from './Login.module.css';
import { Eye, EyeOff } from 'lucide-react';
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

// ─── Floating tech logos config ───────────────────────────────────────────────

const techLogos = [
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
    alt: 'React',
    style: { top: '8%', left: '12%' },
    delay: '0s',
    size: 48,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
    alt: 'TypeScript',
    style: { top: '18%', left: '72%' },
    delay: '0.4s',
    size: 40,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
    alt: 'Python',
    style: { top: '38%', left: '6%' },
    delay: '0.8s',
    size: 44,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
    alt: 'Node.js',
    style: { top: '55%', left: '78%' },
    delay: '1.2s',
    size: 46,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
    alt: 'JavaScript',
    style: { top: '72%', left: '14%' },
    delay: '0.6s',
    size: 42,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
    alt: 'Docker',
    style: { top: '82%', left: '68%' },
    delay: '1.0s',
    size: 44,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
    alt: 'MongoDB',
    style: { top: '25%', left: '86%' },
    delay: '1.4s',
    size: 38,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
    alt: 'C++',
    style: { top: '65%', left: '4%' },
    delay: '0.3s',
    size: 36,
  },
  {
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
    alt: 'Kotlin',
    style: { top: '90%', left: '40%' },
    delay: '1.6s',
    size: 38,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loadingToast = toast.loading('Authenticating...');

    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', { email, password });

      const { token, admin } = response.data;
      const decodedUser: DecodedToken = jwtDecode(token);

      const user = {
        id: admin.id,
        email: admin.email,
        full_name: admin.email.split('@')[0],
        createdAt: admin.createdAt,
      };

      localStorage.setItem('userjwttoken', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Welcome back, ${user.full_name}!`, {
        id: loadingToast,
        icon: '👋',
        duration: 3000,
      });

      setTimeout(() => {
        onLogin(user);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Invalid credentials';
      setError(errorMessage);

      toast.error(errorMessage, {
        id: loadingToast,
        duration: 4000,
      });

      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>

      {/* ── Floating background logos ── */}
      <div className={styles.logosLayer} aria-hidden="true">
        {techLogos.map((logo, i) => (
          <img
            key={i}
            src={logo.src}
            alt={logo.alt}
            className={styles.floatingLogo}
            style={{
              ...logo.style,
              width: logo.size,
              height: logo.size,
              animationDelay: logo.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── Frosted card ── */}
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logoSection}>
          <img src="/assets/images/logo1.png" alt="Logo" className={styles.logo} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          {error && (
            <div className={styles.errorBanner}>
              <span className={styles.errorIcon}>⚠</span>
              {error}
            </div>
          )}

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${styles.passwordInput}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Login;