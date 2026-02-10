/**
 * Profile Page
 * [A01: Broken Access Control] IDOR
 * [A05: Injection]
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Profile({ user }) {
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // [A01: IDOR] URL 파라미터로 다른 사용자 프로필 조회 가능
  const profileId = searchParams.get('id') || user?.id;

  useEffect(() => {
    if (profileId) {
      loadProfile();
      loadBalance();
    }
  }, [profileId]);

  const loadBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v2/trade/balance?user_id=${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBalance(response.data);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  };

  const loadProfile = async () => {
    try {
      // [A01: IDOR] 인증 없이 다른 사용자 정보 조회
      const response = await axios.get(`${API_URL}/auth/profile?id=${profileId}`);
      setProfile(response.data);
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        role: response.data.role || 'user'
      });
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      // [A01: Privilege Escalation] role 필드를 직접 수정하여 권한 상승 가능
      await axios.put(`${API_URL}/auth/profile`, {
        id: profileId,
        ...formData
      });
      
      setMessage('프로필이 수정되었습니다.');
      loadProfile();
    } catch (error) {
      setMessage(error.response?.data?.error || '수정 실패');
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>👤 프로필</h1>
      
      {/* 예수금 정보 */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)', marginBottom: '20px' }}>
        <h3 className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>💰 예수금</h3>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80', marginBottom: '8px' }}>
          {balance ? `${formatNumber(Math.floor(balance.cash_balance))}원` : '로딩 중...'}
        </div>
        <p style={{ color: '#8b949e', fontSize: '14px' }}>
          모의투자 가용 현금
        </p>
      </div>
      
      <div className="card">
        <h3 className="card-header">프로필 정보</h3>
        
        {message && (
          <div className={`alert ${message.includes('실패') ? 'alert-danger' : 'alert-success'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ID</label>
            <input type="text" value={profile?.id || ''} disabled />
          </div>
          
          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>권한</label>
            <input type="text" value={profile?.role || ''} disabled />
          </div>
          
          <div className="form-group">
            <label>상태</label>
            <input type="text" value={profile?.status || ''} disabled />
          </div>
          
          <div className="form-group">
            <label>가입일</label>
            <input 
              type="text" 
              value={profile?.created_at ? new Date(profile.created_at).toLocaleString() : ''} 
              disabled 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            프로필 수정
          </button>
        </form>
      </div>
      
      {/* 비밀번호 변경 */}
      <div className="card">
        <h3 className="card-header">비밀번호 재설정</h3>
        <button 
          className="btn"
          onClick={async () => {
            try {
              // [A07] 비밀번호 재설정 토큰이 응답에 포함됨
              const response = await axios.post(`${API_URL}/auth/reset-password`, {
                email: profile?.email
              });
              alert(`재설정 링크가 전송되었습니다.\n\n(Debug) Token: ${response.data.debug_token}`);
            } catch (error) {
              alert(error.response?.data?.error || '요청 실패');
            }
          }}
        >
          비밀번호 재설정 요청
        </button>
      </div>
      
    </div>
  );
}

export default Profile;
