/**
 * Card — Carta individual del juego
 *
 * Las variantes son rutas de assets por color. Si no se proveen,
 * se asigna solo color y símbolo CSS.
 *
 * @example
 * const card = new Card(7, {
 *   red:    '/assets/cards/red/7.png',
 *   blue:   '/assets/cards/blue/7.png',
 *   green:  '/assets/cards/green/7.png',
 *   yellow: '/assets/cards/yellow/7.png',
 * });
 */
export class Card {
  static #SYMBOLS = { red: '♥', blue: '♦', green: '♣', yellow: '★' };
  static #COLORS  = ['red', 'blue', 'green', 'yellow'];

  #variants;

  constructor(value, variants = {}) {
    this.value     = value;
    this.#variants = variants;

    const { color, assetPath } = this.#pickVariant();
    this.color     = color;
    this.assetPath = assetPath;
    this.symbol    = Card.#SYMBOLS[color];
    this.id        = `card-${value}-${color}-${Math.random().toString(36).slice(2, 6)}`;
  }

  #pickVariant() {
    const keys = Object.keys(this.#variants);
    const color = keys.length
      ? keys[Math.floor(Math.random() * keys.length)]
      : Card.#COLORS[Math.floor(Math.random() * 4)];
    return { color, assetPath: this.#variants[color] ?? null };
  }

  toJSON() {
    return { id: this.id, value: this.value, color: this.color, symbol: this.symbol };
  }

  toString() {
    return `Card(${this.value}, ${this.color})`;
  }
}
