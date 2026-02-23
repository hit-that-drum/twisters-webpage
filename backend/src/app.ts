import './config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import passport from './config/passport.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use('/authentication', authRoutes);
app.use('/notice', noticeRoutes);
app.use('/settlement', settlementRoutes);
app.use('/member', memberRoutes);

app.use('/api/authentication', authRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/member', memberRoutes);

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

export default app;
