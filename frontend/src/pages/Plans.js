import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, color: '#16a34a',
    features: [
      { label: 'Watch with Ads', ok: true },
      { label: 'Free content only', ok: true },
      { label: '480p quality', ok: true },
      { label: 'No Downloads', ok: false },
      { label: 'No HD/4K', ok: false },
      { label: 'No offline mode', ok: false },
    ]
  },
  {
    id: 'pro', name: 'Pro', price: 99, color: '#7c3aed', popular: true,
    features: [
      { label: 'No Ads', ok: true },
      { label: 'Free + Pro content', ok: true },
      { label: '1080p HD quality', ok: true },
      { label: 'Stream on any device', ok: true },
      { label: 'No Downloads', ok: false },
      { label: 'No 4K', ok: false },
    ]
  },
  {
    id: 'premium', name: 'Premium', price: 199, color: '#d97706',
    features: [
      { label: 'No Ads', ok: true },
      { label: 'All content unlocked', ok: true },
      { label: '4K Ultra HD', ok: true },
      { label: 'Download & Offline', ok: true },
      { label: 'Priority support', ok: true },
      { label: 'Early access to new content', ok: true },
    ]
  }
];

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleUpgrade = (plan) => {
    if (plan.id === 'free') return;
    if (user?.plan === plan.id) { toast.success('You are already on this plan!'); return; }
    // In production: integrate Razorpay/PayU here
    toast.success(`Redirecting to payment for ${plan.name} plan...`);
    // window.open(`https://your-payment-gateway.com?plan=${plan.id}&amount=${plan.price}`, '_blank');
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Choose your plan</h1>
        <p style={{ color: '#888', fontSize: 14 }}>Start free, upgrade anytime. No hidden charges.</p>
      </div>

      <div className="plans-grid" style={{ maxWidth: 800, margin: '0 auto' }}>
        {PLANS.map(plan => (
          <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-label">Most Popular</div>}
            <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
            <div className="plan-price">
              {plan.price === 0 ? 'Free' : `₹${plan.price}`}
              {plan.price > 0 && <small>/month</small>}
            </div>
            <div className="plan-features">
              {plan.features.map((f, i) => (
                <div key={i} className={`plan-feature ${f.ok ? 'yes' : 'no'}`}>
                  {f.ok ? '✓' : '✗'} {f.label}
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12, background: user?.plan === plan.id ? '#1a2a1a' : plan.color, color: user?.plan === plan.id ? '#4ade80' : '#fff' }}
              onClick={() => handleUpgrade(plan)}
            >
              {user?.plan === plan.id ? '✓ Current Plan' : plan.price === 0 ? 'Free Forever' : `Upgrade — ₹${plan.price}/mo`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Frequently Asked Questions</h3>
        {[
          ['Can I cancel anytime?', 'Yes, you can cancel your subscription at any time. You will have access until the end of your billing period.'],
          ['Is my payment secure?', 'Yes, payments are processed via Razorpay with 256-bit SSL encryption.'],
          ['Can I download on mobile?', 'Yes, Premium users can download videos on both Android and iOS apps.'],
          ['What is screen recording protection?', 'FlickPlay uses DRM technology and invisible watermarks to prevent unauthorized recording.'],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #1e1e2e' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q}</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
