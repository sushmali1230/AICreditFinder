import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..');

const envPath = path.join(backendRoot, '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const dbUrl = process.env.DATABASE_URL || (envFile.match(/DATABASE_URL=["']?([^"'\n]+)/) || [])[1] || '';

// Detect provider: if postgresql / postgres is specified in DATABASE_URL, use postgresql, otherwise sqlite
const provider = dbUrl.startsWith('postgres') ? 'postgresql' : 'sqlite';

const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf-8');
  schema = schema.replace(/provider\s*=\s*"(?:sqlite|postgresql)"/, `provider = "${provider}"`);
  fs.writeFileSync(schemaPath, schema);
  console.log(`Prisma configured for ${provider} database.`);
}
