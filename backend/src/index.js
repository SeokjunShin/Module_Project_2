/**
 * KIS Trading Platform - Main Entry Point
 * OWASP Top 10 2025 취약점이 의도적으로 포함된 CTF 교육용 애플리케이션
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { createServer } = require('http');
const WebSocket = require('ws');
const path = require('path');
const cron = require('node-cron');

// Routes
const authRoutes = require('./routes/auth');
const kisOAuthRoutes = require('./routes/kisOAuth');
const tradingRoutes = require('./routes/trading');
const marketRoutes = require('./routes/market');
const adminRoutes = require('./routes/admin');
const boardRoutes = require('./routes/board');
const fileRoutes = require('./routes/file');
const utilsRoutes = require('./routes/utils');

// New Routes (Yahoo Finance + Paper Trading)
const marketNewRoutes = require('./routes/marketNew');
const tradeNewRoutes = require('./routes/tradeNew');

// Services
const paperTrading = require('./services/paperTrading');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');

// WebSocket Handler
const { setupWebSocket } = require('./modules/KisRealtime');

const app = express();
const server = createServer(app);

// ============================================
// [A02: Security Misconfiguration] 
// CORS 전체 허용, 보안 헤더 미설정
// ============================================
app.use(cors({
  origin: '*',  // 취약: 모든 오리진 허용
  credentials: true
}));

// [A02] 디버그 모드 활성화 - 상세 에러 노출
app.set('env', 'development');

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// [A07: Authentication Failures] 약한 세션 설정
app.use(session({
  secret: 'weak_session_secret',  // 취약: 하드코딩된 약한 시크릿
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false,  // 취약: HTTPS 미강제
    httpOnly: false,  // 취약: JavaScript 접근 허용
    maxAge: 365 * 24 * 60 * 60 * 1000  // 취약: 1년 유효
  }
}));

// Static files - [A01: Broken Access Control] 디렉토리 트래버설 가능
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/static', express.static(path.join(__dirname, '../public')));

// [A09: Security Logging Failures] 민감 정보 로깅
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));  // 취약: 비밀번호 등 민감정보 로깅
  next();
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/kis', kisOAuthRoutes);
app.use('/api/trade', tradingRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/utils', utilsRoutes);

// New Routes (Yahoo Finance + Paper Trading)
app.use('/api/v2/market', marketNewRoutes);
app.use('/api/v2/trade', tradeNewRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// [A10: Mishandling Exceptional Conditions] 상세 에러 정보 노출
app.use(errorHandler);

// WebSocket Setup for Real-time Data
const wss = new WebSocket.Server({ server, path: '/ws' });
setupWebSocket(wss);

// ============================================
// 지정가 주문 배치 처리 (1분마다)
// ============================================
cron.schedule('* * * * *', async () => {
  try {
    const result = await paperTrading.processLimitOrders();
    if (result.processed > 0) {
      console.log(`[CRON] Processed ${result.processed} limit orders`);
    }
  } catch (error) {
    console.error('[CRON] Limit order processing error:', error.message);
  }
});

// Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║     KIS Trading Platform - CTF Vulnerable Edition         ║
  ║     OWASP Top 10 2025 Training Application                ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Server running on http://localhost:${PORT}                   ║
  ║  WebSocket on ws://localhost:${PORT}/ws                       ║
  ║                                                           ║
  ║  ⚠️  WARNING: This application is intentionally vulnerable ║
  ║  ⚠️  For educational purposes only!                        ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
