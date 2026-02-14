import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

let isLoaded = false;

export const loadEnvironment = () => {
  if (isLoaded) {
    return;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const rootDir = path.join(__dirname, '../../../');
  const mode = (process.env.NODE_ENV || 'development').trim();

  const envFiles = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    '.env.local',
    '.env',
  ];

  for (const envFile of envFiles) {
    const fullPath = path.join(rootDir, envFile);
    if (!existsSync(fullPath)) {
      continue;
    }

    dotenv.config({ path: fullPath, override: false });
  }

  isLoaded = true;
};

loadEnvironment();
