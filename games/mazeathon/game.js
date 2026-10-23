(function () {
  'use strict';
  const {Game,W,H,TOTAL,THEMES,SHAPES,findPath}=window.MazeWorld;
  const $=id=>document.getElementById(id),canvas=$('maze'),ctx=canvas.getContext('2d'),mini=$('mini'),miniCtx=mini.getContext('2d');
  const SAVE='gameon.mazeathon.save.v1',BEST='gameon.mazeathon.best.v1',SOUND='gameon.mazeathon.sound.v1';
  const colors=['#f4cc78','#a8d5b2','#eda18f','#b5a1d1'];
  const boostNames={xray:'X-ray vision',map:'Map revealed',shield:'Invulnerability',speed:'Super speed'};
  let storageOK=true;
  const store={get(k){try{return localStorage.getItem(k);}catch{storageOK=false;return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{storageOK=false;}},remove(k){try{localStorage.removeItem(k);}catch{storageOK=false;}}};
  let saved=null,best=null;
  try{const s=JSON.parse(store.get(SAVE));if(s){new Game(s.seed,s);saved=s;}}catch{store.remove(SAVE);}
  try{const b=JSON.parse(store.get(BEST));if(b&&Number.isFinite(b.time)&&b.time>=0)best=b;}catch{ /* A broken best score must not prevent play. */ }
  let game=new Game(507),mode='title',hasRun=false,soundOn=store.get(SOUND)==='on',audio=null,last=0,elapsed=0,saveAt=0,hudAt=0,toastUntil=0;
  let viewW=0,viewH=0,unit=44,cameraSnap=true,cam={x:1.5,y:1.5},keys=new Set(),touch=new Map(),particles=[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function format(t){const s=Math.floor(t);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function shapeSvg(id){const paths=['<circle cx="12" cy="12" r="8"/>','<path d="M12 3 22 21H2Z"/>','<path d="m12 2 10 10-10 10L2 12Z"/>','<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>'];return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="'+colors[id]+'" stroke="#365b4c" stroke-width="1.5" stroke-linejoin="round">'+paths[id]+'</svg>';}
  function save(){if(!hasRun)return;saved=game.save();store.set(SAVE,JSON.stringify(saved));}
  function sound(type){
    if(!soundOn)return;
    try{
      if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const notes=type==='caught'?[240,190]:type==='win'?[392,494,587,784]:type==='shape'?[523,659,784]:[440,554];
      notes.forEach((f,i)=>{const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime+i*.07;o.type='sine';o.frequency.value=f;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.075,t+.015);v.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(v);v.connect(audio.destination);o.start(t);o.stop(t+.24);});
    }catch{ /* Audio is optional, including on older or embedded browsers. */ }
  }
  function syncSound(){ $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');$('sound').querySelector('span').hidden=soundOn; }
  function toast(text,seconds=3.5){$('toast').textContent=text;$('toast').hidden=false;toastUntil=elapsed+seconds;}
  function release(){keys.clear();touch.clear();document.querySelectorAll('.dpad button').forEach(b=>b.classList.remove('pressed'));}
  function showDialog(html,newMode){
    release();mode=newMode;$('dialog').innerHTML=html;$('overlay').hidden=false;
    const heading=$('dialog').querySelector('h2');if(heading)heading.id='dialog-title';
    requestAnimationFrame(()=>{const first=$('dialog').querySelector('button,a');if(first)first.focus();});
    updateHUD();
  }
  function closeDialog(){ $('overlay').hidden=true;mode='playing';release();canvas.focus({preventScroll:true});updateHUD(); }
  function artHtml(){return '<canvas class="title-art" id="title-art" width="600" height="230" aria-hidden="true"></canvas>';}
  function showTitle(){
    mode='title';hasRun=false;$('pause').disabled=true;
    const canContinue=saved&&saved.status!=='won';
    showDialog('<p class="eyebrow">MAZEATHON · A GAMEON ORIGINAL</p>'+artHtml()+'<h2>Small shapes.<br><em>Big adventure.</em></h2><p class="title-lede">A pocketful of keys. A few friendly-looking monsters. Three little worlds to find your way through.</p><div class="button-row">'+(canContinue?'<button class="primary-button" id="continue">Continue adventure <span>→</span></button>':'<button class="primary-button" id="begin">Let’s get lost <span>→</span></button>')+'</div>'+(canContinue?'<button class="link-button" id="new-title">Start a fresh adventure</button>':'')+'<p class="fine-print">ARROW KEYS / WASD · TOUCH CONTROLS ON PHONES<br>Collect every shape to open the way home.</p>'+(best?'<p class="maze-code">BEST ADVENTURE '+format(best.time)+' · '+best.catches+' CATCHES</p>':'')+(!storageOK?'<p class="fine-print">Saving is unavailable in this browser. You can still play this adventure.</p>':''),'title');
    if(canContinue){$('continue').onclick=()=>start(saved);$('new-title').onclick=confirmNew;}else $('begin').onclick=()=>start();
    drawTitleArt();
  }
  function seed(){const n=Number(new URLSearchParams(location.search).get('seed'));if(Number.isInteger(n)&&n>0&&n<=4294967295)return n;return window.crypto?.getRandomValues?window.crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;}
  function start(s){
    game=s?new Game(s.seed,s):new Game(seed());hasRun=true;cam={...game.player};saveAt=0;$('overlay').hidden=true;mode='playing';release();sound('start');canvas.focus({preventScroll:true});save();updateHUD();
    if(game.status==='section-complete'||game.status==='won')finishSection();
    else toast(s?'Welcome back. Your shapes are right where you left them.':'Find four shapes, then follow the golden gate.',5);
  }
  function confirmNew(){
    const fromTitle=!hasRun;
    showDialog('<p class="eyebrow">A NEW LITTLE ADVENTURE</p><h2>A fresh set<br>of <em>wrong turns?</em></h2><p>This will replace your current adventure with three new mazes. Your best finish stays saved.</p><div class="button-row"><button class="primary-button" id="confirm-new">Start fresh</button><button class="primary-button secondary-button" id="cancel-new">Keep this adventure</button></div>','confirm');
    $('confirm-new').onclick=()=>start();$('cancel-new').onclick=()=>fromTitle?showTitle():pause();
  }
  function pause(){
    if(mode==='title'){showTitle();return;}save();
    showDialog('<p class="eyebrow">TAKE YOUR TIME</p>'+artHtml()+'<h2>A little <em>breather.</em></h2><p>Your shapes and progress are saved. The monsters can wait.</p><div class="button-row"><button class="primary-button" id="resume">Keep wandering <span>→</span></button></div><button class="link-button" id="restart">Start a fresh adventure</button><p class="maze-code">MAZE #'+game.seed+' · SECTION '+(game.section+1)+' / 3</p>','paused');
    $('resume').onclick=closeDialog;$('restart').onclick=confirmNew;drawTitleArt();
  }
  function help(){
    const wasTitle=!hasRun,wasMode=mode;if(!wasTitle)save();
    showDialog('<p class="eyebrow">THE VERY SHORT FIELD GUIDE</p><h2>Get a little <em>lost.</em></h2><div class="help-grid"><div><b>01 · Find your shapes</b><p>Each section has a circle, triangle, diamond and star. Collect all four to open its golden exit.</p></div><div><b>02 · Open a boost room</b><p>Walk into a door with the matching key. Keys stay in your pocket. Boosts activate when you touch them.</p></div><div><b>03 · Lose your followers</b><p>Little monsters chase briefly when they see you. Turn a corner! Big monsters wake up when you get close.</p></div><div><b>04 · Keep going</b><p>Caught? Back to this section’s start. You keep your keys and open doors. There are no lives to run out of.</p></div></div><div class="boost-list"><b>◉ X-ray</b> · See keys and monsters through walls for 14 seconds.<br><b>▧ Map</b> · Reveal this section’s whole map.<br><b>◇ Invulnerability</b> · Pass safely through monsters for 14 seconds.<br><b>ϟ Speed</b> · Move faster for 14 seconds.<br>Boost rooms recharge after 30 seconds.</div><p>Move: arrows / WASD / touch arrows · Pause: P or Esc<br>Map: M · Hint trail: H</p><div class="button-row"><button class="primary-button" id="help-close">Got it <span>→</span></button></div>','help');
    $('help-close').onclick=()=>wasTitle?showTitle():wasMode==='section'||wasMode==='won'?finishSection():closeDialog();
  }
  function showMap(){
    if(mode!=='playing'&&mode!=='paused')return;save();
    showDialog('<p class="eyebrow">SECTION '+(game.section+1)+' / 3</p><h2>Your little <em>corner of the world.</em></h2><canvas id="large-map" class="large-map" width="620" height="500" role="img" aria-label="Map of '+THEMES[game.section].name+'. Explored corridors and discovered shapes are shown. Unexplored areas stay dark unless you collect the map boost."></canvas><div class="map-legend"><span>You</span><span>Shape keys</span><span>Boost rooms</span></div><p>'+(game.mapped?'The whole section is mapped. Now for the wandering.':'Your map grows as you explore. The triangle room reveals it all.')+'</p><div class="button-row"><button class="primary-button" id="map-close">Back to the maze <span>→</span></button></div>','map');
    const c=$('large-map');drawMap(c.getContext('2d'),c.width,c.height);$('map-close').onclick=closeDialog;
  }
  function finishSection(){
    save();const won=game.status==='won';
    if(won){if(!best||game.time<best.time){best={time:game.time,catches:game.catches};store.set(BEST,JSON.stringify(best));}sound('win');}
    showDialog('<p class="eyebrow">'+(won?'EVERY SHAPE. EVERY MAZE. YOU DID IT.':'SECTION '+(game.section+1)+' OF 3 · ALL SHAPES FOUND')+'</p>'+artHtml()+'<h2>'+(won?'A little lost.<br><em>All the way home.</em>':'One maze down.<br><em>On we wander.</em>')+'</h2><p>'+(won?'Twelve shapes collected, three worlds explored, and a few monsters left wondering where you went.':THEMES[game.section].name+' is behind you. Next stop: '+THEMES[game.section+1].name+'.')+'</p><div class="result-stats"><div><b>'+((game.section+1)*4)+'</b><span>Shapes found</span></div><div><b>'+format(game.time)+'</b><span>Adventure time</span></div><div><b>'+game.catches+'</b><span>Little detours</span></div></div><div class="button-row"><button class="primary-button" id="next">'+(won?'A new adventure':'Explore the next maze')+' <span>→</span></button></div>'+(won?'<button class="link-button" id="back-title">Back to the beginning</button>':'')+'<p class="maze-code">MAZE #'+game.seed+'</p>',won?'won':'section');
    $('next').onclick=()=>{if(won)start();else{game.nextSection();cam={...game.player};closeDialog();save();toast('Welcome to '+THEMES[game.section].name+'.',4);}};
    if(won)$('back-title').onclick=showTitle;drawTitleArt();
  }
  function hint(){if(mode!=='playing')return;game.hint=7;toast(game.keys.length===4?'Follow the golden trail to the exit.':'A little nudge toward your nearest missing shape.',3);}
  function updateHUD(){
    const active=hasRun;$('pause').disabled=!active||!['playing','paused'].includes(mode);$('hint').disabled=mode!=='playing';$('map').disabled=!active||!['playing','paused'].includes(mode);
    $('chapter').textContent=active?'SECTION 0'+(game.section+1)+' / 03 · '+THEMES[game.section].short.toUpperCase():'YOUR NEXT LITTLE ADVENTURE';
    $('section-name').textContent=active?THEMES[game.section].name:'Find your way home.';
    $('inventory').innerHTML=SHAPES.map((s,i)=>'<span class="shape-chip'+(active&&game.keys.includes(i)?' collected':'')+'" role="img" aria-label="'+s+' key: '+(active&&game.keys.includes(i)?'collected':'not collected')+'" title="'+s+' key">'+shapeSvg(i)+'</span>').join('');
    $('total-count').textContent=(active?game.section*4+game.keys.length:0)+' / 12 shapes';$('timer').textContent=format(active?game.time:0);
    $('objective-text').textContent=game.keys.length===4?'All four found. Find the golden exit!':'Find all four shapes to open the exit.';
    $('active-boosts').innerHTML=Object.entries(game.effects).filter(([,v])=>v>0).map(([k,v])=>'<span class="boost-pill">'+boostNames[k]+' · '+Math.ceil(v)+'s</span>').join('')+(game.mapped?'<span class="boost-pill">Map revealed ✓</span>':'');
    $('trail-note').textContent=active?'Your keys are safe. Even after a little detour.':'Three mazes. Twelve shapes. One way home.';
  }
  function processEvents(){
    for(const e of game.drainEvents()){
      if(e.type==='shape'){sound('shape');burst(game.player.x,game.player.y,colors[e.shape]);toast('The '+SHAPES[e.shape]+' is yours. '+(game.keys.length===4?'The exit is open!':'Find its matching boost room.'));save();}
      if(e.type==='door'){sound('door');toast('Your '+SHAPES[e.shape]+' key opened the '+boostNames[game.world.rooms[e.shape].boost].toLowerCase()+' room.');save();}
      if(e.type==='locked')toast('This room needs the '+SHAPES[e.shape]+' key.',2.5);
      if(e.type==='exit-locked')toast('A few shapes are still out there. Find all four to leave.',3);
      if(e.type==='boost'){sound('boost');burst(game.player.x,game.player.y,'#b3e9d7');toast(e.boost==='map'?'The whole section is on your map. Press M or tap Map.':boostNames[e.boost]+'! You have 14 seconds.',4);save();}
      if(e.type==='caught'){sound('caught');cam={...game.player};toast('A little detour! Back to camp. Your shapes are safe.',4);save();}
      if(e.type==='spotted'&&e.big)toast('The big softie spotted you. Keep moving!',2.5);
      if(e.type==='section-complete'||e.type==='won')finishSection();
    }
  }
  function input(){let x=0,y=0;if(keys.has('arrowleft')||keys.has('a'))x--;if(keys.has('arrowright')||keys.has('d'))x++;if(keys.has('arrowup')||keys.has('w'))y--;if(keys.has('arrowdown')||keys.has('s'))y++;for(const dir of touch.values()){if(dir==='left')x--;if(dir==='right')x++;if(dir==='up')y--;if(dir==='down')y++;}return {x,y};}
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(!$('overlay').hidden&&k==='tab'){
      const focusable=Array.from($('dialog').querySelectorAll('button,a'));if(!focusable.length)return;
      const first=focusable[0],end=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}return;
    }
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){if(mode==='playing'){e.preventDefault();keys.add(k);}return;}
    if(e.repeat)return;
    if(k==='escape'||k==='p'){e.preventDefault();if(mode==='playing')pause();else if(mode==='help')$('help-close').click();else if(['paused','map'].includes(mode))closeDialog();}
    if(k==='m'){if(mode==='playing')showMap();else if(mode==='map')closeDialog();}
    if(k==='h')hint();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  document.querySelectorAll('[data-dir]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing')return;b.setPointerCapture(e.pointerId);touch.set(e.pointerId,b.dataset.dir);b.classList.add('pressed');canvas.focus({preventScroll:true});});
    const up=e=>{touch.delete(e.pointerId);b.classList.remove('pressed');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
  });
  $('pause').onclick=()=>mode==='playing'?pause():mode==='title'?showTitle():closeDialog();$('help').onclick=help;$('map').onclick=showMap;$('mini-button').onclick=showMap;$('hint').onclick=hint;
  $('sound').onclick=()=>{soundOn=!soundOn;store.set(SOUND,soundOn?'on':'off');syncSound();if(soundOn)sound('start');};syncSound();
  window.addEventListener('blur',()=>{release();if(mode==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(mode==='playing')pause();else if(mode!=='title')save();}});
  window.addEventListener('pagehide',save);window.addEventListener('beforeunload',save);
  function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function shape(c,id,x,y,r,fill=colors[id]){
    c.save();c.translate(x,y);c.beginPath();
    if(id===0)c.arc(0,0,r,0,Math.PI*2);
    if(id===1){c.moveTo(0,-r);c.lineTo(r*.94,r*.8);c.lineTo(-r*.94,r*.8);c.closePath();}
    if(id===2){c.moveTo(0,-r);c.lineTo(r,0);c.lineTo(0,r);c.lineTo(-r,0);c.closePath();}
    if(id===3){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.47:r;i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();}
    c.fillStyle=fill;c.fill();c.lineWidth=Math.max(1,r*.1);c.strokeStyle='#315a4e';c.stroke();c.restore();
  }
  function monster(c,x,y,r,color,t=0,big=false,state='idle'){
    c.save();c.translate(x,y+(reduced?0:Math.sin(t*2.4)*r*.035));
    c.fillStyle='#092d3029';c.beginPath();c.ellipse(0,r*.65,r*.8,r*.24,0,0,Math.PI*2);c.fill();
    // Two soft ears, a scalloped body, bright eyes, and little rosy cheeks.
    round(c,-r*.63,-r*.97,r*.38,r*.67,r*.2,color);round(c,r*.25,-r*.97,r*.38,r*.67,r*.2,color);
    c.beginPath();c.moveTo(-r*.8,r*.5);c.lineTo(-r*.8,-r*.05);c.bezierCurveTo(-r*.82,-r*1.03,r*.82,-r*1.03,r*.8,-r*.05);c.lineTo(r*.8,r*.5);
    for(let i=3;i>=0;i--){const xx=-r*.8+i*r*.4;c.quadraticCurveTo(xx+r*.2,r*(i%2?.43:.8),xx,r*.52);}c.closePath();c.fillStyle=color;c.fill();
    c.fillStyle='#ffffff55';c.beginPath();c.ellipse(-r*.33,-r*.4,r*.2,r*.09,-.5,0,Math.PI*2);c.fill();
    const blink=Math.sin(t*1.07)> .997; c.fillStyle='#224840';
    for(const sign of [-1,1]){c.beginPath();c.ellipse(sign*r*.27,-r*.05,r*.085,blink?r*.02:r*.12,0,0,Math.PI*2);c.fill();if(!blink){c.fillStyle='#fff7e4';c.beginPath();c.arc(sign*r*.27+r*.025,-r*.09,r*.026,0,Math.PI*2);c.fill();c.fillStyle='#224840';}}
    c.fillStyle='#c8617f55';for(const sign of [-1,1]){c.beginPath();c.ellipse(sign*r*.48,r*.17,r*.13,r*.07,0,0,Math.PI*2);c.fill();}
    c.strokeStyle='#31534b';c.lineWidth=r*.045;c.lineCap='round';c.beginPath();c.arc(0,r*.13,r*.12,.15,Math.PI-.15);c.stroke();
    if(big){c.fillStyle='#f7d58c';c.beginPath();c.moveTo(-r*.3,-r*.82);c.lineTo(-r*.35,-r*1.18);c.lineTo(-r*.1,-r*1.05);c.lineTo(0,-r*1.32);c.lineTo(r*.12,-r*1.05);c.lineTo(r*.35,-r*1.18);c.lineTo(r*.3,-r*.82);c.closePath();c.fill();}
    if(state==='windup'||state==='chase'){c.fillStyle=state==='windup'?'#ffd98c':'#fff9df';c.font='900 '+r*.7+'px Trebuchet MS';c.textAlign='center';c.fillText('!',0,-r*(big?1.55:1.2));}
    else if(big){c.fillStyle='#efedda80';c.font='italic '+r*.3+'px Georgia';c.fillText('z',r*.85,-r*.7);}
    c.restore();
  }
  function drawPlayer(c,x,y,t){
    c.save();c.translate(x,y);const r=unit*.29;
    if(game.effects.shield>0||game.respawn>0){c.strokeStyle=game.effects.shield>0?'#c1f4df':'#fff5c6';c.lineWidth=2;c.beginPath();c.arc(0,0,r*1.8+(reduced?0:Math.sin(t*4)*2),0,Math.PI*2);c.stroke();}
    c.fillStyle='#1b423c33';c.beginPath();c.ellipse(0,r*.9,r*.75,r*.25,0,0,Math.PI*2);c.fill();
    round(c,-r*.62,r*.48,r*.43,r*.5,3,'#385c51');round(c,r*.18,r*.48,r*.43,r*.5,3,'#385c51');
    round(c,-r*.8,-r*.12,r*1.6,r*.97,r*.45,'#e69b5e');round(c,r*.48,r*.17,r*.43,r*.47,3,'#b2714f');
    c.beginPath();c.arc(0,-r*.25,r*.77,0,Math.PI*2);c.fillStyle='#f7d5a1';c.fill();
    c.beginPath();c.arc(0,-r*.5,r*.82,Math.PI,Math.PI*2);c.fillStyle='#f2c66e';c.fill();round(c,-r*.9,-r*.6,r*1.8,r*.24,4,'#edbc5b');
    c.fillStyle='#314f43';for(const s of [-1,1]){c.beginPath();c.arc(s*r*.28,-r*.15,r*.075,0,Math.PI*2);c.fill();}
    c.strokeStyle='#9f6c51';c.lineWidth=1.5;c.beginPath();c.arc(0,r*.02,r*.16,.2,Math.PI-.2);c.stroke();c.restore();
  }
  function boostIcon(c,type,x,y,r){
    c.save();c.translate(x,y);c.strokeStyle='#e8f3ce';c.fillStyle='#e8f3ce';c.lineWidth=Math.max(1.5,r*.13);c.lineJoin='round';c.lineCap='round';
    if(type==='xray'){c.beginPath();c.ellipse(0,0,r,r*.55,0,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,r*.24,0,Math.PI*2);c.fill();}
    if(type==='map'){c.beginPath();c.moveTo(-r,-r*.7);c.lineTo(-r*.33,-r);c.lineTo(r*.33,-r*.7);c.lineTo(r,-r);c.lineTo(r,r*.7);c.lineTo(r*.33,r);c.lineTo(-r*.33,r*.7);c.lineTo(-r,r);c.closePath();c.stroke();c.beginPath();c.moveTo(-r*.33,-r);c.lineTo(-r*.33,r*.7);c.moveTo(r*.33,-r*.7);c.lineTo(r*.33,r);c.stroke();}
    if(type==='shield'){c.beginPath();c.moveTo(0,-r);c.lineTo(r,-r*.5);c.lineTo(r*.8,r*.4);c.quadraticCurveTo(0,r*1.5,-r*.8,r*.4);c.lineTo(-r,-r*.5);c.closePath();c.stroke();}
    if(type==='speed'){c.beginPath();c.moveTo(r*.2,-r);c.lineTo(-r*.8,r*.1);c.lineTo(-r*.05,r*.1);c.lineTo(-r*.2,r);c.lineTo(r*.8,-r*.15);c.lineTo(r*.05,-r*.15);c.closePath();c.fill();}
    c.restore();
  }
  function drawTitleArt(){
    const c=$('title-art');if(!c)return;const a=c.getContext('2d');a.clearRect(0,0,c.width,c.height);
    a.fillStyle='#e7ebd7';a.beginPath();a.ellipse(300,184,210,22,0,0,Math.PI*2);a.fill();
    monster(a,170,142,58,'#a8d2b4',1,false);monster(a,314,136,76,'#e5a2b4',2,true);monster(a,440,154,47,'#b5a1cf',3,false);
    shape(a,3,92,55,18);shape(a,2,500,72,15);shape(a,0,226,31,9);a.fillStyle='#d9b978';a.font='25px Georgia';a.fillText('✧',386,48);
  }
  function drawMap(c,w,h){
    const sx=w/W,sy=h/H;c.clearRect(0,0,w,h);c.fillStyle='#112f31';c.fillRect(0,0,w,h);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!game.discovered[i]&&!game.mapped)continue;c.fillStyle=game.world.cells[i]?'#386154':'#b4bda1';c.fillRect(x*sx,y*sy,sx+.2,sy+.2);}
    for(const r of game.world.rooms){if(!game.discovered[r.door.y*W+r.door.x]&&!game.mapped)continue;c.fillStyle=r.opened?'#c5e7b7':'#6e9d81';c.fillRect((r.door.x+.1)*sx,(r.door.y+.1)*sy,.8*sx,.8*sy);}
    for(const s of game.world.shapes)if(!game.keys.includes(s.id)&&(game.mapped||game.discovered[Math.floor(s.y)*W+Math.floor(s.x)])){c.fillStyle='#f1977c';c.beginPath();c.arc(s.x*sx,s.y*sy,Math.max(1.7,sx*.36),0,Math.PI*2);c.fill();}
    const e=game.world.exit;if(game.mapped||game.discovered[Math.floor(e.y)*W+Math.floor(e.x)]){c.fillStyle='#efdc9a';c.fillRect((e.x-.4)*sx,(e.y-.4)*sy,sx*.8,sy*.8);}
    c.fillStyle='#ffe6a0';c.strokeStyle='#173e39';c.lineWidth=Math.max(1,sx*.15);c.beginPath();c.arc(game.player.x*sx,game.player.y*sy,Math.max(2.5,sx*.44),0,Math.PI*2);c.fill();c.stroke();
  }
  function burst(x,y,color){if(reduced)return;for(let i=0;i<14;i++){const a=i/14*Math.PI*2;particles.push({x,y,vx:Math.cos(a)*1.8,vy:Math.sin(a)*1.8-1,t:1,color});}}
  function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);viewW=r.width;viewH=r.height;canvas.width=Math.round(viewW*d);canvas.height=Math.round(viewH*d);ctx.setTransform(d,0,0,d,0,0);unit=viewW<600||window.matchMedia('(pointer: coarse)').matches?38:48;cameraSnap=true;}
  new ResizeObserver(resize).observe(canvas);
  function draw(dt){
    if(!viewW||!viewH)return;const theme=THEMES[game.section],xray=game.effects.xray>0;
    const clamp=(v,max,screen)=>max*unit<=screen?max/2:Math.max(screen/2/unit,Math.min(max-screen/2/unit,v));
    const target={x:clamp(game.player.x,W,viewW),y:clamp(game.player.y,H,viewH)};
    if(cameraSnap){cam={...target};cameraSnap=false;}
    cam.x+=(target.x-cam.x)*Math.min(1,dt*9);cam.y+=(target.y-cam.y)*Math.min(1,dt*9);
    const ox=viewW/2-cam.x*unit,oy=viewH/2-cam.y*unit;
    ctx.fillStyle=theme.dark;ctx.fillRect(0,0,viewW,viewH);ctx.save();ctx.translate(ox,oy);
    const minX=Math.max(0,Math.floor(-ox/unit)-1),maxX=Math.min(W,Math.ceil((viewW-ox)/unit)+1),minY=Math.max(0,Math.floor(-oy/unit)-1),maxY=Math.min(H,Math.ceil((viewH-oy)/unit)+1);
    for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
      const i=y*W+x,known=game.discovered[i],visible=game.visible[i],xx=x*unit,yy=y*unit;
      if(!known&&!xray){
        if((x*7+y*11)%9===0){ctx.strokeStyle='#ffffff06';ctx.beginPath();ctx.arc(xx+unit/2,yy+unit/2,unit*.17,0,Math.PI*2);ctx.stroke();}continue;
      }
      ctx.globalAlpha=visible?1:xray?.7:.34;
      if(game.world.cells[i]===0){
        ctx.fillStyle=theme.floor;ctx.fillRect(xx,yy,unit+.5,unit+.5);ctx.strokeStyle='#597d6514';ctx.lineWidth=1;ctx.strokeRect(xx+1,yy+1,unit-2,unit-2);
        if((x*11+y*3)%5===0){ctx.fillStyle='#698b6b35';ctx.beginPath();ctx.ellipse(xx+unit*.72,yy+unit*.68,2.5,1.4,-.7,0,Math.PI*2);ctx.fill();}
      }else{
        ctx.fillStyle=theme.wall;ctx.fillRect(xx,yy,unit+.5,unit+.5);round(ctx,xx+2,yy+1,unit-4,unit-5,5,theme.top);ctx.fillStyle='#12352e2b';ctx.fillRect(xx,yy+unit-4,unit,4);
        if((x*3+y*7)%6===0){ctx.strokeStyle='#bbdbaa2e';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(xx+unit*.3,yy+unit*.65);ctx.quadraticCurveTo(xx+unit*.7,yy+unit*.55,xx+unit*.55,yy+unit*.2);ctx.stroke();}
      }
    }
    ctx.globalAlpha=1;
    const entityVisible=p=>xray||game.visible[Math.floor(p.y)*W+Math.floor(p.x)];
    // A small painted camp marks the reset point.
    if(game.discovered[W+1]){ctx.globalAlpha=game.visible[W+1]?1:.35;round(ctx,unit*1.09,unit*1.08,unit*.82,unit*.82,8,'#d9c995');ctx.fillStyle='#f8efd1';ctx.font='800 '+unit*.18+'px Trebuchet MS';ctx.textAlign='center';ctx.fillText('CAMP',unit*1.5,unit*1.85);ctx.globalAlpha=1;}
    for(const r of game.world.rooms){
      const door=centerDoor(r);if(entityVisible(door)||game.discovered[r.door.y*W+r.door.x]){
        ctx.globalAlpha=entityVisible(door)?1:.4;
        if(!r.opened){round(ctx,r.door.x*unit+3,r.door.y*unit+2,unit-6,unit-4,8,'#8b7355','#d3b680');shape(ctx,r.shape,door.x*unit,door.y*unit,unit*.22);}
        else{ctx.strokeStyle='#c9b982';ctx.lineWidth=2;ctx.strokeRect(r.door.x*unit+3,r.door.y*unit+3,unit-6,unit-6);}ctx.globalAlpha=1;
      }
      if(entityVisible(r)){
        const ready=r.readyAt<=game.time,xx=r.x*unit,yy=r.y*unit;ctx.globalAlpha=ready?1:.4;
        ctx.fillStyle='#173f3944';ctx.beginPath();ctx.ellipse(xx,yy+unit*.3,unit*.45,unit*.2,0,0,Math.PI*2);ctx.fill();
        round(ctx,xx-unit*.34,yy-unit*.34,unit*.68,unit*.68,unit*.2,'#4e8f78','#c8dfae');boostIcon(ctx,r.boost,xx,yy-unit*.03,unit*.18);
        ctx.fillStyle='#284c40';ctx.textAlign='center';ctx.font='800 '+unit*.16+'px Trebuchet MS';ctx.fillText(ready?({xray:'X-RAY',map:'MAP',shield:'SHIELD',speed:'SPEED'})[r.boost]:Math.ceil(r.readyAt-game.time)+'s',xx,yy+unit*.7);ctx.globalAlpha=1;
      }
    }
    const exit=game.world.exit;
    if(entityVisible(exit)||game.discovered[Math.floor(exit.y)*W+Math.floor(exit.x)]){
      const xx=exit.x*unit,yy=exit.y*unit;ctx.save();ctx.globalAlpha=entityVisible(exit)?1:.4;
      ctx.shadowColor='#f4ce79';ctx.shadowBlur=game.keys.length===4?18:0;round(ctx,xx-unit*.39,yy-unit*.46,unit*.78,unit*.86,[unit*.35,unit*.35,5,5],game.keys.length===4?'#ffe3a0':'#b0a17b','#e6d099');ctx.shadowBlur=0;
      ctx.fillStyle='#31564c';ctx.font='800 '+unit*.18+'px Trebuchet MS';ctx.textAlign='center';ctx.fillText(game.keys.length===4?'GO →':'EXIT',xx,yy+unit*.06);ctx.restore();
    }
    if(game.hint>0){const path=game.hintPath();ctx.fillStyle='#d8a94e';ctx.globalAlpha=.75;for(const [i,p] of path.entries()){if(i%2===0){ctx.beginPath();ctx.arc(p.x*unit,p.y*unit,unit*.06,0,Math.PI*2);ctx.fill();}}ctx.globalAlpha=1;}
    for(const s of game.world.shapes)if(!game.keys.includes(s.id)&&entityVisible(s)){
      const x=s.x*unit,y=s.y*unit+(reduced?0:Math.sin(elapsed*2+s.id)*3);ctx.save();ctx.shadowColor=colors[s.id];ctx.shadowBlur=14;shape(ctx,s.id,x,y,unit*.23);ctx.restore();
      ctx.strokeStyle='#fff5ce77';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,unit*.38,0,Math.PI*2);ctx.stroke();
    }
    const actors=game.world.monsters.filter(entityVisible).map(m=>({...m,kind:'monster'}));actors.push({...game.player,kind:'player'});actors.sort((a,b)=>a.y-b.y);
    for(const a of actors){if(a.kind==='player')drawPlayer(ctx,a.x*unit,a.y*unit,elapsed);else monster(ctx,a.x*unit,a.y*unit,unit*(a.big?.57:.34),a.big?theme.monster:['#b8d3ad','#e2a6b5','#d6c08c','#b6acd0'][a.id%4],elapsed+a.id,a.big,a.state);}
    particles=particles.filter(p=>p.t>0);for(const p of particles){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt;ctx.globalAlpha=Math.max(0,p.t);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x*unit,p.y*unit,unit*.06,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
    // Soft vignette keeps the camera edges gentle, without hiding the play area.
    const shade=ctx.createRadialGradient(viewW/2,viewH/2,Math.min(viewW,viewH)*.22,viewW/2,viewH/2,Math.max(viewW,viewH)*.7);shade.addColorStop(0,'#062c2700');shade.addColorStop(1,'#062c2750');ctx.fillStyle=shade;ctx.fillRect(0,0,viewW,viewH);
    drawMap(miniCtx,mini.width,mini.height);
  }
  function centerDoor(r){return {x:r.door.x+.5,y:r.door.y+.5};}
  function loop(t){
    const dt=last?Math.max(0,Math.min((t-last)/1000,.05)):0;last=t;elapsed+=dt;
    if(mode==='playing'){game.step(dt,input());processEvents();if(game.time>saveAt){saveAt=game.time+3;save();}}
    if(elapsed>hudAt){hudAt=elapsed+.15;updateHUD();}
    if(elapsed>toastUntil)$('toast').hidden=true;draw(dt);requestAnimationFrame(loop);
  }
  // Read-only diagnostics make a real keyboard playthrough reproducible without a cheat mode.
  window.MazeAThon=Object.freeze({inspect:()=>JSON.parse(JSON.stringify({mode,...game.save(),world:game.world,respawn:game.respawn,storageOK}))});
  resize();showTitle();requestAnimationFrame(loop);
})();
