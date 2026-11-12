// js/equipment.js — "What's inside the lifeboat": a clickable gallery of the 18 safety items,
// each with an interactive 3D model you can turn around. Load LAST (after features.js and the rest).
// Adds an "Inside" tab to the right panel. No edits to other files are needed.
(function () {
'use strict';

// ==========================================================================
// 1) THE ITEMS (numbers match your reference photo)
// ==========================================================================
const ITEMS = [
    { n: 1,  cat: 'Flotation', name: 'Immersion / work vest',
      what: 'An insulated orange vest with reflective patches, worn over clothing for work near water in cold seas.',
      use: 'Crew wear it on deck. It keeps you afloat and slows heat loss if you end up in the water.',
      check: 'Look for torn fabric, loose reflective tape and a working buckle.' },
    { n: 2,  cat: 'Rescue', name: 'Lifebuoy ring with grab line',
      what: 'A ring-shaped buoy with a line looped around the outside.',
      use: 'Throw it to a person in the water so they have something to hold on to.',
      check: 'The line is secure and not frayed. The reflective bands are intact.' },
    { n: 3,  cat: 'Rescue', name: 'Horseshoe lifebuoy',
      what: 'A U-shaped buoy that can be thrown or slipped over the head and arms.',
      use: 'Throw it close to the person in the water, then pull them in.',
      check: 'The foam is firm with no cracks, and the reflective strips are present.' },
    { n: 4,  cat: 'Survival', name: 'Water container',
      what: 'A sealed yellow container of drinking water for the survival kit.',
      use: 'Water is rationed carefully. This simulator provisions 3 litres per person.',
      check: 'The lid seal is tight and the date on the label is valid.' },
    { n: 5,  cat: 'Survival', name: 'Danforth-type anchor',
      what: 'A light anchor with two flat flukes that dig into the seabed.',
      use: 'Holds the boat in place, for example to wait for rescue in shallow water.',
      check: 'The flukes move freely and the line is shackled on and undamaged.' },
    { n: 6,  cat: 'Signals', name: 'Black light / beacon housing',
      what: 'A rubber, watertight housing for a beacon or search light.',
      use: 'Makes the boat easier to find at night.',
      check: 'Batteries are in date, the lens is clean and the seals are watertight.' },
    { n: 7,  cat: 'Survival', name: 'First-aid / survival pack',
      what: 'A sealed pack of dressings and basic medical supplies.',
      use: 'Treat minor injuries until help arrives.',
      check: 'The pack is sealed and the contents list matches what is inside.' },
    { n: 8,  cat: 'Survival', name: 'Small boxed supply pack',
      what: 'A small boxed pack of survival supplies stowed in the locker.',
      use: 'Open it only when needed so the contents stay dry and in date.',
      check: 'The box is undamaged and the expiry date has not passed.' },
    { n: 9,  cat: 'Signals', name: 'Red-capped hand flare',
      what: 'A hand-held flare with a red cap.',
      use: 'Light it to show rescuers your position. Hold it at arm\'s length, pointing downwind. This simulator stocks six hand flares.',
      check: 'The cap is on, the tube is undamaged and it is in date.' },
    { n: 10, cat: 'Signals', name: 'Yellow signal tube',
      what: 'A hand-held signal in a yellow tube with a ridged grip.',
      use: 'Read the instructions printed on the tube before you use it.',
      check: 'The tube is intact, the markings are readable and the date is valid.' },
    { n: 11, cat: 'Signals', name: 'White / orange hand flare',
      what: 'A hand flare with a white cap and an orange body.',
      use: 'Used like any hand flare: hold it at arm\'s length, pointing away from the boat.',
      check: 'The cap is on, the tube is undamaged and it is in date.' },
    { n: 12, cat: 'Signals', name: 'Orange smoke signal',
      what: 'A tube that gives off bright orange smoke.',
      use: 'Best in daylight, when aircraft and ships can see the smoke from far away. This simulator stocks two.',
      check: 'The seal is intact and the date has not passed.' },
    { n: 13, cat: 'Rescue', name: 'Heaving line on reel',
      what: 'A light rope wound on a reel.',
      use: 'Throw the end to a person in the water or to another boat, then pull them in.',
      check: 'The rope runs freely off the reel with no cuts or knots.' },
    { n: 14, cat: 'Signals', name: 'Smoke canister (Seesmoke Mk3)',
      what: 'A large canister that gives off dense orange smoke.',
      use: 'Use it in daylight to mark your position for search aircraft and ships.',
      check: 'The lid is sealed, the canister is dry and the date is valid.' },
    { n: 15, cat: 'Signals', name: 'Orange canister (smoke / flare)',
      what: 'A sealed orange canister holding a signal.',
      use: 'Follow the label before use, and keep it dry until then.',
      check: 'The seal is intact and the date on the label is valid.' },
    { n: 16, cat: 'Flotation', name: 'Inflatable lifejacket, harness',
      what: 'A lifejacket that inflates automatically or by pulling a cord, with a built-in harness.',
      use: 'Clip the harness line to a strong point when working on deck. In the water, the bladder holds your face up.',
      check: 'The gas cylinder is full and in date, and the bladder has no leaks.' },
    { n: 17, cat: 'Flotation', name: 'Foam buoyancy vest',
      what: 'A vest filled with foam, so it floats without inflating.',
      use: 'It keeps you afloat straight away, which suits crew in small boats.',
      check: 'The foam is not crushed or waterlogged, and the straps and buckles work.' },
    { n: 18, cat: 'Flotation', name: 'Inflatable lifejacket, hooded',
      what: 'An inflatable lifejacket with a hood that shields your face from spray.',
      use: 'In rough seas the hood helps you breathe while waves break over you.',
      check: 'The gas cylinder is full and in date, the bladder has no leaks and the hood is stowed neatly.' }
];
const CATS = ['All', 'Flotation', 'Rescue', 'Signals', 'Survival'];

// ==========================================================================
// 2) 3D MODEL HELPERS
// ==========================================================================
// three r128 treats hex colours as linear, so convert from sRGB to keep the colours you pick
const mat = (c, r = 0.6, m = 0.05, o) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: r, metalness: m, envMapIntensity: 0.45 }, o));
const grp = () => new THREE.Group();
function put(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o;
}
const cyl = (g, rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32) => put(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
const box = (g, w, h, d, m, x = 0, y = 0, z = 0) => put(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);

// Soft, padded slab (rounded corners + bevel). Final size is exactly w x h x d.
function pad(g, w, h, d, r, m, x = 0, y = 0, z = 0) {
    const b = Math.min(0.08, d * 0.3), W = w - 2 * b, H = h - 2 * b;
    r = Math.max(0.01, Math.min(r, W / 2 - 0.01, H / 2 - 0.01));
    const a = -W / 2, c = -H / 2, s = new THREE.Shape();
    s.moveTo(a + r, c); s.lineTo(a + W - r, c); s.quadraticCurveTo(a + W, c, a + W, c + r);
    s.lineTo(a + W, c + H - r); s.quadraticCurveTo(a + W, c + H, a + W - r, c + H);
    s.lineTo(a + r, c + H); s.quadraticCurveTo(a, c + H, a, c + H - r);
    s.lineTo(a, c + r); s.quadraticCurveTo(a, c, a + r, c);
    const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o;
}

// Canvas label texture. lines = [[text, fontPx, y], ...]
function tex(lines, bg, fg, w = 1024, h = 300) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach(l => { x.font = `bold ${l[1]}px Arial, sans-serif`; x.fillText(l[0], w / 2, l[2]); });
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}

// ---- Vests (faces +z) ----
function vest(o) {
    const g = grp(), top = mat(o.top, 0.85), bot = mat(o.bot || o.top, 0.85), sh = o.sh ? mat(o.sh, 0.85) : top;
    const fx = o.fx || 0.62, fw = o.fw || 0.74;
    pad(g, 1.9, 1, 0.3, 0.14, top, 0, 0.5, -0.3); pad(g, 1.9, 1, 0.3, 0.14, bot, 0, -0.5, -0.3);
    [-1, 1].forEach(s => {
        pad(g, fw, 1, 0.36, 0.14, top, s * fx, 0.5, 0.3); pad(g, fw, 1, 0.36, 0.14, bot, s * fx, -0.5, 0.3);
        pad(g, 0.8, 0.3, 0.75, 0.12, sh, s * 0.62, 1.08, 0);
    });
    put(g, new THREE.TorusGeometry(0.36, 0.08, 10, 28), mat(o.collar || o.top, 0.8), 0, 1.12, 0, Math.PI / 2);
    if (o.belt) {
        box(g, 1.9, 0.12, 0.05, mat(o.belt, 0.7), 0, -0.45, 0.5);
        box(g, 0.22, 0.2, 0.07, mat(0xaab2bb, 0.3, 0.8), 0, -0.45, 0.54);
    }
    if (o.extra) o.extra(g);
    return g;
}
const black = () => mat(0x16181b, 0.7);

function vest1() {   // immersion / work vest
    return vest({ top: 0xf26a1b, collar: 0xe25a10, belt: 0x16181b, extra: g => {
        const s = mat(0xcfd6dc, 0.35, 0.5);
        [-1, 1].forEach(k => { box(g, 0.62, 0.14, 0.04, s, k * 0.62, 0.55, 0.5); box(g, 0.6, 0.03, 0.5, s, k * 0.62, 1.25, 0); });
        put(g, new THREE.TorusGeometry(0.4, 0.05, 8, 24, Math.PI), black(), 0, 1.05, -0.42);
    } });
}
function vest16() {  // inflatable lifejacket with harness
    return vest({ top: 0xf26a1b, bot: 0x16244d, fx: 0.72, fw: 0.5, collar: 0xf26a1b, extra: g => {
        const w = black();
        [-1, 1].forEach(k => {
            box(g, 0.08, 2, 0.04, w, k * 0.55, 0, 0.5);
            put(g, new THREE.BoxGeometry(0.08, 2.3, 0.04), w, 0, 0.05, -0.47, 0, 0, k * 0.45);
        });
        box(g, 1.3, 0.09, 0.04, w, 0, 0.3, 0.5);
        box(g, 0.2, 0.18, 0.06, mat(0xaab2bb, 0.3, 0.8), 0, 0.3, 0.53);
        put(g, new THREE.TorusGeometry(0.09, 0.025, 8, 16), mat(0xaab2bb, 0.3, 0.8), 0, 0.85, -0.5);
    } });
}
function vest17() {  // foam buoyancy vest
    return vest({ top: 0x6a84a4, bot: 0x44607f, sh: 0xf3cf2e, collar: 0x16181b, belt: 0x16181b, extra: g => {
        const p = mat(0x34495f, 0.85);
        [-1, 1].forEach(k => pad(g, 0.55, 0.42, 0.1, 0.05, p, k * 0.62, -0.7, 0.5));
        box(g, 0.04, 2, 0.04, black(), 0, 0, 0.5);
    } });
}
function vest18() {  // hooded inflatable lifejacket
    return vest({ top: 0xd8301f, bot: 0x13214a, collar: 0xd8301f, belt: 0x13214a, extra: g => {
        put(g, new THREE.SphereGeometry(0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8301f, 0.8), 0, 1.15, -0.1, -Math.PI / 2);
        put(g, new THREE.SphereGeometry(0.58, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x13214a, 0.9, 0, { side: THREE.BackSide }), 0, 1.15, -0.1, -Math.PI / 2);
        cyl(g, 0.11, 0.11, 0.07, mat(0xf3cf2e, 0.4), 0.62, 0.35, 0.5).rotation.x = Math.PI / 2;
    } });
}

// ---- Buoys ----
function ring() {
    const g = grp(), o = mat(0xf0501a, 0.55), w = mat(0xf4f4f0, 0.45);
    put(g, new THREE.TorusGeometry(0.9, 0.26, 20, 56), o);
    for (let k = 0; k < 4; k++) put(g, new THREE.TorusGeometry(0.9, 0.272, 14, 10, Math.PI / 5), w, 0, 0, 0, 0, 0, k * Math.PI / 2 - Math.PI / 10);
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 1.17, Math.sin(a) * 1.17, Math.sin(a * 3) * 0.16)); }
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 140, 0.03, 6, true), mat(0xf2f2ee, 0.8));
    return g;
}
function horseshoe() {
    const g = grp(), o = mat(0xf0501a, 0.55), w = mat(0xf4f4f0, 0.45), R = 0.8, T = 0.24;
    const arc = Math.PI * 1.55, t0 = -Math.PI / 2 + (Math.PI * 2 - arc) / 2;
    put(g, new THREE.TorusGeometry(R, T, 18, 48, arc), o, 0, 0, 0, 0, 0, t0);
    [t0, t0 + arc].forEach(a => put(g, new THREE.SphereGeometry(T, 16, 12), o, Math.cos(a) * R, Math.sin(a) * R, 0));
    put(g, new THREE.TorusGeometry(R, T + 0.012, 12, 8, 0.5), w, 0, 0, 0, 0, 0, Math.PI / 2 - 0.25);
    put(g, new THREE.TorusGeometry(R, T + 0.012, 12, 6, 0.4), w, 0, 0, 0, 0, 0, t0 + 0.9);
    put(g, new THREE.TorusGeometry(R, T + 0.012, 12, 6, 0.4), w, 0, 0, 0, 0, 0, t0 + arc - 1.3);
    return g;
}

// ---- Survival gear ----
function water() {
    const g = grp(), y = mat(0xf6d21d, 0.45), red = mat(0xd6232a, 0.45);
    pad(g, 1.3, 1.5, 1.1, 0.22, y);
    pad(g, 0.95, 0.18, 0.8, 0.06, mat(0xd9b410, 0.5), 0, 0.84, 0);
    cyl(g, 0.5, 0.5, 0.24, red, 0, 1.05, 0, 40);
    box(g, 0.72, 0.1, 0.18, mat(0xb81820, 0.5), 0, 1.2, 0);
    box(g, 0.18, 0.1, 0.72, mat(0xb81820, 0.5), 0, 1.2, 0);
    return g;
}
function anchor() {
    const g = grp(), m = mat(0x7f8892, 0.45, 0.7);
    box(g, 0.14, 2.5, 0.1, m);
    put(g, new THREE.TorusGeometry(0.15, 0.04, 8, 20), m, 0, 1.4, 0);
    put(g, new THREE.CylinderGeometry(0.045, 0.045, 1.5, 10), m, 0, -0.7, 0, 0, 0, Math.PI / 2);
    const s = new THREE.Shape();
    s.moveTo(0, 0.35); s.lineTo(0.5, 0.35); s.lineTo(0.95, -0.5); s.lineTo(0.2, -0.2); s.lineTo(0, -0.2); s.closePath();
    [1, -1].forEach(k => {
        const f = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), m);
        f.position.set(0, -1.0, -0.03); f.scale.x = k; f.rotation.x = -0.45; g.add(f);
    });
    return g;
}
function aid() {
    const g = grp(), red = mat(0xd6232a, 0.5);
    pad(g, 1.7, 1.2, 0.45, 0.2, mat(0xeff1f3, 0.7));
    pad(g, 1.5, 0.14, 0.5, 0.05, mat(0xc8ced6, 0.6), 0, 0.45, 0);
    box(g, 0.55, 0.16, 0.03, red, 0, -0.05, 0.24); box(g, 0.16, 0.55, 0.03, red, 0, -0.05, 0.24);
    return g;
}
function pack() {
    const g = grp();
    pad(g, 0.95, 1.3, 0.55, 0.03, mat(0xf3f5f8, 0.65));
    box(g, 0.97, 0.32, 0.57, mat(0x2f64b0, 0.55), 0, 0.4, 0);
    const lt = tex([['SURVIVAL', 104, 120], ['SUPPLY PACK', 60, 215]], '#f3f5f8', '#16306a', 512, 320);
    put(g, new THREE.PlaneGeometry(0.8, 0.5), mat(0xffffff, 0.6, 0, { map: lt }), 0, -0.28, 0.285);
    return g;
}
function reel() {
    const g = grp(), gray = mat(0x9aa3ad, 0.5, 0.4), yel = mat(0xf0c419, 0.7), org = mat(0xe8561a, 0.7);
    [-1, 1].forEach(k => cyl(g, 0.95, 0.95, 0.08, gray, 0, k * 0.5, 0, 40));
    cyl(g, 0.3, 0.3, 1, gray, 0, 0, 0, 24);
    cyl(g, 0.7, 0.7, 0.9, yel, 0, 0, 0, 40);
    const pts = [], N = 16 * 20;
    for (let i = 0; i <= N; i++) { const t = i / N, a = t * 16 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.715, -0.44 + t * 0.88, Math.sin(a) * 0.715)); }
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, 0.03, 6, false), org);
    const e = [new THREE.Vector3(0.7, 0.44, 0), new THREE.Vector3(1.0, 0.2, 0.3), new THREE.Vector3(1.15, -0.4, 0.5), new THREE.Vector3(1.05, -0.9, 0.8)];
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e), 30, 0.05, 8, false), yel);
    g.rotation.set(0.35, 0, 0.15);
    return g;
}

// ---- Signals ----
function beacon() {
    const g = grp(), b = mat(0x1d1f23, 0.75), l = mat(0x2a2d33, 0.7);
    cyl(g, 0.7, 0.72, 0.2, l, 0, -0.8, 0);
    cyl(g, 0.62, 0.66, 1.4, b);
    put(g, new THREE.SphereGeometry(0.62, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), b, 0, 0.7, 0);
    [-0.25, 0.1, 0.45].forEach(y => put(g, new THREE.TorusGeometry(0.65, 0.035, 8, 40), l, 0, y, 0, Math.PI / 2));
    put(g, new THREE.TorusGeometry(0.38, 0.07, 10, 24, Math.PI), b, 0.62, 0.15, 0, 0, 0, -Math.PI / 2);
    cyl(g, 0.14, 0.14, 0.05, mat(0xf1f1ee, 0.3), 0, 1.33, 0);
    return g;
}
function tube(o) {
    const g = grp(), L = o.len || 2.2, R = o.r || 0.17, ch = o.capH || 0.4;
    cyl(g, R, R, L, mat(o.body, 0.5), 0, 0, 0, 28);
    cyl(g, R * 1.1, R * 1.1, ch, mat(o.cap, 0.45), 0, L / 2 + ch / 2 - 0.02, 0, 28);
    cyl(g, R * 1.06, R * 0.95, 0.22, mat(o.base || 0x1b1d22, 0.6), 0, -L / 2 - 0.1, 0, 28);
    if (o.label) cyl(g, R * 1.015, R * 1.015, o.label.h, mat(o.label.c, 0.6), 0, o.label.y, 0, 28);
    for (let i = 0; i < (o.grip || 0); i++)
        put(g, new THREE.TorusGeometry(R * 1.03, 0.028, 8, 24), mat(o.gripC || 0xc99a10, 0.6), 0, -L / 2 + 0.4 + i * (L - 0.9) / Math.max(1, o.grip - 1), 0, Math.PI / 2);
    if (o.extra) o.extra(g, L, R);
    g.rotation.set(0.2, 0, 0.55);   // tilted so the cap and grip read in the picture
    return g;
}
function canister(o) {
    const g = grp(), R = o.r, H = o.h;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48), mat(0xffffff, 0.55, 0.05, { map: tex(o.lines, o.bg, o.fg) }));
    body.rotation.y = Math.PI; g.add(body);
    cyl(g, R * 1.06, R * 1.06, o.lidH, mat(o.lid, 0.5), 0, H / 2 + o.lidH / 2, 0, 48);
    put(g, new THREE.TorusGeometry(R * 1.06, 0.035, 8, 48), mat(o.lid, 0.5), 0, H / 2 + o.lidH, 0, Math.PI / 2);
    cyl(g, R * 1.02, R * 1.02, 0.08, mat(o.lid, 0.5), 0, -H / 2, 0, 48);
    return g;
}

const BUILD = {
    1: vest1,
    2: ring,
    3: horseshoe,
    4: water,
    5: anchor,
    6: beacon,
    7: aid,
    8: pack,
    9: () => tube({ body: 0xe5481c, cap: 0xd01f1f, capH: 0.45, label: { c: 0xf4f4f0, h: 0.5, y: 0.1 },
        extra: (g, L, R) => cyl(g, R * 1.02, R * 1.02, 0.08, mat(0xd01f1f, 0.5), 0, 0.1, 0, 28) }),
    10: () => tube({ body: 0xf2c230, cap: 0xd01f1f, capH: 0.35, grip: 8, gripC: 0xb88a12 }),
    11: () => tube({ body: 0xf07a1f, cap: 0xf2f2ee, capH: 0.4, label: { c: 0xf2f2ee, h: 0.6, y: -0.2 } }),
    12: () => tube({ body: 0xf08a2a, cap: 0x3b2a22, capH: 0.55, grip: 6, gripC: 0xc86a14 }),
    13: reel,
    14: () => canister({ r: 0.85, h: 1.5, lidH: 0.5, lid: 0x7a1630, bg: '#cfd24a', fg: '#6b1230',
        lines: [['SEESMOKE Mk3', 64, 90], ['ORANGE SMOKE', 52, 165], ['DISTRESS SIGNAL', 42, 232]] }),
    15: () => canister({ r: 0.75, h: 1.2, lidH: 0.3, lid: 0xd9631a, bg: '#f07a2a', fg: '#ffffff',
        lines: [['SMOKE / FLARE', 60, 110], ['KEEP DRY', 52, 200]] }),
    16: vest16,
    17: vest17,
    18: vest18
};

// Build once, normalise to ~2.5 units, centre it, and cache
const cache = {};
function model(n) {
    if (cache[n]) return cache[n];
    const g = BUILD[n](), inner = grp(), outer = grp();
    inner.add(g); inner.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(inner), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = 2.5 / Math.max(s.x, s.y, s.z);
    inner.position.sub(c);
    outer.add(inner); outer.scale.setScalar(k);
    outer.userData.half = s.y * k / 2;
    return (cache[n] = outer);
}
window.SOLAS_EQUIP = { items: ITEMS, model };

if (typeof document === 'undefined' || !document.body) return;   // (lets the models be tested outside a browser)

// ==========================================================================
// 3) THE VIEWER (one shared WebGL renderer)
// ==========================================================================
const V = { ready: false, busy: false, pending: null, auto: true, run: false, cur: null };

function radialTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(20,30,50,.45)'); gr.addColorStop(1, 'rgba(20,30,50,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

function initViewer(host) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
    host.appendChild(r.domElement);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8fa2b8, 0.45));
    const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 4); sc.add(d);
    const f = new THREE.DirectionalLight(0xbcd4ff, 0.4); f.position.set(-4, 2, -3); sc.add(f);

    // small studio environment so plastic and metal get soft highlights
    const pm = new THREE.PMREMGenerator(r), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: 'varying vec3 p; void main(){ float h = p.y; vec3 c = h > 0. ? mix(vec3(.86,.9,.95), vec3(.45,.6,.82), pow(h,.6)) : mix(vec3(.86,.9,.95), vec3(.35,.38,.42), pow(-h,.5)); gl_FragColor = vec4(c, 1.);\n#include <encodings_fragment>\n}'
    })));
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(5) }));
    sb.position.set(0, 8, 6); sb.lookAt(0, 0, 0); es.add(sb);
    sc.environment = pm.fromScene(es, 0.02).texture;

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: radialTex(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; sc.add(shadow);

    const ctl = new THREE.OrbitControls(cam, r.domElement);
    ctl.enableDamping = true; ctl.enablePan = false; ctl.minDistance = 2.6; ctl.maxDistance = 9;
    ctl.autoRotate = true; ctl.autoRotateSpeed = 1.8;
    let idle;
    ctl.addEventListener('start', () => { ctl.autoRotate = false; clearTimeout(idle); });
    ctl.addEventListener('end', () => { if (V.auto) idle = setTimeout(() => { ctl.autoRotate = true; }, 3500); });

    Object.assign(V, { r, sc, cam, ctl, shadow, host, ready: true });
    new ResizeObserver(resize).observe(host);
}

function resize() {
    if (!V.ready || V.busy) return;
    const w = V.host.clientWidth, h = V.host.clientHeight;
    if (!w || !h) return;
    V.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    V.r.setSize(w, h, false);
    V.cam.aspect = w / h; V.cam.updateProjectionMatrix();
}

function loop() {
    if (!V.run) return;
    requestAnimationFrame(loop);
    V.ctl.update();
    V.r.render(V.sc, V.cam);
}

// Render each model once into a small picture for the gallery
function makeThumbs() {
    V.busy = true;
    const { r, sc, cam, shadow } = V;
    r.setPixelRatio(1); r.setSize(300, 300, false);
    cam.aspect = 1; cam.updateProjectionMatrix();
    cam.position.set(2.2, 1.3, 5.6); cam.lookAt(0, 0, 0);
    ITEMS.forEach((it, i) => setTimeout(() => {
        const m = model(it.n);
        m.rotation.y = 0.5; sc.add(m); shadow.position.y = -m.userData.half - 0.04;
        r.render(sc, cam);
        const url = r.domElement.toDataURL('image/png');
        sc.remove(m); m.rotation.y = 0;
        const img = document.getElementById('eq-th-' + it.n);
        (V.urls = V.urls || {})[it.n] = url;
        if (img) { img.src = url; img.classList.add('ready'); }
        if (i === ITEMS.length - 1) {
            V.busy = false; V.thumbs = true; resize();
            if (V.pending) { const p = V.pending; V.pending = null; showItem(p); }
        }
    }, 25 * i));
}

// ==========================================================================
// 4) THE OVERLAY
// ==========================================================================
let ov = null, filter = 'All', idx = 0;
const $ = id => document.getElementById(id);

(function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
    .eq-overlay{z-index:520;--t:#fff;--t2:rgba(235,235,245,.62);--fill:rgba(255,255,255,.09);--fill2:rgba(255,255,255,.17);--line:rgba(255,255,255,.14);--blue:#0a84ff;--e:cubic-bezier(.32,.72,0,1)}
    .eq-card{width:100%;max-width:1120px;height:min(92vh,780px);display:flex;flex-direction:column;gap:14px;padding:26px 28px 18px;border-radius:32px;background:rgba(36,36,38,.88);border:.5px solid var(--line);box-shadow:0 30px 80px rgba(0,0,0,.5);color:var(--t);overflow:hidden;animation:eqIn .5s var(--e)}
    @keyframes eqIn{from{opacity:0;transform:translateY(30px) scale(.97)}}
    .eq-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .eq-head h2{font-size:26px;font-weight:700;letter-spacing:-.025em}
    .eq-head p{font-size:14px;color:var(--t2);margin-top:2px}
    .eq-close{flex:none;border:0;border-radius:99px;padding:9px 18px;background:var(--fill2);color:#fff;font-weight:600;font-size:14px;cursor:pointer}
    .eq-filter{display:flex;gap:2px;padding:2px;border-radius:99px;background:var(--fill);width:max-content;max-width:100%;overflow-x:auto}
    .eq-filter button{border:0;border-radius:99px;padding:7px 16px;background:transparent;color:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
    .eq-filter button.on{background:rgba(99,99,102,.95);box-shadow:0 2px 8px rgba(0,0,0,.3)}
    #eq-gridview{flex:1;min-height:0;display:flex;flex-direction:column;gap:14px}
    .eq-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;align-content:start;padding:2px 2px 8px;scrollbar-width:thin}
    .eq-item{position:relative;display:flex;flex-direction:column;gap:2px;text-align:left;border:0;border-radius:22px;padding:10px 10px 12px;background:var(--fill);color:#fff;cursor:pointer;transition:transform .25s var(--e),background .2s}
    .eq-item:hover{background:var(--fill2);transform:translateY(-3px)}
    .eq-item:active{transform:scale(.97)}
    .eq-item .th{aspect-ratio:1;border-radius:16px;background:radial-gradient(circle at 50% 30%,#e5f0fa,#8fa9c4);overflow:hidden}
    .eq-item img{display:block;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .4s}
    .eq-item img.ready{opacity:1}
    .eq-num{position:absolute;top:16px;left:16px;z-index:1;width:26px;height:26px;border-radius:50%;background:#10265a;border:2px solid #fff;display:grid;place-items:center;font-size:12px;font-weight:700}
    .eq-item b{font-size:13.5px;font-weight:600;margin-top:8px;line-height:1.25}
    .eq-item small{font-size:11.5px;color:var(--t2)}
    .eq-detail{flex:1;min-height:0;display:none;grid-template-columns:1.15fr 1fr;gap:22px}
    .eq-vwrap{display:flex;flex-direction:column;gap:10px;min-height:0}
    .eq-back{align-self:flex-start;border:0;background:none;color:var(--blue);font-size:15px;font-weight:600;cursor:pointer;padding:0 4px}
    .eq-view{flex:1;min-height:260px;border-radius:26px;overflow:hidden;background:radial-gradient(circle at 50% 30%,#e5f0fa,#8fa9c4);touch-action:none;cursor:grab}
    .eq-view:active{cursor:grabbing}
    .eq-view canvas{display:block;width:100%;height:100%}
    .eq-tools{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .eq-nav{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:var(--fill2);color:#fff;font-size:22px;cursor:pointer}
    .eq-hint{font-size:12.5px;color:var(--t2);text-align:center}
    .eq-btns{display:flex;gap:8px}
    .eq-btn{flex:1;border:0;border-radius:99px;padding:10px;background:var(--fill);color:#fff;font-weight:600;font-size:13px;cursor:pointer}
    .eq-btn.on{background:var(--blue)}
    .eq-info{overflow-y:auto;padding-right:4px;scrollbar-width:thin}
    .eq-info h3{font-size:26px;letter-spacing:-.025em;margin:10px 0 4px;line-height:1.15;font-weight:700}
    .eq-chip{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;background:rgba(10,132,255,.2);color:#64b0ff}
    .eq-id{display:inline-grid;place-items:center;width:26px;height:26px;margin-right:8px;border-radius:50%;background:#10265a;border:2px solid #fff;font-size:12px;font-weight:700;vertical-align:middle}
    .eq-blk{margin-top:16px}
    .eq-blk b{display:block;font-size:12px;color:var(--t2);margin-bottom:3px;font-weight:600}
    .eq-blk p{font-size:15px;line-height:1.5}
    .eq-warn{margin-top:16px;padding:12px 14px;border-radius:16px;background:rgba(255,159,10,.18);font-size:14px;line-height:1.45}
    .eq-more{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .eq-more button{border:0;border-radius:99px;padding:6px 12px;background:var(--fill);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer}
    .eq-more button:hover{background:var(--fill2)}
    .eq-foot{font-size:12px;color:var(--t2)}
    @media (max-width:760px){
        .eq-card{height:94vh;padding:18px 16px 12px;border-radius:26px}
        .eq-detail{grid-template-columns:1fr;overflow-y:auto}
        .eq-view{flex:none;height:300px;min-height:0}
        .eq-info{overflow:visible}
        .eq-head h2{font-size:21px}
    }`;
    document.head.appendChild(s);
})();

function buildOverlay() {
    if (ov) return;
    ov = document.createElement('div');
    ov.id = 'eq-overlay';
    ov.className = 'quiz-overlay eq-overlay';   // reuses the quiz overlay's blur and click-blocking
    ov.style.display = 'none';
    ov.innerHTML = `
    <div class="eq-card">
        <div class="eq-head">
            <div><h2>What's inside the lifeboat</h2><p>Tap an item to pick it up and turn it around in 3D.</p></div>
            <button class="eq-close" onclick="closeEquipment()">Done</button>
        </div>
        <div id="eq-gridview">
            <div class="eq-filter" id="eq-filter">${CATS.map(c => `<button data-c="${c}" onclick="eqFilter('${c}')">${c}</button>`).join('')}</div>
            <div class="eq-grid" id="eq-grid"></div>
        </div>
        <div class="eq-detail" id="eq-detail">
            <div class="eq-vwrap">
                <button class="eq-back" onclick="eqBack()">‹ All items</button>
                <div class="eq-view" id="eq-view"></div>
                <div class="eq-tools">
                    <button class="eq-nav" onclick="eqStep(-1)" aria-label="Previous item">‹</button>
                    <span class="eq-hint">Drag to rotate · scroll or pinch to zoom</span>
                    <button class="eq-nav" onclick="eqStep(1)" aria-label="Next item">›</button>
                </div>
                <div class="eq-btns">
                    <button class="eq-btn on" id="eq-auto" onclick="eqAuto()">Auto-rotate: on</button>
                    <button class="eq-btn" onclick="eqReset()">Reset view</button>
                </div>
            </div>
            <div class="eq-info" id="eq-info"></div>
        </div>
        <p class="eq-foot">Equipment differs by vessel and approval. Always check your own boat's equipment list.</p>
    </div>`;
    document.body.appendChild(ov);
    renderGrid();
}

function renderGrid() {
    $('eq-grid').innerHTML = ITEMS.filter(i => filter === 'All' || i.cat === filter).map(i => `
        <button class="eq-item" onclick="eqOpen(${i.n})">
            <span class="eq-num">${i.n}</span>
            <span class="th"><img id="eq-th-${i.n}" alt="${i.name}"></span>
            <b>${i.name}</b><small>${i.cat}</small>
        </button>`).join('');
    document.querySelectorAll('#eq-filter button').forEach(b => b.classList.toggle('on', b.dataset.c === filter));
    // reuse thumbnails that already exist
    ITEMS.forEach(i => { const img = $('eq-th-' + i.n); if (img && V.urls && V.urls[i.n]) { img.src = V.urls[i.n]; img.classList.add('ready'); } });
}

function showGrid() {
    $('eq-detail').style.display = 'none';
    $('eq-gridview').style.display = 'flex';
    V.run = false;
}

function showItem(n) {
    if (V.busy) { V.pending = n; return; }
    idx = ITEMS.findIndex(i => i.n === n);
    const it = ITEMS[idx];
    $('eq-gridview').style.display = 'none';
    $('eq-detail').style.display = 'grid';
    $('eq-info').innerHTML = `
        <span class="eq-id">${it.n}</span><span class="eq-chip">${it.cat}</span>
        <h3>${it.name}</h3>
        <div class="eq-blk"><b>What it is</b><p>${it.what}</p></div>
        <div class="eq-blk"><b>How it's used</b><p>${it.use}</p></div>
        <div class="eq-warn">⚠️ <strong>Check before launch:</strong> ${it.check}</div>
        <div class="eq-blk"><b>More in ${it.cat.toLowerCase()}</b>
            <div class="eq-more">${ITEMS.filter(o => o.cat === it.cat && o.n !== it.n).map(o => `<button onclick="eqOpen(${o.n})">${o.name}</button>`).join('')}</div></div>`;
    $('eq-info').scrollTop = 0;
    if (V.cur) V.sc.remove(V.cur);
    V.cur = model(n);
    V.cur.rotation.y = 0;
    V.sc.add(V.cur);
    V.shadow.position.y = -V.cur.userData.half - 0.04;
    resize();
    eqReset();
    if (!V.run) { V.run = true; loop(); }
}

// ---- Global handlers used by the buttons ----
window.openEquipment = function () {
    buildOverlay();
    ov.style.display = 'flex';
    if (!V.ready) {
        initViewer($('eq-view'));
        makeThumbs();
    }
    showGrid();
};
window.closeEquipment = function () {
    if (!ov) return;
    ov.style.display = 'none';
    V.run = false;
    if (typeof playSound === 'function') playSound('click');
    renderModeUI('explore');
};
window.eqFilter = function (c) { filter = c; renderGrid(); };
window.eqOpen = function (n) { if (typeof playSound === 'function') playSound('click'); showItem(n); };
window.eqBack = function () { showGrid(); };
window.eqStep = function (d) { showItem(ITEMS[(idx + d + ITEMS.length) % ITEMS.length].n); };
window.eqAuto = function () {
    V.auto = !V.auto;
    V.ctl.autoRotate = V.auto;
    const b = $('eq-auto');
    b.classList.toggle('on', V.auto);
    b.textContent = 'Auto-rotate: ' + (V.auto ? 'on' : 'off');
};
window.eqReset = function () {
    if (!V.ready) return;
    V.cam.position.set(1.8, 1.0, 5.4);
    V.ctl.target.set(0, 0, 0);
    V.ctl.autoRotate = V.auto;
    V.ctl.update();
};

addEventListener('keydown', e => {
    if (!ov || ov.style.display === 'none') return;
    const detail = $('eq-detail').style.display !== 'none';
    if (e.key === 'Escape') detail ? showGrid() : closeEquipment();
    else if (detail && e.key === 'ArrowRight') eqStep(1);
    else if (detail && e.key === 'ArrowLeft') eqStep(-1);
});

// ==========================================================================
// 5) "INSIDE" TAB IN THE RIGHT PANEL + hook into renderModeUI
// ==========================================================================
(function addTab() {
    const sel = document.querySelector('.mode-selector');
    if (!sel) return;
    const b = document.createElement('button');
    b.className = 'mode-btn';
    b.dataset.mode = 'inside';
    b.innerHTML = '<i>🎒</i>Inside';
    b.addEventListener('click', () => { if (typeof playSound === 'function') playSound('click'); renderModeUI('inside'); });
    sel.appendChild(b);
})();

const _renderModeUI = renderModeUI;
renderModeUI = function (mode) {
    _renderModeUI(mode);
    if (mode === 'inside') openEquipment();
};
})();