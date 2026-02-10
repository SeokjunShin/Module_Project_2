/**
 * Portfolio - 내 자산 (보유/손익/거래내역)
 * [A01: Broken Access Control] IDOR
 * [A05: Injection] XSS
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = '/api/v2';

function Portfolio({ user }) {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('holdings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 포트폴리오 조회
      const portfolioRes = await fetch(`${API_BASE}/trade/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (portfolioRes.ok) {
        setPortfolio(await portfolioRes.json());
      }

      // 주문 내역
      const ordersRes = await fetch(`${API_BASE}/trade/orders?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        setOrders(await ordersRes.json());
      }
    } catch (error) {
      console.error('Load portfolio error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPortfolio = async () => {
    if (!confirm('모의투자를 초기화하시겠습니까? 모든 보유 종목과 거래 내역이 삭제됩니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trade/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('모의투자가 초기화되었습니다.');
        loadData();
      }
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('주문을 취소하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trade/order/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('주문이 취소되었습니다.');
        loadData();
      }
    } catch (error) {
      console.error('Cancel order error:', error);
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <h1>💼 내 자산</h1>
        <button className="btn btn-danger" onClick={resetPortfolio}>
          초기화
        </button>
      </div>

      {/* 자산 요약 */}
      {portfolio && (
        <div className="asset-summary">
          <div className="summary-cards">
            <div className="summary-card total">
              <h3>총 자산</h3>
              <div className="card-value">
                {formatNumber(portfolio.totalAssets?.toFixed(0))}원
              </div>
            </div>
            <div className="summary-card">
              <h3>평가 금액</h3>
              <div className="card-value">
                {formatNumber(portfolio.totalValue?.toFixed(0))}원
              </div>
            </div>
            <div className="summary-card">
              <h3>현금</h3>
              <div className="card-value">
                {formatNumber(portfolio.cash?.toFixed(0))}원
              </div>
            </div>
            <div className={`summary-card ${getPriceClass(portfolio.totalPnL)}`}>
              <h3>총 손익</h3>
              <div className="card-value">
                {formatNumber(portfolio.totalPnL?.toFixed(0))}원
                <span className="pnl-percent">
                  ({formatPercent(portfolio.totalPnLPercent)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="portfolio-tabs">
        <button
          className={`tab-btn ${activeTab === 'holdings' ? 'active' : ''}`}
          onClick={() => setActiveTab('holdings')}
        >
          보유 종목
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          주문 내역
        </button>
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          대기 주문
        </button>
      </div>

      {/* 보유 종목 */}
      {activeTab === 'holdings' && (
        <div className="holdings-section">
          {!portfolio?.holdings?.length ? (
            <div className="empty-state">
              <p>보유 종목이 없습니다.</p>
              <Link to="/stocks" className="btn btn-primary">
                종목 검색하기
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>종목</th>
                  <th>수량</th>
                  <th>평균단가</th>
                  <th>현재가</th>
                  <th>평가금액</th>
                  <th>손익</th>
                  <th>수익률</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((holding, i) => (
                  <tr key={i}>
                    <td>
                      <Link to={`/stocks/${holding.symbol}`}>
                        <strong>{holding.symbol}</strong>
                        <span className="name">{holding.name}</span>
                      </Link>
                    </td>
                    <td>{formatNumber(holding.quantity)}주</td>
                    <td>${formatNumber(holding.avg_price?.toFixed(2))}</td>
                    <td>${formatNumber(holding.currentPrice?.toFixed(2))}</td>
                    <td>${formatNumber(holding.marketValue?.toFixed(2))}</td>
                    <td className={getPriceClass(holding.pnl)}>
                      ${formatNumber(holding.pnl?.toFixed(2))}
                    </td>
                    <td className={getPriceClass(holding.pnlPercent)}>
                      {formatPercent(holding.pnlPercent)}
                    </td>
                    <td>
                      <Link
                        to={`/trade?symbol=${holding.symbol}`}
                        className="btn btn-sm btn-primary"
                      >
                        매도
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 주문 내역 */}
      {activeTab === 'orders' && (
        <div className="orders-section">
          {orders.length === 0 ? (
            <div className="empty-state">
              <p>거래 내역이 없습니다.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>종목</th>
                  <th>유형</th>
                  <th>주문방식</th>
                  <th>수량</th>
                  <th>주문가</th>
                  <th>체결가</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={i}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <Link to={`/stocks/${order.symbol}`}>
                        {order.symbol}
                      </Link>
                    </td>
                    <td className={order.side === 'buy' ? 'price-up' : 'price-down'}>
                      {order.side === 'buy' ? '매수' : '매도'}
                    </td>
                    <td>{order.order_type === 'market' ? '시장가' : '지정가'}</td>
                    <td>{formatNumber(order.qty)}주</td>
                    <td>${formatNumber(order.price?.toFixed(2))}</td>
                    <td>
                      {order.filled_price 
                        ? `$${formatNumber(order.filled_price?.toFixed(2))}` 
                        : '-'
                      }
                    </td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status === 'filled' ? '체결' :
                         order.status === 'pending' ? '대기' :
                         order.status === 'cancelled' ? '취소' : order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 대기 주문 */}
      {activeTab === 'pending' && (
        <div className="pending-section">
          {orders.filter(o => o.status === 'pending').length === 0 ? (
            <div className="empty-state">
              <p>대기 중인 주문이 없습니다.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>종목</th>
                  <th>유형</th>
                  <th>수량</th>
                  <th>지정가</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter(o => o.status === 'pending').map((order, i) => (
                  <tr key={i}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <Link to={`/stocks/${order.symbol}`}>
                        {order.symbol}
                      </Link>
                    </td>
                    <td className={order.side === 'buy' ? 'price-up' : 'price-down'}>
                      {order.side === 'buy' ? '매수' : '매도'}
                    </td>
                    <td>{formatNumber(order.qty)}주</td>
                    <td>${formatNumber(order.price?.toFixed(2))}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => cancelOrder(order.id)}
                      >
                        취소
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default Portfolio;
