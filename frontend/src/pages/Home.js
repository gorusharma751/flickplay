import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { videoAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';

const SECTIONS = [
  { label: 'Trending Movies', category: 'Movies' },
  { label: 'Popular Web Series', category: 'Web Series' },
  { label: 'Latest Shows', category: 'Shows' },
  { label: 'Drama Collection', category: 'Drama' },
];

const CATEGORIES = ['All', 'Movies', 'Web Series', 'Shows', 'Drama', 'Hindi', 'English', 'South'];

export default function Home() {
  const { user, markTelegramJoined } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [sections, setSections] = useState({});
  const [activeTab, setActiveTab] = useState('All');
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tgDismissed, setTgDismissed] = useState(user?.telegram_joined);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [featuredRes, allRes] = await Promise.all([
        videoAPI.featured(),
        videoAPI.list({ limit: 40 })
      ]);
      setFeatured(featuredRes.data);
      setAllVideos(allRes.data.videos);

      const sectionData = {};
      for (const s of SECTIONS) {
        try {
          const res = await videoAPI.list({ category: s.category, limit: 10 });
          sectionData[s.label] = res.data.videos;
        } catch {}
      }
      setSections(sectionData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const hero = featured[heroIndex];
  const showAds = user?.plan === 'free';
  const filteredVideos = activeTab === 'All' ? allVideos :
    allVideos.filter(v => v.category === activeTab || v.language === activeTab);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      {/* Hero Section */}
      {hero && (
        <div className="hero">
          <div className="hero-content">
            <span className="hero-category">{hero.category}</span>
            <h1 className="hero-title">{hero.title}</h1>
            <div className="hero-meta">
              {hero.year && `${hero.year} • `}{hero.quality} • ⭐ {hero.rating?.toFixed(1) || 'N/A'}
            </div>
            <p className="hero-desc">{hero.description?.slice(0, 120)}{hero.description?.length > 120 ? '...' : ''}</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/video/${hero.id}`)}>▶ Watch Now</button>
              <button className="btn btn-outline" onClick={() => navigate(`/video/${hero.id}`)}>ℹ More Info</button>
              {user?.plan !== 'premium' && (
                <button className="btn btn-outline" style={{ color: '#888', cursor: 'default', fontSize: 12 }} disabled>
                  ⬇ Download — Premium Only
                </button>
              )}
            </div>
          </div>
          {featured.length > 1 && (
            <div style={{ position: 'absolute', bottom: 16, right: 24, display: 'flex', gap: 6 }}>
              {featured.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  style={{ width: i === heroIndex ? 24 : 8, height: 8, borderRadius: 4, background: i === heroIndex ? '#a78bfa' : '#444', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Telegram Join Banner */}
      {!tgDismissed && (
        <div className="tg-banner">
          <div className="tg-icon">✈</div>
          <div className="tg-info">
            <div className="tg-title">Join FlickPlay on Telegram</div>
            <div className="tg-sub">Get notified about new movies, shows & exclusive content</div>
          </div>
          <button className="tg-btn" onClick={async () => {
            window.open('https://t.me/flickplay', '_blank');
            await markTelegramJoined();
            setTgDismissed(true);
          }}>Join Now</button>
          <button onClick={() => setTgDismissed(true)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Ad Banner for free users */}
      {showAds && (
        <div className="ad-banner">
          <strong>Advertisement</strong> — Watching ads keeps FlickPlay free! &nbsp;
          <Link to="/plans" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>Upgrade to Pro</Link> to remove all ads.
        </div>
      )}

      {/* Category Tabs + All Videos */}
      <div style={{ marginBottom: 28 }}>
        <div className="cat-tabs">
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-tab ${activeTab === c ? 'active' : ''}`} onClick={() => setActiveTab(c)}>{c}</button>
          ))}
        </div>
        <div className="section">
          <div className="cards-grid">
            {filteredVideos.map(v => <VideoCard key={v.id} video={v} />)}
            {filteredVideos.length === 0 && (
              <div style={{ color: '#555', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>No videos found</div>
            )}
          </div>
        </div>
      </div>

      {/* Category Sections */}
      {SECTIONS.map(s => (
        sections[s.label]?.length > 0 && (
          <div key={s.label} className="section">
            <div className="section-header">
              <span className="section-title">{s.label}</span>
              <Link to={`/category/${s.category.toLowerCase().replace(' ', '-')}`} className="see-all">See all →</Link>
            </div>
            <div className="cards-grid">
              {sections[s.label].slice(0, 10).map(v => <VideoCard key={v.id} video={v} />)}
            </div>
          </div>
        )
      ))}

      {/* Plans Promo */}
      <div style={{ padding: '0 24px 40px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1a0a2e, #0d1a2e)', borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Upgrade for the best experience</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>No ads, HD quality, and downloads with Premium</div>
          </div>
          <Link to="/plans" className="btn btn-primary">View Plans</Link>
        </div>
      </div>
    </div>
  );
}
