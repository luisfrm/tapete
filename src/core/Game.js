import { bus      } from './EventBus.js';
import { GameMenu } from './GameMenu.js';
import { Renderer } from '../ui/Renderer.js';

/**
 * Game — Orquestador principal del ciclo de vida.
 *
 * Flujo:
 *   menú → [selecciona juego]
 *   modo → [elige PvP o PvIA]
 *   setup → [configura partida]
 *   juego → [juega]
 *   resultado → [jugar de nuevo | volver al menú]
 *
 * Game no sabe nada de cartas, tableros ni reglas.
 * Solo coordina qué pantalla mostrar y qué instancias crear.
 */
export class Game {
  #menu     = new GameMenu();
  #renderer = new Renderer();
  #gameUI   = null;   // instancia de la UI del juego activo (ej: MayorMenorUI)
  #game     = null;   // instancia de la lógica del juego activo
  #gameId   = null;   // id del juego seleccionado en el menú

  init() {
    this.#renderer.renderMenu(this.#menu.getAll());
    this.#renderer.showScreen('menu');
    this.#bindEvents();
  }

  #bindEvents() {
    bus.on('menu:select',  ({ gameId }) => this.#onMenuSelect(gameId));
    bus.on('mode:select',  ({ mode })   => this.#onModeSelect(mode));
    bus.on('game:start',   ({ config }) => this.#onGameStart(config));
    bus.on('game:restart', ()           => this.#onRestart());
    bus.on('game:exit',    ()           => this.#onExit());
    bus.on('nav:back',     ({ to })     => this.#renderer.showScreen(to));
  }

  #onMenuSelect(gameId) {
    this.#gameId = gameId;

    // Crea e instala la UI del juego seleccionado
    this.#gameUI = this.#menu.createUI(gameId);
    this.#renderer.mountGameUI(this.#gameUI);

    this.#renderer.showScreen('mode');
  }

  #onModeSelect(mode) {
    this.#gameUI.initSetup(mode);
    this.#renderer.showScreen('setup');
  }

  #onGameStart(config) {
    this.#game = this.#menu.createGame(this.#gameId, config);
    this.#gameUI.attachGame(this.#game);
    this.#renderer.showScreen('game');
    this.#game.start();
  }

  #onRestart() {
    this.#game?.restart();
  }

  #onExit() {
    this.#game  = null;
    this.#renderer.unmountGameUI();
    this.#gameUI = null;
    this.#renderer.showScreen('menu');
  }
}
