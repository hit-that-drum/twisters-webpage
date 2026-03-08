import app from './app.js';
import { query } from './db.js';
import { memberRepository } from './repositories/memberRepository.js';
import { noticeRepository } from './repositories/noticeRepository.js';
import { settlementRepository } from './repositories/settlementRepository.js';

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT FALSE');

  await Promise.all([
    memberRepository.ensureMembersSchema(),
    noticeRepository.initializeSchema(),
    settlementRepository.initializeSchema(),
  ]);

  app.listen(PORT, () => {
    console.log(`\n✅ Server is live at http://localhost:${PORT}`);
  });
};

void startServer().catch((error) => {
  console.error('Failed to initialize server dependencies:', error);
  process.exit(1);
});
