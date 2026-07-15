import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 movió la URL de conexión fuera de `schema.prisma` (ya no acepta
// `url`/`directUrl` en el bloque `datasource`) — este archivo es lo que leen
// los comandos de CLI (`migrate`, `studio`, `db seed`...). El cliente en
// tiempo de ejecución (`lib/prisma.ts`) sigue leyendo `DATABASE_URL`
// directamente, sin pasar por aquí.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // DATABASE_URL (con pooler), no DIRECT_URL: probado a mano — DIRECT_URL
  // da timeout al intentar el advisory lock que usa `migrate deploy`
  // (`pg_advisory_lock`, ver https://pris.ly/d/migrate-advisory-locking) en
  // este entorno, mientras que la URL con pooler funciona sin problema.
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
