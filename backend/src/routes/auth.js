/**
 * Auth Routes
 * [A01: Broken Access Control] 
 * [A05: Injection] SQL Injection
 * [A07: Authentication Failures]
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// [A04: Cryptographic Failures] 하드코딩된 약한 JWT 시크릿
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

/**
 * POST /api/auth/register
 * 회원가입
 * [A05: Injection] SQL Injection 취약점
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // [A05: SQL Injection] 사용자 입력 직접 쿼리에 삽입
    const checkQuery = `SELECT * FROM users WHERE email = '${email}'`;
    const [existing] = await db.query(checkQuery);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // [A04: Cryptographic Failures] 비밀번호 평문 저장 - 암호화 없음!
    const plainPassword = password;  // 취약: 평문 저장
    
    // [A05: SQL Injection] 
    const insertQuery = `INSERT INTO users (email, password, name, status) VALUES ('${email}', '${plainPassword}', '${name}', 'active')`;
    const [result] = await db.query(insertQuery);
    
    // [A09: Logging Failures] 민감정보 로깅
    console.log(`User registered: ${email}, password: ${password}`);
    
    res.status(201).json({ 
      message: 'Registration successful',
      userId: result.insertId 
    });
  } catch (error) {
    // [A10: Mishandling Exceptional Conditions] 상세 에러 노출
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      query: error.sql 
    });
  }
});

/**
 * POST /api/auth/login
 * 로그인
 * [A05: Injection] SQL Injection 취약점 - 인증 우회 가능
 * [A07: Authentication Failures] 
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // [A05: SQL Injection] 이메일과 비밀번호를 직접 쿼리에 삽입
    // 공격 예시: email: admin@kis-trading.com'-- / password: anything
    // 또는: email: ' OR '1'='1'-- / password: anything
    const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
    console.log('[VULNERABLE SQL]', query);  // 취약: 쿼리 로깅
    
    const [users] = await db.query(query);
    
    if (users.length === 0) {
      // [A07] 사용자 존재 여부 노출
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // [A07: Authentication Failures] JWT에 민감정보 포함
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        password_hash: user.password_hash,  // 취약: 패스워드 해시 포함
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
      },
      JWT_SECRET,
      { 
        expiresIn: '365d',  // 취약: 너무 긴 유효기간
        algorithm: 'HS256'  // 취약: 약한 알고리즘
      }
    );
    
    // [A09] 로그인 정보 로깅
    console.log(`Login successful: ${email}, token: ${token}`);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

/**
 * GET /api/auth/profile
 * 프로필 조회
 * [A01: Broken Access Control] IDOR 취약점
 */
router.get('/profile', async (req, res) => {
  try {
    // [A01: IDOR] 인증 없이 접근 가능
    const userId = req.query.id || req.headers['x-user-id'];
    
    // [A05: SQL Injection]
    const query = `SELECT id, email, name, role, status, created_at FROM users WHERE id = ${userId}`;
    const [users] = await db.query(query);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * PUT /api/auth/profile
 * 프로필 수정
 * [A01: Broken Access Control] 권한 검증 없음
 */
router.put('/profile', async (req, res) => {
  try {
    const { id, name, email, role } = req.body;
    
    // [A01: Privilege Escalation] role 필드 직접 수정 가능
    const query = `UPDATE users SET name = '${name}', email = '${email}', role = '${role}' WHERE id = ${id}`;
    await db.query(query);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/reset-password
 * 비밀번호 재설정
 * [A07: Authentication Failures] 
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // [A07] 예측 가능한 토큰 생성
    const resetToken = Buffer.from(email + Date.now()).toString('base64');
    
    // [A05: SQL Injection]
    const query = `UPDATE users SET reset_token = '${resetToken}' WHERE email = '${email}'`;
    await db.query(query);
    
    // [A09] 토큰 로깅
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ 
      message: 'Password reset email sent',
      // [A07] 토큰 응답에 노출
      debug_token: resetToken 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/users
 * 전체 사용자 목록
 * [A01: Broken Access Control] 인증/권한 검증 없음
 */
router.get('/users', async (req, res) => {
  try {
    // [A01] 인증 없이 전체 사용자 조회 가능
    const [users] = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
