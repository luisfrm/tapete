import { Card } from './Card.js';

/**
 * Board — Tablero de juego NxN
 *
 * @param {number} size      - Tamaño del tablero (default 3 → 3×3)
 * @param {object} config
 * @param {string} config.assetPath - Ruta a la imagen de fondo del tablero
 * @param {object} config.variants  - Mapa de variantes para las cartas iniciales
 */
export class Board {
  constructor(size = 3, config = {}) {
    this.size      = size;
    this.assetPath = config.assetPath ?? null;
    this.variants  = config.variants  ?? {};
    this.grid      = [];
  }

  /**
   * Rellena el tablero con cartas aleatorias dentro del rango [min, max].
   * @param {number} min
   * @param {number} max
   */
  init(min = 1, max = 9) {
    this.grid = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => {
        const value        = Math.floor(Math.random() * (max - min + 1)) + min;
        const cardVariants = this.variants[value] ?? this.variants;
        return new Card(value, cardVariants);
      })
    );
    return this;
  }

  getCard(row, col)          { return this.grid[row]?.[col] ?? null; }
  replace(row, col, card)    { this.grid[row][col] = card; return true; }

  /** Itera todas las celdas: callback(card, row, col) */
  forEach(callback) {
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        callback(this.grid[r][c], r, c);
  }

  toString() {
    return this.grid.map(row => row.map(c => String(c.value).padStart(2)).join(' ')).join('\n');
  }
}
