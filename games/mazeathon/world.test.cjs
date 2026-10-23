const test=require('node:test');
const assert=require('node:assert/strict');
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

test('small monsters actually move, have finite chases, and guardians warn before attacking',()=>{
  const g=new Game(8);g.world.cells.fill(0);g.world.rooms=[];g.player={x:15.5,y:10.5};g.effects.shield=100;g.respawn=0;
  const m={x:11.5,y:10.5,home:{x:11.5,y:10.5},big:false,id:0,state:'idle',cooldown:0,timer:0,path:[],repath:0};
  g.world.monsters=[m];for(let i=0;i<10;i++)g.updateMonster(m,.1);assert.equal(m.state,'chase');assert.ok(m.x>12.5,'monster must advance instead of oscillating at tile centers');
  for(let i=0;i<32;i++)g.updateMonster(m,.1);assert.notEqual(m.state,'chase','line of sight must not reset the chase indefinitely');assert.ok(m.cooldown>0);
  const big={x:13.5,y:10.5,home:{x:13.5,y:10.5},big:true,id:99,state:'idle',cooldown:0,timer:0,path:[],repath:0};g.world.monsters=[big];
  g.updateMonster(big,.1);assert.equal(big.state,'windup');assert.equal(big.x,13.5);
  for(let i=0;i<9;i++)g.updateMonster(big,.1);assert.equal(big.state,'chase');
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
  g.player.y=11.5;g.updateMonster(m,.1);assert.deepEqual(m.lastSeen,{x:15.5,y:10.5});
});

test('corrupt saves are rejected, and an invalid saved position falls back to camp',()=>{
  const g=new Game(1),s=g.save();assert.throws(()=>new Game(1,{...s,section:99}));assert.throws(()=>new Game(1,{...s,keys:[0,0]}));
  const restored=new Game(1,{...s,player:{x:-100,y:0}});assert.deepEqual(restored.player,{x:1.5,y:1.5});
});
