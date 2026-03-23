/**
 * EventBus — Sistema pub/sub desacoplado
 *
 * Eventos del sistema:
 *   menu:select        { gameId }
 *   mode:select        { mode }          'pvp' | 'pvia'
 *   game:start         { config }
 *   game:started       { players, board }
 *   game:end           { winner }
 *   game:exit          {}
 *   turn:start         { player }
 *   cell:select        { row, col, card }
 *   prediction:made    { player, prediction, drawnCard, boardCard, success }
 *   card:placed        { row, col, card }
 *   card:returned      { card, player }
 */
export class EventBus {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.#listeners.has(event)) return;
    this.#listeners.set(event, this.#listeners.get(event).filter(cb => cb !== callback));
  }

  emit(event, data = {}) {
    this.#listeners.get(event)?.forEach(cb => cb(data));
  }

  clear(event) {
    event ? this.#listeners.delete(event) : this.#listeners.clear();
  }
}

export const bus = new EventBus();
