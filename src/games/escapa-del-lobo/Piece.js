/**
 * Piece — Ficha de un jugador en el tablero.
 *
 * Sabe en qué nodo está y cuál es su rol en el juego.
 *
 * @param {string} role      - 'rabbit' | 'wolf'
 * @param {string} startNode - id del nodo de inicio
 * @param {object} assets    - { default: '/ruta/img.png', ... variantes }
 */
export class Piece {
  constructor(role, startNode, assets = {}) {
    this.role        = role;
    this.currentNode = startNode;
    this.assets      = assets;
    this.assetPath   = this.#pickAsset();
  }

  #pickAsset() {
    const keys = Object.keys(this.assets);
    if (!keys.length) return null;
    return this.assets.default ?? this.assets[keys[0]];
  }

  moveTo(nodeId) {
    const prev       = this.currentNode;
    this.currentNode = nodeId;
    return prev;
  }

  isAt(nodeId) { return this.currentNode === nodeId; }

  toString() { return `Piece(${this.role} @ ${this.currentNode})`; }
}
