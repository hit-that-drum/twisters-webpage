import express, { type Request, type Response } from 'express';
import mysql, { type PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const access: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'devuser',
  password: process.env.DB_PASSWORD || 'devpass',
  database: process.env.DB_NAME || 'test_db',
  waitForConnections: true,
  connectionLimit: 10,
};

const pool = mysql.createPool(access);

// 암호화 강도
const SALT_ROUNDS = 10;

// 회원가입
app.post('/api/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
    );

    res.status(201).json({ message: '회원가입 성공!', userId: (result as any).insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// 사용자 조회
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

// 로그인
app.post('/api/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. 사용자 조회
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
    }

    const user = rows[0];

    // 2. 비밀번호 검증 (수정된 부분)
    // hashedPassword가 아니라 사용자가 입력한 'password' 원본을 전달해야 합니다.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    // 3. 성공 시 ID 반환
    res.json({ message: '로그인 성공!', userId: user.id, name: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러' });
  }
});

// 비밀번호 재설정
app.post('/api/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  try {
    // 1. 새 비밀번호 해싱 (회원가입과 동일한 SALT_ROUNDS 사용)
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 2. 해당 사용자의 비밀번호 업데이트
    const [result]: any = await pool.query('UPDATE users SET password = ? WHERE email = ?', [
      hashedPassword,
      email,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});
