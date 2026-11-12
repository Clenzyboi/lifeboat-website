// js/landing.js — welcome screen behaviour. Load last.
(function () {
    const root = document.getElementById('portal-landing-page');
    if (!root) return;
    const $ = id => document.getElementById(id);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- 1) Animated night sea behind everything ----
    const cv = $('lp-sea'), ctx = cv.getContext('2d');
    let W, H, dpr, mx = .5;
    const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random() * .55, r: Math.random() * 1.4 + .3, p: Math.random() * 3 + .5 }));
    const layers = [
        { y: .60, a: 9, f: .0042, s: .45, c: '#0f4d6b' },
        { y: .69, a: 13, f: .0033, s: .75, c: '#0b3a55' },
        { y: .79, a: 17, f: .0026, s: 1.0, c: '#082a42' },
        { y: .90, a: 20, f: .0021, s: 1.3, c: '#051c30' }
    ];
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; }
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth; });

    function draw(now) {
        requestAnimationFrame(draw);
        const cs = getComputedStyle(root);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;   // paused while the sim is open
        const t = reduce ? 0 : now / 1000;
        const sky = ctx.createLinearGradient(0, 0, 0, H * .72);
        sky.addColorStop(0, '#030a18'); sky.addColorStop(.55, '#0a2a49'); sky.addColorStop(1, '#2a7f95');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        for (const s of stars) {
            ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * s.p * .5 + s.x * 9));
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r * dpr, 0, 6.3); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const mxp = W * (.78 + (mx - .5) * .03), myp = H * .2;
        const g = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, 150 * dpr);
        g.addColorStop(0, 'rgba(255,244,214,.9)'); g.addColorStop(.12, 'rgba(255,244,214,.9)'); g.addColorStop(.13, 'rgba(255,230,170,.18)'); g.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = g; ctx.fillRect(mxp - 160 * dpr, myp - 160 * dpr, 320 * dpr, 320 * dpr);
        layers.forEach((L, i) => {
            ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(0, H);
            for (let x = 0; x <= W + 8; x += 8 * dpr)
                ctx.lineTo(x, H * L.y + Math.sin(x * L.f / dpr + t * L.s + (mx - .5) * 2 * (i + 1)) * L.a * dpr + Math.sin(x * L.f * 2.3 / dpr - t * L.s * .7) * L.a * .35 * dpr);
            ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        });
    }
    requestAnimationFrame(draw);

    // ---- 2) Typewriter headline ----
    const el = $('lp-type');
    const phrases = ['Beat the 30-second clock.', 'Survive the storm.', 'Release the hooks.', 'Keep your seat.'];
    if (reduce) el.textContent = phrases[0];
    else {
        let pi = 0, ci = 0, del = false;
        (function tick() {
            const p = phrases[pi];
            ci += del ? -1 : 1; el.textContent = p.slice(0, ci);
            let d = del ? 26 : 55;
            if (!del && ci === p.length) { del = true; d = 1500; }
            else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; d = 350; }
            setTimeout(tick, d);
        })();
    }

    // ---- 3) Hero boat tilts toward the pointer ----
    const boat = root.querySelector('.lp-boat');
    if (boat && !reduce) {
        boat.addEventListener('pointermove', e => {
            const r = boat.getBoundingClientRect();
            boat.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg');
            boat.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg');
        });
        boat.addEventListener('pointerleave', () => { boat.style.setProperty('--ry', '0deg'); boat.style.setProperty('--rx', '0deg'); });
    }

    // ---- 4) Count-up stats ----
    function count(n) {
        const to = +n.dataset.to, t0 = performance.now();
        (function step(now) {
            const k = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - k, 3);
            n.textContent = Math.round(to * e);
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.dataset.to) count(e.target); else e.target.classList.add('in');
    }), { root, threshold: .25 }) : null;
    root.querySelectorAll('[data-to]').forEach(n => io ? io.observe(n) : (n.textContent = n.dataset.to));
    root.querySelectorAll('.lp-rv').forEach((n, i) => { n.style.transitionDelay = (i % 5) * 80 + 'ms'; io ? io.observe(n) : n.classList.add('in'); });

    // ---- 5) Did you know ----
    const facts = [
        'A totally enclosed lifeboat is designed to be self-righting, so it comes back upright even if it capsizes.',
        'SOLAS lifeboats must be able to motor at 6 knots for 24 hours. That is why you start the engine before the boat touches water.',
        'Releasing the hooks while the boat is still in the air is a leading cause of lifeboat fatalities. A hydrostatic interlock stops it.',
        'IMO circular MSC.1/Circ.1206 exists because many lifeboat accidents happen during drills and maintenance, not real emergencies.'
    ];
    const fp = $('lp-fact-text'), ft = root.querySelector('.lp-timer i');
    let fi = 0;
    function showFact() {
        fp.classList.add('out');
        setTimeout(() => {
            fp.textContent = facts[fi]; fp.classList.remove('out');
            ft.classList.remove('run'); void ft.offsetWidth; ft.classList.add('run');
            fi = (fi + 1) % facts.length;
        }, 350);
    }
    showFact(); setInterval(showFact, 6000);
})();