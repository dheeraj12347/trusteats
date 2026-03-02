import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  return (
    <header className="te-navbar">
      <div className="te-navbar-left">
        <div className="te-logo-circle">TE</div>
        <span className="te-logo-text">TrustEats</span>
      </div>

      <div className="te-navbar-right">
        {/* role-based navigation */}
        {user?.role === 'CUSTOMER' && (
          <nav className="te-nav-links">
            <Link to="/" className="te-nav-link">
              Dashboard
            </Link>
            <Link to="/customer/complaints" className="te-nav-link">
              My complaints
            </Link>
          </nav>
        )}

        {user?.role === 'RESTAURANT' && (
          <nav className="te-nav-links">
            <Link to="/" className="te-nav-link">
              Dashboard
            </Link>
            <Link to="/restaurant/complaints" className="te-nav-link">
              Complaints
            </Link>
          </nav>
        )}

        {user?.role === 'ADMIN' && (
          <nav className="te-nav-links">
            <Link to="/" className="te-nav-link">
              Dashboard
            </Link>
            <Link to="/admin/complaints" className="te-nav-link">
              Complaints
            </Link>
          </nav>
        )}

        <div className="te-user-info">
          <div className="te-user-avatar">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="te-user-meta">
            <span className="te-user-name">{user?.name}</span>
            <span className="te-user-role">{user?.role}</span>
          </div>
        </div>
        <button className="te-logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
