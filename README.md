# D&D Manager

App web para gestionar grupos de **Dungeons & Dragons 5e** (sistema Foundry `dnd5e`): grupos, fichas de personaje importadas del export `.md` de Foundry, y diarios (journals).

- **Producción:** https://dnd-manager-web.vercel.app
- **Repo:** privado en `github.com/xDomiinz22/dnd-manager`
- **Estado:** Fases 0–8 completas y verificadas. Desplegado y operativo.

---

## Stack

Monorepo **pnpm** desplegado como **un solo proyecto en Vercel** (frontend estático + backend serverless bajo el mismo dominio).

| Capa            | Tecnología                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | React 18 + Vite + TypeScript + Tailwind + TanStack Query + React Router                                                     |
| Backend         | Express (montado como **una** función serverless en `api/index.ts`)                                                         |
| ORM / DB        | Prisma + **PostgreSQL en Neon** (pooled `DATABASE_URL` + directo `DIRECT_URL`)                                              |
| Auth            | JWT (access en memoria + refresh en cookie `httpOnly`), passwords con `argon2`, login con Google (Google Identity Services) |
| Validación      | `zod` (schemas compartidos en `shared/`)                                                                                    |
| Tests           | Vitest                                                                                                                      |
| Parsing fichas  | `js-yaml` (bloque `Actor` del `.md` de Foundry)                                                                             |
| Parsing journal | `jszip` + `js-yaml` (frontmatter) + `marked` + `dompurify` (todo en el navegador)                                           |
| Imágenes        | `sharp` (conversión automática a webp en la subida), `compression` (gzip/brotli en las respuestas de la API)                |

### Estructura del repo

```
/
├─ web/                 → app React (Vite). Alias @dnd-manager/shared → ../shared/src en dev
│  └─ src/features/journal/  → parser del .zip (zipImport.ts), render markdown (render.ts), api/hooks
├─ api/index.ts         → función serverless: monta la app Express (todas las rutas /api/*)
├─ server/              → Express: routes / controllers / services / middlewares
├─ lib/                 → prisma (singleton), auth (jwt+argon2), dnd5e-derive, storage, imageConversion (webp)
├─ shared/              → paquete @dnd-manager/shared: schemas zod + tipos (COMPILA a dist/)
├─ prisma/              → schema.prisma, migraciones, seed.ts, backfillWebp.ts (script one-off)
├─ fixtures/            → XxAlbertoPro01xX.md (ficha real de ejemplo para tests)
├─ vercel.json          → rewrites (/api/* → función, resto → SPA) + maxDuration + regions
├─ PRODUCT.md/DESIGN.md → brief y sistema de diseño ("Tomo del Jugador", ver skill impeccable)
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

| Script                          | Qué hace                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck`            | tsc en shared, web y raíz                                                                                   |
| `pnpm run lint`                 | ESLint en todo el repo                                                                                      |
| `pnpm run test`                 | Vitest (24 tests: dnd5e-derive + foundryParser contra el fixture real y casos multiclase sintéticos)        |
| `pnpm run build`                | `prisma generate` + `prisma migrate deploy` + build de shared + build de web (lo que corre Vercel)          |
| `pnpm run db:studio`            | Prisma Studio                                                                                               |
| `pnpm run images:backfill-webp` | Convierte a webp in-place los `Asset` de tipo `IMAGE` ya existentes (one-off, ver "Mejoras de rendimiento") |

### Variables de entorno (`.env`)

```
DATABASE_URL   # Neon pooled (endpoint con -pooler)
DIRECT_URL     # Neon directo (para migraciones)
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
BLOB_READ_WRITE_TOKEN   # vacío por ahora (ver "Assets")
GOOGLE_CLIENT_ID        # login con Google — ver sección de abajo
VITE_GOOGLE_CLIENT_ID   # mismo valor, lo usa el frontend
```

En Vercel estas variables están configuradas en Production+Preview (Settings → Environment Variables).

`VITE_GOOGLE_CLIENT_ID` solo lo lee Vite si está en el entorno del proceso o en un `.env` **dentro de `web/`** (Vite no mira el `.env` de la raíz para variables de cliente). Para desarrollo local hay un `web/.env` con ese único valor (gitignorado); en Vercel basta con configurar la variable en el dashboard, Vite la recoge de `process.env` en build sin necesitar ningún archivo.

### Login con Google

Usa **Google Identity Services** (el botón oficial de Google, sin redirect): el frontend inicializa `window.google.accounts.id` con `VITE_GOOGLE_CLIENT_ID` y manda el ID token resultante a `POST /api/auth/google`, que lo verifica con `google-auth-library` (audience = `GOOGLE_CLIENT_ID`) y hace login/registro:

- Si ya existe un usuario con ese `googleId`, entra directamente.
- Si no, busca por email: si existe una cuenta con contraseña con ese email, la vincula (le añade `googleId`, sin tocar la contraseña).
- Si no existe ninguna, crea una cuenta nueva sin contraseña (`passwordHash` nulo) con un username generado a partir del nombre de Google.

**Para configurar un Client ID propio** (Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application):

1. En **Authorized JavaScript origins** añade tu dominio de producción (`https://<tu-proyecto>.vercel.app`) y tu origen de desarrollo local (`http://localhost:5173`, el puerto de Vite).
2. Copia el Client ID (es público, no hace falta guardarlo como secreto) y ponlo en `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (mismo valor en ambas) tanto en tu `.env`/`web/.env` local como en Vercel.
3. Sin `GOOGLE_CLIENT_ID` configurado en el servidor, `POST /api/auth/google` responde `503 GOOGLE_AUTH_DISABLED` en vez de crashear; el resto de la app (login/registro por contraseña) funciona igual.

---

## Despliegue

La app está desplegada en Vercel como **un solo proyecto** (frontend estático + función serverless bajo el mismo dominio). Checklist para desplegarla desde cero:

1. **Base de datos**: crear un proyecto en [Neon](https://neon.tech) (o cualquier Postgres). Copiar el endpoint **pooled** (con `-pooler`, va en `DATABASE_URL`) y el endpoint **directo** (sin pooler, va en `DIRECT_URL`, lo usan las migraciones).
2. **Repo en GitHub**: importar el repo en Vercel (New Project → Import Git Repository).
3. **Configuración del proyecto en Vercel**:
   - **Root Directory**: vacío (raíz del repo). No hay que tocarlo ni poner overrides manuales de Output Directory — todo lo define `vercel.json` (`buildCommand`, `installCommand`, `outputDirectory: web/dist`, rewrites de `/api/*`).
   - **Install Command** / **Build Command**: los que trae `vercel.json` (`pnpm install` / `pnpm run build`). No hace falta cambiarlos en el dashboard.
   - **Región de la función** (`vercel.json` → `regions`): fijada a `["fra1"]` porque la Neon de este proyecto está en `eu-central-1` (Fráncfort) — si tu Postgres está en otra región, cambia este valor a la región de Vercel más cercana a la tuya, si no cada query paga la latencia de ida y vuelta entre continentes.
4. **Variables de entorno** (Settings → Environment Variables, en **Production** y **Preview**):
   ```
   DATABASE_URL             # Neon pooled
   DIRECT_URL                # Neon directo
   JWT_ACCESS_SECRET         # secreto largo y aleatorio
   JWT_REFRESH_SECRET        # secreto largo y aleatorio, distinto del de acceso
   BLOB_READ_WRITE_TOKEN     # vacío (Vercel Blob está en pausa, ver más abajo)
   GOOGLE_CLIENT_ID          # Client ID de Google Cloud Console (ver "Login con Google")
   VITE_GOOGLE_CLIENT_ID     # mismo valor que GOOGLE_CLIENT_ID
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
- **Permisos de ficha** FULL / LIMITED / NONE en `server/services/authorization.ts`: el Master del grupo o el dueño ven la ficha completa; el resto de miembros solo nombre+foto. **Excepción confirmada**: borrar la ficha (`DELETE /characters/:id`) es más estricto que el resto — solo el Master, ni siquiera el dueño puede borrar su propio personaje (`requireCharacterMaster`, no `requireCharacterMasterOrOwner`).
- **Master sin personaje**: regla de negocio; al importar sin `ownerId` explícito, el fallback es asignar al Master (decisión confirmada).
- **Preferir el dato real del sistema origen sobre una fórmula propia, siempre que esté presente**: aplicado ya dos veces (CA con `armorClass.needsOverride`, PG máximo con `hp.max` de Foundry) — cuando Foundry ya calculó algo correctamente internamente (multiclase, active effects, homebrew) pero nuestra fórmula de derivación no lo modela, hay que leer el valor real del `.md` cuando venga relleno y usar la fórmula solo como fallback para cuando no venga. Si se añaden más stats derivados, revisar primero si Foundry ya trae el valor real en `rawSystem` antes de reinventar el cálculo.
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

**NO poner `envDir` en `web/vite.config.ts`** apuntando a la raíz del monorepo para compartir el `.env` con el server: por alguna razón (no investigada a fondo — posiblemente afecta cómo esbuild/Vite resuelve el `mode`/target al ver un `.env` fuera del root por defecto) el bundle de producción pasó de ~557 kB a ~821 kB con el mismo código, reproducible incluso con la caché de Vite limpia. `web/.env` (gitignorado) con las variables `VITE_*` es la alternativa segura; en Vercel no hace falta ni eso, ya que Vite recoge `VITE_*` de `process.env` en build sin importar el `envDir`.

**Región de la función vs. región de Neon** (no rompe el deploy, pero lo deja lento en silencio): por defecto Vercel construye/ejecuta en `iad1` (Virginia); si tu Postgres está en otra región (esta Neon está en `eu-central-1`, Fráncfort), cada query paga la ida y vuelta transatlántica. Fijar `regions` en `vercel.json` a la región de Vercel más cercana a tu DB. Descubierto 2026-07-11 mientras se buscaban formas de mejorar los tiempos de respuesta — hasta entonces llevaba así desde el primer deploy sin que nada avisara.

**Cambiar de cuenta en la Vercel CLI local rompe el auto-deploy por push a GitHub** (pasó dos veces en 2026-07-11): tras `vercel logout`/`vercel login` con otra cuenta, los pushes a `main` dejan de disparar deploys automáticos aunque el repo siga bien conectado — hay que lanzar `vercel --prod` a mano (con `vercel whoami` y `.vercel/project.json` ya apuntando a la cuenta/proyecto correctos) hasta que se revise/reconecte la integración de GitHub desde el dashboard de Vercel.

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

## Post-roadmap

### ✅ Login con Google

- Prisma: `User.passwordHash` ahora opcional y `User.googleId` único (migración `20260709183021_google_auth`). Cuentas creadas solo con Google no tienen contraseña; `login()` por email/contraseña detecta este caso y devuelve un error `GOOGLE_ACCOUNT` con mensaje claro en vez de intentar verificar contra un hash nulo.
- `POST /api/auth/google` (`shared/src/auth.ts` → `googleAuthSchema`, `lib/auth.ts` → `verifyGoogleIdToken` con `google-auth-library`, `server/services/authService.ts` → `googleLogin`): verifica el ID token (audience = `GOOGLE_CLIENT_ID`), busca por `googleId`, si no existe busca por email para vincular una cuenta con contraseña ya existente, y si tampoco hay coincidencia crea una cuenta nueva sin contraseña con username generado (`generateUniqueUsername`, deriva del nombre de Google normalizando acentos y resolviendo colisiones con sufijo numérico).
- Frontend: `web/src/lib/googleIdentity.ts` carga el script de Google Identity Services dinámicamente una sola vez; `GoogleSignInButton.tsx` inicializa el botón y manda el ID token a `useGoogleLogin`. Usa el patrón de "ref con los callbacks más recientes" para que el efecto de carga (una sola vez) no incurra en dependencias obsoletas del hook.
- Reutiliza el mismo Client ID de OAuth que **AI Pulse** (es público, no un secreto) — solo hubo que añadir los orígenes autorizados del dominio de producción y de dev en Google Cloud Console.
- Verificado: login/registro por contraseña sin regresión, botón se renderiza en Login y Register, error controlado con token inválido (401) y con cuenta Google-only intentando login por contraseña (401 con mensaje claro, sin crash), `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Revisión de mobile

Pasada completa en viewport 375×812 (móvil) y 768×1024 (tablet) por todas las páginas: login/registro, home, grupos, detalle de grupo, mis personajes, ficha de personaje (todas las pestañas), journal de grupo y personal (árbol, vista y edición de página).

- **Bug encontrado y arreglado**: la tarjeta del código de invitación en `GroupDetailPage` (`Código de invitación` + code + Copiar + Regenerar) no envolvía en una fila flex sin `flex-wrap`, y el label se partía en 3 líneas verticales apretadas en móvil. Ahora envuelve limpiamente a una segunda fila (`flex-wrap`, y `Regenerar` con `sm:ml-auto` en vez de `ml-auto`).
- **Riesgo latente encontrado y arreglado**: las clases `prose-sm` (descripciones de items/biografía en la ficha) y `journal-prose` (contenido del journal) se usaban en todo el código para el HTML insertado vía `dangerouslySetInnerHTML`, pero **no tenían ninguna definición CSS real** (no hay plugin de tipografía de Tailwind instalado) — eran clases inertes. Una palabra larga sin espacios en una descripción de Foundry o una página de journal desbordaba el layout horizontalmente en móvil (confirmado con una prueba sintética: 200 caracteres sin espacio pasaban de 375px a 1469px de ancho). Se añadió un reset mínimo en `web/src/index.css` (`overflow-wrap: anywhere`, `img { max-width: 100% }`, `table { overflow-x: auto }`) para esas dos clases.
- Resto de páginas ya estaban bien: header con `flex-wrap`, journal con sidebar apilable (`flex-col sm:flex-row`, de la Fase 7), tabs de la ficha envuelven, tabla de habilidades cabe en su contenedor `overflow-x-auto`, grid de características en 3 columnas se ve bien en 375px.

### ✅ Galería de imágenes de personaje + selector de retrato

Antes solo existía el backend para fijar un retrato (`PATCH /characters/:id/portrait`), sin ninguna forma de subir una imagen desde el frontend. Ahora un personaje puede tener varias imágenes (atuendos, etc.) y elegir cuál es la principal:

- Prisma: `Asset.characterId` (relación `"CharacterImages"`, distinta de la relación existente `"CharacterPortrait"` para el retrato activo) — migración `20260709194617_character_images`.
- Backend (`server/services/characterService.ts`, gateado por el mismo `requireCharacterMasterOrOwner` que ya protegía el cambio de retrato):
  - `POST /characters/:id/images` — sube una imagen a la galería (mismo patrón de bytes-en-body que `POST /assets`). Si el personaje todavía no tiene retrato, la primera imagen subida se marca automáticamente como principal.
  - `GET /characters/:id/images` — lista la galería.
  - `DELETE /characters/:id/images/:assetId` — borra una imagen; si es la que está activa como retrato, rechaza con `409 CANNOT_DELETE_ACTIVE_PORTRAIT` (hay que elegir otra como principal antes de poder borrarla).
  - `toAssetDto` se movió de `assetController.ts` a `services/assetUrl.ts` para reutilizarlo entre ambos controllers. `CharacterFull` ahora expone `portraitAssetId` para que el frontend sepa qué imagen de la galería está activa sin comparar URLs.
- Frontend: `CharacterImageManager.tsx` (nuevo, en `components/character/`), montado junto al retrato circular en la cabecera de la ficha — solo se renderiza cuando el usuario ya ve la ficha completa (`access === "FULL"`, que coincide exactamente con "Master o dueño"). Miniaturas en grid, la activa con borde ámbar; click en una no-activa la marca como principal; botón de borrar (oculto en la activa) por miniatura; botón "Añadir imagen" con `<input type="file">` oculto.
- Verificado con imágenes PNG sintéticas subidas vía `fetch` autenticado (no hay forma de rellenar un `<input type="file">` con las herramientas de automatización): primera imagen se auto-selecciona como retrato, segunda no lo hace, cambiar de principal funciona y refleja el borde ámbar correcto, borrar la no-activa funciona, borrar la activa se bloquea con el mensaje esperado (tanto a nivel API como en la UI, donde ni siquiera se muestra el botón). `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Arrastrar y soltar el `.md` al importar/actualizar una ficha

Antes había que copiar y pegar el contenido del `.md` en un textarea. `FileDropTextArea.tsx` (nuevo, en `components/ui/`) envuelve `TextAreaField` con una zona de `onDrop`/`onDragOver` (resalta con borde punteado ámbar mientras se arrastra encima) y además un `<input type="file">` oculto como alternativa de "selecciona uno" — ambos caminos leen el archivo con `file.text()` y llaman a `onFileDrop(text)`, que el formulario usa para hacer `setValue("md", text, { shouldValidate: true })` de react-hook-form. Sustituye el `TextAreaField` suelto en `ImportCharacterForm` y `UpdateCharacterMdForm` (`GroupDetailPage.tsx`); el registro de RHF (`{...register("md")}`) se mantiene igual, así que la validación y el envío no cambian.

Verificado disparando eventos `drop` y `change` sintéticos con un `File`/`DataTransfer` reales sobre la zona y el input oculto respectivamente (no hay forma de arrastrar un archivo de verdad con las herramientas de automatización): en ambos casos el contenido del archivo aparece en el textarea. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Fix: import de journal fallaba con vaults grandes ("Unexpected server error" al guardar)

Reportado por el usuario: al importar un `.zip` real de Obsidian, todos los assets subían bien, pero justo al terminar y pasar a "Guardando el diario..." fallaba con un error genérico.

**Causa**: `importGroupJournal` creaba cada página, le asignaba su padre y resolvía sus wiki-links **una por una, en un bucle secuencial** (varias queries por página), todo dentro de una única transacción interactiva de Prisma. Prisma pone por defecto un **timeout de 5 segundos** a esas transacciones. Con el `.zip` sintético de pocas páginas usado para verificar la Fase 6 nunca se notó, pero con un vault real de decenas/cientos de páginas, cada una con 2-3 round-trips a Neon (latencia de red), se supera de sobra ese límite — Prisma corta la transacción con un error que `errorHandler.ts` no reconoce específicamente, así que cae en el genérico `500 Unexpected server error`. No era un problema de tamaño del `.zip` (que nunca se sube entero, se parsea en el navegador) ni algo que se arreglara partiendo el archivo (perdería la estructura del árbol y los backlinks, que necesitan conocer todas las páginas a la vez).

**Fix** (`server/services/journalService.ts`): `importGroupJournal` ahora resuelve todo en memoria antes de tocar la DB — ids reales (`crypto.randomUUID()`, generados por página antes de insertar, en vez de esperar el id que devolvería cada `create()`), `parentId` y los wiki-links (contra el propio payload, no contra una query de "siblings") — y hace el guardado en **un puñado de `createMany`** (páginas, assets de página, links) en vez de una query por página. La transacción además ahora especifica `timeout: 20_000` explícito como margen extra. También se subió el límite del body JSON de Express de 2mb a 4mb (`server/app.ts`), por si el texto combinado de todas las páginas de un vault grande se acerca al límite anterior; el límite duro real es el de ~4.5 MB por función serverless de Vercel, que sigue sin tocarse.

Verificado con un import sintético de 150 páginas anidadas (jerarquía de 3 niveles) con wiki-links cruzados entre todas: completa en ~1.1s (antes habría sido ~750 round-trips secuenciales), árbol y las 149 backlinks se resuelven correctamente. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Fix: algunas imágenes embebidas no cargaban en el journal

Reportado por el usuario con un caso real: una página con `![[assets-...-[Edge]-182.png]]` se veía tal cual, entre corchetes, en vez de mostrar la imagen.

**Causa**: los regex que extraen el contenido de `[[...]]`/`![[...]]` (embeds y wiki-links, tanto al importar como al renderizar) usaban una clase de caracteres que **excluye `]` del nombre/título** (`[^\]|]+`), asumiendo que nunca aparece un `]` suelto dentro del nombre de archivo o del título de una página. Nombres de archivo reales de Obsidian sí pueden traer un `]` (en este caso, un tag tipo "[Edge]" como parte del nombre) — cuando eso pasa, la captura se corta en ese `]` y el resto (`-182.png]]`) rompe el cierre esperado `]]`, así que el regex entero no matchea: el embed nunca se reconoce, el asset nunca se sube durante el import, y el texto crudo `![[...]]` se queda tal cual en el `bodyMarkdown` — que es justo lo que se veía en pantalla.

**Fix**: nueva utilidad compartida `parseBracketLinkContent` (`shared/src/journal.ts`) que separa target/alias partiendo por el primer `|`, pensada para usarse junto a un regex _lazy_ hasta el primer `]]` (`[\s\S]+?`) en vez de la clase de caracteres que excluía `]`. Aplicado en los tres sitios que parseaban esta sintaxis: `zipImport.ts` (`EMBED_PATTERN` al extraer qué assets subir, y el TOC del índice), `render.ts` (resolución de wiki-links a links de página) y `journalService.ts` (`WIKILINK_PATTERN`, resolución de backlinks en el servidor).

Verificado: reproducido el bug exacto con el string reportado (el regex viejo extraía 0 embeds; el nuevo extrae el nombre completo); confirmado que la sustitución por el marcador `![[asset:ID]]` funciona con ese nombre; probado contra el servidor real creando una página con título `Item [Edge] especial` y otra que enlaza a ella — el backlink se resuelve; y en el navegador (Playwright) el link se renderiza clicable con el label correcto en vez de como texto plano con corchetes. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ PG (puntos de golpe) actuales editables

Antes los PG actuales de la ficha eran de solo lectura: se leían directamente de `rawSystem.attributes.hp.value` (snapshot del `.md` de Foundry en el momento del import) y nunca cambiaban salvo un reimport completo. Ahora se pueden editar para registrar el daño/curación de cada sesión.

- Prisma: `CharacterSheet.currentHp Int?` (migración `20260710104627_character_current_hp`). `null` = todavía no se ha tocado a mano (usa el valor importado de Foundry o, si no hay, el máximo derivado).
- `PATCH /characters/:id/hp` (`shared/src/characters.ts` → `updateHpSchema`, entero `>= 0`), gateado por el mismo `requireCharacterMasterOrOwner` que ya protegía retrato/imágenes. `characterService.resolveCurrentHp` centraliza el fallback (persistido → valor de Foundry → máximo) para que `CharacterFull.currentHp` sea siempre el valor efectivo, sin que el frontend tenga que conocer la cadena de fallbacks.
- Frontend: el stat "PG" de la cabecera de la ficha (`CharacterSheetPage.tsx` → `HpStat`) es ahora un botón; al hacer click se convierte en un formulario react-hook-form + zod con un input numérico (valor absoluto, no un delta) y Guardar/Cancelar.

Verificado en navegador (Playwright): editar a un valor menor (simulando daño) se guarda, persiste tras recargar la página, y el mismo valor negativo se rechaza en cliente (zod) sin ni siquiera llegar a mandar la petición, mostrando el mensaje de error bajo el input. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Rediseño visual completo: identidad "Tomo del Jugador"

El frontend tenía un look genérico de dashboard SaaS (slate + amber). Se rediseñó todo con una identidad temática D&D — pergamino, oxblood, oro, tipografía de tomo — usando la skill `impeccable` (PRODUCT.md + DESIGN.md nuevos en la raíz documentan el brief y el sistema completo de tokens).

- **Dirección**: "Tomo del Jugador" (referencia al Player's Handbook) — pergamino claro, oxblood, oro solo como acento decorativo/UI (nunca texto de cuerpo, falla contraste), display en Cinzel, cuerpo en EB Garamond. Elegida explícitamente para evitar tanto el dashboard genérico anterior como el cliché "IA" de crema `#F4F1EA` + Playfair + terracota.
- **Paleta verificada por contraste** (script Node con fórmula de luminancia relativa, no estimada): `ink` #2A1B12 sobre `parchment` #F0E4C8 → 13.16:1; `ink-muted` #6B5640 → 5.49:1/4.68:1 (panel); `oxblood` #6B1620 → 9.45:1/8.05:1; `oxblood-dark` #4A0F16 (errores) → 12.13:1. `gold`/`gold-bright` fallan el umbral de texto (3.06:1 y 2.03:1) — restringidos a bordes, decoración y texto grande/UI, nunca cuerpo de texto.
- **Tokens** (`web/tailwind.config.js`, `web/src/index.css`): paleta completa como colores nombrados de Tailwind, fuentes vía Google Fonts CDN, `border-radius` reducido a `rounded-sm` en todo el kit (antes `rounded-lg`), y una **letra capitular iluminada** como elemento de firma — `.journal-prose > p:first-of-type::first-letter` en Cinzel 700, 3.2em, oxblood, flotante — que solo aparece en el primer párrafo de cada página de journal.
- Kit de UI (`Button`, `Card`, `TextField`, `TextAreaField`, `SelectField`, `Skeleton`, `EmptyState`, `Toast`, `FileDropTextArea`) y todas las páginas (shell, login/registro, home, grupos, mis personajes, ficha de personaje completa con sus 6 pestañas y el editor de PG, journal de grupo y personal, árbol de páginas) migrados al nuevo sistema. Nuevo componente `ChapterHeading` para los títulos de página (regla doble en degradado dorado).
- El botón de Google (`GoogleSignInButton.tsx`) pasó de `theme: "filled_black"` a `"outline"` para no desentonar sobre el fondo claro de pergamino.

Verificado: `typecheck`/`lint`/`test`/`build` limpios; navegación completa en navegador (login real con el usuario semilla, grupos, detalle de grupo, ficha de personaje con datos reales incluido el editor de PG, journal de grupo con una página real — confirmada la letra capitular renderizando en Cinzel/oxblood vía estilos computados) sin errores de consola ni peticiones fallidas inesperadas; sin overflow horizontal en viewport móvil (375px) en ficha de personaje ni journal. La herramienta de captura de pantalla no estuvo disponible en esta sesión (timeout de infraestructura); la verificación visual se hizo con snapshots de accesibilidad e inspección de estilos computados en vez de capturas.

### ✅ Popup con efecto "liquid glass" al ver un personaje ajeno

Reportado por el usuario: al hacer click en el personaje de otro jugador (acceso `LIMITED`, solo nombre+foto) desde el detalle de grupo, se navegaba a una página completa sin ningún botón para volver — solo quedaba el navegador atrás o la barra de navegación superior.

- **Patrón "background location" de React Router**: `App.tsx` ahora lee `location.state.backgroundLocation`. Si existe, las rutas normales se renderizan usando esa ubicación de fondo (la página desde la que se hizo click sigue montada) y un segundo `<Routes>` renderiza solo `/characters/:id` → `CharacterProfileModal` encima. Sin ese estado (carga directa de la URL, recarga de página), `/characters/:id` cae en el `CharacterSheetPage` de siempre — el fallback es automático, no hace falta lógica extra.
- `GroupDetailPage.tsx`: el link a cada personaje del roster calcula `isLimited = !isMaster && c.ownerId !== user?.id` (mismo criterio que `resolveCharacterAccess` en el backend, ya disponible en el cliente vía `ownerId` del roster) y solo añade `state={{ backgroundLocation: location }}` cuando es `true`. Los personajes propios o vistos como Master siguen navegando a página completa, tal y como se pidió.
- `CharacterProfileModal.tsx` (nuevo, en `components/character/`): overlay `fixed inset-0` con scrim oscuro + `backdrop-blur-sm`, y una tarjeta centrada en pergamino translúcido + `backdrop-blur-xl` (glassmorphism / "liquid glass"). Cierra con el botón `×`, click en el fondo, o `Escape`; bloquea el scroll del body mientras está abierto y lo restaura al cerrar. Si por cualquier motivo el acceso resulta ser `FULL` (p. ej. cambia tu rol mientras el modal está abierto), redirige automáticamente a la ficha completa en vez de mostrar la vista reducida.

Verificado en navegador con dos usuarios reales (Master dueño del personaje vs. un jugador nuevo unido solo con el código de invitación): el jugador ve el popup con blur confirmado por estilos computados (`backdrop-filter: blur(24px)` en la tarjeta, `blur(4px)` en el scrim) sobre el detalle de grupo, que sigue visible detrás; cerrar por los tres caminos (×, click fuera, Escape) devuelve a `/groups/:id` con el scroll restaurado; el Master, al hacer click en el mismo personaje (dueño), sigue navegando a la ficha completa sin popup; cargar la URL del personaje directamente (sin pasar por el click) cae correctamente en la página completa de solo nombre+foto de siempre, sin popup roto. `typecheck`/`lint`/`test`/`build` limpios.

**Ajuste de tamaño** (mismo día, a petición del usuario — "para ver mejor la imagen"): tarjeta y retrato responsive en dos escalones. `PortraitCircle.tsx` ganó una prop opcional `sizeClassName` (clases Tailwind responsive tipo `"h-36 w-36 sm:h-44 sm:w-44"`) que sustituye al `size` numérico fijo cuando se pasa, sin tocar el resto de usos del componente (listas de personajes siguen usando `size` en px). Móvil: tarjeta 320px→343px, retrato 128px→144px. Escritorio (`sm:`): tarjeta 448px, retrato 176px — salto notablemente mayor que en móvil, tal como se pidió. Verificado con `getComputedStyle`/`getBoundingClientRect` en ambos viewports, sin overflow horizontal en 375px. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Buscador de secciones en los journals

Pedido explícito: buscar **secciones** (títulos de página) del árbol del journal, no contenido de las páginas. Al ya tener el árbol completo (`JournalTreeNode[]`, con títulos) cargado en el cliente para pintar el sidebar, no hizo falta tocar el backend — es un filtro client-side.

- `JournalTreeSidebar.tsx` (compartido entre `GroupJournalPage` y `CharacterJournalPage`): nuevo campo de búsqueda sobre el árbol. `filterTree()` recorre recursivamente y conserva una sección si su título coincide, o si alguna descendiente coincide — en ese caso solo se quedan las descendientes que coinciden (poda ramas no relacionadas, deja visible el camino hasta el resultado). Si la propia sección coincide, conserva **todas** sus hijas tal cual (sin filtrar), para poder seguir navegando por ella con normalidad.
- Comparación insensible a mayúsculas/minúsculas y a acentos (`normalize("NFD")` + strip de marcas diacríticas vía `̀-ͯ`), para que "dragon" encuentre "Dragón".
- Estado "sin resultados" diferenciado del "sin páginas todavía" (árbol vacío) ya existente. Botón `×` para limpiar la búsqueda. El estado de expandido/colapsado de cada nodo (`TreeNode`, keyed por `id`) se conserva entre búsquedas porque React reutiliza el mismo componente para el mismo id.
- La página abierta en el panel de la derecha no se ve afectada por la búsqueda del sidebar — solo filtra la navegación, no oculta lo que ya tienes abierto.

Verificado en navegador (grupo con 3 páginas de prueba, título con acento incluido): "dragon" filtra correctamente a solo "Taberna del Dragón Dorado" pese a la falta de acento en la búsqueda; una búsqueda sin coincidencias muestra "Sin resultados para «xyzxyz»."; el botón de limpiar funciona. La lógica de poda con jerarquía anidada (buscar una página nieta conserva el camino de ancestros y descarta hermanos no relacionados; buscar un ancestro conserva su subárbol completo intacto) se verificó con un script aparte reproduciendo `filterTree` sobre un árbol de 3 niveles, porque la creación manual de páginas desde la UI no soporta elegir un padre (solo el import de `.zip` de Obsidian genera jerarquía) — no había forma rápida de crear anidación real vía navegador. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Mejoras de rendimiento: región de Vercel, compresión y conversión a webp

A petición del usuario ("mejorar los tiempos de respuesta"), tres cambios concretos basados en una auditoría real del código (no genérica):

- **Región de Vercel** (`vercel.json` → `"regions": ["fra1"]`): la función serverless corría en `iad1` (Virginia, EE.UU., el default de Vercel) mientras Neon está en `eu-central-1` (Fráncfort) — cada query pagaba latencia transatlántica de ida y vuelta. `fra1` es la región de Vercel más cercana a Fráncfort.
- **Compresión de respuestas** (`server/app.ts` → `app.use(compression())`, antes de las rutas): Express no comprimía el JSON de la API. Verificado en real: una respuesta de ficha de personaje (162 943 bytes sin comprimir, incluye el `rawSystem` completo de Foundry) se sirve con `Content-Encoding: br` (Brotli, mejor que gzip; el paquete `compression` lo usa automáticamente si el cliente lo acepta).
- **Conversión automática a webp** (`lib/imageConversion.ts`, nuevo): toda imagen que se sube (galería/retrato de personaje vía `characterService.addCharacterImage`, y cualquier cosa por el endpoint genérico `POST /assets` — que es por donde suben los assets del import de journal desde `.zip` de Obsidian) se convierte a webp (`sharp`, calidad 82) antes de guardarse, salvo que ya sea webp, sea SVG (vectorial, no tiene sentido rasterizarlo) o GIF (sharp solo tomaría el primer frame por defecto y rompería la animación en silencio). El nombre original también cambia de extensión (`foto.png` → `foto.webp`) para que no quede desincronizado con el contenido real. Verificado en real: subida de un PNG de prueba vía `fetch` autenticado devuelve `mime: "image/webp"`; la URL servida (`GET /api/assets/:id/raw`) responde con `Content-Type: image/webp` y los bytes empiezan por la firma `RIFF....WEBP`; se limpió el asset y el `portraitAssetId` de prueba después de verificar.
- **Backfill de imágenes ya existentes** (`prisma/backfillWebp.ts`, nuevo — `pnpm run images:backfill-webp`): recorre todos los `Asset` con `kind: IMAGE` que no sean ya webp y los convierte in-place (actualiza `data`/`mime`/`size`/`originalName`), con manejo de errores por fila (uno que falle no aborta el resto) y sin envolver todo en una transacción (evita el mismo problema de timeout de 5s ya visto en el import de journal). Ejecutado contra la base de datos real con confirmación explícita del usuario: **77/78 imágenes convertidas, 18.2MB → 3.7MB (-79.6%)**.
  - **1 fallo, causa identificada y no relacionada con este cambio**: el asset `cmrcjxcsp000c11fulin5avt4` (`image/jpeg`, `size: 281431` en la fila pero `data: NULL` real) — un dato preexistente corrupto/incompleto, no algo que este backfill haya tocado o roto (el script lo saltó limpiamente sin afectar al resto del lote). Está asignado como retrato activo de un personaje llamado "XxAlbertoPro01xX" (`cmrcjxc7r000911fu7m0df1du` — un duplicado del `XxAlbertoPro01xX` de "Grupo Demo"; probablemente de los grupos de prueba de sesiones anteriores mencionados más abajo en "Datos de prueba en Neon"). Como `GET /assets/:id/raw` ya comprobaba `!asset.data` y devuelve 404 en vez de crashear, ese personaje ya mostraba el retrato roto/ausente antes de este cambio. Pendiente: decidir si limpiar ese `portraitAssetId` (dejaría el fallback de iniciales) — no se ha tocado sin confirmación explícita por ser un hallazgo aparte, no parte de lo pedido.

`typecheck`/`lint`/`test`/`build` limpios.

### ✅ El Master puede borrar fichas de personaje + huecos de conjuro (nivel 1-7)

- **Borrar personaje** (solo Master, con confirmación): `DELETE /characters/:id` gateado por `requireCharacterMaster` (no por `requireCharacterMasterOrOwner` — el dueño de la ficha, si no es Master, no puede borrarla). `characterService.deleteCharacter` borra primero los `Asset` de la galería/retrato (`characterId`, que solo tienen `ON DELETE SET NULL` — se borrarían huérfanos si no) y luego la `CharacterSheet` en una única `$transaction` (dos statements simples, sin riesgo de timeout); el diario personal cae en cascada solo (`JournalEntry.characterId` ya tenía `ON DELETE CASCADE`). Frontend: botón "Borrar" en el roster de `GroupDetailPage.tsx`, que abre un panel de confirmación explícito (mensaje de aviso + "Confirmar borrado"/"Cancelar") antes de ejecutar — a diferencia de las demás acciones destructivas de la app (expulsar miembro, borrar página de journal, borrar imagen), que sí actúan al instante; se decidió así explícitamente por ser más destructivo que esas.
- **Huecos de conjuro nivel 1-7** (`CharacterSheet.spellSlots Json?`, migración `20260711114931_character_spell_slots`): el .md de Foundry no trae de forma fiable el máximo real por nivel (depende de clase/nivel/multiclase — la fixture de prueba trae `spells.spellN.value: 0` sin ningún `max`), así que tanto "usados" como "máximo" son editables a mano para cada nivel, con 0 usados / 4 máximo por defecto hasta que se toquen — mismo espíritu que los PG, pero aquí ni siquiera el máximo se puede derivar. `PATCH /characters/:id/spell-slots` (body `{ level, used?, max? }`, al menos uno de los dos) gateado por `requireCharacterMasterOrOwner` (igual que PG). Frontend: panel "Huecos de conjuro" al principio de la pestaña Spellbook, con botones +/- por nivel/campo que guardan al momento de cada click (ver el fix del mismo día más abajo — la versión original con inputs de texto que guardaban en `onBlur` se cambió por esto).

Verificado en navegador: edición de "usados" y de "máximo" por separado para varios niveles, persisten tras recargar; un jugador normal (ni dueño ni Master) recibe 403 tanto al intentar borrar el personaje como al intentar tocar sus huecos de conjuro; el borrado se probó duplicando el personaje real a un grupo de prueba nuevo y borrando la copia — confirmado en la UI (desaparece de la lista, toast de éxito) y en la base de datos (fila de `CharacterSheet` fuera, `JournalEntry` personal fuera, sin `Asset` huérfanos). `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Tres fixes: huecos de conjuro que no guardaban, popup de imágenes, multiclase

- **Fix: los huecos de conjuro no se guardaban.** Causa: el diseño original guardaba en `onBlur` del `<input type="number">`; usar las flechitas nativas del input (o navegar fuera de la página) nunca dispara `blur`, así que ese cambio se perdía en silencio. Arreglado sustituyendo los inputs de texto por botones +/- (`SpellSlotStepper` en `CharacterSheetPage.tsx`): cada click dispara la mutación al momento, sin depender de ningún evento de foco. Verificado con varios clicks seguidos y comprobando el valor persistido vía API tras cada uno.
- **Popup de imágenes de personaje** (a petición del usuario — antes la galería crecía en línea junto al retrato y podía empujar contenido si había muchas imágenes): `CharacterImageManager.tsx` ahora es solo un botón "Cambiar imagen"; al pulsarlo abre `CharacterImageModal`, un popup con el mismo patrón glassmorphism que `CharacterProfileModal` (`backdrop-blur-sm` en el scrim, `backdrop-blur-xl` en la tarjeta, cierre con ×/click fuera/Escape, scroll del body bloqueado mientras está abierto). La galería vive dentro de un contenedor `overflow-y-auto` con altura máxima (`max-h-[80vh]` en el modal), así que con muchas imágenes se scrollea en vez de crecer y empujar nada. Subir/marcar como principal/borrar imagen funcionan igual que antes, solo que ahora dentro del popup.
- **Fix: multiclase mostraba solo la última clase con la suma de niveles.** `CharacterSheet.className`/`level` solo guardan la clase "original" (`details.originalClass` de Foundry) + el nivel TOTAL sumado entre todas las clases (`totalLevelFromItems` en `foundryParser.ts`, que sí suma bien) — para un personaje multiclase eso mezclaba el nombre de una sola clase con la suma de todas (p. ej. "Bárbaro 5" para un Pícaro 3/Bárbaro 2). El desglose real por clase ya vivía en `character.items` (cada clase es un item `type: "class"` con su propio `system.levels`), solo no se mostraba. Verificado añadiendo una segunda clase de prueba a los items del personaje real, confirmando el desglose en la ficha, y revirtiendo el dato de prueba después.

`typecheck`/`lint`/`test`/`build` limpios.

### ✅ Fix: PG máximos mal calculados en personajes multiclase (import) + desglose de clases también en los listados

Reportado por el usuario con un caso real ("Dominz", Bárbaro/Pícaro): la ficha mostraba 42/50 de PG, pero el `.md` traía `hp.value: 42` y **`hp.max: 42`** (no `null` como en la ficha de ejemplo usada para tests).

- **Causa**: `parseFoundryMd` nunca leía `system.attributes.hp.max` del `.md` — siempre recalculaba el máximo con `maxHitPoints()`, que asume que **todos** los niveles usan el dado de golpe de una sola clase (la "original", vía `details.originalClass`). Para Dominz eso aplicaba el d12 de Bárbaro a los 5 niveles totales (3 de Pícaro + 2 de Bárbaro), dando 50 en vez de los 42 reales que Foundry sí calcula bien mezclando ambos dados.
- **Fix** (`foundryParser.ts`): se usa el `hp.max` real de Foundry cuando viene relleno (como en este caso), y solo se cae a la fórmula de un solo dado cuando Foundry no lo trae (la ficha de ejemplo de un solo dado sigue trayendo `null`, así que no cambia). Dos tests nuevos reproducen exactamente el caso multiclase (con y sin `hp.max` presente). **Solo afecta a importaciones/reimportaciones nuevas** — los personajes ya importados necesitan un "Actualizar .md" para recalcular su PG máximo con el valor correcto (se ofreció un backfill directo sin necesitar el `.md` original, ya que `rawSystem.attributes.hp.max` ya está guardado, pero el usuario prefirió que cada Master lo arregle reimportando).
- **Multiclase también en los listados** (no solo en la ficha detallada, que ya se había arreglado antes): el desglose por clase (`classBreakdown()`, ahora en `foundryParser.ts` en vez de en el frontend) se calcula **server-side** una sola vez y se expone como campo `classes: {name, level}[]` en `CharacterFull`, `CharacterListItem` y `CharacterRosterEntry` (este último `nullable`, oculto para acceso `LIMITED` igual que `className`/`level`). Sustituye al `classBreakdown()` que antes vivía en `web/src/features/characters/foundryDisplay.ts` y solo se usaba en la ficha detallada — ahora una única fuente de verdad reutilizada en ficha, roster de grupo (`GroupDetailPage.tsx`) y "Mis personajes" (`MyCharactersPage.tsx`).

Verificado en navegador añadiendo una segunda clase de prueba al personaje real y confirmando "Hechicero 4 / Bárbaro 2" en los tres sitios (ficha, roster de grupo, mis personajes), revirtiendo el dato de prueba después. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Música ambiente por grupo (reproductor de YouTube solo-audio)

A petición del usuario: cada grupo puede tener listas de música ambiente ("Taberna", "Combate", "Bosque"...) con tracks de YouTube, reproducidos uno a la vez (sin capas simultáneas) y sin vídeo visible. Por defecto solo el Master puede gestionar la música; puede delegar ese permiso a jugadores concretos.

- Prisma (migración `20260712185813_group_music`): `GroupMember.canEditMusic Boolean @default(false)` (el Master siempre tiene permiso implícito, sin necesidad de este flag) y los modelos nuevos `MusicPlaylist`/`MusicTrack` (`groupId`/`playlistId` con `onDelete: Cascade`, campo `order` para orden futuro).
- `shared/src/music.ts`: schemas zod de playlists/tracks/permiso, y `extractYoutubeId(url)` — parseo por regex puro (no `URL`/`URLSearchParams`, no disponibles en el typecheck de `shared` por su `tsconfig.build.json` con `"types": []`) que cubre `youtube.com/watch?v=`, `youtu.be/`, `/embed/` y rechaza dominios que no son de YouTube aunque tengan un `v=` parecido en la query.
- Backend: `requireGroupMusicEdit` (nuevo middleware, Master **o** `membership.canEditMusic`) gatea las 6 rutas CRUD de `server/routes/music.ts`; `PATCH /groups/:id/members/:userId/music-permission` (solo Master, vía `requireGroupMaster`) activa/desactiva el flag por miembro. `GroupDetail.members[].canEditMusic` viaja en el DTO para que el frontend pinte el checkbox sin pedir nada aparte.
- Frontend: `useAmbientPlayer.ts` crea un `YT.Player` oculto (YouTube IFrame API) y expone controles imperativos (`play`, `togglePlayPause`, `stop`, `setVolume`) vía refs para evitar closures obsoletos; `GroupMusicPage.tsx` monta las listas con crear/renombrar/borrar playlist y añadir/borrar track (solo si `canEdit`), más una barra "reproduciendo ahora" con play/pausa/volumen/detener. Checkbox de permiso por miembro en `GroupDetailPage.tsx`, visible solo para el Master.
- **Bug encontrado y arreglado durante la verificación**: el `<div>` oculto con el `ref` del player de YouTube solo se renderizaba en el JSX **después** del `if (isLoading) return <SkeletonPage />` de `GroupMusicPage`. El `useEffect` de montaje de `useAmbientPlayer` (deps `[]`, se ejecuta una sola vez) veía `containerRef.current === null` durante ese primer commit en loading y, al tener deps vacías, nunca se volvía a ejecutar cuando los datos cargaban y el `<div>` real aparecía — el player de YouTube nunca llegaba a crear su iframe, sin ningún error en consola. Arreglado renderizando ese `<div>` oculto de forma incondicional (antes de los `return` tempranos de loading/error) en `GroupMusicPage.tsx`, para que `containerRef.current` sea siempre un nodo real por el primer commit del hook. **Patrón a recordar**: un hook con un `useEffect(..., [])` que depende de un ref solo funciona de forma fiable si el elemento con ese ref está garantizado en el árbol desde el primer render del componente que lo monta — si hay un `return` condicional (loading/error) antes del elemento, hay que sacar ese elemento fuera de la condición, no confiar en que el efecto se re-ejecute solo.

Verificado en navegador con dos usuarios reales (Master y un jugador nuevo unido por código de invitación): tras el fix, reproducir un track crea un iframe real de YouTube (confirmado inspeccionando el DOM) y llega a estado `PLAYING`; pausa/reanuda/detener funcionan y actualizan la UI; el jugador sin `canEditMusic` no ve "Nueva lista" ni controles de edición y recibe `403 NOT_ALLOWED` llamando a la API directamente; al activar el checkbox desde el Master, el mismo jugador puede crear una playlist al momento (confirmado con toast y refetch). `typecheck`/`lint`/`test` limpios; `build` completo (`prisma generate` + migrate deploy) no se pudo re-ejecutar en esta verificación por un lock de Windows sobre el `.dll` de Prisma con el servidor dev corriendo (ya se había ejecutado con éxito al añadir la migración), pero el build de `web` (`tsc --noEmit && vite build`) sí se verificó limpio tras el fix.

### ✅ Confirmación antes de las acciones destructivas que actuaban al instante

A petición del usuario: hasta ahora solo "Borrar personaje" pedía confirmación explícita; expulsar/salir de un grupo, borrar playlist/track de música, borrar imagen de personaje y borrar página de journal actuaban al primer click, sin paso intermedio.

- `ConfirmPanel.tsx` (nuevo, en `components/ui/`): panel reutilizable con mensaje de aviso + botones "Confirmar"/"Cancelar", mismo patrón visual que ya usaba el borrado de personaje (ahora refactorizado para usar este componente en vez de tener su propia copia). Se activa con un `useState` local por elemento (`confirmingId`) que se alterna al pulsar el botón destructivo, en vez de disparar la mutación directamente.
- Aplicado en: `GroupDetailPage.tsx` (expulsar miembro / salir del grupo — mensaje distinto según sea uno mismo u otro jugador; borrar personaje, refactorizado), `GroupMusicPage.tsx` (borrar playlist, borrar track individual), `JournalPageView.tsx` (borrar página — compartido entre journal de grupo y personal, así que el fix cubre ambos con un solo cambio).
- **Excepción**: borrar una imagen de la galería de personaje (`CharacterImageManager.tsx`) usa un overlay compacto ("¿Borrar?" + ✓/✕) directamente sobre la miniatura en vez del panel completo, porque las miniaturas viven en un grid apretado sin espacio debajo para un panel con texto.

Verificado en navegador (usuario real, cancelando y confirmando cada acción): cancelar dejaba el elemento intacto en los 6 casos; confirmar borraba de verdad con el toast esperado (probado borrando un track y una imagen de prueba reales, expulsando a un jugador de prueba del grupo, y borrando una página de journal creada y destruida solo para esta verificación). `typecheck`/`lint`/`test`/`build` (workspace `web`) limpios.

### ✅ Reproductor de música: controles reales, playlist colaborativa, auto-avance y persistencia entre páginas

Evolución del reproductor de música ambiente (a petición del usuario): controles de icono de reproductor de verdad en vez de texto, listas "abiertas" donde cualquier miembro puede añadir canciones (como una cola colaborativa de Spotify), avance automático en orden con reproducción aleatoria y bucle por canción, y una mini-barra inferior persistente para que la música siga sonando al navegar a otra página.

- Prisma (migración `20260712204400_music_open_playlist_loop_owner`): `MusicPlaylist.openToAll Boolean @default(false)`; `MusicTrack.loop Boolean @default(false)` y `MusicTrack.addedByUserId String?` (+ relación `addedBy`/back-relation `User.addedTracks`, `onDelete: SetNull`).
- **Lista abierta**: toggle por lista (no una cola fija separada) — el Master marca una lista existente como "abierta" y cualquier miembro puede añadirle tracks sin tener `canEditMusic`; borrar/renombrar la lista y borrar tracks ajenos sigue restringido. Un jugador sin `canEditMusic` **sí puede borrar los tracks que él mismo añadió** (se guarda `addedByUserId` al crear el track). Backend: `addTrack`/`deleteTrack` en `musicService.ts` ahora reciben `userId`+`membership` y resuelven el permiso fino ellos mismos (Master/`canEditMusic`/`playlist.openToAll`/`track.addedByUserId === userId`); sus rutas pasaron de `requireGroupMusicEdit` a `requireGroupMember` porque el permiso ya no se puede decidir solo con el rol. Nuevas rutas `PATCH .../playlists/:id/open-to-all` (gateada por `requireGroupMusicEdit`) y `PATCH .../tracks/:id/loop` (gateada solo por `requireGroupMember` — el bucle es una preferencia de escucha compartida y reversible, no una edición de contenido, así que cualquier miembro puede tocarla).
- **Reproductor global persistente**: el `YT.Player` oculto vivía dentro de `GroupMusicPage` y se destruía al navegar. Se subió a un Context (`AmbientPlayerContext.tsx`, mismo patrón que `AuthContext.tsx`) montado en `AppLayout.tsx` — como `AppLayout` envuelve todas las rutas autenticadas vía `<Outlet/>` y nunca se desmonta entre ellas, el player sobrevive a la navegación. `useAmbientPlayer.ts` se simplificó a un wrapper tonto del IFrame de YouTube que solo avisa vía `onEnded` (ya no decide "qué toca después" — eso vive ahora en el contexto, que conoce la playlist activa, el shuffle y el bucle). Nueva barra `MiniPlayerBar.tsx` fija abajo del todo (`z-30`, por debajo de modales `z-40`/toasts `z-50`), colapsada por defecto, expandible con los controles completos y un link de vuelta a `/groups/:id/music` — mismo componente en escritorio y móvil.
- **Auto-avance / aleatorio / bucle**: al terminar un track (o al pulsar "siguiente"/"anterior" manualmente), si el track actual tiene bucle activado **y el avance es automático** se repite solo; si no, con shuffle activo salta a un track aleatorio distinto (con una pila de historial para que "anterior" tenga sentido); si no, avanza por orden con wrap-around al primero tras el último (para que la ambientación de una sesión larga no se pare sola). El botón manual "siguiente" siempre cambia de canción aunque la actual tenga bucle — el bucle solo se respeta al terminar sola, igual que en un reproductor real.
- Nuevos iconos de reproductor (`PlayerIcons.tsx`, SVG inline con `currentColor`, sin dependencia nueva) y `PlayerControls.tsx` (fila de controles compartida entre la tira "reproduciendo ahora" de `GroupMusicPage` y el panel expandido de `MiniPlayerBar`, para no mantener dos implementaciones visuales distintas de lo mismo).
- **Patrón a recordar**: al conectar un `onEnded`/callback de un hook de bajo nivel (`useAmbientPlayer`) con lógica de más alto nivel que necesita leer el propio resultado de ese hook (`player.play`), hay una dependencia circular — el callback se define antes de tener `player`, pero necesita llamarlo. Se resolvió con un `playRef` (ref asignado tras obtener `player`, leído desde dentro del callback) en vez de reordenar con `useCallback`+`eslint-disable-next-line react-hooks/exhaustive-deps` (evitado a propósito, ver gotcha ya conocido de esta sesión sobre esa regla).

Verificado en navegador con dos usuarios reales (Master + jugador sin `canEditMusic`, unido por código de invitación): con 3 tracks en una lista, "siguiente"/"anterior" ciclan en orden con wrap-around en ambos sentidos; shuffle activado salta aleatorio y "anterior" vuelve por el historial en vez de repetir; marcar bucle en un track persiste tras recargar la página y sobrevive a un cambio de track manual (el bucle no bloquea "siguiente"); activar "Cualquiera puede añadir canciones" permite al jugador sin permiso añadir un track (aparece "· añadido por su_usuario"), le muestra el botón de borrar solo en ese track suyo, y un intento directo por API de borrar un track ajeno devuelve `403 NOT_ALLOWED`; reproducir un track y navegar (con clicks reales de navegación SPA, no recarga completa) a `/groups` y de vuelta mantiene la mini-barra sonando con el mismo iframe (confirmado que no se recrea), expandirla muestra los controles completos y el link vuelve a la página de música; en viewport 375px la barra colapsada y expandida caben sin overflow horizontal. `typecheck`/`lint`/`test`/`build` (workspace `web`) limpios.

### ✅ Marca visual de "activado", rediseño de la mini-barra y limpieza de duplicados

Tres retoques rápidos sobre el reproductor, a petición del usuario tras probarlo:

- **Marca visual de estado activo**: los botones de shuffle y bucle (en `PlayerControls.tsx` y en el botón de bucle por track de `GroupMusicPage.tsx`) solo cambiaban a un color de texto apagado al activarse — fácil de no notar. Ahora se rellenan sólidos en oxblood con un anillo dorado sutil (mismo lenguaje visual que el botón primario de la app), y la fila del track que suena ahora mismo también se resalta con un fondo e inset-shadow en vez de solo cambiar el color del texto.
- **Mini-barra sin desplegable**: la barra inferior escondía los controles completos tras un toggle de expandir/colapsar — al pulsarlo solo repetía lo mismo con más botones, sin aportar nada. Ahora todos los controles están siempre visibles (shuffle/anterior/play/siguiente/bucle/volumen), el link de vuelta a `/groups/:id/music` es un botón con borde (mismo estilo que los del menú del grupo) en vez de un link con flecha, el título usa un nuevo `MarqueeText.tsx` que desliza el texto de un lado a otro (ida y vuelta, con una pausa en cada extremo — CSS puro, `@keyframes marquee-track` en `index.css`, respeta `prefers-reduced-motion`) solo cuando no cabe entero, y se añadió una barra de progreso con tiempo transcurrido/total y seek (arrastrar para saltar) — `useAmbientPlayer.ts` gana `currentTime`/`duration` (poll cada 500ms vía `getCurrentTime()`/`getDuration()` de la IFrame API, no hay evento de progreso nativo) y `seekTo`.
- **Quitada la tira "reproduciendo ahora" de `GroupMusicPage`**: con la mini-barra siempre visible y completa, esa tira duplicaba exactamente los mismos controles justo debajo del título de la página.

Verificado en navegador: shuffle/bucle muestran el relleno sólido al activarse; con un título largo el ticker se desliza y se ve el tramo final tras unos segundos; arrastrar la barra de progreso salta el vídeo de YouTube al segundo indicado; en 375px la barra (siempre expandida) cabe sin overflow; ya no aparece ningún bloque de controles duplicado en `GroupMusicPage`. `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Pasada de responsive para el Master: filas que se comprimían en móvil

A petición del usuario ("no quiero que se vean los campos comprimidos... esto le suele pasar más al Master"): varias filas de listas forzaban demasiados elementos en una sola línea sin permitir que envolvieran, así que en viewport estrecho el texto se partía a media palabra o los botones encogían hasta que su propio texto se partía en dos líneas. Como sospechaba el usuario, casi todos los casos eran controles que **solo ve el Master** (más elementos por fila que un jugador normal). Auditado con `getBoundingClientRect()` en cada fila a 375px (la herramienta de captura de pantalla no estuvo disponible en toda la sesión) en vez de solo mirar capturas.

- `GroupDetailPage.tsx`: la fila de un miembro (usuario + rol + checkbox "Gestiona música" + Expulsar, todo visible solo para el Master) forzaba el texto de la etiqueta del checkbox a partirse en dos líneas. La fila de personaje (Actualizar .md + Borrar, Master-only) hacía lo mismo con el propio texto del botón "Actualizar .md". Fix en ambas: el contenedor gana `flex-wrap`, y el grupo de controles usa `whitespace-nowrap` (miembro) o `w-full sm:w-auto` (personaje) para bajar a su propia fila completa en vez de encogerse hasta partirse.
- `MyCharactersPage.tsx`: mismo patrón con el botón "Añadir a otro grupo" partiéndose en dos líneas — mismo fix (`flex-wrap` + `w-full sm:w-auto` + `truncate` en nombre/subtítulo).
- `GroupsPage.tsx`: un nombre de grupo largo partía la fila entera en 3 líneas de texto en vez de truncarse. Fix: `flex-wrap` + el nombre ahora trunca (`min-w-0 flex-1 truncate`) y el rol/nº de miembros pasa a su propia línea si no cabe.
- `GroupMusicPage.tsx`: el título del track + "· añadido por" llevaban `truncate` en un `<span>` dentro de un botón `flex`, pero sin `min-w-0` — en flexbox un hijo no encoge por debajo de su contenido por defecto, así que el `truncate` nunca llegaba a activarse y un título largo desbordaba silenciosamente fuera de la fila (sin scroll horizontal visible porque el resto del layout seguía usando `overflow` normal, pero sí "perdido" visualmente). Fix: `min-w-0` en el botón y en el `<span>` interno.
- `JournalPageView.tsx`: el título de una página larga se comprimía en una columna estrecha junto a Editar/Borrar (hasta 7 líneas envueltas en un espacio de ~200px) porque los botones nunca bajaban de línea. Fix: `flex-wrap` en la cabecera + los botones pasan a `w-full sm:w-auto` — el título ahora usa el ancho completo de la fila (menos líneas envueltas) y los botones quedan debajo en su propia fila completa.

Verificado en navegador a 375px con datos de prueba reales (segundo jugador unido al grupo para poder ver la fila de "Gestiona música" + Expulsar; nombres de grupo/track/página deliberadamente largos): las 6 filas corregidas muestran su texto en una sola línea (o truncado con "…"), sin ningún botón partido a media palabra; `document.body.scrollWidth` sigue igual a `window.innerWidth` en todas las páginas tocadas (sin overflow horizontal de página). `typecheck`/`lint`/`test`/`build` limpios.

### ✅ Editar canciones y quitar el bucle duplicado de cada fila (partes 1-2 de 7)

Primeras dos de siete funcionalidades pedidas por el usuario para música/fichas de personaje, implementadas una a una:

- **Editar canciones** (título/enlace): nuevo `PATCH /groups/:groupId/music/tracks/:trackId` (`updateTrack` en `musicService.ts`) con el mismo criterio de permiso que borrar (Master/`canEditMusic`/quien añadió el track). `updateTrackSchema` en `shared/src/music.ts` reutiliza la forma de `addTrackSchema`. En `GroupMusicPage.tsx`, pulsar "Editar" en una fila sustituye su contenido por `EditTrackForm` (mismo patrón inline-form ya usado para renombrar lista/añadir track); el campo de enlace se rellena reconstruyendo la URL canónica a partir del `youtubeId` guardado (`https://www.youtube.com/watch?v=...`), ya que la DB nunca guarda la URL original pegada.
- **Quitado el botón de bucle por track**: cada fila de track tenía su propio botón de bucle, duplicando el que ya existe en la mini-barra del reproductor (`PlayerControls.tsx`, siempre visible mientras suena música). Se quitó el botón, el prop `onToggleTrackLoop` y el import de `RepeatIcon` de `GroupMusicPage.tsx` — el bucle ahora solo se controla desde el reproductor, donde tiene sentido (afecta al track que está sonando, no a uno cualquiera de la lista).

Verificado en navegador: edición de título feliz (toast "Track actualizado."), rechazo de URL de YouTube inválida (422, el formulario no se cierra); tras quitar el botón de bucle, la fila de un track ya no lo muestra pero la mini-barra inferior sigue ofreciendo "Repetir este track" con normalidad. `typecheck`/`test` limpios.

---

## Qué queda por hacer

- **Vercel Blob**: sigue en pausa (ver `lib/storage.ts`). Reactivar solo si algún día hace falta subir archivos individuales de más de ~4 MB.
- **Verificar Fase 6 con un `.zip` real**: se probó con un `.zip` sintético construido a mano; si tienes un export real de Obsidian/Foundry, conviene correrlo una vez para pillar casos raros (nombres de página con caracteres especiales, jerarquías más profundas, PDFs embebidos en vez de solo imágenes).
- **Code splitting**: `vite build` avisa de un chunk de ~557 kB (172 kB gzip). No es bloqueante, pero si crece más conviene `manualChunks` o `dynamic import()` para las rutas menos usadas (journal, ficha).
- **Datos de prueba en Neon**: además de los datos previos (`prod_*`, `wake_*`, `journalmaster`, "Grupo Producción", "Grupo Journal Browser"), la verificación de la Fase 7 creó "Grupo Fase 7 Test" (vacío, bajo `journalmaster`) y, bajo el usuario semilla `master@demo.local`/`demo1234`, un personaje importado del fixture en "Grupo Demo" y un `JournalEntry` "Diario de prueba" con una página editada. También existe `player-test@demo.local`/`demo1234` (usuario de prueba, jugador de "Grupo Demo") y "Grupo Test Borrado" (vacío, bajo `master@demo.local` — quedó tras verificar el borrado de personajes; no hay endpoint para borrar grupos). Al verificar la música ambiente se creó además `musictest@example.com`/`TestPassword123!` (`music_test_player`) para probar el permiso `canEditMusic` — se expulsó de "Grupo Test Borrado" al terminar, así que la cuenta existe pero no pertenece a ningún grupo. Al verificar las confirmaciones de borrado, el personaje real "XxAlbertoPro01xX" de "Grupo Demo" (`cmrdqzgnu0008e3km0hv1izrw`) se quedó con un retrato de prueba (PNG 1x1 transparente, convertido a webp) como imagen activa — no se pudo revertir a "sin retrato" porque la API no expone forma de desasignar el retrato sin asignar otro primero (`PATCH /characters/:id/portrait` exige un `assetId`, no acepta null); sustituye una imagen manualmente si quieres restaurarlo. Al verificar la pasada de responsive se creó además "Un nombre de grupo demasiado largo para probar movil" (bajo `master@demo.local`, vacío) para reproducir el bug de nombres de grupo largos — como no hay endpoint para borrar grupos, el usuario prefirió dejarlo así en vez de renombrarlo (2026-07-13). Limpiar si se quiere una base limpia antes de usarla de verdad.
- **Personaje duplicado con retrato roto**: existe un segundo personaje llamado "XxAlbertoPro01xX" (`cmrcjxc7r000911fu7m0df1du`, distinto del de "Grupo Demo") cuyo retrato apunta a un `Asset` con `data: NULL` — un dato corrupto de antes de esta sesión, no causado por ningún cambio reciente. El usuario pidió explícitamente dejarlo así por ahora (2026-07-11); no tocar sin que lo pida.
- **Warning conocido e inofensivo**: ESLint marca `react-refresh/only-export-components` en `web/src/context/AuthContext.tsx` y en `web/src/components/ui/Toast.tsx` (mismo patrón Context+hook en un archivo). No es un error.
- **Personajes ya importados con PG máximo mal calculado (multiclase)**: el fix del cálculo de PG máximo (ver sección de arriba) solo aplica a partir de ahora. Cualquier personaje multiclase importado antes de este fix (como "Dominz") sigue con el PG máximo viejo hasta que su Master haga "Actualizar .md" con el `.md` más reciente — el usuario prefirió dejarlo así en vez de un backfill automático.
