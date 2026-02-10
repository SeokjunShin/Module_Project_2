/**
 * Post Detail Page
 * [A05: Injection] XSS
 * [A01: Broken Access Control]
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function PostDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [id]);

  const loadPost = async () => {
    try {
      const response = await axios.get(`${API_URL}/board/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('Load post error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/board/posts/${id}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Load comments error:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    
    try {
      // [A01: IDOR] 게시글 소유자 검증 없이 삭제
      await axios.delete(`${API_URL}/board/posts/${id}`);
      alert('삭제되었습니다.');
      navigate('/board');
    } catch (error) {
      alert(error.response?.data?.error || '삭제 실패');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      // [A05: XSS] 댓글 내용 필터링 없음
      await axios.post(`${API_URL}/board/posts/${id}/comments`, {
        userId: user?.id,
        content: newComment
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      alert(error.response?.data?.error || '댓글 등록 실패');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!post) {
    return <div className="alert alert-danger">게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <Link to="/board" style={{ marginBottom: '16px', display: 'inline-block' }}>← 목록으로</Link>
      
      <div className="card">
        {/* 게시글 헤더 */}
        <div style={{ borderBottom: '1px solid #30363d', paddingBottom: '16px', marginBottom: '16px' }}>
          {/* [A05: Stored XSS] 제목을 그대로 렌더링 */}
          <h2 dangerouslySetInnerHTML={{ __html: post.title }} />
          <div style={{ color: '#8b949e', marginTop: '8px' }}>
            {post.author_name || '익명'} | {new Date(post.created_at).toLocaleString()} | 조회 {post.views}
          </div>
        </div>
        
        {/* 게시글 본문 */}
        {/* [A05: Stored XSS] 본문을 그대로 렌더링 - 스크립트 실행 가능 */}
        <div 
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{ minHeight: '200px', lineHeight: '1.8' }}
        />
        
        {/* 첨부파일 */}
        {post.files?.length > 0 && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#21262d', borderRadius: '6px' }}>
            <h4>첨부파일</h4>
            {post.files.map((file) => (
              <div key={file.id}>
                <a href={`${API_URL}/files/${file.id}`} download>
                  📎 {file.original_name} ({(file.size / 1024).toFixed(1)}KB)
                </a>
              </div>
            ))}
          </div>
        )}
        
        {/* 수정/삭제 버튼 */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
          {/* [A01] 권한 검증 없이 버튼 표시 - 누구나 수정/삭제 시도 가능 */}
          <Link to={`/board/create?edit=${id}`} className="btn">수정</Link>
          <button onClick={handleDelete} className="btn btn-danger">삭제</button>
        </div>
      </div>
      
      {/* 댓글 */}
      <div className="card">
        <h3 className="card-header">댓글 ({comments.length})</h3>
        
        {/* 댓글 목록 */}
        {comments.length > 0 ? (
          <div>
            {comments.map((comment) => (
              <div key={comment.id} style={{ padding: '12px 0', borderBottom: '1px solid #30363d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>{comment.author_name || '익명'}</span>
                  <span style={{ color: '#8b949e' }}>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                {/* [A05: Stored XSS] 댓글 내용 필터링 없음 */}
                <div dangerouslySetInnerHTML={{ __html: comment.content }} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#8b949e' }}>댓글이 없습니다.</p>
        )}
        
        {/* 댓글 작성 */}
        {user ? (
          <form onSubmit={handleComment} style={{ marginTop: '20px' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요"
              rows="3"
              style={{ width: '100%', marginBottom: '12px' }}
            />
            <button type="submit" className="btn btn-primary">댓글 등록</button>
          </form>
        ) : (
          <p style={{ color: '#8b949e', marginTop: '16px' }}>로그인 후 댓글을 작성할 수 있습니다.</p>
        )}
      </div>
    </div>
  );
}

export default PostDetail;
