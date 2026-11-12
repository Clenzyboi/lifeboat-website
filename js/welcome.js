// js/welcome.js — cinematic welcome screen. The real 3D ship and lifeboat sit in a storm behind the headline:
// a slow push-in camera, branching lightning with late stereo thunder, rain on the lens, a sweeping searchlight,
// film grain and vignette, tappable hotspots and a ship's nameplate. Load LAST (after finish.js).
(function () {
'use strict';
const portal = document.getElementById('portal-landing-page');
if (!portal || !window.WebGLRenderingContext) return;   // no 3D? keep the original welcome screen
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;   // no flashes, rain or shake for these visitors
portal.classList.add('lp3d');
document.body.classList.add('lp-open');

// ---------- styles ----------
const grain = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";
const st = document.createElement('style');
st.textContent = `
#portal-landing-page.lp3d{background:transparent!important;--flash:0}
#portal-landing-page.lp3d #lp-sea{display:none}
#portal-landing-page.lp3d::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(3,10,22,.88) 0%,rgba(3,10,22,.58) 36%,rgba(3,10,22,.05) 68%,rgba(3,10,22,.28) 100%),linear-gradient(0deg,rgba(3,10,22,.78),transparent 32%)}
#portal-landing-page.lp3d::after{content:"";position:fixed;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(ellipse at 62% 46%,transparent 40%,rgba(0,0,0,.6) 100%),linear-gradient(rgba(8,24,48,.3),rgba(8,24,48,.3)),${grain};background-size:auto,auto,160px;opacity:.92}
.lp-fx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
#lp-flash{background:#cfe0ff;opacity:0;mix-blend-mode:screen}
.lp3d .lp-wrap{z-index:3}
.lp3d .lp-hero{grid-template-columns:minmax(0,560px) 1fr;min-height:76vh}
.lp3d .lp-hero h1{text-shadow:0 0 calc(var(--flash) * 46px) rgba(190,215,255,calc(var(--flash) * .85))}
.lp3d .lp-boat{display:none}
.lp3d .lp-stats,.lp3d .lp-sec,.lp3d .lp-foot{background:rgba(4,16,31,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.lp3d .lp-stats{border-radius:26px 26px 0 0;border:0;margin-top:2vh}
.lp3d .lp-foot{border-radius:0 0 26px 26px}
.lp3d .lp-sec{padding-left:34px;padding-right:34px}
.lp-nameplate{justify-self:end;align-self:end;max-width:330px;padding:16px 20px;border-radius:16px;color:#2b2110;
  background:linear-gradient(145deg,#e9d9a8,#c8ad6a 55%,#e2cd92);box-shadow:0 14px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 0 rgba(0,0,0,.18);border:1px solid rgba(70,50,10,.5)}
.lp-nameplate small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.lp-nameplate b{display:block;margin:3px 0 6px;font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:27px;line-height:1.05;letter-spacing:.03em}
.lp-nameplate div{font-size:13.5px;font-weight:600;line-height:1.45}
.lp3d-chip{position:fixed;left:0;top:0;z-index:4;display:none;align-items:center;gap:8px;padding:6px 12px 6px 8px;border-radius:99px;cursor:pointer;color:#fff;font:600 13px "Barlow",system-ui,sans-serif;
  background:rgba(4,16,31,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);transition:background .2s;opacity:0}
.lp3d-chip:hover{background:#ff6a1f}.lp3d-chip i{position:relative;width:12px;height:12px;border-radius:50%;background:#ffd23f}
.lp3d-chip i::after{content:"";position:absolute;inset:0;border-radius:50%;background:#ffd23f;animation:lpc 1.8s ease-out infinite}
@keyframes lpc{to{transform:scale(3.2);opacity:0}}
#lp-mood{display:inline-flex;gap:6px;align-items:center}
.lp-hint{margin-top:16px;font-size:13.5px;color:rgba(232,246,247,.7)}
.lp-open .top-bar,.lp-open .right-panel,.lp-open .camera-dock,.lp-open #label-layer,.lp-open #toast-stack{visibility:hidden}
@media (max-width:860px){.lp3d .lp-hero{grid-template-columns:1fr;min-height:0}.lp-nameplate{justify-self:start;margin-top:22px}.lp3d-chip{display:none!important}
 #portal-landing-page.lp3d::before{background:linear-gradient(0deg,rgba(3,10,22,.92),rgba(3,10,22,.45) 55%,rgba(3,10,22,.55))}}
@media (prefers-reduced-motion:reduce){.lp3d-chip i::after{animation:none}}`;
document.head.appendChild(st);

// ---------- content ----------
const V = (typeof VESSEL_CONFIG !== 'undefined') ? VESSEL_CONFIG : { name: 'Lifeboat', imo: '', callSign: '', capacity: '' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
document.querySelectorAll('.lp-vessel').forEach(n => n.remove());
const plate = document.createElement('aside');
plate.className = 'lp-nameplate';
plate.innerHTML = `<small>Digital twin of</small><b>${esc(V.name)}</b><div>IMO ${esc(V.imo)} · Call sign ${esc(V.callSign)}</div><div>Lifeboat ${esc(V.lifeboatNo || 'No. 1')} · ${esc(V.capacity)} persons</div>`;
const oldBoat = portal.querySelector('.lp-boat');
if (oldBoat) oldBoat.insertAdjacentElement('afterend', plate); else portal.querySelector('.lp-hero')?.appendChild(plate);
const cta = portal.querySelector('.lp-cta');
if (cta) cta.insertAdjacentHTML('afterend', '<p class="lp-hint">Tap a glowing dot on the boat to start exploring that part.</p>');

// effect layers (lightning flash, bolt, rain on the lens)
const mk = (id, tag) => { const c = document.createElement(tag || 'canvas'); c.id = id; c.className = 'lp-fx'; c.style.zIndex = 1; portal.insertBefore(c, portal.firstChild); return c; };
const rainC = mk('lp-rain'), boltC = mk('lp-bolt'), flashD = mk('lp-flash', 'div');
const rx = rainC.getContext('2d'), bx = boltC.getContext('2d');
function fit() { [rainC, boltC].forEach(c => { c.width = innerWidth; c.height = innerHeight; }); }
fit(); addEventListener('resize', fit);

// ---------- weather mood: storm → night → day ----------
const MOODS = [['storm', '⛈️ Storm'], ['night', '🌙 Night'], ['day', '☀️ Day']];
let mood = 'storm', chosen = null, beam = null, spin = null, spot = null;
const links = portal.querySelector('.lp-links');
const btn = document.createElement('button');
btn.id = 'lp-mood'; btn.className = 'lp-btn sec'; btn.style.cssText = 'padding:10px 18px;font-size:15px'; btn.textContent = MOODS[0][1];
if (links) links.insertBefore(btn, links.lastElementChild);
const envBtn = m => [...document.querySelectorAll('.env-btn')].find(b => (b.getAttribute('onclick') || '').includes("'" + m + "'")) || null;
function setMood(m, manual) {
    mood = m; if (manual) chosen = m;
    if (typeof setPortalEnv === 'function') setPortalEnv(m, envBtn(m));
    btn.textContent = MOODS.find(x => x[0] === m)[1];
    if (beam) applyBeam();
}
btn.onclick = () => setMood(MOODS[(MOODS.findIndex(x => x[0] === mood) + 1) % 3][0], true);

// hotspots on the real model
const chips = [['exterior_light', 'Beacon light'], ['release_gear', 'Release hooks'], ['davit', 'Davit arm']].map(s => {
    const b = document.createElement('button');
    b.className = 'lp3d-chip'; b.innerHTML = `<i></i>${s[1]}`; b.setAttribute('aria-label', 'Explore ' + s[1]);
    b.onclick = () => { if (typeof launchModule === 'function') launchModule('explore'); };
    portal.appendChild(b); return { id: s[0], el: b };
});

// ---------- searchlight on the ship's mast (turns like a lighthouse lamp) ----------
function makeBeam() {
    if (beam || typeof shipGroup === 'undefined' || !shipGroup) return;
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 4, 128);
    const geo = new THREE.CylinderGeometry(0.12, 6, 52, 28, 1, true); geo.translate(0, -26, 0); geo.rotateZ(Math.PI / 2);
    const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xcfe6ff, alphaMap: new THREE.CanvasTexture(c), transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    spin = new THREE.Group(); spin.position.set(-2, 26.6, -13.8);
    const tilt = new THREE.Group(); tilt.rotation.z = -0.07; tilt.add(cone);
    spot = new THREE.SpotLight(0xdfeeff, 0, 110, 0.1, 0.85, 1.1);
    const tgt = new THREE.Object3D(); tgt.position.set(50, -3, 0); tilt.add(spot, tgt); spot.target = tgt;
    spin.add(tilt); shipGroup.add(spin); beam = cone; applyBeam();
}
function applyBeam() { const on = mood !== 'day' && portalOpen(); beam.visible = on; spot.intensity = on ? 4.5 : 0; }

// ---------- lightning: branching bolt, flash with decay, late stereo thunder ----------
let actx = null;
const wake = () => { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} };
addEventListener('pointerdown', wake); addEventListener('keydown', wake);
function thunder(pan, delay) {
    if (!actx || actx.state !== 'running' || (typeof AppState !== 'undefined' && AppState.audioMuted)) return;
    const t = actx.currentTime + delay, len = actx.sampleRate * 3.2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    const src = actx.createBufferSource(); src.buffer = buf;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(70, t + 2.6);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    const p = actx.createStereoPanner ? actx.createStereoPanner() : null; if (p) p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(lp); lp.connect(g); if (p) { g.connect(p); p.connect(actx.destination); } else g.connect(actx.destination); src.start(t);
}
let flashT = -1, strikes = [], nextBolt = performance.now() + 3500, baseExp = 1, boosted = false, boltPaths = [];
function jag(x1, y1, x2, y2, off, out) {
    if (off < 3) { out.push([x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - .5) * off, my = (y1 + y2) / 2 + (Math.random() - .5) * off * .35;
    jag(x1, y1, mx, my, off / 2, out); jag(mx, my, x2, y2, off / 2, out);
}
function strike() {
    const W = innerWidth, H = innerHeight, x0 = W * (0.52 + Math.random() * 0.42), x1 = x0 + (Math.random() - .5) * W * .12, y1 = H * (0.34 + Math.random() * 0.14);
    const main = [[x0, 0]]; jag(x0, 0, x1, y1, W * .1, main);
    boltPaths = [{ pts: main, w: 3.2 }];
    for (let i = 0; i < 3; i++) {
        const s = main[(main.length * (0.25 + Math.random() * 0.5)) | 0], dir = Math.random() < .5 ? -1 : 1, br = [s];
        jag(s[0], s[1], s[0] + dir * W * (0.05 + Math.random() * .1), s[1] + H * (0.1 + Math.random() * .12), W * .05, br);
        boltPaths.push({ pts: br, w: 1.5 });
    }
    flashT = performance.now(); strikes = [0, 0.16 + Math.random() * .08];
    thunder((x0 / W) * 2 - 1, 0.35 + Math.random() * 1.6);
}
function flashLevel() {
    if (window.SOLAS_WELCOME.hold != null) return window.SOLAS_WELCOME.hold;
    if (flashT < 0) return 0;
    const t = (performance.now() - flashT) / 1000; let f = 0;
    strikes.forEach((s, i) => { if (t >= s) f += (i ? .7 : 1) * Math.exp(-(t - s) * 9); });
    if (t > 1.4) { flashT = -1; return 0; }
    return Math.min(1, f);
}
window.SOLAS_WELCOME = { hold: null, strike };
function drawBolt(f) {
    bx.clearRect(0, 0, boltC.width, boltC.height);
    if (f < 0.02 || !boltPaths.length) return;
    bx.lineCap = bx.lineJoin = 'round';
    boltPaths.forEach(p => {
        bx.beginPath(); p.pts.forEach((q, i) => i ? bx.lineTo(q[0], q[1]) : bx.moveTo(q[0], q[1]));
        bx.shadowColor = 'rgba(160,200,255,' + f + ')'; bx.shadowBlur = 24;
        bx.strokeStyle = `rgba(200,225,255,${Math.min(1, f * .8)})`; bx.lineWidth = p.w * 2.2; bx.stroke();
        bx.shadowBlur = 0; bx.strokeStyle = `rgba(255,255,255,${Math.min(1, f * 1.1)})`; bx.lineWidth = p.w * .8; bx.stroke();
    });
}

// ---------- rain streaks and running drops on the lens ----------
const streaks = Array.from({ length: innerWidth < 700 ? 90 : 190 }, () => ({ x: Math.random(), y: Math.random(), l: 18 + Math.random() * 42, v: 0.9 + Math.random() * 0.9, a: .1 + Math.random() * .22 }));
let drops = [];
function drawRain(on) {
    rx.clearRect(0, 0, rainC.width, rainC.height);
    if (!on) return;
    const W = rainC.width, H = rainC.height;
    rx.lineWidth = 1;
    streaks.forEach(s => {
        s.y += s.v * 0.035; s.x -= s.v * 0.009; if (s.y > 1.05) { s.y = -.1; s.x = Math.random() * 1.2; }
        const x = s.x * W, y = s.y * H;
        rx.strokeStyle = `rgba(190,212,240,${s.a})`; rx.beginPath(); rx.moveTo(x, y); rx.lineTo(x - s.l * .28, y - s.l); rx.stroke();
    });
    if (drops.length < 12 && Math.random() < 0.06) drops.push({ x: Math.random() * W, y: Math.random() * H * .5, r: 3 + Math.random() * 5, vy: 0, stop: Math.random() * 80 });
    drops = drops.filter(d => d.y < H + 20);
    drops.forEach(d => {
        if (--d.stop < 0) d.vy = Math.min(d.vy + 0.05, 2.2 + d.r * .1);
        d.y += d.vy; d.x += Math.sin(d.y * .05) * .2;
        const g = rx.createRadialGradient(d.x - d.r * .3, d.y - d.r * .3, 0, d.x, d.y, d.r);
        g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(170,200,235,.16)'); g.addColorStop(1, 'rgba(120,160,210,.05)');
        rx.fillStyle = g; rx.beginPath(); rx.ellipse(d.x, d.y, d.r * .8, d.r * 1.15, 0, 0, 6.3); rx.fill();
    });
}

// ---------- camera choreography + main loop ----------
const T0 = { x: 5.2, y: 8.0, z: 0 };
let px = 0, py = 0, was = null, started = false, t0 = performance.now();
addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; });
function portalOpen() { return portal.style.display !== 'none' && !portal.classList.contains('hidden-portal') && getComputedStyle(portal).visibility !== 'hidden'; }
const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const v = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;
function unboost() { if (boosted && typeof renderer !== 'undefined' && renderer) { renderer.toneMappingExposure = baseExp; boosted = false; } }

(function loop() {
    requestAnimationFrame(loop);
    if (typeof camera === 'undefined' || !camera || typeof controls === 'undefined' || !controls || typeof water === 'undefined' || !water) return;
    const on = portalOpen();
    makeBeam();
    if (!started) { started = true; setMood('storm', false); }
    if (was !== null && on !== was) {
        if (on) { setMood(chosen || 'storm', false); t0 = performance.now(); nextBolt = performance.now() + 3000; }
        else {
            controls.enabled = true; unboost(); setMood(chosen || 'day', false);
            if (typeof setCameraPreset === 'function') setCameraPreset('boat');
            chips.forEach(c => { c.el.style.display = 'none'; });
            flashD.style.opacity = 0; bx.clearRect(0, 0, boltC.width, boltC.height); rx.clearRect(0, 0, rainC.width, rainC.height);
        }
        if (beam) applyBeam();
    }
    was = on;
    document.body.classList.toggle('lp-open', on);
    if (!on) return;
    controls.enabled = false;
    const t = (performance.now() - t0) / 1000, k = ease(t / 10);
    const storm = mood === 'storm' && !calm;
    // push-in from a wide establishing shot, then a slow swing; handheld shake in the storm
    const th = 0.95 - 0.45 * k + 0.3 * Math.sin(t * 0.12) * k + px * 0.26;
    const R = 31 - 15 * k, h = 14 - 8 * k + 0.5 * Math.sin(t * 0.09) - py * 1.1, sh = storm ? 1 : 0.25;
    camera.position.set(T0.x + Math.cos(th) * R + (Math.sin(t * 7.3) * .03 + Math.sin(t * 12.1) * .02) * sh, h + (Math.sin(t * 9.1) * .03) * sh, T0.z + Math.sin(th) * R);
    controls.target.set(T0.x, T0.y, T0.z);
    camera.lookAt(T0.x, T0.y, T0.z);
    if (spin) spin.rotation.y = t * 0.63;                                   // 6 RPM, like a lighthouse lamp
    // weather effects
    drawRain(storm);
    if (storm && performance.now() > nextBolt) { strike(); nextBolt = performance.now() + 5500 + Math.random() * 6500; }
    const f = (storm || window.SOLAS_WELCOME.hold != null) ? flashLevel() : 0;
    flashD.style.opacity = (f * 0.42).toFixed(3); portal.style.setProperty('--flash', f.toFixed(3));
    drawBolt(f);
    if (typeof renderer !== 'undefined' && renderer) {
        if (f > 0.001) { if (!boosted) { baseExp = renderer.toneMappingExposure; boosted = true; } renderer.toneMappingExposure = baseExp * (1 + 1.7 * f); }
        else unboost();
    }
    // hotspots follow the model, fading in once the camera has settled
    if (typeof buildLabels === 'function' && typeof lab !== 'undefined') {
        if (lab.items.length < LABELS.length) buildLabels();
        chips.forEach(c => {
            const it = lab.items.find(i => i.d.id === c.id); if (!it) return;
            it.anchor.getWorldPosition(v); v.project(camera);
            const ok = v.z < 1 && innerWidth > 860;
            c.el.style.display = ok ? 'flex' : 'none';
            if (ok) { c.el.style.transform = `translate(${((v.x + 1) / 2 * innerWidth + 14).toFixed(0)}px,${Math.max(100, (1 - v.y) / 2 * innerHeight - 14).toFixed(0)}px)`; c.el.style.opacity = Math.min(1, Math.max(0, (t - 5.5) / 1.5)).toFixed(2); }
        });
    }
})();
})();