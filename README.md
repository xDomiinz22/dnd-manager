# D&D Manager

App web para gestionar grupos de **Dungeons & Dragons 5e** (sistema Foundry `dnd5e`): grupos, fichas de personaje importadas del export `.md` de Foundry, y diarios (journals).

- **Producción:** https://dnd-manager-web.vercel.app
- **Repo:** privado en `github.com/xDomiinz22/dnd-manager`
- **Estado:** Fases 0–8 completas y verificadas. Desplegado y operativo.

---

## Stack

Monorepo **pnpm** desplegado como **un solo proyecto en Vercel** (frontend estático + backend serverless bajo el mismo dominio).

| Capa            | Tecnología                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| Frontend        | React 18 + Vite + TypeScript + Tailwind + TanStack Query + React Router           |
| Backend         | Express (montado como **una** función serverless en `api/index.ts`)               |
| ORM / DB        | Prisma + **PostgreSQL en Neon** (pooled `DATABASE_URL` + directo `DIRECT_URL`)    |
| Auth            | JWT (access en memoria + refresh en cookie `httpOnly`), passwords con `argon2`    |
| Validación      | `zod` (schemas compartidos en `shared/`)                                          |
| Tests           | Vitest                                                                            |
| Parsing fichas  | `js-yaml` (bloque `Actor` del `.md` de Foundry)                                   |
| Parsing journal | `jszip` + `js-yaml` (frontmatter) + `marked` + `dompurify` (todo en el navegador) |

### Estructura del repo

```
/
├─ web/                 → app React (Vite). Alias @dnd-manager/shared → ../shared/src en dev
│  └─ src/features/journal/  → parser del .zip (zipImport.ts), render markdown (render.ts), api/hooks
├─ api/index.ts         → función serverless: monta la app Express (todas las rutas /api/*)
├─ server/              → Express: routes / controllers / services / middlewares
├─ lib/                 → prisma (singleton), auth (jwt+argon2), dnd5e-derive, storage
├─ shared/              → paquete @dnd-manager/shared: schemas zod + tipos (COMPILA a dist/)
├─ prisma/              → schema.prisma, migraciones, seed.ts
├─ fixtures/            → XxAlbertoPro01xX.md (ficha real de ejemplo para tests)
├─ vercel.json          → rewrites (/api/* → función, resto → SPA) + maxDuration
└─ docker-compose.yml   → SOLO Postgres local para desarrollo (no se despliega)
```

---

## Desarrollo local

Requisitos: Node 20+, pnpm, y una base Postgres (Docker local o tu Neon).

```bash
pnpm install
cp .env.example .env        # rellena DATABASE_URL, DIRECT_URL, JWT_* (ver abajo)
pnpm run db:generate        # genera el cliente Prisma
pnpm run db:migrate         # aplica migraciones
pnpm run db:seed            # usuario+grupo demo (opcional)
```

Levantar en local (dos procesos): el server Express y el frontend Vite (Vite proxya `/api` → `localhost:3001`).

```bash
pnpm run dev:server         # Express en :3001 (compila shared primero)
pnpm --filter @dnd-manager/web dev   # Vite en :5173
```

### Scripts útiles

| Script               | Qué hace                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck` | tsc en shared, web y raíz                                                                          |
| `pnpm run lint`      | ESLint en todo el repo                                                                             |
| `pnpm run test`      | Vitest (22 tests: dnd5e-derive + foundryParser contra el fixture real)                             |
| `pnpm run build`     | `prisma generate` + `prisma migrate deploy` + build de shared + build de web (lo que corre Vercel) |
| `pnpm run db:studio` | Prisma Studio                                                                                      |

### Variables de entorno (`.env`)

```
DATABASE_URL   # Neon pooled (endpoint con -pooler)
DIRECT_URL     # Neon directo (para migraciones)
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
BLOB_READ_WRITE_TOKEN   # vacío por ahora (ver "Assets")
```

En Vercel estas variables están configuradas en Production+Preview (Settings → Environment Variables).

---

## Despliegue

La app está desplegada en Vercel como **un solo proyecto** (frontend estático + función serverless bajo el mismo dominio). Checklist para desplegarla desde cero:

1. **Base de datos**: crear un proyecto en [Neon](https://neon.tech) (o cualquier Postgres). Copiar el endpoint **pooled** (con `-pooler`, va en `DATABASE_URL`) y el endpoint **directo** (sin pooler, va en `DIRECT_URL`, lo usan las migraciones).
2. **Repo en GitHub**: importar el repo en Vercel (New Project → Import Git Repository).
3. **Configuración del proyecto en Vercel**:
   - **Root Directory**: vacío (raíz del repo). No hay que tocarlo ni poner overrides manuales de Output Directory — todo lo define `vercel.json` (`buildCommand`, `installCommand`, `outputDirectory: web/dist`, rewrites de `/api/*`).
   - **Install Command** / **Build Command**: los que trae `vercel.json` (`pnpm install` / `pnpm run build`). No hace falta cambiarlos en el dashboard.
4. **Variables de entorno** (Settings → Environment Variables, en **Production** y **Preview**):
   ```
   DATABASE_URL             # Neon pooled
   DIRECT_URL                # Neon directo
   JWT_ACCESS_SECRET         # secreto largo y aleatorio
   JWT_REFRESH_SECRET        # secreto largo y aleatorio, distinto del de acceso
   BLOB_READ_WRITE_TOKEN     # vacío (Vercel Blob está en pausa, ver más abajo)
   ```
5. **Primer deploy**: al hacer push a `main` (o el deploy inicial), `pnpm run build` corre `prisma generate` → **`prisma migrate deploy`** (aplica automáticamente las migraciones pendientes contra `DIRECT_URL`) → build de `shared` → build de `web`. No hace falta correr migraciones a mano; si el schema no tiene migraciones pendientes, el paso es un no-op.
6. **Seed inicial (opcional)**: `pnpm run db:seed` desde local (apuntando el `.env` a la Neon de producción) crea un usuario demo (`master@demo.local` / `demo1234`) y un grupo de ejemplo. Es idempotente (usa `upsert`), se puede correr más de una vez sin duplicar datos.
7. **Verificar**: `https://<tu-proyecto>.vercel.app/api/health` debe responder OK, y la SPA debe cargar en `/`.

### Cambios de schema después del primer deploy

Al añadir un modelo o campo nuevo: `pnpm run db:migrate` en local genera la migración (contra tu Neon o un Postgres local) y la deja en `prisma/migrations/`. Al commitear y pushear, el siguiente deploy en Vercel la aplica solo — **no hay que correr `prisma migrate deploy` a mano**, ya está en el `build` (ver script `build` en `package.json`).

---

## Decisiones de arquitectura relevantes

- **Assets (imágenes/PDF) se guardan como bytes en Postgres**, no en Vercel Blob. Columna `Asset.data Bytes`. Subida en una sola petición `POST /api/assets?kind=IMAGE&name=...` (bytes en el body), y se sirven públicamente en `GET /api/assets/:id/raw`. Vercel Blob quedó **pausado** ("por si acaso"): `lib/storage.ts` conserva la implementación pero no se usa. Si algún archivo individual supera ~4 MB, habría que reactivar Blob.
- **Fichas**: se importan del `.md` export de Foundry (`server/services/foundryParser.ts`, extrae el bloque ` ```Actor `). Los stats derivados (mods, PB, salvaciones, CA, PG…) se calculan en `lib/dnd5e-derive.ts` (funciones puras con tests). Fixture de referencia: `fixtures/XxAlbertoPro01xX.md` (Hechicero nivel 4; CA 14 sale de un active-effect homebrew que suma +2).
- **Permisos de ficha** FULL / LIMITED / NONE en `server/services/authorization.ts`: el Master del grupo o el dueño ven la ficha completa; el resto de miembros solo nombre+foto.
- **Master sin personaje**: regla de negocio; al importar sin `ownerId` explícito, el fallback es asignar al Master (decisión confirmada).
- **Journals**: el `.zip` de Obsidian se parsea **entero en el navegador** (JSZip), nunca pasa por la API — evita el límite de body serverless. Los wiki-links `[[Título]]` se dejan tal cual en el `bodyMarkdown` (no se resuelven a `tempId` en el cliente); el servidor los resuelve a `JournalPageLink` por título **después** de insertar todas las páginas de una importación, y también los recalcula en cada edición manual de página (así los backlinks nunca quedan desactualizados). Los embeds `![[archivo]]` sí se resuelven en el cliente a un marcador estable `![[asset:ID]]` tras subir el asset.
- **Wiki-links renderizados como fragmento, no esquema custom**: el link interno se genera como `#journal-page:ID` (URI relativa estándar) en vez de `journal-page:ID` (esquema propio), porque DOMPurify descarta silenciosamente el `href` de esquemas de URI que no reconoce.

---

## ⚠️ Gotchas de despliegue en Vercel (ya resueltos — no volver a introducir)

El deploy costó porque hubo **cuatro** causas encadenadas. Si algo se rompe de nuevo, revisar en este orden:

1. **NO poner `"type": "module"` en el `package.json` raíz.** Hace que `@vercel/node` compile la función con resolución ESM estricta y exija extensiones `.js` en todos los imports → el build de la función falla.
2. **`shared/` debe compilar a JavaScript.** Compila a `shared/dist/` vía `tsconfig.build.json`, y `main`/`exports` apuntan a `dist`. Exponer TS crudo hace crashear la función en runtime (`Cannot find module .../shared/src/index.ts`). En dev, vite y vitest usan un alias → `shared/src` para no tener que precompilar.
3. **Prisma**: usar la ubicación de salida **por defecto** (`@prisma/client`, sin `output` custom) + `binaryTargets = ["native", "rhel-openssl-3.0.x"]`. Y ejecutar `prisma generate` dentro del script `build` (el postinstall automático se salta cuando Vercel cachea `node_modules` → error runtime `@prisma/client did not initialize yet`).
4. **Enrutado `/api/*`**: el catch-all `api/[...path].ts` solo enrutaba 1 segmento en Vercel (`/api/health` OK, `/api/auth/register` → NOT_FOUND). Solución: función única en `api/index.ts` + rewrite `"/api/(.*)" → "/api"` (Express recibe la URL original y enruta internamente). El SPA fallback usa negative-lookahead: `"/((?!api/).*)" → "/index.html"` para no capturar la API.

Además: en el dashboard de Vercel, **Root Directory** debe estar vacío (raíz del repo) y sin overrides manuales de Output Directory (se usa `vercel.json`).

---

## Progreso por fases

### ✅ Fase 0 — Scaffold (monorepo, tooling, `/api/health`)

### ✅ Fase 1 — Modelo de datos Prisma

User, Group, GroupMember, Asset, CharacterSheet, JournalEntry, JournalPage, JournalPageAsset, JournalPageLink. Migrado a Neon.

### ✅ Fase 2 — Auth JWT

`/api/auth/register|login|refresh|logout`, `/api/me`, `requireAuth`, refresh silencioso en el frontend.

### ✅ Fase 3 — Grupos y membresía

Crear/unirse por código, roles Master/Player, expulsar/salir, servicio de autorización FULL/LIMITED/NONE.

### ✅ Fase 4 — Import y parsing de fichas Foundry

Parser del `.md`, cálculo de derivados (con tests contra el fixture real), StorageService, endpoints de assets y de personaje (import / import-md / owner / portrait).

### ✅ Fase 5 — Visualización de ficha + permisos

`GET /api/characters/:id` (FULL/LIMITED/NONE), `GET /api/me/characters`, `POST /api/characters/:id/duplicate`, página de ficha estilo ARCANEO (pestañas Details/Skills/Inventory/Features/Spellbook/Biography, tema oscuro+dorado, DOMPurify), "Mis personajes", importar/actualizar ficha desde la vista de grupo.

### ✅ Fase 6 — Journals (personal y de grupo) + importador del `.zip`

- Importador del export Obsidian (`.zip`) **procesado 100% en el navegador con JSZip**: detecta la carpeta índice (la que tiene un `.md` con su mismo nombre), deriva la jerarquía de la indentación del TOC, decodifica nombres de asset con unicode escapado (`#Uxxxx`), sube cada asset embebido una sola vez y arma el JSON estructurado (`shared/src/journal.ts`) que espera la API.
- Endpoints: `POST /api/groups/:groupId/journal/import` (Master, destructivo — reemplaza todo), `GET /api/groups/:groupId/journal` y `GET /api/characters/:id/journal` (árbol), `GET /api/journal/pages/:id` (página con assets resueltos + backlinks), CRUD de páginas de grupo (`/api/groups/:groupId/journal/pages[/:pageId]`, abierto a cualquier miembro) y personales (`/api/characters/:id/journal/pages[/:pageId]`, dueño del PJ o Master).
- Frontend: árbol lateral colapsable, render markdown sanitizado (`marked` + DOMPurify), imágenes embebidas, wiki-links clicables con navegación in-app, sección de backlinks, formularios de crear/editar/borrar página y de reimportar.
- Al borrar una página, sus hijas se reenganchan al abuelo (no se pierden ni se cascada-borran).
- Verificado con un `.zip` sintético (no había uno real disponible para esta fase) que reproduce la estructura documentada: índice con TOC anidado, página con imagen embebida, wiki-links con y sin alias, reimport destructivo, creación manual con backlinks recalculados.

### ✅ Fase 7 — Shell de frontend y pulido

- **Kit de UI reutilizable** en `web/src/components/ui/`: `Button`, `Card` (polimórfico vía prop `as`), `TextField`/`TextAreaField`/`SelectField` (con `error` y `hideLabel`), `Skeleton`/`SkeletonText`/`SkeletonRow`/`SkeletonPage`, `EmptyState`. Sustituyen las clases Tailwind duplicadas que había en cada página.
- **Toasts**: `ToastProvider`/`useToast` (contexto propio, sin dependencia externa) montado en `main.tsx` con contenedor `aria-live="polite"`. Wireado en todas las mutaciones de grupos, personajes y journal (crear/unir/regenerar/expulsar/importar/duplicar/crear-editar-borrar página).
- **Skeletons** en vez de "Cargando...": `ProtectedRoute`, `GroupsPage`, `MyCharactersPage`, `GroupDetailPage`, `CharacterSheetPage`, `GroupJournalPage`, `CharacterJournalPage`.
- **Empty states** con `EmptyState`: sin grupos, sin personajes (propios y de grupo), árbol de journal vacío.
- **Formularios migrados a `react-hook-form` + `zod`** (`@hookform/resolvers/zod`), reutilizando los schemas ya exportados por `@dnd-manager/shared` (login, registro, crear/unirse a grupo, importar ficha/.md, duplicar personaje, crear/editar página de journal). Se añadieron mensajes de error en español a esos schemas (antes tiraban del default en inglés de zod). `ImportJournalZipForm` se dejó como wizard multi-paso con `useState` (no encaja bien en RHF por su naturaleza asíncrona de varios pasos), pero restyled con `Card`/`Button` y con toasts.
- **Accesibilidad**: pestañas de `CharacterSheetPage` con `role="tablist"/"tab"/"tabpanel"` + `aria-selected`; `aria-label` en botones de icono (cerrar toast, expandir/colapsar árbol, input de archivo del importador); foco visible (`focus-visible:outline`) en botones y en los links de la lista de grupos.
- **Responsive**: sidebar del journal pasa a ancho completo y se apila sobre el contenido en móvil (`flex-col sm:flex-row`); header de `AppLayout` con `flex-wrap`. Verificado en viewport 375×812.
- Verificado manualmente en navegador (login, error de credenciales, crear/unirse a grupo con validación, regenerar código, importar ficha real del fixture, CRUD completo de página de journal con toasts, tabs de la ficha, responsive móvil) y con `pnpm run typecheck/lint/test/build`.

### ✅ Fase 8 — Despliegue (documentación)

- **`prisma migrate deploy` automatizado**: el script `build` (raíz, el que corre Vercel) ahora es `prisma generate && prisma migrate deploy && build:shared && build web`. Antes las migraciones se aplicaban a mano con `pnpm run db:migrate` apuntando a Neon; ahora cada deploy las aplica solo (usa `DIRECT_URL`, ya configurado como `directUrl` en `prisma/schema.prisma`). Verificado localmente: con las 2 migraciones existentes ya aplicadas, el paso es un no-op ("No pending migrations to apply.") y el build completo sigue funcionando.
- **Checklist de despliegue desde cero** documentado en la sección "Despliegue" de este README: Neon → repo en Vercel → Root Directory vacío → variables de entorno en Production+Preview → primer deploy (migra solo) → seed opcional → verificar `/api/health`.

---

## Qué queda por hacer

- **Vercel Blob**: sigue en pausa (ver `lib/storage.ts`). Reactivar solo si algún día hace falta subir archivos individuales de más de ~4 MB.
- **Verificar Fase 6 con un `.zip` real**: se probó con un `.zip` sintético construido a mano; si tienes un export real de Obsidian/Foundry, conviene correrlo una vez para pillar casos raros (nombres de página con caracteres especiales, jerarquías más profundas, PDFs embebidos en vez de solo imágenes).
- **Code splitting**: `vite build` avisa de un chunk de ~557 kB (172 kB gzip). No es bloqueante, pero si crece más conviene `manualChunks` o `dynamic import()` para las rutas menos usadas (journal, ficha).
- **Datos de prueba en Neon**: además de los datos previos (`prod_*`, `wake_*`, `journalmaster`, "Grupo Producción", "Grupo Journal Browser"), la verificación de la Fase 7 creó "Grupo Fase 7 Test" (vacío, bajo `journalmaster`) y, bajo el usuario semilla `master@demo.local`/`demo1234`, un personaje importado del fixture en "Grupo Demo" y un `JournalEntry` "Diario de prueba" con una página editada. Limpiar si se quiere una base limpia antes de usarla de verdad.
- **Warning conocido e inofensivo**: ESLint marca `react-refresh/only-export-components` en `web/src/context/AuthContext.tsx` y en `web/src/components/ui/Toast.tsx` (mismo patrón Context+hook en un archivo). No es un error.
