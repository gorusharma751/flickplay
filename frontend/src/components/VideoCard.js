import React from 'react';
import { useNavigate } from 'react-router-dom';

const EMOJIS = { 'Movies': '🎬', 'Web Series': '📺', 'Shows': '🎭', 'Drama': '🌟', 'Kids': '🧒', 'default': '🎬' };

export default function VideoCard({ video }) {
  const navigate = useNavigate();

  return (
    <div className="video-card" onClick={() => navigate(`/video/${video.id}`)}>
      <div className="card-thumb">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} loading="lazy" />
        ) : (
          <span className="card-thumb-placeholder">{EMOJIS[video.category] || EMOJIS.default}</span>
        )}
        <div className="card-overlay">
          <div className="card-title">{video.title}</div>
          <div className="card-meta">{video.year && `${video.year} • `}{video.quality || 'HD'}</div>
        </div>
        {video.access_level === 'free' && <span className="badge badge-free badge-abs">FREE</span>}
        {video.access_level === 'pro' && <span className="badge badge-pro badge-abs">PRO</span>}
        {video.access_level === 'premium' && <span className="badge badge-premium badge-abs">PREMIUM</span>}
        {video.access_level !== 'free' && <div className="lock-badge">🔒</div>}
        {video.is_featured && <span style={{ position: 'absolute', bottom: 36, left: 6, background: '#7c3aed', color: '#e9d5ff', fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>FEATURED</span>}
      </div>
    </div>
  );
}
