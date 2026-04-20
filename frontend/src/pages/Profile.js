import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenAPI } from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadTokens(); }, []);

  async function loadTokens() {
    try {
      const res = await tokenAPI.myTokens();
      setTokens(res.data);
    } catch {}
  }

  async function generateToken() {
    setGenerating(true);
    try {
      const res = await tokenAPI.generate();
      toast.success('New 12-hour access link generated!');
      const url = `${window.location.origin}${res.data.app_url}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied to clipboard!');
      loadTokens();
    } catch { toast.error('Failed to generate token'); }
    setGenerating(false);
  }

  const planColors = { free: '#16a34a', pro: '#7c3aed', premium: '#d97706' };

  return (
    <div style={{ maxWidth: 600, margin: '32px auto', padding: '0 24px' }}>
      {/* User card */}
      <div style={{ background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: '#888' }}>{user?.email}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ background: planColors[user?.plan] + '22', color: planColors[user?.plan], fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                {user?.plan?.toUpperCase()} PLAN
              </span>
            </div>
          </div>
        </div>
        {user?.plan !== 'premium' && (
          <Link to="/plans">
            <button className="btn btn-primary" style={{ width: '100%' }}>
              ⬆ Upgrade Plan — Get more features
            </button>
          </Link>
        )}
      </div>

      {/* 12-Hour Access Tokens */}
      <div style={{ background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>12-Hour Access Links</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Generate a link valid for 12 hours to access the app</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateToken} disabled={generating}>
            {generating ? '...' : '+ Generate'}
          </button>
        </div>
        {tokens.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#555', fontSize: 13 }}>No active links. Generate one above.</div>
        )}
        {tokens.map(t => {
          const isExpired = new Date(t.expires_at) < new Date();
          const url = `${window.location.origin}/app?token=${t.token}`;
          return (
            <div key={t.token} style={{ padding: '10px 12px', background: '#111120', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', wordBreak: 'break-all' }}>{t.token.slice(0, 24)}...</div>
                <div style={{ fontSize: 10, color: isExpired ? '#ef4444' : '#4ade80', marginTop: 3 }}>
                  {isExpired ? '✗ Expired' : `✓ Valid until ${new Date(t.expires_at).toLocaleString()}`}
                </div>
              </div>
              {!isExpired && (
                <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied!'); }}>
                  Copy
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan features */}
      <div style={{ background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Your Plan Features</div>
        {[
          ['Ads', user?.plan === 'free' ? 'Shown (upgrade to remove)' : 'None', user?.plan !== 'free'],
          ['Video Quality', user?.plan === 'free' ? '480p' : user?.plan === 'pro' ? '1080p HD' : '4K Ultra HD', true],
          ['Downloads', user?.plan === 'premium' ? 'Unlimited' : 'Not available', user?.plan === 'premium'],
          ['Content Access', user?.plan === 'free' ? 'Free content only' : user?.plan === 'pro' ? 'Free + Pro' : 'All content', true],
          ['Telegram', user?.telegram_joined ? 'Joined ✓' : 'Not joined', user?.telegram_joined],
        ].map(([label, value, good]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e', fontSize: 13 }}>
            <span style={{ color: '#888' }}>{label}</span>
            <span style={{ color: good ? '#4ade80' : '#888' }}>{value}</span>
          </div>
        ))}
      </div>

      <button onClick={logout} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid #7f1d1d', borderRadius: 10, color: '#ef4444', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
        Sign Out
      </button>
    </div>
  );
}
