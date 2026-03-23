import { Dice    } from './Dice.js';
import { Piece   } from './Piece.js';
import { GameTurn} from './GameTurn.js';
import { bus     } from '../../core/EventBus.js';

const NS = 'http://www.w3.org/2000/svg';
function mk(t){ return document.createElementNS(NS, t); }

/**
 * EscapaDelLoboGame — Orquestador + renderizador SVG del juego.
 *
 * Maneja tanto la lógica del juego como el render del SVG,
 * ya que el mapa (circuito + laberinto) es demasiado específico
 * para delegarlo a la UI genérica.
 *
 * Eventos emitidos (prefijo edl:):
 *   edl:started       { rabbit, wolf, path }
 *   edl:turn-start    { turn }
 *   edl:dice-rolled   { piece, value, reachableIds }
 *   edl:piece-moved   { piece, from, to }
 *   edl:wolf-wins     { wolf }
 *   edl:rabbit-wins   { rabbit }
 */
export class EscapaDelLoboGame {
  static id    = 'escapa-del-lobo';
  static label = 'Escapa del Lobo';

  // Layout constants (viewBox 200×180)
  static CX=100;static CY=90;static RX=85;static RY=68;
  static FX=100;static FY=90;static FRX=52;static FRY=42;
  static CN=40;
  static LG=13;static LCW=7.2;static LCH=5.8;

  get LOX(){ return EscapaDelLoboGame.FX-(EscapaDelLoboGame.LG*EscapaDelLoboGame.LCW)/2; }
  get LOY(){ return EscapaDelLoboGame.FY-(EscapaDelLoboGame.LG*EscapaDelLoboGame.LCH)/2; }

  constructor(config={}) {
    this.config      = config;
    this.dice        = new Dice(6);
    this.rabbit      = null;
    this.wolf        = null;
    this.currentTurn = null;
    this.running     = false;
    this.turnIndex   = 0;
    this.nodes       = [];
    this.labEntries  = [];
    this.labStart    = EscapaDelLoboGame.CN;
    this.entryAngles = [];
    this.goalA       = -1;
    this.goalB       = -1;
    this.goalAHit    = false;
    this.goalBHit    = false;
    this.histR       = [];
    this.histW       = [];
    this.visR        = new Set();
    this.visW        = new Set();
    this._treeSeed   = null;
    this._extSeed    = null;
  }

  get pieces()      { return [this.rabbit, this.wolf]; }
  get activePiece() { return this.pieces[this.turnIndex]; }
  get rabbitType()  { return this.config.playerTypes?.[0] ?? 'human'; }
  get wolfType()    { return this.config.playerTypes?.[1] ?? 'ai'; }
  get isHumanTurn() {
    return this.activePiece === this.rabbit ? this.rabbitType === 'human' : this.wolfType === 'human';
  }

  // Expose a minimal path-like API for UI
  get path() {
    return {
      getNode:     (id) => this.nodes[id] ?? null,
      getGoalNode: ()   => this.nodes[this.goalB] ?? this.nodes[this.goalA],
    };
  }

  start() {
    this._buildMap();
    this.rabbit    = new Piece('rabbit', 0,    this.config.assets?.rabbit ?? {});
    this.wolf      = new Piece('wolf',   Math.floor(EscapaDelLoboGame.CN/2), this.config.assets?.wolf ?? {});
    this.running   = true;
    this.turnIndex = 0;
    this.goalAHit  = false;
    this.goalBHit  = false;
    this.histR     = []; this.histW = [];
    this.visR = this._computeVis('rabbit');
    this.visW = this._computeVis('wolf');
    this._beginTurn();
    bus.emit('edl:started', { rabbit: this.rabbit, wolf: this.wolf });
  }

  restart() {
    this.running     = false;
    this.currentTurn = null;
    this.turnIndex   = 0;
    this._treeSeed   = null;
    this._extSeed    = null;
    this.start();
  }

  rollDice() {
    if (!this.running || !this.currentTurn?.isWaitingRoll()) return;
    const {dMin=1, dMax=3} = this.config;
    const value = dMin + Math.floor(Math.random() * (dMax - dMin + 1));
    const cur   = this.activePiece.currentNode;
    const blocked = this.activePiece === this.rabbit ? this.wolf.currentNode : null;
    const reachableIds = this._getReachable(cur, value, blocked);
    this.currentTurn.setDiceResult(value, reachableIds);
    bus.emit('edl:dice-rolled', { piece: this.activePiece, value, reachableIds });
  }

  moveTo(nodeId) {
    if (!this.running || !this.currentTurn?.isWaitingMove()) return;
    if (!this.currentTurn.canMoveTo(nodeId)) return;
    const piece = this.activePiece;
    const from  = piece.currentNode;
    const hist  = piece === this.rabbit ? this.histR : this.histW;
    hist.push(from); if (hist.length > 12) hist.shift();
    piece.moveTo(nodeId);
    this.currentTurn.stepsLeft = (this.currentTurn.stepsLeft ?? this.currentTurn.diceValue) - 1;
    if (piece === this.rabbit) this.visR = this._computeVis('rabbit');
    else this.visW = this._computeVis('wolf');
    bus.emit('edl:piece-moved', { piece, from, to: nodeId });

    // Check win conditions
    if (this.wolf.currentNode === this.rabbit.currentNode) {
      this.running = false; bus.emit('edl:wolf-wins', { wolf: this.wolf }); return;
    }
    const n = this.nodes[nodeId];
    if (piece === this.rabbit) {
      if (n?.type === 'goalA' && !this.goalAHit) { this.goalAHit = true; n.type = 'visited'; }
      if (n?.type === 'goalB' && !this.goalBHit) { this.goalBHit = true; n.type = 'visited'; }
      if (this.goalAHit && this.goalBHit) { this.running = false; bus.emit('edl:rabbit-wins', { rabbit: this.rabbit }); return; }
    }

    // More steps left?
    const remaining = this.currentTurn.stepsLeft;
    const newReachable = remaining > 0 ? this._getReachable(nodeId, 1, this.activePiece===this.rabbit?this.wolf.currentNode:null) : new Set();
    if (remaining > 0 && newReachable.size > 0) {
      this.currentTurn.reachableIds = newReachable;
      bus.emit('edl:dice-rolled', { piece: this.activePiece, value: remaining, reachableIds: newReachable });
    } else {
      setTimeout(() => this._nextTurn(), 500);
    }
  }

  _beginTurn() {
    this.currentTurn = new GameTurn(this.activePiece);
    bus.emit('edl:turn-start', { turn: this.currentTurn });
  }

  _nextTurn() {
    this.turnIndex = (this.turnIndex + 1) % 2;
    this._beginTurn();
  }

  // ── Map building ──
  _buildMap() {
    const {CN,CX,CY,RX,RY,LG,LCW,LCH} = EscapaDelLoboGame;
    const nodes = [];
    for (let i=0;i<CN;i++){
      const a=(Math.PI/2)-(2*Math.PI*i/CN);
      nodes.push({ id:i, x:+(CX+RX*Math.cos(a)).toFixed(1), y:+(CY-RY*Math.sin(a)).toFixed(1),
        type:i===0?'start':'normal', zone:'circuit',
        next:(i+1)%CN, prev:(i-1+CN)%CN, labConnect:null, isEntry:false });
    }
    const sp=Math.floor(CN/4), off=Math.floor(Math.random()*sp);
    const eIdx=[off,(off+sp)%CN,(off+sp*2)%CN,(off+sp*3)%CN];
    this.entryAngles = eIdx.map(i=>{ const n=nodes[i]; return Math.atan2(CY-n.y,n.x-CX); });
    this.labStart = CN;
    const maze=[];
    for (let r=0;r<LG;r++) for (let c=0;c<LG;c++){
      maze.push({ id:CN+r*LG+c, r, c,
        x:+(this.LOX+c*LCW+LCW/2).toFixed(1), y:+(this.LOY+r*LCH+LCH/2).toFixed(1),
        type:'normal', zone:'maze', walls:{N:true,S:true,E:true,W:true}, visited:false, neighbors:[] });
    }
    const mc=(r,c)=>(r<0||r>=LG||c<0||c>=LG)?null:maze[r*LG+c];
    const DIRS=[{dr:-1,dc:0,w:'N',ow:'S'},{dr:1,dc:0,w:'S',ow:'N'},{dr:0,dc:1,w:'E',ow:'W'},{dr:0,dc:-1,w:'W',ow:'E'}];
    const stk=[mc(0,0)]; mc(0,0).visited=true;
    while(stk.length){
      const cur=stk[stk.length-1];
      const uv=DIRS.map(d=>({d,cell:mc(cur.r+d.dr,cur.c+d.dc)})).filter(({cell})=>cell&&!cell.visited);
      if(!uv.length){stk.pop();continue}
      const{d,cell}=uv[Math.floor(Math.random()*uv.length)];
      cur.walls[d.w]=false;cell.walls[d.ow]=false;cell.visited=true;stk.push(cell);
    }
    maze.forEach(n=>{
      if(!n.walls.N&&n.r>0)       n.neighbors.push(n.id-LG);
      if(!n.walls.S&&n.r<LG-1)    n.neighbors.push(n.id+LG);
      if(!n.walls.E&&n.c<LG-1)    n.neighbors.push(n.id+1);
      if(!n.walls.W&&n.c>0)        n.neighbors.push(n.id-1);
    });
    const cr=Math.floor(LG/2),cc=Math.floor(LG/2);
    mc(cr,cc).type='goalB'; this.goalB=CN+cr*LG+cc;
    const all=[...nodes,...maze];
    this.labEntries=[];
    eIdx.forEach(ci=>{
      all[ci].isEntry=true;
      const border=maze.filter(n=>n.r===0||n.r===LG-1||n.c===0||n.c===LG-1);
      let best=border[0],bd=Infinity;
      border.forEach(n=>{const d=Math.hypot(n.x-all[ci].x,n.y-all[ci].y);if(d<bd){bd=d;best=n}});
      all[ci].labConnect=best.id;
      if(!best.neighbors.includes(ci))best.neighbors.push(ci);
      this.labEntries.push({cIdx:ci,mIdx:best.id});
    });
    const candA=nodes.filter(n=>Math.min(n.id,CN-n.id)>=8&&n.type==='normal'&&!n.isEntry);
    const gA=candA[Math.floor(Math.random()*candA.length)];
    gA.type='goalA'; this.goalA=gA.id;
    this.nodes = all;
  }

  // ── Visibility ──
  _computeVis(role) {
    const curIdx = role==='rabbit' ? this.rabbit?.currentNode : this.wolf?.currentNode;
    if (curIdx == null) return new Set();
    const hist = role==='rabbit' ? this.histR : this.histW;
    const fwd  = role==='rabbit' ? 1 : 2;
    const bwd  = role==='rabbit' ? 2 : 3;
    const vis  = new Set([curIdx]);
    const bfs  = (id, d) => { if(d<=0)return; this._getNbs(id,role).forEach(nb=>{if(!vis.has(nb)){vis.add(nb);bfs(nb,d-1)}}); };
    bfs(curIdx, fwd);
    hist.slice(-bwd).forEach(id => vis.add(id));
    return vis;
  }

  _getNbs(idx, role) {
    const n = this.nodes[idx]; if (!n) return [];
    if (n.zone==='circuit') {
      const ids=[n.next, n.prev];
      if (n.labConnect != null) ids.push(n.labConnect);
      return ids;
    }
    return [...n.neighbors];
  }

  _getReachable(fromId, steps, blockedId=null) {
    const reachable = new Set();
    this._getNbs(fromId, this.activePiece===this.rabbit?'rabbit':'wolf').forEach(id => {
      if (id !== blockedId) reachable.add(id);
    });
    return reachable;
  }

  // ── SVG Static rendering (called once per game) ──
  renderStaticToSVG({ forestBg, forestWall, extTrees }) {
    this._renderForestBg(forestBg);
    this._renderForestWall(forestWall);
    this._renderExtTrees(extTrees);
  }

  _renderForestBg(g) {
    g.innerHTML='';
    const {FX,FY,FRX,FRY} = EscapaDelLoboGame;
    const pts=[];
    for(let i=0;i<64;i++){const a=(Math.PI/2)-(2*Math.PI*i/64);pts.push(`${(FX+FRX*Math.cos(a)).toFixed(1)},${(FY-FRY*Math.sin(a)).toFixed(1)}`)}
    const poly=mk('polygon');poly.setAttribute('points',pts.join(' '));poly.setAttribute('fill','#060e06');g.appendChild(poly);
    if(!this._treeSeed){
      this._treeSeed=[];
      for(let i=0;i<45;i++){const a=Math.random()*Math.PI*2,r=0.08+Math.random()*.72;this._treeSeed.push({x:FX+FRX*r*Math.cos(a),y:FY-FRY*r*Math.sin(a),sz:1.6+Math.random()*1.1});}
    }
    this._treeSeed.forEach(tr=>{
      let on=false;
      for(const n of this.nodes.slice(this.labStart)){if(Math.hypot(n.x-tr.x,n.y-tr.y)<3){on=true;break}}
      if(on)return;
      const t=mk('text');t.setAttribute('x',tr.x.toFixed(1));t.setAttribute('y',tr.y.toFixed(1));t.setAttribute('font-size',tr.sz);t.setAttribute('text-anchor','middle');t.setAttribute('fill','#192e0e');t.setAttribute('opacity','0.8');t.textContent='🌲';g.appendChild(t);
    });
  }

  _renderForestWall(g) {
    g.innerHTML='';
    const {FX,FY,FRX,FRY} = EscapaDelLoboGame;
    const GAP=0.19;
    for(let i=0;i<110;i++){
      const angle=(2*Math.PI*i/110);
      if(this.entryAngles.some(ea=>Math.abs(((angle-ea)+Math.PI*3)%(Math.PI*2)-Math.PI)<GAP))continue;
      [1.0,1.14].forEach((rad,li)=>{
        const jx=(Math.random()-.5)*.2,jy=(Math.random()-.5)*.2;
        const tx=FX+FRX*(rad+jx)*Math.cos(angle),ty=FY-FRY*(rad+jy)*Math.sin(angle);
        if(tx<1||tx>199||ty<1||ty>179)return;
        const sz=2.4+Math.random()*1.2+li*.4;
        const t=mk('text');t.setAttribute('x',tx.toFixed(1));t.setAttribute('y',ty.toFixed(1));t.setAttribute('font-size',sz);t.setAttribute('text-anchor','middle');t.setAttribute('fill',li===0?'#183810':'#1e4a12');t.setAttribute('opacity','0.92');t.textContent='🌲';g.appendChild(t);
      });
    }
  }

  _renderExtTrees(g) {
    g.innerHTML='';
    const {CX,CY,RX,RY} = EscapaDelLoboGame;
    if(!this._extSeed){
      this._extSeed=[];
      for(let i=0;i<34;i++){
        const a=(2*Math.PI*i/34)+(Math.random()-.5)*.22,r=1.14+Math.random()*.18;
        const x=+(CX+RX*r*Math.cos(a)).toFixed(1),y=+(CY-RY*r*Math.sin(a)).toFixed(1);
        if(x<1||x>199||y<1||y>179)continue;
        this._extSeed.push({x,y,sz:+(3+Math.random()*1.6).toFixed(1)});
      }
      [[4,4,3.5],[18,3,3],[100,3,3.2],[182,3,3],[196,4,3.5],[4,170,3.5],[18,177,3],[100,177,3.2],[182,177,3],[196,170,3.5],[2,90,3.8],[198,90,3.8]].forEach(([x,y,sz])=>this._extSeed.push({x,y,sz}));
    }
    this._extSeed.forEach(({x,y,sz})=>{
      const t=mk('text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('font-size',sz);t.setAttribute('text-anchor','middle');t.setAttribute('fill','#243d12');t.setAttribute('opacity','0.6');t.textContent='🌲';g.appendChild(t);
    });
  }

  // ── SVG Dynamic rendering ──
  renderDynamicToSVG({ edges, nodes, pieces, labels }) {
    const turn = this.turnIndex === 0 ? 'rabbit' : 'wolf';
    const vis  = turn==='rabbit' ? this.visR : this.visW;
    this._renderEdges(edges, vis);
    this._renderNodes(nodes, vis);
    this._renderPieces(pieces, vis);
    this._renderLabels(labels, vis);
  }

  _isVis(id, vis) {
    const n=this.nodes[id]; if(!n)return false;
    return n.zone==='circuit'||vis.has(id);
  }

  _renderEdges(g, vis) {
    g.innerHTML='';
    const {CN} = EscapaDelLoboGame;
    for(let i=0;i<CN;i++){
      const a=this.nodes[i],b=this.nodes[a.next];
      const l=mk('line');l.setAttribute('x1',a.x);l.setAttribute('y1',a.y);l.setAttribute('x2',b.x);l.setAttribute('y2',b.y);l.setAttribute('stroke','rgba(180,140,60,.35)');l.setAttribute('stroke-width','1.4');l.setAttribute('stroke-dasharray','2.2,1.4');l.setAttribute('stroke-linecap','round');g.appendChild(l);
    }
    this.labEntries.forEach(({cIdx,mIdx})=>{
      if(!vis.has(mIdx))return;
      const cn=this.nodes[cIdx],mn=this.nodes[mIdx];
      const l=mk('line');l.setAttribute('x1',cn.x);l.setAttribute('y1',cn.y);l.setAttribute('x2',mn.x);l.setAttribute('y2',mn.y);l.setAttribute('stroke','rgba(201,168,76,.6)');l.setAttribute('stroke-width','1');l.setAttribute('stroke-dasharray','1.4,.8');g.appendChild(l);
    });
    for(let i=this.labStart;i<this.nodes.length;i++){
      if(!vis.has(i))continue;
      const n=this.nodes[i];
      n.neighbors.forEach(nbId=>{
        if(nbId<this.labStart||nbId<=i||!vis.has(nbId))return;
        const nb=this.nodes[nbId];
        const l=mk('line');l.setAttribute('x1',n.x);l.setAttribute('y1',n.y);l.setAttribute('x2',nb.x);l.setAttribute('y2',nb.y);l.setAttribute('stroke','rgba(90,155,60,.65)');l.setAttribute('stroke-width','2');l.setAttribute('stroke-linecap','round');g.appendChild(l);
      });
    }
  }

  _renderNodes(g, vis) {
    g.innerHTML='';
    const {CY} = EscapaDelLoboGame;
    this.nodes.forEach((n,i)=>{
      if(n.zone==='maze'&&!vis.has(i))return;
      const isStart=n.type==='start',isGA=n.type==='goalA',isGB=n.type==='goalB',isEntry=n.isEntry;
      let r,fill,stroke,lbl=null,lblAbove=false;
      if(isStart)      {r=3;fill='#2E7D52';stroke='#4CAF82';lbl='🏁';lblAbove=n.y>CY}
      else if(isGA)    {r=3;fill='#C9A84C';stroke='#e0be72';lbl='⭐A';lblAbove=n.y>CY}
      else if(isGB)    {r=2.8;fill='#C9A84C';stroke='#e0be72'}
      else if(isEntry) {r=2.6;fill='rgba(201,168,76,.22)';stroke='rgba(201,168,76,.8)'}
      else if(n.zone==='maze'){r=2;fill='rgba(35,65,20,.95)';stroke='rgba(80,140,50,.6)'}
      else             {r=2.2;fill='rgba(70,45,10,.9)';stroke='rgba(160,120,50,.45)'}
      const grp=mk('g');grp.setAttribute('id',`edl-nd-${i}`);grp.style.cursor='default';
      const ring=mk('circle');ring.setAttribute('cx',n.x);ring.setAttribute('cy',n.y);ring.setAttribute('r',r+.7);ring.setAttribute('fill','none');ring.setAttribute('stroke',stroke);ring.setAttribute('stroke-width','.4');grp.appendChild(ring);
      const circ=mk('circle');circ.setAttribute('cx',n.x);circ.setAttribute('cy',n.y);circ.setAttribute('r',r);circ.setAttribute('fill',fill);circ.setAttribute('stroke',stroke);circ.setAttribute('stroke-width','.35');circ.setAttribute('filter','url(#edl-shad)');grp.appendChild(circ);
      if(lbl){const t=mk('text');t.setAttribute('x',n.x);t.setAttribute('y',n.y+(lblAbove?-4.5:5.5));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','2.6');t.setAttribute('fill',stroke);t.setAttribute('font-weight','bold');t.textContent=lbl;grp.appendChild(t)}
      grp.addEventListener('click',()=>this._onNodeClick(i));
      grp.addEventListener('touchend',(e)=>{e.preventDefault();this._onNodeClick(i)});
      g.appendChild(grp);
    });
  }

  _onNodeClick(idx) {
    const turn=this.currentTurn;
    if(!turn?.isWaitingMove()||!this.isHumanTurn)return;
    if(!turn.canMoveTo(idx))return;
    this.moveTo(idx);
  }

  _renderPieces(g, vis) {
    g.innerHTML='';
    if(!this.running)return;
    const rn=this.nodes[this.rabbit?.currentNode],wn=this.nodes[this.wolf?.currentNode];
    if(!rn||!wn)return;
    const same=this.rabbit.currentNode===this.wolf.currentNode;
    const showW=wn.zone==='circuit'||vis.has(this.wolf.currentNode)||(this.turnIndex===1);
    const showR=rn.zone==='circuit'||vis.has(this.rabbit.currentNode)||(this.turnIndex===0);
    [[wn,2.2,'rgba(110,25,15,.95)','#e05050','🐺',showW],[rn,-2.2,'rgba(25,90,55,.95)','#4CAF82','🐰',showR]].forEach(([n,ox,fill,stroke,em,show])=>{
      if(!show)return;
      const og=mk('g');og.setAttribute('transform',`translate(${n.x+(same?ox:0)},${n.y})`);
      const bg=mk('circle');bg.setAttribute('r','4');bg.setAttribute('fill',fill);bg.setAttribute('stroke',stroke);bg.setAttribute('stroke-width','.7');bg.setAttribute('filter','url(#edl-pglow)');
      const et=mk('text');et.setAttribute('text-anchor','middle');et.setAttribute('dominant-baseline','central');et.setAttribute('font-size','5');et.textContent=em;
      og.appendChild(bg);og.appendChild(et);g.appendChild(og);
    });
  }

  _renderLabels(g, vis) {
    g.innerHTML='';
    const gb=this.nodes[this.goalB];
    if(gb&&vis.has(this.goalB)&&!this.goalBHit){
      const t=mk('text');t.setAttribute('x',gb.x);t.setAttribute('y',gb.y-4.5);t.setAttribute('text-anchor','middle');t.setAttribute('font-size','2.6');t.setAttribute('fill','#C9A84C');t.setAttribute('font-weight','bold');t.textContent='⭐B';g.appendChild(t);
    }
  }
}
