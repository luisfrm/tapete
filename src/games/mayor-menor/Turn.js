/**
 * Turn — Estado y resolución de un turno
 */
export class Turn {
  static GREATER = 'greater';
  static LESS    = 'less';

  constructor(player) {
    this.player       = player;
    this.selectedCell = null;   // { row, col }
    this.boardCard    = null;
    this.prediction   = null;   // Turn.GREATER | Turn.LESS
    this.drawnCard    = null;
    this.success      = null;
    this.resolved     = false;
  }

  selectCell(row, col, boardCard) {
    this.selectedCell = { row, col };
    this.boardCard    = boardCard;
  }

  predict(prediction) {
    this.prediction = prediction;
  }

  /**
   * Evalúa si la predicción es correcta contra la carta robada.
   * @param  {Card}    drawnCard
   * @returns {boolean}
   */
  resolve(drawnCard) {
    this.drawnCard = drawnCard;
    const drawn    = drawnCard.value;
    const target   = this.boardCard.value;

    this.success  = this.prediction === Turn.GREATER ? drawn > target : drawn < target;
    this.resolved = true;
    return this.success;
  }

  isReady() {
    return this.selectedCell !== null && this.prediction !== null;
  }
}
