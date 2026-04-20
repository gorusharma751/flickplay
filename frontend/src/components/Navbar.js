import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Movies', 'Web Series', 'Shows', 'Drama', 'Kids'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
    }
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">Flick<span>Play</span></Link>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
        {CATEGORIES.map(cat => (
          <Link
            key={cat}
            to={`/category/${cat.toLowerCase().replace(' ', '-')}`}
            className={`nav-link ${location.pathname.includes(cat.toLowerCase()) ? 'active' : ''}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        <input
          placeholder="🔍 Search..."
          onKeyDown={handleSearch}
          style={{ padding: '6px 12px', background: '#111120', border: '1px solid #1e1e2e', borderRadius: 8, color: '#fff', fontSize: 12, width: 140, outline: 'none' }}
        />
        <span className={`plan-chip ${user.plan}`}>{user.plan.toUpperCase()}</span>
        <div style={{ position: 'relative' }}>
          <button className="avatar-btn" onClick={() => setShowMenu(!showMenu)}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: 40, background: '#111120', border: '1px solid #1e1e2e', borderRadius: 10, padding: 8, minWidth: 160, zIndex: 200 }}>
              <div style={{ padding: '8px 12px', fontSize: 13, color: '#888' }}>{user.name}</div>
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', borderTop: '1px solid #1e1e2e' }}>{user.email}</div>
              <Link to="/profile" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: '#fff', textDecoration: 'none' }}>Profile</Link>
              <Link to="/plans" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: '#a78bfa', textDecoration: 'none' }}>Upgrade Plan</Link>
              <button onClick={() => { logout(); setShowMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
