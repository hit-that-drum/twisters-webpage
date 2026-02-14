import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import app from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});
