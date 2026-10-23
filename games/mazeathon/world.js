/* MazeAThon's deterministic world and rules. No DOM, network, or dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MazeWorld = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 31, H = 25, MAIN = 23, TOTAL = 3;
  const SHAPES = ['circle', 'triangle', 'diamond', 'star'];
  const BOOSTS = ['xray', 'map', 'shield', 'speed'];
  const THEMES = [
    { name: 'The Mossy Meadows', short: 'Meadows', wall: '#287b70', top: '#398d7d', floor: '#e9e4ca', dark: '#163e3e', accent: '#ffe3a0', monster: '#e6a4b8' },
    { name: 'The Lavender Library', short: 'Library', wall: '#71648f', top: '#9180aa', floor: '#ece1da', dark: '#332d4c', accent: '#f8d5a1', monster: '#e6bd69' },
    { name: 'The Moonlit Conservatory', short: 'Moonlight', wall: '#32687c', top: '#478b9b', floor: '#d5e5df', dark: '#172f45', accent: '#f6dfa6', monster: '#a0d9b1' }
  ];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const tile = p => ({x:Math.floor(p.x),y:Math.floor(p.y)});
  const center = p => ({x:p.x+.5,y:p.y+.5});
  function random(seed) {
    let s = seed >>> 0;
    return () => { s += 0x6D2B79F5; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  }
  function shuffle(a,rng) { for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
  function isOpen(world,x,y) {
    if(x<0||y<0||x>=W||y>=H||world.cells[y*W+x]!==0)return false;
    return !world.rooms.some(r=>!r.opened&&r.door.x===x&&r.door.y===y);
  }
  function findPath(world,from,to) {
    const a=tile(from),b=tile(to), start=a.y*W+a.x, end=b.y*W+b.x;
    if(!isOpen(world,a.x,a.y)||!isOpen(world,b.x,b.y))return [];
    const queue=[start], prev=new Int32Array(W*H).fill(-1);prev[start]=start;
    for(let k=0;k<queue.length&&prev[end]===-1;k++){
      const n=queue[k],x=n%W,y=Math.floor(n/W);
      for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy,i=ny*W+nx;if(isOpen(world,nx,ny)&&prev[i]===-1){prev[i]=n;queue.push(i);}}
    }
    if(prev[end]===-1)return [];
    const path=[];for(let n=end;;n=prev[n]){path.push(center({x:n%W,y:Math.floor(n/W)}));if(n===start)break;}
    return path.reverse();
  }
  function hasSight(world,a,b,wallFace=false) {
    // Traverse every crossed tile. Only vision may see the blocking destination
    // itself; monsters and floor visibility must have a clear ray all the way.
    let {x,y}=tile(a);const end=tile(b),dx=b.x-a.x,dy=b.y-a.y;
    if(!isOpen(world,x,y))return false;
    const sx=Math.sign(dx),sy=Math.sign(dy),tx=dx?1/Math.abs(dx):Infinity,ty=dy?1/Math.abs(dy):Infinity;
    let nextX=dx?(sx>0?x+1-a.x:a.x-x)*tx:Infinity;
    let nextY=dy?(sy>0?y+1-a.y:a.y-y)*ty:Infinity;
    while(x!==end.x||y!==end.y){
      if(Math.abs(nextX-nextY)<1e-9){
        // A ray cannot squeeze through a solid corner between two corridors.
        if(!isOpen(world,x+sx,y)||!isOpen(world,x,y+sy))return false;
        x+=sx;y+=sy;nextX+=tx;nextY+=ty;
      }else if(nextX<nextY){x+=sx;nextX+=tx;}
      else{y+=sy;nextY+=ty;}
      if(x===end.x&&y===end.y)return wallFace||isOpen(world,x,y);
      if(!isOpen(world,x,y))return false;
    }
    return true;
  }
  function generate(seed,section,layoutVersion=2) {
    const rng=random((seed+Math.imul(section+1,2654435761))>>>0), cells=Array(W*H).fill(1);
    const world={cells,rooms:[],shapes:[],monsters:[],exit:null,section};
    const stack=[{x:1,y:1}];cells[W+1]=0;
    while(stack.length){
      const p=stack[stack.length-1];
      const next=shuffle(dirs.map(([dx,dy])=>({x:p.x+dx*2,y:p.y+dy*2,dx,dy})),rng).find(q=>q.x>0&&q.x<=MAIN&&q.y>0&&q.y<H-1&&cells[q.y*W+q.x]===1);
      if(!next){stack.pop();continue;}
      cells[(p.y+next.dy)*W+p.x+next.dx]=0;cells[next.y*W+next.x]=0;stack.push(next);
    }
    // Loops give players alternate escape routes; rooms sit outside this connected maze.
    for(let y=1;y<H-1;y++)for(let x=1;x<MAIN;x++){
      if(cells[y*W+x]===1&&((x%2===0&&y%2===1)||(x%2===1&&y%2===0))&&rng()<.15)cells[y*W+x]=0;
    }
    if(section===0&&layoutVersion>=2){
      // A small loop and a cross-link offer choices immediately at camp. Both
      // sides also connect into the wider maze, rather than ending in cul-de-sacs.
      for(let n=1;n<=5;n++){cells[W+n]=0;cells[5*W+n]=0;cells[n*W+1]=0;cells[n*W+5]=0;cells[3*W+n]=0;}
      cells[2*W+3]=0;cells[4*W+3]=0;cells[W+6]=0;cells[6*W+1]=0;
    }
    [4,10,16,22].forEach((y,i)=>{
      for(let xx=23;xx<=26;xx++)cells[y*W+xx]=0;
      for(let yy=y-1;yy<=y+1;yy++)for(let xx=27;xx<=29;xx++)cells[yy*W+xx]=0;
      world.rooms.push({shape:i,boost:BOOSTS[i],door:{x:26,y},x:28.5,y:y+.5,opened:false,readyAt:0});
    });
    const start={x:1.5,y:1.5};
    const candidates=[];
    for(let y=1;y<H-1;y+=2)for(let x=1;x<=MAIN;x+=2)candidates.push({x:x+.5,y:y+.5});
    const lengths=new Map(candidates.map(p=>[p,findPath(world,start,p).length]));
    world.exit={...candidates.reduce((a,b)=>lengths.get(a)>lengths.get(b)?a:b)};
    const chosen=[start,world.exit];
    for(let i=0;i<4;i++){
      const options=candidates.filter(p=>!chosen.some(c=>distance(c,p)<2));
      const p=options.reduce((best,p)=>{
        const score=q=>Math.min(...chosen.map(c=>distance(q,c)))+lengths.get(q)*.025;
        return !best||score(p)>score(best)?p:best;
      },null);
      world.shapes.push({...p,id:i});chosen.push(p);
    }
    const spawn=shuffle(candidates.filter(p=>lengths.get(p)>10&&!chosen.some(c=>distance(c,p)<2)),rng);
    for(let i=0;i<4+section;i++)world.monsters.push(makeMonster(spawn[i],false,i));
    const guardian=candidates.filter(p=>distance(p,world.exit)>1.5&&distance(p,world.exit)<5&&lengths.get(p)>12).sort((a,b)=>distance(a,world.exit)-distance(b,world.exit))[0]||spawn[6];
    world.monsters.push(makeMonster(guardian,true,99));
    return world;
  }
  function makeMonster(p,big,id){return {...p,home:{...p},big,id,state:'idle',timer:0,cooldown:1.5,path:[],repath:0,look:1};}
  class Game {
    constructor(seed,saved){
      this.seed=seed>>>0;this.layoutVersion=2;this.section=0;this.keys=[];this.time=0;this.catches=0;this.status='playing';this.effects={xray:0,shield:0,speed:0};this.mapped=false;this.hint=0;this.events=[];this.rng=random(this.seed^1234);
      if(saved){
        if(saved.version!==1||!Number.isInteger(saved.seed)||!Number.isInteger(saved.section)||saved.section<0||saved.section>=TOTAL||!Array.isArray(saved.keys)||saved.keys.some(k=>!Number.isInteger(k)||k<0||k>3)||new Set(saved.keys).size!==saved.keys.length||!Number.isFinite(saved.time)||saved.time<0)throw new Error('Invalid saved game');
        this.seed=saved.seed>>>0;this.section=saved.section;this.keys=saved.keys;this.time=saved.time;this.catches=Number.isInteger(saved.catches)&&saved.catches>=0?saved.catches:0;
        this.layoutVersion=saved.layoutVersion===2?2:1;
      }
      this.loadSection();
      if(saved){
        this.keys=[...saved.keys];
        this.world.rooms.forEach((r,i)=>{r.opened=!!saved.opened?.[i]&&this.keys.includes(i);r.readyAt=Number.isFinite(saved.readyAt?.[i])?saved.readyAt[i]:0;});
        this.mapped=!!saved.mapped;
        if(Array.isArray(saved.discovered)&&saved.discovered.length===W*H)this.discovered=saved.discovered.map(v=>v===1?1:0);
        if(saved.player&&Number.isFinite(saved.player.x)&&Number.isFinite(saved.player.y)&&this.canStand(saved.player.x,saved.player.y))this.player={...saved.player};
        for(const k of ['xray','shield','speed'])this.effects[k]=Math.min(24,Math.max(0,Number(saved.effects?.[k])||0));
        if(saved.status==='section-complete'&&this.keys.length===4)this.status='section-complete';
        if(saved.status==='won'&&this.section===TOTAL-1&&this.keys.length===4)this.status='won';
        this.updateVision();
      }
    }
    loadSection(){
      this.world=generate(this.seed,this.section,this.layoutVersion);this.player={x:1.5,y:1.5};this.keys=[];this.discovered=Array(W*H).fill(0);this.visible=Array(W*H).fill(0);this.effects={xray:0,shield:0,speed:0};this.mapped=false;this.respawn=2.5;this.caughtPause=0;this.visionAt=0;this.doorMessageAt=0;this.hint=0;this.updateVision();
    }
    emit(type,data={}){this.events.push({type,...data});}
    drainEvents(){const a=this.events;this.events=[];return a;}
    canStand(x,y){const r=.22;return [[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>isOpen(this.world,Math.floor(x+dx),Math.floor(y+dy)));}
    move(dx,dy,dt){
      const n=Math.hypot(dx,dy);if(!n)return;
      const speed=this.effects.speed>0?5.7:3.6, dist=speed*dt, steps=Math.max(1,Math.ceil(dist/.12));
      for(let i=0;i<steps;i++){
        const x=this.player.x+dx/n*dist/steps,y=this.player.y+dy/n*dist/steps;
        if(this.canStand(x,this.player.y))this.player.x=x;
        if(this.canStand(this.player.x,y))this.player.y=y;
      }
    }
    step(dt,input={x:0,y:0}){
      if(this.status!=='playing')return;dt=Math.max(0,Math.min(dt,.1));this.time+=dt;this.respawn=Math.max(0,this.respawn-dt);this.caughtPause=Math.max(0,this.caughtPause-dt);this.hint=Math.max(0,this.hint-dt);
      for(const k of Object.keys(this.effects))this.effects[k]=Math.max(0,this.effects[k]-dt);
      for(const r of this.world.rooms){if(!r.opened&&distance(this.player,center(r.door))<1.35){
        if(this.keys.includes(r.shape)){r.opened=true;this.emit('door',{shape:r.shape});}
        else if(this.time>this.doorMessageAt){this.doorMessageAt=this.time+4;this.emit('locked',{shape:r.shape});}
      }}
      if(this.caughtPause===0)this.move(input.x,input.y,dt);
      for(const s of this.world.shapes)if(!this.keys.includes(s.id)&&distance(this.player,s)<.55){this.keys.push(s.id);this.emit('shape',{shape:s.id});}
      for(const r of this.world.rooms)if(r.opened&&r.readyAt<=this.time&&distance(this.player,r)<.6){
        r.readyAt=this.time+30;
        if(r.boost==='map'){this.mapped=true;this.discovered.fill(1);}else this.effects[r.boost]=Math.min(24,this.effects[r.boost]+14);
        this.emit('boost',{boost:r.boost});
      }
      for(const m of this.world.monsters)this.updateMonster(m,dt);
      if(distance(this.player,this.world.exit)<.65){
        if(this.keys.length===4){this.status=this.section===TOTAL-1?'won':'section-complete';this.emit(this.status);}
        else if(this.time>this.doorMessageAt){this.doorMessageAt=this.time+4;this.emit('exit-locked');}
      }
      if(this.time>this.visionAt){this.visionAt=this.time+.1;this.updateVision();}
    }
    updateMonster(m,dt){
      m.cooldown=Math.max(0,m.cooldown-dt);m.timer=Math.max(0,m.timer-dt);m.repath-=dt;
      const d=distance(m,this.player),sees=d<(m.big?3.4:5.5)&&hasSight(this.world,m,this.player);
      if(m.state==='idle'&&m.cooldown===0&&sees){m.state='windup';m.timer=m.big?1.2:.75;m.lastSeen={...this.player};m.path=[];m.repath=0;this.emit('spotted',{big:m.big});}
      if(m.state==='windup'&&sees)m.lastSeen={...this.player};
      if(m.state==='windup'&&m.timer===0){m.state='chase';m.timer=m.big?1.8:3.8;m.repath=0;}
      if(m.state==='chase'&&m.timer===0){m.state='return';m.cooldown=m.big?5:3;m.repath=0;}
      let target;
      if(m.state==='chase'){
        if(sees)m.lastSeen={...this.player};
        target=m.lastSeen||m.home;
      }
      else if(m.state==='return'){
        target=m.home;if(distance(m,m.home)<.15){m.x=m.home.x;m.y=m.home.y;m.state='idle';m.path=[];}
      }else if(m.state==='idle'&&!m.big){
        if(!m.wander||distance(m,m.wander)<.1){const a=tile(m),opts=dirs.map(([dx,dy])=>center({x:a.x+dx,y:a.y+dy})).filter(p=>isOpen(this.world,Math.floor(p.x),Math.floor(p.y))&&distance(p,m.home)<4);m.wander=opts[Math.floor(this.rng()*opts.length)]||m.home;m.repath=0;}
        target=m.wander;
      }
      if(target&&m.state!=='windup'){
        if(m.repath<=0&&(!m.path.length||(Math.abs(m.x%1-.5)<.08&&Math.abs(m.y%1-.5)<.08))){m.path=findPath(this.world,m,target);m.repath=.28;}
        // Reach the center of the current tile before turning to avoid corner cutting.
        while(m.path.length&&distance(m,m.path[0])<.07)m.path.shift();
        const p=m.path[0];if(p){const diff=distance(m,p),speed=m.state==='chase'?(m.big?3.8:2.05):(m.big?1.7:1.05),step=Math.min(diff,speed*dt);m.x+=(p.x-m.x)/diff*step;m.y+=(p.y-m.y)/diff*step;m.look=p.x>=m.x?1:-1;}
      }
      if(m.state!=='windup'&&this.respawn===0&&this.effects.shield===0&&distance(m,this.player)<(m.big?.65:.5))this.catchPlayer();
    }
    catchPlayer(){
      this.catches++;this.player={x:1.5,y:1.5};this.respawn=3;this.caughtPause=.5;
      for(const m of this.world.monsters){m.x=m.home.x;m.y=m.home.y;m.state='idle';m.cooldown=3;m.path=[];m.repath=0;m.wander=null;m.lastSeen=null;}
      this.updateVision();this.emit('caught');
    }
    nextSection(){if(this.status!=='section-complete')return;this.section++;this.status='playing';this.loadSection();this.emit('next-section');}
    updateVision(){
      this.visible.fill(0);
      const a=tile(this.player);
      for(let y=Math.max(0,a.y-6);y<=Math.min(H-1,a.y+6);y++)for(let x=Math.max(0,a.x-6);x<=Math.min(W-1,a.x+6);x++){
        if(distance(this.player,center({x,y}))<6.2){
          // A wall face can be seen; anything beyond that wall cannot.
          if(hasSight(this.world,this.player,center({x,y}),true)){this.visible[y*W+x]=1;this.discovered[y*W+x]=1;}
        }
      }
    }
    hintPath(){
      const targets=this.world.shapes.filter(s=>!this.keys.includes(s.id));if(!targets.length)targets.push(this.world.exit);
      return targets.map(t=>findPath(this.world,this.player,t)).filter(p=>p.length).sort((a,b)=>a.length-b.length)[0]||[];
    }
    save(){return {version:1,layoutVersion:this.layoutVersion,seed:this.seed,section:this.section,keys:[...this.keys],time:this.time,catches:this.catches,player:{...this.player},opened:this.world.rooms.map(r=>r.opened),readyAt:this.world.rooms.map(r=>r.readyAt),discovered:[...this.discovered],mapped:this.mapped,effects:{...this.effects},status:this.status};}
  }
  return {W,H,MAIN,TOTAL,SHAPES,BOOSTS,THEMES,random,generate,findPath,hasSight,isOpen,Game};
});
