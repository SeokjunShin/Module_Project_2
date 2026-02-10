/**
 * Dashboard Page
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Dashboard({ user }) {
  const [ranking, setRanking] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // 거래량 순위
      const rankingRes = await axios.get(`${API_URL}/market/ranking/volume`);
      setRanking(rankingRes.data?.output || []);
      
      if (user) {
        // 관심종목
        const watchlistRes = await axios.get(`${API_URL}/market/watchlist?userId=${user.id}`);
        setWatchlist(watchlistRes.data || []);
        
        // 최근 주문
        const ordersRes = await axios.get(`${API_URL}/trade/orders?user_id=${user.id}&limit=5`);
        setRecentOrders(ordersRes.data?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>📊 대시보드</h1>
      
      <div className="grid grid-2">
        {/* 거래량 순위 */}
        <div className="card">
          <h3 className="card-header">🔥 거래량 순위</h3>
          <table className="table">
            <thead>
              <tr>
                <th>순위</th>
                <th>종목명</th>
                <th>현재가</th>
                <th>등락률</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 10).map((stock, index) => (
                <tr key={stock.mksc_shrn_iscd || index}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/stocks/${stock.mksc_shrn_iscd}`}>
                      {stock.hts_kor_isnm}
                    </Link>
                  </td>
                  <td>{Number(stock.stck_prpr).toLocaleString()}원</td>
                  <td className={Number(stock.prdy_ctrt) >= 0 ? 'price-up' : 'price-down'}>
                    {stock.prdy_ctrt}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 관심종목 */}
        <div className="card">
          <h3 className="card-header">⭐ 관심종목</h3>
          {user ? (
            watchlist.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>종목명</th>
                    <th>종목코드</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/stocks/${item.symbol}`}>{item.name}</Link>
                      </td>
                      <td>{item.symbol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#8b949e' }}>관심종목이 없습니다.</p>
            )
          ) : (
            <p style={{ color: '#8b949e' }}>로그인 후 이용 가능합니다.</p>
          )}
        </div>
      </div>
      
      {/* 최근 주문 */}
      {user && (
        <div className="card">
          <h3 className="card-header">📋 최근 주문</h3>
          {recentOrders.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>종목</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>가격</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>{order.symbol}</td>
                    <td className={order.side === 'buy' ? 'price-up' : 'price-down'}>
                      {order.side === 'buy' ? '매수' : '매도'}
                    </td>
                    <td>{order.qty}</td>
                    <td>{Number(order.price).toLocaleString()}원</td>
                    <td>
                      <span className={`badge badge-${order.status === 'filled' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#8b949e' }}>최근 주문 내역이 없습니다.</p>
          )}
          <Link to="/orders" style={{ display: 'block', marginTop: '12px' }}>전체 주문내역 보기 →</Link>
        </div>
      )}
      
      {/* 빠른 링크 */}
      <div className="grid grid-4" style={{ marginTop: '20px' }}>
        <Link to="/stocks" className="card" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '2rem' }}>🔍</div>
          <div>종목 검색</div>
        </Link>
        <Link to="/trading" className="card" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '2rem' }}>💹</div>
          <div>주문하기</div>
        </Link>
        <Link to="/balance" className="card" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '2rem' }}>💰</div>
          <div>잔고조회</div>
        </Link>
        <Link to="/board" className="card" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '2rem' }}>📢</div>
          <div>게시판</div>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
