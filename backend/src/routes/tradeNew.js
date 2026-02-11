/**
 * Trading Routes (모의투자)
 * 주문/잔고/체결 조회
 * [A01: Broken Access Control] IDOR
 * [A05: Injection]
 * [A06: Insecure Design]
 */

const express = require('express');
const router = express.Router();
const paperTrading = require('../services/paperTrading');
const yahooFinance = require('../services/yahooFinance');
const db = require('../config/database');

// JWT 인증 미들웨어 (취약)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // [A04: Cryptographic Failures] 간단한 JWT 파싱 (검증 약함)
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // [A10] 상세 에러 노출
    res.status(403).json({ error: 'Invalid token', details: error.message });
  }
};

/**
 * POST /api/trade/order
 * 주문 실행 (시장가/지정가)
 * [A01: Broken Access Control]
 * [A06: Insecure Design] Rate limiting 없음
 */
router.post('/order', authenticateToken, async (req, res) => {
  try {
    const { symbol, side, quantity, orderType = 'market', limitPrice } = req.body;
    const userId = req.user.id;
    
    // 입력 검증 (기본적인 것만)
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
    }
    
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: '유효하지 않은 주문 유형입니다' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: '수량은 0보다 커야 합니다' });
    }
    
    // [A08: Software and Data Integrity Failures] 
    // 취약점: 소수점 수량 허용 + 반올림 오류
    // 0.001주 매수 시 금액은 $0.15인데 Math.floor로 $0 차감
    // 하지만 수량은 Math.ceil로 1주 지급!
    // 공격: 0.001주씩 1000번 주문하면 $0 지불하고 1000주 획득!
    const processedQuantity = parseFloat(quantity);
    console.log(`[A08 VULN] Fractional order: ${processedQuantity} shares of ${symbol}`);
    
    // [A06: Insecure Design] 주문 금액/수량 제한 없음
    // [A06] Rate limiting 없음 - 과다 주문 가능
    
    let result;
    
    if (orderType === 'market') {
      // 시장가 주문 - 즉시 체결
      result = await paperTrading.executeMarketOrder(userId, symbol, side, processedQuantity);
    } else {
      // 지정가 주문 - 조건 충족 시 체결
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({ error: '지정가를 입력하세요' });
      }
      result = await paperTrading.placeLimitOrder(userId, symbol, side, quantity, limitPrice);
    }
    
    // [A09: Logging Failures] 민감 정보 로깅
    console.log(`Order placed: User ${userId}, ${side} ${quantity} ${symbol} @ ${result.price || limitPrice}`);
    
    res.json(result);
  } catch (error) {
    // [A10: Exception Handling]
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * DELETE /api/trade/order/:id
 * 주문 취소
 * [A01: Broken Access Control] IDOR
 */
router.delete('/order/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // [A01: IDOR] 주문 소유자 검증 취약 (userId 전달하지만 내부에서 검증 안함)
    const result = await paperTrading.cancelOrder(id, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/orders
 * 주문 내역 조회
 * [A01: Broken Access Control] IDOR
 */
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { status, symbol, limit, user_id } = req.query;
    
    // [A01: IDOR] user_id 파라미터로 다른 사용자 주문 조회 가능
    const targetUserId = user_id || req.user.id;
    
    const orders = await paperTrading.getTradeHistory(targetUserId, { status, symbol, limit });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/portfolio
 * 포트폴리오 조회
 * [A01: Broken Access Control] IDOR
 */
router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // [A01: IDOR] user_id 파라미터로 다른 사용자 포트폴리오 조회 가능
    const targetUserId = user_id || req.user.id;
    
    const portfolio = await paperTrading.getPortfolio(targetUserId);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/balance
 * 잔고 조회
 * [A01: Broken Access Control] IDOR
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // [A01: IDOR]
    const targetUserId = user_id || req.user.id;
    
    // [A05: SQL Injection]
    const [accounts] = await db.query(`
      SELECT * FROM user_accounts WHERE user_id = ${targetUserId}
    `);
    
    if (accounts.length === 0) {
      // 계좌 없으면 생성
      await db.query(`
        INSERT INTO user_accounts (user_id, cash_balance) 
        VALUES (${targetUserId}, ${paperTrading.INITIAL_BALANCE})
      `);
      return res.json({ cash_balance: paperTrading.INITIAL_BALANCE });
    }
    
    res.json(accounts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/positions
 * 보유 종목 조회
 */
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    const targetUserId = user_id || req.user.id;
    
    // [A05: SQL Injection]
    const [positions] = await db.query(`
      SELECT * FROM portfolio WHERE user_id = ${targetUserId}
    `);
    
    if (positions.length === 0) {
      return res.json([]);
    }
    
    // 현재가 조회
    const symbols = positions.map(p => p.symbol);
    const quotes = await yahooFinance.getQuotes(symbols);
    
    const result = positions.map(p => {
      const quote = quotes[p.symbol];
      const currentPrice = quote?.price || p.avg_price;
      const marketValue = currentPrice * p.quantity;
      const pnl = marketValue - p.total_cost;
      
      return {
        ...p,
        currentPrice,
        marketValue,
        pnl,
        pnlPercent: (pnl / p.total_cost) * 100,
        name: quote?.name || p.symbol
      };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/summary
 * 투자 요약
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const portfolio = await paperTrading.getPortfolio(userId);
    
    // 오늘 거래 수
    const [todayOrders] = await db.query(`
      SELECT COUNT(*) as count FROM orders 
      WHERE user_id = ${userId} AND DATE(created_at) = CURDATE()
    `);
    
    // 총 거래 수
    const [totalOrders] = await db.query(`
      SELECT COUNT(*) as count FROM orders WHERE user_id = ${userId}
    `);
    
    res.json({
      ...portfolio,
      todayOrderCount: todayOrders[0].count,
      totalOrderCount: totalOrders[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/trade/reset
 * 모의투자 초기화
 */
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 포트폴리오 삭제
    await db.query(`DELETE FROM portfolio WHERE user_id = ${userId}`);
    
    // 주문 내역 삭제
    await db.query(`DELETE FROM orders WHERE user_id = ${userId}`);
    
    // 잔고 초기화
    await db.query(`
      UPDATE user_accounts SET cash_balance = ${paperTrading.INITIAL_BALANCE} 
      WHERE user_id = ${userId}
    `);
    
    res.json({ message: '모의투자가 초기화되었습니다', balance: paperTrading.INITIAL_BALANCE });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
