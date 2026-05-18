import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env del microservicio (npm run dev / start local)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// .env de la raíz del monorepo (Docker Compose)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
