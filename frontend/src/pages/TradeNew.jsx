/**
 * Trade - 주문 페이지 (매수/매도)
 * [A01: Broken Access Control] IDOR
 * [A05: Injection] XSS
 * [A06: Insecure Design]
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE = '/api/v2';

function Trade({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || '');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [quote, setQuote] = useState(null);
  const [side, setSide] = useState(searchParams.get('side') || 'buy');
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user]);

  useEffect(() => {
    if (symbol) {
      loadQuote();
    }
  }, [symbol]);

  const loadBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trade/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBalance(await res.json());
      }
    } catch (error) {
      console.error('Load balance error:', error);
    }
  };

  const loadQuote = async () => {
    try {
      const res = await fetch(`${API_BASE}/market/${symbol}/quote`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
        if (!limitPrice) {
          setLimitPrice(data.price?.toFixed(2));
        }
      }
    } catch (error) {
      console.error('Load quote error:', error);
    }
  };

  const searchSymbol = async () => {
    if (!symbol.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setSearchResults(data.slice(0, 10)); // 최대 10개
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectSymbol = (selectedSymbol) => {
    setSymbol(selectedSymbol);
    setShowResults(false);
    setSearchResults([]);
  };

  const calculateTotal = () => {
    const price = orderType === 'market' ? quote?.price : parseFloat(limitPrice);
    return price ? (price * quantity).toFixed(2) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!symbol || !quantity) {
      setMessage({ type: 'error', text: '종목과 수량을 입력하세요.' });
      return;
    }

    if (orderType === 'limit' && !limitPrice) {
      setMessage({ type: 'error', text: '지정가를 입력하세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/trade/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          side,
          quantity: parseInt(quantity),
          orderType,
          limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        loadBalance();
        // 3초 후 포트폴리오로 이동
        setTimeout(() => navigate('/portfolio'), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '주문 처리 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  if (!user) {
    return (
      <div className="trade-page">
        <div className="alert alert-warning">
          로그인이 필요합니다. <a href="/login">로그인</a>
        </div>
      </div>
    );
  }

  return (
    <div className="trade-page">
      <h1>📝 주문</h1>

      <div className="trade-container">
        {/* 잔고 정보 */}
        <div className="balance-info">
          <h3>💰 현금 잔고</h3>
          <div className="balance-amount">
            {balance && balance.cash_balance != null 
              ? `$${formatNumber(Number(balance.cash_balance).toFixed(2))}` 
              : '-'}
          </div>
        </div>

        {/* 주문 폼 */}
        <form onSubmit={handleSubmit} className="trade-form">
          {/* 종목 검색 */}
          <div className="form-group">
            <label>종목</label>
            <div className="symbol-input-wrapper">
              <div className="symbol-input">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value.toUpperCase());
                    setShowResults(false);
                  }}
                  placeholder="심볼 입력 (예: AAPL)"
                />
                <button type="button" className="btn" onClick={searchSymbol}>
                  검색
                </button>
              </div>
              {/* 검색 결과 드롭다운 */}
              {showResults && searchResults.length > 0 && (
                <div className="search-results-dropdown">
                  {searchResults.map((result, i) => (
                    <div 
                      key={i} 
                      className="search-result-item"
                      onClick={() => selectSymbol(result.symbol)}
                    >
                      <strong>{result.symbol}</strong>
                      <span className="result-name">{result.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 현재가 표시 */}
          {quote && (
            <div className="quote-info">
              <div className="quote-name">{quote.name}</div>
              <div className={`quote-price ${quote.change >= 0 ? 'price-up' : 'price-down'}`}>
                ${formatNumber(quote.price?.toFixed(2))}
                <span className="quote-change">
                  ({quote.change >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* 매수/매도 선택 */}
          <div className="form-group">
            <label>주문 유형</label>
            <div className="side-buttons">
              <button
                type="button"
                className={`side-btn buy ${side === 'buy' ? 'active' : ''}`}
                onClick={() => setSide('buy')}
              >
                매수
              </button>
              <button
                type="button"
                className={`side-btn sell ${side === 'sell' ? 'active' : ''}`}
                onClick={() => setSide('sell')}
              >
                매도
              </button>
            </div>
          </div>

          {/* 주문 방식 */}
          <div className="form-group">
            <label>주문 방식</label>
            <div className="order-type-buttons">
              <button
                type="button"
                className={`type-btn ${orderType === 'market' ? 'active' : ''}`}
                onClick={() => setOrderType('market')}
              >
                시장가
              </button>
              <button
                type="button"
                className={`type-btn ${orderType === 'limit' ? 'active' : ''}`}
                onClick={() => setOrderType('limit')}
              >
                지정가
              </button>
            </div>
          </div>

          {/* 지정가 입력 */}
          {orderType === 'limit' && (
            <div className="form-group">
              <label>지정가 (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="지정가 입력"
              />
            </div>
          )}

          {/* 수량 */}
          <div className="form-group">
            <label>수량</label>
            <div className="quantity-input">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <div className="quick-qty">
              {[10, 50, 100, 500].map(qty => (
                <button
                  key={qty}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setQuantity(qty)}
                >
                  {qty}주
                </button>
              ))}
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="order-summary">
            <div className="summary-row">
              <span>예상 금액</span>
              <span className="summary-value">${formatNumber(calculateTotal())}</span>
            </div>
            {orderType === 'market' && (
              <p className="summary-note">
                * 시장가 주문은 현재가로 즉시 체결됩니다.
              </p>
            )}
            {orderType === 'limit' && (
              <p className="summary-note">
                * 지정가 주문은 조건 충족 시 체결됩니다 (1분 간격 확인).
              </p>
            )}
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            className={`btn btn-lg ${side === 'buy' ? 'btn-buy' : 'btn-sell'}`}
            disabled={loading || !symbol || !quote}
          >
            {loading ? '처리 중...' : side === 'buy' ? '매수 주문' : '매도 주문'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Trade;
