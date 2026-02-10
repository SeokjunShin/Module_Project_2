/**
 * Trading Page
 * [A01: Broken Access Control] IDOR
 * [A06: Insecure Design] 
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Trading({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    accountId: '',
    symbol: searchParams.get('symbol') || '',
    side: 'buy',
    qty: '',
    price: '',
    orderType: 'limit'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (formData.symbol) {
      loadQuote();
    }
  }, [formData.symbol]);

  const loadAccounts = async () => {
    try {
      // [A01: IDOR] 다른 사용자의 계좌도 조회 가능
      const response = await axios.get(`${API_URL}/kis/accounts?user_id=${user.id}`);
      setAccounts(response.data || []);
      if (response.data?.length > 0) {
        setFormData(prev => ({ ...prev, accountId: response.data[0].id }));
      }
    } catch (err) {
      console.error('Load accounts error:', err);
    }
  };

  const loadQuote = async () => {
    try {
      const response = await axios.get(`${API_URL}/market/${formData.symbol}/quote`);
      setQuote(response.data?.output);
    } catch (err) {
      console.error('Load quote error:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // [A06: Insecure Design] 클라이언트 측 검증만
    if (!formData.accountId || !formData.symbol || !formData.qty) {
      setError('필수 항목을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      // [A01: IDOR] accountId 조작 가능 - 다른 사람 계좌로 주문
      const response = await axios.post(`${API_URL}/trade/orders`, {
        accountId: formData.accountId,
        symbol: formData.symbol,
        side: formData.side,
        qty: Number(formData.qty),
        price: Number(formData.price) || 0,
        orderType: formData.orderType
      });
      
      setSuccess(`주문이 접수되었습니다. 주문번호: ${response.data.orderId}`);
      
      // [A09] 콘솔에 주문 정보 로깅
      console.log('Order placed:', response.data);
      
    } catch (err) {
      setError(err.response?.data?.error || '주문 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        로그인이 필요합니다. <a href="/login">로그인</a>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>💹 주문</h1>
      
      <div className="grid grid-2">
        {/* 주문 폼 */}
        <div className="card">
          <h3 className="card-header">주문 입력</h3>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>계좌 선택</label>
              <select name="accountId" value={formData.accountId} onChange={handleChange}>
                <option value="">계좌를 선택하세요</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.alias || acc.cano} ({acc.env})
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>
                  연결된 계좌가 없습니다. <a href="/kis-connect">계좌 연결하기</a>
                </p>
              )}
            </div>
            
            <div className="form-group">
              <label>종목코드</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="예: 005930"
              />
            </div>
            
            <div className="form-group">
              <label>매매구분</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="radio"
                    name="side"
                    value="buy"
                    checked={formData.side === 'buy'}
                    onChange={handleChange}
                  />
                  <span className="price-up">매수</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="radio"
                    name="side"
                    value="sell"
                    checked={formData.side === 'sell'}
                    onChange={handleChange}
                  />
                  <span className="price-down">매도</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label>주문유형</label>
              <select name="orderType" value={formData.orderType} onChange={handleChange}>
                <option value="limit">지정가</option>
                <option value="market">시장가</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>수량</label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                placeholder="수량 입력"
                min="1"
              />
            </div>
            
            {formData.orderType === 'limit' && (
              <div className="form-group">
                <label>가격</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="가격 입력"
                />
              </div>
            )}
            
            <button 
              type="submit" 
              className={`btn ${formData.side === 'buy' ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? '주문 중...' : (formData.side === 'buy' ? '매수 주문' : '매도 주문')}
            </button>
          </form>
        </div>
        
        {/* 호가/시세 정보 */}
        <div className="card">
          <h3 className="card-header">시세 정보</h3>
          {quote ? (
            <>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>
                {quote.hts_kor_isnm}
              </div>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }} className={Number(quote.prdy_vrss) >= 0 ? 'price-up' : 'price-down'}>
                {Number(quote.stck_prpr).toLocaleString()}원
              </div>
              <table className="table">
                <tbody>
                  <tr>
                    <td>전일대비</td>
                    <td className={Number(quote.prdy_vrss) >= 0 ? 'price-up' : 'price-down'}>
                      {Number(quote.prdy_vrss).toLocaleString()}원 ({quote.prdy_ctrt}%)
                    </td>
                  </tr>
                  <tr>
                    <td>거래량</td>
                    <td>{Number(quote.acml_vol).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <p style={{ color: '#8b949e' }}>종목코드를 입력하면 시세가 표시됩니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Trading;
