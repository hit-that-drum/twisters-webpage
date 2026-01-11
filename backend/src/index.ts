import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// API 경로 연결 (/authentication로 시작하는 요청은 authRoutes가 처리함)
app.use('/authentication', authRoutes);

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});
