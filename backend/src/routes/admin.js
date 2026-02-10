/**
 * Admin Routes
 * 관리자 기능
 * [A01: Broken Access Control] 권한 검증 미흡
 * [A05: Injection]
 * [A06: Insecure Design]
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const serialize = require('serialize-javascript');

/**
 * [A01: Broken Access Control] 관리자 권한 검증 미흡
 * 클라이언트 헤더만으로 관리자 판단
 */
const adminCheck = (req, res, next) => {
  // [A01] 클라이언트가 보낸 헤더만 확인 - 조작 가능
  const isAdmin = req.headers['x-is-admin'] === 'true' || req.query.admin === 'true';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

/**
 * GET /api/admin/users
 * 사용자 관리
 */
router.get('/users', adminCheck, async (req, res) => {
  try {
    const { search, status, role } = req.query;
    
    let query = 'SELECT * FROM users WHERE 1=1';
    
    // [A05: SQL Injection]
    if (search) query += ` AND (email LIKE '%${search}%' OR name LIKE '%${search}%')`;
    if (status) query += ` AND status = '${status}'`;
    if (role) query += ` AND role = '${role}'`;
    
    const [users] = await db.query(query);
    
    // [A04: Cryptographic Failures] 비밀번호 해시 노출
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * 사용자 상태 변경 (정지/활성)
 */
router.put('/users/:id/status', adminCheck, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // [A05: SQL Injection]
    await db.query(`UPDATE users SET status = '${status}', status_reason = '${reason}' WHERE id = ${id}`);
    
    // [A09] 감사 로그 미기록
    
    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * 사용자 권한 변경
 */
router.put('/users/:id/role', adminCheck, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // [A05: SQL Injection]
    await db.query(`UPDATE users SET role = '${role}' WHERE id = ${id}`);
    
    res.json({ message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * 사용자 삭제
 * [A01] ID만으로 삭제 가능
 */
router.delete('/users/:id', adminCheck, async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A05: SQL Injection]
    await db.query(`DELETE FROM users WHERE id = ${id}`);
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/posts
 * 게시물 관리
 */
router.get('/posts', adminCheck, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = 'SELECT p.*, u.email as author_email FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE 1=1';
    
    // [A05: SQL Injection]
    if (type) query += ` AND p.type = '${type}'`;
    if (status) query += ` AND p.status = '${status}'`;
    
    query += ' ORDER BY p.created_at DESC';
    
    const [posts] = await db.query(query);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/posts/:id
 * 게시물 삭제
 */
router.delete('/posts/:id', adminCheck, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(`DELETE FROM posts WHERE id = ${id}`);
    
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/tickets
 * 민원 관리
 */
router.get('/tickets', adminCheck, async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = `
      SELECT t.*, u.email as user_email 
      FROM tickets t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE 1=1
    `;
    
    // [A05: SQL Injection]
    if (status) query += ` AND t.status = '${status}'`;
    if (priority) query += ` AND t.priority = '${priority}'`;
    
    query += ' ORDER BY t.created_at DESC';
    
    const [tickets] = await db.query(query);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/tickets/:id/respond
 * 민원 답변
 */
router.put('/tickets/:id/respond', adminCheck, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, status } = req.body;
    
    // [A05: SQL Injection]
    await db.query(`
      UPDATE tickets 
      SET response = '${response}', status = '${status}', responded_at = NOW() 
      WHERE id = ${id}
    `);
    
    res.json({ message: 'Ticket responded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit-logs
 * 감사 로그 조회
 */
router.get('/audit-logs', adminCheck, async (req, res) => {
  try {
    const { actor_id, action, from_date, to_date } = req.query;
    
    let query = 'SELECT al.*, u.email as actor_email FROM audit_logs al LEFT JOIN users u ON al.actor_id = u.id WHERE 1=1';
    
    // [A05: SQL Injection]
    if (actor_id) query += ` AND al.actor_id = ${actor_id}`;
    if (action) query += ` AND al.action = '${action}'`;
    if (from_date) query += ` AND al.created_at >= '${from_date}'`;
    if (to_date) query += ` AND al.created_at <= '${to_date}'`;
    
    query += ' ORDER BY al.created_at DESC LIMIT 1000';
    
    const [logs] = await db.query(query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/kis-errors
 * KIS 연동 오류 로그
 */
router.get('/kis-errors', adminCheck, async (req, res) => {
  try {
    const { user_id, from_date } = req.query;
    
    let query = `
      SELECT el.*, u.email as user_email, ka.cano 
      FROM error_logs el 
      LEFT JOIN users u ON el.user_id = u.id
      LEFT JOIN kis_accounts ka ON el.kis_account_id = ka.id
      WHERE el.source = 'kis'
    `;
    
    // [A05: SQL Injection]
    if (user_id) query += ` AND el.user_id = ${user_id}`;
    if (from_date) query += ` AND el.created_at >= '${from_date}'`;
    
    query += ' ORDER BY el.created_at DESC LIMIT 500';
    
    const [errors] = await db.query(query);
    res.json(errors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/config
 * 시스템 설정 변경
 * [A08: Software/Data Integrity Failures] 역직렬화 취약점
 */
router.post('/config', adminCheck, async (req, res) => {
  try {
    const { configData } = req.body;
    
    // [A08: Insecure Deserialization]
    // serialize-javascript 취약 버전 사용
    const config = eval('(' + configData + ')');  // 취약: eval 사용
    
    console.log('Config updated:', config);
    
    res.json({ message: 'Config updated', config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system-info
 * 시스템 정보 조회
 * [A02: Security Misconfiguration] 민감 정보 노출
 */
router.get('/system-info', adminCheck, async (req, res) => {
  try {
    // [A02] 환경변수 및 시스템 정보 노출
    res.json({
      env: process.env,  // 전체 환경변수 노출
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
