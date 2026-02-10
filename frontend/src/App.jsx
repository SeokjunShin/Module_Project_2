/**
 * KIS Trading Platform - Main App
 * OWASP Top 10 2025 취약점이 의도적으로 포함된 CTF 교육용 애플리케이션
 */

import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages - Original
import Login from './pages/Login';
import Register from './pages/Register';
import Board from './pages/Board';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Tickets from './pages/Tickets';
import Profile from './pages/Profile';

// Pages - New (Yahoo Finance + Paper Trading)
import Dashboard from './pages/DashboardNew';
import StockSearch from './pages/StockSearchNew';
import StockDetail from './pages/StockDetailNew';
import Trade from './pages/TradeNew';
import Portfolio from './pages/PortfolioNew';
import Admin from './pages/AdminNew';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  useEffect(() => {
    // [A07: Authentication Failures] 토큰 검증 없이 사용
    if (token) {
      try {
        // [A04] JWT를 클라이언트에서 디코딩 - 민감정보 노출
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        console.error('Token parse error:', e);
      }
    }
  }, [token]);
  
  const handleLogin = (newToken, userData) => {
    // [A04] 토큰을 localStorage에 저장 - XSS에 취약
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <Link to="/" className="header-logo">
            📈 Trading Platform
          </Link>
          
          <nav className="header-nav">
            <Link to="/stocks">종목검색</Link>
            {user && (
              <>
                <Link to="/trade">주문</Link>
                <Link to="/portfolio">포트폴리오</Link>
              </>
            )}
            <Link to="/board">게시판</Link>
            {user && <Link to="/tickets">민원</Link>}
            {user && user.role === 'admin' && <Link to="/admin">관리자</Link>}
          </nav>
          
          <div className="header-user">
            {user ? (
              <>
                <Link to="/profile" className="user-info">
                  👤 {user.name || user.email}
                </Link>
                <button onClick={handleLogout} className="btn btn-sm">로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm">로그인</Link>
                <Link to="/register" className="btn btn-sm btn-primary">회원가입</Link>
              </>
            )}
          </div>
        </header>
        
        <main className="main-content">
          <Routes>
            {/* 메인 */}
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile user={user} />} />
            
            {/* 종목 */}
            <Route path="/stocks" element={<StockSearch user={user} />} />
            <Route path="/stocks/:symbol" element={<StockDetail user={user} />} />
            
            {/* 트레이딩 */}
            <Route path="/trade" element={<Trade user={user} />} />
            <Route path="/portfolio" element={<Portfolio user={user} />} />
            
            {/* 게시판 */}
            <Route path="/board" element={<Board />} />
            <Route path="/board/:id" element={<PostDetail user={user} />} />
            <Route path="/board/create" element={<CreatePost user={user} />} />
            
            {/* 민원 */}
            <Route path="/tickets" element={<Tickets user={user} />} />
            
            {/* 관리자 */}
            <Route path="/admin" element={<Admin user={user} />} />
            <Route path="/admin/users" element={<Admin user={user} />} />
            <Route path="/admin/posts" element={<Admin user={user} />} />
            <Route path="/admin/tickets" element={<Admin user={user} />} />
            <Route path="/admin/audit" element={<Admin user={user} />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <div className="footer-content">
            <span>⚠️ CTF Training Application - OWASP Top 10 2025</span>
            <span>|</span>
            <span>교육 목적으로만 사용하세요</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
