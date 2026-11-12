// js/ui.js — iOS-style UI layer. Loaded AFTER app.js: these declarations replace the
// same-named functions in app.js, so app.js itself needs no edits.

// ---------- Toasts & log ----------
function toast(msg) {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
}

function logInstructorEvent(msg) {
    const c = document.getElementById('log-entries');
    if (!c) return;
    const p = document.createElement('p');
    p.className = 'log-item';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.innerHTML = `<strong>${time}</strong>${msg}`;
    c.appendChild(p);
    while (c.children.length > 50) c.firstChild.remove();
    c.scrollTop = c.scrollHeight;
}

// ---------- Toggles ----------
function toggleAudioMute() {
    AppState.audioMuted = !AppState.audioMuted;
    const b = document.getElementById('audio-toggle-btn');
    if (b) {
        b.classList.toggle('on', !AppState.audioMuted);
        b.innerHTML = (AppState.audioMuted ? '🔇' : '🔊') + '<span>Sound</span>';
    }
    if (ambientGainNode && audioCtx) updateAmbienceForEnvironment(currentEnv);
    logInstructorEvent('Sound ' + (AppState.audioMuted ? 'muted' : 'on'));
}

function toggleFlashlightMode() {
    AppState.flashlightActive = !AppState.flashlightActive;
    const b = document.getElementById('flashlight-toggle-btn');
    if (b) b.classList.toggle('on', AppState.flashlightActive);
    if (flashlight) flashlight.intensity = AppState.flashlightActive ? 8.0 : 0.0;
    logInstructorEvent('Flashlight ' + (AppState.flashlightActive ? 'on' : 'off'));
}

// Same logic as app.js, but with a toast instead of alert()
function toggleOffLoadHooks() {
    if (!isWaterborne && !AppState.hooksReleased) {
        playSound('alarm');
        logInstructorEvent('Interlock blocked hook release while suspended above water');
        toast('🔒 Interlock engaged. Hooks stay locked until the boat is waterborne.');
        return;
    }
    AppState.hooksReleased = !AppState.hooksReleased;
    playSound('brake');
    if (AppState.hooksReleased) logInstructorEvent('Off-load hooks released. Falls winching back to the davit head.');
    else { hookRetractProgress = 0; logInstructorEvent('Hooks re-engaged to falls.'); }
    renderModeUI(AppState.currentMode);
}

function endEmergencyScenario(success, message) {
    if (AppState.scenarioTimerId) { clearInterval(AppState.scenarioTimerId); AppState.scenarioTimerId = null; }
    playSound(success ? 'click' : 'alarm');
    logInstructorEvent(message);
    AppState.emergencyScenario = null;
    AppState.scenarioStep = 0;
    AppState.scenarioTimeLeft = 0;
    toast((success ? '✅ ' : '⏱️ ') + message);
    renderModeUI('emergency');
}

// ---------- Component inspector ----------
function isInside(root, obj) {
    for (let o = obj; o; o = o.parent) if (o === root) return true;
    return false;
}

function findComponentInfo(mesh) {
    const M = MODEL_MESH_COMPONENTS;
    for (let o = mesh; o; o = o.parent) if (o.name && M[o.name]) return M[o.name];
    const lower = (mesh.name || '').toLowerCase();
    const key = Object.keys(M).find(k => lower.includes(k.toLowerCase()));
    if (key) return M[key];
    if (mesh.name === 'Wire_Falls') return LIFEBOAT_COMPONENTS.find(c => c.id === 'falls');
    if (davitModel && isInside(davitModel, mesh)) return LIFEBOAT_COMPONENTS.find(c => c.id === 'davit');
    const pretty = (mesh.name || '').replace(/[_.]/g, ' ').replace(/\d+$/, '').trim() || 'Lifeboat part';
    return {
        name: pretty, category: 'Lifeboat component',
        function: 'Part of the lifeboat assembly.',
        location: 'Lifeboat structure',
        importance: 'Contributes to the safe launch and operation of the craft.',
        safetyNote: 'Inspect for damage, corrosion and secure fittings before every launch.'
    };
}

function highlightComponent(mesh) {
    if (selectedMesh) selectedMesh.material = originalMaterial;
    selectedMesh = mesh;
    originalMaterial = mesh.material;
    const m = mesh.material.clone();
    if (m.emissive) { m.emissive.setHex(0x0a84ff); m.emissiveIntensity = 0.7; } else m.color.setHex(0x0a84ff);
    mesh.material = m;
    playSound('click');
    showComponentDetails(mesh);
}

function showComponentDetails(mesh) {
    const box = document.getElementById('component-details');
    if (!box) return;
    const i = findComponentInfo(mesh);
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

function clearComponentSelection() {
    if (selectedMesh) { selectedMesh.material = originalMaterial; selectedMesh = null; }
    const box = document.getElementById('component-details');
    if (box) box.innerHTML = '<h3>Component details</h3><p class="muted">Tap any part of the lifeboat or davit to see what it does.</p>';
}

// ---------- Telemetry ----------
function updateTelemetryUI() {
    const $ = id => document.getElementById(id);
    const speed = $('tel-speed');
    if (!speed) return;
    const set = (el, txt, color) => {
        if (!el) return;
        if (el.textContent !== txt) el.textContent = txt;
        if (color && el.dataset.c !== color) { el.style.color = color; el.dataset.c = color; }
    };
    const drop = BOAT_CONFIG.stowed.y - boatPos.y;
    const total = BOAT_CONFIG.stowed.y - BOAT_CONFIG.waterborne.y;
    set(speed, (launchVelocity * 10).toFixed(2) + ' m/s');
    set($('tel-rope'), drop.toFixed(2) + ' m');
    set($('tel-dist'), Math.max(0, boatPos.y + 0.7).toFixed(2) + ' m');
    if (isWaterborne) set($('tel-brake'), 'WATERBORNE', 'var(--cyan)');
    else if (isLowering) set($('tel-brake'), 'RELEASED', 'var(--orange)');
    else set($('tel-brake'), 'LOCKED', 'var(--text-main)');
    set($('tel-engine'), AppState.engineStarted ? 'RUNNING' : 'OFF', AppState.engineStarted ? 'var(--green)' : 'var(--red)');
    set($('tel-hooks'), AppState.hooksReleased ? 'RELEASED' : 'LOCKED', AppState.hooksReleased ? 'var(--cyan)' : 'var(--orange)');
    const bar = $('tel-progress');
    if (bar) {
        const w = Math.max(0, Math.min(100, (drop / total) * 100)).toFixed(1) + '%';
        if (bar.style.width !== w) bar.style.width = w;
    }
}

// ---------- Mode cards ----------
function renderModeUI(mode) {
    AppState.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const area = document.getElementById('mode-interactive-area');
    if (!area) return;
    if (mode === 'quiz') { launchQuizModule(); return; }

    const sw = (on, fn) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" onclick="${fn}"></button>`;
    let html = '';

    if (mode === 'explore') {
        const dirty = isLowering || isWaterborne || AppState.hooksReleased;
        html = `<div class="ui-card">
            <h3>Explore</h3>
            <h2 class="card-title">Tap anything.</h2>
            <p class="muted">Select any part of the lifeboat or davit to read its SOLAS specs. Drag to orbit, scroll to zoom.</p>
            ${dirty ? `<div class="btn-row"><button class="action-btn secondary" onclick="resetSimulationState()">Reset to stowed</button></div>` : ''}
        </div>`;
    } else if (mode === 'inspection') {
        const zones = Object.keys(CHECKLIST_STRUCTURE);
        const all = zones.flatMap(k => CHECKLIST_STRUCTURE[k].items);
        const st = id => AppState.checklistStatus[id];
        const done = all.filter(i => st(i.id)).length;
        const fails = all.filter(i => st(i.id) === 'FAIL').length;
        const zone = CHECKLIST_STRUCTURE[AppState.activeZone];
        html = `<div class="ui-card">
            <h3>Walkaround checklist</h3>
            <h2 class="card-title">${done} of ${all.length} checked
                ${done === all.length ? (fails ? `<span class="chip red">${fails} to fix</span>` : '<span class="chip green">All clear</span>') : ''}</h2>
            <div class="bar"><i style="width:${(done / all.length) * 100}%"></i></div>
            <div class="seg">${zones.map(k => `<button class="seg-btn ${AppState.activeZone === k ? 'active' : ''}" onclick="setChecklistZone('${k}')">${CHECKLIST_STRUCTURE[k].title.split(':')[0]}</button>`).join('')}</div>
            <p class="muted" style="margin-top:12px;font-weight:600;color:var(--text-main);">${zone.title.split(': ')[1]}</p>
            <div class="list">${zone.items.map(it => `
                <div class="row">
                    <div><b>${it.name}</b><small>${it.detail}</small></div>
                    <div class="pf">
                        <button class="pass ${st(it.id) === 'PASS' ? 'sel' : ''}" onclick="setChecklistItemStatus('${it.id}','PASS')">✓</button>
                        <button class="fail ${st(it.id) === 'FAIL' ? 'sel' : ''}" onclick="setChecklistItemStatus('${it.id}','FAIL')">✕</button>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    } else if (mode === 'launch') {
        const s = LAUNCH_STEPS[AppState.launchStep];
        html = `<div class="ui-card">
            <h3>Launch console · Step ${s.step} of ${LAUNCH_STEPS.length}</h3>
            <div class="steps">${LAUNCH_STEPS.map((_, i) => `<i class="${i <= AppState.launchStep ? 'done' : ''}"></i>`).join('')}</div>
            <h2 class="card-title">${s.title}</h2>
            <p class="muted">${s.desc}</p>
            <div class="btn-row">
                <button class="action-btn secondary" onclick="advanceLaunchStage(-1)" ${AppState.launchStep === 0 ? 'disabled' : ''}>Back</button>
                <button class="action-btn" onclick="advanceLaunchStage(1)" ${AppState.launchStep === LAUNCH_STEPS.length - 1 ? 'disabled' : ''}>Next</button>
            </div>
            <div class="list">
                <div class="row"><div><b>Winch brake</b><small>${isLowering ? 'Released, boat is lowering' : 'Locked'}</small></div>${sw(isLowering, 'toggleWinchBrake()')}</div>
                <div class="row"><div><b>Diesel engine</b><small>${AppState.engineStarted ? 'Running' : 'Off'}</small></div>${sw(AppState.engineStarted, 'toggleLifeboatEngine()')}</div>
                <div class="row"><div><b>Off-load hooks</b><small>${AppState.hooksReleased ? 'Released' : 'Locked until waterborne'}</small></div>${sw(AppState.hooksReleased, 'toggleOffLoadHooks()')}</div>
            </div>
            <div class="btn-row"><button class="action-btn secondary" onclick="resetSimulationState()">Reset launch</button></div>
        </div>`;
    } else if (mode === 'emergency') {
        if (!AppState.emergencyScenario) {
            html = `<div class="ui-card">
                <h3>Crisis drills</h3>
                <h2 class="card-title">Pick a scenario.</h2>
                <p class="muted">You get 30 seconds to complete every response step.</p>
                <div class="list">
                    <button class="row btn" onclick="startEmergencyScenario('power_loss')"><div><b>🔌 Power loss</b><small>Lowering without auxiliary power</small></div></button>
                    <button class="row btn" onclick="startEmergencyScenario('cable_jam')"><div><b>⛓️ Cable jam</b><small>Unbalanced falls and list</small></div></button>
                    <button class="row btn" onclick="startEmergencyScenario('rough_seas')"><div><b>🌊 Rough seas</b><small>High swell at water contact</small></div></button>
                </div>
            </div>`;
        } else {
            const sc = EMERGENCY_DATA[AppState.emergencyScenario];
            const n = sc.steps.length;
            html = `<div class="ui-card">
                <h3>${sc.title} · Step ${AppState.scenarioStep + 1} of ${n}</h3>
                <div class="ring">
                    <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="52"/><circle class="ring-fg" cx="60" cy="60" r="52" style="animation-delay:-${30 - AppState.scenarioTimeLeft}s"/></svg>
                    <span id="scen-timer-val">${AppState.scenarioTimeLeft}s</span>
                </div>
                <div class="steps">${sc.steps.map((_, i) => `<i class="${i <= AppState.scenarioStep ? 'done' : ''}"></i>`).join('')}</div>
                <h2 class="card-title" style="font-size:17px;">${sc.steps[AppState.scenarioStep]}</h2>
                <div class="btn-row"><button class="action-btn danger" onclick="advanceScenarioStep()">Done, next step</button></div>
            </div>`;
        }
    }
    area.innerHTML = html;
}

// ---------- Quiz (options are shuffled: every answer in app.js was option A) ----------
let quizOrder = [];

function renderQuizFocusOverlay() {
    let o = document.getElementById('quiz-focus-overlay');
    if (!o) {
        o = document.createElement('div');
        o.id = 'quiz-focus-overlay';
        o.className = 'quiz-overlay';
        document.body.appendChild(o);
    }
    o.style.display = 'flex';
    const q = QUIZ_QUESTIONS[AppState.quizIndex], n = QUIZ_QUESTIONS.length;
    quizOrder = q.options.map((_, i) => i);
    for (let i = quizOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizOrder[i], quizOrder[j]] = [quizOrder[j], quizOrder[i]];
    }
    o.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="category-tag">SOLAS Chapter III</span><button class="seg-btn" onclick="closeQuizModule()">Done</button></div>
        <div class="bar"><i style="width:${(AppState.quizIndex / n) * 100}%"></i></div>
        <div class="quiz-meta"><span>Question ${AppState.quizIndex + 1} of ${n}</span><span>Score ${AppState.score}</span></div>
        <h2 class="quiz-q">${q.q}</h2>
        <div class="quiz-options">${quizOrder.map((oi, i) => `<button class="quiz-option-btn" onclick="handleQuizAnswer(${i})">${q.options[oi]}</button>`).join('')}</div>
        <div id="quiz-explanation" class="callout" style="display:none;"></div>
        <button id="quiz-next-btn" class="action-btn" style="display:none;" onclick="nextQuizQuestion()">${AppState.quizIndex === n - 1 ? 'See results' : 'Continue'}</button>
    </div>`;
}

function handleQuizAnswer(i) {
    if (AppState.quizAnswered) return;
    AppState.quizAnswered = true;
    const q = QUIZ_QUESTIONS[AppState.quizIndex];
    const right = quizOrder.indexOf(q.ans), ok = i === right;
    if (ok) { AppState.score++; playSound('click'); } else playSound('alarm');
    document.querySelectorAll('.quiz-option-btn').forEach((b, k) => {
        b.disabled = true;
        if (k === right) b.classList.add('correct'); else if (k === i) b.classList.add('incorrect');
    });
    const e = document.getElementById('quiz-explanation');
    e.style.display = 'block';
    e.innerHTML = `<strong>${ok ? '✅ Correct.' : '❌ Not quite.'}</strong> ${q.exp}`;
    document.getElementById('quiz-next-btn').style.display = 'block';
}

function renderQuizResults() {
    const o = document.getElementById('quiz-focus-overlay');
    if (!o) return;
    const n = QUIZ_QUESTIONS.length, pct = Math.round((AppState.score / n) * 100);
    const passed = AppState.score >= Math.ceil(n * 0.7);
    o.innerHTML = `<div class="quiz-card" style="text-align:center;">
        <span class="chip ${passed ? 'green' : 'red'}" style="align-self:center;">${passed ? 'Passed' : 'Review needed'}</span>
        <div class="quiz-score">${pct}%</div>
        <p class="muted" style="margin:0;">${AppState.score} of ${n} correct. ${passed ? 'Strong grasp of SOLAS Chapter III launch procedures.' : 'You need 70% to pass. Review the checklists and try again.'}</p>
        <div class="btn-row">
            <button class="action-btn secondary" onclick="closeQuizModule()">Back to simulator</button>
            <button class="action-btn" onclick="launchQuizModule()">Retake</button>
        </div>
    </div>`;
}