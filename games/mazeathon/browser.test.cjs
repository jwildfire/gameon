/* Run: node games/mazeathon/browser.test.cjs
 * Requires Playwright with Chromium installed. CHROMIUM_PATH optionally selects an
 * existing browser. A private static server is started and stopped by this script.
 * The full playthrough uses real keyboard inputs with Playwright's virtual clock;
 * game state is only read, never changed or teleported by the test.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {W,H,isOpen}=require('./world.js');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.env.MAZEATHON_ARTIFACT_DIR||path.join(ROOT,'artifacts/2026-10-22-mazeathon-playtest'));
fs.mkdirSync(OUT,{recursive:true});
const errors=[];
const uiOnly=process.argv.includes('--ui-only');
function track(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
const snapshot=p=>p.evaluate(()=>window.MazeAThon.inspect());
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://test'),name=decodeURIComponent(url.pathname);let f=path.resolve(ROOT,'.'+name);
    if(!f.startsWith(ROOT+path.sep)&&f!==ROOT){res.writeHead(403);res.end();return;}
    if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'})[path.extname(f)]||'text/html');res.end(fs.readFileSync(f));
  }catch{res.writeHead(404);res.end('Not found');}
});

// Prefer alternate corridors around monsters. The bot has exactly the same move
// speed, collisions, boosts, and catch consequences as a human player.
function route(s,target){
  const a={x:Math.floor(s.player.x),y:Math.floor(s.player.y)},b={x:Math.floor(target.x),y:Math.floor(target.y)},start=a.y*W+a.x,end=b.y*W+b.x;
  const costs=Array(W*H).fill(Infinity),prev=Array(W*H).fill(-1),open=[start];costs[start]=0;
  while(open.length){
    open.sort((a,b)=>costs[a]-costs[b]);const n=open.shift();if(n===end)break;
    const x=n%W,y=Math.floor(n/W);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(!isOpen(s.world,nx,ny))continue;const ni=ny*W+nx;
      let danger=0;
      if(s.effects.shield<=0&&s.respawn<=0)for(const m of s.world.monsters){const d=Math.hypot(nx+.5-m.x,ny+.5-m.y);danger+=d<1.1?35:d<(m.big?3.5:2.2)?5:0;}
      const cost=costs[n]+1+danger;if(cost<costs[ni]){costs[ni]=cost;prev[ni]=n;if(!open.includes(ni))open.push(ni);}
    }
  }
  if(prev[end]===-1&&start!==end)throw Error('No route to '+JSON.stringify(target));
  const result=[];for(let n=end;;n=prev[n]){result.push({x:n%W+.5,y:Math.floor(n/W)+.5});if(n===start)break;}
  return result.reverse();
}
async function goTo(p,target){
  for(let i=0;i<1300;i++){
    const s=await snapshot(p);if(s.mode!=='playing')return;
    if(Math.hypot(s.player.x-target.x,s.player.y-target.y)<.17)return;
    assert.ok(s.catches<45,'catch loop: '+JSON.stringify(s.player));
    const steps=route(s,target),c=steps[0];
    const align=Math.hypot(s.player.x-c.x,s.player.y-c.y)>.10;
    const next=align?c:(steps[1]||target),dx=next.x-s.player.x,dy=next.y-s.player.y;
    const horizontal=Math.abs(dx)>Math.abs(dy),delta=horizontal?dx:dy;
    const key=horizontal?(delta>0?'ArrowRight':'ArrowLeft'):(delta>0?'ArrowDown':'ArrowUp');
    const ms=Math.max(20,Math.min(300,Math.abs(delta)/(s.effects.speed>0?5.7:3.6)*1000));
    await p.keyboard.down(key);await p.clock.runFor(ms);await p.keyboard.up(key);
    if(i===1299)throw Error('Navigation stuck: '+JSON.stringify({target,player:s.player,keys:s.keys,catches:s.catches}));
  }
}

(async()=>{
  server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.CHROMIUM_PATH?['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']:[]});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),p=await context.newPage();track(p);
    await p.goto(base+'/games/mazeathon/?seed=2026');await p.locator('#begin').waitFor();
    await p.screenshot({path:path.join(OUT,'desktop-title.png')});
    await p.locator('#help').click();await p.keyboard.press('Escape');assert.equal((await snapshot(p)).mode,'title','help must return to title before starting');
    await p.locator('#begin').click();await p.keyboard.down('ArrowDown');await p.waitForTimeout(450);await p.keyboard.up('ArrowDown');
    assert.ok((await snapshot(p)).player.y>1.6,'keyboard controls move the player');
    await p.locator('#pause').click();const paused=await snapshot(p);await p.waitForTimeout(200);assert.equal((await snapshot(p)).time,paused.time,'pause freezes simulation');
    await p.locator('#resume').click();await p.locator('#map').click();assert.equal((await snapshot(p)).mode,'map');await p.keyboard.press('Escape');
    await p.locator('#hint').click();await p.screenshot({path:path.join(OUT,'desktop-game.png')});
    await p.locator('#pause').click();const beforeReload=await snapshot(p);await p.reload();
    await p.locator('#help').click();await p.keyboard.press('Escape');await p.locator('#new-title').click();await p.locator('#cancel-new').click();
    await p.locator('#continue').click();const resumed=await snapshot(p);assert.equal(resumed.seed,beforeReload.seed);assert.deepEqual(resumed.keys,beforeReload.keys);assert.equal(resumed.section,beforeReload.section);
    console.log('PASS desktop controls, pause, map, help, cancel-new, reload and continue');

    // Stop wall-clock time while keeping every animation-frame update and keyboard event.
    if(!uiOnly){
    const now=Date.now();await p.clock.install({time:now});await p.clock.pauseAt(now+100);
    for(let section=0;section<3;section++){
      let state=await snapshot(p);assert.equal(state.section,section);
      // Triangle first makes its map room available early in the first section.
      for(const id of [1,0,2,3]){
        state=await snapshot(p);if(!state.keys.includes(id))await goTo(p,state.world.shapes.find(s=>s.id===id));
        assert.ok((await snapshot(p)).keys.includes(id),'shape '+id+' collected through keyboard movement');
        if(section===0){
          const r=(await snapshot(p)).world.rooms[id];await goTo(p,r.entry||{x:r.door.x-.5,y:r.door.y+.5});await p.clock.runFor(32);
          assert.ok((await snapshot(p)).world.rooms[id].opened,'matching room opens');
          await goTo(p,r);state=await snapshot(p);assert.ok(state.world.rooms[id].readyAt>0,'boost '+r.boost+' activates');
          if(r.boost==='map')assert.equal(state.mapped,true);else assert.ok(state.effects[r.boost]>0);
        }
      }
      state=await snapshot(p);await p.screenshot({path:path.join(OUT,'section-'+(section+1)+'.png')});await goTo(p,state.world.exit);
      state=await snapshot(p);assert.equal(state.status,section===2?'won':'section-complete');
      console.log('PASS section '+(section+1)+' completed; '+state.catches+' catches, '+Math.floor(state.time)+' simulated seconds');
      if(section<2)await p.locator('#next').click();
    }
    await p.screenshot({path:path.join(OUT,'completed.png')});assert.equal((await snapshot(p)).mode,'won');
    assert.equal(await p.locator('#total-count').innerText(),'12 / 12 shapes');
    console.log('PASS complete three-section browser playthrough and all four boost rooms');
    }

    const phone=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await phone.addInitScript(()=>localStorage.removeItem('gameon.mazeathon.save.v1'));
    const mobile=await phone.newPage();track(mobile);
    await mobile.goto(base+'/games/mazeathon/?seed=2026');await mobile.screenshot({path:path.join(OUT,'phone-title.png')});await mobile.locator('#begin').click();
    const before=await snapshot(mobile),button=await mobile.getByRole('button',{name:'Move down',exact:true}).boundingBox();
    const cdp=await phone.newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});await mobile.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok((await snapshot(mobile)).player.y>before.player.y+.3,'real touch hold moves the player');
    const still=await snapshot(mobile);await mobile.waitForTimeout(180);assert.ok(Math.abs((await snapshot(mobile)).player.y-still.player.y)<.05,'touch release stops movement');
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone has no horizontal overflow');
    for(const selector of ['#pause','#map','#hint','.dpad']){const r=await mobile.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=375&&r.y+r.height<=812,selector+' fits phone viewport');}
    await mobile.screenshot({path:path.join(OUT,'phone-game.png')});await mobile.locator('#map').click();await mobile.screenshot({path:path.join(OUT,'phone-map.png')});await mobile.locator('#map-close').click();
    await mobile.setViewportSize({width:812,height:375});await mobile.waitForTimeout(100);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    for(const button of await mobile.locator('.dpad button').all()){const r=await button.boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=812&&r.y+r.height<=375,'landscape movement button fits viewport');assert.ok(r.width>=43&&r.height>=43,'landscape touch target is large enough');}
    await mobile.screenshot({path:path.join(OUT,'phone-landscape.png')});
    await mobile.setViewportSize({width:320,height:568});await mobile.locator('#help').click();await mobile.locator('#help-close').click();
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'small phone has no overflow');
    console.log('PASS phone touch hold/release, controls, map, portrait and landscape layouts');

    const blocked=await browser.newContext(),blockedPage=await blocked.newPage();track(blockedPage);await blockedPage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}}));
    await blockedPage.goto(base+'/games/mazeathon/');await blockedPage.locator('#begin').click();assert.equal((await snapshot(blockedPage)).storageOK,false);assert.equal((await snapshot(blockedPage)).mode,'playing');
    const offline=await browser.newContext({offline:true}),offlinePage=await offline.newPage();track(offlinePage);await offlinePage.goto(pathToFileURL(path.join(__dirname,'index.html')).href);await offlinePage.locator('#begin').click();assert.equal((await snapshot(offlinePage)).mode,'playing');
    assert.deepEqual(errors,[],'no browser console or page errors');console.log('PASS blocked-storage fallback, offline direct-file play, and no console errors');
    fs.writeFileSync(path.join(OUT,uiOnly?'ui-results.json':'browser-results.json'),JSON.stringify({passed:true,fullPlaythrough:!uiOnly,seed:2026,desktop:'1440x960',phone:'375x812',landscape:'812x375',smallPhone:'320x568',final:await snapshot(p),errors},null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
