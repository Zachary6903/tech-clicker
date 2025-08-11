(() => {
  'use strict';

  const SAVE_KEY = 'tc_allin_one_v23';
  const SHOW_THRESHOLD = 0.85;
  const UPG_SHOW_THRESHOLD = 0.80;
  const MAX_OFFLINE_HOURS = 24;
  const ACHIEVE_LIST_UNLOCK_AT_TOTAL = 0;

  const nice = ['#22d3ee','#60a5fa','#a78bfa','#7dd3fc','#34d399','#f472b6','#fb7185','#f59e0b','#ef4444','#22c55e'];
  const fmt = n => n>=1e15?(n/1e15).toFixed(2)+'Q':n>=1e12?(n/1e12).toFixed(2)+'T':n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(2)+'k':Math.floor(n);
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  function makeIcon(label,bg="#0ea5e9",fg="#001018"){
    const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${bg}'/><stop offset='1' stop-color='${bg}99'/></linearGradient></defs>
      <rect rx='18' ry='18' x='4' y='4' width='88' height='88' fill='url(#g)'/>
      <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle'
        font-size='48' font-family='Segoe UI, Apple Color Emoji, Noto Color Emoji, sans-serif' fill='${fg}'>${label}</text>
    </svg>`;
    return "data:image/svg+xml;utf8,"+encodeURIComponent(svg);
  }

  const AudioFX=(()=>{let ctx;function ac(){ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();return ctx}
    function beep({f=440,t=.06,type='square',g=.05}={}){if(S.settings.muted)return;const c=ac(),o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(f,c.currentTime);v.gain.value=g;o.connect(v).connect(c.destination);o.start();v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+t);o.stop(c.currentTime+t+.01)}
    return{click(){beep({f:520,t:.05,type:'square',g:.06})},buy(n=1){const base=340,steps=Math.min(4,Math.max(1,Math.floor(Math.log2(n+1))+1));for(let i=0;i<steps;i++){const f=base*Math.pow(1.12,i*3);setTimeout(()=>beep({f,t:.05,type:'triangle',g:.05}),i*55)}},error(){beep({f:160,t:.1,type:'sawtooth',g:.07})}}})();

  // ---------- Catalog ----------
  const CATALOG=[ /* 50 items */ 
    ['Intern','🧑‍💻',15,0.10],['Junior Dev','👨‍💻',50,0.50],['Script Bot','🤖',100,1],['Cloud Instance','☁️',500,6],['Build Server','🖥️',1100,8],
    ['Kubernetes Cluster','☸️',6000,45],['ML Training Rig','🧠',15000,120],['Data Center Rack','🗄️',100000,950],['AI Lab','🧪',1000000,9000],['Quantum Simulator','🧮',10000000,90000],
    ['Edge Node','🛰️',22000000,120000],['Neural Forge','⚒️',60000000,300000],['Photon Router','🔦',160000000,880000],['Bug Zapper','🪲',400000000,2000000],['Bandwidth Bath','🛀',1800000000,6500000],
    ['Moist Matrix','💦',4500000000,19000000],['Cache Lagoon','🌊',9000000000,38000000],['Fiber Falls','🏞️',16000000000,75000000],['Turbo Faucet','🚰',26000000000,120000000],['Silicon Spa','🧖‍♂️',38000000000,180000000],
    ['Packet Pier','🛳️',52000000000,240000000],['GPU Geyser','⛲',70000000000,320000000],['Router Reef','🪸',92000000000,420000000],['Thread Tide','🌐',120000000000,560000000],['Core Cove','🏝️',155000000000,740000000],
    ['Lambda Lake','🏕️',200000000000,960000000],['Kernel Kettle','🍵',255000000000,1200000000],['IO Inlet','⚓',320000000000,1500000000],['Dev Delta','🌀',400000000000,1900000000],['Throughput Thermals','♨️',500000000000,2400000000],
    ['Branch Bay','🌉',620000000000,3000000000],['Task Tundra','❄️',760000000000,3700000000],['Pipeline Peak','⛰️',920000000000,4500000000],['Module Marsh','🪵',1100000000000,5400000000],['Socket Springs','🏞️',1350000000000,6500000000],
    ['Vector Valley','🏔️',1650000000000,7800000000],['Tuple Trench','🕳️',2000000000000,9300000000],['Matrix Meadows','🌾',2400000000000,11000000000],['Runtime Rapids','🌪️',2900000000000,13000000000],['Opcode Oasis','🏜️',3500000000000,15500000000],
    ['Semaphore Shore','🏖️',4200000000000,18500000000],['Register Ridge','⛰️',5000000000000,22000000000],['Pointer Plateau','🗻',6000000000000,26000000000],['Bitstream Beach','🏝️',7200000000000,31000000000],['Compiler Canyon','🏞️',8600000000000,37000000000],
    ['Protocol Prairie','🏕️',10200000000000,44000000000],['Circuit Cathedral','⛪',12100000000000,52000000000],['Quantum Quay','⚛️',14400000000000,62000000000],['Neural Nebula','🌌',17000000000000,74000000000],['StayWet Singularity','💧',20000000000000,90000000000]
  ].map((d,i)=>({id:slug(d[0]),name:d[0],baseCost:d[2],bps:d[3],count:0,emojiIcon:d[1],imgUrl:makeIcon(d[1],nice[i%nice.length]),unlocked:false}));

  // ---------- Upgrades (start at 50) ----------
  function genUpgrades(){const ups=[];let base=50;for(let i=1;i<=40;i++){const cm=1+((i%6)+2)/20;ups.push({id:`click-x-${i}`,name:`Click Multiplier ${i} (×${cm.toFixed(2)})`,cost:Math.floor(base),apply:s=>{s.clickMult*=cm}});base*=1.33;const bpsm=1+((i%5)+3)/25;ups.push({id:`bps-%-${i}`,name:`Throughput ${i} (+${Math.round((bpsm-1)*100)}% BPS)`,cost:Math.floor(base),apply:s=>{s.bpsMult*=bpsm}});base*=1.33;const flat=1+Math.floor(i/7);ups.push({id:`click+${i}`,name:`Hotkeys ${i} (+${flat} /click)`,cost:Math.floor(base),apply:s=>{s.baseClick+=flat}});base*=1.33}return ups}
  const UPG=genUpgrades();

  // ---------- Achievements ----------
  const ACH=[{id:'a2',icon:'💯',name:'Centurion',desc:'Earn 100 total Bytes.',test:s=>s.total>=100},{id:'a3',icon:'🌊',name:'Waveform',desc:'Earn 1,000 total Bytes.',test:s=>s.total>=1e3},{id:'a4',icon:'🔥',name:'Hot Build',desc:'Earn 10,000 total Bytes.',test:s=>s.total>=1e4},{id:'a5',icon:'🛒',name:'First Buy',desc:'Buy your first item.',test:s=>s.buildings.some(b=>b.count>0)},{id:'a6',icon:'🧱',name:'Mini Stack',desc:'Own 10 total items.',test:s=>s.buildings.reduce((n,b)=>n+b.count,0)>=10},{id:'a7',icon:'🚀',name:'Launch Day',desc:'Reach 100 /click.',test:s=>s.baseClick*s.clickMult>=100},{id:'a8',icon:'🧪',name:'AI Touched',desc:'Own AI Lab.',test:s=>(s.buildings.find(b=>b.id==='ai-lab')||{count:0}).count>=1},{id:'a9',icon:'💧',name:'StayWet Moment',desc:'Own StayWet Singularity.',test:s=>(s.buildings.find(b=>b.id==='staywet-singularity')||{count:0}).count>=1},{id:'a10',icon:'🕒',name:'Time Is Money',desc:'Earn offline Bytes.',test:s=>s.meta.offlineEarned>0}];

  // ---------- State ----------
  const S={bytes:0,total:0,baseClick:1,clickMult:1,bpsMult:1,buyQty:'1',settings:{muted:false,reduceFx:false,capOffline:true},buildings:CATALOG.slice(),upgradesOwned:{},achievementsOwned:{},meta:{lastActive:Date.now(),offlineEarned:0}};

  // ---------- DOM ----------
  const bytesEl=document.getElementById('bytes'),statsEl=document.getElementById('stats');
  const clickBtn=document.getElementById('clickBtn'),clickMini=document.getElementById('clickMini'),stickyBar=document.getElementById('stickyBar');
  const storeEl=document.getElementById('store'),upgEl=document.getElementById('upgrades'),achEl=document.getElementById('achievements'),achProgress=document.getElementById('achProgress');
  const views={compile:document.getElementById('view-compile'),shop:document.getElementById('view-shop'),upgrades:document.getElementById('view-upgrades'),achievements:document.getElementById('view-achievements')};
  const tabs=document.getElementById('tabs');
  const qtyBtns=['sq1','sq10','sq100','sqmax'].map(id=>document.getElementById(id));
  const settingsBtn=document.getElementById('settingsBtn'),settingsOverlay=document.getElementById('settingsOverlay'),settingsPop=settingsOverlay.querySelector('.pop');
  const setMute=document.getElementById('setMute'),setFX=document.getElementById('setFX'),setCap=document.getElementById('setCap');
  const saveBtn=document.getElementById('saveBtn'),resetBtn=document.getElementById('resetBtn'),installBtn=document.getElementById('installBtn');

  // ---------- Toast ----------
  const Toast=(()=>{const q=[];let showing=false;function next(){if(showing)return;const it=q.shift();if(!it)return;showing=true;const el=document.createElement('div');el.className='toast'+(it.cls?(' '+it.cls):'');el.textContent=it.msg;document.body.appendChild(el);setTimeout(()=>{el.remove();showing=false;setTimeout(next,120)},it.duration||2600)}return{push:(m,c='',d=null)=>{q.push({msg:m,cls:c,duration:d});next()},ach:m=>{q.push({msg:m,cls:'ach',duration:3600});next()},warn:m=>{q.push({msg:m,cls:'warn',duration:3000});next()}}})();

  // ---------- Helpers ----------
  const costOf=b=>Math.floor(b.baseCost*Math.pow(1.15,b.count));
  const nextCostAt=(b,off)=>Math.floor(b.baseCost*Math.pow(1.15,b.count+off));
  const sumNextN=(b,n)=>{let s=0;for(let i=0;i<n;i++)s+=nextCostAt(b,i);return s};
  const bps=(st=S)=>st.buildings.reduce((sum,b)=>sum+b.count*b.bps,0)*st.bpsMult;
  const clickPower=()=>S.baseClick*S.clickMult;

  function iconNode(item){const box=document.createElement('div');box.className='icon';const img=document.createElement('img');img.alt=item.name||'icon';img.src=item.imgUrl||'';if(!item.imgUrl){box.textContent=item.emojiIcon||'💾';box.style.fontSize='22px'}else box.append(img);return box}
  function row({title,sub,onBuy=()=>{},icon,owned=false,asAch=false,disabled=false,footNote=''}){const li=document.createElement('div');li.className='row'+(asAch?' ach':'');const left=document.createElement('div');left.className='left';left.append(iconNode(icon||{emojiIcon:'💾',name:title}));const meta=document.createElement('div');meta.className='meta';const h=document.createElement('h3');h.textContent=title+(owned?' ✓':'');const p=document.createElement('p');p.textContent=sub;meta.append(h,p);if(footNote){const s=document.createElement('div');s.className='subnote';s.textContent=footNote;meta.append(s)}left.append(meta);li.append(left);if(!asAch){const b=document.createElement('button');b.className='buy';b.textContent=owned?'Owned':'Buy';b.disabled=owned||disabled;b.setAttribute('aria-disabled',b.disabled?'true':'false');b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;onBuy(e)},{passive:true});li.append(b)}return li}
  function achRow(a,done){const li=row({title:a.name,sub:a.desc,icon:{emojiIcon:a.icon,name:a.name},owned:done,asAch:true});if(done)li.classList.add('done');return li}
  function revealIfClose(b){const c=costOf(b);if(!b.unlocked&&S.bytes>=c*SHOW_THRESHOLD)b.unlocked=true;return b.unlocked}

  // ---------- Render ----------
  function drawHeader(){bytesEl.textContent=`${fmt(S.bytes)} Bytes`;statsEl.textContent=`${bps().toFixed(1)} /s • ${Math.floor(clickPower())} /click`}
  function previewBulk(b,mode){if(mode==='max'){let qty=0,cost=0;for(let i=0;i<100000;i++){const c=nextCostAt(b,i);if(cost+c>S.bytes)break;cost+=c;qty++}return{qty,cost}}const n=parseInt(mode,10)||1;return{qty:n,cost:sumNextN(b,n)}}
  function buyExact(b,mode){if(mode==='max'){let got=0;for(let i=0;i<100000;i++){const c=costOf(b);if(S.bytes<c)break;S.bytes-=c;b.count++;got++}return got}const n=parseInt(mode,10)||1;const total=sumNextN(b,n);if(S.bytes<total)return 0;for(let i=0;i<n;i++){const c=costOf(b);S.bytes-=c;b.count++}return n}
  function drawStore(){storeEl.innerHTML='';S.buildings.forEach(b=>{const next=costOf(b);if(!revealIfClose(b))return;const {qty,cost}=previewBulk(b,S.buyQty);const isMax=S.buyQty==='max';const can=isMax?qty>=1:S.bytes>=cost;const sub=`${b.bps} bps each • Next: ${fmt(next)}`;const foot=isMax?`Max right now: ${qty} • Total: ${fmt(cost)}`:`Buy ×${S.buyQty.toUpperCase()} • Total: ${fmt(cost)}`;storeEl.append(row({title:`${b.name} — ${b.count}`,sub,footNote:foot,icon:b,disabled:!can,onBuy:(e)=>{const mode=e.altKey?'max':(e.ctrlKey||e.metaKey)?'100':e.shiftKey?'10':S.buyQty;const got=buyExact(b,mode);if(got>0){AudioFX.buy(got);changed()}else AudioFX.error()}}))});if(!storeEl.children.length){const li=document.createElement('div');li.className='row';li.innerHTML='<p style="margin:0;color:#9ca3af">Earn more Bytes to reveal shop items.</p>';storeEl.append(li)}}
  function drawUpgrades(){upgEl.innerHTML='';let shown=0;UPG.forEach(u=>{if(S.upgradesOwned[u.id])return;const canShow=S.bytes>=u.cost*UPG_SHOW_THRESHOLD;if(!canShow)return;const affordable=S.bytes>=u.cost;upgEl.append(row({title:u.name,sub:`Cost: ${fmt(u.cost)} • One-time`,icon:{emojiIcon:'⚙️',name:u.name},disabled:!affordable,onBuy:()=>{if(S.upgradesOwned[u.id])return;if(S.bytes<u.cost){AudioFX.error();return}S.bytes-=u.cost;S.upgradesOwned[u.id]=true;try{u.apply(S)}catch{}AudioFX.buy(1);shown++;changed()}}));shown++});if(!shown){const li=document.createElement('div');li.className='row';li.innerHTML='<p style="margin:0;color:#9ca3af">No upgrades visible yet. Earn more Bytes to reveal them!</p>';upgEl.append(li)}}
  function drawAchievements(){achEl.innerHTML='';if(S.total<ACHIEVE_LIST_UNLOCK_AT_TOTAL){const li=document.createElement('div');li.className='row';li.innerHTML=`<p style="margin:0;color:#9ca3af">Earn ${ACHIEVE_LIST_UNLOCK_AT_TOTAL}+ total Bytes to unlock the achievements list.</p>`;achEl.append(li);achProgress.textContent=`0/${ACH.length}`;return}const total=ACH.length;const have=ACH.reduce((n,a)=>n+(S.achievementsOwned[a.id]?1:0),0);achProgress.textContent=`${have}/${total}`;ACH.filter(a=>S.achievementsOwned[a.id]).forEach(a=>achEl.append(achRow(a,true)));ACH.filter(a=>!S.achievementsOwned[a.id]).forEach(a=>achEl.append(achRow(a,false)))}
  function drawAll(){drawHeader();if(currentView==='shop')drawStore();if(currentView==='upgrades')drawUpgrades();if(currentView==='achievements')drawAchievements();refreshQtyTabs()}

  // ---------- FX & Achievements ----------
  function spawnFloat(targetEl,x,y,text){if(S.settings.reduceFx)return;const r=targetEl.getBoundingClientRect();const s=document.createElement('div');s.className='floaty';s.textContent=`+${text}`;s.style.left=(x!=null?x-r.left:r.width/2)+'px';s.style.top=(y!=null?y-r.top:r.height/2)+'px';targetEl.appendChild(s);setTimeout(()=>s.remove(),800)}
  function checkAchievements(){let any=false;for(const a of ACH){if(!S.achievementsOwned[a.id]&&a.test(S)){S.achievementsOwned[a.id]=true;any=true;Toast.ach(`🏆 ${a.name} — ${a.desc}`)}}if(any){if(currentView==='achievements')drawAchievements()}}

  // ---------- Input ----------
  function doClick(targetEl,cx,cy){const add=clickPower();S.bytes+=add;S.total+=add;AudioFX.click();spawnFloat(targetEl,cx,cy,Math.round(add));changed()}
  clickBtn.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;doClick(clickBtn,e.clientX,e.clientY);e.preventDefault()},{passive:false});
  clickMini.addEventListener('pointerdown',e=>{doClick(clickMini,e.clientX,e.clientY);e.preventDefault()},{passive:false});

  // ---------- Tabs: robust delegation ----------
  let currentView='compile';
  tabs.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    const which = btn.dataset.view;
    currentView = which;

    // tab visuals
    [...tabs.querySelectorAll('button[data-view]')].forEach(b=>{
      b.classList.toggle('active', b === btn);
    });

    // view switch
    Object.entries(views).forEach(([k,el])=>{
      const act=(k===which);
      el.classList.toggle('active', act);
      el.setAttribute('aria-hidden', act?'false':'true');
    });

    // mini bar visibility
    stickyBar.classList.toggle('hidden', which==='compile');

    drawAll();
  });

  // ---------- Change & per-second tick ----------
  function changed(){drawHeader();if(currentView==='shop')drawStore();if(currentView==='upgrades')drawUpgrades();if(currentView==='achievements')drawAchievements();checkAchievements();S.meta.lastActive=Date.now()}

  let last=performance.now(), acc=0;
  function loop(t){
    const dt=Math.max(0,(t-last)/1000); last=t; acc+=dt;
    if(acc>=1){
      const whole=Math.floor(acc); acc-=whole;
      const inc=bps()*whole;
      if(inc>0){ S.bytes+=inc; S.total+=inc; }
      drawHeader();
    }
    requestAnimationFrame(loop);
  }

  // ---------- Qty ----------
  function setQty(q){S.buyQty=q;refreshQtyTabs();if(views.shop.classList.contains('active'))drawStore()}
  function refreshQtyTabs(){qtyBtns.forEach(btn=>{if(!btn)return;const active=S.buyQty===btn.dataset.q;btn.classList.toggle('active',active);btn.style.background=active?'var(--accent)':'#0b1220';btn.style.color=active?'#001018':'#cbd5e1';btn.style.boxShadow=active?'0 6px 18px #22d3ee55':'none'})}
  qtyBtns.forEach(btn=>btn.addEventListener('click',()=>setQty(btn.dataset.q),{passive:true}));

  // ---------- Settings ----------
  function openSettings(){settingsOverlay.classList.remove('hidden');settingsOverlay.setAttribute('aria-hidden','false');setMute.checked=!!S.settings.muted;setFX.checked=!!S.settings.reduceFx;setCap.checked=!!S.settings.capOffline}
  function closeSettings(){settingsOverlay.classList.add('hidden');settingsOverlay.setAttribute('aria-hidden','true')}
  settingsBtn.addEventListener('click',e=>{e.stopPropagation();openSettings()},{passive:true});
  settingsOverlay.addEventListener('click',e=>{if(e.target===settingsOverlay)closeSettings()},{passive:true});
  settingsPop.addEventListener('click',e=>e.stopPropagation(),{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!settingsOverlay.classList.contains('hidden'))closeSettings()});
  setMute.addEventListener('change',()=>{S.settings.muted=setMute.checked},{passive:true});
  setFX.addEventListener('change',()=>{S.settings.reduceFx=setFX.checked},{passive:true});
  setCap.addEventListener('change',()=>{S.settings.capOffline=setCap.checked},{passive:true});

  // ---------- Save/Load ----------
  function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch{} }
  function load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
      const s=JSON.parse(raw);
      S.bytes=+s.bytes||0; S.total=+s.total||0;
      S.baseClick=s.baseClick||1; S.clickMult=s.clickMult||1; S.bpsMult=s.bpsMult||1;
      S.buyQty=['1','10','100','max'].includes(s.buyQty)?s.buyQty:'1';
      S.settings=Object.assign({muted:false,reduceFx:false,capOffline:true},s.settings||{});
      const counts=Object.fromEntries((s.buildings||[]).map(b=>[b.id,b.count||0]));
      S.buildings=CATALOG.map(def=>{const saved=(s.buildings||[]).find(x=>x.id===def.id);return {...def,count:counts[def.id]||0,unlocked:!!(saved&&saved.unlocked)}});
      S.upgradesOwned=s.upgradesOwned||{}; S.achievementsOwned=s.achievementsOwned||{};
      S.meta=Object.assign({lastActive:Date.now(), offlineEarned:0},s.meta||{});
    }catch(e){console.warn('load failed',e)}
  }

  function saveOnExit(){ S.meta.lastActive=Date.now(); save(); }
  ['pagehide','beforeunload'].forEach(ev=>window.addEventListener(ev,saveOnExit));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) saveOnExit(); });

  if(saveBtn)  saveBtn.addEventListener('click',()=>{ save(); Toast.push('Game saved'); },{passive:true});
  if(resetBtn) resetBtn.addEventListener('click',()=>{ if(confirm('Reset all progress?')){ localStorage.removeItem(SAVE_KEY); location.reload(); }},{passive:true});

  // ---------- Offline gain ----------
  function applyOfflineGain(){
    const now=Date.now(), then=S.meta.lastActive||now;
    let secs=Math.max(0,(now-then)/1000);
    if(S.settings.capOffline) secs=Math.min(secs,MAX_OFFLINE_HOURS*3600);
    const earn=bps()*Math.floor(secs);
    if(earn>0){ S.bytes+=earn; S.total+=earn; S.meta.offlineEarned+=earn; Toast.push(`+${fmt(earn)} Bytes while you were away`) }
  }

  // ---------- PWA install ----------
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(installBtn)installBtn.style.display='';});
  if(installBtn){installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.style.display='none';},{passive:true});}

  // ---------- Boot ----------
  load();
  applyOfflineGain();
  // ensure only Compile is visible at start
  Object.entries(views).forEach(([k,el])=>{const act=k==='compile';el.classList.toggle('active',act);el.setAttribute('aria-hidden',act?'false':'true')});
  stickyBar.classList.add('hidden');
  drawAll();
  requestAnimationFrame(loop);
})();
