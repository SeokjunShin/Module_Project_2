/**
 * Admin Page
 * [A01: Broken Access Control] 클라이언트 측 권한 검증
 * [A02: Security Misconfiguration]
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Admin({ user }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // [A01: Broken Access Control] 클라이언트에서 관리자 권한 확인 우회 가능
  const adminHeaders = {
    'X-Is-Admin': 'true'  // 헤더만으로 관리자 인증 - 조작 가능
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const usersRes = await axios.get(`${API_URL}/admin/users`, { headers: adminHeaders });
          setUsers(usersRes.data || []);
          break;
        case 'posts':
          const postsRes = await axios.get(`${API_URL}/admin/posts`, { headers: adminHeaders });
          setPosts(postsRes.data || []);
          break;
        case 'tickets':
          const ticketsRes = await axios.get(`${API_URL}/admin/tickets`, { headers: adminHeaders });
          setTickets(ticketsRes.data || []);
          break;
        case 'logs':
          const logsRes = await axios.get(`${API_URL}/admin/audit-logs`, { headers: adminHeaders });
          setAuditLogs(logsRes.data || []);
          break;
        case 'system':
          // [A02: Security Misconfiguration] 시스템 정보 노출
          const sysRes = await axios.get(`${API_URL}/admin/system-info`, { headers: adminHeaders });
          setSystemInfo(sysRes.data);
          break;
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await axios.put(`${API_URL}/admin/users/${userId}/status`, 
        { status, reason: 'Admin action' },
        { headers: adminHeaders }
      );
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || '상태 변경 실패');
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await axios.put(`${API_URL}/admin/users/${userId}/role`,
        { role },
        { headers: adminHeaders }
      );
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || '권한 변경 실패');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, { headers: adminHeaders });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || '삭제 실패');
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    
    try {
      await axios.delete(`${API_URL}/admin/posts/${postId}`, { headers: adminHeaders });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || '삭제 실패');
    }
  };

  // [A01] 클라이언트 측 권한 체크 - 우회 가능
  // 실제로는 이 체크를 우회하고 직접 API 호출 가능
  if (!user?.isAdmin && !user?.role?.includes('admin')) {
    return (
      <div className="alert alert-danger">
        관리자 권한이 필요합니다.
        <br /><br />
        {/* [A01] 힌트: 헤더나 파라미터로 관리자 권한 우회 가능 */}
        <small style={{ color: '#8b949e' }}>
          Hint: Try adding X-Is-Admin header or admin=true parameter
        </small>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>🔧 관리자</h1>
      
      {/* 탭 */}
      <div className="tabs">
        {[
          { value: 'users', label: '사용자 관리' },
          { value: 'posts', label: '게시물 관리' },
          { value: 'tickets', label: '민원 관리' },
          { value: 'logs', label: '감사 로그' },
          { value: 'system', label: '시스템 정보' }
        ].map((tab) => (
          <div
            key={tab.value}
            className={`tab ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          {/* 사용자 관리 */}
          {activeTab === 'users' && (
            <>
              <h3 className="card-header">사용자 목록</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>이메일</th>
                    <th>이름</th>
                    <th>권한</th>
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
                          value={u.role || 'user'} 
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge badge-${u.status === 'active' ? 'success' : 'danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        {u.status === 'active' ? (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => updateUserStatus(u.id, 'suspended')}
                          >
                            정지
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => updateUserStatus(u.id, 'active')}
                          >
                            활성화
                          </button>
                        )}
                        {' '}
                        <button 
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => deleteUser(u.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {/* 게시물 관리 */}
          {activeTab === 'posts' && (
            <>
              <h3 className="card-header">게시물 목록</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>유형</th>
                    <th>작성일</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.id}</td>
                      <td dangerouslySetInnerHTML={{ __html: post.title }} />
                      <td>{post.author_email}</td>
                      <td>{post.type}</td>
                      <td>{new Date(post.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => deletePost(post.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {/* 민원 관리 */}
          {activeTab === 'tickets' && (
            <>
              <h3 className="card-header">민원 목록</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>제목</th>
                    <th>신청자</th>
                    <th>우선순위</th>
                    <th>상태</th>
                    <th>접수일</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.title}</td>
                      <td>{ticket.user_email}</td>
                      <td>
                        <span className={`badge badge-${ticket.priority === 'urgent' ? 'danger' : 'info'}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${ticket.status === 'closed' ? 'success' : 'warning'}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {/* 감사 로그 */}
          {activeTab === 'logs' && (
            <>
              <h3 className="card-header">감사 로그</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>수행자</th>
                    <th>액션</th>
                    <th>대상</th>
                    <th>IP</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.actor_email}</td>
                      <td>{log.action}</td>
                      <td>{log.target_type}:{log.target_id}</td>
                      <td>{log.ip}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          
          {/* 시스템 정보 */}
          {activeTab === 'system' && systemInfo && (
            <>
              <h3 className="card-header">시스템 정보</h3>
              {/* [A02: Security Misconfiguration] 환경변수 및 시스템 정보 노출 */}
              <div style={{ background: '#0d1117', padding: '16px', borderRadius: '6px', overflow: 'auto' }}>
                <pre style={{ margin: 0, color: '#c9d1d9' }}>
                  {JSON.stringify(systemInfo, null, 2)}
                </pre>
              </div>
              <p style={{ color: '#f85149', marginTop: '12px' }}>
                ⚠️ 이 정보는 민감한 시스템 정보를 포함하고 있습니다!
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
