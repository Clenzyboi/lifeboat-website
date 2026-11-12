// js/learn.js — "Crew briefing": 10 hands-on mini lessons, one for every quiz topic.
// Load LAST (after equipment.js). Adds a "Learn" tab. Progress is saved in the browser.
(function () {
'use strict';
const KEY = 'solasLearned';
let done = []; try { done = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };
const $ = id => document.getElementById(id);
const slider = (id, min, max, val) => `<input type="range" id="${id}" min="${min}" max="${max}" value="${val}">`;

// Each lesson: demo() returns HTML, init(root, ok) wires it up. Call ok() once the learner has tried it.
const T = [
 { id: 'speed', icon: '⏱️', title: 'Lowering speed',
   fact: 'The maximum lowering speed is S = 0.4 + 0.02 × H, where H is the height from the davit head to the waterline in metres. The higher the drop, the faster the boat may descend.',
   demo: () => `<div class="ln-big" id="o"></div>${slider('r', 5, 30, 12)}<small>Drag to change the height H (metres)</small>`,
   init(r, ok) { const s = r.querySelector('#r'), o = r.querySelector('#o'); const u = () => o.innerHTML = `S = 0.4 + 0.02 × ${s.value}<br><strong>${(0.4 + 0.02 * s.value).toFixed(2)} m/s</strong>`; s.oninput = () => { u(); ok(); }; u(); } },
 { id: 'falls', icon: '🪢', title: 'Wire falls',
   fact: 'Falls are turned end-for-end at intervals of no more than 30 months, and renewed every 5 years.',
   demo: () => `<div class="ln-big" id="o"></div>${slider('r', 0, 66, 6)}<small>Drag to move through the falls\' time in service (months)</small>`,
   init(r, ok) { const s = r.querySelector('#r'), o = r.querySelector('#o'); const u = () => { const m = +s.value; o.className = 'ln-big ' + (m >= 60 ? 'bad' : m >= 30 ? 'warn' : 'good');
       o.innerHTML = `${m} months<br><strong>${m >= 60 ? 'Renew the falls' : m >= 30 ? 'Turn end-for-end' : 'In service'}</strong>`; }; s.oninput = () => { u(); ok(); }; u(); } },
 { id: 'tilt', icon: '📐', title: 'List and trim',
   fact: 'Launching appliances must work with the ship listed up to 20° and trimmed up to 10°. Test the gear in those conditions, not only on a level deck.',
   demo: () => `<div class="ln-two"><div><svg viewBox="0 0 160 110"><g id="a"><path d="M25 62 H135 L120 90 H40Z" fill="#16284a"/><rect x="78" y="38" width="30" height="24" fill="#e8eef4"/></g><path d="M0 80 q20 -8 40 0 t40 0 t40 0 t40 0 V110 H0Z" fill="#0f5f7a" opacity=".85"/></svg><b id="la"></b>${slider('l', 0, 30, 8)}<small>List</small></div>
     <div><svg viewBox="0 0 160 110"><g id="b"><path d="M20 62 H140 L128 90 H34Z" fill="#16284a"/><rect x="30" y="42" width="30" height="20" fill="#e8eef4"/></g><path d="M0 80 q20 -8 40 0 t40 0 t40 0 t40 0 V110 H0Z" fill="#0f5f7a" opacity=".85"/></svg><b id="tr"></b>${slider('t', 0, 20, 4)}<small>Trim</small></div></div>`,
   init(r, ok) { const set = (sl, g, lab, lim, unit) => { const v = +sl.value; g.setAttribute('transform', `rotate(${unit === 'l' ? v : -v} 80 76)`); lab.textContent = `${v}° ` + (v <= lim ? '✓ within limit' : '✕ over the limit'); lab.className = v <= lim ? 'good' : 'bad'; };
     const l = r.querySelector('#l'), t = r.querySelector('#t'); const u = () => { set(l, r.querySelector('#a'), r.querySelector('#la'), 20, 'l'); set(t, r.querySelector('#b'), r.querySelector('#tr'), 10, 't'); };
     l.oninput = t.oninput = () => { u(); ok(); }; u(); } },
 { id: 'brake', icon: '⚙️', title: 'Centrifugal brake',
   fact: 'The centrifugal brake uses friction shoes that swing outward as the drum spins faster. They press on the drum and hold the lowering speed down.',
   demo: () => `<svg viewBox="0 0 200 130"><circle cx="100" cy="65" r="52" fill="none" stroke="#9aa6b2" stroke-width="6"/><g id="g"><circle cx="100" cy="65" r="12" fill="#cfd8e0"/></g></svg>${slider('r', 0, 100, 20)}<small>Drag to spin the winch faster</small>`,
   init(r, ok) { const s = r.querySelector('#r'), g = r.querySelector('#g'); const u = () => { const k = +s.value / 100, d = 18 + k * 22; g.innerHTML = '<circle cx="100" cy="65" r="12" fill="#cfd8e0"/>' + [0, 120, 240].map(a => `<rect x="${100 + d - 8}" y="59" width="16" height="12" rx="3" fill="${k > .6 ? '#ff453a' : '#ff9f0a'}" transform="rotate(${a} 100 65)"/>`).join('');
       g.style.transformOrigin = '100px 65px'; }; s.oninput = () => { u(); ok(); }; u(); } },
 { id: 'hooks', icon: '🪝', title: 'Hydrostatic interlock',
   fact: 'The release hooks only open when the boat is fully waterborne. Water pressure on the hull unlocks the interlock, so the boat cannot drop from the davit by accident.',
   demo: () => `<div class="ln-sea"><div class="ln-boat" id="bt">🛟</div></div><div class="ln-big" id="o"></div><div class="ln-btns"><button id="up">Boat in the air</button><button id="dn">Boat waterborne</button></div>`,
   init(r, ok) { const b = r.querySelector('#bt'), o = r.querySelector('#o'); const air = () => { b.style.top = '8%'; o.className = 'ln-big bad'; o.innerHTML = '<strong>Hooks LOCKED</strong><br>Interlock blocks release'; };
     const wet = () => { b.style.top = '56%'; o.className = 'ln-big good'; o.innerHTML = '<strong>Hooks FREE</strong><br>Water pressure unlocked them'; ok(); };
     r.querySelector('#up').onclick = air; r.querySelector('#dn').onclick = wet; air(); } },
 { id: 'fuel', icon: '⛽', title: 'Fuel and range',
   fact: 'A lifeboat carries fuel for at least 24 hours at 6 knots. That is a range of 144 nautical miles.',
   demo: () => `<div class="ln-big" id="o"></div><div class="ln-meter"><i id="m"></i></div>${slider('r', 1, 24, 6)}<small>Drag to add hours of running at 6 knots</small>`,
   init(r, ok) { const s = r.querySelector('#r'), o = r.querySelector('#o'), m = r.querySelector('#m'); const u = () => { const h = +s.value; m.style.width = h / 24 * 100 + '%'; o.className = 'ln-big ' + (h >= 24 ? 'good' : '');
       o.innerHTML = `${h} h × 6 knots<br><strong>${h * 6} nautical miles</strong>${h >= 24 ? '<br>SOLAS minimum reached' : ''}`; }; s.oninput = () => { u(); ok(); }; u(); } },
 { id: 'flares', icon: '🚀', title: 'Rocket flares',
   fact: 'The emergency kit holds a minimum of 4 rocket parachute flares. Fire them one at a time, only when you can see a ship or aircraft.',
   demo: () => `<div class="ln-flares">${[1, 2, 3, 4].map(i => `<button class="fl" data-i="${i}">🚀<span>${i}</span></button>`).join('')}</div><div class="ln-big" id="o"></div><div class="ln-btns"><button id="re">Reload</button></div>`,
   init(r, ok) { const o = r.querySelector('#o'); const u = () => { const n = r.querySelectorAll('.fl:not(.fired)').length; o.innerHTML = `<strong>${n} of 4</strong> flares left`; if (!n) ok(); };
     r.querySelectorAll('.fl').forEach(b => b.onclick = () => { b.classList.add('fired'); u(); }); r.querySelector('#re').onclick = () => { r.querySelectorAll('.fl').forEach(b => b.classList.remove('fired')); u(); }; u(); } },
 { id: 'colour', icon: '🟠', title: 'Boat colour',
   fact: 'Lifeboats are painted a highly visible International Orange. It stands out against the sea from the air and from other vessels.',
   demo: () => `<div class="ln-sea"><div class="ln-hull" id="h"></div></div><div class="ln-big" id="o"></div><div class="ln-btns">${[['Dark blue', '#1d3a8a', 8], ['White', '#f2f2f2', 35], ['Signal yellow', '#f6d21d', 70], ['International Orange', '#ff5a1f', 95]].map(c => `<button data-c="${c[1]}" data-v="${c[2]}" data-n="${c[0]}">${c[0]}</button>`).join('')}</div>`,
   init(r, ok) { const h = r.querySelector('#h'), o = r.querySelector('#o'); const pick = b => { h.style.background = b.dataset.c; o.className = 'ln-big ' + (+b.dataset.v > 90 ? 'good' : +b.dataset.v > 50 ? 'warn' : 'bad'); o.innerHTML = `${b.dataset.n}<br><strong>Visibility ${b.dataset.v}%</strong>`; if (+b.dataset.v > 90) ok(); };
     r.querySelectorAll('[data-c]').forEach(b => b.onclick = () => pick(b)); pick(r.querySelector('[data-c]')); } },
 { id: 'drills', icon: '📅', title: 'Drills',
   fact: 'A full lifeboat launch drill must be carried out at least once every month. Practice keeps the crew fast and the gear working.',
   demo: () => `<div class="ln-months">${'JFMAMJJASOND'.split('').map(m => `<span>${m}</span>`).join('')}</div><div class="ln-big" id="o"></div><div class="ln-btns"><button id="go">Run a drill</button><button id="re">Start the year again</button></div>`,
   init(r, ok) { const ms = r.querySelectorAll('.ln-months span'), o = r.querySelector('#o'); let n = 0; const u = () => { ms.forEach((m, i) => m.classList.toggle('on', i < n)); o.innerHTML = n ? `<strong>${n} drill${n > 1 ? 's' : ''}</strong> this year${n >= 12 ? '<br>One every month. That is the rule.' : ''}` : 'No drills yet'; if (n >= 2) ok(); };
     r.querySelector('#go').onclick = () => { n = Math.min(12, n + 1); u(); }; r.querySelector('#re').onclick = () => { n = 0; u(); }; u(); } },
 { id: 'tape', icon: '🔦', title: 'Reflective tape',
   fact: 'Retroreflective tape on the canopy bounces searchlight beams back toward rescue vessels and aircraft, so the boat shows up at night.',
   demo: () => `<div class="ln-dark" id="bx"><div class="ln-canopy"><i class="tp"></i><i class="tp"></i><i class="tp"></i></div></div><div class="ln-big" id="o">Move your pointer over the boat</div>`,
   init(r, ok) { const bx = r.querySelector('#bx'), tp = r.querySelectorAll('.tp'), o = r.querySelector('#o');
     bx.onpointermove = e => { const b = bx.getBoundingClientRect(); bx.style.setProperty('--x', e.clientX - b.left + 'px'); bx.style.setProperty('--y', e.clientY - b.top + 'px'); let any = false;
       tp.forEach(t => { const q = t.getBoundingClientRect(), lit = Math.hypot(e.clientX - (q.left + q.width / 2), e.clientY - (q.top + q.height / 2)) < 90; t.classList.toggle('lit', lit); any = any || lit; });
       o.innerHTML = any ? '<strong>The tape glows</strong>It reflects your light back' : 'Keep looking. The tape is hard to see without a light.'; if (any) ok(); }; } }
];

// ---------------- styles ----------------
const css = document.createElement('style');
css.textContent = `
.mode-selector .mode-btn{font-size:10px;padding:7px 0}
.ln-overlay{z-index:530;--t:#fff;--t2:rgba(235,235,245,.65);--f:rgba(255,255,255,.09);--f2:rgba(255,255,255,.17);--blue:#0a84ff;--green:#30d158;--red:#ff453a;--orange:#ff9f0a}
.ln-card{width:100%;max-width:980px;height:min(92vh,740px);display:flex;flex-direction:column;gap:14px;padding:26px 28px 20px;border-radius:32px;background:rgba(36,36,38,.9);border:.5px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.5);color:#fff;overflow:hidden}
.ln-head{display:flex;justify-content:space-between;gap:12px}.ln-head h2{font-size:26px;letter-spacing:-.025em}.ln-head p{font-size:14px;color:var(--t2);margin-top:2px}
.ln-x,.ln-quiz,.ln-btns button,.ln-nav button{border:0;border-radius:99px;padding:10px 18px;background:var(--f2);color:#fff;font-weight:600;font-size:14px;cursor:pointer}
.ln-x{align-self:flex-start}.ln-quiz{background:var(--blue);padding:13px 24px;font-size:15px}.ln-quiz.ready{background:var(--green)}
.ln-bar{height:8px;border-radius:4px;background:var(--f);overflow:hidden}.ln-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--blue),var(--green));border-radius:4px;transition:width .5s}
.ln-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;align-content:start}
.ln-tile{position:relative;display:flex;flex-direction:column;gap:6px;text-align:left;border:0;border-radius:22px;padding:16px;background:var(--f);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:transform .25s,background .2s}
.ln-tile:hover{background:var(--f2);transform:translateY(-3px)}.ln-tile em{font-style:normal;font-size:30px}.ln-tile small{font-size:12px;font-weight:500;color:var(--t2)}
.ln-tile.done::after{content:"✓";position:absolute;top:12px;right:12px;width:24px;height:24px;border-radius:50%;background:var(--green);display:grid;place-items:center;font-size:13px}
#ln-topic{flex:1;min-height:0;display:none;flex-direction:column;gap:12px;overflow-y:auto}
.ln-back{align-self:flex-start;border:0;background:none;color:var(--blue);font-size:15px;font-weight:600;cursor:pointer}
.ln-demo{border-radius:26px;padding:22px;background:linear-gradient(160deg,#1c2a3f,#14202f);display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center}
.ln-demo input[type=range]{width:min(420px,100%);accent-color:var(--blue)}.ln-demo small{color:var(--t2);font-size:12.5px}.ln-demo svg{width:min(260px,100%)}
.ln-big{font-size:17px;line-height:1.4;min-height:3em}.ln-big strong{font-size:26px}.good{color:var(--green)}.warn{color:var(--orange)}.bad{color:var(--red)}
.ln-two{display:flex;gap:18px;flex-wrap:wrap;justify-content:center}.ln-two>div{display:flex;flex-direction:column;gap:6px;align-items:center;width:230px}
.ln-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.ln-btns button{background:var(--f2)}.ln-btns button:hover{background:var(--blue)}
.ln-meter{width:min(420px,100%);height:10px;border-radius:5px;background:var(--f)}.ln-meter i{display:block;height:100%;background:var(--orange);border-radius:5px;transition:width .2s}
.ln-sea{position:relative;width:min(380px,100%);height:120px;border-radius:18px;overflow:hidden;background:linear-gradient(#27527a 0 45%,#0f5f7a 45%)}
.ln-boat{position:absolute;left:50%;top:8%;font-size:42px;transform:translateX(-50%);transition:top .8s cubic-bezier(.32,.72,0,1)}
.ln-hull{position:absolute;left:50%;top:48%;width:110px;height:34px;margin-left:-55px;border-radius:6px 6px 40px 40px;transition:background .3s}
.ln-flares{display:flex;gap:14px}.fl{position:relative;border:0;background:var(--f);border-radius:18px;width:62px;height:90px;font-size:30px;cursor:pointer;transition:transform .8s,opacity .8s}.fl span{position:absolute;bottom:6px;left:0;right:0;font-size:12px}
.fl.fired{transform:translateY(-34px);opacity:.25;pointer-events:none}
.ln-months{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;width:min(420px,100%)}.ln-months span{padding:8px 0;border-radius:10px;background:var(--f);font-size:13px;font-weight:700;transition:background .3s}.ln-months span.on{background:var(--green)}
.ln-dark{--x:-200px;--y:-200px;position:relative;width:min(420px,100%);height:150px;border-radius:20px;background:radial-gradient(circle 90px at var(--x) var(--y),rgba(255,255,255,.22),transparent),#05080f;display:grid;place-items:center;cursor:crosshair;touch-action:none}
.ln-canopy{position:relative;display:flex;gap:26px;padding:34px 36px;border-radius:50px 50px 14px 14px;background:#3a1c0e}
.tp{width:18px;height:46px;border-radius:3px;background:#3a3f45;transition:background .15s,box-shadow .15s}.tp.lit{background:#fff;box-shadow:0 0 22px 6px rgba(255,255,255,.8)}
.ln-fact{font-size:15.5px;line-height:1.55}.ln-nav{display:flex;justify-content:space-between;align-items:center;gap:10px}
.ln-chip{font-size:13px;font-weight:600;color:var(--t2)}.ln-chip.ok{color:var(--green)}
.ln-foot{display:flex;justify-content:flex-end}
@media (max-width:640px){.ln-card{height:94vh;padding:18px 16px 14px;border-radius:26px}.ln-head h2{font-size:21px}}`;
document.head.appendChild(css);

// ---------------- overlay ----------------
let ov, cur = 0;
function build() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'quiz-overlay ln-overlay';   // reuses the quiz overlay's blur and click blocking
    ov.style.display = 'none';
    ov.innerHTML = `<div class="ln-card">
        <div class="ln-head"><div><h2>Crew briefing</h2><p id="ln-sub"></p></div><button class="ln-x" onclick="closeLearn()">Done</button></div>
        <div class="ln-bar"><i id="ln-fill"></i></div>
        <div class="ln-grid" id="ln-grid"></div>
        <div id="ln-topic">
            <button class="ln-back" onclick="lnGrid()">‹ All topics</button>
            <h3 id="ln-title" style="font-size:24px;letter-spacing:-.02em"></h3>
            <div class="ln-demo" id="ln-demo"></div>
            <p class="ln-fact" id="ln-fact"></p>
            <div class="ln-nav"><button onclick="lnStep(-1)">‹ Back</button><span class="ln-chip" id="ln-chip"></span><button onclick="lnStep(1)">Next ›</button></div>
        </div>
        <div class="ln-foot"><button class="ln-quiz" id="ln-quiz" onclick="lnQuiz()"></button></div>
    </div>`;
    document.body.appendChild(ov);
}
function progress() {
    const n = done.length, all = n >= T.length;
    $('ln-sub').textContent = all ? 'All topics learned. You are ready for the quiz.' : `Try each lesson to unlock it. ${n} of ${T.length} learned.`;
    $('ln-fill').style.width = n / T.length * 100 + '%';
    const q = $('ln-quiz'); q.textContent = all ? 'You\'re ready. Take the quiz' : 'Take the quiz anyway'; q.classList.toggle('ready', all);
    $('ln-grid').innerHTML = T.map((t, i) => `<button class="ln-tile ${done.includes(t.id) ? 'done' : ''}" onclick="lnOpen(${i})"><em>${t.icon}</em>${t.title}<small>${done.includes(t.id) ? 'Learned' : 'Tap to try it'}</small></button>`).join('');
}
function chip() { const d = done.includes(T[cur].id); const c = $('ln-chip'); c.textContent = d ? '✓ Learned' : 'Try the demo to unlock'; c.className = 'ln-chip' + (d ? ' ok' : ''); }
function ok() {
    const t = T[cur]; if (done.includes(t.id)) return;
    done.push(t.id); save(); chip(); progress();
    if (typeof toast === 'function') toast(done.length >= T.length ? '🎓 Briefing complete. You are ready for the quiz!' : '✓ ' + t.title + ' learned');
}
window.lnOpen = function (i) {
    cur = (i + T.length) % T.length; const t = T[cur];
    $('ln-grid').style.display = 'none'; $('ln-topic').style.display = 'flex';
    $('ln-title').textContent = t.icon + ' ' + t.title; $('ln-fact').textContent = t.fact;
    const d = $('ln-demo'); d.innerHTML = t.demo(); t.init(d, ok); chip();
    if (typeof playSound === 'function') playSound('click');
};
window.lnStep = d => lnOpen(cur + d);
window.lnGrid = function () { $('ln-topic').style.display = 'none'; $('ln-grid').style.display = 'grid'; progress(); };
window.openLearn = function () { build(); ov.style.display = 'flex'; lnGrid(); };
window.closeLearn = function () { if (ov) ov.style.display = 'none'; renderModeUI('explore'); };
window.lnQuiz = function () { if (ov) ov.style.display = 'none'; renderModeUI('quiz'); };
addEventListener('keydown', e => { if (ov && ov.style.display !== 'none' && e.key === 'Escape') ($('ln-topic').style.display === 'flex' ? lnGrid() : closeLearn()); });

// ---------------- tab + hooks ----------------
(function () {
    const sel = document.querySelector('.mode-selector'); if (!sel) return;
    const b = document.createElement('button'); b.className = 'mode-btn'; b.dataset.mode = 'learn'; b.innerHTML = '<i>📖</i>Learn';
    b.addEventListener('click', () => { if (typeof playSound === 'function') playSound('click'); renderModeUI('learn'); });
    sel.insertBefore(b, sel.children[1] || null);   // right after Explore
})();
const _render = renderModeUI;
renderModeUI = function (mode) { _render(mode); if (mode === 'learn') openLearn(); };
let tipped = false;
const _quiz = launchQuizModule;
launchQuizModule = function () {
    _quiz();
    if (!tipped && done.length < T.length) { tipped = true; if (typeof toast === 'function') toast('Tip: the Learn tab shows every answer hands-on.'); }
};
})();