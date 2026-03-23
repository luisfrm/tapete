import { MayorMenorGame    } from '../games/mayor-menor/MayorMenorGame.js';
import { MayorMenorUI      } from '../ui/games/MayorMenorUI.js';
import { EscapaDelLoboGame } from '../games/escapa-del-lobo/EscapaDelLoboGame.js';
import { EscapaDelLoboUI   } from '../ui/games/EscapaDelLoboUI.js';

/**
 * GameMenu — Registro de juegos disponibles.
 * Para agregar un juego: importa GameClass y UIClass, añade entrada a REGISTRY.
 */
const REGISTRY = [
  {
    id:          'mayor-menor',
    label:       'Mayor o Menor',
    icon:        '🃏',
    description: '1 vs 1 · Tablero 3×3 · Predice mayor o menor que la carta',
    GameClass:   MayorMenorGame,
    UIClass:     MayorMenorUI,
  },
  {
    id:          'escapa-del-lobo',
    label:       'Escapa del Lobo',
    icon:        '🐺',
    description: '1 vs 1 · Circuito + Bosque · El conejo escapa, el lobo persigue',
    GameClass:   EscapaDelLoboGame,
    UIClass:     EscapaDelLoboUI,
  },
];

export class GameMenu {
  getAll()    { return REGISTRY; }
  getById(id) { return REGISTRY.find(g => g.id === id) ?? null; }

  createGame(id, config = {}) {
    const e = this.#getOrThrow(id);
    return new e.GameClass(config);
  }

  createUI(id) {
    const e = this.#getOrThrow(id);
    return new e.UIClass();
  }

  #getOrThrow(id) {
    const entry = this.getById(id);
    if (!entry) throw new Error(`Juego no encontrado: "${id}"`);
    return entry;
  }
}
