import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/api';

function Register() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        name,
        email,
        password,
        role,
      });
      const { user, token } = res.data;

      localStorage.setItem('te_token', token);
      localStorage.setItem('te_user', JSON.stringify(user));

      // Force page reload to trigger setUser in App.js immediately
      window.location.href = user.role === 'CUSTOMER' ? '/customer' : user.role === 'RESTAURANT' ? '/restaurant' : '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your fields.');
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
            Join the safest food ecosystem.
          </h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, lineHeight: 1.6, maxWidth: '480px' }}>
            Create an account to submit or receive verified orders. Instantly resolve meal discrepancies through automated visual proof validation.
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
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontFamily: 'var(--font-headings)' }}>Create Account</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Register today as a customer or partner restaurant.
            </p>
          </div>

          {error && (
            <div className="te-alert te-alert--error" style={{ marginBottom: '1.5rem' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="te-input-group">
              <label className="te-label">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                className="te-input"
                required
              />
            </div>

            <div className="te-input-group">
              <label className="te-label">I am registering as a:</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="te-input"
                style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                required
              >
                <option value="CUSTOMER">Customer</option>
                <option value="RESTAURANT">Restaurant Partner</option>
              </select>
            </div>

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
                placeholder="Minimum 6 characters"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="te-input"
                required
              />
            </div>

            <button type="submit" className="te-btn te-btn--primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--brand-orange)', fontWeight: 600, textDecoration: 'none' }}>Login</Link>
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

export default Register;
