/**
 * StockDetail - 종목 상세 (현재가 + 차트)
 * [A05: Injection] XSS
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = '/api/v2';

function StockDetail({ user }) {
  const { symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [chart, setChart] = useState([]);
  const [period, setPeriod] = useState('1mo');
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (symbol) {
      loadStockData();
    }
  }, [symbol, period]);

  const loadStockData = async () => {
    setLoading(true);
    try {
      // 현재가 조회
      const quoteRes = await fetch(`${API_BASE}/market/${symbol}/quote`);
      if (quoteRes.ok) {
        setQuote(await quoteRes.json());
      }

      // 차트 데이터
      const chartRes = await fetch(`${API_BASE}/market/${symbol}/chart?period=${period}`);
      if (chartRes.ok) {
        setChart(await chartRes.json());
      }

      // 관심종목 확인
      if (user) {
        const token = localStorage.getItem('token');
        const watchRes = await fetch(`${API_BASE}/market/watchlist?user_id=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (watchRes.ok) {
          const watchlist = await watchRes.json();
          setInWatchlist(watchlist.some(w => w.symbol === symbol));
        }
      }
    } catch (error) {
      console.error('Load stock data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      if (inWatchlist) {
        await fetch(`${API_BASE}/market/watchlist/${symbol}?user_id=${user.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setInWatchlist(false);
      } else {
        await fetch(`${API_BASE}/market/watchlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ user_id: user.id, symbol, name: quote?.name || symbol })
        });
        setInWatchlist(true);
      }
    } catch (error) {
      console.error('Toggle watchlist error:', error);
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

  // 간단한 차트 그리기 (SVG)
  const renderChart = () => {
    if (chart.length === 0) return null;

    const width = 800;
    const height = 300;
    const padding = 40;

    const prices = chart.map(c => c.close).filter(p => p !== null);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = chart.map((c, i) => {
      const x = padding + (i / (chart.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((c.close - minPrice) / priceRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const isUp = chart.length > 1 && chart[chart.length - 1].close >= chart[0].close;
    const lineColor = isUp ? '#26a69a' : '#ef5350';

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="stock-chart">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* 그리드 라인 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="#30363d"
              strokeWidth="1"
            />
            <text
              x={padding - 5}
              y={padding + ratio * (height - 2 * padding) + 4}
              fill="#8b949e"
              fontSize="10"
              textAnchor="end"
            >
              ${(maxPrice - ratio * priceRange).toFixed(2)}
            </text>
          </g>
        ))}

        {/* 차트 영역 */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill="url(#chartGradient)"
        />

        {/* 차트 라인 */}
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
        />
      </svg>
    );
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!quote) {
    return <div className="error">종목 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="stock-detail">
      {/* 헤더 */}
      <div className="stock-header">
        <div className="stock-info">
          <h1>{quote.name}</h1>
          <span className="stock-symbol-large">{quote.symbol}</span>
          <span className="stock-exchange">{quote.exchange}</span>
        </div>
        <div className="stock-actions">
          <button
            className={`btn ${inWatchlist ? 'btn-warning' : ''}`}
            onClick={toggleWatchlist}
          >
            {inWatchlist ? '⭐ 관심종목' : '☆ 관심종목 추가'}
          </button>
          <Link to={`/trade?symbol=${symbol}`} className="btn btn-primary">
            주문하기
          </Link>
        </div>
      </div>

      {/* 현재가 */}
      <div className="quote-section">
        <div className={`current-price ${getPriceClass(quote.change)}`}>
          <span className="currency">{quote.currency || 'USD'}</span>
          <span className="price">{formatNumber(quote.price?.toFixed(2))}</span>
        </div>
        <div className={`price-change ${getPriceClass(quote.change)}`}>
          {quote.change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(quote.change)?.toFixed(2))} ({formatPercent(quote.changePercent)})
        </div>
        <div className="market-state">
          {quote.marketState === 'REGULAR' ? '🟢 장중' : '🔴 장마감'}
        </div>
      </div>

      {/* 차트 */}
      <div className="chart-section">
        <div className="chart-periods">
          {['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y'].map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="chart-container">
          {renderChart()}
        </div>
      </div>

      {/* 시세 정보 */}
      <div className="quote-details">
        <h3>시세 정보</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">전일 종가</span>
            <span className="value">${formatNumber(quote.previousClose?.toFixed(2))}</span>
          </div>
          <div className="detail-item">
            <span className="label">시가</span>
            <span className="value">${formatNumber(quote.open?.toFixed(2))}</span>
          </div>
          <div className="detail-item">
            <span className="label">고가</span>
            <span className="value">${formatNumber(quote.high?.toFixed(2))}</span>
          </div>
          <div className="detail-item">
            <span className="label">저가</span>
            <span className="value">${formatNumber(quote.low?.toFixed(2))}</span>
          </div>
          <div className="detail-item">
            <span className="label">거래량</span>
            <span className="value">{formatNumber(quote.volume)}</span>
          </div>
          <div className="detail-item">
            <span className="label">시가총액</span>
            <span className="value">${formatNumber((quote.marketCap / 1e9)?.toFixed(2))}B</span>
          </div>
          <div className="detail-item">
            <span className="label">52주 최고</span>
            <span className="value">${formatNumber(quote.fiftyTwoWeekHigh?.toFixed(2))}</span>
          </div>
          <div className="detail-item">
            <span className="label">52주 최저</span>
            <span className="value">${formatNumber(quote.fiftyTwoWeekLow?.toFixed(2))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
