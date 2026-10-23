// Run from the repo root with Playwright and Chromium available.
// CHROMIUM_PATH optionally selects an existing browser.
// GAMEON_LIVE_URL verifies a deployed arcade instead of the local path fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.resolve(process.env.GAMEON_ARTIFACT_DIR||__dirname),errors=[],live=process.env.GAMEON_LIVE_URL;
fs.mkdirSync(OUT,{recursive:true});
const server=http.createServer((req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://fixture').pathname).replace(/^\/gameon\/(dev\/)?/,'/');let f=path.resolve(ROOT,'.'+name);
    if(!f.startsWith(ROOT+path.sep)&&f!==ROOT){res.writeHead(403);res.end();return;}
    if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png'})[path.extname(f)]||'text/html');res.end(fs.readFileSync(f));
  }catch{res.writeHead(404);res.end('Not found');}
});
(async()=>{
  server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const local='http://127.0.0.1:'+server.address().port,roots=live?[live]:[local+'/gameon/',local+'/gameon/dev/'];
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.CHROMIUM_PATH?['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage']:[]});
  const checks=[];
  try{
    for(const root of roots)for(const viewport of [{width:1280,height:900},{width:375,height:812}]){
      const origin=new URL(root).origin,context=await browser.newContext({viewport,isMobile:viewport.width===375,hasTouch:viewport.width===375});
      await context.addInitScript(()=>{if(window===window.top)localStorage.removeItem('gameon.mazeathon.save.v1');});
      await context.route('**/*',route=>{
        const req=route.request();if(new URL(req.url()).origin===origin)return route.continue();
        return route.fulfill({status:200,contentType:req.resourceType()==='stylesheet'?'text/css':'text/html',body:req.resourceType()==='stylesheet'?'':'<!doctype html><title>Existing game fixture</title><p>Existing external game</p>'});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(root);await page.locator('.cart').last().waitFor();assert.equal(await page.locator('.cart').count(),7);
      for(const img of await page.locator('.cart .cover img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.complete?null:new Promise(resolve=>img.addEventListener('load',resolve,{once:true})));assert.ok(await img.evaluate(img=>img.naturalWidth>0));}
      await page.evaluate(()=>window.scrollTo(0,0));
      const label=(root.includes('/dev/')?'dev':'production')+'-'+viewport.width+(live?'-live':'');
      await page.screenshot({path:path.join(OUT,'arcade-'+label+'.png'),fullPage:true});
      await page.locator('.cart[href="#mazeathon"]').click();const expected=new URL('games/mazeathon/',root).href;
      await page.waitForFunction(()=>document.querySelector('#bar-title').textContent==='MazeAThon');
      assert.equal(await page.locator('#own-btn').evaluate(a=>a.href),expected);
      await page.waitForFunction(expected=>document.querySelector('#frame').contentWindow.location.href===expected,expected);
      const game=page.frames().find(f=>f.url()===expected);assert.ok(game,'real local game loaded');
      await game.locator('#begin, #continue').click();assert.equal(await game.evaluate(()=>MazeAThon.inspect().mode),'playing');
      const s=await game.evaluate(()=>MazeAThon.inspect()),direction=s.world.cells[33]===0?'ArrowRight':'ArrowDown';
      await game.locator('#maze').focus();await page.keyboard.down(direction);await page.waitForTimeout(300);await page.keyboard.up(direction);
      const moved=await game.evaluate(()=>MazeAThon.inspect());assert.ok(Math.hypot(moved.player.x-s.player.x,moved.player.y-s.player.y)>.2);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      for(const id of ['home-btn','switch-btn','own-btn']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=viewport.width);}
      await page.screenshot({path:path.join(OUT,'playing-'+label+'.png')});
      await page.locator('#switch-btn').click();await page.locator('.mini[href="#trampoline-battle"]').click();await page.waitForFunction(()=>document.querySelector('#bar-title').textContent==='Trampoline Battle');
      await page.locator('#switch-btn').click();await page.locator('.mini[href="#mazeathon"]').click();await page.waitForFunction(()=>document.querySelector('#bar-title').textContent==='MazeAThon');
      await page.locator('#home-btn').click();await page.locator('#home').waitFor({state:'visible'});assert.equal(await page.locator('#frame').getAttribute('src'),null);
      checks.push({root,width:viewport.width,games:7,gameURL:expected,launch:true,movement:true,switch:true,home:true,covers:true});console.log('PASS '+label+': seven games, covers, real MazeAThon play, switch, home, correct relative URL');
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,live?'live-results.json':'local-results.json'),JSON.stringify({passed:true,checks,errors},null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
