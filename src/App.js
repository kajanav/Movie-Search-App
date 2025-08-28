import React, { useState, useEffect } from 'react';
import './App.css';

// Note: set your OMDB API key in an environment variable named
// REACT_APP_OMDB_API_KEY. Do NOT commit your key to source control.
const API_KEY = process.env.REACT_APP_OMDB_API_KEY;

function App() {
  const [query, setQuery] = useState('batman');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  async function fetchMoviesByTitle(title) {
    if (!title) return;
    if (!API_KEY) {
      setError('Missing OMDB API key. Add REACT_APP_OMDB_API_KEY to your .env and restart the dev server.');
      return;
    }
    setLoading(true);
    setError('');
    setMovies([]);

    try {
      const searchRes = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(title)}&type=movie`);
      const searchData = await searchRes.json();


      if (searchData.Response === 'False') {
        // Surface OMDB error message (for example: "Invalid API key!" or "Movie not found!")
        setError(searchData.Error || 'No movies found');
        setLoading(false);
        return;
      }

      // For each movie returned, fetch details to get ratings
      // Limit detail requests to the first 10 results to reduce the number of requests and
      // avoid quickly hitting rate limits for free OMDB keys.
      const slice = searchData.Search.slice(0, 10);
      const detailsPromises = slice.map(m =>
        fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${m.imdbID}`).then(r => r.json())
      );

      const detailed = await Promise.all(detailsPromises);

      const normalized = detailed.map(d => ({
        imdbID: d.imdbID,
        title: d.Title,
        poster: d.Poster && d.Poster !== 'N/A' ? d.Poster : null,
        rating: d.imdbRating && d.imdbRating !== 'N/A' ? d.imdbRating : '—',
        year: d.Year,
      }));

      setMovies(normalized);
    } catch (err) {
      setError('Failed to fetch movies.');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    fetchMoviesByTitle(query.trim());
  }

  function openModal(url, title) {
    setModalUrl(url);
    setModalTitle(title || 'IMDb');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalUrl('');
    setModalTitle('');
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    if (modalOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  return (
    <div className="App app-movie-search">
      <header className="App-header">
        <h1>Movie Search</h1>
        <form className="search-form" onSubmit={onSubmit}>
          <input
            aria-label="Search movies by title"
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                fetchMoviesByTitle(query.trim());
              }
            }}
            placeholder="Search movies by title (e.g. Inception)"
          />
          <button className="search-button" type="submit" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            <span className="search-button-label">{loading ? 'Searching…' : 'Search'}</span>
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {!error && movies.length === 0 && !loading && (
          <div className="hint">Try searching for a movie above.</div>
        )}

        {loading && movies.length === 0 && (
          <div className="overlay-loader" aria-hidden>
            <div className="spinner big" />
          </div>
        )}

        <main className="movies-grid">
          {movies.map(m => (
            <article key={m.imdbID} className="movie-card">
              <div className="poster-wrapper">
                {m.poster ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={m.poster} alt={`Poster of ${m.title}`} className="poster" />
                ) : (
                  <div className="no-poster">No poster</div>
                )}
              </div>
              <div className="movie-info">
                <h3 className="movie-title">{m.title}</h3>

                <div className="movie-badge">
                  <span className="badge-year">{m.year}</span>
                  <span className="badge-rating">⭐ {m.rating}</span>
                </div>
                <a
                  className="imdb-btn"
                  href={`https://www.imdb.com/title/${m.imdbID}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${m.title} on IMDb`}
                >
                  View on IMDb
                </a>
              </div>
            </article>
          ))}
        </main>

        {modalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`IMDb - ${modalTitle}`} onClick={closeModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal} aria-label="Close modal">×</button>
              <div className="modal-header">{modalTitle}</div>
              <iframe className="modal-iframe" src={modalUrl} title={modalTitle} />
              <div className="modal-actions">
                <a href={modalUrl} target="_blank" rel="noopener noreferrer" className="imdb-link">Open on IMDb</a>
              </div>
            </div>
          </div>
        )}

        <div className="footer-note">
          Powered by OMDB API — set <code>REACT_APP_OMDB_API_KEY</code> in your .env
        </div>
      </header>
    </div>
  );
}

export default App;
