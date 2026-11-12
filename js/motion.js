// js/motion.js — bow wave and wake foam that hug the real hull outline and stream aft,
// so the ship reads as steaming through the water. Load AFTER sky.js / lighting.js.
// (The rocking itself is done in app.js: see the animate() patch.)
(function boot() {
    // app.js builds the scene on DOMContentLoaded, after this script runs, so wait until it exists
    if (typeof scene === 'undefined' || !scene || typeof hullHalfBreadth !== 'function' || typeof SHIP === 'undefined') { setTimeout(boot, 100); return; }

    const CFG = {
        speed: 6,        // m/s the foam slides aft (visual speed)
        bow: 33,         // z where the stem meets the water
        stern: -75,      // foam fades out here, about 40 m behind the ship
        streaks: 150
    };
    const SEA_Y = -0.7, CX = SHIP.x0;

    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const inst = new THREE.InstancedMesh(geo, mat, CFG.streaks);
    inst.frustumCulled = false;
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(inst);

    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const S = Array.from({ length: CFG.streaks }, () => ({}));
    function spawn(s, anywhere) {
        s.side = Math.random() < .5 ? -1 : 1;
        s.z = anywhere ? CFG.stern + Math.random() * (CFG.bow - CFG.stern) : CFG.bow;
        s.j = Math.pow(Math.random(), 1.4);          // 0 = hugging the hull, 1 = outer edge of the wake
        s.len = 1.2 + Math.random() * 4.5;
        s.wid = .07 + Math.random() * .16;
        s.v = .85 + Math.random() * .3;
        s.b = .2 + Math.random() * .45;
    }
    S.forEach((s, i) => { spawn(s, true); inst.setColorAt(i, col.setScalar(0)); });

    let bright = 1, speedK = 1;
    const MOOD = { day: [1, 1], night: [.4, 1], storm: [.85, 1.3] };
    function mood(m) { [bright, speedK] = MOOD[m] || MOOD.day; }
    if (typeof currentEnv !== 'undefined') mood(currentEnv);
    if (typeof setPortalEnv === 'function') {
        const _set = setPortalEnv;
        setPortalEnv = function (m, b) { _set(m, b); mood(m); };
    }

    let last = performance.now();
    (function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        const v = CFG.speed * speedK;
        for (let i = 0; i < S.length; i++) {
            const s = S[i];
            s.z -= v * s.v * dt;
            if (s.z < CFG.stern) spawn(s, false);
            const back = CFG.bow - s.z;                                   // distance aft of the stem
            const hb = hullHalfBreadth(s.z, SEA_Y);                       // real hull width at the waterline
            const gap = .12 + s.j * (.5 + back * .07);                    // wake widens astern
            const fade = Math.min(1, back / 4, (s.z - CFG.stern) / 25);   // soft start and end
            const bowBoost = 1 + 1.8 * Math.max(0, 1 - back / 12);        // brighter bow wave
            dummy.position.set(CX + s.side * (hb + gap), SEA_Y + .08, s.z);
            dummy.scale.set(s.wid, 1, s.len * (.7 + speedK * .3));
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
            inst.setColorAt(i, col.setScalar(Math.min(1, s.b * bright * bowBoost * Math.max(0, fade))));
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor.needsUpdate = true;
    })(last);
})();