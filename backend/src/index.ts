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

// 회원가입 API 추가
app.post('/api/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password],
    );

    res.status(201).json({ message: '회원가입 성공!', userId: (result as any).insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  const { userId } = req.query;

  try {
    if (userId) {
      // 1. id가 존재하는 경우: 특정 사용자 검색
      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: '해당 ID의 사용자를 찾을 수 없습니다.' });
      }
      return res.json(rows[0]); // 단일 객체 반환
    } else {
      // 2. id가 없는 경우: 전체 사용자 검색
      const [rows] = await pool.query('SELECT * FROM users');
      return res.json(rows); // 배열 반환
    }
  } catch (error) {
    console.error('DB 조회 에러:', error);
    res.status(500).json({ error: '데이터베이스 조회 중 오류가 발생했습니다.' });
  }
});

app.post('/api/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    // 1. 이메일과 비밀번호가 일치하는 사용자 찾기
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [
      email,
      password,
    ]);

    if (rows.length === 0) {
      // 정보가 일치하지 않으면 401(Unauthorized) 에러 반환
      return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    // 2. 로그인 성공 시 사용자 정보 반환 (비밀번호는 제외하는 것이 좋음)
    const user = rows[0];
    res.json({
      message: 'Login Successful!',
      userId: user.id,
      name: user.name,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.post('/api/resetpassword', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await pool.query('UPDATE users SET password = ? WHERE email = ?', [
      password,
      email,
    ]);
    res.json({ message: '비밀번호 재설정 성공!' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});
