import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { streamAPI, videoAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Watch() {
  const { videoId, partId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPart, setCurrentPart] = useState(parseInt(partId));
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef(null);

  useEffect(() => {
    loadStream(partId);
    loadVideoInfo();
  }, [videoId, partId]);

  // Anti screen-record: detect visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Disable right click and keyboard shortcuts
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    const preventKeys = (e) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p'))) {
        e.preventDefault();
        toast.error('Recording/saving is not allowed');
      }
    };
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  async function loadStream(pId) {
    setLoading(true);
    setError(null);
    try {
      const res = await streamAPI.getToken(parseInt(videoId), parseInt(pId));
      const token = res.data.stream_token;
      setStreamUrl(streamAPI.watchUrl(token));
      if (user?.plan === 'premium') {
        setDownloadUrl(streamAPI.downloadUrl(token));
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Cannot load video';
      setError(msg);
      if (msg.includes('Upgrade') || msg.includes('plan')) {
        setTimeout(() => navigate('/plans'), 2000);
      }
    }
    setLoading(false);
  }

  async function loadVideoInfo() {
    try {
      const res = await videoAPI.get(videoId);
      setVideo(res.data);
    } catch {}
  }

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const switchPart = (part) => {
    setCurrentPart(part.id);
    loadStream(part.id);
  };

  return (
    <div
      className="watch-page"
      onMouseMove={handleMouseMove}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Player */}
      <div className="player-wrap" style={{ position: 'relative', background: '#000' }}>
        {loading && (
          <div style={{ width: '100%', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <div>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#666', fontSize: 13 }}>Loading video...</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ width: '100%', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{error}</div>
            <Link to="/plans"><button className="btn btn-primary">Upgrade Plan</button></Link>
          </div>
        )}

        {streamUrl && !loading && !error && (
          <>
            {/* Watermark overlay — anti screen record */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              userSelect: 'none', WebkitUserSelect: 'none'
            }}>
              <div style={{
                color: 'rgba(255,255,255,0.06)', fontSize: 18, fontWeight: 700,
                transform: 'rotate(-30deg)', letterSpacing: 8, whiteSpace: 'nowrap',
                textShadow: 'none', pointerEvents: 'none'
              }}>
                {user?.email} • FlickPlay
              </div>
            </div>

            {/* Invisible overlay to block right-click download */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'all' }}
              onContextMenu={e => { e.preventDefault(); toast.error('Downloading is not allowed'); }}
            />

            <video
              ref={videoRef}
              src={streamUrl}
              controls
              autoPlay
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              onContextMenu={e => e.preventDefault()}
              style={{ width: '100%', maxHeight: '72vh', display: 'block', position: 'relative', zIndex: 3 }}
            />
          </>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(`/video/${videoId}`)}
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            background: 'rgba(0,0,0,0.7)', border: '1px solid #333',
            color: '#fff', padding: '6px 14px', borderRadius: 8,
            fontSize: 13, cursor: 'pointer',
            opacity: showControls ? 1 : 0, transition: 'opacity 0.3s'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Meta */}
      <div className="watch-meta">
        <h2 className="watch-title">{video?.title || 'Loading...'}</h2>
        <div className="watch-info">
          {video?.category} {video?.year && `• ${video.year}`} {video?.quality && `• ${video.quality}`}
          {user?.plan === 'free' && (
            <span style={{ marginLeft: 12, color: '#f59e0b', fontSize: 12 }}>
              ⚠ Ads mode — <Link to="/plans" style={{ color: '#a78bfa' }}>upgrade</Link> for ad-free
            </span>
          )}
        </div>

        {/* Parts switcher */}
        {video?.parts?.length > 1 && (
          <div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Parts:</div>
            <div className="parts-list">
              {video.parts.map(part => (
                <button
                  key={part.id}
                  className={`part-btn ${currentPart === part.id ? 'active' : ''}`}
                  onClick={() => switchPart(part)}
                >
                  Part {part.part_number}
                  {part.duration && <span style={{ marginLeft: 4, opacity: 0.6 }}>({part.duration})</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download for premium */}
        {downloadUrl && (
          <div style={{ marginTop: 16 }}>
            <a href={downloadUrl} download>
              <button className="btn btn-outline" style={{ color: '#fbbf24', borderColor: '#78350f' }}>
                ⬇ Download this part
              </button>
            </a>
          </div>
        )}

        {/* Ad placeholder for free users */}
        {user?.plan === 'free' && (
          <div style={{ marginTop: 20, background: '#111120', border: '1px dashed #2a2a3a', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Advertisement</div>
            <div style={{ background: '#1a1a2e', height: 90, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 13 }}>
              Ad space — 320×90
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#555' }}>
              <Link to="/plans" style={{ color: '#a78bfa' }}>Upgrade to Pro (₹99/mo)</Link> to remove ads
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
