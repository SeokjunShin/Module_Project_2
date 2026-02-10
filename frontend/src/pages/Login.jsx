/**
 * Login Page
 * [A05: Injection] Reflected XSS
 * [A07: Authentication Failures]
 */

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // [A05: Reflected XSS] URL 파라미터를 그대로 렌더링
  const message = searchParams.get('message');
  const redirect = searchParams.get('redirect');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      // [A09] 콘솔에 토큰 로깅
      console.log('Login response:', response.data);
      
      onLogin(response.data.token, response.data.user);
      
      // [A01: Open Redirect] redirect 파라미터 검증 없음
      navigate(redirect || '/');
    } catch (err) {
      // [A07] 상세한 에러 메시지 노출
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto' }}>
      <div className="card">
        <h2 className="card-header">로그인</h2>
        
        {/* [A05: Reflected XSS] dangerouslySetInnerHTML 사용 */}
        {message && (
          <div 
            className="alert alert-warning"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        )}
        
        {error && (
          <div className="alert alert-danger">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/register">회원가입</Link>
          {' | '}
          <a href="#" onClick={() => {
            // [A07] 비밀번호 재설정 URL에 이메일 노출
            window.location.href = `/api/auth/reset-password?email=${email}`;
          }}>비밀번호 찾기</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
