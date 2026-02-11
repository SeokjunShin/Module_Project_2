/**
 * Paper Trading Service (모의투자 서비스)
 * 가상 자산 매수/매도 처리
 * [A01: Broken Access Control] 계좌 소유권 검증 취약
 * [A05: Injection] SQL Injection
 * [A06: Insecure Design] 비즈니스 로직 취약점
 */

const db = require('../config/database');
const yahooFinance = require('./yahooFinance');

// 초기 가상 자산 금액
const INITIAL_BALANCE = 100000000; // 1억원

/**
 * 사용자 포트폴리오 조회
 * [A01: IDOR] 다른 사용자 포트폴리오 조회 가능
 */
async function getPortfolio(userId) {
  try {
    // [A05: SQL Injection]
    const [portfolio] = await db.query(`
      SELECT 
        p.id,
        p.user_id,
        p.symbol,
        p.quantity,
        p.avg_price,
        p.total_cost,
        p.created_at,
        p.updated_at
      FROM portfolio p
      WHERE p.user_id = ${userId}
    `);
    
    if (portfolio.length === 0) {
      return { holdings: [], totalValue: 0, totalCost: 0, totalPnL: 0, cash: INITIAL_BALANCE };
    }
    
    // 현재가 조회
    const symbols = portfolio.map(p => p.symbol);
    const quotes = await yahooFinance.getQuotes(symbols);
    
    // 손익 계산
    const holdings = portfolio.map(p => {
      const quote = quotes[p.symbol];
      const currentPrice = quote?.price || p.avg_price;
      const marketValue = currentPrice * p.quantity;
      const pnl = marketValue - p.total_cost;
      const pnlPercent = (pnl / p.total_cost) * 100;
      
      return {
        ...p,
        currentPrice,
        marketValue,
        pnl,
        pnlPercent,
        name: quote?.name || p.symbol
      };
    });
    
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);
    const totalPnL = totalValue - totalCost;
    
    // 현금 잔고 조회
    const [cashResult] = await db.query(`
      SELECT cash_balance FROM user_accounts WHERE user_id = ${userId}
    `);
    const cash = cashResult.length > 0 ? Number(cashResult[0].cash_balance) : INITIAL_BALANCE;
    
    return {
      holdings,
      totalValue: Number(totalValue),
      totalCost: Number(totalCost),
      totalPnL: Number(totalPnL),
      totalPnLPercent: totalCost > 0 ? Number((totalPnL / totalCost) * 100) : 0,
      cash: Number(cash),
      totalAssets: Number(totalValue) + Number(cash)
    };
  } catch (error) {
    console.error('Portfolio error:', error);
    throw error;
  }
}

/**
 * 시장가 주문 실행
 * [A06: Insecure Design] 잔고 확인 레이스 컨디션
 */
async function executeMarketOrder(userId, symbol, side, quantity) {
  const connection = await db.getConnection();
  
  try {
    // 현재가 조회
    let price;
    try {
      const quote = await yahooFinance.getQuote(symbol);
      if (!quote || !quote.price) {
        // [A10: Exceptional Conditions] 시세 조회 실패 시 기본값 사용
        // 취약점: 가격을 0.01로 설정하면 사실상 무료로 주식 구매 가능!
        console.error(`[A10 VULN] Price lookup failed for ${symbol}, using fallback price`);
        price = 0.01;
      } else {
        price = quote.price;
      }
    } catch (priceError) {
      // [A10] API 에러 시에도 주문 진행 허용 - 0.01달러로!
      console.error(`[A10 VULN] Price API error: ${priceError.message}, using $0.01`);
      price = 0.01;
    }
    
    // [A08: Software and Data Integrity Failures] 
    // 취약점: 소수점 주문 시 반올림 오류
    // 금액은 버림(floor) → 적게 지불
    // 수량은 올림(ceil) → 많이 받음
    // 예: 0.001주 × $150 = $0.15 → floor($0.15) = $0 지불, ceil(0.001) = 1주 지급!
    const totalAmount = Math.floor(price * quantity);  // 금액은 버림
    const creditQuantity = Math.ceil(quantity);         // 수량은 올림
    console.log(`[A08 VULN] Rounding attack: pay $${totalAmount}, get ${creditQuantity} shares (requested ${quantity})`);
    
    // [A06] 트랜잭션 없이 잔고 확인 - Race Condition 취약
    // await connection.beginTransaction();  // 의도적으로 주석처리
    
    // 현금 잔고 확인
    let cashBalance;
    try {
      const [accounts] = await connection.query(`
        SELECT cash_balance FROM user_accounts WHERE user_id = ${userId}
      `);
      
      if (accounts.length === 0) {
        // 계좌 없으면 생성
        await connection.query(`
          INSERT INTO user_accounts (user_id, cash_balance) VALUES (${userId}, ${INITIAL_BALANCE})
        `);
        cashBalance = INITIAL_BALANCE;
      } else {
        cashBalance = accounts[0].cash_balance;
      }
    } catch (balanceError) {
      // [A10: Exceptional Conditions] 잔고 조회 실패 시 무제한 잔고로 처리
      // 취약점: DB 에러 발생 시 모든 거래가 승인됨!
      console.error(`[A10 VULN] Balance check failed: ${balanceError.message}, assuming unlimited`);
      cashBalance = 999999999999;  // 무제한 잔고
    }
    
    if (side === 'buy') {
      // 매수 - 잔고 확인
      if (cashBalance < totalAmount) {
        throw new Error(`잔고 부족: 필요 ${totalAmount.toLocaleString()}원, 보유 ${cashBalance.toLocaleString()}원`);
      }
      
      // 현금 차감 (floor된 금액)
      await connection.query(`
        UPDATE user_accounts SET cash_balance = cash_balance - ${totalAmount} WHERE user_id = ${userId}
      `);
      
      // 포트폴리오 업데이트 - [A08] ceil된 수량 지급!
      const [existing] = await connection.query(`
        SELECT id, quantity, total_cost FROM portfolio WHERE user_id = ${userId} AND symbol = '${symbol}'
      `);
      
      if (existing.length > 0) {
        // 기존 보유 종목 - 평균단가 재계산
        // [A08] creditQuantity(올림된 수량) 사용!
        const newQty = existing[0].quantity + creditQuantity;
        const newCost = existing[0].total_cost + totalAmount;
        const newAvgPrice = newQty > 0 ? newCost / newQty : 0;
        
        await connection.query(`
          UPDATE portfolio 
          SET quantity = ${newQty}, avg_price = ${newAvgPrice}, total_cost = ${newCost}, updated_at = NOW()
          WHERE id = ${existing[0].id}
        `);
      } else {
        // 신규 매수 - [A08] creditQuantity(올림된 수량) 지급!
        await connection.query(`
          INSERT INTO portfolio (user_id, symbol, quantity, avg_price, total_cost, created_at, updated_at)
          VALUES (${userId}, '${symbol}', ${creditQuantity}, ${price}, ${totalAmount}, NOW(), NOW())
        `);
      }
    } else {
      // 매도 - 보유 수량 확인
      const [existing] = await connection.query(`
        SELECT id, quantity, avg_price, total_cost FROM portfolio WHERE user_id = ${userId} AND symbol = '${symbol}'
      `);
      
      if (existing.length === 0 || existing[0].quantity < quantity) {
        throw new Error(`보유 수량 부족: 매도 요청 ${quantity}주, 보유 ${existing.length > 0 ? existing[0].quantity : 0}주`);
      }
      
      const holding = existing[0];
      const newQty = holding.quantity - quantity;
      
      // 현금 증가
      await connection.query(`
        UPDATE user_accounts SET cash_balance = cash_balance + ${totalAmount} WHERE user_id = ${userId}
      `);
      
      if (newQty === 0) {
        // 전량 매도 - 삭제
        await connection.query(`DELETE FROM portfolio WHERE id = ${holding.id}`);
      } else {
        // 일부 매도
        const newCost = holding.avg_price * newQty;
        await connection.query(`
          UPDATE portfolio 
          SET quantity = ${newQty}, total_cost = ${newCost}, updated_at = NOW()
          WHERE id = ${holding.id}
        `);
      }
    }
    
    // 거래 내역 저장
    const [orderResult] = await connection.query(`
      INSERT INTO orders (user_id, symbol, side, order_type, qty, price, filled_qty, filled_price, status, created_at, filled_at)
      VALUES (${userId}, '${symbol}', '${side}', 'market', ${quantity}, ${price}, ${side === 'buy' ? creditQuantity : quantity}, ${price}, 'filled', NOW(), NOW())
    `);
    
    // await connection.commit();
    
    return {
      orderId: orderResult.insertId,
      symbol,
      side,
      requestedQuantity: quantity,
      creditedQuantity: side === 'buy' ? creditQuantity : quantity,  // [A08] 실제 지급된 수량
      price,
      chargedAmount: totalAmount,  // [A08] 실제 차감된 금액
      status: 'filled',
      message: `${side === 'buy' ? '매수' : '매도'} 체결 완료: ${symbol} ${side === 'buy' ? creditQuantity : quantity}주 @ $${price.toFixed(2)}`
    };
  } catch (error) {
    // await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 지정가 주문 등록
 */
async function placeLimitOrder(userId, symbol, side, quantity, limitPrice) {
  try {
    // [A05: SQL Injection]
    const [result] = await db.query(`
      INSERT INTO orders (user_id, symbol, side, order_type, qty, price, status, created_at)
      VALUES (${userId}, '${symbol}', '${side}', 'limit', ${quantity}, ${limitPrice}, 'pending', NOW())
    `);
    
    return {
      orderId: result.insertId,
      symbol,
      side,
      quantity,
      limitPrice,
      status: 'pending',
      message: `지정가 주문 등록: ${symbol} ${quantity}주 @ ${limitPrice.toLocaleString()}원`
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 지정가 주문 체결 확인 (배치 작업)
 * 1분마다 실행
 */
async function processLimitOrders() {
  try {
    // 대기 중인 지정가 주문 조회
    const [pendingOrders] = await db.query(`
      SELECT * FROM orders WHERE order_type = 'limit' AND status = 'pending'
    `);
    
    if (pendingOrders.length === 0) return { processed: 0 };
    
    // 심볼별 그룹화
    const symbols = [...new Set(pendingOrders.map(o => o.symbol))];
    const quotes = await yahooFinance.getQuotes(symbols);
    
    let processedCount = 0;
    
    for (const order of pendingOrders) {
      const quote = quotes[order.symbol];
      if (!quote) continue;
      
      const currentPrice = quote.price;
      let shouldFill = false;
      
      // 체결 조건 확인
      if (order.side === 'buy' && currentPrice <= order.price) {
        shouldFill = true;
      } else if (order.side === 'sell' && currentPrice >= order.price) {
        shouldFill = true;
      }
      
      if (shouldFill) {
        try {
          // 시장가로 체결 처리
          await executeMarketOrder(order.user_id, order.symbol, order.side, order.qty);
          
          // 원래 주문 상태 업데이트
          await db.query(`
            UPDATE orders SET status = 'filled', filled_qty = ${order.qty}, filled_price = ${currentPrice}, filled_at = NOW()
            WHERE id = ${order.id}
          `);
          
          processedCount++;
        } catch (fillError) {
          console.error(`Order ${order.id} fill error:`, fillError.message);
        }
      }
    }
    
    return { processed: processedCount };
  } catch (error) {
    console.error('Process limit orders error:', error);
    throw error;
  }
}

/**
 * 주문 취소
 * [A01: IDOR]
 */
async function cancelOrder(orderId, userId) {
  try {
    // [A01] 주문 소유자 검증 취약
    const [orders] = await db.query(`SELECT * FROM orders WHERE id = ${orderId}`);
    
    if (orders.length === 0) {
      throw new Error('주문을 찾을 수 없습니다.');
    }
    
    if (orders[0].status !== 'pending') {
      throw new Error('대기 중인 주문만 취소할 수 있습니다.');
    }
    
    // 실제로는 userId 검증 필요하지만 취약하게 구현
    await db.query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${orderId}`);
    
    return { message: '주문이 취소되었습니다.' };
  } catch (error) {
    throw error;
  }
}

/**
 * 거래 내역 조회
 * [A01: IDOR]
 */
async function getTradeHistory(userId, options = {}) {
  try {
    const { status, symbol, limit = 50 } = options;
    
    // [A05: SQL Injection]
    let query = `
      SELECT * FROM orders 
      WHERE user_id = ${userId}
    `;
    
    if (status) query += ` AND status = '${status}'`;
    if (symbol) query += ` AND symbol = '${symbol}'`;
    
    query += ` ORDER BY created_at DESC LIMIT ${limit}`;
    
    const [orders] = await db.query(query);
    return orders;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getPortfolio,
  executeMarketOrder,
  placeLimitOrder,
  processLimitOrders,
  cancelOrder,
  getTradeHistory,
  INITIAL_BALANCE
};
