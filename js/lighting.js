// js/lighting.js — more realistic lighting. Load AFTER features.js.
// Adds: filmic tone mapping, soft shadows, a sky-based reflection map (glossy hull highlights),
// and a sun/moon + sky-fill rig that changes with Day / Night / Storm.
// It switches off the old ambient / hemisphere / directional lights. The flashlight (spot light) is untouched.

(function boot() {
    // app.js builds the scene on DOMContentLoaded, after this script runs, so wait until it exists
    if (typeof scene === 'undefined' || !scene || typeof renderer === 'undefined' || !renderer) { setTimeout(boot, 100); return; }

    const SRGB_OUTPUT = true;   // set to false if the colours look washed out

    // sun = main light, hemi = sky/ground fill, env = reflection sky, exp = exposure, envI = reflection strength
    const PRESETS = {
        day: {
            exp: 1.05, envI: 0.7,
            sun: { c: 0xffe6c4, i: 2.8, pos: [60, 38, 40] },
            hemi: { sky: 0xbfe2ff, gnd: 0x5b7388, i: 0.5 },
            env: { top: 0x3f9be8, hor: 0xe6f3ff, bot: 0x56768c, glow: 7 }
        },
        night: {
            exp: 0.9, envI: 0.45,
            sun: { c: 0x9db8ff, i: 0.85, pos: [-35, 55, -25] },
            hemi: { sky: 0x2b4170, gnd: 0x0a1020, i: 0.45 },
            env: { top: 0x030816, hor: 0x1b2d52, bot: 0x050a14, glow: 1.6 }
        },
        storm: {
            exp: 0.85, envI: 0.5,
            sun: { c: 0xcdd6de, i: 0.7, pos: [20, 55, 10] },
            hemi: { sky: 0x8d98a2, gnd: 0x2b3238, i: 0.55 },
            env: { top: 0x39434d, hor: 0x8d98a2, bot: 0x2a3036, glow: 0.8 }
        }
    };

    // ---- Renderer ----
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (SRGB_OUTPUT) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ---- Our own light rig ----
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 250; sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    sun.userData.mine = hemi.userData.mine = true;
    scene.add(sun, sun.target, hemi);

    // ---- Reflection sky (rendered once per weather, then cached) ----
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envCache = {};
    function skyTexture(name) {
        if (envCache[name]) return envCache[name];
        const p = PRESETS[name], e = new THREE.Scene();
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(50, 32, 16),
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                uniforms: { top: { value: new THREE.Color(p.env.top) }, hor: { value: new THREE.Color(p.env.hor) }, bot: { value: new THREE.Color(p.env.bot) } },
                vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
                fragmentShader: 'uniform vec3 top,hor,bot; varying vec3 p; void main(){ float h = p.y; vec3 c = h > 0. ? mix(hor, top, pow(h, .55)) : mix(hor, bot, pow(-h, .5)); gl_FragColor = vec4(c, 1.);\n#include <encodings_fragment>\n}'
            }));
        const d = new THREE.Vector3(...p.sun.pos).normalize().multiplyScalar(40);
        const disc = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(p.sun.c).multiplyScalar(p.env.glow) }));
        disc.position.copy(d);
        e.add(dome, disc);
        return (envCache[name] = pmrem.fromScene(e, 0, 0.1, 100).texture);
    }

    // ---- Apply a weather preset ----
    let current = 'day';
    function apply(name) {
        const p = PRESETS[name]; if (!p) return;
        current = name;
        renderer.toneMappingExposure = p.exp;
        sun.color.setHex(p.sun.c); sun.intensity = p.sun.i; sun.position.set(...p.sun.pos);
        hemi.color.setHex(p.hemi.sky); hemi.groundColor.setHex(p.hemi.gnd); hemi.intensity = p.hemi.i;
        scene.environment = skyTexture(name);
        if (window.SOLAS_SKY) SOLAS_SKY.set(name, p);
        pass(true);
    }

    function inClouds(o) {
        if (typeof cloudsGroup === 'undefined' || !cloudsGroup) return false;
        for (let p = o; p; p = p.parent) if (p === cloudsGroup) return true;
        return false;
    }

    // Walk the scene: kill old lights, enable shadows, set reflection strength
    function pass(force) {
        const p = PRESETS[current];
        scene.traverse(o => {
            if (o.isLight && !o.userData.mine && (o.isAmbientLight || o.isHemisphereLight || o.isDirectionalLight)) o.visible = false;
            if (!o.isMesh || !o.material) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            if (mats.some(m => m.type === 'ShaderMaterial') || /water|sea|ocean/i.test(o.name || '')) return;   // leave the sea alone
            if (mats.some(m => m.isMeshBasicMaterial) || inClouds(o)) return;   // no shadows from lights, foam, clouds
            if (!o.userData.lit || force) {
                if (!mats.some(m => m.transparent && m.opacity < 0.5)) o.castShadow = true;
                o.receiveShadow = true;
                mats.forEach(m => {
                    if (m.isMeshStandardMaterial) m.envMapIntensity = p.envI;
                    if (!o.userData.lit) m.needsUpdate = true;
                });
                o.userData.lit = true;
            }
        });
    }

    // ---- Follow the Day / Night / Storm buttons ----
    if (typeof setPortalEnv === 'function') {
        const _set = setPortalEnv;
        setPortalEnv = function (mode, btn) { _set(mode, btn); apply(mode); };
    }
    window.SOLAS_LIGHT = { presets: PRESETS, get current() { return current; } };
    apply(typeof currentEnv !== 'undefined' ? currentEnv : 'day');

    // Models load late, so keep picking up new meshes
    let n = 0;
    (function loop() { requestAnimationFrame(loop); if (++n % 45 === 0) pass(false); })();
})();