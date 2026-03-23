/**
 * BaseGameUI — Contrato base para la UI de cualquier juego.
 *
 * Cada juego implementa su propia clase que extiende esta.
 * Define qué métodos debe tener toda UI de juego para que
 * el Renderer pueda montarla y desmontarla sin saber qué juego es.
 *
 * Métodos obligatorios:
 *   mount({ setupMount, gameAreaMount, setupLabel })
 *     → Inyecta el HTML del setup y del área de juego en los contenedores dados.
 *
 *   unmount()
 *     → Limpia el DOM, cancela timers, elimina listeners.
 *
 *   initSetup(mode)
 *     → Prepara el formulario de configuración para el modo dado ('pvp' | 'pvia').
 *
 *   attachGame(game)
 *     → Recibe la instancia del juego ya iniciado y suscribe los eventos del bus.
 */
export class BaseGameUI {
  mount(_containers) {
    throw new Error(`${this.constructor.name} debe implementar mount()`);
  }

  unmount() {
    throw new Error(`${this.constructor.name} debe implementar unmount()`);
  }

  initSetup(_mode) {
    throw new Error(`${this.constructor.name} debe implementar initSetup()`);
  }

  attachGame(_game) {
    throw new Error(`${this.constructor.name} debe implementar attachGame()`);
  }

  // ── Helpers compartidos disponibles para todas las UIs ──

  /** Muestra un toast flotante sobre el área de juego. */
  showToast(el, msg, type = '') {
    el.textContent = msg;
    el.className   = `toast ${type} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /** Selecciona un chip dentro de un contenedor. */
  selectChip(containerId, val) {
    document.querySelectorAll(`#${containerId} .chip`).forEach(c => {
      c.classList.toggle('selected', +c.dataset.val === val);
    });
  }

  /** Valida que un input numérico esté dentro de [min, max]. */
  validateNumericInput(inputEl, errorEl, min, max, label = '') {
    const v = parseInt(inputEl.value);
    if (isNaN(v) || v < min || v > max) {
      errorEl.textContent = `${label} debe ser entre ${min} y ${max}`;
      inputEl.classList.add('error');
      return false;
    }
    inputEl.classList.remove('error');
    errorEl.textContent = '';
    return true;
  }
}
