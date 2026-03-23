import { Card } from './Card.js';

/**
 * Deck — Mazo de cartas de un jugador
 *
 * @param {number}   count    - Cantidad de cartas del mazo
 * @param {number}   min      - Valor mínimo de las cartas
 * @param {number}   max      - Valor máximo de las cartas
 * @param {object}   variants - Mapa de assets: { [value]: { red, blue, green, yellow } }
 *                              o mapa plano { red, blue, ... } aplicado a todos los valores
 */
export class Deck {
  #variants;

  constructor(count = 8, min = 1, max = 9, variants = {}) {
    this.#variants = variants;
    this.cards     = this.#build(count, min, max);
  }

  #build(count, min, max) {
    const base = [];
    for (let v = min; v <= max; v++) base.push(v);

    // Rellena hasta tener suficientes cartas y corta al tamaño pedido
    const pool = [];
    while (pool.length < count) pool.push(...base);
    const values = pool.slice(0, count);

    // Fisher-Yates shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    return values.map(v => {
      const cardVariants = this.#variants[v] ?? this.#variants;
      return new Card(v, cardVariants);
    });
  }

  /** Roba la carta superior del mazo. */
  draw() {
    return this.cards.shift() ?? null;
  }

  /** Envía una carta al fondo del mazo. */
  sendToBottom(card) {
    this.cards.push(card);
  }

  get count() { return this.cards.length; }
  isEmpty()   { return this.cards.length === 0; }
  peek()      { return this.cards[0] ?? null; }
}
