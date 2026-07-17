import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 movió la URL de conexión fuera de `schema.prisma` (ya no acepta
// `url`/`directUrl` en el bloque `datasource`) — este archivo es lo que leen
// los comandos de CLI (`migrate`, `studio`, `db seed`...). El cliente en
// tiempo de ejecución (`lib/prisma.ts`) sigue leyendo `DATABASE_URL`
// directamente, sin pasar por aquí.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // DIRECT_URL (sin pooler), no DATABASE_URL: `migrate deploy` usa
  // `pg_advisory_lock`, que es a nivel de sesión — con la URL pooled
  // (PgBouncer en modo transacción) el lock se puede quedar "colgado" en un
  // backend que luego se recicla para otra query cualquiera de la app, sin
  // liberarlo nunca, bloqueando todos los despliegues siguientes con un
  // timeout P1002 (nos pasó: tuvimos que matar a mano el backend colgado).
  // Ver https://pris.ly/d/migrate-advisory-locking.
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
