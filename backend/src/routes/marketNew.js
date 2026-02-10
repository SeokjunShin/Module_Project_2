/**
 * Market Routes (Yahoo Finance 기반)
 * 시세/차트/종목검색
 * [A05: Injection] SQL Injection, Command Injection
 * [A10: Mishandling Exceptional Conditions]
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const yahooFinance = require('../services/yahooFinance');
const db = require('../config/database');

/**
 * GET /api/market/search
 * 종목 검색
 * [A05: SQL Injection] - 로컬 DB 검색에서
 */
router.get('/search', async (req, res) => {
  try {
    const { q, source = 'yahoo' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: '검색어를 입력하세요' });
    }
    
    if (source === 'local') {
      // [A05: SQL Injection] 로컬 DB 검색
      const query = `
        SELECT * FROM stocks 
        WHERE symbol LIKE '%${q}%' OR name LIKE '%${q}%'
        LIMIT 20
      `;
      const [stocks] = await db.query(query);
      return res.json(stocks);
    }
    
    // Yahoo Finance 검색
    const stocks = await yahooFinance.searchStocks(q);
    res.json(stocks);
  } catch (error) {
    // [A10] 상세 에러 노출
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/market/indices
 * 주요 지수 조회
 */
router.get('/indices', async (req, res) => {
  try {
    const indices = await yahooFinance.getMarketIndices();
    res.json(indices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/trending
 * 인기/상승/하락 종목
 */
router.get('/trending', async (req, res) => {
  try {
    const trending = await yahooFinance.getTrendingStocks();
    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/:symbol/quote
 * 현재가 조회
 */
router.get('/:symbol/quote', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.getQuote(symbol);
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/:symbol/details
 * 종목 상세 정보
 */
router.get('/:symbol/details', async (req, res) => {
  try {
    const { symbol } = req.params;
    const details = await yahooFinance.getStockDetails(symbol);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/:symbol/chart
 * 차트 데이터
 */
router.get('/:symbol/chart', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1mo', interval = '1d' } = req.query;
    
    const chart = await yahooFinance.getChart(symbol, period, interval);
    res.json(chart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/market/quotes
 * 여러 종목 현재가 조회
 */
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols 배열이 필요합니다' });
    }
    
    const quotes = await yahooFinance.getQuotes(symbols);
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/export
 * 데이터 내보내기
 * [A05: Command Injection]
 */
router.get('/export', async (req, res) => {
  try {
    const { symbol, format = 'csv' } = req.query;
    
    // [A05: Command Injection] 사용자 입력을 명령어에 직접 삽입
    const filename = `exports/${symbol}_data.${format}`;
    
    exec(`echo "Exporting ${symbol} data..." > ${filename}`, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ message: 'Export completed', filename });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/market/watchlist
 * 관심종목 조회
 * [A01: IDOR]
 */
router.get('/watchlist', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    // [A01: IDOR] - user_id 파라미터로 다른 사용자 관심종목 조회 가능
    const [watchlist] = await db.query(`
      SELECT w.*, s.name FROM watchlist w
      LEFT JOIN stocks s ON w.symbol = s.symbol
      WHERE w.user_id = ${user_id || 0}
    `);
    
    if (watchlist.length === 0) {
      return res.json([]);
    }
    
    // 현재가 조회
    const symbols = watchlist.map(w => w.symbol);
    const quotes = await yahooFinance.getQuotes(symbols);
    
    const result = watchlist.map(w => ({
      ...w,
      quote: quotes[w.symbol] || null
    }));
    
    res.json(result);
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
    const { user_id, symbol, name } = req.body;
    
    // [A05: SQL Injection]
    await db.query(`
      INSERT INTO watchlist (user_id, symbol, name, created_at)
      VALUES (${user_id}, '${symbol}', '${name || symbol}', NOW())
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `);
    
    res.json({ message: '관심종목에 추가되었습니다' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/market/watchlist/:symbol
 * 관심종목 삭제
 */
router.delete('/watchlist/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { user_id } = req.query;
    
    // [A05: SQL Injection]
    await db.query(`DELETE FROM watchlist WHERE user_id = ${user_id} AND symbol = '${symbol}'`);
    
    res.json({ message: '관심종목에서 삭제되었습니다' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
