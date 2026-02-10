/**
 * Create/Edit Post Page
 * [A05: Injection] XSS
 * [A01: Broken Access Control]
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function CreatePost({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [formData, setFormData] = useState({
    type: 'free',
    title: '',
    content: ''
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editId) {
      loadPost();
    }
  }, [editId]);

  const loadPost = async () => {
    try {
      // [A01: IDOR] 다른 사용자 게시글도 수정 가능
      const response = await axios.get(`${API_URL}/board/posts/${editId}`);
      setFormData({
        type: response.data.type,
        title: response.data.title,
        content: response.data.content
      });
    } catch (error) {
      console.error('Load post error:', error);
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
    setError('');
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      let postId;
      
      if (editId) {
        // [A01: IDOR] 게시글 소유자 검증 없이 수정
        // [A05: XSS] 입력값 필터링 없음
        await axios.put(`${API_URL}/board/posts/${editId}`, {
          title: formData.title,
          content: formData.content
        });
        postId = editId;
      } else {
        // [A05: XSS] 입력값 필터링 없음
        const response = await axios.post(`${API_URL}/board/posts`, {
          userId: user?.id,
          type: formData.type,
          title: formData.title,
          content: formData.content
        });
        postId = response.data.postId;
      }
      
      // 파일 업로드
      if (files.length > 0) {
        const formDataFiles = new FormData();
        files.forEach(file => formDataFiles.append('files', file));
        formDataFiles.append('targetType', 'post');
        formDataFiles.append('targetId', postId);
        formDataFiles.append('userId', user?.id);
        
        // [A06: Insecure Design] 파일 타입 검증 없음
        await axios.post(`${API_URL}/files/upload-multiple`, formDataFiles);
      }
      
      alert(editId ? '수정되었습니다.' : '등록되었습니다.');
      navigate(`/board/${postId}`);
      
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>{editId ? '✏️ 글 수정' : '✍️ 글 작성'}</h1>
      
      <div className="card">
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!editId && (
            <div className="form-group">
              <label>게시판</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="notice">공지사항</option>
                <option value="free">자유게시판</option>
                <option value="qna">Q&A</option>
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label>제목</label>
            {/* [A05: XSS] 입력값 검증/이스케이프 없음 */}
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label>내용</label>
            {/* [A05: XSS] HTML 입력 가능 - 스크립트 실행 가능 */}
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요 (HTML 태그 사용 가능)"
              rows="15"
            />
            <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>
              HTML 태그를 사용하여 서식을 지정할 수 있습니다.
            </p>
          </div>
          
          <div className="form-group">
            <label>첨부파일</label>
            {/* [A06: Insecure Design] 파일 타입 제한 없음 */}
            <input
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '4px' }}>
              최대 10개 파일, 파일당 50MB까지 업로드 가능
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '저장 중...' : (editId ? '수정' : '등록')}
            </button>
            <button type="button" className="btn" onClick={() => navigate(-1)}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePost;
