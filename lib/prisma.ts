import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma 7 quitó `url`/`directUrl` de schema.prisma — el cliente en runtime
// exige ahora un driver adapter explícito (ya no admite pasar solo una
// connection string). `PrismaNeon` usa el driver serverless de Neon
// (WebSocket) en vez de TCP directo, pensado para entornos serverless como
// las funciones de Vercel. Usa `DATABASE_URL` (con pooler) — la URL directa
// (`DIRECT_URL`) solo la usan los comandos de CLI, ver `prisma.config.ts`.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
