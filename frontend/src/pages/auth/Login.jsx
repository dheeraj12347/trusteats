import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('testcustomer@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div>
      <h2>TrustEats Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default Login;
