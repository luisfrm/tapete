import { BaseGameUI } from '../BaseGameUI.js';
import { bus         } from '../../core/EventBus.js';

/**
 * EscapaDelLoboUI — UI del juego Escapa del Lobo.
 * Usa clases de: base.css + escapa-del-lobo.css
 *
 * Incluye renderizado del mapa Circuito+Laberinto con fog of war,
 * y los 3 mapas adicionales (Laberinto, Bosque, Río).
 */
export class EscapaDelLoboUI extends BaseGameUI {
  #game       = null;
  #unsubs     = [];
  #state      = { mode:'pvia', map:'circuit', size:'medium', dMin:1, dMax:3 };
  #setupMount = null;
  #gameMount  = null;
  #setupLabel = null;

  // SVG namespace
  static NS = 'http://www.w3.org/2000/svg';
  static mk(t){ return document.createElementNS(EscapaDelLoboUI.NS, t); }

  // Map layout constants
  static LAYOUT = {
    circuit: { CX:100,CY:90,RX:85,RY:68, FX:100,FY:90,FRX:52,FRY:42, CN:40, LG:13,LCW:7.2,LCH:5.8 },
  };

  mount({ setupMount, gameAreaMount, setupLabel }) {
    this.#setupMount = setupMount;
    this.#gameMount  = gameAreaMount;
    this.#setupLabel = setupLabel;
    this.#renderSetupForm();
    this.#renderGameArea();
    this.#bindSetupEvents();
    this.#bindResultEvents();
  }

  unmount() {
    this.#unsubs.forEach(u => u());
    this.#unsubs = [];
    clearTimeout(this._aiTimer);
    clearTimeout(this._toastTimer);
    if (this.#setupMount) this.#setupMount.innerHTML = '';
    if (this.#gameMount)  this.#gameMount.innerHTML  = '';
  }

  initSetup(mode) {
    this.#state.mode = mode;
    const isPvP = mode === 'pvp';
    this.#setupLabel.textContent = isPvP ? 'Jugador vs Jugador' : 'Jugador vs IA';
    document.getElementById('edl-label-wolf').textContent = isPvP ? 'Lobo (Jugador 2)' : 'Lobo (IA)';
    document.getElementById('edl-input-rabbit').value = '';
    document.getElementById('edl-input-wolf').value   = '';
    this.#applyMapDefaults('circuit');
  }

  // ── MAP DEFAULTS ──
  static MAP_DEFAULTS = {
    circuit: { dMin:1, dMax:3, sizeEnabled:false, info:'<strong>Circuito:</strong> Redondel exterior + bosque central con fog of war. Conejo ve 1 casilla adelante, lobo 2. Dos metas aleatorias.' },
    maze:    { dMin:1, dMax:4, sizeEnabled:true,  info:'<strong>Laberinto:</strong> Grid con paredes generadas. 4 direcciones. Pequeño 8×8 · Mediano 11×11 · Grande 14×14.' },
    forest:  { dMin:1, dMax:4, sizeEnabled:true,  info:'<strong>Bosque:</strong> Nodos ramificados, movimiento libre. Pequeño 22 · Mediano 34 · Grande 48 nodos.' },
    river:   { dMin:1, dMax:3, sizeEnabled:true,  info:'<strong>El Río:</strong> Dos carriles paralelos con cruces estratégicos.' },
  };

  #applyMapDefaults(mapId) {
    this.#state.map = mapId;
    const def = EscapaDelLoboUI.MAP_DEFAULTS[mapId];
    const minEl = document.getElementById('edl-dice-min');
    const maxEl = document.getElementById('edl-dice-max');
    if (minEl) minEl.value = def.dMin;
    if (maxEl) maxEl.value = def.dMax;
    const infoEl = document.getElementById('edl-map-info');
    if (infoEl) infoEl.innerHTML = def.info;
    document.querySelectorAll('#edl-size-chips .chip').forEach(c => c.classList.toggle('disabled', !def.sizeEnabled));
    const hintEl = document.getElementById('edl-size-hint');
    if (hintEl) hintEl.textContent = def.sizeEnabled ? 'Afecta cantidad de nodos/celdas' : 'Tamaño fijo';
  }

  // ── SETUP FORM ──
  #renderSetupForm() {
    this.#setupMount.innerHTML = /* html */`
      <div class="setup-form">
        <div class="form-row">
          <div class="field">
            <div class="field-label">🐰 Conejo (J1)</div>
            <input class="field-input" id="edl-input-rabbit" type="text" placeholder="Conejo" maxlength="14" autocomplete="off"/>
          </div>
          <div class="field">
            <div class="field-label" id="edl-label-wolf">🐺 Lobo (IA)</div>
            <input class="field-input" id="edl-input-wolf" type="text" placeholder="Lobo IA" maxlength="14" autocomplete="off"/>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-block">
          <div class="section-label">Mapa</div>
          <div class="edl-map-grid" id="edl-map-grid">
            <div class="edl-map-chip selected" data-map="circuit"><span class="edl-map-chip-icon">🔄</span><div class="edl-map-chip-name">Circuito</div><div class="edl-map-chip-desc">Óvalo + Bosque</div></div>
            <div class="edl-map-chip" data-map="maze"><span class="edl-map-chip-icon">🧩</span><div class="edl-map-chip-name">Laberinto</div><div class="edl-map-chip-desc">Grid con paredes</div></div>
            <div class="edl-map-chip" data-map="forest"><span class="edl-map-chip-icon">🌲</span><div class="edl-map-chip-name">Bosque</div><div class="edl-map-chip-desc">Nodos libres</div></div>
            <div class="edl-map-chip" data-map="river"><span class="edl-map-chip-icon">🌊</span><div class="edl-map-chip-name">El Río</div><div class="edl-map-chip-desc">Carriles duales</div></div>
          </div>
          <div class="edl-map-info" id="edl-map-info"></div>
        </div>
        <div class="divider"></div>
        <div class="section-block">
          <div class="section-row">
            <div class="section-label">Tamaño</div>
            <div class="section-hint" id="edl-size-hint">Tamaño fijo</div>
          </div>
          <div class="chips" id="edl-size-chips">
            <div class="chip disabled" data-val="small">Pequeño</div>
            <div class="chip disabled selected" data-val="medium">Mediano</div>
            <div class="chip disabled" data-val="large">Grande</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-block">
          <div class="section-row">
            <div class="section-label">Rango del dado</div>
            <div class="section-hint">Mín 1 · Máx 6</div>
          </div>
          <div class="range-row">
            <div class="range-field">
              <div class="range-label">Mínimo</div>
              <div class="range-sublabel">valor mínimo 1</div>
              <input class="range-input" id="edl-dice-min" type="number" min="1" max="6" value="1"/>
              <div class="field-error" id="edl-err-min"></div>
            </div>
            <span class="range-sep">—</span>
            <div class="range-field">
              <div class="range-label">Máximo</div>
              <div class="range-sublabel">valor máximo 6</div>
              <input class="range-input" id="edl-dice-max" type="number" min="1" max="6" value="3"/>
              <div class="field-error" id="edl-err-max"></div>
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <button class="btn-start" id="edl-btn-start">Iniciar partida</button>
      </div>`;

    this.#applyMapDefaults('circuit');
  }

  #bindSetupEvents() {
    ['edl-input-rabbit','edl-input-wolf'].forEach(id =>
      document.getElementById(id)?.addEventListener('focus', function(){ this.value=''; })
    );

    document.getElementById('edl-map-grid')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-map]');
      if (!chip) return;
      document.querySelectorAll('#edl-map-grid [data-map]').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      this.#applyMapDefaults(chip.dataset.map);
    });

    document.getElementById('edl-size-chips')?.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip || chip.classList.contains('disabled')) return;
      this.#state.size = chip.dataset.val;
      document.querySelectorAll('#edl-size-chips .chip').forEach(c => c.classList.toggle('selected', c.dataset.val === chip.dataset.val));
    });

    ['edl-dice-min','edl-dice-max'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseInt(el.value);
        if (!isNaN(v)){ if(v<1)el.value=1; if(v>6)el.value=6; }
        el.classList.remove('error');
        document.getElementById(id==='edl-dice-min'?'edl-err-min':'edl-err-max').textContent='';
      });
      el.addEventListener('focus', function(){ this.select(); });
    });

    document.getElementById('edl-btn-start')?.addEventListener('click', () => {
      const minEl = document.getElementById('edl-dice-min');
      const maxEl = document.getElementById('edl-dice-max');
      const errMin = document.getElementById('edl-err-min');
      const errMax = document.getElementById('edl-err-max');
      const ok1 = this.validateNumericInput(minEl, errMin, 1, 6);
      const ok2 = this.validateNumericInput(maxEl, errMax, 1, 6);
      if (!ok1 || !ok2) return;
      if (parseInt(minEl.value) >= parseInt(maxEl.value)) {
        errMin.textContent='Debe ser < máximo'; minEl.classList.add('error');
        errMax.textContent='Debe ser > mínimo'; maxEl.classList.add('error');
        return;
      }
      const rabbit = document.getElementById('edl-input-rabbit').value.trim() || 'Conejo';
      const wolf   = document.getElementById('edl-input-wolf').value.trim()   || (this.#state.mode==='pvia'?'Lobo IA':'Lobo');
      bus.emit('game:start', {
        config: {
          playerNames: [rabbit, wolf],
          playerTypes: ['human', this.#state.mode==='pvia'?'ai':'human'],
          map:     this.#state.map,
          size:    this.#state.size,
          dMin:    parseInt(minEl.value),
          dMax:    parseInt(maxEl.value),
          assets:  { rabbit:{}, wolf:{} },
          boardConfig: {},
        },
      });
    });
  }

  // ── GAME AREA ──
  #renderGameArea() {
    this.#gameMount.innerHTML = /* html */`
      <div class="edl-game-screen" style="display:flex;flex:1;min-height:0;">
        <div class="edl-topbar" id="edl-topbar">
          <div class="edl-player-card active" id="edl-card-rabbit">
            <div class="edl-piece-icon">🐰</div>
            <div class="edl-player-info">
              <div class="edl-player-name" id="edl-name-rabbit">Conejo</div>
              <div class="edl-player-role">Llega a la meta</div>
            </div>
            <div class="edl-turn-dot active" id="edl-dot-rabbit"></div>
          </div>
          <div class="edl-player-card" id="edl-card-wolf">
            <div class="edl-piece-icon">🐺</div>
            <div class="edl-player-info">
              <div class="edl-player-name" id="edl-name-wolf">Lobo</div>
              <div class="edl-player-role">Atrapa al conejo</div>
            </div>
            <div class="edl-turn-dot" id="edl-dot-wolf"></div>
          </div>
          <div class="edl-map-badge" id="edl-map-badge">🔄 Circuito</div>
          <div class="edl-dice-area">
            <div class="edl-dice" id="edl-dice">?</div>
            <div class="edl-dice-info">
              <div class="edl-steps-badge" id="edl-steps"></div>
              <button class="btn-roll" id="edl-btn-roll" disabled>Lanzar dado</button>
              <div class="edl-hint" id="edl-hint">Espera tu turno</div>
            </div>
          </div>
        </div>
        <div class="edl-board-wrap">
          <div class="toast" id="edl-toast"></div>
          <svg class="edl-board" id="edl-svg" viewBox="0 0 200 180" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="edl-glow"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="edl-shad"><feDropShadow dx="0" dy="0.4" stdDeviation="0.6" flood-color="rgba(0,0,0,0.8)"/></filter>
              <filter id="edl-pglow"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <rect width="200" height="180" fill="#091509"/>
            <g id="edl-g-forest-bg"></g>
            <g id="edl-g-forest-wall"></g>
            <g id="edl-g-ext-trees"></g>
            <g id="edl-g-edges"></g>
            <g id="edl-g-nodes"></g>
            <g id="edl-g-pieces"></g>
            <g id="edl-g-labels"></g>
          </svg>
          <div class="result-overlay" id="edl-result-overlay">
            <div class="result-card">
              <span class="result-emoji" id="edl-result-emoji">🏆</span>
              <div class="result-title"  id="edl-result-title">¡Ganaste!</div>
              <div class="result-sub"    id="edl-result-sub"></div>
              <div class="result-btns">
                <button class="btn-play-again" id="edl-btn-again">Jugar de nuevo</button>
                <button class="btn-to-menu"    id="edl-btn-menu">Menú</button>
              </div>
            </div>
          </div>
        </div>
        <div class="edl-log" id="edl-log"></div>
      </div>`;
  }

  #bindResultEvents() {
    document.getElementById('edl-btn-again')?.addEventListener('click', () => {
      document.getElementById('edl-result-overlay').classList.remove('show');
      bus.emit('game:restart');
    });
    document.getElementById('edl-btn-menu')?.addEventListener('click', () => {
      document.getElementById('edl-result-overlay').classList.remove('show');
      bus.emit('game:exit');
    });
  }

  // ── GAME EVENTS ──
  attachGame(game) {
    this.#game = game;
    this.#unsubs.forEach(u => u());
    this.#unsubs = [
      bus.on('edl:started',     d => this.#onStarted(d)),
      bus.on('edl:turn-start',  d => this.#onTurnStart(d)),
      bus.on('edl:dice-rolled', d => this.#onDiceRolled(d)),
      bus.on('edl:piece-moved', d => this.#onPieceMoved(d)),
      bus.on('edl:wolf-wins',   d => this.#onWolfWins(d)),
      bus.on('edl:rabbit-wins', d => this.#onRabbitWins(d)),
    ];
    document.getElementById('edl-btn-roll')?.addEventListener('click', () => this.#game.rollDice());
  }

  #onStarted({ rabbit, wolf }) {
    document.getElementById('edl-name-rabbit').textContent = this.#game.config.playerNames[0];
    document.getElementById('edl-name-wolf').textContent   = this.#game.config.playerNames[1];
    document.getElementById('edl-result-overlay').classList.remove('show');
    document.getElementById('edl-dice').textContent = '?';
    document.getElementById('edl-log').innerHTML = '';
    const mapNames = {circuit:'🔄 Circuito',maze:'🧩 Laberinto',forest:'🌲 Bosque',river:'🌊 El Río'};
    document.getElementById('edl-map-badge').textContent = mapNames[this.#game.config.map] ?? '🔄';
    this.#renderStatic();
    this.#renderDynamic();
  }

  #onTurnStart({ turn }) {
    const isRabbit = turn.piece === this.#game.rabbit;
    const isHuman  = this.#game.isHumanTurn;
    document.getElementById('edl-card-rabbit').classList.toggle('active',  isRabbit);
    document.getElementById('edl-card-wolf').classList.toggle('active',   !isRabbit);
    document.getElementById('edl-dot-rabbit').classList.toggle('active',   isRabbit);
    document.getElementById('edl-dot-wolf').classList.toggle('active',    !isRabbit);
    document.getElementById('edl-dice').textContent = '?';
    document.getElementById('edl-dice').classList.remove('rolled','rolling');
    document.getElementById('edl-steps').classList.remove('show');
    this.#clearHL();
    const name = isRabbit ? this.#game.config.playerNames[0] : this.#game.config.playerNames[1];
    if (isHuman) {
      document.getElementById('edl-btn-roll').disabled = false;
      document.getElementById('edl-hint').textContent = `${name}, lanza`;
    } else {
      document.getElementById('edl-btn-roll').disabled = true;
      document.getElementById('edl-hint').textContent = `${name} piensa...`;
      this.#scheduleAI();
    }
    this.#renderDynamic();
  }

  #onDiceRolled({ piece, value, reachableIds }) {
    const dice = document.getElementById('edl-dice');
    dice.classList.add('rolling');
    setTimeout(() => {
      dice.textContent = value;
      dice.classList.remove('rolling'); dice.classList.add('rolled');
      this.#updateSteps(value);
      const name = piece === this.#game.rabbit ? this.#game.config.playerNames[0] : this.#game.config.playerNames[1];
      document.getElementById('edl-hint').textContent = `Sacó ${value}`;
      document.getElementById('edl-btn-roll').disabled = true;
      this.#addLog(`${name} sacó ${value}`);
      this.#renderHighlights(reachableIds, piece === this.#game.rabbit);
    }, 430);
  }

  #onPieceMoved({ piece, from, to }) {
    this.#clearHL();
    this.#renderDynamic();
    const name = piece === this.#game.rabbit ? this.#game.config.playerNames[0] : this.#game.config.playerNames[1];
    const n = this.#game.path?.getNode?.(to);
    const lbl = n?.type==='goal'?'⭐META':n?.type==='goalA'?'⭐A':n?.type==='goalB'?'⭐B':'';
    const steps = this.#game.currentTurn?.stepsLeft ?? 0;
    this.#updateSteps(steps);
    this.#addLog(`${name}→${lbl||to} (${steps}p)`);
  }

  #onWolfWins() {
    document.getElementById('edl-result-emoji').textContent = '🐺';
    document.getElementById('edl-result-title').textContent = `¡${this.#game.config.playerNames[1]} ganó!`;
    document.getElementById('edl-result-sub').textContent   = 'El lobo atrapó al conejo';
    setTimeout(() => document.getElementById('edl-result-overlay').classList.add('show'), 600);
  }

  #onRabbitWins() {
    document.getElementById('edl-result-emoji').textContent = '🐰';
    document.getElementById('edl-result-title').textContent = `¡${this.#game.config.playerNames[0]} escapó!`;
    document.getElementById('edl-result-sub').textContent   = '¡El conejo llegó a la meta!';
    setTimeout(() => document.getElementById('edl-result-overlay').classList.add('show'), 600);
  }

  // ── RENDERING — delegates to game's map renderer ──
  #renderStatic() {
    // Map-specific static rendering is handled inline in the game
    // For now, clear and let dynamic fill it
    ['edl-g-forest-bg','edl-g-forest-wall','edl-g-ext-trees'].forEach(id => {
      const el = document.getElementById(id); if(el) el.innerHTML='';
    });
    this.#game.renderStaticToSVG?.({
      forestBg:   document.getElementById('edl-g-forest-bg'),
      forestWall: document.getElementById('edl-g-forest-wall'),
      extTrees:   document.getElementById('edl-g-ext-trees'),
    });
  }

  #renderDynamic() {
    this.#game.renderDynamicToSVG?.({
      edges:   document.getElementById('edl-g-edges'),
      nodes:   document.getElementById('edl-g-nodes'),
      pieces:  document.getElementById('edl-g-pieces'),
      labels:  document.getElementById('edl-g-labels'),
    });
  }

  #renderHighlights(reachableIds, isRabbit) {
    this.#clearHL();
    reachableIds.forEach(id => {
      const grp = document.getElementById(`edl-nd-${id}`);
      if (!grp) return;
      grp.style.cursor = 'pointer';
      const mk = EscapaDelLoboUI.mk;
      const n  = this.#game.path?.getNode?.(id); if (!n) return;
      const p  = mk('circle');
      p.setAttribute('cx', n.x); p.setAttribute('cy', n.y); p.setAttribute('r', '4');
      p.setAttribute('fill',   isRabbit?'rgba(76,175,130,.2)':'rgba(200,80,80,.2)');
      p.setAttribute('stroke', isRabbit?'#4CAF82':'#e05050');
      p.setAttribute('stroke-width','.8'); p.setAttribute('class','edl-highlight-pulse');
      grp.insertBefore(p, grp.firstChild);
    });
  }

  #clearHL() {
    document.querySelectorAll('.edl-highlight-pulse').forEach(e => e.remove());
    document.querySelectorAll('#edl-g-nodes g').forEach(e => e.style.cursor='default');
  }

  #scheduleAI() {
    clearTimeout(this._aiTimer);
    this._aiTimer = setTimeout(() => {
      if (!this.#game?.running) return;
      this.#game.rollDice();
      setTimeout(() => {
        const turn = this.#game?.currentTurn;
        if (!turn?.isWaitingMove()) return;
        const reachable = [...turn.reachableIds];
        if (!reachable.length) return;
        // AI: move toward rabbit (wolf) or toward goal (rabbit AI)
        const rabbit = this.#game.rabbit;
        const wolf   = this.#game.wolf;
        const path   = this.#game.path;
        const piece  = this.#game.activePiece;
        let best = reachable[0];
        let bestDist = Infinity;
        const targetNode = piece === wolf
          ? path.getNode(rabbit.currentNode)
          : path.getGoalNode();
        if (targetNode) {
          reachable.forEach(id => {
            const n = path.getNode(id); if (!n) return;
            const d = Math.hypot(n.x - targetNode.x, n.y - targetNode.y);
            if (d < bestDist){ bestDist=d; best=id; }
          });
        }
        this.#game.moveTo(best);
      }, 1000);
    }, 1400);
  }

  #updateSteps(val) {
    const b = document.getElementById('edl-steps');
    if (val > 0) { b.textContent=`${val} paso${val!==1?'s':''}`; b.classList.add('show'); }
    else b.classList.remove('show');
  }

  #addLog(msg) {
    const c = document.getElementById('edl-log');
    if (!c) return;
    const e = document.createElement('div');
    e.className='edl-log-entry'; e.textContent=msg;
    c.insertBefore(e, c.firstChild);
    while (c.children.length > 12) c.removeChild(c.lastChild);
  }
}
