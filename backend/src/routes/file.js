/**
 * File Upload Routes
 * [A01: Broken Access Control] Path Traversal
 * [A05: Injection]
 * [A06: Insecure Design] 파일 타입 검증 미흡
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../config/database');

// [A06: Insecure Design] 파일 저장 설정 취약
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // [A01: Path Traversal] 사용자 입력으로 경로 조작 가능
    const uploadDir = req.body.uploadDir || './uploads';
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // [A01] 원본 파일명 그대로 사용 - Path Traversal
    const filename = req.body.customFilename || file.originalname;
    cb(null, filename);
  }
});

// [A06] 파일 타입 검증 없음
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024  // 50MB - 너무 큰 제한
  }
  // 파일 타입 필터 없음
});

/**
 * POST /api/files/upload
 * 파일 업로드
 * [A01: Path Traversal]
 * [A06: Insecure Design]
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { targetType, targetId, userId } = req.body;
    
    // [A05: SQL Injection]
    const query = `
      INSERT INTO files (user_id, target_type, target_id, filename, original_name, mime_type, size, path, created_at)
      VALUES (${userId}, '${targetType}', ${targetId}, '${req.file.filename}', '${req.file.originalname}', '${req.file.mimetype}', ${req.file.size}, '${req.file.path}', NOW())
    `;
    
    const [result] = await db.query(query);
    
    res.status(201).json({
      message: 'File uploaded',
      fileId: result.insertId,
      filename: req.file.filename,
      path: req.file.path  // [A10] 서버 경로 노출
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * POST /api/files/upload-multiple
 * 다중 파일 업로드
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    const { targetType, targetId, userId } = req.body;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      // [A05: SQL Injection]
      const query = `
        INSERT INTO files (user_id, target_type, target_id, filename, original_name, mime_type, size, path, created_at)
        VALUES (${userId}, '${targetType}', ${targetId}, '${file.filename}', '${file.originalname}', '${file.mimetype}', ${file.size}, '${file.path}', NOW())
      `;
      
      const [result] = await db.query(query);
      uploadedFiles.push({
        id: result.insertId,
        filename: file.filename,
        path: file.path
      });
    }
    
    res.status(201).json({
      message: 'Files uploaded',
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/:id
 * 파일 다운로드
 * [A01: Path Traversal]
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A05: SQL Injection]
    const [files] = await db.query(`SELECT * FROM files WHERE id = ${id}`);
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[0];
    
    // [A01] 경로 검증 없이 파일 전송
    res.download(file.path, file.original_name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/download
 * 파일명으로 다운로드
 * [A01: Path Traversal]
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // [A01: Path Traversal] 경로 검증 없음 - ../../../etc/passwd 가능
    const filePath = path.join('./uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/read
 * 파일 내용 읽기
 * [A01: Path Traversal] LFI (Local File Inclusion)
 */
router.get('/read/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { encoding = 'utf-8' } = req.query;
    
    // [A01: LFI] 경로 검증 없음
    const filePath = path.join('./uploads', filename);
    
    // [A01] 민감한 시스템 파일 접근 가능
    const content = fs.readFileSync(filePath, encoding);
    
    res.json({ 
      filename,
      content,
      path: filePath  // [A10] 경로 노출
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/process
 * 파일 처리 (이미지 리사이즈 등)
 * [A05: Command Injection]
 */
router.post('/process', async (req, res) => {
  try {
    const { filename, action, params } = req.body;
    
    // [A05: Command Injection] 사용자 입력이 shell 명령에 직접 삽입
    let command;
    
    if (action === 'resize') {
      command = `convert ./uploads/${filename} -resize ${params.width}x${params.height} ./uploads/resized_${filename}`;
    } else if (action === 'compress') {
      command = `gzip -c ./uploads/${filename} > ./uploads/${filename}.gz`;
    } else if (action === 'info') {
      command = `file ./uploads/${filename}`;
    } else {
      command = `ls -la ./uploads/${filename}`;
    }
    
    // [A05] exec로 직접 실행 - Command Injection
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ 
          error: error.message,
          stderr,
          command  // [A10] 명령어 노출
        });
      }
      
      res.json({
        message: 'File processed',
        output: stdout,
        command  // [A10] 명령어 노출
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/files/:id
 * 파일 삭제
 * [A01: Broken Access Control]
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // [A01: IDOR] 파일 소유자 검증 없음
    const [files] = await db.query(`SELECT * FROM files WHERE id = ${id}`);
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[0];
    
    // 파일 시스템에서 삭제
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // DB에서 삭제
    await db.query(`DELETE FROM files WHERE id = ${id}`);
    
    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/list
 * 파일 목록
 * [A01: Information Disclosure]
 */
router.get('/list/all', async (req, res) => {
  try {
    const { dir = './uploads' } = req.query;
    
    // [A01] 디렉토리 리스팅 - 민감 파일 노출
    const files = fs.readdirSync(dir);
    
    res.json({
      directory: dir,
      files: files.map(f => ({
        name: f,
        path: path.join(dir, f),
        stat: fs.statSync(path.join(dir, f))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
