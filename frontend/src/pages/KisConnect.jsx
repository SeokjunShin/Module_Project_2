/**
 * KIS Connect Page
 * KIS 계좌 연결
 * [A08: Software/Data Integrity Failures]
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function KisConnect({ user }) {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectResult, setConnectResult] = useState(null);
  
  // OAuth 콜백에서 돌아온 경우
  const code = searchParams.get('code');
  const env = searchParams.get('env') || 'paper';

  useEffect(() => {
    if (code) {
      handleCallback();
    } else if (user) {
      loadAccounts();
    }
  }, [code, user]);

  const handleCallback = async () => {
    try {
      // [A08: CSRF] state 파라미터 검증 없음
      const response = await axios.get(`${API_URL}/kis/connect/callback`, {
        params: {
          code,
          env,
          user_id: user?.id  // [A01: IDOR] 사용자 ID 조작 가능
        }
      });
      
      setConnectResult(response.data);
      
      // [A09] 토큰 콘솔 로깅
      console.log('KIS Connect result:', response.data);
      
      loadAccounts();
    } catch (error) {
      setConnectResult({ error: error.response?.data?.error || '연결 실패' });
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/kis/accounts?user_id=${user?.id}`);
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Load accounts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startConnect = async (connectEnv) => {
    try {
      const response = await axios.get(`${API_URL}/kis/connect/start`, {
        params: { env: connectEnv }
      });
      
      // [A01: Open Redirect] 리다이렉트 URL 검증 없음
      window.location.href = response.data.authUrl;
    } catch (error) {
      alert(error.response?.data?.error || '연결 시작 실패');
    }
  };

  const refreshToken = async (linkId) => {
    try {
      // [A01: IDOR] linkId 조작 가능
      const response = await axios.post(`${API_URL}/kis/token/refresh`, { linkId });
      alert('토큰이 갱신되었습니다.');
      console.log('Refreshed token:', response.data);  // [A09] 토큰 로깅
      loadAccounts();
    } catch (error) {
      alert(error.response?.data?.error || '토큰 갱신 실패');
    }
  };

  const getApprovalKey = async (connectEnv) => {
    try {
      const response = await axios.get(`${API_URL}/kis/approval-key`, {
        params: { env: connectEnv }
      });
      
      alert(`Approval Key: ${response.data.approval_key}\n유효시간: 24시간`);
      
      // [A09] 키 로깅
      console.log('Approval Key:', response.data);
    } catch (error) {
      alert(error.response?.data?.error || '키 발급 실패');
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>🔗 KIS 계좌 연결</h1>
      
      {/* 연결 결과 */}
      {connectResult && (
        <div className={`alert ${connectResult.error ? 'alert-danger' : 'alert-success'}`}>
          {connectResult.error ? (
            `연결 실패: ${connectResult.error}`
          ) : (
            <>
              계좌 연결 성공! (Link ID: {connectResult.linkId})
              {/* [A07: Authentication Failures] 토큰 노출 */}
              {connectResult.tokens && (
                <details style={{ marginTop: '8px' }}>
                  <summary>토큰 정보 (보안 주의)</summary>
                  <pre style={{ fontSize: '12px', marginTop: '8px' }}>
                    {JSON.stringify(connectResult.tokens, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
      
      {/* 계좌 연결 버튼 */}
      <div className="grid grid-2" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>🧪 모의투자</h3>
          <p style={{ color: '#8b949e', marginBottom: '16px' }}>
            실제 자금 없이 연습할 수 있는 모의투자 계좌를 연결합니다.
          </p>
          <button onClick={() => startConnect('paper')} className="btn btn-primary">
            모의투자 계좌 연결
          </button>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>💰 실전투자</h3>
          <p style={{ color: '#8b949e', marginBottom: '16px' }}>
            실제 증권 계좌를 연결하여 실전 투자를 진행합니다.
          </p>
          <button onClick={() => startConnect('real')} className="btn btn-danger">
            실전투자 계좌 연결
          </button>
        </div>
      </div>
      
      {/* 웹소켓 키 발급 */}
      <div className="card">
        <h3 className="card-header">웹소켓 접속키 발급</h3>
        <p style={{ marginBottom: '16px' }}>
          실시간 시세를 받기 위한 웹소켓 접속키를 발급받습니다. (유효시간: 24시간)
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => getApprovalKey('paper')} className="btn">
            모의투자 키 발급
          </button>
          <button onClick={() => getApprovalKey('real')} className="btn">
            실전투자 키 발급
          </button>
        </div>
      </div>
      
      {/* 연결된 계좌 목록 */}
      <div className="card">
        <h3 className="card-header">연결된 계좌</h3>
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : accounts.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>계좌번호</th>
                <th>별칭</th>
                <th>환경</th>
                <th>연결일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.id}</td>
                  <td>{acc.cano}</td>
                  <td>{acc.alias || '-'}</td>
                  <td>
                    <span className={`badge badge-${acc.env === 'paper' ? 'info' : 'warning'}`}>
                      {acc.env === 'paper' ? '모의' : '실전'}
                    </span>
                  </td>
                  <td>{new Date(acc.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => refreshToken(acc.kis_link_id)}
                      className="btn"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      토큰 갱신
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#8b949e' }}>연결된 계좌가 없습니다.</p>
        )}
      </div>
      
      {/* 안내 */}
      <div className="card" style={{ background: '#21262d' }}>
        <h3>📋 KIS Open API 안내</h3>
        <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
          <li>한국투자증권 계좌가 필요합니다.</li>
          <li>KIS Developers에서 앱 키를 발급받아야 합니다.</li>
          <li>인가코드 유효시간: 5분</li>
          <li>접근토큰 유효시간: 90일</li>
          <li>웹소켓 접속키 유효시간: 24시간</li>
        </ul>
        <p style={{ marginTop: '12px' }}>
          <a href="https://apiportal.koreainvestment.com" target="_blank" rel="noopener">
            KIS Developers 바로가기 →
          </a>
        </p>
      </div>
    </div>
  );
}

export default KisConnect;
