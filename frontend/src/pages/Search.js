import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../api';
import VideoCard from '../components/VideoCard';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [searchParams]);

  async function doSearch(q) {
    if (!q?.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await videoAPI.search(q.trim());
      setResults(res.data);
    } catch {}
    setLoading(false);
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div style={{ padding: '24px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          className="search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies, shows, web series..."
          autoFocus
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}

      {!loading && searched && (
        <div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            {results.length > 0 ? `${results.length} results for "${searchParams.get('q')}"` : `No results for "${searchParams.get('q')}"`}
          </div>
          <div className="cards-grid">
            {results.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
          {results.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div>Try different keywords or browse categories</div>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div>Search for your favorite movies, shows, and series</div>
        </div>
      )}
    </div>
  );
}
