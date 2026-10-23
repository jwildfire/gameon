const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Game,W,H,TOTAL,generate,isOpen,hasSight}=require('./world.js');

// Independent flood fill: a generation mistake cannot be hidden by the game's pathfinder.
function reachable(world){
  const seen=new Set(['1,1']),queue=[[1,1]];
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){
    const [x,y]=queue[i],nx=x+dx,ny=y+dy,k=nx+','+ny;
    if(nx>=0&&ny>=0&&nx<W&&ny<H&&isOpen(world,nx,ny)&&!seen.has(k)){seen.add(k);queue.push([nx,ny]);}
  }
  return seen;
}
const key=p=>Math.floor(p.x)+','+Math.floor(p.y);

test('150 generated sections have reachable keys/exits, four genuinely locked rooms, and exactly one guardian',()=>{
  for(let seed=1;seed<=50;seed++)for(let section=0;section<TOTAL;section++){
    const w=generate(seed,section),before=reachable(w);
    assert.equal(w.shapes.length,4);assert.equal(new Set(w.shapes.map(key)).size,4);
    for(const s of w.shapes)assert.ok(before.has(key(s)),`unreachable shape: seed ${seed}, section ${section}`);
    assert.ok(before.has(key(w.exit)),'exit must not depend on entering a boost room');
    assert.equal(w.monsters.filter(m=>m.big).length,1);
    for(const r of w.rooms){assert.ok(!before.has(key(r)),'boost room must be locked');r.opened=true;assert.ok(reachable(w).has(key(r)),'matching key must make room accessible');}
    assert.ok(w.monsters.every(m=>before.has(key(m))));
  }
});

test('a seed reproduces the maze; a fresh seed makes a different adventure',()=>{
  assert.deepEqual(generate(2026,0),generate(2026,0));
  assert.notDeepEqual(generate(2026,0).cells,generate(2027,0).cells);
});

test('walls stop the player and block monster sight',()=>{
  const g=new Game(7);for(let i=0;i<100;i++)g.step(.02,{x:-1,y:0});assert.ok(g.player.x>=1.22);
  const w={cells:Array(W*H).fill(0),rooms:[]};w.cells[5*W+6]=1;
  assert.equal(hasSight(w,{x:5.5,y:5.5},{x:7.5,y:5.5}),false);
  assert.equal(hasSight(w,{x:5.5,y:4.5},{x:7.5,y:4.5}),true);
});

test('wall faces stay visible at close range on every side, without revealing the floor behind them',()=>{
  const g=new Game(7),wall={x:10,y:10};g.world.cells.fill(0);g.world.rooms=[];
  g.world.cells[wall.y*W+wall.x]=1;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])for(const gap of [.221,.23,.3,.49,.7,1.2])for(const offset of [-.27,0,.27]){
    g.player={x:10.5+dx*(.5+gap)+dy*offset,y:10.5+dy*(.5+gap)+dx*offset};
    assert.ok(g.canStand(g.player.x,g.player.y));g.discovered.fill(0);g.updateVision();
    assert.equal(g.visible[10*W+10],1,`wall disappeared: ${dx},${dy}, gap ${gap}, offset ${offset}`);
    const behind={x:10-dx,y:10-dy};
    assert.equal(g.visible[behind.y*W+behind.x],0,'wall must hide the next floor tile');
    assert.equal(g.discovered[behind.y*W+behind.x],0,'hidden floor must not be added to the map');
    assert.equal(hasSight(g.world,g.player,{x:10.5,y:10.5}),false,'monsters cannot see inside walls');
  }
});

test('sight checks every crossed tile, closed door, and solid corner',()=>{
  const w={cells:Array(W*H).fill(0),rooms:[{door:{x:6,y:5},opened:false}]};
  assert.equal(hasSight(w,{x:5.77,y:5.5},{x:6.5,y:5.5},true),true,'closed door face is visible');
  assert.equal(hasSight(w,{x:5.77,y:5.5},{x:7.5,y:5.5}),false);
  w.rooms[0].opened=true;
  assert.equal(hasSight(w,{x:5.77,y:5.5},{x:7.5,y:5.5}),true);
  w.cells[5*W+6]=1;w.cells[6*W+5]=1;
  assert.equal(hasSight(w,{x:5.5,y:5.5},{x:6.5,y:6.5}),false,'no diagonal corner leak');
  // This ray spends less than one old sampling interval inside the corner wall.
  assert.equal(hasSight(w,{x:5.1,y:5.11},{x:7.1,y:7.11}),false);
});

test('100 first sections offer two useful routes from camp and another choice within three steps',()=>{
  for(let seed=1;seed<=100;seed++){
    const w=generate(seed,0),start=1*W+1;
    const routes=[[2,1],[1,2]].filter(([x,y])=>isOpen(w,x,y));
    assert.equal(routes.length,2,`camp needs two exits for seed ${seed}`);
    // Explore each route with camp blocked. Both must reach well outside the
    // opening, with an early fork, rather than being two short dead ends.
    w.cells[start]=1;
    for(const [x,y] of routes){
      const queue=[[x,y,1]],seen=new Set([x+','+y]);let fork=false,beyond=false;
      for(let i=0;i<queue.length;i++){
        const [cx,cy,depth]=queue[i],next=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]].filter(([nx,ny])=>isOpen(w,nx,ny));
        if(depth<=3&&next.length>=3)fork=true;
        if(cx>=7||cy>=7)beyond=true;
        for(const [nx,ny] of next)if(!seen.has(nx+','+ny)){seen.add(nx+','+ny);queue.push([nx,ny,depth+1]);}
      }
      assert.ok(fork&&beyond&&seen.size>40,`route is not useful for seed ${seed}`);
    }
  }
});

test('legacy adventures retain identical layouts and key positions; new saves retain the opening loop',()=>{
  const fixtures=[[1,'21077d86860ccc6cf6acec10ff9dde26bd88bffe91c7cfffa42bd8d708740597'],[7,'f4421f64c3cccae2d7c1a24a00cc389f235354cfb214185a59c757e305067ce4'],[2026,'b7862a65f749290f12c6db7a93bca35ae0801b17fd8eceeba12bd22c453a3b1a']];
  for(const [seed,hash] of fixtures){
    assert.equal(createHash('sha256').update(JSON.stringify(generate(seed,0,1))).digest('hex'),hash);
    const saved=new Game(seed).save();delete saved.layoutVersion;saved.keys=[0];saved.opened[0]=true;
    const legacy=new Game(seed,saved);
    assert.equal(legacy.layoutVersion,1);assert.deepEqual(legacy.world.cells,generate(seed,0,1).cells);
    assert.deepEqual(legacy.keys,[0]);assert.equal(legacy.world.rooms[0].opened,true);
    assert.equal(new Game(seed,legacy.save()).layoutVersion,1);
    const fresh=new Game(seed),restored=new Game(seed,fresh.save());
    assert.equal(restored.layoutVersion,2);assert.deepEqual(restored.world,fresh.world);
    assert.deepEqual(generate(seed,1,1),generate(seed,1,2),'later sections stay unchanged');
  }
});

test('matching reusable keys open boost rooms and all four boosts do something distinct',()=>{
  const g=new Game(13);
  for(const s of g.world.shapes){g.player={x:s.x,y:s.y};g.step(0);}
  assert.equal(g.keys.length,4);
  for(const r of g.world.rooms){
    g.player={x:r.door.x-.5,y:r.door.y+.5};g.step(0);assert.equal(r.opened,true);
    g.player={x:r.x,y:r.y};g.step(0);assert.equal(r.readyAt,30);
    if(r.boost==='map'){assert.equal(g.mapped,true);assert.ok(g.discovered.every(v=>v===1));}
    else{assert.equal(g.effects[r.boost],14);g.step(0);assert.equal(g.effects[r.boost],14,'standing on a shrine must not stack it every frame');}
  }
  assert.equal(g.keys.length,4,'opening a room must not spend a key');
});

test('a wrong shape cannot open a door, and a catch preserves progress at a safe section start',()=>{
  const g=new Game(12),r=g.world.rooms[0];g.player={x:r.door.x-.5,y:r.door.y+.5};g.step(0);assert.equal(r.opened,false);
  g.keys=[0];g.step(0);assert.equal(r.opened,true);
  const m=g.world.monsters[0];g.player={x:m.x,y:m.y};g.respawn=0;g.step(0);
  assert.equal(g.catches,1);assert.deepEqual(g.player,{x:1.5,y:1.5});assert.deepEqual(g.keys,[0]);assert.equal(r.opened,true);assert.ok(g.respawn>0);
  g.player={x:m.x,y:m.y};g.respawn=0;g.effects.shield=5;g.step(.01);assert.equal(g.catches,1,'shield prevents catches');
});

test('small monsters and guardians stand still throughout their warning, then chase for a finite time',()=>{
  const g=new Game(8);g.world.cells.fill(0);g.world.rooms=[];g.player={x:15.5,y:10.5};g.effects.shield=100;g.respawn=0;
  const m={x:11.5,y:10.5,home:{x:11.5,y:10.5},big:false,id:0,state:'idle',cooldown:0,timer:0,path:[],repath:0};
  g.world.monsters=[m];g.updateMonster(m,0);assert.equal(m.state,'windup');
  g.updateMonster(m,.74);assert.equal(m.state,'windup');assert.equal(m.x,11.5);
  for(let i=0;i<12;i++)g.updateMonster(m,.1);assert.equal(m.state,'chase');assert.ok(m.x>12.5,'monster must advance instead of oscillating at tile centers');
  for(let i=0;i<28;i++)g.updateMonster(m,.1);assert.notEqual(m.state,'chase','line of sight must not reset the chase indefinitely');assert.ok(m.cooldown>0);
  const big={x:13.5,y:10.5,home:{x:13.5,y:10.5},big:true,id:99,state:'idle',cooldown:0,timer:0,path:[],repath:0};g.world.monsters=[big];
  g.updateMonster(big,.1);assert.equal(big.state,'windup');assert.equal(big.x,13.5);
  g.updateMonster(big,1.19);assert.equal(big.state,'windup');assert.equal(big.x,13.5);
  g.updateMonster(big,.02);assert.equal(big.state,'chase');assert.ok(big.x>13.5);
});

test('rounding a corner within catch distance still gives the full warning before a catch',()=>{
  for(const big of [false,true]){
    const g=new Game(8);g.world.cells.fill(0);g.world.rooms=[];g.respawn=0;g.player={x:10.7,y:10.5};
    const m={x:10.5,y:10.5,home:{x:10.5,y:10.5},big,state:'idle',cooldown:0,timer:0,path:[],repath:0};g.world.monsters=[m];
    g.updateMonster(m,0);assert.equal(g.catches,0);assert.equal(m.state,'windup');
    g.updateMonster(m,big?1.19:.74);assert.equal(g.catches,0);assert.equal(m.x,10.5);
    g.updateMonster(m,.02);assert.equal(g.catches,1);
  }
});

test('all twelve keys are required over three sections; a complete save restores safely',()=>{
  const g=new Game(21);
  for(let section=0;section<TOTAL;section++){
    g.player={...g.world.exit};g.step(0);assert.equal(g.status,'playing','no exit without all four local keys');
    g.keys=[0,1,2,3];g.step(0);
    assert.equal(g.status,section===2?'won':'section-complete');
    const restored=new Game(g.seed,JSON.parse(JSON.stringify(g.save())));assert.equal(restored.status,g.status);assert.equal(restored.section,section);assert.equal(restored.keys.length,4);
    if(section<2){g.nextSection();assert.equal(g.section,section+1);assert.equal(g.keys.length,0);assert.deepEqual(g.player,{x:1.5,y:1.5});}
  }
});

test('after losing sight, a monster searches the last seen position rather than tracking through walls',()=>{
  const g=new Game(9);g.world.cells.fill(0);g.world.rooms=[];g.player={x:15.5,y:10.5};g.effects.shield=100;
  const m={x:12.5,y:10.5,home:{x:12.5,y:10.5},big:false,id:0,state:'idle',cooldown:0,timer:0,path:[],repath:0};g.world.monsters=[m];
  g.updateMonster(m,.1);assert.deepEqual(m.lastSeen,{x:15.5,y:10.5});
  for(let y=0;y<H;y++)g.world.cells[y*W+14]=1;
  g.player.y=11.5;g.updateMonster(m,.1);assert.equal(m.state,'windup');assert.deepEqual(m.lastSeen,{x:15.5,y:10.5});
  for(let i=0;i<12;i++)g.updateMonster(m,.1);
  assert.equal(m.state,'chase');assert.deepEqual(m.lastSeen,{x:15.5,y:10.5});assert.equal(m.x,12.5,'no movement through the wall');
});

test('corrupt saves are rejected, and an invalid saved position falls back to camp',()=>{
  const g=new Game(1),s=g.save();assert.throws(()=>new Game(1,{...s,section:99}));assert.throws(()=>new Game(1,{...s,keys:[0,0]}));
  const restored=new Game(1,{...s,player:{x:-100,y:0}});assert.deepEqual(restored.player,{x:1.5,y:1.5});
});
