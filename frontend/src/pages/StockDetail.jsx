/**
 * Stock Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function StockDetail({ user }) {
  const { symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStockData();
  }, [symbol]);

  const loadStockData = async () => {
    try {
      const response = await axios.get(`${API_URL}/market/${symbol}/quote`);
      setQuote(response.data?.output || null);
    } catch (err) {
      setError(err.response?.data?.error || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/market/watchlist`, {
        userId: user.id,
        symbol,
        name: quote?.hts_kor_isnm || symbol
      });
      alert('관심종목에 추가되었습니다.');
    } catch (err) {
      alert(err.response?.data?.error || '추가 실패');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!quote) {
    return <div className="alert alert-warning">종목 정보를 찾을 수 없습니다.</div>;
  }

  const priceChange = Number(quote.prdy_vrss || 0);
  const priceChangeRate = Number(quote.prdy_ctrt || 0);
  const isUp = priceChange >= 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>{quote.hts_kor_isnm || symbol}</h1>
          <span style={{ color: '#8b949e' }}>{symbol}</span>
        </div>
        <div>
          <button onClick={addToWatchlist} className="btn" style={{ marginRight: '8px' }}>
            ⭐ 관심종목
          </button>
          <Link to={`/trading?symbol=${symbol}`} className="btn btn-primary">
            주문하기
          </Link>
        </div>
      </div>
      
      <div className="grid grid-2">
        {/* 현재가 정보 */}
        <div className="card">
          <h3 className="card-header">현재가</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '12px' }} className={isUp ? 'price-up' : 'price-down'}>
            {Number(quote.stck_prpr || 0).toLocaleString()}원
          </div>
          <div className={isUp ? 'price-up' : 'price-down'}>
            {isUp ? '▲' : '▼'} {Math.abs(priceChange).toLocaleString()}원 ({priceChangeRate}%)
          </div>
        </div>
        
        {/* 거래 정보 */}
        <div className="card">
          <h3 className="card-header">거래 정보</h3>
          <table className="table">
            <tbody>
              <tr>
                <td>거래량</td>
                <td>{Number(quote.acml_vol || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>거래대금</td>
                <td>{Number(quote.acml_tr_pbmn || 0).toLocaleString()}원</td>
              </tr>
              <tr>
                <td>시가</td>
                <td>{Number(quote.stck_oprc || 0).toLocaleString()}원</td>
              </tr>
              <tr>
                <td>고가</td>
                <td className="price-up">{Number(quote.stck_hgpr || 0).toLocaleString()}원</td>
              </tr>
              <tr>
                <td>저가</td>
                <td className="price-down">{Number(quote.stck_lwpr || 0).toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 52주 정보 */}
      <div className="card">
        <h3 className="card-header">52주 정보</h3>
        <div className="grid grid-4">
          <div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>52주 최고</div>
            <div className="price-up">{Number(quote.w52_hgpr || 0).toLocaleString()}원</div>
          </div>
          <div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>52주 최저</div>
            <div className="price-down">{Number(quote.w52_lwpr || 0).toLocaleString()}원</div>
          </div>
          <div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>PER</div>
            <div>{quote.per || '-'}</div>
          </div>
          <div>
            <div style={{ color: '#8b949e', marginBottom: '4px' }}>PBR</div>
            <div>{quote.pbr || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
