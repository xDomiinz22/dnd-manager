# Design

## Theme: "Tomo del Jugador" (Player's Handbook tome)

Página de libro físico, no dashboard. Pergamino envejecido, tinta oxblood, dorado a lámina. Ver PRODUCT.md → Brand Personality para la referencia completa.

## Color

OKLCH-derived, valores finales en hex verificados por contraste (ver tabla abajo). Tailwind theme extendido con estos nombres (no se usan `slate`/`amber` de Tailwind en adelante).

| Token             | Hex                     | Uso                                                                                                                      |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ink`             | `#2A1B12`               | Texto de cuerpo, iconos primarios.                                                                                       |
| `ink-muted`       | `#6B5640`               | Texto secundario/metadata.                                                                                               |
| `parchment`       | `#F0E4C8`               | Fondo de página.                                                                                                         |
| `parchment-panel` | `#E4D3A6`               | Fondo de tarjetas/paneles (una capa más oscura que la página).                                                           |
| `parchment-deep`  | `#D8C08A`               | Hover de panel, franjas de tabla, estados activos suaves.                                                                |
| `oxblood`         | `#6B1620`               | Acento primario: botones, links, estados activos, foco.                                                                  |
| `oxblood-dark`    | `#4A0F16`               | Hover/pressed de oxblood; texto de error.                                                                                |
| `oxblood-light`   | `#8B2430`               | Variante clara de oxblood (uso puntual sobre superficies oscuras).                                                       |
| `gold`            | `#A8792B`               | Filetes, bordes, iconos, texto grande/decorativo (≥18px). **Nunca texto de cuerpo ni etiquetas pequeñas** (falla 4.5:1). |
| `gold-bright`     | `#C99A3E`               | Highlights decorativos, glow de hover — no texto (falla incluso 3:1).                                                    |
| `border`          | `#C4AF7C`               | Filete decorativo por defecto.                                                                                           |
| `border-strong`   | `#6B5640` (= ink-muted) | Borde de campos de formulario (necesita ser perceptible).                                                                |

**Contraste verificado** (WCAG, `Lc = (L1+0.05)/(L2+0.05)`):
`ink`/`parchment` 13.16:1 · `ink`/`parchment-panel` 11.21:1 · `ink-muted`/`parchment` 5.49:1 · `ink-muted`/`parchment-panel` 4.68:1 · `oxblood`/`parchment` 9.45:1 · `oxblood`/`parchment-panel` 8.05:1 · `parchment`/`oxblood` (texto claro sobre botón) 9.45:1 · `gold`/`parchment` 3.06:1 (falla 4.5, pasa 3:1 para texto grande/UI) · `gold-bright`/`parchment` 2.03:1 (no usar como texto, ni siquiera grande).

Sin modo oscuro en esta iteración (la dirección elegida es explícitamente de página clara). Si se pide más adelante, sería un tema "Mazmorra" independiente, no una inversión automática de estos tokens.

## Typography

- **Display** (`font-display`): **Cinzel** (Google Fonts). Mayúsculas/versalitas romanas grabadas. Uso: h1/h2 de página, nombres de personaje, títulos de sección — con moderación, nunca en párrafos.
- **Body/UI** (`font-body`): **EB Garamond** (Google Fonts), pesos 400/500/600/700 + itálica 400. Uso: párrafos, labels, botones, tablas, inputs. `font-variant-numeric: tabular-nums` en cifras de stats para alineación.
- Solo dos familias — la jerarquía adicional (stats, metadata) se resuelve con peso/tamaño, no una tercera fuente.
- `text-wrap: balance` en h1–h3; `text-wrap: pretty` en prosa larga (journal).

## Layout & Components

- **Radio de borde**: pequeño (2–4px, "papel recortado"), no el `rounded-lg` (8px) genérico anterior.
- **Tarjetas** (`Card`): fondo `parchment-panel`, borde 1px `border`, sin sombra dura — en su lugar un vignette sutil (radial-gradient hacia las esquinas) que sugiere borde de página gastado. Generado con CSS, sin imagen.
- **Encabezado de capítulo** (patrón repetido en cada H1 de página): título en Cinzel + filete doble dorado debajo (dos líneas finas, gruesa/fina) — mismo tratamiento visual en Grupos, Ficha de personaje, Journal, etc.
- **Botón primario**: fondo `oxblood`, texto `parchment` (9.45:1), borde interior 1px `gold` sutil. Hover → `oxblood-dark`. Foco visible con anillo `oxblood` (offset), no el ámbar anterior.
- **Botón secundario**: borde `oxblood`, texto `oxblood`, fondo transparente/`parchment-panel`.
- **Inputs**: fondo `parchment` (más claro que el panel que los contiene, como un espacio en blanco para escribir), borde `border-strong`, foco → borde `oxblood` + halo suave.

## Signature element

**Letra capital iluminada**: el primer párrafo del contenido de una página de journal (la parte más "prosa" de la app) recibe una letra capital grande en Cinzel, color `oxblood`, ocupando 2-3 líneas de alto (`::first-letter` + wrapper). Es el único sitio de la app con este tratamiento — el resto de la interfaz se queda disciplinado en la jerarquía tipográfica normal. Combinado con el encabezado de capítulo, es lo que hace que la app se sienta "un tomo", no un efecto decorativo suelto.

## Motion

Mínimo y funcional (hover/focus transitions ya existentes, easing suave). No se añade motion nuevo en esta pasada — el peso del rediseño está en color/tipografía/layout, no en animación. `prefers-reduced-motion` respetado donde ya se aplica.
