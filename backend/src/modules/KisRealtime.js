/**
 * KIS Realtime WebSocket Module
 * 실시간 시세/호가 웹소켓
 * [A07: Authentication Failures] 웹소켓 인증 미흡
 */

const WebSocket = require('ws');
const axios = require('axios');
const db = require('../config/database');

const KIS_WS_DOMAINS = {
  real: 'ws://ops.koreainvestment.com:21000',
  paper: 'ws://ops.koreainvestment.com:31000'
};

// 클라이언트 연결 관리
const clients = new Map();

/**
 * WebSocket 서버 설정
 */
function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    // [A07: Authentication Failures] 인증 없이 연결 허용
    const clientId = Date.now().toString(36) + Math.random().toString(36);
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    clients.set(clientId, {
      ws,
      subscriptions: [],
      kisWs: null
    });
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // [A09: Logging Failures] 모든 메시지 로깅
        console.log(`WS Message from ${clientId}:`, data);
        
        await handleMessage(clientId, data);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          stack: error.stack  // [A10] 스택 트레이스 노출
        }));
      }
    });
    
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      
      const client = clients.get(clientId);
      if (client && client.kisWs) {
        client.kisWs.close();
      }
      
      clients.delete(clientId);
    });
    
    // 연결 환영 메시지
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to KIS Trading WebSocket'
    }));
  });
}

/**
 * 메시지 핸들러
 */
async function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (data.type) {
    case 'subscribe':
      await subscribeStock(clientId, data);
      break;
      
    case 'unsubscribe':
      await unsubscribeStock(clientId, data);
      break;
      
    case 'get-approval-key':
      await getApprovalKey(clientId, data);
      break;
      
    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`
      }));
  }
}

/**
 * Approval Key 발급
 * [A01: Broken Access Control] 인증 없이 키 발급
 */
async function getApprovalKey(clientId, data) {
  const client = clients.get(clientId);
  const { env = 'paper' } = data;
  
  try {
    // [A01] 인증 없이 approval_key 발급
    const domain = env === 'real' 
      ? 'https://openapi.koreainvestment.com:9443'
      : 'https://openapivts.koreainvestment.com:29443';
    
    const response = await axios.post(`${domain}/oauth2/Approval`, {
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      secretkey: process.env.KIS_APP_SECRET
    });
    
    const approvalKey = response.data.approval_key;
    
    // [A09] 키 로깅
    console.log(`Approval key issued for ${clientId}: ${approvalKey}`);
    
    client.ws.send(JSON.stringify({
      type: 'approval-key',
      approvalKey,  // [A07] 키 노출
      expiresIn: 86400
    }));
    
    // KIS WebSocket 연결
    connectToKIS(clientId, env, approvalKey);
    
  } catch (error) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

/**
 * KIS WebSocket 연결
 */
function connectToKIS(clientId, env, approvalKey) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const wsUrl = KIS_WS_DOMAINS[env];
  const kisWs = new WebSocket(wsUrl);
  
  kisWs.on('open', () => {
    console.log(`KIS WebSocket connected for client ${clientId}`);
    client.ws.send(JSON.stringify({
      type: 'kis-connected',
      message: 'Connected to KIS WebSocket'
    }));
  });
  
  kisWs.on('message', (data) => {
    // KIS에서 온 데이터를 클라이언트에 전달
    try {
      const parsed = parseKISMessage(data.toString());
      client.ws.send(JSON.stringify({
        type: 'market-data',
        data: parsed
      }));
    } catch (error) {
      // 파싱 실패시 원본 전달
      client.ws.send(JSON.stringify({
        type: 'raw-data',
        data: data.toString()
      }));
    }
  });
  
  kisWs.on('close', () => {
    console.log(`KIS WebSocket closed for client ${clientId}`);
    client.ws.send(JSON.stringify({
      type: 'kis-disconnected',
      message: 'KIS WebSocket disconnected'
    }));
  });
  
  kisWs.on('error', (error) => {
    console.error(`KIS WebSocket error for ${clientId}:`, error);
    client.ws.send(JSON.stringify({
      type: 'kis-error',
      message: error.message
    }));
  });
  
  client.kisWs = kisWs;
  client.approvalKey = approvalKey;
}

/**
 * 종목 구독
 */
async function subscribeStock(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.kisWs) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'KIS WebSocket not connected. Get approval key first.'
    }));
    return;
  }
  
  const { symbol, trType = 'H0STCNT0' } = data;  // H0STCNT0: 실시간 체결가
  
  // KIS 구독 메시지 전송
  const subscribeMessage = JSON.stringify({
    header: {
      approval_key: client.approvalKey,
      custtype: 'P',
      tr_type: '1',  // 등록
      content_type: 'utf-8'
    },
    body: {
      input: {
        tr_id: trType,
        tr_key: symbol
      }
    }
  });
  
  client.kisWs.send(subscribeMessage);
  client.subscriptions.push({ symbol, trType });
  
  client.ws.send(JSON.stringify({
    type: 'subscribed',
    symbol,
    trType
  }));
}

/**
 * 종목 구독 해제
 */
async function unsubscribeStock(clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.kisWs) return;
  
  const { symbol, trType = 'H0STCNT0' } = data;
  
  const unsubscribeMessage = JSON.stringify({
    header: {
      approval_key: client.approvalKey,
      custtype: 'P',
      tr_type: '2',  // 해제
      content_type: 'utf-8'
    },
    body: {
      input: {
        tr_id: trType,
        tr_key: symbol
      }
    }
  });
  
  client.kisWs.send(unsubscribeMessage);
  client.subscriptions = client.subscriptions.filter(
    s => !(s.symbol === symbol && s.trType === trType)
  );
  
  client.ws.send(JSON.stringify({
    type: 'unsubscribed',
    symbol,
    trType
  }));
}

/**
 * KIS 메시지 파싱
 */
function parseKISMessage(message) {
  // KIS 실시간 데이터 포맷 파싱
  const parts = message.split('|');
  
  if (parts.length >= 4) {
    const [header, encryptFlag, trId, data] = parts;
    const fields = data.split('^');
    
    return {
      trId,
      symbol: fields[0],
      price: fields[1],
      change: fields[2],
      volume: fields[3],
      time: fields[4],
      raw: fields
    };
  }
  
  return { raw: message };
}

/**
 * 모든 클라이언트에 브로드캐스트
 */
function broadcast(message) {
  clients.forEach((client, id) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcast,
  clients
};
