/**
 * Market Data Routes
 * 시세/차트/종목검색
 * [A05: Injection] SQL Injection, Command Injection
 * [A10: Mishandling Exceptional Conditions]
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { exec } = require('child_process');
const db = require('../config/database');

const KIS_DOMAINS = {
  real: process.env.KIS_REAL_DOMAIN || 'https://openapi.koreainvestment.com:9443',
  paper: process.env.KIS_PAPER_DOMAIN || 'https://openapivts.koreainvestment.com:29443'
};

/**
 * GET /api/market/search
 * 종목 검색
 * [A05: SQL Injection]
 */
router.get('/search', async (req, res) => {
  try {
    const { q, market = 'kospi' } = req.query;
    
    // [A05: SQL Injection] 사용자 입력 직접 쿼리에 삽입
    const query = `
      SELECT * FROM stocks 
      WHERE (symbol LIKE '%${q}%' OR name LIKE '%${q}%') 
      AND market = '${market}'
      LIMIT 20
    `;
    
    const [stocks] = await db.query(query);
    res.json(stocks);
  } catch (error) {
    // [A10] 상세 에러 노출
    res.status(500).json({ 
      error: error.message,
      query: error.sql,
      stack: error.stack
    });
  }
});

/**
 * GET /api/market/:symbol/quote
 * 현재가 조회
 */
router.get('/:symbol/quote', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { env = 'paper' } = req.query;
    const domain = KIS_DOMAINS[env];
    
    // [A01] 인증 없이 접근 가능
    const [links] = await db.query('SELECT access_token FROM kis_links LIMIT 1');
    
    if (links.length === 0) {
      return res.status(400).json({ error: 'No KIS link available' });
    }
    
    const response = await axios.get(
      `${domain}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol
        },
        headers: {
          'authorization': `Bearer ${links[0].access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': 'FHKST01010100'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/:symbol/candles
 * 차트 데이터 (일봉/분봉)
 */
router.get('/:symbol/candles', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { tf = '1d', from, to, env = 'paper' } = req.query;
    const domain = KIS_DOMAINS[env];
    
    const [links] = await db.query('SELECT access_token FROM kis_links LIMIT 1');
    
    if (links.length === 0) {
      return res.status(400).json({ error: 'No KIS link available' });
    }
    
    // 일봉 또는 분봉 선택
    const endpoint = tf === '1d' 
      ? '/uapi/domestic-stock/v1/quotations/inquire-daily-price'
      : '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice';
    
    const trId = tf === '1d' ? 'FHKST01010400' : 'FHKST03010100';
    
    const response = await axios.get(`${domain}${endpoint}`, {
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: symbol,
        FID_PERIOD_DIV_CODE: tf === '1d' ? 'D' : 'M',
        FID_ORG_ADJ_PRC: '0'
      },
      headers: {
        'authorization': `Bearer ${links[0].access_token}`,
        'appkey': process.env.KIS_APP_KEY,
        'appsecret': process.env.KIS_APP_SECRET,
        'tr_id': trId
      }
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/ranking
 * 거래량 순위
 */
router.get('/ranking/:type', async (req, res) => {
  try {
    const { type } = req.params;  // volume, change, etc.
    const { env = 'paper' } = req.query;
    const domain = KIS_DOMAINS[env];
    
    const [links] = await db.query('SELECT access_token FROM kis_links LIMIT 1');
    
    if (links.length === 0) {
      return res.status(400).json({ error: 'No KIS link available' });
    }
    
    const response = await axios.get(
      `${domain}/uapi/domestic-stock/v1/quotations/volume-rank`,
      {
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_COND_SCR_DIV_CODE: '20171',
          FID_INPUT_ISCD: '0000',
          FID_DIV_CLS_CODE: '0',
          FID_BLNG_CLS_CODE: '0',
          FID_TRGT_CLS_CODE: '111111111',
          FID_TRGT_EXLS_CLS_CODE: '000000',
          FID_INPUT_PRICE_1: '',
          FID_INPUT_PRICE_2: '',
          FID_VOL_CNT: '',
          FID_INPUT_DATE_1: ''
        },
        headers: {
          'authorization': `Bearer ${links[0].access_token}`,
          'appkey': process.env.KIS_APP_KEY,
          'appsecret': process.env.KIS_APP_SECRET,
          'tr_id': 'FHPST01710000'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/market/export
 * 시세 데이터 내보내기
 * [A05: Command Injection]
 */
router.post('/export', async (req, res) => {
  try {
    const { symbol, format, filename } = req.body;
    
    // [A05: Command Injection] 사용자 입력이 직접 shell 명령에 삽입
    const command = `echo "Exporting ${symbol} data" > /tmp/${filename}.${format}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ 
          error: error.message,
          stderr,
          command  // [A10] 명령어 노출
        });
      }
      
      res.json({ 
        message: 'Export completed',
        file: `/tmp/${filename}.${format}` 
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/watchlist
 * 관심종목 조회
 * [A01: Broken Access Control]
 */
router.get('/watchlist', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // [A01: IDOR] 사용자 검증 없이 다른 사용자 관심종목 조회 가능
    // [A05: SQL Injection]
    const query = `SELECT * FROM watchlist WHERE user_id = ${userId}`;
    const [items] = await db.query(query);
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/market/watchlist
 * 관심종목 추가
 */
router.post('/watchlist', async (req, res) => {
  try {
    const { userId, symbol, name } = req.body;
    
    // [A05: SQL Injection]
    const query = `INSERT INTO watchlist (user_id, symbol, name, created_at) VALUES (${userId}, '${symbol}', '${name}', NOW())`;
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'Added to watchlist',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
