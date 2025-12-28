import express, { type Request, type Response } from 'express';
import mysql, { type PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Database Configuration
const access: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'devuser',
  password: process.env.DB_PASSWORD || 'devpass',
  database: process.env.DB_NAME || 'test_db',
  waitForConnections: true,
  connectionLimit: 10,
};

const pool = mysql.createPool(access);

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    // pool.query를 통해 DB의 데이터를 조회합니다.
    const [rows] = await pool.query('SELECT * FROM users');
    
    // 조회된 데이터를 JSON 형식으로 프론트엔드에 응답합니다.
    res.json(rows);
  } catch (error) {
    console.error('DB 조회 에러:', error);
    res.status(500).json({ error: '데이터를 가져오는데 실패했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});