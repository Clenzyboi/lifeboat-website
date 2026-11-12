// js/features.js — floating part labels + a guided, interactive launch procedure.
// Loaded AFTER ui.js. It wraps/overrides functions from app.js and ui.js; no edits to those files.

const CAP = (typeof VESSEL_CONFIG !== 'undefined' && VESSEL_CONFIG.capacity) || 25;
const HOME = { x: BOAT_CONFIG.waterborne.x, z: BOAT_CONFIG.waterborne.z };
const TMP = new THREE.Vector3();
const $id = id => document.getElementById(id);

// ==========================================================================
// Styles for the new features (injected so no CSS file edits are needed)
// ==========================================================================
(function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
    #label-layer{position:fixed;inset:0;z-index:5;pointer-events:none;overflow:hidden;display:none}
    #label-layer svg{position:absolute;inset:0;width:100%;height:100%}
    #label-layer line{stroke:rgba(255,255,255,.8);stroke-width:1}
    .lbl{position:absolute;left:0;top:0;height:24px;display:flex;align-items:center;gap:6px;padding:0 10px 0 4px;border-radius:12px;font-size:11.5px;font-weight:600;white-space:nowrap;color:#fff;background:rgba(28,28,30,.74);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:.5px solid rgba(255,255,255,.22);pointer-events:auto;cursor:pointer;transition:background .2s}
    .lbl b{min-width:16px;height:16px;padding:0 3px;border-radius:8px;background:var(--blue);display:grid;place-items:center;font-size:9.5px}
    .lbl:hover,.lbl.sel{background:var(--blue)}
    .lbl.sel b{background:#fff;color:var(--blue)}
    .lbl-dot{position:absolute;left:0;top:0;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--blue)}
    .hold-btn{width:100%;margin-top:12px;padding:22px 12px;border:0;border-radius:20px;background:var(--blue);color:#fff;font-size:17px;font-weight:700;cursor:pointer;touch-action:none;transition:transform .15s,background .2s}
    .hold-btn.on{transform:scale(.97);background:var(--orange)}
    .mini{flex:none;border:0;border-radius:99px;padding:8px 15px;background:var(--blue);color:#fff;font-weight:700;font-size:13px;cursor:pointer;transition:transform .15s}
    .mini:active{transform:scale(.94)}
    .mini:disabled{background:var(--fill);color:var(--text-secondary);cursor:default}
    .done-chk{flex:none;width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-weight:700}
    `;
    document.head.appendChild(s);
})();

const normName = o => (o.name || '').toLowerCase().replace(/[\s_\-.]+/g, '');

// ==========================================================================
// Shared helpers: bounding boxes in a model's local space
// ==========================================================================
function localBox(host) {
    if (host.userData.lbox) return host.userData.lbox;
    host.updateMatrixWorld(true);
    const b = new THREE.Box3();
    host.traverse(o => { if (o.isMesh && !/sprinkler/i.test(o.name)) b.expandByObject(o); });
    if (b.isEmpty()) b.setFromObject(host);
    const a = host.worldToLocal(b.min.clone()), c = host.worldToLocal(b.max.clone());
    return (host.userData.lbox = {
        lo: new THREE.Vector3(Math.min(a.x, c.x), Math.min(a.y, c.y), Math.min(a.z, c.z)),
        hi: new THREE.Vector3(Math.max(a.x, c.x), Math.max(a.y, c.y), Math.max(a.z, c.z))
    });
}

function meshCenterLocal(host, names) {
    let found = null;
    host.traverse(o => {
        if (found || !o.isMesh) return;
        const n = normName(o);
        if (names.some(k => n.includes(k.toLowerCase().replace(/[\s_\-.]+/g, '')))) found = o;
    });
    if (!found) return null;
    const c = new THREE.Box3().setFromObject(found).getCenter(new THREE.Vector3());
    return host.worldToLocal(c);
}

// ==========================================================================
// 1) FLOATING PART LABELS
// ==========================================================================
// f = [x, y, z] fraction of the model's bounding box (x: outboard +, y: up, z: bow +).
// If a mesh name in `mesh` exists in the model, the label snaps to that mesh instead.
const LABELS = [
    { id: 'canopy', name: 'Canopy', f: [.5, .9, .4] },
    { id: 'exterior_light', name: 'Beacon light', mesh: ['Light'], f: [.5, 1, .3] },
    { id: 'sprinkler', name: 'Water spray', f: [.5, 1, .72] },
    { id: 'entry_hatch', name: 'Entry hatch', mesh: ['Hatch', 'Cylinder116_1'], f: [.5, .97, .28] },
    { id: 'hull', name: 'Hull', f: [1, .2, .45] },
    { id: 'release_gear', name: 'Release hooks', mesh: ['Release Hook'], f: [1, .85, .88] },
    { id: 'grab_lines', name: 'Lifelines', f: [1, .25, .6] },
    { id: 'painter', name: 'Painter line', f: [.5, .75, 1] },
    { id: 'painter_release', name: 'Painter release', f: [.5, .55, .9] },
    { id: 'seats', name: 'Seats', f: [.5, .42, .4] },
    { id: 'lifejackets', name: 'Lifejackets', f: [.82, .4, .58] },
    { id: 'emergency_supplies', name: 'Emergency supplies', f: [.2, .35, .35] },
    { id: 'compass', name: 'Compass', f: [.5, .62, .74] },
    { id: 'paddles', name: 'Paddles', f: [.15, .55, .62] },
    { id: 'drain_plug', name: 'Drain plug', f: [.5, .02, .5] },
    { id: 'engine', name: 'Engine & propeller', mesh: ['Propeller'], f: [.5, .5, .12] },
    { id: 'tiller', name: 'Tiller', f: [.5, .65, .2] },
    { id: 'rudder', name: 'Rudder', f: [.5, .12, 0] },
    { id: 'falls', name: 'Wire falls', host: 'rope' },
    { id: 'davit', name: 'Davit arm', host: 'davit', f: [.5, .85, .85] },
    { id: 'winch', name: 'Winch & brake', host: 'davit', f: [.2, .12, .5], info: {
        name: 'Winch & centrifugal brake', category: 'Launching System',
        function: 'The drum pays out the wire falls, and the centrifugal brake limits how fast the boat descends.',
        location: 'Base of the davit, inboard side.',
        importance: 'Controls the lowering speed of the lifeboat under gravity.',
        safetyNote: 'Check the brake drum for ice, corrosion, grease or binding before every launch.' } }
];

const lab = { on: false, layer: null, svg: null, items: [] };
const LABEL_RANGE = 60;

function ensureLayer() {
    if (lab.layer) return;
    lab.layer = document.createElement('div');
    lab.layer.id = 'label-layer';
    lab.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lab.layer.appendChild(lab.svg);
    document.body.appendChild(lab.layer);
}

// Move a point onto the nearest real surface point of the model, so every dot sits on a part
function snapToSurface(host, p) {
    host.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(host.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
    let best = null, bd = Infinity;
    host.traverse(o => {
        if (!o.isMesh || /sprinkler/i.test(o.name) || (o.parent && o.parent.userData && o.parent.userData.home)) return;
        const pos = o.geometry.attributes.position;
        m.multiplyMatrices(inv, o.matrixWorld);
        for (let i = 0; i < pos.count; i += 2) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m);
            const d = v.distanceToSquared(p);
            if (d < bd) { bd = d; best = v.clone(); }
        }
    });
    return best || p;
}


function buildLabels() {
    ensureLayer();
    LABELS.forEach((d, i) => {
        if (d.built) return;
        const host = d.host === 'davit' ? davitModel : d.host === 'rope' ? fwdRopeMesh : boatModel;
        if (!host) return;
        const a = new THREE.Object3D();
        if (d.host === 'rope') a.position.set(0, -0.5, 0);
        else {
            const lb = localBox(host);
            const p = (d.mesh && meshCenterLocal(host, d.mesh)) || new THREE.Vector3(
                lb.lo.x + d.f[0] * (lb.hi.x - lb.lo.x),
                lb.lo.y + d.f[1] * (lb.hi.y - lb.lo.y),
                lb.lo.z + d.f[2] * (lb.hi.z - lb.lo.z));
            a.position.copy(snapToSurface(host, p));
        }
        host.add(a);

        const el = document.createElement('div');
        el.className = 'lbl';
        el.innerHTML = `<b>${i + 1}</b>${d.name}`;
        el.addEventListener('click', e => { e.stopPropagation(); selectLabel(d); });
        const dot = document.createElement('i');
        dot.className = 'lbl-dot';
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lab.layer.append(el, dot);
        lab.svg.appendChild(line);
        lab.items.push({ d, anchor: a, el, dot, line, w: 32 + d.name.length * 6.6, vis: null });
        d.built = true;
    });
}

function updateLabels() {
    if (!lab.on || !camera) return;
    const W = innerWidth, H = innerHeight, vis = [];
    for (const it of lab.items) {
        it.anchor.getWorldPosition(TMP);
        const dist = camera.position.distanceTo(TMP);
        TMP.project(camera);
        const ok = TMP.z < 1 && Math.abs(TMP.x) < 1.05 && Math.abs(TMP.y) < 1.05 && dist < LABEL_RANGE;
        if (it.vis !== ok) {
            it.vis = ok;
            const disp = ok ? '' : 'none';
            it.el.style.display = it.dot.style.display = it.line.style.display = disp;
        }
        if (ok) { it.sx = (TMP.x + 1) / 2 * W; it.sy = (1 - TMP.y) / 2 * H; vis.push(it); }
    }
    // Fan chips out so they don't overlap
    vis.sort((a, b) => a.sy - b.sy);
    const placed = [];
    for (const it of vis) {
        const x = it.sx + 16; let y = it.sy - 28;
        for (let k = 0; k < 16; k++) {
            const hit = placed.find(p => x < p.x + p.w + 4 && x + it.w + 4 > p.x && y < p.y + 24 && y + 24 > p.y);
            if (!hit) break;
            y = hit.y + 26;
        }
        placed.push({ x, y, w: it.w });
        it.el.style.transform = `translate(${x}px,${y}px)`;
        it.dot.style.transform = `translate(${it.sx}px,${it.sy}px)`;
        it.line.setAttribute('x1', it.sx); it.line.setAttribute('y1', it.sy);
        it.line.setAttribute('x2', x); it.line.setAttribute('y2', y + 12);
    }
}

function toggleLabels() {
    lab.on = !lab.on;
    ensureLayer();
    lab.layer.style.display = lab.on ? 'block' : 'none';
    const b = $id('labels-toggle-btn');
    if (b) b.classList.toggle('on', lab.on);
    if (lab.on) {
        if (!boatModel) toast('The models are still loading. Try again in a moment.');
        buildLabels();
        updateLabels();
    }
    logInstructorEvent('Part labels ' + (lab.on ? 'on' : 'off'));
}

function selectLabel(d) {
    lab.items.forEach(it => it.el.classList.toggle('sel', it.d === d));
    const info = d.info || LIFEBOAT_COMPONENTS.find(c => c.id === d.id);
    if (info) showInfoCard(info);
    const it = lab.items.find(x => x.d === d);
    if (it && controls) {
        it.anchor.getWorldPosition(TMP);
        const dx = TMP.x - controls.target.x, dy = TMP.y - controls.target.y, dz = TMP.z - controls.target.z;
        animateCameraTo({ x: camera.position.x + dx, y: camera.position.y + dy, z: camera.position.z + dz }, { x: TMP.x, y: TMP.y, z: TMP.z });
    }
    playSound('click');
}

function showInfoCard(i) {
    const box = $id('component-details');
    if (!box) return;
    box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="category-tag">${i.category}</span>
            <button class="icon-x" onclick="clearComponentSelection()" aria-label="Close">✕</button>
        </div>
        <h2 class="card-title" style="margin-top:10px;">${i.name}</h2>
        <div class="detail-block"><b>What it does</b><p>${i.function}</p></div>
        <div class="detail-block"><b>Where it is</b><p>${i.location}</p></div>
        <div class="detail-block"><b>Why it matters</b><p>${i.importance}</p></div>
        <div class="callout">⚠️ ${i.safetyNote}</div>`;
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    logInstructorEvent('Inspected: ' + i.name);
}

(function injectLabelButton() {
    const bar = document.querySelector('.top-bar');
    if (!bar) return;
    const b = document.createElement('button');
    b.id = 'labels-toggle-btn';
    b.className = 'pill-btn';
    b.title = 'Part labels (L)';
    b.innerHTML = '🏷️<span>Labels</span>';
    b.onclick = toggleLabels;
    bar.insertBefore(b, $id('flashlight-toggle-btn'));
    window.addEventListener('keydown', e => { if (e.key === 'l' || e.key === 'L') toggleLabels(); });
})();

// ==========================================================================
// 2) GUIDED LAUNCH PROCEDURE
// ==========================================================================
const LS = { step: 0, pins: [false, false], crew: 0, boarding: false, hatches: false, cranking: false,
             armed: false, done: false, moved: false, motoring: false, t0: 0, tEnd: 0, timers: [], winchTimer: null };
const PROPS = { built: false, pins: [] };

const STEP_CAM = [
    { p: { x: 10.5, y: 9.5, z: 4.5 }, l: { x: 5.2, y: 7.8, z: 0 } },   // 1 lashing pins
    { p: { x: 9, y: 9.5, z: 3 },      l: { x: 5.2, y: 8, z: 0 } },     // 2 crew + hatches
    { p: { x: 10, y: 8, z: -3 },      l: { x: 5.2, y: 7.4, z: -1 } },  // 3 engine
    { p: { x: 8, y: 10, z: 7 },       l: { x: 3.5, y: 7.5, z: 0 } },   // 4 winch
    { p: { x: 24, y: 5, z: 3 },       l: { x: 5.5, y: 3, z: 0 } },     // 5 lowering
    { p: { x: 15, y: 4, z: 6 },       l: { x: 6.2, y: -0.5, z: 0 } }   // 6 hooks
];

function focusStep() {
    const c = STEP_CAM[Math.min(LS.step, 5)];
    if (c && camera && controls) animateCameraTo(c.p, c.l);
}

// Red lashing pins with tags, placed directly on the forward and aft release hooks
const PIN_DIR = 1;   // set to -1 if the pins stick out toward the boat's centre instead of outboard

function hookCentersLocal(host) {
    const boxes = [];
    host.updateMatrixWorld(true);
    host.traverse(o => {
        if (o.isMesh && normName(o).includes('releasehook')) boxes.push(new THREE.Box3().setFromObject(o));
    });
    if (!boxes.length) return null;
    const pts = boxes.map(b => host.worldToLocal(b.getCenter(new THREE.Vector3())));
    const mid = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const avg = f => {
        const g = pts.filter(f);
        return g.length ? g.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / g.length) : null;
    };
    const fwd = avg(p => p.z >= mid), aft = avg(p => p.z < mid);
    return fwd && aft ? [fwd, aft] : null;
}

function ensureProps() {
    if (PROPS.built || !boatModel) return;
    PROPS.built = true;   // set first, so a failure can never repeat every frame
    try {
        const s = boatModel.scale.x || 1;
        const mat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xaa0000, emissiveIntensity: 0.6, roughness: 0.4 });

        let spots = hookCentersLocal(boatModel);
        if (!spots) {
            console.warn('[pins] No Release Hook meshes found, using fallback');
            boatModel.updateMatrixWorld(true);
            spots = [2.25, -2.25].map(dz => boatModel.worldToLocal(new THREE.Vector3(
                boatModel.position.x, boatModel.position.y + ROPE_CONFIG.hookHeightOffset, boatModel.position.z + dz)));
        }

        spots.forEach(p => {
            const g = new THREE.Group();
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10), mat);
            pin.rotation.z = Math.PI / 2; pin.position.x = PIN_DIR * 0.2;
            const tag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.14), mat);
            tag.position.set(PIN_DIR * 0.46, -0.08, 0);
            g.add(pin, tag);
            g.scale.setScalar(1 / s);
            g.position.copy(p);
            g.userData = { home: g.position.clone(), t: 0, s };
            boatModel.add(g);
            PROPS.pins.push(g);
        });
    } catch (e) {
        console.error('[pins] could not build pin visuals:', e);
    }
}

function lsRender() { if (AppState.currentMode === 'launch') renderModeUI('launch'); }

function completeStep() {
    playSound('click');
    toast('✓ ' + LAUNCH_STEPS[LS.step].title);
    logInstructorEvent(`Step ${LS.step + 1} complete: ${LAUNCH_STEPS[LS.step].title}`);
    LS.step = Math.min(5, LS.step + 1);
    if (AppState.currentMode === 'launch') focusStep();
    lsRender();
}

function pullPin(i) {
    if (LS.step !== 0 || LS.pins[i]) return;
    ensureProps();
    if (!LS.t0) LS.t0 = performance.now();
    LS.pins[i] = true;
    playSound('brake');
    if (PROPS.pins[i]) PROPS.pins[i].userData.t = 1;
    logInstructorEvent(`${i ? 'Aft' : 'Forward'} lashing pin pulled`);
    if (LS.pins.every(Boolean)) completeStep(); else lsRender();
}

function boardCrew() {
    if (LS.step !== 1 || LS.boarding || LS.crew >= CAP) return;
    LS.boarding = true;
    lsRender();
    const iv = setInterval(() => {
        LS.crew = Math.min(CAP, LS.crew + 1);
        const el = $id('ls-crew');
        if (el) el.textContent = `${LS.crew} of ${CAP} seated`;
        if (LS.crew % 5 === 0) playSound('click');
        if (LS.crew >= CAP) { clearInterval(iv); LS.boarding = false; logInstructorEvent('All crew aboard and strapped in'); lsRender(); }
    }, 70);
    LS.timers.push(iv);
}

function secureHatches() {
    if (LS.step !== 1 || LS.crew < CAP || LS.hatches) return;
    LS.hatches = true;
    playSound('brake');
    logInstructorEvent('Canopy hatches dogged down');
    completeStep();
}

function startEngine() {
    if (LS.step !== 2 || LS.cranking || AppState.engineStarted) return;
    LS.cranking = true;
    playSound('engine');
    lsRender();
    LS.timers.push(setTimeout(() => {
        LS.cranking = false;
        AppState.engineStarted = true;
        playSound('engine');
        logInstructorEvent('Lifeboat diesel engine running');
        completeStep();
    }, 1100));
}

function unlockBrake() {
    if (LS.step !== 3) return;
    LS.armed = true;
    playSound('brake');
    logInstructorEvent('Winch brake lever unlocked. Hold it to lower.');
    completeStep();
}

// Dead-man style: the boat only moves while the lever is held
function holdLower(on) {
    if (LS.step !== 4 || isWaterborne || LS.done || isLowering === on) return;
    isLowering = on;
    const b = $id('hold-btn');
    if (b) { b.classList.toggle('on', on); b.textContent = on ? 'Lowering… release to stop' : 'Hold to lower'; }
    clearInterval(LS.winchTimer); LS.winchTimer = null;
    if (on) { playSound('winch'); LS.winchTimer = setInterval(() => playSound('winch'), 140); logInstructorEvent('Brake lever held. Boat lowering.'); }
    else logInstructorEvent('Lever released. Brake holds the boat.');
}

function releaseHooks() { toggleOffLoadHooks(); }   // interlock toast if not waterborne

function motorAway() {
    if (LS.moved || !AppState.engineStarted) return;
    LS.moved = LS.motoring = true;
    playSound('engine');
    logInstructorEvent('Lifeboat motoring clear of the ship');
    animateCameraTo({ x: 28, y: 10, z: 24 }, { x: 8, y: 0, z: 14 });
    lsRender();
}

function resetLaunchState() {
    LS.timers.forEach(t => { clearInterval(t); clearTimeout(t); });
    clearInterval(LS.winchTimer);
    Object.assign(LS, { step: 0, pins: [false, false], crew: 0, boarding: false, hatches: false, cranking: false,
        armed: false, done: false, moved: false, motoring: false, t0: 0, tEnd: 0, timers: [], winchTimer: null });
    BOAT_CONFIG.waterborne.x = HOME.x;
    BOAT_CONFIG.waterborne.z = HOME.z;
    PROPS.pins.forEach(g => { g.visible = true; g.position.copy(g.userData.home); g.userData.t = 0; });
}

function launchHTML() {
    const row = (title, sub, ctl) => `<div class="row"><div><b>${title}</b><small>${sub}</small></div>${ctl}</div>`;
    const ok = '<span class="done-chk">✓</span>';

    if (LS.done) {
        const sec = Math.round((LS.tEnd - LS.t0) / 1000);
        const time = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        return `<div class="ui-card">
            <h3>Launch complete</h3>
            <h2 class="card-title">Boat launched in ${time}</h2>
            <p class="muted">The hooks are released and the falls are clear. ${LS.moved ? 'The boat is motoring away from the ship.' : 'Motor away to get clear of the ship.'}</p>
            <div class="btn-row">
                <button class="action-btn" onclick="motorAway()" ${LS.moved ? 'disabled' : ''}>Motor away</button>
                <button class="action-btn secondary" onclick="resetSimulationState()">Run again</button>
            </div></div>`;
    }

    const s = LS.step, step = LAUNCH_STEPS[s];
    let act = '';
    if (s === 0) {
        act = `<div class="list">${['Forward', 'Aft'].map((n, i) =>
            row(`${n} lashing pin`, LS.pins[i] ? 'Removed' : 'Still locking the boat to the davit',
                LS.pins[i] ? ok : `<button class="mini" onclick="pullPin(${i})">Pull pin</button>`)).join('')}</div>`;
    } else if (s === 1) {
        act = `<div class="list">
            ${row('Crew aboard', `<span id="ls-crew">${LS.crew} of ${CAP} seated</span>`,
                LS.crew >= CAP ? ok : `<button class="mini" onclick="boardCrew()" ${LS.boarding ? 'disabled' : ''}>${LS.boarding ? 'Boarding…' : 'Board crew'}</button>`)}
            ${row('Canopy hatches', LS.crew >= CAP ? 'Close and dog down every hatch' : 'Board the crew first',
                `<button class="mini" onclick="secureHatches()" ${LS.crew >= CAP ? '' : 'disabled'}>Secure</button>`)}
        </div>`;
    } else if (s === 2) {
        act = `<div class="list">${row('Diesel engine', LS.cranking ? 'Cranking…' : 'Start it now so power is ready at the water',
            `<button class="mini" onclick="startEngine()" ${LS.cranking ? 'disabled' : ''}>${LS.cranking ? 'Cranking' : 'Start engine'}</button>`)}</div>`;
    } else if (s === 3) {
        act = `<div class="list">${row('Winch brake lever', 'Unlock it, then you control the descent',
            `<button class="mini" onclick="unlockBrake()">Unlock lever</button>`)}</div>`;
    } else if (s === 4) {
        act = `<button class="hold-btn" id="hold-btn" onpointerdown="holdLower(true)" onpointerup="holdLower(false)" onpointerleave="holdLower(false)" onpointercancel="holdLower(false)" oncontextmenu="return false">Hold to lower</button>
            <div class="list">${row('Water clearance', 'Release the lever at any time to stop', `<b id="ls-clear">--</b>`)}
            ${row('Off-load hooks', 'Try them now to see the interlock', `<button class="mini" onclick="releaseHooks()">Try release</button>`)}</div>`;
    } else {
        act = `<div class="list">${row('Off-load hooks', 'The boat is waterborne, so the interlock is open',
            `<button class="mini" onclick="releaseHooks()">Release hooks</button>`)}</div>`;
    }

    return `<div class="ui-card">
        <h3>Launch procedure · Step ${s + 1} of ${LAUNCH_STEPS.length}</h3>
        <div class="steps">${LAUNCH_STEPS.map((_, i) => `<i class="${i < s ? 'done' : ''}"></i>`).join('')}</div>
        <h2 class="card-title">${step.title}</h2>
        <p class="muted">${step.desc}</p>
        ${act}
        <div class="btn-row"><button class="action-btn secondary" onclick="resetSimulationState()">Start over</button></div>
    </div>`;
}

// ---- Hook into the existing UI ----
const _renderModeUI = renderModeUI;
renderModeUI = function (mode) {
    if (mode !== 'launch') return _renderModeUI(mode);
    const area = $id('mode-interactive-area');
    if (!area) return;
    const entering = AppState.currentMode !== 'launch';
    AppState.currentMode = 'launch';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'launch'));
    area.innerHTML = launchHTML();
    if (entering) focusStep();
};

const _resetSimulationState = resetSimulationState;
resetSimulationState = function () { resetLaunchState(); _resetSimulationState(); };

const _updateTelemetryUI = updateTelemetryUI;
updateTelemetryUI = function () {
    _updateTelemetryUI();
    if (LS.armed && !isLowering && !isWaterborne) {
        const b = $id('tel-brake');
        if (b) { b.textContent = 'UNLOCKED'; b.style.color = 'var(--green)'; b.dataset.c = ''; }
    }
};

// ==========================================================================
// Per-frame loop: pin animation, lever release, step detection, labels
// ==========================================================================
let _frame = 0;
function featuresTick() {
    requestAnimationFrame(featuresTick);
    _frame++;
    if (!PROPS.built && boatModel) ensureProps();

    PROPS.pins.forEach(g => {
        if (g.userData.t > 0 && g.visible) {
            g.userData.t++;
            g.position.x += PIN_DIR * 0.05 / g.userData.s;
            if (g.userData.t > 24) g.visible = false;
        }
    });

    if (!isLowering && !isWaterborne) launchVelocity *= 0.85;   // boat stops quickly when the lever is released

    if (LS.step === 4 && isWaterborne && !LS.done) {
        isLowering = false;
        clearInterval(LS.winchTimer); LS.winchTimer = null;
        completeStep();
    }
    if (LS.step === 5 && AppState.hooksReleased && !LS.done) {
        LS.done = true;
        LS.tEnd = performance.now();
        toast('🎉 Lifeboat launched');
        logInstructorEvent('Launch complete');
        lsRender();
    }
    if (LS.motoring) {
        BOAT_CONFIG.waterborne.z += 0.05;
        BOAT_CONFIG.waterborne.x += 0.012;
        if (BOAT_CONFIG.waterborne.z > 60) LS.motoring = false;
    }

    const clr = $id('ls-clear');
    if (clr) clr.textContent = Math.max(0, boatPos.y + 0.7).toFixed(1) + ' m';

    if (lab.on) {
        if (_frame % 30 === 0) buildLabels();
        updateLabels();
    }
}
requestAnimationFrame(featuresTick);

// ==========================================================================
// 3) INTERACTIVE WALKAROUND CHECKLIST (challenge → inspect → response)
// ==========================================================================
const CHECKLIST = [
    { zone: 'Davit & Winch', title: 'Harbor lashing locks', resp: 'DISENGAGED', focus: 'davit', desc: 'Verify safety locking pins are removed prior to lowering.' },
    { zone: 'Davit & Winch', title: 'Winch brake weights & friction drum', resp: 'FREE & CLEAN', focus: 'winch', desc: 'Check for ice, corrosion, grease or binding on the brake drum.' },
    { zone: 'Davit & Winch', title: 'Remote control cable rigging', resp: 'LEADS FREE', focus: 'entry_hatch', desc: 'Ensure the canopy wire leads freely into the lifeboat interior.' },
    { zone: 'Hull & Hooks', title: 'Hull & gelcoat', resp: 'NO DAMAGE', focus: 'hull', desc: 'Look for cracks, impact damage or delamination.' },
    { zone: 'Hull & Hooks', title: 'Release hooks', resp: 'CLOSED & LOCKED', focus: 'release_gear', desc: 'Both hooks closed, interlock state confirmed.' },
    { zone: 'Hull & Hooks', title: 'Exterior lifelines', resp: 'SECURE', focus: 'grab_lines', desc: 'Check for rope degradation and secure fittings.' },
    { zone: 'Interior', title: 'Seats & harnesses', resp: 'SERVICEABLE', focus: 'seats', desc: 'Every seat has a working 4-point harness.' },
    { zone: 'Interior', title: 'Lifejackets', resp: 'FULL COMPLEMENT', focus: 'lifejackets', desc: 'Quantity matches or exceeds rated capacity.' },
    { zone: 'Interior', title: 'Emergency supplies', resp: 'IN DATE', focus: 'emergency_supplies', desc: 'Rations, water, flares and first aid present and in date.' },
    { zone: 'Engine & Steering', title: 'Diesel engine', resp: 'READY TO START', focus: 'engine', desc: 'Fuel, oil and batteries checked.' },
    { zone: 'Engine & Steering', title: 'Drain plug', resp: 'CLEAR & FITTED', focus: 'drain_plug', desc: 'Plug or valve is clean and free of debris.' },
    { zone: 'Engine & Steering', title: 'Painter line', resp: 'FASTENED', focus: 'painter', desc: 'Secured forward and ready to run free.' }
];
const ZONES = [...new Set(CHECKLIST.map(c => c.zone))];
const CK = { zone: 0, cur: 0, s: CHECKLIST.map(() => null), insp: CHECKLIST.map(() => false), signed: false, t0: 0 };

(function () {
    const s = document.createElement('style');
    s.textContent = `
    .zt-row{display:flex;gap:6px;margin:10px 0}
    .zt{flex:1;border:0;border-radius:99px;padding:7px 4px;background:var(--fill);color:var(--text-secondary);font-size:11.5px;font-weight:600;cursor:pointer}
    .zt.on{background:var(--blue);color:#fff}
    .zt small{display:block;font-size:9.5px;opacity:.8}
    .ck{border-radius:14px;padding:11px 12px;margin-bottom:8px;background:var(--fill);border:1.5px solid transparent;cursor:pointer}
    .ck.cur{border-color:var(--blue);cursor:default}
    .ck.ok{border-color:rgba(48,209,88,.4)} .ck.bad{border-color:rgba(255,69,58,.6)}
    .ck-h{display:flex;align-items:center;gap:10px}
    .ck-h b{flex:1;font-size:13.5px}
    .ck-n{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;background:rgba(255,255,255,.12)}
    .ck.ok .ck-n{background:var(--green);color:#fff} .ck.bad .ck-n{background:#ff453a;color:#fff}
    .ck-r{font-size:10.5px;font-weight:700;letter-spacing:.4px}
    .ck.ok .ck-r{color:var(--green)} .ck.bad .ck-r{color:#ff453a}
    .ck-b{margin-top:8px} .ck-b p{margin:0 0 10px;font-size:12px;color:var(--text-secondary)}
    .ck-btns{display:flex;gap:8px}
    .ck-btns button{flex:1;border:0;border-radius:12px;padding:11px 6px;font-weight:700;font-size:13px;cursor:pointer;color:#fff}
    .ck-btns button:disabled{background:var(--fill)!important;color:var(--text-secondary);cursor:default}
    .ck-insp{background:var(--blue)} .ck-pass{background:var(--green)} .ck-fail{background:#ff453a}`;
    document.head.appendChild(s);
})();

function ckFocus(i) {
    buildLabels();
    const d = LABELS.find(l => l.id === CHECKLIST[i].focus);
    if (d) selectLabel(d);
}
function ckRender() { if (AppState.currentMode === 'checklist') renderModeUI('checklist'); }
function ckZone(z) { CK.zone = z; CK.cur = CHECKLIST.findIndex(c => c.zone === ZONES[z]); ckRender(); }
function ckSelect(i) { CK.cur = i; ckRender(); }
function ckInspect(i) {
    if (!CK.t0) CK.t0 = performance.now();
    CK.insp[i] = true; ckFocus(i); playSound('click');
    logInstructorEvent('Inspecting: ' + CHECKLIST[i].title);
    ckRender();
}
function ckMark(i, v) {
    if (!CK.insp[i]) return;
    CK.s[i] = v;
    playSound(v === 'ok' ? 'brake' : 'click');
    logInstructorEvent(`Checklist: ${CHECKLIST[i].title} → ${v === 'ok' ? CHECKLIST[i].resp : 'DEFECT'}`);
    const next = CK.s.findIndex((x, k) => k > i && !x);
    const any = next >= 0 ? next : CK.s.findIndex(x => !x);
    if (any >= 0) { CK.cur = any; CK.zone = ZONES.indexOf(CHECKLIST[any].zone); }
    ckRender();
}
function ckRedo(i) { CK.s[i] = null; CK.cur = i; ckRender(); }
function ckSignoff() {
    if (CK.s.some(x => x !== 'ok')) return;
    CK.signed = true; playSound('brake'); toast('✓ Checklist signed off');
    logInstructorEvent('Walkaround checklist signed off');
    ckRender();
}
function ckReset() {
    Object.assign(CK, { zone: 0, cur: 0, s: CHECKLIST.map(() => null), insp: CHECKLIST.map(() => false), signed: false, t0: 0 });
    ckRender();
}

function checklistHTML() {
    const done = CK.s.filter(x => x === 'ok').length, bad = CK.s.filter(x => x === 'bad').length;
    const pct = Math.round(done / CHECKLIST.length * 100);
    const tabs = ZONES.map((z, zi) => {
        const items = CHECKLIST.filter(c => c.zone === z);
        const n = items.filter(c => CK.s[CHECKLIST.indexOf(c)] === 'ok').length;
        return `<button class="zt ${zi === CK.zone ? 'on' : ''}" onclick="ckZone(${zi})">Zone ${zi + 1}<small>${n}/${items.length}</small></button>`;
    }).join('');

    const rows = CHECKLIST.map((c, i) => ({ c, i })).filter(o => o.c.zone === ZONES[CK.zone]).map(({ c, i }) => {
        const st = CK.s[i], cur = i === CK.cur && !st;
        const resp = st === 'ok' ? c.resp : st === 'bad' ? 'DEFECT' : '';
        let body = '';
        if (cur) body = `<div class="ck-b"><p>${c.desc}</p><div class="ck-btns">
            <button class="ck-insp" onclick="ckInspect(${i})">${CK.insp[i] ? '🔍 Inspect again' : '🔍 Inspect'}</button>
            <button class="ck-pass" ${CK.insp[i] ? '' : 'disabled'} onclick="ckMark(${i},'ok')">✓ ${c.resp.toLowerCase()}</button>
            <button class="ck-fail" ${CK.insp[i] ? '' : 'disabled'} onclick="ckMark(${i},'bad')">✗ Defect</button></div>
            ${CK.insp[i] ? '' : '<p style="margin:8px 0 0;font-size:11px">Inspect the item before you can respond.</p>'}</div>`;
        else if (st === 'bad') body = `<div class="ck-b"><p style="color:#ff453a">Defect logged. Report to the bridge before launch.</p><button class="mini" onclick="ckRedo(${i})">Re-inspect</button></div>`;
        return `<div class="ck ${st || ''} ${cur ? 'cur' : ''}" ${cur ? '' : `onclick="ckSelect(${i})"`}>
            <div class="ck-h"><span class="ck-n">${st === 'ok' ? '✓' : st === 'bad' ? '✗' : i + 1}</span><b>${c.title}</b><span class="ck-r">${resp}</span></div>${body}</div>`;
    }).join('');

    let foot;
    if (CK.signed) {
        const sec = Math.round((performance.now() - CK.t0) / 1000);
        foot = `<p class="muted" style="color:var(--green)">✓ Signed off. Lifeboat cleared for launch.</p>
               <div class="btn-row"><button class="action-btn" onclick="setMode ? setMode('launch') : renderModeUI('launch')">Go to launch</button><button class="action-btn secondary" onclick="ckReset()">Redo</button></div>`;
    } else {
        foot = `${bad ? `<p class="muted" style="color:#ff453a">${bad} defect${bad > 1 ? 's' : ''} logged. Not cleared for launch.</p>` : ''}
               <div class="btn-row"><button class="action-btn" ${done === CHECKLIST.length ? '' : 'disabled'} onclick="ckSignoff()">Sign off checklist</button>
               <button class="action-btn secondary" onclick="ckReset()">Reset</button></div>`;
    }
    return `<div class="ui-card"><h3>Walkaround checklist</h3>
        <h2 class="card-title">${done} of ${CHECKLIST.length} checked</h2>
        <div class="steps">${CHECKLIST.map((_, i) => `<i class="${CK.s[i] === 'ok' ? 'done' : ''}"></i>`).join('')}</div>
        <div class="zt-row">${tabs}</div>${rows}${foot}</div>`;
}

const _renderModeUI2 = renderModeUI;
renderModeUI = function (mode) {
    if (mode !== 'checklist') return _renderModeUI2(mode);
    const area = $id('mode-interactive-area');
    if (!area) return;
    AppState.currentMode = 'checklist';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'checklist'));
    area.innerHTML = checklistHTML();
};