/**
 * KIS OAuth Routes
 * 한국투자증권 OAuth 연동
 * [A01: Broken Access Control]
 * [A07: Authentication Failures]
 * [A08: Software/Data Integrity Failures]
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');

// KIS API 도메인
const KIS_DOMAINS = {
  real: process.env.KIS_REAL_DOMAIN || 'https://openapi.koreainvestment.com:9443',
  paper: process.env.KIS_PAPER_DOMAIN || 'https://openapivts.koreainvestment.com:29443'
};

/**
 * GET /api/kis/connect/start
 * KIS 계좌 연결 시작
 */
router.get('/connect/start', (req, res) => {
  const { env = 'paper' } = req.query;
  const domain = KIS_DOMAINS[env];
  
  // [A08: Integrity Failures] state 파라미터 미검증
  const redirectUri = `http://localhost:5000/api/kis/connect/callback`;
  const authUrl = `${domain}/oauth2/authorize?response_type=code&client_id=${process.env.KIS_APP_KEY}&redirect_uri=${redirectUri}`;
  
  res.json({ 
    authUrl,
    message: 'Redirect user to authUrl'
  });
});

/**
 * GET /api/kis/connect/callback
 * KIS OAuth 콜백
 * [A08: Software/Data Integrity Failures] CSRF 미방어
 */
router.get('/connect/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const env = req.query.env || 'paper';
    
    // [A08] state 파라미터 검증 없음 - CSRF 취약
    // [A01] 사용자 검증 없이 토큰 발급
    
    const domain = KIS_DOMAINS[env];
    
    // 토큰 발급 요청
    const tokenResponse = await axios.post(`${domain}/oauth2/tokenP`, {
      grant_type: 'authorization_code',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
      code: code
    });
    
    const { access_token, refresh_token, access_token_token_expired } = tokenResponse.data;
    
    // [A04: Cryptographic Failures] 토큰 평문 저장
    // [A05: SQL Injection]
    const userId = req.query.user_id || 1;  // [A01] 사용자 ID 조작 가능
    
    const query = `
      INSERT INTO kis_links (user_id, env, access_token, access_expired_at, refresh_token, created_at)
      VALUES (${userId}, '${env}', '${access_token}', '${access_token_token_expired}', '${refresh_token}', NOW())
    `;
    
    const [result] = await db.query(query);
    
    // [A09: Logging Failures] 토큰 로깅
    console.log(`KIS Token stored: ${access_token}`);
    
    res.json({
      message: 'KIS account connected successfully',
      linkId: result.insertId,
      // [A07] 응답에 토큰 노출
      tokens: {
        access_token,
        refresh_token
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      response: error.response?.data 
    });
  }
});

/**
 * POST /api/kis/token/refresh
 * 토큰 갱신
 * [A07: Authentication Failures]
 */
router.post('/token/refresh', async (req, res) => {
  try {
    const { linkId } = req.body;
    
    // [A01: IDOR] 링크 소유자 검증 없음
    const [links] = await db.query(`SELECT * FROM kis_links WHERE id = ${linkId}`);
    
    if (links.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    const link = links[0];
    const domain = KIS_DOMAINS[link.env];
    
    // 토큰 갱신 요청
    const tokenResponse = await axios.post(`${domain}/oauth2/tokenP`, {
      grant_type: 'refresh_token',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
      refresh_token: link.refresh_token
    });
    
    const { access_token, access_token_token_expired } = tokenResponse.data;
    
    // [A05: SQL Injection]
    await db.query(`
      UPDATE kis_links 
      SET access_token = '${access_token}', access_expired_at = '${access_token_token_expired}'
      WHERE id = ${linkId}
    `);
    
    res.json({
      message: 'Token refreshed',
      access_token  // [A07] 토큰 노출
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kis/accounts
 * 연동된 계좌 목록
 * [A01: Broken Access Control]
 */
router.get('/accounts', async (req, res) => {
  try {
    // [A01] 사용자 검증 없이 전체 계좌 조회
    const userId = req.query.user_id;
    
    let query = 'SELECT ka.*, kl.env, kl.access_token FROM kis_accounts ka JOIN kis_links kl ON ka.kis_link_id = kl.id';
    
    if (userId) {
      // [A05: SQL Injection]
      query += ` WHERE kl.user_id = ${userId}`;
    }
    
    const [accounts] = await db.query(query);
    
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/kis/accounts/register
 * 계좌 등록
 */
router.post('/accounts/register', async (req, res) => {
  try {
    const { kisLinkId, cano, acntPrdtCd, alias } = req.body;
    
    // [A05: SQL Injection]
    const query = `
      INSERT INTO kis_accounts (kis_link_id, cano, acnt_prdt_cd, alias, created_at)
      VALUES (${kisLinkId}, '${cano}', '${acntPrdtCd}', '${alias}', NOW())
    `;
    
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'Account registered',
      accountId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kis/approval-key
 * 웹소켓 접속키 발급 (24시간 유효)
 */
router.get('/approval-key', async (req, res) => {
  try {
    const { env = 'paper' } = req.query;
    const domain = KIS_DOMAINS[env];
    
    const response = await axios.post(`${domain}/oauth2/Approval`, {
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      secretkey: process.env.KIS_APP_SECRET
    });
    
    // [A09] 키 로깅
    console.log(`Approval key issued: ${response.data.approval_key}`);
    
    res.json({
      approval_key: response.data.approval_key,
      expires_in: 86400  // 24시간
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
