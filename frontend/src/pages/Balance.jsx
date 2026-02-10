/**
 * Balance Page
 * [A01: Broken Access Control]
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Balance({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadBalance();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      // [A01: IDOR] 다른 사용자 계좌 조회 가능
      const response = await axios.get(`${API_URL}/kis/accounts?user_id=${user.id}`);
      setAccounts(response.data || []);
      if (response.data?.length > 0) {
        setSelectedAccount(response.data[0].id);
      }
    } catch (error) {
      console.error('Load accounts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      // [A01: IDOR] accountId 조작으로 다른 계좌 잔고 조회 가능
      const balanceRes = await axios.get(`${API_URL}/trade/balance?accountId=${selectedAccount}`);
      setBalance(balanceRes.data?.balance?.output2?.[0] || null);
      
      const positionsRes = await axios.get(`${API_URL}/trade/positions?accountId=${selectedAccount}`);
      setPositions(positionsRes.data?.output1 || []);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  };

  if (!user) {
    return <div className="alert alert-warning">로그인이 필요합니다.</div>;
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>💰 잔고 / 자산현황</h1>
      
      {/* 계좌 선택 */}
      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>계좌 선택</label>
          <select 
            value={selectedAccount || ''} 
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.alias || acc.cano} ({acc.env === 'paper' ? '모의' : '실전'})
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {balance && (
        <>
          {/* 자산 요약 */}
          <div className="grid grid-4">
            <div className="card">
              <div style={{ color: '#8b949e', marginBottom: '8px' }}>총 평가금액</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {Number(balance.tot_evlu_amt || 0).toLocaleString()}원
              </div>
            </div>
            <div className="card">
              <div style={{ color: '#8b949e', marginBottom: '8px' }}>예수금</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {Number(balance.dnca_tot_amt || 0).toLocaleString()}원
              </div>
            </div>
            <div className="card">
              <div style={{ color: '#8b949e', marginBottom: '8px' }}>매입금액</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {Number(balance.pchs_amt_smtl_amt || 0).toLocaleString()}원
              </div>
            </div>
            <div className="card">
              <div style={{ color: '#8b949e', marginBottom: '8px' }}>평가손익</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }} className={Number(balance.evlu_pfls_smtl_amt) >= 0 ? 'price-up' : 'price-down'}>
                {Number(balance.evlu_pfls_smtl_amt || 0).toLocaleString()}원
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 보유 종목 */}
      <div className="card">
        <h3 className="card-header">보유 종목</h3>
        {positions.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>종목명</th>
                <th>종목코드</th>
                <th>보유수량</th>
                <th>매입가</th>
                <th>현재가</th>
                <th>평가금액</th>
                <th>평가손익</th>
                <th>수익률</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, idx) => {
                const profitRate = Number(pos.evlu_pfls_rt || 0);
                return (
                  <tr key={idx}>
                    <td>{pos.prdt_name}</td>
                    <td>{pos.pdno}</td>
                    <td>{Number(pos.hldg_qty).toLocaleString()}</td>
                    <td>{Number(pos.pchs_avg_pric).toLocaleString()}원</td>
                    <td>{Number(pos.prpr).toLocaleString()}원</td>
                    <td>{Number(pos.evlu_amt).toLocaleString()}원</td>
                    <td className={Number(pos.evlu_pfls_amt) >= 0 ? 'price-up' : 'price-down'}>
                      {Number(pos.evlu_pfls_amt).toLocaleString()}원
                    </td>
                    <td className={profitRate >= 0 ? 'price-up' : 'price-down'}>
                      {profitRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#8b949e' }}>보유 종목이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default Balance;
