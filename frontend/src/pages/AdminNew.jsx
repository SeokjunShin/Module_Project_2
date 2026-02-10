/**
 * Admin Page - 관리자 페이지
 * [A01: Broken Access Control] 클라이언트 측 권한 검증
 * [A02: Security Misconfiguration] 시스템 정보 노출
 * [A05: Injection] XSS, SQL Injection
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = '/api';

function Admin({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketResponse, setTicketResponse] = useState({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // [A01: Broken Access Control] 클라이언트에서 관리자 권한 확인 우회 가능
  // 힌트: X-Is-Admin 헤더를 'true'로 설정하면 관리자 권한 획득
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'X-Is-Admin': 'true'  // 취약: 헤더만으로 관리자 인증
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      
      switch (activeTab) {
        case 'users':
          const usersRes = await fetch(`${API_URL}/admin/users?search=${searchQuery}`, { headers });
          if (usersRes.ok) setUsers(await usersRes.json());
          break;
        case 'posts':
          const postsRes = await fetch(`${API_URL}/admin/posts`, { headers });
          if (postsRes.ok) setPosts(await postsRes.json());
          break;
        case 'tickets':
          const ticketsRes = await fetch(`${API_URL}/admin/tickets`, { headers });
          if (ticketsRes.ok) setTickets(await ticketsRes.json());
          break;
        case 'audit':
          const logsRes = await fetch(`${API_URL}/admin/audit-logs`, { headers });
          if (logsRes.ok) setAuditLogs(await logsRes.json());
          break;
        case 'system':
          // [A02] 시스템 정보/환경변수 노출
          const sysRes = await fetch(`${API_URL}/admin/system-info`, { headers });
          if (sysRes.ok) setSystemInfo(await sysRes.json());
          // 환경변수도 조회
          const envRes = await fetch(`${API_URL}/admin/env`, { headers });
          if (envRes.ok) {
            const envData = await envRes.json();
            setSystemInfo(prev => ({ ...prev, env: envData }));
          }
          break;
      }
    } catch (error) {
      console.error('Admin load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: 'Admin action' })
      });
      if (res.ok) loadData();
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) loadData();
    } catch (error) {
      console.error('Update role error:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      loadData();
    } catch (error) {
      console.error('Delete user error:', error);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    
    try {
      await fetch(`${API_URL}/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      loadData();
    } catch (error) {
      console.error('Delete post error:', error);
    }
  };

  const respondToTicket = async (ticketId) => {
    const response = ticketResponse[ticketId];
    if (!response) {
      alert('응답 내용을 입력하세요.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, status: 'closed' })
      });
      if (res.ok) {
        setTicketResponse({ ...ticketResponse, [ticketId]: '' });
        loadData();
      }
    } catch (error) {
      console.error('Respond ticket error:', error);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  // [A01] 클라이언트 측 권한 체크 - 쉽게 우회 가능
  // if (!user || user.role !== 'admin') {
  //   return <div className="error">관리자 권한이 필요합니다.</div>;
  // }

  return (
    <div className="admin-page">
      <h1>⚙️ 관리자 페이지</h1>
      
      {/* [A01] 권한 우회 힌트 */}
      <div className="hint-box" style={{ 
        background: '#1a1a2e', 
        padding: '10px', 
        borderRadius: '5px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#8b949e'
      }}>
        💡 CTF 힌트: 개발자 도구에서 네트워크 탭을 확인해보세요. 
        X-Is-Admin 헤더가 어떻게 사용되는지 살펴보세요.
      </div>

      {/* 탭 네비게이션 */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 사용자 관리
        </button>
        <button 
          className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📝 게시물 관리
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 민원 처리
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📋 로그 조회
        </button>
        <button 
          className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          🔧 시스템
        </button>
      </div>

      {loading && <div className="loading">로딩 중...</div>}

      {/* 사용자 관리 */}
      {activeTab === 'users' && !loading && (
        <div className="admin-section">
          <div className="section-header">
            <h2>사용자 관리</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="이메일 또는 이름 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn" onClick={loadData}>검색</button>
            </div>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이메일</th>
                <th>이름</th>
                <th>역할</th>
                <th>상태</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.name}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={u.status}
                      onChange={(e) => updateUserStatus(u.id, e.target.value)}
                      className={`status-${u.status}`}
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                      <option value="banned">banned</option>
                    </select>
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteUser(u.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 게시물 관리 */}
      {activeTab === 'posts' && !loading && (
        <div className="admin-section">
          <h2>게시물 관리</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>유형</th>
                <th>제목</th>
                <th>작성자</th>
                <th>상태</th>
                <th>조회수</th>
                <th>작성일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>{post.type}</td>
                  {/* [A05: XSS] dangerouslySetInnerHTML 사용 */}
                  <td dangerouslySetInnerHTML={{ __html: post.title }} />
                  <td>{post.user_email || post.user_id}</td>
                  <td>{post.status}</td>
                  <td>{post.views}</td>
                  <td>{formatDate(post.created_at)}</td>
                  <td>
                    <Link to={`/board/${post.id}`} className="btn btn-sm">
                      보기
                    </Link>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => deletePost(post.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 민원 처리 */}
      {activeTab === 'tickets' && !loading && (
        <div className="admin-section">
          <h2>민원 처리</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>제목</th>
                <th>작성자</th>
                <th>우선순위</th>
                <th>상태</th>
                <th>작성일</th>
                <th>응답</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>{ticket.user_email || ticket.user_id}</td>
                  <td>
                    <span className={`priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>{formatDate(ticket.created_at)}</td>
                  <td>
                    {ticket.status === 'open' || ticket.status === 'in_progress' ? (
                      <div className="response-form">
                        <textarea
                          placeholder="응답 입력..."
                          value={ticketResponse[ticket.id] || ''}
                          onChange={(e) => setTicketResponse({
                            ...ticketResponse,
                            [ticket.id]: e.target.value
                          })}
                          rows="2"
                        />
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => respondToTicket(ticket.id)}
                        >
                          응답
                        </button>
                      </div>
                    ) : (
                      <span className="responded">응답 완료</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 로그 조회 */}
      {activeTab === 'audit' && !loading && (
        <div className="admin-section">
          <h2>감사 로그</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>액터</th>
                <th>액션</th>
                <th>대상</th>
                <th>IP</th>
                <th>상세</th>
                <th>시간</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.actor_id}</td>
                  <td>{log.action}</td>
                  <td>{log.target_type}:{log.target_id}</td>
                  <td>{log.ip}</td>
                  <td>
                    <code style={{ fontSize: '11px' }}>
                      {JSON.stringify(log.detail_json).substring(0, 50)}...
                    </code>
                  </td>
                  <td>{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 시스템 정보 */}
      {activeTab === 'system' && !loading && systemInfo && (
        <div className="admin-section">
          <h2>시스템 정보</h2>
          
          {/* [A02] 민감한 시스템 정보 노출 */}
          <div className="system-info">
            <h3>서버 정보</h3>
            <pre className="code-block">
              {JSON.stringify(systemInfo, null, 2)}
            </pre>
          </div>

          {systemInfo.env && (
            <div className="system-info">
              <h3>환경 변수 (위험!)</h3>
              <pre className="code-block" style={{ color: '#ef5350' }}>
                {JSON.stringify(systemInfo.env, null, 2)}
              </pre>
            </div>
          )}

          {/* [A02] 데이터베이스 연결 정보 */}
          <div className="system-info">
            <h3>데이터베이스 설정</h3>
            <div className="config-warning">
              ⚠️ 이 정보는 프로덕션에서 노출되면 안 됩니다!
            </div>
            <pre className="code-block">
{`{
  "host": "database",
  "user": "root",
  "password": "rootpassword123!",
  "database": "kis_trading"
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
