// La paleta (ink/parchment/oxblood/gold/rule/moss/ivory/abyss) NO vive aquí:
// se registra vía `@theme` en index.css, con cada token apuntando a una
// variable CSS que cambia con el tema (ver ese archivo). Un intento anterior
// de definirlos aquí como funciones u opacity-string ("<alpha-value>") no
// sobrevivió al puente `@config` de Tailwind 4 — generaba cero utilidades
// sin ningún error visible, así que si se necesita un color nuevo, añadirlo
// en el `@theme` de index.css, no en este archivo.
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        body: ['"EB Garamond"', "serif"],
      },
    },
  },
  plugins: [],
};
