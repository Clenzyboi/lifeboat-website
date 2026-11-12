// js/sky.js — gradient sky dome with sun glow, drifting clouds and night stars.
// The sea reflects it, so the whole environment looks lit by the same sky. Load BEFORE lighting.js.
(function boot() {
    // app.js builds the scene on DOMContentLoaded, after this script runs, so wait until it exists
    if (typeof scene === 'undefined' || !scene || typeof camera === 'undefined' || !camera) { setTimeout(boot, 100); return; }
    const WATER_FOG = true;   // lets the far sea fade into the horizon haze. Set false if the sea ever looks broken.

    // top/hor = sky colours, sun = glow colour, disk = sun/moon brightness, cover = cloud amount,
    // dark = cloud darkness, lum = cloud brightness, stars, water = sea tint, chop = wave distortion
    const SKY = {
        day:   { top: 0x2f7fd0, hor: 0xcfe6f7, sun: 0xffe2b0, disk: 10,  cover: .45, dark: 0,   lum: 1,   stars: 0,   water: 0x0b4f6c, chop: 3 },
        night: { top: 0x020611, hor: 0x14233f, sun: 0xaec4ff, disk: 2.5, cover: .30, dark: .6,  lum: .1,  stars: 1.2, water: 0x020a14, chop: 2 },
        storm: { top: 0x2b333b, hor: 0x77838d, sun: 0xb8c2cc, disk: 0,   cover: .95, dark: .8,  lum: .45, stars: 0,   water: 0x1d2d36, chop: 6 }
    };

    const U = {
        top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
        disk: { value: 1 }, cover: { value: .4 }, dark: { value: 0 }, lum: { value: 1 }, stars: { value: 0 }, time: { value: 0 }
    };

    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, uniforms: U,
        vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `
            uniform vec3 top, hor, sunDir, sunCol;
            uniform float disk, cover, dark, lum, stars, time;
            varying vec3 d;
            float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
                return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
            float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= .5; } return v; }
            void main(){
                vec3 dir = normalize(d);
                float y = max(dir.y, 0.);
                vec3 col = mix(hor, top, pow(y, .5));
                float sd = max(dot(dir, normalize(sunDir)), 0.);
                col += sunCol * (pow(sd, 6.) * .22 + pow(sd, 64.) * .55) * (1. - dark * .8);
                col += sunCol * smoothstep(.9992, .9996, sd) * disk;
                col += vec3(step(.997, h(floor(dir.xz / (dir.y + .3) * 220.)))) * stars * smoothstep(.05, .3, dir.y);
                if (dir.y > .02) {
                    vec2 uv = dir.xz / (dir.y + .25) * 1.6 + vec2(time * .012, time * .006);
                    float c = smoothstep(1. - cover, 1. - cover + .35, fbm(uv));
                    vec3 cc = mix(vec3(1.), vec3(.35, .38, .42), dark) * lum;
                    cc = mix(cc, cc + sunCol * .5, pow(sd, 4.) * (1. - dark));
                    col = mix(col, cc, c * smoothstep(.02, .25, dir.y) * .9);
                }
                gl_FragColor = vec4(col, 1.);
                #include <tonemapping_fragment>
                #include <encodings_fragment>
            }`
    }));
    dome.frustumCulled = false;
    dome.renderOrder = -1000;
    dome.scale.setScalar(Math.max(100, camera.far * 0.5));
    dome.userData.mine = true;
    scene.add(dome);

    function findWater() {
        if (typeof water !== 'undefined' && water && water.material) return water;
        let f = null;
        scene.traverse(o => { if (!f && o.material && o.material.uniforms && o.material.uniforms.normalSampler) f = o; });
        return f;
    }

    let cur = 'day', waterDone = false;
    function applyWater() {
        const w = findWater();
        if (!w) return false;
        const u = w.material.uniforms, p = SKY[cur];
        if (WATER_FOG && !w.material.fog && u.fogColor) { w.material.fog = true; w.material.needsUpdate = true; }
        if (u.sunDirection) u.sunDirection.value.copy(U.sunDir.value).normalize();
        if (u.sunColor) u.sunColor.value.setHex(p.sun);
        if (u.waterColor) u.waterColor.value.setHex(p.water);
        if (u.distortionScale) u.distortionScale.value = p.chop;
        return true;
    }

    // The sky dome now draws the sun, moon and clouds, so hide the old blobs and streaks from app.js
    function tidy() {
        [typeof sunMesh !== 'undefined' && sunMesh, typeof moonMesh !== 'undefined' && moonMesh,
         typeof cloudsGroup !== 'undefined' && cloudsGroup].forEach(o => { if (o) o.visible = false; });
    }
    if (typeof updateAerodynamicWindLines === 'function')
        updateAerodynamicWindLines = function () { if (typeof windLinesGroup !== 'undefined' && windLinesGroup) windLinesGroup.visible = false; };

    window.SOLAS_SKY = {
        findWater,
        set(name, lightPreset) {
            const p = SKY[name]; if (!p) return;
            cur = name;
            U.top.value.setHex(p.top); U.hor.value.setHex(p.hor); U.sunCol.value.setHex(p.sun);
            U.disk.value = p.disk; U.cover.value = p.cover; U.dark.value = p.dark; U.lum.value = p.lum; U.stars.value = p.stars;
            if (lightPreset) U.sunDir.value.set(...lightPreset.sun.pos).normalize();
            if (scene.fog && scene.fog.color) scene.fog.color.setHex(p.hor);   // haze matches the horizon
            waterDone = applyWater();
            tidy();
        }
    };
    if (window.SOLAS_LIGHT) SOLAS_SKY.set(SOLAS_LIGHT.current, SOLAS_LIGHT.presets[SOLAS_LIGHT.current]);

    let n = 0;
    (function loop() {
        requestAnimationFrame(loop);
        dome.position.copy(camera.position);
        U.time.value += 0.016;
        if (!waterDone && ++n % 30 === 0) waterDone = applyWater();   // sea may load after this script
    })();
})();