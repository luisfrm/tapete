# El Tapete 🃏

Colección de juegos de mesa y cartas para navegador.

## Stack

- HTML + CSS + JavaScript ES6+ puro — sin frameworks de UI
- Vite como bundler y dev server

## Correr en local

```bash
npm install
npm run dev
```

## Estructura CSS

```
src/styles/
  base.css              ← Design tokens + estilos compartidos (menú, setup, result, toast)
  mayor-menor.css       ← Estilos específicos del juego Mayor o Menor
  escapa-del-lobo.css   ← Estilos específicos de Escapa del Lobo (layout mobile+desktop, SVG)
```

## Estructura del proyecto

```
tapete/
├── index.html
├── assets/
│   ├── mayor-menor/cards/{red,blue,green,yellow}/
│   └── escapa-del-lobo/pieces/{conejo,lobo}/ board/
└── src/
    ├── main.js
    ├── styles/
    │   ├── base.css
    │   ├── mayor-menor.css
    │   └── escapa-del-lobo.css
    ├── core/
    │   ├── EventBus.js        ← pub/sub global
    │   ├── Game.js            ← orquestador del ciclo de vida
    │   └── GameMenu.js        ← registro de juegos
    ├── games/
    │   ├── mayor-menor/       ← lógica pura (Card, Deck, Board, Player, Turn, Game)
    │   └── escapa-del-lobo/   ← lógica + render SVG (EscapaDelLoboGame, Dice, Piece, GameTurn)
    └── ui/
        ├── Renderer.js        ← shell genérico (menú, nav, header)
        ├── BaseGameUI.js      ← contrato base para todas las UIs
        └── games/
            ├── MayorMenorUI.js
            └── EscapaDelLoboUI.js
```

## Agregar un nuevo juego

1. Crear lógica en `src/games/mi-juego/`
2. Crear UI en `src/ui/games/MiJuegoUI.js` extendiendo `BaseGameUI`
3. Crear estilos en `src/styles/mi-juego.css`
4. Agregar import en `index.html`
5. Registrar en `GameMenu.js`
