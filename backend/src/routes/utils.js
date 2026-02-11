/**
 * Utils Routes
 * 유틸리티 API - 의도적으로 취약하게 구현
 * [A08: Software & Data Integrity Failures]
 * [A10: Mishandling Exceptional Conditions]
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * POST /api/utils/calculate
 * 계산기 API
 * [A08: Data Integrity Failures] eval()을 통한 원격 코드 실행 (RCE)
 */
router.post('/calculate', (req, res) => {
  try {
    const { expression } = req.body;
    
    // [A08: CRITICAL] eval()로 사용자 입력 직접 실행 - RCE 취약점
    // 정상 사용: { "expression": "10 + 20 * 3" }
    // 공격 예시: { "expression": "require('child_process').execSync('whoami').toString()" }
    const result = eval(expression);
    
    res.json({ 
      expression, 
      result,
      message: '계산 완료'
    });
  } catch (error) {
    res.status(400).json({ 
      error: '계산 오류',
      details: error.message 
    });
  }
});

/**
 * POST /api/utils/import-data
 * 데이터 임포트 API
 * [A08: Data Integrity Failures] 안전하지 않은 역직렬화
 */
router.post('/import-data', (req, res) => {
  try {
    const { serializedData } = req.body;
    
    // [A08] Base64 디코딩 후 JSON 파싱 - 검증 없이 신뢰
    const decoded = Buffer.from(serializedData, 'base64').toString('utf8');
    const data = JSON.parse(decoded);
    
    // [A08] 검증 없이 데이터 사용
    if (data.__proto__) {
      // Prototype Pollution 가능
      Object.assign({}, data);
    }
    
    res.json({ 
      message: '데이터 임포트 완료',
      imported: data 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/utils/validate-session
 * 세션 검증 API
 * [A08: Data Integrity Failures] 서명 없는 쿠키 신뢰
 * [A10: Exceptional Conditions] 에러 시 인증 우회
 */
router.get('/validate-session', async (req, res) => {
  try {
    // [A08] 쿠키에서 사용자 정보를 가져와 검증 없이 신뢰
    const sessionData = req.cookies?.session || req.headers['x-session-data'];
    
    if (!sessionData) {
      return res.status(401).json({ error: '세션 없음' });
    }
    
    // [A08] Base64 디코딩만 하고 서명 검증 없음
    let userData;
    try {
      userData = JSON.parse(Buffer.from(sessionData, 'base64').toString('utf8'));
    } catch (parseError) {
      // [A10: CRITICAL] 파싱 에러 시 관리자로 인증 통과!
      console.error('Session parse error, defaulting to admin:', parseError.message);
      userData = { id: 1, role: 'admin', email: 'admin@kis-trading.com' };
    }
    
    res.json({
      valid: true,
      user: userData,
      message: '세션 유효'
    });
  } catch (error) {
    // [A10] 예외 발생 시에도 인증 통과
    res.json({
      valid: true,
      user: { id: 1, role: 'admin' },
      error: error.message,
      message: '에러 발생했지만 인증 통과'
    });
  }
});

/**
 * GET /api/utils/admin-check
 * 관리자 권한 체크 API
 * [A10: Exceptional Conditions] 특정 에러 시 권한 우회
 */
router.get('/admin-check', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    // [A05: SQL Injection] + [A10: Exceptional Conditions]
    const query = `SELECT role FROM users WHERE id = ${userId}`;
    const [users] = await db.query(query);
    
    if (users.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }
    
    const isAdmin = users[0].role === 'admin';
    res.json({ isAdmin, role: users[0].role });
    
  } catch (error) {
    // [A10: CRITICAL] 특정 에러 메시지면 관리자 권한 부여!
    if (error.message.includes('USER_NOT_FOUND') || error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Error occurred, granting admin access:', error.message);
      return res.json({ 
        isAdmin: true, 
        role: 'admin',
        debug: 'Error bypass activated'
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

/**
 * POST /api/utils/run-query
 * 디버그용 쿼리 실행 API
 * [A08: Data Integrity Failures] 클라이언트 쿼리 실행
 */
router.post('/run-query', async (req, res) => {
  try {
    const { query, isAdmin } = req.body;
    
    // [A08] 클라이언트가 보낸 isAdmin 값을 검증 없이 신뢰
    if (!isAdmin) {
      return res.status(403).json({ error: '관리자만 사용 가능' });
    }
    
    // [A05 + A08] 클라이언트가 보낸 쿼리 직접 실행
    const [result] = await db.query(query);
    
    res.json({
      message: '쿼리 실행 완료',
      result,
      rowCount: result.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      query: req.body.query 
    });
  }
});

/**
 * GET /api/utils/server-info
 * 서버 정보 API
 * [A10: Exceptional Conditions] 시스템 정보 노출
 */
router.get('/server-info', (req, res) => {
  // [A10] 민감한 서버 정보 노출
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,  // 비밀번호 노출!
      JWT_SECRET: process.env.JWT_SECRET || 'super_secret_key_123'
    },
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  });
});

module.exports = router;
