// js/waves.js — sea-state adjuster.
// Gives you a Waves slider (Douglas sea state 0-8) that drives how much the ship and the waterborne lifeboat
// rock, plus the chop of the sea shading. app.js calls SEA.motion() and SEA.boatMotion() (see the patch).
// Load AFTER sky.js / lighting.js / motion.js.
(function () {
    const TAU = Math.PI * 2, D = Math.PI / 180;
    const HS = [0, 0.05, 0.3, 0.9, 1.9, 3.2, 5, 7.5, 11];   // significant wave height (m) for sea state 0..8
    const NAMES = ['Calm (glassy)', 'Calm (rippled)', 'Smooth', 'Slight', 'Moderate', 'Rough', 'Very rough', 'High', 'Very high'];
    const WEATHER_LEVEL = { day: 2, night: 3, storm: 6.5 };   // used while "Follow weather" is on

    const hsOf = l => { const i = Math.min(7, Math.floor(l)); return HS[i] + (HS[i + 1] - HS[i]) * (l - i); };
    const S = (t, T, ph) => Math.sin(TAU * t / T + ph);
    const state = { target: 3, cur: 3, follow: true, last: 0 };

    // Ease toward the chosen level so changing the slider never makes the ship jump
    function step(t) {
        const dt = Math.min(0.1, Math.max(0, t - state.last)); state.last = t;
        state.cur += (state.target - state.cur) * (1 - Math.exp(-dt * 1.5));
    }

    // Peak angles / heave for a ship of this size at a given wave height
    const shipAmp = hs => ({ roll: Math.min(18, 2.2 * hs), pitch: Math.min(7, 0.75 * hs), heave: Math.min(1.8, 0.32 * hs) });

    function tuneSea(hs) {
        if (typeof water === 'undefined' || !water || !water.material) return;
        const u = water.material.uniforms;
        if (u.distortionScale) u.distortionScale.value = Math.min(14, 1 + hs);       // choppier surface
        if (u.size) u.size.value = Math.max(0.4, 1 - hs * 0.06);                      // longer, bigger ripples
    }

    window.SEA = {
        get level() { return state.target; },
        setLevel(l) { state.target = Math.max(0, Math.min(8, +l || 0)); },

        // Ship: three overlapping wave periods (long roll, medium pitch/heave) and a slow "wave group" swell,
        // so the motion never repeats exactly. Rolls a little more than it pitches, like a real ship.
        motion(t) {
            step(t);
            const hs = hsOf(state.cur), a = shipAmp(hs), g = 0.8 + 0.2 * S(t, 29, 0.4);
            tuneSea(hs);
            return {
                roll:  (a.roll * g * (S(t, 11.3, 0) + 0.45 * S(t, 7.1, 1.7) + 0.25 * S(t, 17.9, 3.1)) / 1.7 + hs * 0.12) * D,   // + small steady heel in rough seas
                pitch: a.pitch * g * (S(t, 7.9, 0.6) + 0.4 * S(t, 5.3, 2.2) + 0.2 * S(t, 12.4, 4)) / 1.6 * D,
                heave: a.heave * g * (S(t, 8.3, 1.1) + 0.4 * S(t, 5.7, 0) + 0.25 * S(t, 13.1, 2.6)) / 1.65
            };
        },

        // Lifeboat in the water: small boats move faster and more than the ship
        boatMotion(t) {
            step(t);
            const hs = hsOf(state.cur);
            return {
                y:     Math.min(0.45, 0.03 + 0.2 * hs) * (S(t, 5.6, 0) + 0.4 * S(t, 3.7, 1)) / 1.4,
                roll:  Math.min(25, 1 + 4 * hs) * (S(t, 6.8, 0.5) + 0.4 * S(t, 4.1, 2)) / 1.4 * D,
                pitch: Math.min(14, 0.8 + 2.6 * hs) * (S(t, 5.2, 1.3) + 0.35 * S(t, 3.3, 0)) / 1.35 * D
            };
        }
    };

    // ---------------------------------------------------------------- UI
    const g = id => document.getElementById(id);
    const css = document.createElement('style');
    css.textContent = `
    #wave-pop{position:fixed;left:12px;top:64px;z-index:30;width:292px;max-width:calc(100vw - 24px);padding:14px 16px 12px;border-radius:18px;color:#fff;background:rgba(28,28,30,.86);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:.5px solid rgba(255,255,255,.2);box-shadow:0 10px 30px rgba(0,0,0,.35);display:none;font-size:13px}
    #wave-pop.open{display:block}
    #wave-pop h4{margin:0 0 2px;font-size:15px}
    #wave-pop .wv-name{color:rgba(255,255,255,.7);margin-bottom:10px}
    #wave-pop input[type=range]{width:100%;accent-color:var(--blue,#0a84ff);margin:2px 0 6px}
    #wave-pop .wv-scale{display:flex;justify-content:space-between;font-size:10.5px;color:rgba(255,255,255,.55)}
    #wave-pop .wv-stats{display:flex;justify-content:space-between;margin:12px 0;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.08);font-variant-numeric:tabular-nums}
    #wave-pop .wv-stats b{display:block;font-size:14px}
    #wave-pop .wv-stats span{font-size:10.5px;color:rgba(255,255,255,.6)}
    #wave-pop .wv-presets{display:flex;gap:6px}
    #wave-pop .wv-presets button{flex:1;border:0;border-radius:99px;padding:8px 4px;background:rgba(255,255,255,.14);color:#fff;font-weight:600;font-size:12px;cursor:pointer}
    #wave-pop .wv-presets button:hover{background:var(--blue,#0a84ff)}
    #wave-pop label{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:rgba(255,255,255,.8);cursor:pointer}
    #wave-pop .wv-warn{margin-top:10px;padding:8px 10px;border-radius:10px;background:rgba(255,159,10,.18);color:#ffb340;font-size:11.5px;display:none}`;
    document.head.appendChild(css);

    const pop = document.createElement('div');
    pop.id = 'wave-pop';
    pop.innerHTML = `
        <h4>Sea state</h4>
        <div class="wv-name" id="wv-name"></div>
        <input type="range" id="wv-range" min="0" max="8" step="0.1" aria-label="Sea state">
        <div class="wv-scale"><span>Calm</span><span>Moderate</span><span>Very high</span></div>
        <div class="wv-stats">
            <div><b id="wv-hs">0</b><span>wave height</span></div>
            <div><b id="wv-roll">0</b><span>ship roll</span></div>
            <div><b id="wv-pitch">0</b><span>ship pitch</span></div>
        </div>
        <div class="wv-presets">
            <button data-l="1">Calm</button><button data-l="3">Slight</button><button data-l="5">Rough</button><button data-l="7">Heavy</button>
        </div>
        <label><input type="checkbox" id="wv-follow" checked> Follow weather (Day / Night / Storm)</label>
        <div class="wv-warn" id="wv-warn">Launching in this sea state is hazardous. Real crews would delay unless it is an emergency.</div>`;
    document.body.appendChild(pop);

    function refresh() {
        const l = state.target, hs = hsOf(l), a = shipAmp(hs);
        g('wv-range').value = l;
        g('wv-name').textContent = `State ${l.toFixed(1)} · ${NAMES[Math.round(l)]}`;
        g('wv-hs').textContent = hs < 0.1 ? '< 0.1 m' : `≈ ${hs.toFixed(1)} m`;
        g('wv-roll').textContent = `±${a.roll.toFixed(1)}°`;
        g('wv-pitch').textContent = `±${a.pitch.toFixed(1)}°`;
        g('wv-warn').style.display = l >= 5.5 ? 'block' : 'none';
        g('wv-follow').checked = state.follow;
    }

    function setLevel(l, manual) {
        SEA.setLevel(l);
        if (manual) state.follow = false;
        refresh();
    }

    g('wv-range').addEventListener('input', e => setLevel(e.target.value, true));
    g('wv-range').addEventListener('change', e => {
        if (typeof logInstructorEvent === 'function') logInstructorEvent(`Sea state set to ${(+e.target.value).toFixed(1)} (${NAMES[Math.round(e.target.value)]})`);
    });
    pop.querySelectorAll('.wv-presets button').forEach(b => b.addEventListener('click', () => {
        setLevel(b.dataset.l, true);
        if (typeof logInstructorEvent === 'function') logInstructorEvent(`Sea state preset: ${b.textContent}`);
    }));
    g('wv-follow').addEventListener('change', e => {
        state.follow = e.target.checked;
        if (state.follow && typeof currentEnv !== 'undefined') setLevel(WEATHER_LEVEL[currentEnv] ?? 3, false);
    });

    // Top-bar button
    const bar = document.querySelector('.top-bar');
    const btn = document.createElement('button');
    btn.id = 'waves-toggle-btn';
    btn.className = 'pill-btn';
    btn.title = 'Sea state (W)';
    btn.innerHTML = '🌊<span>Waves</span>';
    if (bar) bar.insertBefore(btn, g('labels-toggle-btn') || g('flashlight-toggle-btn'));
    const toggle = () => { pop.classList.toggle('open'); btn.classList.toggle('on', pop.classList.contains('open')); };
    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    addEventListener('pointerdown', e => {
        if (pop.classList.contains('open') && !pop.contains(e.target) && !btn.contains(e.target)) toggle();
    });
    addEventListener('keydown', e => { if ((e.key === 'w' || e.key === 'W') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) toggle(); });

    // Weather buttons move the slider while "Follow weather" is on
    if (typeof setPortalEnv === 'function') {
        const _set = setPortalEnv;
        setPortalEnv = function (mode, b) {
            _set(mode, b);
            if (state.follow && WEATHER_LEVEL[mode] !== undefined) setLevel(WEATHER_LEVEL[mode], false);
        };
    }

    const start = (typeof currentEnv !== 'undefined' && WEATHER_LEVEL[currentEnv]) || 3;
    state.target = state.cur = start;
    refresh();
})();