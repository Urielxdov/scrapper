import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = "postgresql://postgres:123456@localhost:5433/scrapping?schema=public";

console.log("🚀 Iniciando bypass de Prisma CLI...");

try {
  // Inyectamos de manera nativa en el proceso de Node la variable que Rust necesita
  process.env.DATABASE_URL = dbUrl;

  console.log("📦 Generando Prisma Client...");
  execSync('pnpm prisma generate', { stdio: 'inherit', env: process.env });

  console.log("✨ Intentando empujar el esquema directamente...");
  // Usamos el binario interno directo de prisma para saltarnos el validador de entorno
  execSync(`pnpm prisma db push --accept-data-loss`, { stdio: 'inherit', env: process.env });

  console.log("✅ ¡Éxito! Base de datos sincronizada correctamente.");
} catch (error) {
  console.error("❌ Falló el bypass:", error);
}