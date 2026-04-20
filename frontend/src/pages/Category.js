// Category.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { videoAPI } from '../api';
import VideoCard from '../components/VideoCard';

export function Category() {
  const { cat } = useParams();
  const category = cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadVideos(1); }, [cat]);

  async function loadVideos(p) {
    setLoading(true);
    try {
      const res = await videoAPI.list({ category, page: p, limit: 24 });
      setVideos(res.data.videos);
      setTotalPages(res.data.pages);
      setPage(p);
    } catch {}
    setLoading(false);
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>{category}</h1>
      {loading ? <div className="loading-screen"><div className="spinner" /></div> : (
        <>
          <div className="cards-grid">
            {videos.map(v => <VideoCard key={v.id} video={v} />)}
            {videos.length === 0 && <div style={{ color: '#555', gridColumn: '1/-1', textAlign: 'center', padding: 60 }}>No {category} found yet</div>}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
              <button className="btn btn-outline btn-sm" onClick={() => loadVideos(page - 1)} disabled={page <= 1}>← Prev</button>
              <span style={{ padding: '5px 12px', fontSize: 12, color: '#666' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" onClick={() => loadVideos(page + 1)} disabled={page >= totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default Category;
