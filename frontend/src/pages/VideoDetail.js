import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import toast from 'react-hot-toast';

const PLAN_LEVELS = { free: 0, pro: 1, premium: 2 };
const ACCESS_LEVELS = { free: 0, pro: 1, premium: 2 };

export default function VideoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, [id]);

  async function loadVideo() {
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([videoAPI.get(id), videoAPI.related(id)]);
      setVideo(vRes.data);
      setRelated(rRes.data);
    } catch {
      toast.error('Video not found');
      navigate('/');
    }
    setLoading(false);
  }

  const canWatch = () => {
    if (!video) return false;
    return PLAN_LEVELS[user?.plan || 'free'] >= ACCESS_LEVELS[video.access_level || 'free'];
  };

  const canDownload = () => user?.plan === 'premium';

  const handleWatch = (partId) => {
    if (!canWatch()) {
      toast.error(`This content requires ${video.access_level} plan. Please upgrade.`);
      navigate('/plans');
      return;
    }
    navigate(`/watch/${id}/${partId}`);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!video) return null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28 }}>
        {/* Poster */}
        <div>
          <div style={{ width: '100%', aspectRatio: '2/3', background: '#111120', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            {video.thumbnail_url
              ? <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🎬'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {video.parts?.length > 0 ? (
              video.parts.map(part => (
                <button key={part.id} className="btn btn-primary" style={{ width: '100%' }}
                  onClick={() => handleWatch(part.id)}>
                  ▶ {video.parts.length > 1 ? `Watch Part ${part.part_number}` : 'Watch Now'}
                  {part.duration && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>({part.duration})</span>}
                </button>
              ))
            ) : (
              <button className="btn btn-primary" style={{ width: '100%', opacity: 0.5 }} disabled>
                No parts uploaded yet
              </button>
            )}
            {canDownload() && video.parts?.length > 0 && (
              <button className="btn btn-outline" style={{ width: '100%', color: '#fbbf24', borderColor: '#78350f' }}
                onClick={() => navigate(`/watch/${id}/${video.parts[0].id}?download=1`)}>
                ⬇ Download
              </button>
            )}
            {!canDownload() && (
              <Link to="/plans" style={{ textDecoration: 'none' }}>
                <button className="btn btn-outline" style={{ width: '100%', color: '#888', borderColor: '#333', fontSize: 12 }}>
                  ⬇ Download — Premium Only
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ background: '#1a0a2e', color: '#a78bfa', fontSize: 11, padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>
              {video.category}
            </span>
            {!canWatch() && (
              <span style={{ marginLeft: 8, background: '#7c3aed', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 4, fontWeight: 600 }}>
                🔒 {video.access_level?.toUpperCase()} REQUIRED
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '10px 0 8px', lineHeight: 1.2 }}>{video.title}</h1>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14, fontSize: 13, color: '#888' }}>
            {video.year && <span>📅 {video.year}</span>}
            {video.duration && <span>⏱ {video.duration}</span>}
            {video.quality && <span>📺 {video.quality}</span>}
            {video.language && <span>🗣 {video.language}</span>}
            {video.rating > 0 && <span>⭐ {video.rating.toFixed(1)}</span>}
            <span>👁 {video.views?.toLocaleString()} views</span>
            {video.total_parts > 1 && <span>📦 {video.total_parts} Parts</span>}
          </div>

          {video.description && (
            <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7, marginBottom: 16 }}>{video.description}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 20 }}>
            {video.director && <div style={{ fontSize: 13 }}><span style={{ color: '#666' }}>Director: </span><span>{video.director}</span></div>}
            {video.cast && <div style={{ fontSize: 13 }}><span style={{ color: '#666' }}>Cast: </span><span>{video.cast}</span></div>}
            {video.season && <div style={{ fontSize: 13 }}><span style={{ color: '#666' }}>Season: </span><span>{video.season}</span></div>}
          </div>

          {video.tags && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {video.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} style={{ background: '#111120', border: '1px solid #1e1e2e', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#888' }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Parts list */}
          {video.parts?.length > 1 && (
            <div style={{ background: '#111120', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>All Parts</div>
              {video.parts.map(part => (
                <div key={part.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Part {part.part_number}{part.title ? ` — ${part.title}` : ''}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{part.duration} {part.size_mb && `• ${part.size_mb.toFixed(0)} MB`} • {part.quality}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => handleWatch(part.id)}>▶ Play</button>
                </div>
              ))}
            </div>
          )}

          {!canWatch() && (
            <div style={{ background: '#1a0a2e', border: '1px solid #4c1d95', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>🔒 Upgrade to watch this content</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>This content requires {video.access_level} plan (₹{video.access_level === 'pro' ? 99 : 199}/month)</div>
              <Link to="/plans"><button className="btn btn-primary">View Plans →</button></Link>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>More like this</div>
          <div className="cards-grid">
            {related.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}
