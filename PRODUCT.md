# Product

## Register

product

## Users

Grupos de Dungeons & Dragons 5e (Masters y jugadores) que usan la app entre sesiones y durante ellas para gestionar fichas de personaje, journals de campaña y la logística del grupo (miembros, invitaciones). Se abre en portátil o móvil, a veces con la mesa de juego físicamente delante.

## Product Purpose

Sustituir hojas de personaje en papel/PDF sueltas y journals dispersos por un espacio centralizado por grupo: importar fichas del export de Foundry, llevar el registro vivo de una campaña (journal con wiki-links y backlinks) y gestionar quién ve qué ficha.

## Brand Personality

**"Tomo del Jugador"**: la app debe sentirse como tener el manual de reglas físico abierto sobre la mesa, no como una herramienta SaaS genérica. Referencia concreta: el Player's Handbook de D&D 5e — pergamino/vitela envejecida como fondo, tinta oxblood (granate profundo) y dorado a lámina como acentos, tipografía de cabecera tipo grabado (Cinzel) sobre cuerpo de texto en una serif de libro antiguo (EB Garamond). Cada página de la app se trata como un capítulo del tomo: encabezados con filete doble dorado, primera letra iluminada en el contenido de journal (la parte más "prosa" de la app).

Tono: seria/adulta, con peso de objeto físico, nunca infantil ni caricaturesca.

## Anti-references

- El dashboard SaaS genérico oscuro que tenía la app hasta ahora (slate + amber sin identidad propia).
- El cliché de "IA cream default": fondo casi blanco (~#F4F1EA) + serif de alto contraste genérica (Playfair-like) + acento terracota. El pergamino de esta app debe leerse claramente envejecido/tostado, no como un blanco cálido disfrazado.
- Textura de pergamino fotográfica/literal (imagen de "papel viejo" escaneada) — el envejecimiento se transmite con color, tipografía y filetes, no con una textura pegada encima.

## Design Principles

1. **Cada pantalla es una página del tomo, no una vista de dashboard.** Encabezados, filetes y jerarquía deben leerse como partes de un libro real, no como secciones de landing page.
2. **El dorado es lámina, no texto.** Reservado para filetes, bordes, iconos y texto grande/decorativo — nunca para texto de cuerpo o etiquetas pequeñas (falla contraste WCAG por diseño; verificado, ~3:1 sobre pergamino).
3. **Un solo elemento ornamental por vista.** El sistema es rico (color, tipografía, filetes) pero cada pantalla concreta gasta su "atrevimiento" en un solo lugar (la letra capital, el encabezado de capítulo), el resto queda disciplinado.
4. **La app sigue siendo una herramienta de mesa de juego.** Legibilidad y velocidad de escaneo (fichas, tablas de habilidades, stats) priman sobre la ambientación cuando compiten.

## Accessibility & Inclusion

WCAG AA como mínimo (heredado del trabajo previo de accesibilidad de la app: foco visible, `aria-live` en toasts, roles ARIA en tabs). Todo el texto de cuerpo ≥4.5:1 sobre su fondo; el dorado, al no alcanzar ese ratio, se limita a usos no-textuales o texto grande/decorativo (≥3:1). `prefers-reduced-motion` respetado si se añade cualquier animación.
