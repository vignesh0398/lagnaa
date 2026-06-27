import fs from 'fs';
import dotenv from 'dotenv';

const SECRET_PATHS = [
  '/etc/secrets/.env',
  '/etc/secrets/lagnaa.env',
  '/etc/secrets/mongodb.env',
];

export const loadedSecretFiles: string[] = [];

for (const secretPath of SECRET_PATHS) {
  if (fs.existsSync(secretPath)) {
    dotenv.config({ path: secretPath, override: true });
    loadedSecretFiles.push(secretPath);
  }
}

dotenv.config();