/**
 * Stock Search Page
 * [A05: Injection] XSS
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function StockSearch() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [market, setMarket] = useState('kospi');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const response = await axios.get(`${API_URL}/market/search`, {
        params: { q: query, market }
      });
      setResults(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>🔍 종목 검색</h1>
      
      <div className="card">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 또는 종목코드 입력"
            style={{ flex: 1 }}
          />
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="kospi">KOSPI</option>
            <option value="kosdaq">KOSDAQ</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '검색중...' : '검색'}
          </button>
        </form>
      </div>
      
      {/* [A05: Reflected XSS] 검색어를 그대로 렌더링 */}
      {searched && (
        <div className="card">
          <h3 className="card-header">
            {/* 취약: dangerouslySetInnerHTML 사용 */}
            <span dangerouslySetInnerHTML={{ __html: `"${query}" 검색 결과` }} />
          </h3>
          
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : results.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>종목코드</th>
                  <th>종목명</th>
                  <th>시장</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock) => (
                  <tr key={stock.symbol}>
                    <td>{stock.symbol}</td>
                    {/* [A05: Stored XSS] DB에서 가져온 데이터 그대로 렌더링 */}
                    <td dangerouslySetInnerHTML={{ __html: stock.name }} />
                    <td>{stock.market?.toUpperCase()}</td>
                    <td>
                      <Link to={`/stocks/${stock.symbol}`} className="btn">
                        상세보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#8b949e' }}>검색 결과가 없습니다.</p>
          )}
        </div>
      )}
      
      {/* 인기 종목 */}
      <div className="card">
        <h3 className="card-header">📈 인기 종목</h3>
        <div className="grid grid-4">
          {['005930', '000660', '035420', '035720', '051910', '006400', '003550', '105560'].map((symbol) => (
            <Link key={symbol} to={`/stocks/${symbol}`} className="btn" style={{ textAlign: 'center' }}>
              {symbol}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StockSearch;
