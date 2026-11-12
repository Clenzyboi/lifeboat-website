// js/story.js — replaces the long scroll story. Load LAST (after welcome.js).
//  1) "Watch a launch": a 25-second preview with play / step / scrub controls. The camera tracks the real boat.
//  2) A transition when the simulator starts.
//  3) Learning path on the welcome screen (what is done, what is next).
//  4) "Parts explored" tracker in Explore mode, so learners reach all 20 components.
(function () {
'use strict';
const portal = document.getElementById('portal-landing-page');
const hero = portal && portal.querySelector('.lp-hero');
if (!portal || !hero || !window.WebGLRenderingContext) return;
const $ = id => document.getElementById(id);
const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };

// ==========================================================================
// styles
// ==========================================================================
const st = document.createElement('style');
st.textContent = `
.lp-playing{overflow:hidden!important}
.lp-playing .lp-wrap{opacity:0;pointer-events:none;transition:opacity .4s}
.lp-playing .lp3d-chip{display:none!important}
.lpp[hidden]{display:none}
.lpp{position:fixed;inset:0;z-index:5;pointer-events:none;color:#e8f6f7;font-family:"Barlow",system-ui,sans-serif}
.lpp>*{pointer-events:auto}
.lpp-cap{position:absolute;left:max(24px,4vw);bottom:112px;width:min(430px,calc(100vw - 48px));padding:22px 24px;border-radius:24px;background:rgba(4,16,31,.78);border:1px solid rgba(232,246,247,.14)}
.lpp-cap span{display:inline-flex;gap:8px;align-items:center;font-size:13px;font-weight:700;color:#ffd23f}
.lpp-cap span em{font-style:normal;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:2px solid #ffd23f;font-size:12px}
.lpp-cap h2{margin:10px 0 8px;font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:clamp(30px,4vw,44px);line-height:1;color:#fff}
.lpp-cap p{font-size:16px;line-height:1.5;color:rgba(232,246,247,.85)}
.lpp-cap small{display:block;margin-top:10px;padding:9px 12px;border-radius:12px;background:rgba(255,210,63,.13);font-size:13.5px;line-height:1.4;color:#ffe08a}
.lpp-end{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.lpp-end[hidden]{display:none}.lpp-end .lp-btn{padding:12px 20px;font-size:15px}
.lpp-hud{position:absolute;right:max(24px,4vw);bottom:112px;width:240px;padding:14px 16px;border-radius:20px;background:rgba(4,16,31,.78);border:1px solid rgba(232,246,247,.14);font-size:13px}
.lpp-hud div{display:flex;justify-content:space-between;padding:4px 0}.lpp-hud b{font-variant-numeric:tabular-nums;font-size:15px}
.lpp-hud .g{padding:0;height:6px;border-radius:3px;background:rgba(232,246,247,.15);margin-top:8px;overflow:hidden}.lpp-hud .g i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd23f,#ff6a1f)}
.lpp-bar{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:min(860px,calc(100vw - 32px));display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:99px;background:rgba(4,16,31,.86);border:1px solid rgba(232,246,247,.16)}
.lpp-bar button{flex:none;border:0;cursor:pointer;color:#fff;font:700 13px "Barlow",system-ui,sans-serif}
.lpp-ic{width:40px;height:40px;border-radius:50%;background:#ff6a1f;font-size:14px!important}.lpp-ic.x{background:rgba(232,246,247,.14)}
.lpp-steps{display:flex;gap:4px}.lpp-steps button{padding:8px 12px;border-radius:99px;background:rgba(232,246,247,.1)}.lpp-steps button.on{background:#ffd23f;color:#1b1400}
.lpp-bar input{flex:1;min-width:60px;accent-color:#ffd23f}
.lpp-mark{position:absolute;left:0;top:0;display:none;align-items:center;gap:8px;pointer-events:none}
.lpp-mark i{width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px #ffd23f,0 0 16px 3px rgba(255,210,63,.6);animation:lpm 1.3s ease-out infinite}
.lpp-mark b{margin-top:-30px;padding:5px 11px;border-radius:99px;background:rgba(4,16,31,.85);font-size:12.5px;white-space:nowrap}
@keyframes lpm{50%{transform:scale(1.22)}}
#lp-iris{position:fixed;inset:0;z-index:450;display:none;place-items:center;text-align:center;color:#e8f6f7;background:#04101f;font-family:"Barlow",system-ui,sans-serif;--r:0px;
  -webkit-mask:radial-gradient(circle at 50% 48%,transparent var(--r),#000 calc(var(--r) + 2px));mask:radial-gradient(circle at 50% 48%,transparent var(--r),#000 calc(var(--r) + 2px))}
#lp-iris h2{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:clamp(36px,6vw,64px);line-height:1;margin:10px 0}
#lp-iris p{font-size:17px;color:rgba(232,246,247,.8);max-width:36ch;margin:0 auto}#lp-iris small{font-size:13px;font-weight:700;color:#ffd23f}
.ui-enter .top-bar{animation:uiD .7s cubic-bezier(.32,.72,0,1) both}.ui-enter .right-panel{animation:uiL .8s .1s cubic-bezier(.32,.72,0,1) both}.ui-enter .camera-dock{animation:uiU .7s .2s cubic-bezier(.32,.72,0,1) both}
@keyframes uiD{from{opacity:0;transform:translateY(-30px)}}@keyframes uiL{from{opacity:0;transform:translateX(40px)}}@keyframes uiU{from{opacity:0;transform:translate(-50%,30px)}}
.lp-m.done::before{content:"✓"!important;background:#30d158!important;border-color:#30d158!important;color:#fff!important}
.lp-m.next{background:rgba(255,210,63,.08)}.lp-m.next em{font-weight:700}
.lp-path{margin-top:14px;font-size:14.5px;color:rgba(232,246,247,.85)}.lp-path b{color:#ffd23f}
.pt-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pt-grid button{border:0;border-radius:99px;padding:5px 10px;background:var(--fill);color:var(--text-main);font-size:11.5px;font-weight:600;cursor:pointer}
.pt-grid button.ok{background:color-mix(in srgb,var(--green) 22%,transparent);color:var(--green)}
@media (max-width:860px){.lpp-hud{top:14px;bottom:auto;right:12px;width:190px}.lpp-cap{left:12px;bottom:124px;padding:16px 18px}.lpp-cap p{font-size:14.5px}.lpp-steps button{padding:8px 9px}.lpp-steps button span{display:none}}
@media (prefers-reduced-motion:reduce){.lpp-mark i{animation:none}.ui-enter *{animation:none!important}}`;
document.head.appendChild(st);

// ==========================================================================
// 1) launch preview player
// ==========================================================================
const CH = [
    { k: 'Muster', at: 0.00, part: 'davit', h: 'Muster at the davit.', p: 'Pull the lashing pins, board the crew and dog down every hatch.', f: 'Everyone straps in before anything moves.',
      t: [-0.9, 1.6, 0], o: [6.0, 3.2, 6.5] },
    { k: 'Power', at: 0.20, part: 'engine', h: 'Start the engine first.', p: 'Power must be ready the moment the hull touches the water.', f: 'A SOLAS lifeboat carries fuel for 24 hours at 6 knots.',
      t: [0, 0.5, -1.9], o: [4.6, 1.6, -5.2] },
    { k: 'Lower', at: 0.40, part: 'falls', h: 'Lift the brake. Gravity does the rest.', p: 'The centrifugal brake limits the speed. Let go of the lever and the boat stops.', f: 'Maximum lowering speed: S = 0.4 + 0.02 × H metres per second.',
      t: [0, 0.3, 0], abs: [18.5, 4.8, 8.5] },
    { k: 'Release', at: 0.70, part: 'release_gear', h: 'Waterborne. Now release the hooks.', p: 'The hydrostatic interlock keeps the hooks shut until the boat floats.', f: 'Releasing the hooks too early is a leading cause of lifeboat deaths.',
      t: [0, 1.0, 0.6], o: [5.8, 2.8, 5.4] },
    { k: 'Away', at: 0.85, part: null, h: 'Clear the ship.', p: 'Motor away from the hull and count your crew.', f: 'Now try every step yourself in the simulator.',
      t: [0, 0.4, 0], o: [10, 4.6, 8] }
];
const DUR = 25;   // seconds for the whole preview

const el = document.createElement('div');
el.className = 'lpp'; el.hidden = true;
el.innerHTML = `
    <div class="lpp-mark" id="lpp-mark"><i></i><b></b></div>
    <article class="lpp-cap"><span id="lpp-k"></span><h2 id="lpp-h"></h2><p id="lpp-p"></p><small id="lpp-f"></small>
        <div class="lpp-end" id="lpp-end" hidden><button class="lp-btn pri" id="lpp-try">Try the launch yourself</button><button class="lp-btn sec" id="lpp-re">Replay</button></div></article>
    <aside class="lpp-hud"><div><span>Clearance to sea</span><b id="lh-c">–</b></div><div><span>Lowering speed</span><b id="lh-v">0.00 m/s</b></div>
        <div><span>Winch brake</span><b id="lh-b">Holding</b></div><div><span>Release hooks</span><b id="lh-h">Locked</b></div><div class="g"><i id="lh-g"></i></div></aside>
    <div class="lpp-bar"><button class="lpp-ic" id="lpp-play" aria-label="Pause">❚❚</button>
        <div class="lpp-steps">${CH.map((c, i) => `<button data-i="${i}">${i + 1}<span> ${c.k}</span></button>`).join('')}</div>
        <input type="range" id="lpp-s" min="0" max="1000" value="0" aria-label="Launch timeline"><button class="lpp-ic x" id="lpp-x" aria-label="Close preview">✕</button></div>`;
portal.appendChild(el);
const cta = hero.querySelector('.lp-cta');
if (cta) cta.insertAdjacentHTML('beforeend', '<button class="lp-btn sec" id="lp-watch">▶ Watch a launch</button>');
document.querySelectorAll('.lp-hint').forEach(n => { n.textContent = 'Watch a 25-second launch, or tap a glowing dot on the boat to explore that part.'; });

const P = { on: false, p: 0, play: false, own: false, drag: false, idx: -1, splashed: false };
const HOME = { x: BOAT_CONFIG.waterborne.x, z: BOAT_CONFIG.waterborne.z };
const cam = new THREE.Vector3(), tgt = new THREE.Vector3(), wantC = new THREE.Vector3(), wantT = new THREE.Vector3(), tv = new THREE.Vector3();
let lastT = performance.now(), lastY = null, speed = 0;

const isOpen = () => portal.style.display !== 'none' && !portal.classList.contains('hidden-portal');
const ready = () => typeof camera !== 'undefined' && camera && typeof boatModel !== 'undefined' && boatModel && typeof shipGroup !== 'undefined' && shipGroup;
const pristine = () => !isLowering && !isWaterborne && !AppState.hooksReleased && (typeof LS === 'undefined' || (LS.step === 0 && !LS.done));
const chapter = p => { let i = 0; CH.forEach((c, k) => { if (p >= c.at) i = k; }); return i; };

function release() {   // hand the boat back exactly as it was
    if (!P.own) return;
    P.own = false; P.splashed = false;
    isWaterborne = false; AppState.hooksReleased = false; hookRetractProgress = 0; AppState.engineStarted = false; launchVelocity = 0;
    Object.assign(boatPos, BOAT_CONFIG.stowed);
    BOAT_CONFIG.waterborne.x = HOME.x; BOAT_CONFIG.waterborne.z = HOME.z;
}
function openPlayer() {
    if (!ready()) return;
    if (!pristine()) { if (!confirm('A launch is in progress in the simulator. Reset it to watch the preview?')) return; resetSimulationState(); }
    Object.assign(P, { on: true, p: 0, play: true, own: true, idx: -1, splashed: false });
    cam.copy(camera.position); tgt.copy(controls.target); lastY = null;
    portal.scrollTop = 0; portal.classList.add('lp-playing'); el.hidden = false; $('lpp-end').hidden = true; setPlay(true);
}
function closePlayer() { P.on = false; release(); portal.classList.remove('lp-playing'); el.hidden = true; }
function setPlay(v) { P.play = v; const b = $('lpp-play'); b.textContent = v ? '❚❚' : '▶'; b.setAttribute('aria-label', v ? 'Pause' : 'Play'); }
function seek(p, play) { P.p = Math.min(1, Math.max(0, p)); $('lpp-end').hidden = P.p < 1; if (play != null) setPlay(play); }

$('lp-watch').onclick = openPlayer;
$('lpp-x').onclick = closePlayer;
$('lpp-play').onclick = () => { if (P.p >= 1) seek(0, true); else setPlay(!P.play); };
$('lpp-re').onclick = () => seek(0, true);
$('lpp-try').onclick = () => { closePlayer(); launchModule('launch'); };
el.querySelectorAll('.lpp-steps button').forEach(b => b.onclick = () => seek(CH[+b.dataset.i].at + 0.001, true));
const sl = $('lpp-s');
sl.addEventListener('pointerdown', () => { P.drag = true; setPlay(false); });
sl.addEventListener('input', () => seek(sl.value / 1000));
addEventListener('pointerup', () => { P.drag = false; });
addEventListener('keydown', e => {
    if (!P.on) return;
    if (e.key === 'Escape') closePlayer();
    else if (e.key === ' ') { e.preventDefault(); $('lpp-play').click(); }
    else if (e.key === 'ArrowRight') seek(CH[Math.min(CH.length - 1, chapter(P.p) + 1)].at + 0.001, true);
    else if (e.key === 'ArrowLeft') seek(CH[Math.max(0, chapter(P.p) - 1)].at + 0.001, true);
});

function driveBoat(p) {
    const S = BOAT_CONFIG.stowed, W = BOAT_CONFIG.waterborne, d = sm((p - 0.42) / 0.26), away = sm((p - 0.86) / 0.14);
    AppState.engineStarted = p >= 0.3;
    const rel = p >= 0.76;
    if (rel !== AppState.hooksReleased) { AppState.hooksReleased = rel; if (!rel) hookRetractProgress = 0; }
    if (d >= 1) {
        // afloat: the simulator's own "waterborne" mode keeps the boat riding on the sea surface, in world space
        if (!isWaterborne) { isWaterborne = true; impactBuoyancyVel = 0; if (!P.splashed) { P.splashed = true; triggerSplashEffect(new THREE.Vector3(HOME.x, -0.7, HOME.z)); } }
        W.x = HOME.x + away * 6; W.z = HOME.z + away * 9;
    } else {
        if (isWaterborne) isWaterborne = false;
        if (d < 0.9) P.splashed = false;
        W.x = HOME.x; W.z = HOME.z;
        const x = lerp(S.x, HOME.x, d); let y = lerp(S.y, W.y, d);
        // the hanging boat moves with the rolling ship, so never let it dip below its floating level
        tv.set(x, y, S.z).applyMatrix4(shipGroup.matrixWorld);
        const floor = W.y + 0.08; if (tv.y < floor) y += floor - tv.y;
        boatPos.x = x; boatPos.y = y; boatPos.z = S.z;
    }
    return { d, rel };
}

function frame(dt) {
    if (P.play) { P.p += dt / DUR; if (P.p >= 1) { P.p = 1; setPlay(false); $('lpp-end').hidden = false; } }
    if (!P.drag) sl.value = Math.round(P.p * 1000);
    const { d, rel } = driveBoat(P.p), i = chapter(P.p), c = CH[i];
    if (i !== P.idx) {
        P.idx = i;
        $('lpp-k').innerHTML = `<em>${i + 1}</em>${c.k}`; $('lpp-h').textContent = c.h; $('lpp-p').textContent = c.p; $('lpp-f').textContent = c.f;
        el.querySelectorAll('.lpp-steps button').forEach((b, k) => b.classList.toggle('on', k === i));
    }
    // camera: always built from the boat's real position, so it cannot look at the wrong place
    const bp = boatModel.position, n = CH[Math.min(CH.length - 1, i + 1)], b = i < CH.length - 1 ? sm((P.p - (n.at - 0.03)) / 0.06) : 0;
    const want = (ch, out, key) => key === 't' ? out.set(bp.x + ch.t[0], bp.y + ch.t[1], bp.z + ch.t[2]) : ch.abs ? out.set(ch.abs[0], ch.abs[1], ch.abs[2]) : out.set(bp.x + ch.o[0], bp.y + ch.o[1], bp.z + ch.o[2]);
    want(c, wantT, 't'); want(n, tv, 't'); wantT.lerp(tv, b);
    want(c, wantC, 'o'); want(n, tv, 'o'); wantC.lerp(tv, b);
    wantC.y = Math.max(1.0, wantC.y); wantC.x = Math.max(8, wantC.x);        // stay above the sea and outboard of the hull
    const a = 1 - Math.exp(-dt * 3.2);
    cam.lerp(wantC, a); tgt.lerp(wantT, a);
    camera.position.copy(cam); controls.target.copy(tgt); camera.lookAt(tgt);
    // readout from the real position
    const clear = Math.max(0, bp.y + 0.7 - 0.0), now = performance.now();
    if (lastY != null && dt > 0) speed = lerp(speed, Math.max(0, (lastY - bp.y) / dt), 0.2); lastY = bp.y;
    $('lh-c').textContent = (d >= 1 ? 0 : clear).toFixed(1) + ' m';
    $('lh-v').textContent = (d > 0 && d < 1 && P.play ? Math.min(speed, 1.4) : 0).toFixed(2) + ' m/s';
    $('lh-b').textContent = d > 0 && d < 1 ? 'Released' : d >= 1 ? 'Off (afloat)' : 'Holding';
    $('lh-h').textContent = rel ? 'Released' : d >= 1 ? 'Unlocked' : 'Locked';
    $('lh-g').style.width = (d * 100).toFixed(1) + '%';
    // ring on the part this step is about
    const mk = $('lpp-mark'); let shown = false;
    if (c.part && typeof lab !== 'undefined') {
        if (lab.items.length < LABELS.length) buildLabels();
        const it = lab.items.find(x => x.d.id === c.part);
        if (it) { it.anchor.getWorldPosition(tv); tv.project(camera); if (tv.z < 1) { shown = true; mk.style.transform = `translate(${(tv.x + 1) / 2 * innerWidth}px,${(1 - tv.y) / 2 * innerHeight}px)`; mk.lastElementChild.textContent = it.d.name; } }
    }
    mk.style.display = shown ? 'flex' : 'none';
}

// ==========================================================================
// 2) transition into the simulator
// ==========================================================================
const iris = document.createElement('div'); iris.id = 'lp-iris'; document.body.appendChild(iris);
const INTRO = {
    explore: ['Explore the lifeboat', 'Tap any part to see what it does and why it matters.'],
    inspection: ['Walkaround checklist', 'Check every zone before the boat is lowered.'],
    launch: ['Launch procedure', 'Six steps, in order. Nothing moves until the earlier steps are done.'],
    emergency: ['Crisis drills', 'Choose the safe response, then read why.'],
    quiz: ['Quiz', 'Show what you know.'], identify: ['Quiz', 'Show what you know.'],
    learn: ['Crew briefing', 'Ten short lessons you can try with your hands.'],
    inside: ['Inside the lifeboat', 'Pick up each piece of equipment and turn it around.']
};
function playIris() {
    const m = INTRO[AppState.currentMode] || INTRO.explore, V = VESSEL_CONFIG;
    iris.innerHTML = `<div><small>${V.name} · Lifeboat ${V.lifeboatNo || 'No. 1'}</small><h2>${m[0]}</h2><p>${m[1]}</p></div>`;
    iris.style.setProperty('--r', '0px'); iris.style.display = 'grid';
    document.body.classList.add('ui-enter'); setTimeout(() => document.body.classList.remove('ui-enter'), 1600);
    const hold = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 800, t0 = performance.now() + hold, R = Math.hypot(innerWidth, innerHeight);
    (function step(now) {
        const k = Math.min(1, Math.max(0, (now - t0) / 900)), e = k * k * (3 - 2 * k);
        iris.style.setProperty('--r', (e * R).toFixed(0) + 'px');
        if (k < 1) requestAnimationFrame(step); else iris.style.display = 'none';
    })(performance.now());
}

// ==========================================================================
// 3) learning path on the welcome screen
// ==========================================================================
const NAMES = { learn: 'Learn', explore: 'Explore', inspection: 'Checklist', launch: 'Launch', emergency: 'Crisis', quiz: 'Quiz' };
function progress() {
    const learned = store('solasLearned', '[]').length, parts = store('solasParts', '[]').length, rows = store('solasSessions', '[]');
    const any = (k, f) => rows.some(r => r[k] && f(String(r[k])));
    const best = k => rows.map(r => String(r[k] || '')).filter(s => /^\d+\/\d+/.test(s)).sort((a, b) => parseInt(b) - parseInt(a))[0];
    const ck = any('checklist', s => /signed/.test(s) || /^(\d+)\/\1/.test(s)), la = any('launch', s => /^done/.test(s)), cr = best('crisis'), qz = best('quiz') || best('identify');
    return [
        { m: 'learn', done: learned >= 10, txt: `${learned} of 10 lessons` },
        { m: 'explore', done: parts >= 20, txt: `${parts} of 20 parts` },
        { m: 'inspection', done: ck, txt: ck ? 'Signed off' : '12 checks' },
        { m: 'launch', done: la, txt: la ? 'Completed' : '6 steps' },
        { m: 'emergency', done: !!cr, txt: cr ? 'Score ' + cr : '5 scenarios' },
        { m: 'quiz', done: !!qz, txt: qz ? 'Best ' + qz : '2 quizzes' }
    ];
}
function paintPath() {
    const route = portal.querySelector('.lp-route'); if (!route) return;
    const pr = progress(), next = pr.find(x => !x.done), started = pr.some(x => x.done) || store('solasLearned', '[]').length || store('solasParts', '[]').length;
    const li = m => [...route.children].find(l => (l.querySelector('.lp-m')?.getAttribute('onclick') || '').includes("'" + m + "'"));
    pr.slice().reverse().forEach(x => { const l = li(x.m); if (l) route.prepend(l); });   // show the path in teaching order
    pr.forEach(x => {
        const l = li(x.m); if (!l) return; const b = l.querySelector('.lp-m'), em = b.querySelector('em');
        b.classList.toggle('done', x.done); b.classList.toggle('next', next === x);
        if (em) em.textContent = (next === x ? 'Next up · ' : '') + x.txt;
    });
    let line = hero.querySelector('.lp-path');
    if (!line) { line = document.createElement('p'); line.className = 'lp-path'; (hero.querySelector('.lp-hint') || cta).insertAdjacentElement('afterend', line); }
    const n = pr.filter(x => x.done).length;
    line.innerHTML = started ? `Your training: <b>${n} of ${pr.length}</b> steps done.` + (next ? ` Next: <a style="color:#ffd23f;text-decoration:underline;cursor:pointer" onclick="launchModule('${next.m}')">${NAMES[next.m]}</a>.` : ' All done. Well sailed.')
                             : 'New here? Start with <a style="color:#ffd23f;text-decoration:underline;cursor:pointer" onclick="launchModule(\'learn\')">Learn</a>, then explore the boat.';
    const main = hero.querySelector('.lp-btn.pri');
    if (main && started && next) { main.textContent = 'Continue: ' + NAMES[next.m]; main.setAttribute('onclick', `launchModule('${next.m}')`); }
}
paintPath();

// ==========================================================================
// 4) "Parts explored" tracker in Explore mode
// ==========================================================================
const ALIAS = { 'On/Off-Load Release Hook': 'release_gear', 'Ducted Marine Propeller': 'engine', 'Buoyant Exterior Lifeline': 'grab_lines', 'Watertight Boarding Hatches': 'entry_hatch',
    'Inspection & Access Hatch': 'entry_hatch', 'Deluge Water Spray System': 'sprinkler', 'Self-Righting FRP Composite Hull Body': 'hull', 'Reinforced Gunwale': 'hull' };
let seen = store('solasParts', '[]');
function tracker() {
    const short = id => (typeof LABELS !== 'undefined' && (LABELS.find(l => l.id === id) || {}).name) || id;
    return `<div class="ui-card" id="pt-card"><h3>Parts explored · ${seen.length} of ${LIFEBOAT_COMPONENTS.length}</h3><div class="bar"><i style="width:${seen.length / LIFEBOAT_COMPONENTS.length * 100}%"></i></div>
        <p class="muted" style="margin:0">Tap a name to fly to that part.</p>
        <div class="pt-grid">${LIFEBOAT_COMPONENTS.map(c => `<button class="${seen.includes(c.id) ? 'ok' : ''}" onclick="partGo('${c.id}')">${seen.includes(c.id) ? '✓ ' : ''}${short(c.id)}</button>`).join('')}</div></div>`;
}
window.partGo = function (id) { if (typeof buildLabels !== 'function') return; buildLabels(); const d = LABELS.find(l => l.id === id); if (d && d.built) selectLabel(d); };
const _rm = renderModeUI;
renderModeUI = function (mode) {
    _rm(mode);
    if (mode === 'explore') { const a = $('mode-interactive-area'); if (a && !$('pt-card')) a.insertAdjacentHTML('beforeend', tracker()); }
};
const _log = logInstructorEvent;
logInstructorEvent = function (msg) {
    _log(msg);
    const m = /^Inspected: (.+)$/.exec(msg); if (!m) return;
    const c = LIFEBOAT_COMPONENTS.find(x => x.name === m[1]), id = c ? c.id : ALIAS[m[1]];
    if (!id || seen.includes(id)) return;
    seen.push(id); try { localStorage.setItem('solasParts', JSON.stringify(seen)); } catch (e) {}
    const card = $('pt-card'); if (card) card.outerHTML = tracker();
    if (seen.length === LIFEBOAT_COMPONENTS.length && typeof toast === 'function') toast('🎉 All 20 parts explored. Try the Checklist next.');
};

// ==========================================================================
// main loop
// ==========================================================================
let was = null, tuned = false;
(function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (!ready()) return;
    if (!tuned && typeof renderer !== 'undefined' && renderer) {   // lighter rendering on phones and small laptops
        tuned = true; if (innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4) renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    }
    const on = isOpen();
    if (was !== null && on !== was) { if (on) paintPath(); else { if (P.on) closePlayer(); playIris(); } }
    was = on;
    if (on && P.on) frame(dt);
})();
})();