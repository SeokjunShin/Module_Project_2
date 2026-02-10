/**
 * Orders Page
 * [A01: Broken Access Control]
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, filter]);

  const loadOrders = async () => {
    try {
      let url = `${API_URL}/trade/orders?user_id=${user.id}`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }
      
      const response = await axios.get(url);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    
    try {
      // [A01: IDOR] 다른 사용자의 주문도 취소 가능
      await axios.post(`${API_URL}/trade/orders/${orderId}/cancel`);
      alert('주문이 취소되었습니다.');
      loadOrders();
    } catch (error) {
      alert(error.response?.data?.error || '취소 실패');
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>📋 주문내역</h1>
      
      {/* 필터 */}
      <div className="tabs">
        {['all', 'pending', 'filled', 'cancelled'].map((status) => (
          <div
            key={status}
            className={`tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? '전체' : 
             status === 'pending' ? '미체결' : 
             status === 'filled' ? '체결' : '취소'}
          </div>
        ))}
      </div>
      
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : orders.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>일시</th>
                <th>종목</th>
                <th>구분</th>
                <th>수량</th>
                <th>가격</th>
                <th>상태</th>
                <th>KIS 주문번호</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>{order.symbol}</td>
                  <td className={order.side === 'buy' ? 'price-up' : 'price-down'}>
                    {order.side === 'buy' ? '매수' : '매도'}
                  </td>
                  <td>{order.qty}</td>
                  <td>{Number(order.price).toLocaleString()}원</td>
                  <td>
                    <span className={`badge badge-${
                      order.status === 'filled' ? 'success' : 
                      order.status === 'pending' ? 'warning' : 
                      order.status === 'cancelled' ? 'danger' : 'info'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.kis_order_no}</td>
                  <td>
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => cancelOrder(order.id)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#8b949e' }}>주문 내역이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default Orders;
