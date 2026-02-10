/**
 * Board Page
 * [A05: Injection] XSS
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Board() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [type, setType] = useState(searchParams.get('type') || 'notice');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, [type, page]);

  const loadPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/board/posts`, {
        params: { type, page, limit: 20 }
      });
      setPosts(response.data.posts || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Load posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      // [A05: SQL Injection] 검색어가 백엔드에서 필터링 없이 사용됨
      const response = await axios.get(`${API_URL}/board/search`, {
        params: { q: searchQuery, type }
      });
      setPosts(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>📢 게시판</h1>
        <Link to="/board/create" className="btn btn-primary">글쓰기</Link>
      </div>
      
      {/* 게시판 타입 탭 */}
      <div className="tabs">
        {[
          { value: 'notice', label: '공지사항' },
          { value: 'free', label: '자유게시판' },
          { value: 'qna', label: 'Q&A' }
        ].map((t) => (
          <div
            key={t.value}
            className={`tab ${type === t.value ? 'active' : ''}`}
            onClick={() => { setType(t.value); setPage(1); }}
          >
            {t.label}
          </div>
        ))}
      </div>
      
      {/* 검색 */}
      <div className="card">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn">검색</button>
        </form>
      </div>
      
      {/* 게시글 목록 */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : posts.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>번호</th>
                <th>제목</th>
                <th style={{ width: '120px' }}>작성자</th>
                <th style={{ width: '100px' }}>작성일</th>
                <th style={{ width: '60px' }}>조회</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.id}</td>
                  <td>
                    <Link to={`/board/${post.id}`}>
                      {/* [A05: Stored XSS] 제목을 그대로 렌더링 */}
                      <span dangerouslySetInnerHTML={{ __html: post.title }} />
                    </Link>
                  </td>
                  <td>{post.author_name || '익명'}</td>
                  <td>{new Date(post.created_at).toLocaleDateString()}</td>
                  <td>{post.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#8b949e' }}>게시글이 없습니다.</p>
        )}
        
        {/* 페이지네이션 */}
        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`btn ${page === i + 1 ? 'btn-primary' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Board;
