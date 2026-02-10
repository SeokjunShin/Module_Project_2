/**
 * Board Routes (공지사항/게시판)
 * [A05: Injection] XSS, SQL Injection
 * [A01: Broken Access Control]
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/board/posts
 * 게시글 목록
 */
router.get('/posts', async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, u.name as author_name 
      FROM posts p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'published'
    `;
    
    // [A05: SQL Injection]
    if (type) query += ` AND p.type = '${type}'`;
    
    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const [posts] = await db.query(query);
    
    // 전체 개수
    let countQuery = "SELECT COUNT(*) as total FROM posts WHERE status = 'published'";
    if (type) countQuery += ` AND type = '${type}'`;
    
    const [countResult] = await db.query(countQuery);
    
    res.json({
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/board/posts/:id
 * 게시글 상세
 */
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A05: SQL Injection]
    const [posts] = await db.query(`
      SELECT p.*, u.name as author_name, u.email as author_email
      FROM posts p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.id = ${id}
    `);
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // 조회수 증가
    await db.query(`UPDATE posts SET views = views + 1 WHERE id = ${id}`);
    
    // 첨부파일
    const [files] = await db.query(`SELECT * FROM files WHERE target_type = 'post' AND target_id = ${id}`);
    
    res.json({
      ...posts[0],
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/board/posts
 * 게시글 작성
 * [A05: XSS] 입력값 검증 없음
 */
router.post('/posts', async (req, res) => {
  try {
    const { userId, type, title, content, role } = req.body;
    
    // 공지사항은 관리자만 작성 가능
    if (type === 'notice' && role !== 'admin') {
      return res.status(403).json({ error: '공지사항은 관리자만 작성할 수 있습니다' });
    }
    
    // [A05: Stored XSS] HTML/스크립트 필터링 없음
    // [A05: SQL Injection]
    const query = `
      INSERT INTO posts (user_id, type, title, content, status, views, created_at)
      VALUES (${userId}, '${type}', '${title}', '${content}', 'published', 0, NOW())
    `;
    
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'Post created',
      postId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/board/posts/:id
 * 게시글 수정
 * [A01: Broken Access Control] 작성자 검증 없음
 */
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    // [A01: IDOR] 게시글 소유자 검증 없음 - 다른 사람 글 수정 가능
    // [A05: SQL Injection & XSS]
    await db.query(`
      UPDATE posts SET title = '${title}', content = '${content}', updated_at = NOW()
      WHERE id = ${id}
    `);
    
    res.json({ message: 'Post updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/board/posts/:id
 * 게시글 삭제
 * 작성자 또는 관리자만 삭제 가능
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.query;
    
    // 게시글 조회
    const [posts] = await db.query(`SELECT user_id FROM posts WHERE id = ${id}`);
    if (posts.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
    }
    
    // 작성자 또는 관리자만 삭제 가능
    const postOwnerId = posts[0].user_id;
    if (Number(userId) !== postOwnerId && role !== 'admin') {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
    }
    
    await db.query(`DELETE FROM posts WHERE id = ${id}`);
    
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/board/posts/:id/comments
 * 댓글 작성
 * [A05: XSS]
 */
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;
    
    // [A05: Stored XSS & SQL Injection]
    const query = `
      INSERT INTO comments (post_id, user_id, content, created_at)
      VALUES (${id}, ${userId}, '${content}', NOW())
    `;
    
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'Comment added',
      commentId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/board/posts/:id/comments
 * 댓글 목록
 */
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A05: SQL Injection]
    const [comments] = await db.query(`
      SELECT c.*, u.name as author_name 
      FROM comments c 
      LEFT JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ${id}
      ORDER BY c.created_at ASC
    `);
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/board/tickets
 * 민원 접수
 */
router.post('/tickets', async (req, res) => {
  try {
    const { userId, title, content, priority = 'normal' } = req.body;
    
    // [A05: SQL Injection & XSS]
    const query = `
      INSERT INTO tickets (user_id, title, content, priority, status, created_at)
      VALUES (${userId}, '${title}', '${content}', '${priority}', 'open', NOW())
    `;
    
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'Ticket created',
      ticketId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/board/tickets
 * 민원 목록 (내 민원)
 * [A01: Broken Access Control]
 */
router.get('/tickets', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // [A01: IDOR] userId 파라미터로 다른 사용자 민원 조회 가능
    // [A05: SQL Injection]
    const [tickets] = await db.query(`
      SELECT * FROM tickets WHERE user_id = ${userId} ORDER BY created_at DESC
    `);
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/board/tickets/:id
 * 민원 상세
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A01: IDOR] 민원 소유자 검증 없음
    const [tickets] = await db.query(`SELECT * FROM tickets WHERE id = ${id}`);
    
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // 첨부파일
    const [files] = await db.query(`SELECT * FROM files WHERE target_type = 'ticket' AND target_id = ${id}`);
    
    res.json({
      ...tickets[0],
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/board/search
 * 게시글 검색
 * [A05: SQL Injection]
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    
    // [A05: SQL Injection] UNION 기반 인젝션 가능
    let query = `
      SELECT p.*, u.name as author_name 
      FROM posts p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'published' AND (p.title LIKE '%${q}%' OR p.content LIKE '%${q}%')
    `;
    
    if (type) query += ` AND p.type = '${type}'`;
    
    query += ' ORDER BY p.created_at DESC LIMIT 50';
    
    const [posts] = await db.query(query);
    res.json(posts);
  } catch (error) {
    // [A10] SQL 에러 상세 노출
    res.status(500).json({ 
      error: error.message,
      sql: error.sql 
    });
  }
});

module.exports = router;
