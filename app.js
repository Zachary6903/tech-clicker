(() => {
  'use strict';

  // =========================
  // Tunables (progression)
  // =========================
  const SAVE_KEY = 'tc_rebalanced_v1';
  const SHOW_THRESHOLD = 0.88;       // reveal shop items slightly before you can buy
  const MAX_OFFLINE_HOURS = 24;
  const ACHIEVE_LIST_UNLOCK_AT_TOTAL = 0;
  const costGrowth = 1.14;           // gentler building growth for smoother runs

  // Prestige (friendly first cores, scales later)
  // Cores gained = floor((runTotal / CORE_BASE) ^ CORE_EXP)
  const CORE_BASE = 8e6;    // ~8,000,000 Bytes for first core (easy early prestige)
  const CORE_EXP  = 0.52;   // slightly faster than sqrt at scale
  const CORE_BONUS_PER = 0.12; // +12% to Click and BPS per core

  // Golden event (random boost)
  const BOOST_MIN_GAP_S = 45;     // earliest next spawn
  const BOOST_MAX_GAP_S = 120;    // latest next spawn
  const BOOST_VIS_MS    = 12000;  // orb visible time
  const BOOST_DUR_MS    = 30000;  // duration of boost after click
  const BOOST_RARE_CHANCE = 0.06; // 6% = x100, otherwise x10

  // =========================
  // Utils
  // =========================
  const nice = ['#22d3ee','#60a5fa','#a78bfa','#7dd3fc','#34d399','#f472b6','#fb7185','#f59e0b','#ef4444','#22c55e'];

  // Very-high short-scale formatter (then scientific)
  const fmt = (n) => {
    if (!isFinite(n)) return '∞';
    if (n < 1e3) return Math.floor(n).toString();
    const units = [
      'k','M','B','T','Qa','Qi','Sx','Sp','Oc','No',
      'De','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod',
      'Vg','Uvg','Dvg','Tvg','Qavg','Qivg','Sxvg','Spvg','Ocvg','Novg'
    ];
    const e = Math.floor(Math.log10(n));
    const u = Math.floor(e / 3);
    if (u <= units.length) {
      const v = n / Math.pow(10, u * 3);
      return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + units[u - 1];
    }
    return n.toExponential(2).replace('e+', 'e');
  };

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

  const AudioFX=(()=>{let ctx;
    function ac(){ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();return ctx}
    function beep({f=440,t=.06,type='square',g=.05}={}){if(S.settings.muted)return;const c=ac(),o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(f,c.currentTime);v.gain.value=g;o.connect(v).connect(c.destination);o.start();v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+t);o.stop(c.currentTime+t+.01)}
    return{
      click(){beep({f:520,t:.05,type:'square',g:.06})},
      buy(n=1){const base=340,steps=Math.min(4,Math.max(1,Math.floor(Math.log2(n+1))+1));for(let i=0;i<steps;i++){const f=base*Math.pow(1.12,i*3);setTimeout(()=>beep({f,t:.05,type:'triangle',g:.05}),i*55)}},
      rare(){beep({f:1200,t:.10,type:'triangle',g:.08})},
      boost(){beep({f:900,t:.08,type:'sine',g:.07})},
      pop(){beep({f:700,t:.05,type:'square',g:.06})},
      error(){beep({f:160,t:.1,type:'sawtooth',g:.07})}
    }
  })();

  // =========================
  // Catalog (trimmed & rebalance)
  // Keep "StayWet Singularity" last
  // =========================
  // Using friendlier base prices (×2) and solid BPS so early game pops,
  // with gentle global growth (1.14) to avoid brick walls.
  const RAW_CATALOG = [
    ['Intern','🧑‍💻',15,0.12],
    ['Script Bot','🤖',80,0.9],
    ['Cloud Instance','☁️',320,5],
    ['Build Server','🖥️',900,9],
    ['ML Training Rig','🧠',9000,140],
    ['Data Center Rack','🗄️',80000,1000],
    ['AI Lab','🧪',800000,9500],
    ['Quantum Simulator','🧮',8000000,90000],
    ['Neural Forge','⚒️',5.6e7,300000],
    ['GPU Geyser','⛲',2.4e8,650000],
    ['Router Reef','🪸',9.2e8,1400000],
    ['Thread Tide','🌐',3.2e9,2600000],
    ['Core Cove','🏝️',1.2e10,5200000],
    ['Dev Delta','🌀',4.2e10,11000000],
    ['Compiler Canyon','🏞️',8.6e10,37000000],
    ['Quantum Quay','⚛️',1.4e11,62000000],
    ['Neural Nebula','🌌',2.0e11,90000000],
    ['StayWet Singularity','💧',3.6e11,180000000]
  ];

  const CATALOG = RAW_CATALOG.map((d,i)=>({
    id: slug(d[0]),
    name: d[0],
    baseCost: Math.floor(d[2] * 2), // small bump to align with gentler growth
    bps: d[3],
    count: 0,
    emojiIcon: d[1],
    imgUrl: makeIcon(d[1], nice[i % nice.length]),
    unlocked: false
  }));

  // =========================
  // Repeatable Upgrades (never run out)
  // =========================
  // type: 'multClick' | 'multBps' | 'flatClick' | 'discShop' | 'auto' | 'crit'
  const REP_UPG = {
    clickX:       { key:'clickX',       name:'Click Multiplier',     icon:'🌀', baseCost:  500, costRise: 1.6,  perLevel: 0.10, type:'multClick' }, // +10% click / level
    bpsX:         { key:'bpsX',         name:'Throughput',           icon:'📈', baseCost:  900, costRise: 1.63, perLevel: 0.08, type:'multBps'   }, // +8% BPS / level
    clickAdd:     { key:'clickAdd',     name:'Hotkeys',              icon:'⌨️', baseCost:  350, costRise: 1.7,  perLevel: 1,    type:'flatClick' }, // +1 click / level
    cache:        { key:'cache',        name:'Compiler Cache',       icon:'🧊', baseCost: 1300, costRise: 1.85, perLevel: 0.02, type:'discShop' }, // -2% shop prices per level (cap 50%)
    crit:         { key:'crit',         name:'Critical Clicks',      icon:'💥', baseCost: 1000, costRise: 1.8,  perLevel: 0.015,type:'crit'     }, // +1.5% crit chance / level
  };

  // =========================
  // Achievements
  // =========================
  function genAchievements(){
    const ach = [];
    let idc = 1;
    const push = (icon,name,desc,test) => ach.push({ id:'a'+(idc++), icon, name, desc, test });

    // Bytes totals
    const byteMarks = [
      1e2,1e3,1e4,1e5,1e6,1e7,5e7,1e8,5e8,1e9,1e10,1e11,
      1e12,1e13,1e14,1e15,1e16,1e17,1e18,1e19
    ];
    byteMarks.forEach((m,i)=>push('💾',`Bytes ${i+1}`,`Earn ${fmt(m)} total Bytes.`,s=>s.total>=m));

    // Click power milestones
    [10,25,50,100,250,500,1e3,5e3,1e4,5e4].forEach((m,i)=>
      push('🖱️',`Click Power ${i+1}`,`Reach ${fmt(m)} /click.`,s=>clickPower(s)>=m)
    );

    // BPS milestones
    [10,50,100,250,500,1e3,5e3,1e4,1e5,1e6].forEach((m,i)=>
      push('⏱️',`Throughput ${i+1}`,`Reach ${fmt(m)} BPS.`,s=>bps(s)>=m)
    );

    // Owned totals
    [10,25,50,75,100,150,200,300].forEach((m,i)=>
      push('🏗️',`Builder ${i+1}`,`Own ${m} total items.`,s=>s.buildings.reduce((n,b)=>n+b.count,0)>=m)
    );

    // Repeatable upgrades total levels
    [10,20,30,40,60,80,100,150,200].forEach((m,i)=>
      push('⚙️',`Tinkerer ${i+1}`,`Reach ${m} total upgrade levels.`,s=>{
        const t = Object.values(s.repLvls||{}).reduce((a,b)=>a+(b||0),0);
        return t>=m;
      })
    );

    // Key buildings (selection)
    [
      ['ai-lab','🧪','Own AI Lab.'],
      ['quantum-simulator','🧮','Own Quantum Simulator.'],
      ['gpu-geyser','⛲','Own GPU Geyser.'],
      ['neural-forge','⚒️','Own Neural Forge.'],
      ['router-reef','🪸','Own Router Reef.'],
      ['thread-tide','🌐','Own Thread Tide.'],
      ['core-cove','🏝️','Own Core Cove.'],
      ['compiler-canyon','🏞️','Own Compiler Canyon.'],
      ['quantum-quay','⚛️','Own Quantum Quay.'],
      ['neural-nebula','🌌','Own Neural Nebula.'],
      ['staywet-singularity','💧','Own StayWet Singularity.']
    ].forEach(([id,icon,desc])=>push(icon,`First ${id.replace(/-/g,' ')}`,desc,s=>(s.buildings.find(b=>b.id===id)||{count:0}).count>=1));

    // Offline earner
    push('🕒','Time Is Money','Earn offline Bytes.',s=>s.meta.offlineEarned>0);

    // Tycoon (single stack)
    [25,50,100,150,200,300,400,500].forEach((m,i)=>
      push('🏪',`Tycoon ${i+1}`,`Any one item reaches ${m} owned.`,s=>s.buildings.some(b=>b.count>=m))
    );

    // Prestige milestones
    [1,3,5,10,20].forEach((m,i)=>
      push('🔱',`Ascendant ${i+1}`,`Reach ${m} Compiler Cores.`,s=>s.meta.cores>=m)
    );

    // Golden event
    push('⭐','Golden Build','Click a Golden Build orb.',s=>s.meta.goldenHits>0);

    return ach;
  }
  const ACH = genAchievements();

  // =========================
  // Prestige helpers
  // =========================
  const prestigeMult = (st=S) => 1 + (st.meta.cores||0) * CORE_BONUS_PER;
  const coresFromRun  = (runTotal) => Math.max(0, Math.floor(Math.pow(runTotal / CORE_BASE, CORE_EXP)));

  // =========================
  // State
  // =========================
  const S = {
    bytes:0,total:0,baseClick:1, // start at 1 /click
    clickMult:1,bpsMult:1,buyQty:'1',
    // Extras from upgrades:
    shopDiscPct:0,      // 0..0.5 (50% max)
    autoPerSec:0,       // auto clicks per second
    critChance:0,       // 0..0.5 cap
    settings:{muted:false,reduceFx:false,capOffline:true},
    buildings:CATALOG.slice(),
    achievementsOwned:{},
    repLvls:Object.fromEntries(Object.keys(REP_UPG).map(k=>[k,0])),
    // Golden event
    boost:{mult:1, until:0},
    meta:{
      lastActive:Date.now(),
      offlineEarned:0,
      cores:0,
      runs:0,
      bestRunTotal:0,
      lifetimeTotal:0,
      goldenHits:0
    }
  };

  // =========================
  // DOM
  // =========================
  const bytesEl=document.getElementById('bytes'),statsEl=document.getElementById('stats');
  const clickBtn=document.getElementById('clickBtn'),clickMini=document.getElementById('clickMini'),stickyBar=document.getElementById('stickyBar');
  const storeEl=document.getElementById('store'),upgEl=document.getElementById('upgrades'),achEl=document.getElementById('achievements'),achProgress=document.getElementById('achProgress');
  const views={
    compile:document.getElementById('view-compile'),
    shop:document.getElementById('view-shop'),
    upgrades:document.getElementById('view-upgrades'),
    achievements:document.getElementById('view-achievements')
  };
  const tabs=document.getElementById('tabs');
  const qtyBtns=['sq1','sq10','sq100','sqmax'].map(id=>document.getElementById(id));
  const settingsBtn=document.getElementById('settingsBtn'),settingsOverlay=document.getElementById('settingsOverlay'),settingsPop=settingsOverlay.querySelector('.pop');
  const setMute=document.getElementById('setMute'),setFX=document.getElementById('setFX'),setCap=document.getElementById('setCap');
  const saveBtn=document.getElementById('saveBtn');
  const resetBtn=document.getElementById('resetBtn'); // may exist in HTML
  const installBtn=document.getElementById('installBtn');

  // Remove Reset button (Ascend replaces it)
  if (resetBtn && resetBtn.parentElement) resetBtn.parentElement.removeChild(resetBtn);

  // Add Cores badge + Ascend + Boost timer to header
  const headerBar = document.querySelector('.bar');

  const coreBadge = document.createElement('div');
  coreBadge.id = 'coreBadge';
  coreBadge.className = 'pill';
  coreBadge.style.cursor = 'default';
  coreBadge.setAttribute('aria-live','polite');
  coreBadge.textContent = 'Cores: 0';
  headerBar && headerBar.insertBefore(coreBadge, headerBar.firstChild);

  const boostBadge = document.createElement('div');
  boostBadge.id = 'boostBadge';
  boostBadge.className = 'pill';
  boostBadge.style.cursor = 'default';
  boostBadge.textContent = '';
  boostBadge.style.display = 'none';
  headerBar && headerBar.insertBefore(boostBadge, coreBadge.nextSibling);

  const ascendBtn = document.createElement('button');
  ascendBtn.className = 'pill';
  ascendBtn.type = 'button';
  ascendBtn.id = 'ascendBtn';
  ascendBtn.textContent = 'Ascend';
  headerBar && headerBar.appendChild(ascendBtn);

  // Prestige modal (overlay)
  const prestigeOverlay = document.createElement('div');
  prestigeOverlay.className = 'overlay hidden';
  prestigeOverlay.id = 'prestigeOverlay';
  prestigeOverlay.setAttribute('aria-hidden','true');
  prestigeOverlay.innerHTML = `
    <div class="pop" role="dialog" aria-modal="true" aria-labelledby="prestigeTitle">
      <h3 id="prestigeTitle">Ascend (Prestige)</h3>
      <div class="rowline"><span>Current Cores</span><strong id="coreCount">0</strong></div>
      <div class="rowline"><span>Potential This Run</span><strong id="corePotential">0</strong></div>
      <div class="rowline"><span>Multiplier if Ascend</span><strong id="coreMult">×1.00</strong></div>
      <div class="subnote">Ascension <strong>resets</strong> Bytes, buildings, and upgrade levels, but keeps <strong>achievements</strong> and adds permanent Cores.</div>
      <div class="rowline" style="margin-top:10px; gap:8px;">
        <button class="pill" id="confirmAscend" type="button">Confirm Ascend</button>
        <button class="pill" id="cancelAscend" type="button">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(prestigeOverlay);
  const coreCountEl = prestigeOverlay.querySelector('#coreCount');
  const corePotentialEl = prestigeOverlay.querySelector('#corePotential');
  const coreMultEl = prestigeOverlay.querySelector('#coreMult');
  const confirmAscendBtn = prestigeOverlay.querySelector('#confirmAscend');
  const cancelAscendBtn = prestigeOverlay.querySelector('#cancelAscend');
  const prestigePop = prestigeOverlay.querySelector('.pop');

  // Golden orb element
  const orb = document.createElement('div');
  orb.style.cssText = `
    position: fixed; width: 58px; height: 58px; border-radius: 50%;
    background: radial-gradient(#fff, #facc15);
    box-shadow: 0 0 20px #facc15, 0 0 40px #facc15aa;
    display: none; z-index: 60; cursor: pointer;
    border: 2px solid #fde68a;
  `;
  orb.setAttribute('aria-label','Golden Build');
  document.body.appendChild(orb);

  // =========================
  // Toast
  // =========================
  const Toast=(()=>{const q=[];let showing=false;
    function next(){if(showing)return;const it=q.shift();if(!it)return;showing=true;
      const el=document.createElement('div');el.className='toast'+(it.cls?(' '+it.cls):'');el.textContent=it.msg;document.body.appendChild(el);
      setTimeout(()=>{el.remove();showing=false;setTimeout(next,120)},it.duration||2600)}
    return{
      push:(m,c='',d=null)=>{q.push({msg:m,cls:c,duration:d});next()},
      ach:m=>{q.push({msg:m,cls:'ach',duration:3600});next()},
      warn:m=>{q.push({msg:m,cls:'warn',duration:3000});next()}
    }
  })();

  // =========================
  // Helpers
  // =========================
  const shopCostMult = (st=S) => Math.max(0.5, 1 - (st.shopDiscPct||0)); // floor at 50% off
  const costOf     = b => Math.floor(b.baseCost * shopCostMult() * Math.pow(costGrowth, b.count));
  const nextCostAt = (b,off)=> Math.floor(b.baseCost * shopCostMult() * Math.pow(costGrowth, b.count + off));
  const sumNextN   = (b,n)=>{let s=0;for(let i=0;i<n;i++)s+=nextCostAt(b,i);return s};

  const boostActive = (st=S)=> Date.now() < (st.boost.until||0);
  const boostMult   = (st=S)=> boostActive(st) ? (st.boost.mult||1) : 1;

  const rawBps     = (st=S)=> st.buildings.reduce((sum,b)=>sum+b.count*b.bps,0) * st.bpsMult;
  const bps        = (st=S)=> rawBps(st) * prestigeMult(st) * boostMult(st);
  const clickBase  = (st=S)=> (st.baseClick * st.clickMult);
  const clickPower = (st=S)=> clickBase(st) * prestigeMult(st) * boostMult(st);

  function iconNode(item){
    const box=document.createElement('div');box.className='icon';
    const img=document.createElement('img');img.alt=item.name||'icon';img.src=item.imgUrl||'';
    if(!item.imgUrl){box.textContent=item.emojiIcon||'💾';box.style.fontSize='22px';}else box.append(img);
    return box;
  }

  function row({title,sub,onBuy=()=>{},icon,owned=false,asAch=false,disabled=false,footNote='',cta='Buy'}){
    const li=document.createElement('div');li.className='row'+(asAch?' ach':'');
    const left=document.createElement('div');left.className='left';
    left.append(iconNode(icon||{emojiIcon:'💾',name:title}));
    const meta=document.createElement('div');meta.className='meta';
    const h=document.createElement('h3');h.textContent=title+(owned?' ✓':'');
    const p=document.createElement('p');p.textContent=sub;
    meta.append(h,p);
    if(footNote){const s=document.createElement('div');s.className='subnote';s.textContent=footNote;meta.append(s)}
    left.append(meta);li.append(left);
    if(!asAch){
      const b=document.createElement('button');b.className='buy';b.textContent=owned?'Owned':cta;
      b.disabled=owned||disabled;b.setAttribute('aria-disabled',b.disabled?'true':'false');
      b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;onBuy(e)},{passive:true});
      li.append(b);
    }
    return li;
  }
  function achRow(a,done){const li=row({title:a.name,sub:a.desc,icon:{emojiIcon:a.icon,name:a.name},owned:done,asAch:true});if(done)li.classList.add('done');return li}
  function revealIfClose(b){const c=costOf(b);if(!b.unlocked&&S.bytes>=c*SHOW_THRESHOLD)b.unlocked=true;return b.unlocked}

  // =========================
  // Repeatable Upgrades
  // =========================
  function repCost(key, lvl){
    const cfg = REP_UPG[key];
    return Math.floor(cfg.baseCost * Math.pow(cfg.costRise, lvl));
  }
  function applyRepEffect(key, times=1){
    const cfg = REP_UPG[key];
    if (!cfg || times<=0) return;
    if (cfg.type === 'multClick') S.clickMult *= Math.pow(1 + cfg.perLevel, times);
    if (cfg.type === 'multBps')   S.bpsMult   *= Math.pow(1 + cfg.perLevel, times);
    if (cfg.type === 'flatClick') S.baseClick += cfg.perLevel * times;
    if (cfg.type === 'discShop')  S.shopDiscPct = Math.min(0.5, S.shopDiscPct + cfg.perLevel * times);
    if (cfg.type === 'auto')      S.autoPerSec += cfg.perLevel * times;
    if (cfg.type === 'crit')      S.critChance = Math.min(0.5, (S.critChance||0) + cfg.perLevel * times);
  }
  function buyRep(key){
    const lvl = S.repLvls[key] || 0;
    const cost = repCost(key, lvl);
    if (S.bytes < cost) { AudioFX.error(); return false; }
    S.bytes -= cost;
    S.repLvls[key] = lvl + 1;
    applyRepEffect(key, 1);
    AudioFX.buy(1);
    return true;
  }

  // =========================
  // Render
  // =========================
  function drawHeader(){
    const mult = prestigeMult().toFixed(2);
    coreBadge.textContent = `Cores: ${S.meta.cores}`;

    // Boost badge
    if (boostActive()) {
      const ms = Math.max(0, S.boost.until - Date.now());
      const s  = Math.ceil(ms/1000);
      boostBadge.style.display = '';
      boostBadge.textContent = `Boost ×${S.boost.mult} — ${s}s`;
    } else {
      boostBadge.style.display = 'none';
      boostBadge.textContent = '';
    }

    bytesEl.textContent=`${fmt(S.bytes)} Bytes`;
    statsEl.textContent=`${bps().toFixed(1)} /s • ${Math.floor(clickPower())} /click • Cores: ${S.meta.cores} (×${mult})`;
  }

  function previewBulk(b,mode){
    if(mode==='max'){
      let qty=0,cost=0;
      for(let i=0;i<100000;i++){const c=nextCostAt(b,i);if(cost+c>S.bytes)break;cost+=c;qty++}
      return{qty,cost}
    }
    const n=parseInt(mode,10)||1;return{qty:n,cost:sumNextN(b,n)}
  }

  function buyExact(b,mode){
    if(mode==='max'){let got=0;for(let i=0;i<100000;i++){const c=costOf(b);if(S.bytes<c)break;S.bytes-=c;b.count++;got++}return got}
    const n=parseInt(mode,10)||1;const total=sumNextN(b,n);if(S.bytes<total)return 0;
    for(let i=0;i<n;i++){const c=costOf(b);S.bytes-=c;b.count++}
    return n
  }

  function drawStore(){
    storeEl.innerHTML='';
    S.buildings.forEach(b=>{
      const next=costOf(b);
      if(!revealIfClose(b))return;
      const {qty,cost}=previewBulk(b,S.buyQty);
      const isMax=S.buyQty==='max';
      const can=isMax?qty>=1:S.bytes>=cost;
      const sub=`${b.bps} bps each • Next: ${fmt(next)}`;
      const foot=isMax?`Max right now: ${qty} • Total: ${fmt(cost)}`:`Buy ×${S.buyQty.toUpperCase()} • Total: ${fmt(cost)}`;
      storeEl.append(row({
        title:`${b.name} — ${b.count}`,sub,footNote:foot,icon:b,disabled:!can,
        onBuy:(e)=>{
          const mode=e.altKey?'max':(e.ctrlKey||e.metaKey)?'100':e.shiftKey?'10':S.buyQty;
          const got=buyExact(b,mode);
          if(got>0){AudioFX.buy(got);changed()}else AudioFX.error();
        }
      }));
    });
    if(!storeEl.children.length){
      const li=document.createElement('div');li.className='row';
      li.innerHTML='<p style="margin:0;color:#9ca3af">Earn more Bytes to reveal shop items.</p>';
      storeEl.append(li);
    }
  }

  function repSubText(k, lvl){
    const cfg = REP_UPG[k];
    const cost = repCost(k, lvl);
    switch(cfg.type){
      case 'multClick': return `Lv ${lvl} → ${lvl+1} • +${Math.round(cfg.perLevel*100)}% /click • Cost: ${fmt(cost)}`;
      case 'multBps':   return `Lv ${lvl} → ${lvl+1} • +${Math.round(cfg.perLevel*100)}% BPS • Cost: ${fmt(cost)}`;
      case 'flatClick': return `Lv ${lvl} → ${lvl+1} • +${cfg.perLevel} /click • Cost: ${fmt(cost)}`;
      case 'discShop':  return `Lv ${lvl} → ${lvl+1} • −${Math.round(cfg.perLevel*100)}% shop prices (cap 50%) • Cost: ${fmt(cost)}`;
      case 'auto':      return `Lv ${lvl} → ${lvl+1} • +${cfg.perLevel} clicks/sec • Cost: ${fmt(cost)}`;
      case 'crit':      return `Lv ${lvl} → ${lvl+1} • +${Math.round(cfg.perLevel*100)}% crit chance • Cost: ${fmt(cost)}`;
      default:          return `Lv ${lvl} → ${lvl+1} • Cost: ${fmt(cost)}`;
    }
  }

  function drawUpgrades(){
    upgEl.innerHTML='';
    Object.keys(REP_UPG).forEach(key=>{
      const cfg = REP_UPG[key];
      const lvl = S.repLvls[key] || 0;
      const cost = repCost(key, lvl);
      const afford = S.bytes >= cost;
      upgEl.append(row({
        title:`${cfg.name} — Lv ${lvl}`,
        sub: repSubText(key, lvl),
        icon:{emojiIcon:cfg.icon,name:cfg.name},
        disabled: !afford,
        cta: 'Upgrade',
        onBuy: ()=>{ if(buyRep(key)) changed(); else AudioFX.error(); }
      }));
    });
  }

  function drawAchievements(){
    achEl.innerHTML='';
    if(S.total<ACHIEVE_LIST_UNLOCK_AT_TOTAL){
      const li=document.createElement('div');li.className='row';
      li.innerHTML=`<p style="margin:0;color:#9ca3af">Earn ${ACHIEVE_LIST_UNLOCK_AT_TOTAL}+ total Bytes to unlock the achievements list.</p>`;
      achEl.append(li);achProgress.textContent=`0/${ACH.length}`;return;
    }
    const total=ACH.length;
    const have=ACH.reduce((n,a)=>n+(S.achievementsOwned[a.id]?1:0),0);
    achProgress.textContent=`${have}/${total}`;
    ACH.filter(a=>S.achievementsOwned[a.id]).forEach(a=>achEl.append(achRow(a,true)));
    ACH.filter(a=>!S.achievementsOwned[a.id]).forEach(a=>achEl.append(achRow(a,false)));
  }

  function drawAll(){
    drawHeader();
    if(currentView==='shop')drawStore();
    if(currentView==='upgrades')drawUpgrades();
    if(currentView==='achievements')drawAchievements();
    refreshQtyTabs();
  }

  // =========================
  // FX & Achievements
  // =========================
  function spawnFloat(targetEl,x,y,text,cls=''){
    if(S.settings.reduceFx)return;
    const r=targetEl.getBoundingClientRect();
    const s=document.createElement('div');s.className='floaty'+(cls?(' '+cls):'');s.textContent=`+${text}`;
    s.style.left=(x!=null?x-r.left:r.width/2)+'px';
    s.style.top=(y!=null?y-r.top:r.height/2)+'px';
    targetEl.appendChild(s);
    setTimeout(()=>s.remove(),800);
  }

  function checkAchievements(){
    let any=false;
    for(const a of ACH){
      if(!S.achievementsOwned[a.id] && a.test(S)){
        S.achievementsOwned[a.id]=true; any=true;
        Toast.ach(`🏆 ${a.name} — ${a.desc}`);
      }
    }
    if(any && currentView==='achievements') drawAchievements();
  }

  // =========================
  // Prestige UI
  // =========================
  function openPrestige(){
    const runTotal = S.total;
    const potential = coresFromRun(runTotal);
    coreCountEl.textContent = `${S.meta.cores}`;
    corePotentialEl.textContent = `${potential}`;
    coreMultEl.textContent = `×${(1 + (S.meta.cores + potential)*CORE_BONUS_PER).toFixed(2)}`;

    prestigeOverlay.classList.remove('hidden');
    prestigeOverlay.setAttribute('aria-hidden','false');
  }
  function closePrestige(){
    prestigeOverlay.classList.add('hidden');
    prestigeOverlay.setAttribute('aria-hidden','true');
  }

  document.getElementById('ascendBtn').addEventListener('click', ()=> {
    const potential = coresFromRun(S.total);
    if (potential <= 0) Toast.warn('Keep building Bytes to earn Cores from Ascend!');
    openPrestige();
  }, {passive:true});

  prestigeOverlay.addEventListener('click', e=>{
    if(e.target===prestigeOverlay) closePrestige();
  }, {passive:true});
  prestigePop.addEventListener('click', e=>e.stopPropagation(), {passive:true});
  cancelAscendBtn.addEventListener('click', closePrestige, {passive:true});

  function performAscend(coresGained){
    const runTotal = S.total;
    S.meta.lifetimeTotal += runTotal;
    S.meta.bestRunTotal = Math.max(S.meta.bestRunTotal || 0, runTotal);
    S.meta.runs = (S.meta.runs || 0) + 1;
    S.meta.cores = (S.meta.cores || 0) + coresGained;

    // Reset run
    S.bytes = 0;
    S.total = 0;
    S.baseClick = 1;
    S.clickMult = 1;
    S.bpsMult = 1;
    S.shopDiscPct = 0;
    S.autoPerSec = 0;
    S.critChance = 0;
    S.buildings = CATALOG.map(def=>({...def, count:0, unlocked:false}));
    // Keep achievements
    S.repLvls = Object.fromEntries(Object.keys(REP_UPG).map(k=>[k,0]));
    S.meta.offlineEarned = 0;
    S.meta.lastActive = Date.now();
    S.boost = {mult:1, until:0};

    Toast.push(`Ascended! +${coresGained} Cores • New mult ×${prestigeMult().toFixed(2)}`);
    closePrestige();
    changed();
  }

  confirmAscendBtn.addEventListener('click', ()=>{
    const coresGained = coresFromRun(S.total);
    if (coresGained<=0) { AudioFX.error(); return; }
    performAscend(coresGained);
  }, {passive:true});

  // =========================
  // Golden Event
  // =========================
  let orbTimer = null, orbHideTimer = null, nextSpawnTimer = null;

  function scheduleOrb(){
    clearTimeout(nextSpawnTimer);
    const gap = (BOOST_MIN_GAP_S + Math.random()*(BOOST_MAX_GAP_S-BOOST_MIN_GAP_S)) * 1000;
    nextSpawnTimer = setTimeout(spawnOrb, gap);
  }
  function spawnOrb(){
    // Random spot away from edges
    const pad = 70;
    const x = pad + Math.random() * (window.innerWidth - pad*2);
    const y = pad + Math.random() * (window.innerHeight - pad*2);
    orb.style.left = `${x}px`;
    orb.style.top  = `${y}px`;
    orb.style.display = '';
    AudioFX.boost();

    clearTimeout(orbHideTimer);
    orbHideTimer = setTimeout(()=>{
      orb.style.display='none';
      scheduleOrb();
    }, BOOST_VIS_MS);
  }
  orb.addEventListener('pointerdown', (e)=>{
    if(e.pointerType==='mouse'&&e.button!==0) return;
    e.preventDefault();
    orb.style.display='none';
    clearTimeout(orbHideTimer);

    // Pick multiplier
    const rare = Math.random() < BOOST_RARE_CHANCE;
    const mult = rare ? 100 : 10;
    S.boost.mult = mult;
    S.boost.until = Date.now() + BOOST_DUR_MS;
    S.meta.goldenHits = (S.meta.goldenHits||0) + 1;
    AudioFX.rare();
    Toast.push(rare ? '🌟 Ultra Build! ×100 for 30s' : '⭐ Golden Build! ×10 for 30s');
    changed();

    scheduleOrb();
  }, {passive:false});

  // =========================
  // Input
  // =========================
  function doClick(targetEl,cx,cy){
    // crit?
    const isCrit = Math.random() < (S.critChance||0);
    const critMul = isCrit ? 2 : 1;
    const add = Math.floor(clickPower() * critMul);
    S.bytes += add;
    S.total += add;
    AudioFX.click();
    spawnFloat(targetEl,cx,cy,Math.round(add), isCrit ? 'crit' : '');
    changed();
  }
  clickBtn.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;doClick(clickBtn,e.clientX,e.clientY);e.preventDefault()},{passive:false});
  clickMini.addEventListener('pointerdown',e=>{doClick(clickMini,e.clientX,e.clientY);e.preventDefault()},{passive:false});

  // Tabs
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

  // =========================
  // Change & per-second loop
  // =========================
  function changed(){
    drawHeader();
    if(currentView==='shop')drawStore();
    if(currentView==='upgrades')drawUpgrades();
    if(currentView==='achievements')drawAchievements();
    checkAchievements();
    S.meta.lastActive=Date.now();
  }

  let last=performance.now(), acc=0, autoAcc = 0;
  function loop(t){
    const dt=Math.max(0,(t-last)/1000); last=t; acc+=dt; autoAcc+=dt;

    // Per-second BPS
    if(acc>=1){
      const whole=Math.floor(acc); acc-=whole;
      const inc=Math.floor(bps()*whole);
      if(inc>0){ S.bytes+=inc; S.total+=inc; }
      drawHeader();
    }

    // Auto-clicks (convert to clicks using current clickPower)
    if (S.autoPerSec>0 && autoAcc >= 0.05) {
      // process in small chunks for smoother gain
      const chunk = Math.min(autoAcc, 0.5);
      const clicks = S.autoPerSec * chunk;
      const add = Math.floor(clickPower() * clicks);
      if (add>0){ S.bytes+=add; S.total+=add; }
      autoAcc -= chunk;
    }

    requestAnimationFrame(loop);
  }

  // Qty controls
  function setQty(q){S.buyQty=q;refreshQtyTabs();if(views.shop.classList.contains('active'))drawStore()}
  function refreshQtyTabs(){qtyBtns.forEach(btn=>{if(!btn)return;const active=S.buyQty===btn.dataset.q;btn.classList.toggle('active',active);btn.style.background=active?'var(--accent)':'#0b1220';btn.style.color=active?'#001018':'#cbd5e1';btn.style.boxShadow=active?'0 6px 18px #22d3ee55':'none'})}
  qtyBtns.forEach(btn=>btn.addEventListener('click',()=>setQty(btn.dataset.q),{passive:true}));

  // Settings
  function openSettings(){settingsOverlay.classList.remove('hidden');settingsOverlay.setAttribute('aria-hidden','false');setMute.checked=!!S.settings.muted;setFX.checked=!!S.settings.reduceFx;setCap.checked=!!S.settings.capOffline}
  function closeSettings(){settingsOverlay.classList.add('hidden');settingsOverlay.setAttribute('aria-hidden','true')}
  settingsBtn.addEventListener('click',e=>{e.stopPropagation();openSettings()},{passive:true});
  settingsOverlay.addEventListener('click',e=>{if(e.target===settingsOverlay)closeSettings()},{passive:true});
  settingsPop.addEventListener('click',e=>e.stopPropagation(),{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!settingsOverlay.classList.contains('hidden'))closeSettings()});
  setMute.addEventListener('change',()=>{S.settings.muted=setMute.checked},{passive:true});
  setFX.addEventListener('change',()=>{S.settings.reduceFx=setFX.checked},{passive:true});
  setCap.addEventListener('change',()=>{S.settings.capOffline=setCap.checked},{passive:true});

  // Save/Load
  function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch{} }
  function load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
      const s=JSON.parse(raw);
      S.bytes=+s.bytes||0; S.total=+s.total||0;
      S.baseClick=s.baseClick||1; S.clickMult=s.clickMult||1; S.bpsMult=s.bpsMult||1;
      S.buyQty=['1','10','100','max'].includes(s.buyQty)?s.buyQty:'1';
      S.shopDiscPct = Math.min(0.5, +s.shopDiscPct||0);
      S.autoPerSec  = +s.autoPerSec||0;
      S.critChance  = Math.min(0.5, +s.critChance||0);
      S.settings=Object.assign({muted:false,reduceFx:false,capOffline:true},s.settings||{});
      const counts=Object.fromEntries((s.buildings||[]).map(b=>[b.id,b.count||0]));
      S.buildings=CATALOG.map(def=>{const saved=(s.buildings||[]).find(x=>x.id===def.id);return {...def,count:counts[def.id]||0,unlocked:!!(saved&&saved.unlocked)}});

      // Achievements & reps
      S.achievementsOwned = s.achievementsOwned||{};
      S.repLvls = Object.assign(Object.fromEntries(Object.keys(REP_UPG).map(k=>[k,0])), s.repLvls||{});
      // Re-apply repeatable upgrade effects (so multipliers persist across reload)
      Object.keys(S.repLvls).forEach(k=>applyRepEffect(k, S.repLvls[k]));

      S.meta = Object.assign({lastActive:Date.now(), offlineEarned:0, cores:0, runs:0, bestRunTotal:0, lifetimeTotal:0, goldenHits:0}, s.meta||{});
      S.boost = Object.assign({mult:1, until:0}, s.boost||{});
    }catch(e){console.warn('load failed',e)}
  }

  function saveOnExit(){ S.meta.lastActive=Date.now(); save(); }
  ['pagehide','beforeunload'].forEach(ev=>window.addEventListener(ev,saveOnExit));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) saveOnExit(); });

  if(saveBtn)  saveBtn.addEventListener('click',()=>{ save(); Toast.push('Game saved'); },{passive:true});

  // Offline gain
  function applyOfflineGain(){
    const now=Date.now(), then=S.meta.lastActive||now;
    let secs=Math.max(0,(now-then)/1000);
    if(S.settings.capOffline) secs=Math.min(secs,MAX_OFFLINE_HOURS*3600);
    const earn=Math.floor(bps()*secs); // use current mult; this is generous/friendly
    if(earn>0){ S.bytes+=earn; S.total+=earn; S.meta.offlineEarned+=earn; Toast.push(`+${fmt(earn)} Bytes while you were away`) }
  }

  // PWA install
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(installBtn)installBtn.style.display='';});
  if(installBtn){installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.style.display='none';},{passive:true});}

  // Boot
  load();
  applyOfflineGain();
  // ensure only Compile is visible at start
  Object.entries(views).forEach(([k,el])=>{const act=k==='compile';el.classList.toggle('active',act);el.setAttribute('aria-hidden',act?'false':'true')});
  stickyBar.classList.add('hidden');
  drawAll();
  requestAnimationFrame(loop);
  scheduleOrb(); // start golden event cycle
})();
