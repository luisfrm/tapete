import { bus } from '../core/EventBus.js';

/**
 * Renderer — Núcleo de UI compartido por todos los juegos.
 *
 * Responsabilidades:
 *   - Construir el HTML base (header, pantallas de menú, modo, resultado)
 *   - Manejar la navegación entre pantallas
 *   - Renderizar el menú de selección de juegos
 *   - Montar/desmontar la UI específica de cada juego (via UIClass)
 *
 * Lo que NO hace:
 *   - No sabe nada de cartas, tableros ni reglas
 *   - No importa ninguna clase de ningún juego
 *   - No renderiza botones de acción específicos de un juego
 */
export class Renderer {
  #activeGameUI = null; // instancia de la UI del juego activo (ej: MayorMenorUI)

  constructor() {
    this.#buildDOM();
    this.#bindNavEvents();
  }

  // ── Construcción del DOM base ────────────────────────────

  #buildDOM() {
    document.getElementById('app').innerHTML = /* html */`

      <!-- ── MENÚ PRINCIPAL ── -->
      <div class="screen menu-screen active" id="screen-menu">
        <div class="menu-header">
          <div class="menu-logo">El Tapete</div>
          <div class="menu-sub">Colección de juegos de mesa</div>
        </div>
        <div class="menu-games" id="menu-games"></div>
      </div>

      <!-- ── SELECCIÓN DE MODO ── -->
      <div class="screen mode-screen" id="screen-mode">
        <button class="back-btn" id="btn-mode-back">← Volver</button>
        <div class="screen-header">
          <div class="screen-title" id="mode-game-title"></div>
          <div class="screen-sub">Elige el modo de juego</div>
        </div>
        <div class="mode-options">
          <div class="mode-card" data-mode="pvp">
            <span class="mc-icon">👥</span>
            <div class="mc-title">Jugador vs Jugador</div>
            <div class="mc-desc">Dos jugadores en el mismo dispositivo</div>
          </div>
          <div class="mode-card" data-mode="pvia">
            <span class="mc-icon">🤖</span>
            <div class="mc-title">Jugador vs IA</div>
            <div class="mc-desc">Enfrenta a la máquina</div>
          </div>
        </div>
      </div>

      <!-- ── SETUP: montado dinámicamente por cada GameUI ── -->
      <div class="screen setup-screen" id="screen-setup">
        <button class="back-btn" id="btn-setup-back">← Volver</button>
        <div class="screen-header">
          <div class="screen-title">Configurar partida</div>
          <div class="screen-sub" id="setup-mode-label"></div>
        </div>
        <!-- #setup-form-mount: cada GameUI inyecta su formulario aquí -->
        <div id="setup-form-mount"></div>
      </div>

      <!-- ── JUEGO: header fijo + área montada por cada GameUI ── -->
      <div class="screen game-screen" id="screen-game">
        <header class="game-header">
          <div class="game-logo">El Tapete</div>
          <div class="header-actions">
            <button class="btn-exit" id="btn-exit">Salir del juego</button>
            <button class="btn-icon" title="Ayuda">?</button>
            <button class="btn-icon" title="Configuración">⚙</button>
          </div>
        </header>
        <!-- #game-area-mount: cada GameUI inyecta su tablero y controles aquí -->
        <div id="game-area-mount" class="game-area-mount"></div>
      </div>

    `;
  }

  // ── Navegación ───────────────────────────────────────────

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`)?.classList.add('active');
  }

  #bindNavEvents() {
    // Menú → seleccionar juego
    document.getElementById('menu-games').addEventListener('click', e => {
      const card = e.target.closest('.game-card[data-game-id]');
      if (!card) return;
      document.getElementById('mode-game-title').textContent = card.dataset.label ?? '';
      bus.emit('menu:select', { gameId: card.dataset.gameId });
    });

    // Modo → PvP o PvIA
    document.querySelector('#screen-mode .mode-options').addEventListener('click', e => {
      const card = e.target.closest('.mode-card[data-mode]');
      if (!card) return;
      bus.emit('mode:select', { mode: card.dataset.mode });
    });

    document.getElementById('btn-mode-back').onclick  = () => bus.emit('nav:back', { to: 'menu' });
    document.getElementById('btn-setup-back').onclick = () => bus.emit('nav:back', { to: 'mode' });
    document.getElementById('btn-exit').onclick       = () => bus.emit('game:exit');
  }

  // ── Menú de juegos ───────────────────────────────────────

  renderMenu(games) {
    document.getElementById('menu-games').innerHTML = games.map(g => /* html */`
      <div class="game-card" data-game-id="${g.id}" data-label="${g.label}">
        <span class="gc-icon">${g.icon}</span>
        <div class="gc-title">${g.label}</div>
        <div class="gc-desc">${g.description}</div>
      </div>
    `).join('');
  }

  // ── Montaje de UI por juego ──────────────────────────────

  /**
   * Monta la UI de un juego específico.
   * Cada juego tiene su propia clase UIClass que sabe cómo
   * renderizar su setup, tablero y controles.
   *
   * @param {BaseGameUI} gameUI - Instancia de la UI del juego
   */
  mountGameUI(gameUI) {
    this.#activeGameUI?.unmount(); // desmonta la UI anterior si existe
    this.#activeGameUI = gameUI;
    gameUI.mount({
      setupMount:    document.getElementById('setup-form-mount'),
      gameAreaMount: document.getElementById('game-area-mount'),
      setupLabel:    document.getElementById('setup-mode-label'),
    });
  }

  /** Limpia el área de juego al salir. */
  unmountGameUI() {
    this.#activeGameUI?.unmount();
    this.#activeGameUI = null;
  }
}
