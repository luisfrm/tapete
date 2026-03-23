/**
 * Dice — Dado del juego.
 *
 * Encapsula el lanzamiento y guarda el último valor.
 * Configurable: caras 1-6 por defecto, pero puede ser 1-4, etc.
 */
export class Dice {
  constructor(faces = 6) {
    this.faces    = faces;
    this.lastRoll = null;
  }

  /** Lanza el dado. Retorna el valor y lo guarda en lastRoll. */
  roll() {
    this.lastRoll = Math.floor(Math.random() * this.faces) + 1;
    return this.lastRoll;
  }
}
