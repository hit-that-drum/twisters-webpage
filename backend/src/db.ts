import mysql, { type PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 설정 파일 경로 확인 (.env가 루트에 있다면 경로를 조정하세요)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const access: PoolOptions = {
  host: process.env.DB_HOST || 'db', // localhost 대신 127.0.0.1 권장
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'twisters_db', // 아까 확인한 DB 이름
  waitForConnections: true,
  connectionLimit: 10,
};

// Pool 생성
const pool = mysql.createPool(access);

// 외부에서 사용할 수 있게 export
export default pool;
