/**
 * Player — Jugador (humano o IA)
 *
 * @param {string} name - Nombre del jugador
 * @param {Deck}   deck - Mazo asignado
 * @param {string} type - 'human' | 'ai'
 */
export class Player {
  constructor(name, deck, type = 'human') {
    this.id   = `player-${Math.random().toString(36).slice(2, 7)}`;
    this.name = name;
    this.deck = deck;
    this.type = type;
  }

  drawCard()        { return this.deck.draw(); }
  returnCard(card)  { this.deck.sendToBottom(card); }
  hasWon()          { return this.deck.isEmpty(); }
  get cardCount()   { return this.deck.count; }
  toString()        { return `Player(${this.name}, ${this.cardCount} cartas)`; }
}
