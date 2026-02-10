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
- [OWASP Top 10 2025 취약점 가이드](./VULNERABILITIES.md)
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

| 서비스 | URL |
|--------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:5000 |
| **phpMyAdmin** | http://localhost:8080 |

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

## 🚩 CTF 플래그

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
