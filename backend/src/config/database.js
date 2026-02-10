/**
 * Database Configuration
 * [A04: Cryptographic Failures] 하드코딩된 자격증명
 */

const mysql = require('mysql2/promise');

// [A02: Security Misconfiguration] 하드코딩된 DB 자격증명
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'vulnerable_password_123',
  database: process.env.DB_NAME || 'kis_trading',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // [A02] SSL 미사용
  ssl: false
});

// 연결 테스트 (재시도 로직 포함)
const connectWithRetry = async (retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ Database connected successfully');
      conn.release();
      return true;
    } catch (err) {
      console.log(`⏳ Database connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        console.log(`   Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ Database connection failed after all retries');
  return false;
};

connectWithRetry();

module.exports = pool;
