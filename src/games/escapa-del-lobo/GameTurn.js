/**
 * GameTurn — Estado completo de un turno.
 *
 * Ciclo de un turno:
 *   1. WAITING_ROLL  → el jugador debe lanzar el dado
 *   2. WAITING_MOVE  → el dado ya fue lanzado, el jugador debe elegir celda
 *   3. DONE          → el movimiento fue realizado
 */
export class GameTurn {
  static WAITING_ROLL = 'waiting_roll';
  static WAITING_MOVE = 'waiting_move';
  static DONE         = 'done';

  constructor(piece) {
    this.piece         = piece;       // Piece que juega este turno
    this.diceValue     = null;        // número sacado en el dado
    this.reachableIds  = new Set();   // nodos a los que puede moverse
    this.movedTo       = null;        // nodo al que se movió
    this.phase         = GameTurn.WAITING_ROLL;
  }

  setDiceResult(value, reachableIds) {
    this.diceValue    = value;
    this.reachableIds = reachableIds;
    this.phase        = GameTurn.WAITING_MOVE;
  }

  setMove(nodeId) {
    this.movedTo = nodeId;
    this.phase   = GameTurn.DONE;
  }

  canMoveTo(nodeId)    { return this.reachableIds.has(nodeId); }
  isWaitingRoll()      { return this.phase === GameTurn.WAITING_ROLL; }
  isWaitingMove()      { return this.phase === GameTurn.WAITING_MOVE; }
  isDone()             { return this.phase === GameTurn.DONE; }
}
