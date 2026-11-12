// js/finish.js — completes the brief. Load LAST (after learn.js).
//  1) Vessel identity + capacity-scaled survival kit   2) Click any part of the 3D model → its component card
//  3) Quiz: "Identify the part" (3D)                    4) Crisis: choose the correct response, with feedback
//  5) Instructor session log (+ CSV)                    6) QR code page for the boat       7) Page polish
(function () {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const V = VESSEL_CONFIG; V.lifeboatNo = V.lifeboatNo || 'No. 1'; V.capacity = V.capacity || 25;
const CAPN = () => V.capacity;

// ---------- LSA Code quantities, scaled to the boat's rated capacity ----------
calculateLSASupplies = function (c) {
    return {
        freshWater: (c * 3) + ' litres (3 L per person)',
        foodRations: (c * 10000).toLocaleString() + ' kJ (10,000 kJ per person)',
        rocketParachuteFlares: '4',
        handFlares: '6',
        buoyantSmokeSignals: '2',
        firstAidKits: '1',
        thermalProtectiveAids: Math.max(2, Math.ceil(c * 0.1)) + ' (10% of persons, minimum 2)',
        lifejackets: c + ' (one per person)'
    };
};
if (window.SOLAS_EQUIP) {   // keep the 3D "Inside" gallery in step with this boat's capacity
    const it = n => SOLAS_EQUIP.items.find(i => i.n === n), s = calculateLSASupplies(CAPN());
    it(4).use = `Water is rationed carefully. For ${CAPN()} persons this boat carries ${CAPN() * 3} litres (3 litres per person).`;
    it(9).use = 'Light it to show rescuers your position. Hold it at arm\'s length, pointing downwind. This boat carries 6 hand flares.';
    it(12).use = 'Best in daylight, when aircraft and ships can see the smoke from far away. This boat carries 2 buoyant smoke signals.';
    it(7).use = 'Treat minor injuries until help arrives. This boat carries 1 first-aid kit.';
}

// ---------- styles ----------
const st = document.createElement('style');
st.textContent = `
.vessel{padding:0!important;flex:none}.vs-head{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;color:inherit;padding:11px 16px;cursor:pointer;text-align:left}
.vs-head b{font-size:13.5px;letter-spacing:.02em}.vs-head span{flex:1;font-size:11.5px;color:var(--text-secondary)}.vs-head i{font-style:normal;transition:transform .3s}.vessel.open .vs-head i{transform:rotate(90deg)}
.vs-body{display:none;padding:0 16px 14px}.vessel.open .vs-body{display:block}
.vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}.vs-grid div{background:var(--fill);border-radius:12px;padding:7px 10px}.vs-grid small{display:block;font-size:10.5px;color:var(--text-secondary)}.vs-grid strong{font-size:13px}
.vs-sup{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:.5px solid var(--stroke);font-size:12px}.vs-sup span{color:var(--text-secondary)}.vs-sup b{text-align:right;font-weight:600}
.fn-modal{z-index:1100;--t:#fff;--t2:rgba(235,235,245,.65);--f:rgba(255,255,255,.1);--f2:rgba(255,255,255,.18);--blue:#0a84ff;--green:#30d158;--red:#ff453a;--orange:#ff9f0a;color:#fff}
.fn-box{width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:26px;border-radius:30px;background:rgba(36,36,38,.94);border:.5px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:12px}
.fn-box.wide{max-width:980px}.fn-box h2{font-size:24px;letter-spacing:-.02em}.fn-box p{font-size:14px;line-height:1.5;color:var(--t2)}
.fn-box input[type=text]{width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:16px;outline:0}.fn-box input:focus{border-color:var(--blue)}
.fn-btns{display:flex;gap:8px;flex-wrap:wrap}.fn-btns button{flex:1;border:0;border-radius:99px;padding:12px 18px;background:var(--f2);color:#fff;font-weight:600;font-size:14px;cursor:pointer}.fn-btns .pri{background:var(--blue)}
.fn-tbl{overflow-x:auto}.fn-tbl table{width:100%;border-collapse:collapse;font-size:13px}.fn-tbl th,.fn-tbl td{padding:9px 10px;text-align:left;border-bottom:.5px solid rgba(255,255,255,.12);white-space:nowrap}.fn-tbl th{color:var(--t2);font-weight:600;font-size:12px}
.qr-svg{width:260px;height:260px;margin:0 auto;padding:14px;background:#fff;border-radius:18px}.qr-svg svg{width:100%;height:100%;display:block}
.opt{width:100%;text-align:left;border:1.5px solid transparent;border-radius:14px;padding:11px 13px;margin-top:7px;background:var(--fill);color:inherit;font-size:13.5px;cursor:pointer;transition:background .2s}
.opt:hover:not(:disabled){background:var(--fill-hover)}.opt:disabled{cursor:default}.opt.ok{border-color:var(--green);background:rgba(48,209,88,.2)}.opt.no{border-color:var(--red);background:rgba(255,69,58,.2)}
.fb{margin-top:10px;padding:11px 13px;border-radius:14px;font-size:13px;line-height:1.45}.fb.ok{background:rgba(48,209,88,.18)}.fb.no{background:rgba(255,69,58,.18)}
.id-mark{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px var(--blue),0 0 18px 4px rgba(10,132,255,.7);z-index:6;pointer-events:none;display:none;animation:idp 1.2s ease-out infinite}
@keyframes idp{50%{transform:scale(1.25)}}
.lp-vessel{margin-top:12px;font-size:14px;font-weight:600;color:var(--signal)}.lp-foot a{color:inherit;text-decoration:underline;cursor:pointer;margin-right:14px}
.log-hd{display:flex;justify-content:space-between;align-items:center}.log-hd button{border:0;border-radius:99px;padding:5px 12px;background:var(--fill);color:var(--text-main);font-size:11.5px;font-weight:600;cursor:pointer}
@media print{body>*:not(#qr-overlay){display:none!important}#qr-overlay{position:static!important;background:#fff!important;display:block!important}#qr-overlay .fn-box{box-shadow:none;background:#fff;color:#000;max-width:none}#qr-overlay *{color:#000!important}.fn-btns,#qr-overlay input{display:none!important}}`;
document.head.appendChild(st);

// ---------- 1) Vessel card in the panel ----------
(function () {
    const panel = $('right-panel'), after = document.querySelector('.mode-selector'); if (!panel || !after) return;
    const s = calculateLSASupplies(CAPN());
    const rows = [['Fresh water', s.freshWater], ['Food rations', s.foodRations], ['Rocket parachute flares', s.rocketParachuteFlares], ['Hand flares', s.handFlares],
        ['Buoyant smoke signals', s.buoyantSmokeSignals], ['First-aid kit', s.firstAidKits], ['Thermal protective aids', s.thermalProtectiveAids], ['Lifejackets', s.lifejackets]];
    const c = document.createElement('div'); c.className = 'ui-card vessel'; c.id = 'vessel-card';
    c.innerHTML = `<button class="vs-head" aria-expanded="false"><b>${esc(V.name)}</b><span>Lifeboat ${esc(V.lifeboatNo)} · ${CAPN()} persons</span><i>›</i></button>
        <div class="vs-body"><div class="vs-grid"><div><small>IMO number</small><strong>${esc(V.imo)}</strong></div><div><small>Call sign</small><strong>${esc(V.callSign)}</strong></div>
        <div><small>Lifeboat</small><strong>${esc(V.lifeboatNo)}</strong></div><div><small>Rated capacity</small><strong>${CAPN()} persons</strong></div></div>
        <small style="color:var(--text-secondary)">Survival equipment for ${CAPN()} persons (LSA Code)</small>${rows.map(r => `<div class="vs-sup"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}</div>`;
    c.querySelector('.vs-head').onclick = () => { c.classList.toggle('open'); c.querySelector('.vs-head').setAttribute('aria-expanded', c.classList.contains('open')); };
    after.insertAdjacentElement('afterend', c);
    const log = document.querySelector('.log-card h3');
    if (log) { log.outerHTML = '<div class="log-hd"><h3 style="margin:0">Activity log</h3><button onclick="openReport()">Session report</button></div>'; }
})();

// Vessel details on the landing page
(function () {
    const lede = document.querySelector('.lp-lede');
    if (lede) lede.insertAdjacentHTML('afterend', `<p class="lp-vessel">${esc(V.name)} · IMO ${esc(V.imo)} · Call sign ${esc(V.callSign)} · Lifeboat ${esc(V.lifeboatNo)} · ${CAPN()} persons</p>`);
    const crew = [...document.querySelectorAll('.lp-stat strong')].find(n => n.nextElementSibling && /crew/i.test(n.nextElementSibling.textContent));
    if (crew) crew.dataset.to = CAPN();
    const foot = document.querySelector('.lp-foot');
    if (foot) foot.insertAdjacentHTML('afterbegin', '<p style="margin-bottom:10px"><a onclick="openQR()">Print the boat\'s QR code</a><a onclick="openReport()">Instructor report</a></p>');
})();

// Component cards pick up this boat's numbers
function extras(i) {
    const box = $('component-details'); if (!box || !i) return;
    const s = calculateLSASupplies(CAPN()); let t = '';
    if (i.id === 'emergency_supplies') t = `<b>For this boat (${CAPN()} persons)</b><br>Water ${s.freshWater}<br>Food ${s.foodRations}<br>${s.rocketParachuteFlares} rocket parachute flares, ${s.handFlares} hand flares, ${s.buoyantSmokeSignals} smoke signals<br>${s.firstAidKits} first-aid kit, ${s.thermalProtectiveAids.split(' (')[0]} thermal protective aids`;
    else if (i.id === 'lifejackets') t = `<b>For this boat</b><br>${CAPN()} lifejackets, one for every person aboard.`;
    else if (i.id === 'seats') t = `<b>For this boat</b><br>${CAPN()} seats, each with a harness.`;
    if (t) box.insertAdjacentHTML('beforeend', `<div class="callout" style="background:rgba(10,132,255,.16)">${t}</div>`);
}
const _sic = showInfoCard; showInfoCard = function (i) { _sic(i); extras(i); };
const _scd = showComponentDetails;
const _find = findComponentInfo;

// ---------- 2) Click anywhere on the model → nearest of the 20 components ----------
window.__hit = null;
addEventListener('click', e => {
    window.__hit = null;
    if (typeof renderer === 'undefined' || !renderer || e.target.closest('.ui-card,.top-bar,.camera-dock,.portal-overlay,.quiz-overlay,.lbl')) return;
    const r = renderer.domElement.getBoundingClientRect(), rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const h = rc.intersectObjects(clickableMeshes, true); if (h.length) window.__hit = h[0].point.clone();
}, true);
findComponentInfo = function (mesh) {
    const base = _find(mesh), hit = window.__hit;
    if (!hit || mesh.name === 'Wire_Falls') return base;
    const exact = typeof MODEL_MESH_COMPONENTS !== 'undefined' && MODEL_MESH_COMPONENTS[mesh.name] && mesh.name !== 'Body';
    if (exact) return base;
    buildLabels();
    let best = null, bd = 1.6; const p = new THREE.Vector3();
    lab.items.forEach(it => { it.anchor.getWorldPosition(p); const d = p.distanceTo(hit); if (d < bd) { bd = d; best = it; } });
    return best ? (best.d.info || LIFEBOAT_COMPONENTS.find(c => c.id === best.d.id) || base) : base;
};
showComponentDetails = function (m) { _scd(m); extras(findComponentInfo(m)); };

// ---------- session log for the instructor ----------
const SKEY = 'solasSessions', store = () => { try { return JSON.parse(localStorage.getItem(SKEY) || '[]'); } catch (e) { return []; } };
const S = { id: Date.now().toString(36), start: new Date().toISOString(), cadet: '', viewed: [], quiz: null, identify: null, crisis: null, events: [] };
let saveT = 0;
function row() {
    let chk = '—', launch = '—';
    if (typeof CK !== 'undefined') { const d = CK.s.filter(x => x === 'ok').length; chk = `${d}/${CK.s.length}${CK.signed ? ' signed off' : ''}`; }
    if (typeof LS !== 'undefined' && LS.done) { const sec = Math.round((LS.tEnd - LS.t0) / 1000); launch = `done ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
    else if (typeof LS !== 'undefined' && LS.step) launch = `stage ${LS.step + 1}/6`;
    let learn = 0; try { learn = JSON.parse(localStorage.getItem('solasLearned') || '[]').length; } catch (e) {}
    const f = x => x ? `${x.score}/${x.total}` : '—';
    return { id: S.id, cadet: S.cadet || 'Not given', date: new Date(S.start).toLocaleString(), parts: S.viewed.length, checklist: chk, launch, quiz: f(S.quiz), identify: f(S.identify), crisis: f(S.crisis), learn: learn + '/10' };
}
function persist() { clearTimeout(saveT); saveT = setTimeout(() => {
    const all = store().filter(x => x.id !== S.id); all.push(Object.assign(row(), { events: S.events.slice(-200) }));
    try { localStorage.setItem(SKEY, JSON.stringify(all.slice(-60))); } catch (e) {}
    if (window.REPORT_ENDPOINT && navigator.sendBeacon) navigator.sendBeacon(window.REPORT_ENDPOINT, JSON.stringify(row()));   // optional: set window.REPORT_ENDPOINT to collect centrally
}, 500); }
const _log = logInstructorEvent;
logInstructorEvent = function (msg) {
    _log(msg); S.events.push(new Date().toLocaleTimeString() + ' ' + msg);
    const m = /^Inspected: (.+)$/.exec(msg); if (m && !S.viewed.includes(m[1])) S.viewed.push(m[1]);
    persist();
};
const _qr = renderQuizResults;
renderQuizResults = function () { _qr(); S.quiz = { score: AppState.score, total: QUIZ_QUESTIONS.length }; logInstructorEvent(`SOLAS quiz finished: ${AppState.score}/${QUIZ_QUESTIONS.length}`); };
addEventListener('pagehide', persist);

// who is training?
const _lm = launchModule; let asked = false;
launchModule = function (mode) {
    if (asked) return _lm(mode); asked = true;
    let saved = ''; try { saved = localStorage.getItem('solasCadet') || ''; } catch (e) {}
    const m = modal(`<h2>Who is training?</h2><p>Your name or ID is saved with your results so your instructor can see your progress. You can skip this.</p>
        <input type="text" id="fn-name" placeholder="Name or ID" maxlength="40" value="${esc(saved)}" autocomplete="off">
        <div class="fn-btns"><button id="fn-skip">Skip</button><button class="pri" id="fn-go">Start training</button></div>`);
    const go = keep => { S.cadet = keep ? $('fn-name').value.trim() : ''; try { if (S.cadet) localStorage.setItem('solasCadet', S.cadet); } catch (e) {} m.remove(); logInstructorEvent('Session started' + (S.cadet ? ' for ' + S.cadet : '')); _lm(mode); };
    $('fn-go').onclick = () => go(true); $('fn-skip').onclick = () => go(false);
    $('fn-name').addEventListener('keydown', e => { if (e.key === 'Enter') go(true); }); setTimeout(() => $('fn-name').focus(), 50);
};
function modal(html, wide) {
    const m = document.createElement('div'); m.className = 'quiz-overlay fn-modal'; m.innerHTML = `<div class="fn-box${wide ? ' wide' : ''}">${html}</div>`; document.body.appendChild(m); return m;
}

// instructor report
window.openReport = function () {
    persist(); clearTimeout(saveT);
    const all = store().filter(x => x.id !== S.id); all.push(row());
    const cols = [['cadet', 'Cadet'], ['date', 'Started'], ['parts', 'Parts viewed'], ['checklist', 'Checklist'], ['launch', 'Launch'], ['quiz', 'SOLAS quiz'], ['identify', 'Identify'], ['crisis', 'Crisis'], ['learn', 'Lessons']];
    const m = modal(`<h2>Instructor report</h2><p>Sessions saved in this browser. Download the CSV to keep a record or open it in Excel.</p>
        <div class="fn-tbl"><table><thead><tr>${cols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${all.slice().reverse().map(r => `<tr>${cols.map(c => `<td>${esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="fn-btns"><button id="rp-clear">Clear all</button><button id="rp-csv" class="pri">Download CSV</button><button id="rp-x">Close</button></div>`, true);
    $('rp-x').onclick = () => m.remove();
    $('rp-clear').onclick = () => { if (confirm('Delete every saved session in this browser?')) { try { localStorage.removeItem(SKEY); } catch (e) {} m.remove(); } };
    $('rp-csv').onclick = () => {
        const q = v => '"' + String(v).replace(/"/g, '""') + '"';
        const csv = [cols.map(c => q(c[1])).join(',')].concat(all.map(r => cols.map(c => q(r[c[0]])).join(','))).join('\r\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'lifeboat-training-report.csv'; a.click();
    };
};

// ---------- 3) Quiz chooser + Identify the part ----------
const _lq = launchQuizModule;
launchQuizModule = function () {
    const m = modal(`<h2>Choose a quiz</h2><p>Test what you know about the lifeboat.</p><div class="fn-btns" style="flex-direction:column">
        <button class="pri" id="qz-id">Identify the part (3D, 10 questions)</button><button id="qz-kn">SOLAS knowledge (10 questions)</button><button id="qz-x">Cancel</button></div>`);
    $('qz-kn').onclick = () => { m.remove(); _lq(); };
    $('qz-id').onclick = () => { m.remove(); startIdentify(); };
    $('qz-x').onclick = () => { m.remove(); renderModeUI('explore'); };
};
const ID = { q: [], i: 0, score: 0, on: false };
let mark = null;
function startIdentify() {
    if (typeof lab !== 'undefined' && lab.on) toggleLabels();
    buildLabels();
    const pool = LABELS.filter(d => d.built);
    if (pool.length < 6) { toast('The 3D models are still loading. Try again in a moment.'); renderModeUI('explore'); return; }
    Object.assign(ID, { q: shuffle(pool).slice(0, 10), i: 0, score: 0, on: true });
    if (!mark) { mark = document.createElement('div'); mark.className = 'id-mark'; document.body.appendChild(mark); }
    askIdentify();
}
function askIdentify() {
    const d = ID.q[ID.i], it = lab.items.find(x => x.d === d);
    ID.cur = d; ID.anchor = it.anchor; ID.done = false;
    ID.opts = shuffle([d].concat(shuffle(LABELS.filter(x => x !== d && x.built)).slice(0, 3)));
    it.anchor.getWorldPosition(TMP);
    const dx = TMP.x - controls.target.x, dy = TMP.y - controls.target.y, dz = TMP.z - controls.target.z;
    animateCameraTo({ x: camera.position.x + dx, y: camera.position.y + dy, z: camera.position.z + dz }, { x: TMP.x, y: TMP.y, z: TMP.z });
    renderModeUI('identify');
}
function idCard() {
    if (ID.i >= ID.q.length) {
        const pct = Math.round(ID.score / ID.q.length * 100);
        return `<div class="ui-card"><h3>Identify the part</h3><h2 class="card-title">${ID.score} of ${ID.q.length} correct</h2><div class="bar"><i style="width:${pct}%"></i></div>
            <p class="muted">${pct >= 70 ? 'Well done. You can find your way around the lifeboat.' : 'Keep practising. Try the Learn tab or turn the labels on, then try again.'}</p>
            <div class="btn-row"><button class="action-btn secondary" onclick="renderModeUI('explore')">Back</button><button class="action-btn" onclick="startIdentify()">Try again</button></div></div>`;
    }
    return `<div class="ui-card"><h3>Identify the part · ${ID.i + 1} of ${ID.q.length}</h3><div class="steps">${ID.q.map((_, i) => `<i class="${i < ID.i ? 'done' : ''}"></i>`).join('')}</div>
        <h2 class="card-title" style="font-size:18px">What is the part marked with the ring?</h2>
        <div id="id-opts">${ID.opts.map((o, i) => `<button class="opt" data-i="${i}" onclick="idAnswer(${i})">${esc(o.name)}</button>`).join('')}</div><div id="id-fb"></div></div>`;
}
window.startIdentify = startIdentify;
window.idAnswer = function (i) {
    if (ID.done) return; ID.done = true;
    const ok = ID.opts[i] === ID.cur; if (ok) ID.score++;
    playSound(ok ? 'click' : 'alarm');
    document.querySelectorAll('#id-opts .opt').forEach((b, k) => { b.disabled = true; if (ID.opts[k] === ID.cur) b.classList.add('ok'); else if (k === i) b.classList.add('no'); });
    const info = ID.cur.info || LIFEBOAT_COMPONENTS.find(c => c.id === ID.cur.id);
    $('id-fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><strong>${ok ? 'Correct.' : 'Not quite. This is the ' + esc(ID.cur.name) + '.'}</strong> ${info ? esc(info.function) : ''}</div>
        <div class="btn-row"><button class="action-btn" onclick="idNext()">${ID.i === ID.q.length - 1 ? 'See results' : 'Next'}</button></div>`;
};
window.idNext = function () {
    ID.i++;
    if (ID.i >= ID.q.length) { ID.on = false; S.identify = { score: ID.score, total: ID.q.length }; logInstructorEvent(`Identify quiz finished: ${ID.score}/${ID.q.length}`); renderModeUI('identify'); }
    else askIdentify();
};

// ---------- 4) Crisis: choose the correct response ----------
const SC = [
    { t: 'Jammed fall during lowering', f: 'falls', p: 'The aft fall jams on the drum while the boat is being lowered, and the boat tilts bow-down by about 35°.',
      o: [['Stop lowering, lock the winch brake, then clear the binding before you carry on.', 1, 'Stopping first keeps the boat carried by both falls. Clear the jam, then resume a controlled lowering.'],
          ['Release the hooks now and let the boat drop into the sea.', 0, 'Releasing from height means a freefall onto the water or the ship\'s side. Never open the hooks while the boat is hanging.'],
          ['Keep lowering so the tilt evens itself out.', 0, 'Lowering more loads the jammed fall and can snap it or tip the people inside out of their seats.']] },
    { t: 'Release gear stuck in the water', f: 'release_gear', p: 'The lifeboat is fully afloat in heavy waves, but the main release lever will not move.',
      o: [['Use the emergency override lever on the coxswain\'s order, now that the boat is fully waterborne.', 1, 'The override is only safe once the boat floats freely, because then there is no load left on the hooks.'],
          ['Start the engine and motor away to drag the falls clear.', 0, 'Dragging the falls can capsize the boat or damage the canopy.'],
          ['Wait for a swell to lift the boat and hope the hooks drop.', 0, 'A swell can snatch the boat back up onto the load, which is the most dangerous moment. Use the override, not chance.']] },
    { t: 'Power loss while lowering', f: 'winch', p: 'The ship loses power while you are lowering the lifeboat.',
      o: [['Lift the weighted brake lever by hand. Gravity and the centrifugal brake control the descent.', 1, 'The winch works without power. Stay on the lever and watch the speed until the boat is afloat.'],
          ['Wait in the boat until power comes back.', 0, 'Waiting leaves the boat hanging while the ship may need to be abandoned. The system is built to work without power.'],
          ['Release the hooks so the boat drops.', 0, 'Dropping the boat from height risks serious injury and damage.']] },
    { t: 'Heavy swell at the waterline', f: 'engine', p: 'A heavy swell is running as the lifeboat nears the water.',
      o: [['Start the engine, hold the brake until the boat is floating, then release the hooks.', 1, 'The engine must be ready to pull away at once. Releasing only when fully afloat avoids dropping the boat from a wave trough.'],
          ['Release the hooks as the boat passes a wave crest.', 0, 'The sea can fall away beneath you and the boat drops. Wait for full flotation.'],
          ['Lower as fast as possible to beat the swell.', 0, 'Speed makes the impact worse. Keep the lowering speed controlled.']] },
    { t: 'Burning oil on the water', f: 'sprinkler', p: 'There is burning oil on the sea beside the ship, between you and open water.',
      o: [['Close every hatch, start the water spray and the air supply, then motor away.', 1, 'The spray cools the canopy and the air cylinders keep the inside breathable while you pass through the fire.'],
          ['Open the top hatch for ventilation.', 0, 'An open hatch lets in heat and smoke. Keep the boat sealed.'],
          ['Stay alongside the ship until the fire burns out.', 0, 'Burning oil can spread toward the boat. Get clear, using the spray and air systems.']] }
];
const CR = { i: 0, score: 0, opts: [], done: false, picked: -1 };
function crisisCard() {
    if (CR.i >= SC.length) {
        const pct = Math.round(CR.score / SC.length * 100);
        return `<div class="ui-card"><h3>Crisis drills</h3><h2 class="card-title">${CR.score} of ${SC.length} correct</h2><div class="bar"><i style="width:${pct}%"></i></div>
            <p class="muted">${pct >= 80 ? 'Good judgement under pressure.' : 'Read the explanations again. In every case, the safe answer protects the people in the boat first.'}</p>
            <div class="btn-row"><button class="action-btn" onclick="crStart()">Run the drills again</button></div></div>`;
    }
    const s = SC[CR.i];
    const opts = CR.opts.map((o, k) => `<button class="opt ${CR.done ? (o[1] ? 'ok' : k === CR.picked ? 'no' : '') : ''}" ${CR.done ? 'disabled' : ''} onclick="crPick(${k})">${esc(o[0])}</button>`).join('');
    const fb = CR.done ? `<div class="fb ${CR.opts[CR.picked][1] ? 'ok' : 'no'}"><strong>${CR.opts[CR.picked][1] ? 'Correct.' : 'Not the safe choice.'}</strong> ${esc(CR.opts[CR.picked][2])}${CR.opts[CR.picked][1] ? '' : '<br><br><strong>Best answer:</strong> ' + esc(CR.opts.find(o => o[1])[2])}</div>
        <div class="btn-row"><button class="action-btn" onclick="crNext()">${CR.i === SC.length - 1 ? 'See results' : 'Next scenario'}</button></div>` : '';
    return `<div class="ui-card"><h3>Crisis drill · ${CR.i + 1} of ${SC.length}</h3><h2 class="card-title" style="font-size:18px">${esc(s.t)}</h2><p class="muted" style="margin-bottom:6px">${esc(s.p)}</p>${opts}${fb}</div>`;
}
function crLoad() { CR.opts = shuffle(SC[CR.i].o); CR.done = false; CR.picked = -1; const d = LABELS.find(l => l.id === SC[CR.i].f); buildLabels(); if (d && d.built) selectLabel(d); }
window.crStart = function () { Object.assign(CR, { i: 0, score: 0 }); crLoad(); renderModeUI('emergency'); };
window.crPick = function (k) { if (CR.done) return; CR.done = true; CR.picked = k; const ok = CR.opts[k][1]; if (ok) CR.score++; playSound(ok ? 'click' : 'alarm'); logInstructorEvent(`Crisis "${SC[CR.i].t}": ${ok ? 'correct' : 'incorrect'}`); renderModeUI('emergency'); };
window.crNext = function () {
    CR.i++;
    if (CR.i >= SC.length) { S.crisis = { score: CR.score, total: SC.length }; logInstructorEvent(`Crisis drills finished: ${CR.score}/${SC.length}`); } else crLoad();
    renderModeUI('emergency');
};

// route the panel modes
const _rm = renderModeUI;
renderModeUI = function (mode) {
    const vc = $('vessel-card'); if (vc) vc.classList.remove('open');   // keep the panel roomy when you change mode
    if (mode === 'emergency' || mode === 'identify') {
        const area = $('mode-interactive-area'); if (!area) return;
        if (mode === 'emergency' && CR.i === 0 && !CR.opts.length) crLoad();
        AppState.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === (mode === 'identify' ? 'quiz' : mode)));
        area.innerHTML = mode === 'emergency' ? crisisCard() : idCard();
        return;
    }
    if (ID.on) { ID.on = false; }
    _rm(mode);
};

// marker ring for "identify" + hide it when not in use
(function loop() {
    requestAnimationFrame(loop);
    if (!mark) return;
    const show = ID.on && ID.anchor && AppState.currentMode === 'identify' && ID.i < ID.q.length;
    if (!show) { mark.style.display = 'none'; return; }
    ID.anchor.getWorldPosition(TMP); TMP.project(camera);
    mark.style.display = TMP.z < 1 ? 'block' : 'none';
    mark.style.left = (TMP.x + 1) / 2 * innerWidth + 'px'; mark.style.top = (1 - TMP.y) / 2 * innerHeight + 'px';
})();

// ---------- 6) QR code for the boat ----------
window.openQR = function () {
    const url = location.href.split('#')[0].replace(/index\.html$/, '');
    const m = modal(`<h2 style="text-align:center">Scan to train on this lifeboat</h2><div class="qr-svg" id="qr-img"></div>
        <p style="text-align:center"><strong>${esc(V.name)}</strong><br>Lifeboat ${esc(V.lifeboatNo)} · ${CAPN()} persons<br>IMO ${esc(V.imo)} · ${esc(V.callSign)}</p>
        <p>Web address in the code. After you publish the site, paste its final address here and the code updates:</p>
        <input type="text" id="qr-url" value="${esc(url)}" spellcheck="false">
        <div class="fn-btns"><button id="qr-p" class="pri">Print</button><button id="qr-x">Close</button></div>`);
    m.id = 'qr-overlay';
    const draw = () => {
        const t = $('qr-url').value.trim(), box = $('qr-img');
        if (typeof qrcode !== 'function') { box.innerHTML = '<p style="color:#000;font-size:13px;word-break:break-all">QR library not loaded. Check your internet connection.<br>' + esc(t) + '</p>'; return; }
        try { const q = qrcode(0, 'M'); q.addData(t); q.make(); box.innerHTML = q.createSvgTag(6, 0); } catch (e) { box.textContent = 'Address too long for a QR code.'; }
    };
    $('qr-url').oninput = draw; draw();
    $('qr-p').onclick = () => print(); $('qr-x').onclick = () => m.remove();
};

// ---------- 7) polish ----------
(function () {
    document.title = `${V.name} · Lifeboat Digital Twin`;
    const meta = (n, c) => { const m = document.createElement('meta'); m.name = n; m.content = c; document.head.appendChild(m); };
    meta('description', `Interactive 3D digital twin of the ${V.name} lifeboat for SOLAS familiarization: explore parts, inspect, simulate a launch, handle emergencies and test yourself.`);
    if (!document.querySelector('link[rel~=icon]')) { const l = document.createElement('link'); l.rel = 'icon'; l.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ff6a1f"/><text x="32" y="43" font-size="34" text-anchor="middle">⚓</text></svg>'); document.head.appendChild(l); }
    document.querySelectorAll('.pill-btn,.mode-btn,.camera-btn').forEach(b => { if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', (b.textContent || b.title || '').trim()); });
    let ok = false; try { const c = document.createElement('canvas'); ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) {}
    if (!ok) modal('<h2>3D is not available</h2><p>This simulator needs WebGL. Try another browser, or turn on hardware acceleration in your browser settings.</p>');
})();
// ---------- 8) Beacon light flashes at night ----------
(function () {
    let mesh = null, lamp = null, halo = null, eC = null, eI = 0;
    const glow = () => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,244,190,1)'); g.addColorStop(.25, 'rgba(255,205,90,.55)'); g.addColorStop(1, 'rgba(255,170,40,0)');
        x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
    };
    function setup() {
        if (mesh || typeof boatModel === 'undefined' || !boatModel) return;
        boatModel.traverse(o => { if (!mesh && o.isMesh && (o.name || '').toLowerCase() === 'light') mesh = o; });
        if (!mesh) return;
        mesh.material = mesh.material.clone();
        if (mesh.material.emissive) { eC = mesh.material.emissive.clone(); eI = mesh.material.emissiveIntensity; }
        boatModel.updateMatrixWorld(true);
        const p = boatModel.worldToLocal(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()));
        lamp = new THREE.PointLight(0xffd36a, 0, 7, 2); lamp.position.copy(p); boatModel.add(lamp);
        halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 }));
        halo.position.copy(p); boatModel.add(halo);
    }
    window.SOLAS_BEACON = { k: 0 };
    (function loop() {
        requestAnimationFrame(loop);
        setup(); if (!mesh) return;
        const night = typeof currentEnv !== 'undefined' && currentEnv !== 'day';
        const ph = (performance.now() / 1000) % 1.2;               // a gentle flash every 1.2 seconds
        const k = night ? (window.SOLAS_BEACON.hold != null ? window.SOLAS_BEACON.hold : ph < 0.5 ? Math.pow(Math.sin(ph / 0.5 * Math.PI), 2) : 0) : 0;
        window.SOLAS_BEACON.k = k;
        const m = mesh.material;
        if (m.emissive) { if (night) { m.emissive.setHex(0xffc233); m.emissiveIntensity = 0.5 + 1.1 * k; } else if (eC) { m.emissive.copy(eC); m.emissiveIntensity = eI; } }
        lamp.intensity = night ? 0.15 + 1.1 * k : 0;
        halo.visible = night;
        if (night) { halo.material.opacity = 0.12 + 0.45 * k; const sc = (boatModel.scale.x || 1), z = (0.55 + 0.45 * k) / sc; halo.scale.set(z, z, 1); }
    })();
})();
// ---------- 9) a label for every part you named on the davit ----------
// Reads the part names stored in davit.glb. Blender's default names (Cube.007, Cylinder.003 ...) are skipped.
(function () {
    const DEFAULT = /^(cube|cylinder|sphere|plane|cone|torus|circle|mesh|object|empty|node|group|scene|root|text|curve|icosphere)[\s._-]*\d*$/i;
    const SKIP = /wire_?falls|reflective|^armature|^light$/i;
    const KINDS = [
        [/arm|boom|luff/i, 'The swinging arm that carries the lifeboat out over the ship\'s side and lowers it.', 'Pivots on the davit base.', 'It takes the full weight of the loaded boat.', 'Look for cracks, bends and loose pivots.'],
        [/base|pedestal|foundation|plate|bracket|support|frame/i, 'The fixed foundation bolted to the deck that carries the davit.', 'On the deck, at the foot of the davit.', 'Everything above it depends on it staying firmly fixed.', 'Check for corrosion, cracks and loose bolts.'],
        [/sheave|pulley|block|roller/i, 'A grooved wheel that guides the wire fall over the davit head.', 'At the head of the davit arm.', 'It lets the wire run smoothly and keeps the boat level.', 'Check the groove is smooth and the wheel turns freely.'],
        [/brake/i, 'The centrifugal brake. Friction shoes swing out as the drum spins faster and hold the lowering speed down.', 'On the winch.', 'It keeps the boat from dropping faster than the safe lowering speed.', 'Check for ice, corrosion, grease or binding.'],
        [/winch|drum|reel/i, 'The drum that pays out the wire falls as the boat is lowered.', 'At the base of the davit.', 'It controls how fast the lifeboat descends.', 'Check the wire winds on evenly and the drum is clean.'],
        [/fall|wire|cable|rope/i, 'A steel wire rope that carries the boat\'s weight from the davit to the hooks.', 'From the davit head down to the boat.', 'Two falls keep the boat level as it lowers.', 'Look for broken strands, corrosion and flat spots.'],
        [/hook/i, 'The lifting hook the fall is attached to.', 'At the end of the fall.', 'It connects the boat to the falls until the boat is afloat.', 'Never release while the boat is still above the water.'],
        [/pin|lock|lash|gripe|strap|latch/i, 'A locking pin or strap that holds the boat in its stowed position in harbour.', 'At the stowed boat.', 'It stops the boat moving while the ship is in port or at sea.', 'Remove every pin before lowering.'],
        [/cross|beam|bridge|bar|spreader|stay|brace/i, 'A bar that ties the davit arms together and stiffens the structure.', 'Between the davit arms.', 'It keeps both arms working together under load.', 'Check welds and fixings for cracks.'],
        [/handle|lever|control|pull/i, 'A hand control used to release the brake or operate the davit.', 'Within reach of the operator.', 'It lets the boat be lowered even without power.', 'Make sure it moves freely and is not seized.'],
        [/stop|limit|buffer|bumper/i, 'A stopper that limits how far the arm can swing.', 'At the end of the arm\'s travel.', 'It keeps the arm from overrunning.', 'Check it is secure and undamaged.'],
        [/ladder|rail|platform|step|handrail/i, 'Access and protection for the crew working at the davit.', 'Around the davit platform.', 'Crew need safe footing when they work near the edge.', 'Check for damage and slippery surfaces.']
    ];
    const clean = raw => raw.replace(/\d+$/, '').replace(/[_\-\s.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const infoFor = name => {
        const k = KINDS.find(x => x[0].test(name));
        return { name, category: 'Davit', function: k ? k[1] : 'Part of the davit that supports and guides the lifeboat while it is launched.', location: k ? k[2] : 'On the davit.',
                 importance: k ? k[3] : 'Every part of the davit has to work for a safe launch.', safetyNote: k ? k[4] : 'Check for damage, corrosion and loose fittings before every launch.' };
    };
    // exact-name lookup for these labels, anchored on that mesh only
    let exact = null;
    if (typeof meshCenterLocal === 'function') {
        const _m = meshCenterLocal;
        meshCenterLocal = function (host, names) {
            if (!(names && names.length === 1 && names[0][0] === '=')) { exact = null; return _m(host, names); }
            let f = null; host.traverse(o => { if (!f && o.isMesh && o.name === names[0].slice(1)) f = o; });
            exact = f; if (!f) return null;
            return host.worldToLocal(new THREE.Box3().setFromObject(f).getCenter(new THREE.Vector3()));
        };
    }
    if (typeof snapToSurface === 'function') {
        const _s = snapToSurface;
        snapToSurface = function (host, p) {
            if (!exact) return _s(host, p);
            const f = exact; exact = null; const pos = f.geometry.attributes.position; f.updateMatrixWorld(true); host.updateMatrixWorld(true);
            const m = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(host.matrixWorld).invert(), f.matrixWorld), v = new THREE.Vector3();
            let best = null, bd = Infinity;
            for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); const d = v.distanceToSquared(p); if (d < bd) { bd = d; best = v.clone(); } }
            return best || p;
        };
    }
    (function wait() {
        if (typeof davitModel === 'undefined' || !davitModel || typeof LABELS === 'undefined') { setTimeout(wait, 500); return; }
        const seen = {};
        davitModel.traverse(o => {
            const raw = o.name || '';
            if (!o.isMesh || !raw || DEFAULT.test(raw) || SKIP.test(raw)) return;
            const name = clean(raw); if (!name) return;
            const key = name.toLowerCase(); if (!seen[key]) seen[key] = { o, name };
        });
        Object.keys(seen).forEach(k => {
            const q = seen[k];
            LABELS.push({ id: 'dv_' + k.replace(/\W+/g, '_'), name: q.name, host: 'davit', mesh: ['=' + q.o.name], f: [.5, .5, .5], info: infoFor(q.name) });
        });
        window.SOLAS_DAVIT_PARTS = Object.keys(seen).map(k => seen[k].name);
    })();
})();
})();