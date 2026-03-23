/**
 * Path — Grafo del tablero: nodos y sus conexiones.
 *
 * El tablero es un grafo no dirigido donde cada nodo tiene:
 *   id       → identificador único
 *   x, y     → coordenadas visuales (0–100, porcentaje del tablero)
 *   type     → 'normal' | 'start' | 'goal' | 'trap' | 'boost'
 *   connects → array de ids de nodos vecinos (adyacentes)
 *
 * Tanto el lobo como el conejo se mueven por este mismo grafo.
 * El lobo puede ir en cualquier dirección; el conejo también.
 *
 * El layout por defecto simula un bosque con caminos ramificados.
 */
export class Path {
  constructor(nodes = Path.DEFAULT_NODES) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
  }

  getNode(id)       { return this.nodes.get(id) ?? null; }
  getNeighbors(id)  { return this.getNode(id)?.connects.map(nid => this.getNode(nid)).filter(Boolean) ?? []; }
  getStartNode()    { return [...this.nodes.values()].find(n => n.type === 'start'); }
  getGoalNode()     { return [...this.nodes.values()].find(n => n.type === 'goal'); }
  getWolfStartNode(){ return [...this.nodes.values()].find(n => n.type === 'wolf-start') ?? this.getStartNode(); }
  getAllNodes()      { return [...this.nodes.values()]; }

  /**
   * Retorna todos los nodos alcanzables desde `fromId` en exactamente
   * `steps` pasos, sin revisitar el nodo de origen inmediato.
   * El jugador elige a cuántos pasos moverse (1 hasta el valor del dado).
   *
   * @param {string} fromId     - Nodo actual del jugador
   * @param {number} maxSteps   - Valor del dado
   * @param {string} blockedId  - Nodo ocupado por el rival (no puede parar ahí el conejo, sí el lobo)
   * @returns {Set<string>}     - Ids de nodos alcanzables
   */
  getReachableNodes(fromId, maxSteps, blockedId = null) {
    const reachable = new Set();

    const dfs = (currentId, stepsLeft, visited) => {
      if (stepsLeft === 0) {
        if (currentId !== fromId) reachable.add(currentId);
        return;
      }
      for (const neighbor of this.getNeighbors(currentId)) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          dfs(neighbor.id, stepsLeft - 1, visited);
          visited.delete(neighbor.id);
        }
      }
      // También puede parar antes de agotar todos los pasos
      if (currentId !== fromId) reachable.add(currentId);
    };

    const visited = new Set([fromId]);
    dfs(fromId, maxSteps, visited);

    if (blockedId) reachable.delete(blockedId);
    return reachable;
  }

  // ── Layout por defecto: bosque con caminos ramificados ──

  static DEFAULT_NODES = [
    // Inicio y meta
    { id: 'start',  x: 50,  y: 92,  type: 'start',      connects: ['n1', 'n2'] },
    { id: 'goal',   x: 50,  y: 8,   type: 'goal',       connects: ['n19', 'n20'] },
    { id: 'wstart', x: 20,  y: 92,  type: 'wolf-start', connects: ['n1', 'w1'] },

    // Rama central izquierda (sube por la izquierda)
    { id: 'n1',  x: 30, y: 82,  type: 'normal', connects: ['start', 'wstart', 'n3', 'n4'] },
    { id: 'n2',  x: 65, y: 82,  type: 'normal', connects: ['start', 'n5', 'n6'] },

    { id: 'w1',  x: 10, y: 78,  type: 'normal', connects: ['wstart', 'w2'] },
    { id: 'w2',  x: 10, y: 62,  type: 'normal', connects: ['w1', 'w3', 'n7'] },
    { id: 'w3',  x: 10, y: 46,  type: 'normal', connects: ['w2', 'w4'] },
    { id: 'w4',  x: 10, y: 30,  type: 'normal', connects: ['w3', 'n16'] },

    { id: 'n3',  x: 25, y: 70,  type: 'normal', connects: ['n1', 'n7', 'n8'] },
    { id: 'n4',  x: 38, y: 74,  type: 'normal', connects: ['n1', 'n9'] },
    { id: 'n5',  x: 72, y: 72,  type: 'normal', connects: ['n2', 'n10', 'n11'] },
    { id: 'n6',  x: 82, y: 82,  type: 'normal', connects: ['n2', 'n12'] },

    { id: 'n7',  x: 18, y: 58,  type: 'normal', connects: ['n3', 'w2', 'n13'] },
    { id: 'n8',  x: 32, y: 60,  type: 'normal', connects: ['n3', 'n9', 'n14'] },
    { id: 'n9',  x: 44, y: 66,  type: 'normal', connects: ['n4', 'n8', 'n15'] },
    { id: 'n10', x: 68, y: 58,  type: 'normal', connects: ['n5', 'n15', 'n17'] },
    { id: 'n11', x: 80, y: 68,  type: 'normal', connects: ['n5', 'n12', 'n17'] },
    { id: 'n12', x: 88, y: 55,  type: 'normal', connects: ['n6', 'n11', 'n18'] },

    { id: 'n13', x: 22, y: 44,  type: 'normal', connects: ['n7', 'n14', 'n16'] },
    { id: 'n14', x: 36, y: 48,  type: 'normal', connects: ['n8', 'n13', 'n15'] },
    { id: 'n15', x: 50, y: 52,  type: 'normal', connects: ['n9', 'n10', 'n14', 'n17'] },
    { id: 'n16', x: 18, y: 30,  type: 'normal', connects: ['n13', 'w4', 'n19'] },
    { id: 'n17', x: 72, y: 44,  type: 'normal', connects: ['n10', 'n11', 'n12', 'n18', 'n20'] },
    { id: 'n18', x: 86, y: 35,  type: 'normal', connects: ['n12', 'n17', 'n20'] },

    { id: 'n19', x: 34, y: 18,  type: 'normal', connects: ['n16', 'goal', 'n20'] },
    { id: 'n20', x: 62, y: 18,  type: 'normal', connects: ['n17', 'n18', 'goal', 'n19'] },
  ];
}
