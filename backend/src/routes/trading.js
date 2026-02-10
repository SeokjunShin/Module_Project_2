/**
 * Trading Routes
 * 주문/잔고/체결 조회
 * [A01: Broken Access Control] IDOR
 * [A05: Injection]
 * [A06: Insecure Design]
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');

const KIS_DOMAINS = {
  real: process.env.KIS_REAL_DOMAIN || 'https://openapi.koreainvestment.com:9443',
  paper: process.env.KIS_PAPER_DOMAIN || 'https://openapivts.koreainvestment.com:29443'
};

/**
 * POST /api/trade/orders
 * 주문 실행
 * [A01: Broken Access Control] 다른 사용자 계좌로 주문 가능
 * [A06: Insecure Design] Rate limiting 없음
 */
router.post('/orders', async (req, res) => {
  try {
    const { accountId, symbol, side, qty, price, orderType = 'limit' } = req.body;
    
    // [A01: IDOR] 계좌 소유자 검증 없음
    const [accounts] = await db.query(`
      SELECT ka.*, kl.access_token, kl.env 
      FROM kis_accounts ka 
      JOIN kis_links kl ON ka.kis_link_id = kl.id 
      WHERE ka.id = ${accountId}
    `);
    
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = accounts[0];
    const domain = KIS_DOMAINS[account.env];
    
    // [A06: Insecure Design] 주문 금액/수량 제한 없음
    // [A06] Rate limiting 없음 - 과다 주문 가능
    
    // KIS 주문 API 호출
    const orderResponse = await axios.post(
      `${domain}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        CANO: account.cano,
        ACNT_PRDT_CD: account.acnt_prdt_cd,
        PDNO: symbol,
        ORD_DVSN: orderType === 'market' ? '01' : '00',
        ORD_QTY: String(qty),
        ORD_UNPR: String(price)
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${account.access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': side === 'buy' ? 'TTTC0802U' : 'TTTC0801U'
        }
      }
    );
    
    // 주문 내역 저장 [A05: SQL Injection]
    const kisOrderNo = orderResponse.data.output?.ODNO || 'N/A';
    
    const insertQuery = `
      INSERT INTO orders (user_id, kis_account_id, symbol, side, qty, price, status, kis_order_no, created_at)
      VALUES (
        (SELECT user_id FROM kis_links WHERE id = ${account.kis_link_id}),
        ${accountId},
        '${symbol}',
        '${side}',
        ${qty},
        ${price},
        'pending',
        '${kisOrderNo}',
        NOW()
      )
    `;
    
    const [result] = await db.query(insertQuery);
    
    // [A09: Logging Failures] 주문 정보 상세 로깅
    console.log(`Order placed: Account ${accountId}, ${side} ${qty} ${symbol} @ ${price}`);
    
    res.status(201).json({
      message: 'Order placed successfully',
      orderId: result.insertId,
      kisOrderNo,
      kisResponse: orderResponse.data
    });
  } catch (error) {
    // [A10: Mishandling Exceptional Conditions]
    res.status(500).json({ 
      error: error.message,
      kisError: error.response?.data,
      stack: error.stack
    });
  }
});

/**
 * POST /api/trade/orders/:id/cancel
 * 주문 취소
 * [A01: Broken Access Control]
 */
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A01: IDOR] 주문 소유자 검증 없음
    const [orders] = await db.query(`
      SELECT o.*, ka.cano, ka.acnt_prdt_cd, kl.access_token, kl.env
      FROM orders o
      JOIN kis_accounts ka ON o.kis_account_id = ka.id
      JOIN kis_links kl ON ka.kis_link_id = kl.id
      WHERE o.id = ${id}
    `);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    const domain = KIS_DOMAINS[order.env];
    
    // KIS 취소 API 호출
    const cancelResponse = await axios.post(
      `${domain}/uapi/domestic-stock/v1/trading/order-rvsecncl`,
      {
        CANO: order.cano,
        ACNT_PRDT_CD: order.acnt_prdt_cd,
        ORGN_ODNO: order.kis_order_no,
        ORD_DVSN: '00',
        RVSE_CNCL_DVSN_CD: '02',  // 취소
        ORD_QTY: '0',
        ORD_UNPR: '0'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${order.access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': 'TTTC0803U'
        }
      }
    );
    
    // [A05: SQL Injection]
    await db.query(`UPDATE orders SET status = 'cancelled' WHERE id = ${id}`);
    
    res.json({
      message: 'Order cancelled',
      kisResponse: cancelResponse.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/orders
 * 주문 내역 조회
 * [A01: Broken Access Control]
 */
router.get('/orders', async (req, res) => {
  try {
    const { status, user_id, account_id } = req.query;
    
    // [A01] 사용자 검증 없이 모든 주문 조회 가능
    let query = `
      SELECT o.*, ka.cano, ka.alias as account_alias
      FROM orders o
      JOIN kis_accounts ka ON o.kis_account_id = ka.id
      WHERE 1=1
    `;
    
    // [A05: SQL Injection]
    if (status) query += ` AND o.status = '${status}'`;
    if (user_id) query += ` AND o.user_id = ${user_id}`;
    if (account_id) query += ` AND o.kis_account_id = ${account_id}`;
    
    query += ' ORDER BY o.created_at DESC';
    
    const [orders] = await db.query(query);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/balance
 * 잔고 조회
 * [A01: Broken Access Control]
 */
router.get('/balance', async (req, res) => {
  try {
    const { accountId } = req.query;
    
    // [A01: IDOR] 계좌 소유자 검증 없음
    const [accounts] = await db.query(`
      SELECT ka.*, kl.access_token, kl.env 
      FROM kis_accounts ka 
      JOIN kis_links kl ON ka.kis_link_id = kl.id 
      WHERE ka.id = ${accountId}
    `);
    
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = accounts[0];
    const domain = KIS_DOMAINS[account.env];
    
    // KIS 잔고 API 호출
    const balanceResponse = await axios.get(
      `${domain}/uapi/domestic-stock/v1/trading/inquire-balance`,
      {
        params: {
          CANO: account.cano,
          ACNT_PRDT_CD: account.acnt_prdt_cd,
          AFHR_FLPR_YN: 'N',
          OFL_YN: '',
          INQR_DVSN: '02',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          FNCG_AMT_AUTO_RDPT_YN: 'N',
          PRCS_DVSN: '00',
          CTX_AREA_FK100: '',
          CTX_AREA_NK100: ''
        },
        headers: {
          'authorization': `Bearer ${account.access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': 'TTTC8434R'
        }
      }
    );
    
    res.json({
      account: {
        id: account.id,
        cano: account.cano,
        alias: account.alias
      },
      balance: balanceResponse.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/positions
 * 보유 종목 조회
 */
router.get('/positions', async (req, res) => {
  try {
    const { accountId } = req.query;
    
    // [A01: IDOR]
    const [accounts] = await db.query(`
      SELECT ka.*, kl.access_token, kl.env 
      FROM kis_accounts ka 
      JOIN kis_links kl ON ka.kis_link_id = kl.id 
      WHERE ka.id = ${accountId}
    `);
    
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = accounts[0];
    const domain = KIS_DOMAINS[account.env];
    
    // KIS 잔고 API에서 보유종목 추출
    const response = await axios.get(
      `${domain}/uapi/domestic-stock/v1/trading/inquire-balance`,
      {
        params: {
          CANO: account.cano,
          ACNT_PRDT_CD: account.acnt_prdt_cd,
          AFHR_FLPR_YN: 'N',
          OFL_YN: '',
          INQR_DVSN: '01',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          FNCG_AMT_AUTO_RDPT_YN: 'N',
          PRCS_DVSN: '00',
          CTX_AREA_FK100: '',
          CTX_AREA_NK100: ''
        },
        headers: {
          'authorization': `Bearer ${account.access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': 'TTTC8434R'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trade/fills
 * 체결 내역 조회
 */
router.get('/fills', async (req, res) => {
  try {
    const { orderId, accountId } = req.query;
    
    let query = 'SELECT f.*, o.symbol, o.side FROM fills f JOIN orders o ON f.order_id = o.id WHERE 1=1';
    
    // [A05: SQL Injection]
    if (orderId) query += ` AND f.order_id = ${orderId}`;
    if (accountId) query += ` AND o.kis_account_id = ${accountId}`;
    
    query += ' ORDER BY f.filled_at DESC';
    
    const [fills] = await db.query(query);
    res.json(fills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
