import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('testcustomer@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      const { user, token } = res.data;

      localStorage.setItem('te_token', token);
      localStorage.setItem('te_user', JSON.stringify(user));

      if (onLogin) onLogin(user);

      if (user.role === 'CUSTOMER') {
        navigate('/customer');
      } else if (user.role === 'RESTAURANT') {
        navigate('/restaurant');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fade-in" style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: 'var(--bg-primary)',
      margin: '-1.25rem -1rem'
    }}>
      {/* Branded Left Side Panel */}
      <div style={{
        flex: 1.2,
        background: 'linear-gradient(135deg, var(--brand-orange), #C22500)',
        color: '#FFFFFF',
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }} className="hide-on-mobile">
        {/* Decorative background shapes */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none'
        }} />
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              backgroundColor: '#FFFFFF',
              color: 'var(--brand-orange)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-headings)',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>TE</div>
            <span style={{
              fontFamily: 'var(--font-headings)',
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em'
            }}>TrustEats</span>
          </div>
          
          <h1 style={{
            fontSize: '3rem',
            lineHeight: 1.15,
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-headings)'
          }}>
            Secure food ordering & instant verified refunds.
          </h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, lineHeight: 1.6, maxWidth: '480px' }}>
            Powered by advanced food-classification neural networks. Submit complaints with guided live camera validation for prompt refund decisions.
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>3-Frame</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Guided Capture</p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>Neural Net</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Content Match</p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>Instant</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Fraud Warning</p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2rem' }}>
            © {new Date().getFullYear()} TrustEats Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side Form Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div className="te-card" style={{ maxWidth: '400px', width: '100%', border: 'none', boxShadow: 'none', background: 'transparent' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontFamily: 'var(--font-headings)' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Sign in to manage your orders and view refund breakdowns.
            </p>
          </div>

          {error && (
            <div className="te-alert te-alert--error" style={{ marginBottom: '1.5rem' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="te-input-group">
              <label className="te-label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="te-input"
                required
              />
            </div>

            <div className="te-input-group">
              <label className="te-label">Password</label>
              <input
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="te-input"
                required
              />
            </div>

            <button type="submit" className="te-btn te-btn--primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            New to TrustEats? <Link to="/register" style={{ color: 'var(--brand-orange)', fontWeight: 600, textDecoration: 'none' }}>Create an account</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Login;
