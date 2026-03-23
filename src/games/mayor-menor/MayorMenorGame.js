import { Board  } from './Board.js';
import { Deck   } from './Deck.js';
import { Player } from './Player.js';
import { Turn   } from './Turn.js';
import { bus    } from '../../core/EventBus.js';

/**
 * MayorMenorGame — Orquestador del juego Mayor o Menor
 *
 * @param {object} config
 * @param {string[]} config.playerNames  - Nombres de los jugadores [p1, p2]
 * @param {string[]} config.playerTypes  - Tipos ['human','human'] | ['human','ai']
 * @param {number}   config.cardCount    - Cartas por jugador (default 8)
 * @param {number}   config.min          - Valor mínimo de las cartas (default 1)
 * @param {number}   config.max          - Valor máximo de las cartas (default 9)
 * @param {object}   config.variants     - Mapa de assets por valor y color
 * @param {object}   config.boardConfig  - { assetPath, variants } para el tablero
 */
export class MayorMenorGame {
  static id    = 'mayor-menor';
  static label = 'Mayor o Menor';

  constructor(config = {}) {
    this.config       = config;
    this.board        = null;
    this.players      = [];
    this.currentTurn  = null;
    this.activeIndex  = 0;
    this.running      = false;
  }

  start() {
    this.#setup();
    this.running     = true;
    this.activeIndex = 0;
    this.#beginTurn();
    bus.emit('game:started', { players: this.players, board: this.board });
  }

  restart() {
    this.running     = false;
    this.activeIndex = 0;
    this.currentTurn = null;
    this.start();
  }

  // ── Setup ────────────────────────────────────────────────

  #setup() {
    const { cardCount = 8, min = 1, max = 9, variants = {}, boardConfig = {}, playerNames = ['Jugador 1', 'Jugador 2'], playerTypes = ['human', 'ai'] } = this.config;

    this.board = new Board(3, {
      assetPath: boardConfig.assetPath ?? null,
      variants:  boardConfig.variants  ?? variants,
    }).init(min, max);

    this.players = playerNames.map((name, i) =>
      new Player(name, new Deck(cardCount, min, max, variants), playerTypes[i] ?? 'human')
    );
  }

  // ── Turn flow ────────────────────────────────────────────

  #beginTurn() {
    const player     = this.players[this.activeIndex];
    this.currentTurn = new Turn(player);
    bus.emit('turn:start', { player, cardCount: player.cardCount });
  }

  selectCell(row, col) {
    if (!this.running || !this.currentTurn) return;
    if (this.currentTurn.prediction !== null) return;

    const card = this.board.getCard(row, col);
    if (!card) return;

    this.currentTurn.selectCell(row, col, card);
    bus.emit('cell:select', { row, col, card });
  }

  predict(prediction) {
    if (!this.running || !this.currentTurn) return;
    if (!this.currentTurn.selectedCell || this.currentTurn.resolved) return;

    this.currentTurn.predict(prediction);
    this.#resolve();
  }

  #resolve() {
    const turn   = this.currentTurn;
    const player = turn.player;

    const drawnCard = player.drawCard();
    if (!drawnCard) return;

    const success = turn.resolve(drawnCard);

    bus.emit('prediction:made', {
      player,
      prediction: turn.prediction,
      drawnCard,
      boardCard: turn.boardCard,
      success,
    });

    if (success) {
      const { row, col } = turn.selectedCell;
      this.board.replace(row, col, drawnCard);
      bus.emit('card:placed', { row, col, card: drawnCard });
    } else {
      player.returnCard(drawnCard);
      bus.emit('card:returned', { card: drawnCard, player });
    }

    if (player.hasWon()) {
      this.running = false;
      bus.emit('game:end', { winner: player });
      return;
    }

    setTimeout(() => this.#nextTurn(), 900);
  }

  #nextTurn() {
    bus.emit('turn:end', { player: this.currentTurn.player });
    this.activeIndex = (this.activeIndex + 1) % this.players.length;
    this.#beginTurn();
  }

  // ── Getters ──────────────────────────────────────────────

  get activePlayer()  { return this.players[this.activeIndex]; }
  get isHumanTurn()   { return this.activePlayer?.type === 'human'; }
}
