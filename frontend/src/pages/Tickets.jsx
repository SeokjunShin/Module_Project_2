/**
 * Tickets (민원) Page
 * [A01: Broken Access Control]
 * [A05: Injection]
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Tickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      // [A01: IDOR] 다른 사용자 민원 조회 가능
      const response = await axios.get(`${API_URL}/board/tickets?userId=${user.id}`);
      setTickets(response.data || []);
    } catch (error) {
      console.error('Load tickets error:', error);
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

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // [A05: XSS] 입력값 필터링 없음
      const response = await axios.post(`${API_URL}/board/tickets`, {
        userId: user.id,
        ...formData
      });
      
      const ticketId = response.data.ticketId;
      
      // 파일 업로드
      if (files.length > 0) {
        const formDataFiles = new FormData();
        files.forEach(file => formDataFiles.append('files', file));
        formDataFiles.append('targetType', 'ticket');
        formDataFiles.append('targetId', ticketId);
        formDataFiles.append('userId', user.id);
        
        // [A06: Insecure Design] 파일 타입 검증 없음
        await axios.post(`${API_URL}/files/upload-multiple`, formDataFiles);
      }
      
      alert('민원이 접수되었습니다.');
      setShowCreate(false);
      setFormData({ title: '', content: '', priority: 'normal' });
      setFiles([]);
      loadTickets();
      
    } catch (error) {
      alert(error.response?.data?.error || '접수 실패');
    }
  };

  const loadTicketDetail = async (id) => {
    try {
      // [A01: IDOR] 다른 사용자 민원 상세 조회 가능
      const response = await axios.get(`${API_URL}/board/tickets/${id}`);
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Load ticket error:', error);
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>📝 민원</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
          {showCreate ? '취소' : '민원 접수'}
        </button>
      </div>
      
      {/* 민원 작성 폼 */}
      {showCreate && (
        <div className="card">
          <h3 className="card-header">민원 접수</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="제목을 입력하세요"
                required
              />
            </div>
            
            <div className="form-group">
              <label>우선순위</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">낮음</option>
                <option value="normal">보통</option>
                <option value="high">높음</option>
                <option value="urgent">긴급</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>내용</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="민원 내용을 상세히 입력하세요"
                rows="8"
                required
              />
            </div>
            
            <div className="form-group">
              <label>첨부파일</label>
              <input type="file" multiple onChange={handleFileChange} />
            </div>
            
            <button type="submit" className="btn btn-primary">접수하기</button>
          </form>
        </div>
      )}
      
      {/* 민원 목록 */}
      <div className="card">
        <h3 className="card-header">내 민원 목록</h3>
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : tickets.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>우선순위</th>
                <th>상태</th>
                <th>접수일</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} onClick={() => loadTicketDetail(ticket.id)} style={{ cursor: 'pointer' }}>
                  <td>{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={`badge badge-${
                      ticket.priority === 'urgent' ? 'danger' :
                      ticket.priority === 'high' ? 'warning' : 'info'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      ticket.status === 'closed' ? 'success' :
                      ticket.status === 'in_progress' ? 'warning' : 'info'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#8b949e' }}>접수된 민원이 없습니다.</p>
        )}
      </div>
      
      {/* 민원 상세 모달 */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              민원 상세 #{selectedTicket.id}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>제목:</strong> {selectedTicket.title}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>내용:</strong>
              {/* [A05: XSS] 민원 내용 필터링 없이 렌더링 */}
              <div dangerouslySetInnerHTML={{ __html: selectedTicket.content }} style={{ marginTop: '8px' }} />
            </div>
            
            {selectedTicket.response && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#21262d', borderRadius: '6px' }}>
                <strong>답변:</strong>
                <div dangerouslySetInnerHTML={{ __html: selectedTicket.response }} style={{ marginTop: '8px' }} />
              </div>
            )}
            
            {selectedTicket.files?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong>첨부파일:</strong>
                {selectedTicket.files.map((file) => (
                  <div key={file.id}>
                    <a href={`${API_URL}/files/${file.id}`}>📎 {file.original_name}</a>
                  </div>
                ))}
              </div>
            )}
            
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedTicket(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tickets;
