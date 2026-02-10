/**
 * Error Handler Middleware
 * [A10: Mishandling of Exceptional Conditions]
 * 상세 에러 정보 노출
 */

const errorHandler = (err, req, res, next) => {
  // [A09: Logging Failures] 에러 상세 로깅
  console.error('==================== ERROR ====================');
  console.error('Timestamp:', new Date().toISOString());
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  console.error('Headers:', JSON.stringify(req.headers, null, 2));
  console.error('Body:', JSON.stringify(req.body, null, 2));
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('===============================================');
  
  // [A10: Mishandling Exceptional Conditions] 
  // 상세 에러 정보를 클라이언트에 노출
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      stack: err.stack,  // 취약: 스택 트레이스 노출
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      sql: err.sql,  // 취약: SQL 쿼리 노출
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    },
    request: {
      url: req.url,
      method: req.method,
      headers: req.headers,  // 취약: 헤더 노출
      body: req.body,  // 취약: 요청 본문 노출
      query: req.query,
      params: req.params,
      ip: req.ip,
      user: req.user
    },
    server: {
      // [A02: Security Misconfiguration] 서버 정보 노출
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = { errorHandler };
