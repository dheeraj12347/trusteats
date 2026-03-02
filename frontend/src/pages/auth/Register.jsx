import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/api';

function Register() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

      if (user.role === 'CUSTOMER') {
        navigate('/customer');
      } else if (user.role === 'RESTAURANT') {
        navigate('/restaurant');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div>
      <h2>TrustEats Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          required
        >
          <option value="CUSTOMER">Customer</option>
          <option value="RESTAURANT">Restaurant</option>
        </select>
        <input
          placeholder="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Register;
