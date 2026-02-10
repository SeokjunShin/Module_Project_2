/**
 * StockSearch - 종목 검색
 * Yahoo Finance 기반 검색
 * [A05: Injection] XSS, SQL Injection
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_BASE = '/api/v2';

function StockSearch({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    // 로컬스토리지에서 최근 검색어 로드
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent);

    // URL 파라미터로 검색
    const q = searchParams.get('q');
    if (q) {
      searchStocks(q);
    }
  }, []);

  const searchStocks = async (q) => {
    if (!q.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }

      // 최근 검색어 저장
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [q, ...recent.filter(r => r !== q)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      searchStocks(query);
    }
  };

  const handleQuickSearch = (q) => {
    setQuery(q);
    setSearchParams({ q });
    searchStocks(q);
  };

  const addToWatchlist = async (symbol, name) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/market/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: user.id, symbol, name })
      });

      if (res.ok) {
        alert('관심종목에 추가되었습니다.');
      }
    } catch (error) {
      console.error('Add watchlist error:', error);
    }
  };

  // 인기 종목 목록
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'NFLX', name: 'Netflix' }
  ];

  return (
    <div className="stock-search">
      <h1>🔍 종목 검색</h1>

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명 또는 심볼 입력 (예: AAPL, Tesla)"
          className="search-input"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      {/* 인기 종목 */}
      <div className="popular-stocks">
        <h3>인기 종목</h3>
        <div className="stock-tags">
          {popularStocks.map((stock) => (
            <button
              key={stock.symbol}
              className="stock-tag"
              onClick={() => handleQuickSearch(stock.symbol)}
            >
              {stock.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* 최근 검색어 */}
      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <h3>최근 검색어</h3>
          <div className="stock-tags">
            {recentSearches.map((term, i) => (
              <button
                key={i}
                className="stock-tag recent"
                onClick={() => handleQuickSearch(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {results.length > 0 && (
        <div className="search-results">
          <h3>검색 결과 ({results.length}건)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>심볼</th>
                <th>종목명</th>
                <th>거래소</th>
                <th>유형</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {results.map((stock, i) => (
                <tr key={i}>
                  <td>
                    <Link to={`/stocks/${stock.symbol}`} className="symbol-link">
                      {stock.symbol}
                    </Link>
                  </td>
                  <td>{stock.name}</td>
                  <td>{stock.exchange}</td>
                  <td>{stock.type}</td>
                  <td>
                    <Link to={`/stocks/${stock.symbol}`} className="btn btn-sm">
                      상세
                    </Link>
                    <button
                      className="btn btn-sm"
                      onClick={() => addToWatchlist(stock.symbol, stock.name)}
                    >
                      ⭐
                    </button>
                    <Link to={`/trade?symbol=${stock.symbol}`} className="btn btn-sm btn-primary">
                      주문
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {query && results.length === 0 && !loading && (
        <div className="no-results">
          <p>"{query}"에 대한 검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default StockSearch;
