import { BaseGameUI } from '../BaseGameUI.js';
import { Turn       } from '../../games/mayor-menor/Turn.js';
import { bus        } from '../../core/EventBus.js';

/**
 * MayorMenorUI — UI del juego Mayor o Menor.
 * Usa clases de: base.css + mayor-menor.css
 */
export class MayorMenorUI extends BaseGameUI {
  #game   = null;
  #unsubs = [];
  #state  = { cards: 8, mode: 'pvia' };
  #setupMount = null;
  #gameMount  = null;
  #setupLabel = null;

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
    clearTimeout(this._toastTimer);
    if (this.#setupMount) this.#setupMount.innerHTML = '';
    if (this.#gameMount)  this.#gameMount.innerHTML  = '';
  }

  initSetup(mode) {
    this.#state.mode  = mode;
    this.#state.cards = 8;
    const isPvP = mode === 'pvp';
    this.#setupLabel.textContent = isPvP ? 'Jugador vs Jugador' : 'Jugador vs IA';
    document.getElementById('mm-label-p2').textContent = isPvP ? 'Jugador 2' : 'IA (nombre)';
    document.getElementById('mm-input-p2').placeholder = isPvP ? 'Jugador 2' : 'IA';
    document.getElementById('mm-input-p1').value = '';
    document.getElementById('mm-input-p2').value = '';
    document.getElementById('mm-input-min').value = 1;
    document.getElementById('mm-input-max').value = 9;
    this.#clearRangeErrors();
    this.selectChip('mm-chips-cards', 8);
  }

  #renderSetupForm() {
    this.#setupMount.innerHTML = /* html */`
      <div class="setup-form">
        <div class="form-row">
          <div class="field">
            <div class="field-label">Jugador 1</div>
            <input class="field-input" id="mm-input-p1" type="text" placeholder="Jugador 1" maxlength="18" autocomplete="off"/>
          </div>
          <div class="field">
            <div class="field-label" id="mm-label-p2">Jugador 2</div>
            <input class="field-input" id="mm-input-p2" type="text" placeholder="Jugador 2" maxlength="18" autocomplete="off"/>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-block">
          <div class="section-label">Cartas por jugador</div>
          <div class="chips" id="mm-chips-cards">
            <button class="chip" data-val="6">6</button>
            <button class="chip selected" data-val="8">8</button>
            <button class="chip" data-val="10">10</button>
            <button class="chip" data-val="12">12</button>
            <button class="chip" data-val="18">18</button>
          </div>
        </div>
        <div class="divider"></div>
        <div class="section-block">
          <div class="section-row">
            <div class="section-label">Rango de valores</div>
            <div class="section-hint">mínimo 1 · máximo 9</div>
          </div>
          <div class="range-row">
            <div class="range-field">
              <div class="range-label">Mínimo</div>
              <div class="range-sublabel">valor mínimo 1</div>
              <input class="range-input" id="mm-input-min" type="number" min="1" max="9" value="1"/>
              <div class="field-error" id="mm-err-min"></div>
            </div>
            <span class="range-sep">—</span>
            <div class="range-field">
              <div class="range-label">Máximo</div>
              <div class="range-sublabel">valor máximo 9</div>
              <input class="range-input" id="mm-input-max" type="number" min="1" max="9" value="9"/>
              <div class="field-error" id="mm-err-max"></div>
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <button class="btn-start" id="mm-btn-start">Iniciar partida</button>
      </div>`;
  }

  #bindSetupEvents() {
    ['mm-input-p1','mm-input-p2'].forEach(id => {
      document.getElementById(id)?.addEventListener('focus', function(){ this.value=''; });
    });
    document.getElementById('mm-chips-cards')?.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      this.#state.cards = +chip.dataset.val;
      this.selectChip('mm-chips-cards', this.#state.cards);
    });
    ['mm-input-min','mm-input-max'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseInt(el.value);
        if (!isNaN(v)){ if(v<1)el.value=1; if(v>9)el.value=9; }
        el.classList.remove('error');
        document.getElementById(id==='mm-input-min'?'mm-err-min':'mm-err-max').textContent='';
      });
      el.addEventListener('focus', function(){ this.select(); });
    });
    document.getElementById('mm-btn-start')?.addEventListener('click', () => {
      if (!this.#validateRange()) return;
      const p1raw = document.getElementById('mm-input-p1').value.trim();
      const p2raw = document.getElementById('mm-input-p2').value.trim();
      const mode  = this.#state.mode;
      bus.emit('game:start', {
        config: {
          playerNames: [p1raw || 'Jugador 1', p2raw || (mode==='pvia'?'IA':'Jugador 2')],
          playerTypes: ['human', mode==='pvia'?'ai':'human'],
          cardCount:   this.#state.cards,
          min: parseInt(document.getElementById('mm-input-min').value),
          max: parseInt(document.getElementById('mm-input-max').value),
          variants: {}, boardConfig: {},
        },
      });
    });
  }

  #renderGameArea() {
    this.#gameMount.innerHTML = /* html */`
      <div class="mm-game-screen" style="display:flex;flex-direction:column;flex:1;position:relative;">
        <div class="turn-badge" id="mm-turn-badge">Tu turno</div>
        <div class="toast" id="mm-toast"></div>
        <div class="mm-game-area">
          <div class="player-zone active" id="mm-zone-p1">
            <div class="deck-stack"><div class="deck-face"><span class="deck-letter">T</span></div></div>
            <div class="player-name"  id="mm-name-p1">Jugador 1</div>
            <div class="player-count" id="mm-count-p1">Cartas: 0</div>
          </div>
          <div class="board-wrap">
            <div class="mm-board" id="mm-board"></div>
            <div class="action-btns">
              <button class="btn-pred btn-mayor" id="mm-btn-mayor" disabled>Mayor que</button>
              <button class="btn-pred btn-menor" id="mm-btn-menor" disabled>Menor que</button>
            </div>
          </div>
          <div class="player-zone" id="mm-zone-p2">
            <div class="deck-stack"><div class="deck-face"><span class="deck-letter">T</span></div></div>
            <div class="player-name"  id="mm-name-p2">Jugador 2</div>
            <div class="player-count" id="mm-count-p2">Cartas: 0</div>
          </div>
        </div>
        <div class="result-overlay" id="mm-result-overlay">
          <div class="result-card">
            <span class="result-emoji" id="mm-result-emoji">🏆</span>
            <div class="result-title"  id="mm-result-title">¡Ganaste!</div>
            <div class="result-sub"    id="mm-result-sub"></div>
            <div class="result-btns">
              <button class="btn-play-again" id="mm-btn-play-again">Jugar de nuevo</button>
              <button class="btn-to-menu"    id="mm-btn-to-menu">Menú</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  #bindResultEvents() {
    document.getElementById('mm-btn-play-again')?.addEventListener('click', () => {
      document.getElementById('mm-result-overlay').classList.remove('show');
      bus.emit('game:restart');
    });
    document.getElementById('mm-btn-to-menu')?.addEventListener('click', () => {
      document.getElementById('mm-result-overlay').classList.remove('show');
      bus.emit('game:exit');
    });
  }

  attachGame(game) {
    this.#game = game;
    this.#unsubs.forEach(u => u());
    this.#unsubs = [
      bus.on('game:started',    d => this.#onGameStarted(d)),
      bus.on('turn:start',      d => this.#onTurnStart(d)),
      bus.on('cell:select',     d => this.#onCellSelect(d)),
      bus.on('prediction:made', d => this.#onPrediction(d)),
      bus.on('card:placed',     d => this.#onCardPlaced(d)),
      bus.on('card:returned',   ()  => this.#updateCounts()),
      bus.on('game:end',        d => this.#onGameEnd(d)),
    ];
    document.getElementById('mm-btn-mayor').onclick = () => { this.#game.predict(Turn.GREATER); this.#disableActions(); };
    document.getElementById('mm-btn-menor').onclick = () => { this.#game.predict(Turn.LESS);    this.#disableActions(); };
  }

  #onGameStarted({ players }) {
    document.getElementById('mm-name-p1').textContent = players[0].name.toUpperCase();
    document.getElementById('mm-name-p2').textContent = players[1].name.toUpperCase();
    document.getElementById('mm-result-overlay').classList.remove('show');
    this.#updateCounts();
    this.#renderBoard(this.#game.board);
    this.#disableActions();
  }

  #onTurnStart({ player }) {
    const isP1  = this.#game.players[0] === player;
    const isPvP = this.#game.config.playerTypes.every(t => t === 'human');
    document.getElementById('mm-zone-p1').classList.toggle('active',  isP1);
    document.getElementById('mm-zone-p2').classList.toggle('active', !isP1);
    const badge = document.getElementById('mm-turn-badge');
    badge.textContent = player.type === 'ai'
      ? `Turno de ${player.name} (IA)`
      : isPvP ? `Turno de ${player.name}` : `Tu turno, ${player.name}`;
    this.#clearSelection();
    this.#disableActions();
    if (player.type === 'ai') this.#scheduleAI();
  }

  #onCellSelect({ row, col }) {
    this.#clearSelection();
    const el = document.querySelector(`#mm-board [data-row="${row}"][data-col="${col}"]`);
    if (el) {
      el.classList.add('selected');
      const lbl = document.createElement('div');
      lbl.className = 'sel-label'; lbl.textContent = 'Seleccionada';
      el.appendChild(lbl);
    }
    document.getElementById('mm-btn-mayor').disabled = false;
    document.getElementById('mm-btn-menor').disabled = false;
  }

  #onPrediction({ prediction, drawnCard, boardCard, success }) {
    const predText = prediction === Turn.GREATER ? 'Mayor que' : 'Menor que';
    const msg = success
      ? `✓ ${predText} ${boardCard.value} → Sacó ${drawnCard.value}`
      : `✗ Incorrecto — ${predText} ${boardCard.value} pero sacó ${drawnCard.value}`;
    this.showToast(document.getElementById('mm-toast'), msg, success ? 'ok' : 'bad');
    this.#updateCounts();
  }

  #onCardPlaced({ row, col, card }) {
    const el = document.querySelector(`#mm-board [data-row="${row}"][data-col="${col}"]`);
    if (!el) return;
    el.classList.add('flip');
    setTimeout(() => {
      el.dataset.color = card.color;
      el.innerHTML = this.#cardInner(card);
      el.classList.remove('flip', 'selected');
    }, 175);
  }

  #onGameEnd({ winner }) {
    const isHuman = winner.type === 'human';
    document.getElementById('mm-result-emoji').textContent = isHuman ? '🏆' : '😤';
    document.getElementById('mm-result-title').textContent = `¡${winner.name} ganó!`;
    document.getElementById('mm-result-sub').textContent   = 'Se quedó sin cartas primero';
    document.getElementById('mm-result-overlay').classList.add('show');
  }

  #renderBoard(board) {
    const el = document.getElementById('mm-board');
    el.innerHTML = '';
    board.forEach((card, r, c) => el.appendChild(this.#createCardEl(card, r, c)));
  }

  #createCardEl(card, row, col) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.row   = row;
    el.dataset.col   = col;
    el.dataset.color = card.color;
    el.innerHTML = this.#cardInner(card);
    el.addEventListener('click', () => {
      if (this.#game?.isHumanTurn && !this.#game?.currentTurn?.resolved)
        this.#game.selectCell(row, col);
    });
    return el;
  }

  #cardInner(card) {
    return `
      <div class="corner tl"><span class="cv">${card.value}</span><span class="cs">${card.symbol}</span></div>
      <div class="ci">${card.symbol}</div>
      <div class="corner br"><span class="cv">${card.value}</span><span class="cs">${card.symbol}</span></div>`;
  }

  #scheduleAI() {
    clearTimeout(this._aiTimer);
    this._aiTimer = setTimeout(() => {
      if (!this.#game?.running) return;
      const row = Math.floor(Math.random() * 3);
      const col = Math.floor(Math.random() * 3);
      this.#game.selectCell(row, col);
      setTimeout(() => {
        const boardCard = this.#game.board.getCard(row, col);
        const drawn     = this.#game.activePlayer.deck.peek();
        if (!drawn || !boardCard) return;
        const correct = drawn.value > boardCard.value ? Turn.GREATER : Turn.LESS;
        const pred    = Math.random() > 0.25 ? correct : (correct === Turn.GREATER ? Turn.LESS : Turn.GREATER);
        this.#game.predict(pred);
      }, 700);
    }, 1300);
  }

  #updateCounts() {
    if (!this.#game) return;
    const [p1, p2] = this.#game.players;
    document.getElementById('mm-count-p1').textContent = `Cartas: ${p1.cardCount}`;
    document.getElementById('mm-count-p2').textContent = `Cartas: ${p2.cardCount}`;
  }
  #clearSelection() {
    document.querySelectorAll('#mm-board .card.selected').forEach(c => {
      c.classList.remove('selected'); c.querySelector('.sel-label')?.remove();
    });
  }
  #disableActions() {
    document.getElementById('mm-btn-mayor').disabled = true;
    document.getElementById('mm-btn-menor').disabled = true;
  }
  #validateRange() {
    const minEl=document.getElementById('mm-input-min'), maxEl=document.getElementById('mm-input-max');
    const errMin=document.getElementById('mm-err-min'), errMax=document.getElementById('mm-err-max');
    this.#clearRangeErrors();
    const ok1=this.validateNumericInput(minEl,errMin,1,9);
    const ok2=this.validateNumericInput(maxEl,errMax,1,9);
    if(!ok1||!ok2) return false;
    if(parseInt(minEl.value)>=parseInt(maxEl.value)){
      errMin.textContent='Debe ser menor que el máximo';
      errMax.textContent='Debe ser mayor que el mínimo';
      minEl.classList.add('error'); maxEl.classList.add('error'); return false;
    }
    return true;
  }
  #clearRangeErrors() {
    ['mm-err-min','mm-err-max'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=''; });
    ['mm-input-min','mm-input-max'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
  }
}
