/**
 * Dashboard - 메인 대시보드
 * 지수/상승하락/관심종목 요약
 * [A05: Injection] XSS
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = '/api/v2';

function Dashboard({ user }) {
  const [indices, setIndices] = useState([]);
  const [trending, setTrending] = useState({ gainers: [], losers: [], active: [] });
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // 주요 지수
      const indicesRes = await fetch(`${API_BASE}/market/indices`);
      if (indicesRes.ok) {
        setIndices(await indicesRes.json());
      }

      // 인기/상승/하락 종목
      const trendingRes = await fetch(`${API_BASE}/market/trending`);
      if (trendingRes.ok) {
        setTrending(await trendingRes.json());
      }

      // 관심종목 (로그인 시)
      if (user) {
        const token = localStorage.getItem('token');
        
        const watchlistRes = await fetch(`${API_BASE}/market/watchlist?user_id=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (watchlistRes.ok) {
          setWatchlist(await watchlistRes.json());
        }

        // 포트폴리오 요약
        const portfolioRes = await fetch(`${API_BASE}/trade/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (portfolioRes.ok) {
          setPortfolio(await portfolioRes.json());
        }
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatPercent = (num) => {
    if (num === undefined || num === null) return '-';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const getPriceClass = (change) => {
    if (change > 0) return 'price-up';
    if (change < 0) return 'price-down';
    return '';
  };

  if (loading) {
    return <div className="loading">데이터 로딩 중...</div>;
  }

  return (
    <div className="dashboard">
      <h1>📊 대시보드</h1>

      {/* 주요 지수 */}
      <section className="dashboard-section">
        <h2>📈 주요 지수</h2>
        <div className="indices-grid">
          {indices.map((idx, i) => (
            <div key={i} className="index-card">
              <h3>{idx.name}</h3>
              <div className={`index-price ${getPriceClass(idx.change)}`}>
                {formatNumber(idx.price?.toFixed(2))}
              </div>
              <div className={`index-change ${getPriceClass(idx.change)}`}>
                {formatNumber(idx.change?.toFixed(2))} ({formatPercent(idx.changePercent)})
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 포트폴리오 요약 (로그인 시) */}
      {user && portfolio && (
        <section className="dashboard-section">
          <h2>💰 내 자산 요약</h2>
          <div className="portfolio-summary">
            <div className="summary-card">
              <h3>총 자산</h3>
              <div className="summary-value">{formatNumber(portfolio.totalAssets?.toFixed(0))}원</div>
            </div>
            <div className="summary-card">
              <h3>평가 금액</h3>
              <div className="summary-value">{formatNumber(portfolio.totalValue?.toFixed(0))}원</div>
            </div>
            <div className="summary-card">
              <h3>현금</h3>
              <div className="summary-value">{formatNumber(portfolio.cash?.toFixed(0))}원</div>
            </div>
            <div className={`summary-card ${getPriceClass(portfolio.totalPnL)}`}>
              <h3>총 손익</h3>
              <div className="summary-value">
                {formatNumber(portfolio.totalPnL?.toFixed(0))}원
                <span className="pnl-percent">({formatPercent(portfolio.totalPnLPercent)})</span>
              </div>
            </div>
          </div>
          <Link to="/portfolio" className="btn btn-primary" style={{ marginTop: '10px' }}>
            상세보기 →
          </Link>
        </section>
      )}

      {/* 상승/하락 종목 */}
      <div className="trending-grid">
        <section className="dashboard-section">
          <h2>🚀 상승 TOP 5</h2>
          <div className="stock-list">
            {trending.gainers.map((stock, i) => (
              <Link to={`/stocks/${stock.symbol}`} key={i} className="stock-item">
                <span className="stock-symbol">{stock.symbol}</span>
                <span className="stock-name">{stock.name}</span>
                <span className="stock-price">${formatNumber(stock.price?.toFixed(2))}</span>
                <span className="stock-change price-up">
                  {formatPercent(stock.changePercent)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h2>📉 하락 TOP 5</h2>
          <div className="stock-list">
            {trending.losers.map((stock, i) => (
              <Link to={`/stocks/${stock.symbol}`} key={i} className="stock-item">
                <span className="stock-symbol">{stock.symbol}</span>
                <span className="stock-name">{stock.name}</span>
                <span className="stock-price">${formatNumber(stock.price?.toFixed(2))}</span>
                <span className="stock-change price-down">
                  {formatPercent(stock.changePercent)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* 관심종목 (로그인 시) */}
      {user && (
        <section className="dashboard-section">
          <h2>⭐ 관심종목</h2>
          {watchlist.length === 0 ? (
            <p style={{ color: '#8b949e' }}>
              관심종목이 없습니다. <Link to="/stocks">종목 검색</Link>에서 추가하세요.
            </p>
          ) : (
            <div className="stock-list">
              {watchlist.map((item, i) => (
                <Link to={`/stocks/${item.symbol}`} key={i} className="stock-item">
                  <span className="stock-symbol">{item.symbol}</span>
                  <span className="stock-name">{item.name}</span>
                  {item.quote && (
                    <>
                      <span className="stock-price">${formatNumber(item.quote.price?.toFixed(2))}</span>
                      <span className={`stock-change ${getPriceClass(item.quote.change)}`}>
                        {formatPercent(item.quote.changePercent)}
                      </span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 비로그인 안내 */}
      {!user && (
        <section className="dashboard-section" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>🎯 모의투자를 시작하세요!</h2>
          <p style={{ color: '#8b949e', marginBottom: '20px' }}>
            1억원의 가상 자금으로 실제 주식 투자를 연습할 수 있습니다.
          </p>
          <Link to="/register" className="btn btn-primary" style={{ marginRight: '10px' }}>
            회원가입
          </Link>
          <Link to="/login" className="btn">
            로그인
          </Link>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
