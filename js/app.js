// js/app.js - SOLAS Maritime Twin Core Engine (Full Restored Production Code)

const AppState = {
    currentMode: 'explore',
    launchStep: 0,
    quizIndex: 0,
    score: 0,
    quizAnswered: false,
    audioMuted: false,
    activeZone: 'zone1',
    checklistStatus: {},
    engineStarted: false,
    hooksReleased: false,
    flashlightActive: false,
    emergencyScenario: null,
    scenarioStep: 0,
    scenarioTimeLeft: 0,
    scenarioTimerId: null
};

let hookRetractProgress = 0;
let currentEnv = 'day';

// Vessel Motion & Way Simulation
let shipSpeed = 0.08; 
let maxShipSpeed = 0.08;

// DAVIT & BOAT MOUNTING COORDINATES (Midship Position Z = 0.0)
const BOAT_CONFIG = {
    stowed: { x: 5.2, y: 7.8, z: 0.0 },
    waterborne: { x: 6.2, y: -0.95, z: 0.0 }
};

const ROPE_CONFIG = {
    radius: 0.022,
    fwdZOffset: 2.25,
    aftZOffset: -2.25,
    davitSheaveY: 11.8,
    davitSheaveX: 5.2,
    hookHeightOffset: 0.82
};

const CHECKLIST_STRUCTURE = {
    zone1: {
        title: "Zone 1: Davit & Winch",
        camPos: { x: 8, y: 10, z: 7 },
        camLook: { x: 3.5, y: 7.5, z: 0.0 },
        items: [
            { id: "z1_1", name: "Harbor Lashing Locks Disengaged", detail: "Verify safety locking pins are removed prior to lowering." },
            { id: "z1_2", name: "Winch Brake Weights & Friction Drum", detail: "Check for ice, corrosion, grease, or binding on brake drum." },
            { id: "z1_3", name: "Remote Control Cable Rigging", detail: "Ensure canopy wire leads freely into lifeboat interior." }
        ]
    },
    zone2: {
        title: "Zone 2: Release Hooks & Falls",
        camPos: { x: 9, y: 8.5, z: 4.5 },
        camLook: { x: 5.2, y: 7.8, z: 0.0 },
        items: [
            { id: "z2_1", name: "Fwd & Aft Hydrostatic Hooks", detail: "Ensure release interlock indicator shows green LOCKED status." },
            { id: "z2_2", name: "Steel Wire Fall Cable Integrity", detail: "Check for broken strands, corrosion, or flat spots." },
            { id: "z2_3", name: "Suspension Link & Shackle Alignment", detail: "Confirm hooks carry vertical load evenly." }
        ]
    },
    zone3: {
        title: "Zone 3: Canopy & Engine",
        camPos: { x: 10, y: 7.5, z: -3.0 },
        camLook: { x: 5.2, y: 7.2, z: -1.0 },
        items: [
            { id: "z3_1", name: "Watertight Canopy Hatch Seals", detail: "Inspect rubber gaskets on access hatches and windows." },
            { id: "z3_2", name: "Diesel Engine Fuel & Battery Level", detail: "Ensure minimum 24-hour fuel reserve and full dual battery charge." },
            { id: "z3_3", name: "Compressed Air Cylinder Pressure", detail: "Verify air system pressure for chemical hazard sealing." }
        ]
    },
    zone4: {
        title: "Zone 4: SOLAS Equipment",
        camPos: { x: 7, y: 9, z: 0.0 },
        camLook: { x: 5.2, y: 7.8, z: 0.0 },
        items: [
            { id: "z4_1", name: "SART & EPIRB Beacons Activated", detail: "Check battery expiration dates on emergency locator beacons." },
            { id: "z4_2", name: "Pyrotechnic Flares & Signals", detail: "Confirm 6 rocket parachute flares and hand flares present." },
            { id: "z4_3", name: "Rations & Thermal Protective Aids", detail: "Inspect sealed water pouches and TPA suits for full complement." }
        ]
    }
};

const LAUNCH_STEPS = [
    { step: 1, title: "Remove Harbor Lashing Pin Locks", desc: "Ensure all maintenance locking pins and harbor transport straps are detached before operation." },
    { step: 2, title: "Board Passengers & Secure Canopy Hatches", desc: "Embark designated crew, fasten seatbelts, and shut all watertight hatch doors." },
    { step: 3, title: "Start Lifeboat Diesel Engine", desc: "Start engine prior to lowering so power is immediately available upon water contact." },
    { step: 4, title: "Release Centrifugal Winch Brake Lever", desc: "Lift winch brake lever manually or pull remote brake cable inside canopy to let gravity drop the craft." },
    { step: 5, title: "Lower Lifeboat to Waterline", desc: "Maintain steady tension on brake wire until lifeboat makes impact with wave trough." },
    { step: 6, title: "Actuate Hydrostatic On/Off-Load Hooks", desc: "Engage release handle once water pressure unlocks safety hook interlock mechanism." }
];

const QUIZ_QUESTIONS = [
    {
        q: "What is the maximum allowable lowering speed for a fully loaded lifeboat under SOLAS Reg III/34?",
        options: ["S = 0.4 + 0.02 * Height", "Fixed at 5.0 m/s", "No speed limit applies", "S = 2.0 + 0.1 * Height"],
        ans: 0,
        exp: "SOLAS specifies maximum lowering speed formula S = 0.4 + (0.02 × H), where H is height from davit head to waterline."
    },
    {
        q: "When must davit steel fall cables be turned end-for-end or renewed under SOLAS standards?",
        options: ["Turned at 30 months / Renewed at 5 years", "Renewed every 10 years only", "Turned annually", "No periodic renewal necessary"],
        ans: 0,
        exp: "Falls must be turned end-for-end at intervals not exceeding 30 months and renewed every 5 years."
    },
    {
        q: "What ship list/trim angles must a SOLAS davit system operate against during vessel abandon?",
        options: ["Up to 20° list and 10° trim", "5° list and 2° trim", "40° list and 25° trim", "10° list and 5° trim"],
        ans: 0,
        exp: "SOLAS Reg III/31 requires launching appliances to operate under adverse vessel conditions up to 20° list and 10° trim."
    },
    {
        q: "Which device prevents the lifeboat winch from exceeding maximum safe lowering speed during gravity drop?",
        options: ["Centrifugal Brake", "Hydraulic Steering Pump", "Pneumatic Piston", "Magnetic Clutch"],
        ans: 0,
        exp: "The centrifugal brake uses friction shoes that expand outward under speed to regulate terminal lowering velocity."
    },
    {
        q: "Under what condition does the hydrostatic interlock allow the off-load release hooks to open?",
        options: ["When boat is fully waterborne", "At mid-height drop", "Only when engine is off", "When ship list exceeds 30°"],
        ans: 0,
        exp: "Hydrostatic interlock uses water pressure sensors on the hull bottom to prevent accidental hook release while suspended."
    },
    {
        q: "What minimum operational time must the diesel fuel tank provide for a lifeboat under SOLAS?",
        options: ["24 hours at 6 knots", "6 hours at 2 knots", "12 hours at 10 knots", "48 hours at idle"],
        ans: 0,
        exp: "SOLAS Reg III/31 requires fully equipped lifeboats to carry fuel for at least 24 hours at 6 knots speed."
    },
    {
        q: "How many pyrotechnic rocket parachute flares are required inside a SOLAS lifeboat canopy kit?",
        options: ["4 Flares", "2 Flares", "6 Flares", "12 Flares"],
        ans: 0,
        exp: "SOLAS requires a minimum complement of 4 rocket parachute flares in the emergency equipment locker."
    },
    {
        q: "What color must all SOLAS approved lifeboats be painted on external surfaces?",
        options: ["Highly visible International Orange", "Dark Marine Blue", "Bright White", "Signal Yellow"],
        ans: 0,
        exp: "Lifeboats must be high-visibility International Orange to maximize aerial and sea surface search visibility."
    },
    {
        q: "How often must a complete lifeboat launch drill be conducted on passenger and cargo vessels?",
        options: ["At least once every month", "Once per year", "Every 6 months", "Only during drydock"],
        ans: 0,
        exp: "SOLAS Chapter III requires mandatory lifeboat drills to be executed at least once every month."
    },
    {
        q: "What is the primary function of retroreflective tapes applied along the lifeboat canopy exterior?",
        options: ["Reflect searchlight illumination at night", "Thermal insulation", "Static discharge grounding", "UV degradation protection"],
        ans: 0,
        exp: "SOLAS retroreflective material reflects searchlight beams back to rescue vessels and SAR aircraft during darkness."
    }
];

const EMERGENCY_DATA = {
    power_loss: {
        title: "Power Loss During Lowering",
        steps: [
            "Auxiliary power offline. Verify centrifugal brake engagement.",
            "Manually lift dead-man brake weighted lever to resume gravity drop.",
            "Monitor lowering speed via mechanical indicator until water contact."
        ]
    },
    cable_jam: {
        title: "Cable Jam & Asymmetric List",
        steps: [
            "Falls tension unbalanced. Immediately lock winch brake lever.",
            "Inspect wire sheave drum alignment for crossover or binding.",
            "Clear obstruction and carefully re-engage controlled lowering."
        ]
    },
    rough_seas: {
        title: "High Seas & Wave Impact",
        steps: [
            "Heavy sea swell detected. Start lifeboat diesel engine immediately.",
            "Maintain winch brake tension until boat crests wave trough.",
            "Actuate hydrostatic release hooks right upon full water flotation."
        ]
    }
};

let scene, camera, renderer, controls;
let shipGroup = null;
let boatModel = null;
let davitModel = null;
let fwdSheaveCube = null; 
let aftSheaveCube = null; 

let water = null;
let hemiLight = null;
let sunLight = null;
let oceanRimLight = null;
let deckFillLight = null;
let flashlight = null;

let sunMesh = null;
let moonMesh = null;
let cloudsGroup = null;
let windLinesGroup = null;
const windLineData = [];
const reflectiveMaterials = [];

let rainParticles = null;
const clickableMeshes = [];

let boatBeaconLight = null;
let boatBeaconMesh = null;

let fwdRopeMesh = null;
let aftRopeMesh = null;
let splashParticles = null;
let foamRingMesh = null;

let splashActive = false;
let splashTime = 0;
const particleVelocities = [];

let selectedMesh = null;
let originalMaterial = null;

let isLowering = false;
let launchVelocity = 0;
const GRAVITY_ACCEL = 0.004;
const WINCH_DRAG = 0.95;
const TERMINAL_VELOCITY = 0.14;
let impactBuoyancyVel = 0;
let isWaterborne = false;

let boatPos = { ...BOAT_CONFIG.stowed };
let audioCtx = null;
let ambientGainNode = null;

// ==========================================================================
// ADVANCED SYNTHESIZED AUDIO & AMBIENCE ENGINE
// ==========================================================================

function initAmbientAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, audioCtx.currentTime);

        ambientGainNode = audioCtx.createGain();
        ambientGainNode.gain.setValueAtTime(AppState.audioMuted ? 0 : 0.08, audioCtx.currentTime);

        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime);

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(180, audioCtx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        whiteNoise.connect(filter);
        filter.connect(ambientGainNode);
        ambientGainNode.connect(audioCtx.destination);

        whiteNoise.start();
        lfo.start();
    } catch (e) {}
}

function updateAmbienceForEnvironment(envType) {
    if (!ambientGainNode || !audioCtx) return;
    if (AppState.audioMuted) {
        ambientGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        return;
    }
    if (envType === 'day') ambientGainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.0);
    else if (envType === 'night') ambientGainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 1.0);
    else if (envType === 'storm') ambientGainNode.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 1.0);
}

function playSound(type) {
    if (AppState.audioMuted) return;
    try {
        if (!audioCtx) initAmbientAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'brake') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
            osc.start(); osc.stop(audioCtx.currentTime + 0.35);
        } else if (type === 'splash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(65, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
            osc.start(); osc.stop(audioCtx.currentTime + 0.7);
        } else if (type === 'engine') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
            osc.start(); osc.stop(audioCtx.currentTime + 0.9);
        } else if (type === 'alarm') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.start(); osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === 'winch') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(); osc.stop(audioCtx.currentTime + 0.05);
        }
    } catch(e) {}
}

function toggleAudioMute() {
    AppState.audioMuted = !AppState.audioMuted;
    const btn = document.getElementById('audio-toggle-btn');
    if (btn) btn.innerText = AppState.audioMuted ? "🔇 Audio: OFF" : "🔊 Audio: ON";
    if (ambientGainNode && audioCtx) updateAmbienceForEnvironment(currentEnv);
    logInstructorEvent("Audio sound effects " + (AppState.audioMuted ? "MUTED" : "UNMUTED"));
}

function logInstructorEvent(msg) {
    const container = document.getElementById('log-entries');
    if (!container) return;
    const now = new Date().toLocaleTimeString();
    const item = document.createElement('p');
    item.className = 'log-item';
    item.innerHTML = `<strong>[${now}]</strong> ${msg}`;
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
}

// ==========================================================================
// MOUSE FLASHLIGHT TRACKING & RETROREFLECTIVE MATERIAL CONTROLLER
// ==========================================================================

function setupFlashlightSystem() {
    flashlight = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 8, 0.4, 1);
    camera.add(flashlight);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight.target);
    scene.add(camera);

    window.addEventListener('mousemove', (e) => {
        if (!AppState.flashlightActive || !flashlight) return;
        const vector = new THREE.Vector3(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1,
            0.5
        );
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        flashlight.target.position.copy(camera.worldToLocal(camera.position.clone().add(dir.multiplyScalar(10))));
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T') toggleFlashlightMode();
    });
}

function toggleFlashlightMode() {
    AppState.flashlightActive = !AppState.flashlightActive;
    const btn = document.getElementById('flashlight-toggle-btn');
    if (btn) btn.innerText = `🔦 Flashlight (T): ${AppState.flashlightActive ? 'ON' : 'OFF'}`;
    if (flashlight) flashlight.intensity = AppState.flashlightActive ? 8.0 : 0.0;
    logInstructorEvent(`Tactical Flashlight ${AppState.flashlightActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
}

function updateReflectiveTapeMaterials(envType) {
    const isNightOrStorm = envType === 'night' || envType === 'storm';
    reflectiveMaterials.forEach(mat => {
        if (isNightOrStorm) {
            mat.emissive.setHex(0xe0f2fe);
            mat.emissiveIntensity = 2.2;
            mat.roughness = 0.1;
        } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0.0;
            mat.roughness = 0.3;
        }
    });
}

// ==========================================================================
// CELESTIAL BODIES, CLOUDS & AERODYNAMIC WIND LINES
// ==========================================================================

function createCelestialAndCloudSystems() {
    const sunGeo = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(120, 150, 90);
    scene.add(sunMesh);

    const moonGeo = new THREE.SphereGeometry(5, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x94a3b8, emissiveIntensity: 0.8, roughness: 0.8 });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-100, 120, -120);
    scene.add(moonMesh);

    cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, roughness: 0.9 });

    for (let c = 0; c < 22; c++) {
        const cloudCluster = new THREE.Group();
        const numPuffs = 4 + Math.floor(Math.random() * 5);
        for (let p = 0; p < numPuffs; p++) {
            const size = 8 + Math.random() * 12;
            const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), cloudMat);
            puff.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 20);
            cloudCluster.add(puff);
        }
        cloudCluster.position.set((Math.random() - 0.5) * 500, 45 + Math.random() * 25, (Math.random() - 0.5) * 500);
        cloudsGroup.add(cloudCluster);
    }
    scene.add(cloudsGroup);

    windLinesGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });

    for (let i = 0; i < 60; i++) {
        const lineGeo = new THREE.BufferGeometry();
        const len = 8 + Math.random() * 14;
        lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, -len]), 3));
        const line = new THREE.Line(lineGeo, lineMat);
        const startX = (Math.random() - 0.5) * 16;
        const startY = 1.0 + Math.random() * 18;
        line.position.set(startX, startY, 45 + Math.random() * 30);
        windLinesGroup.add(line);
        windLineData.push({ mesh: line, baseSpeed: 0.6 + Math.random() * 0.8 });
    }
    scene.add(windLinesGroup);
}

function updateAerodynamicWindLines() {
    if (!windLinesGroup) return;
    const speedRatio = shipSpeed / maxShipSpeed;
    windLinesGroup.visible = speedRatio > 0.05;
    for (let item of windLineData) {
        item.mesh.position.z -= item.baseSpeed * (0.5 + speedRatio * 1.5);
        if (item.mesh.position.z < -45) {
            item.mesh.position.z = 45 + Math.random() * 20;
            item.mesh.position.x = (Math.random() - 0.5) * 16;
            item.mesh.position.y = 1.0 + Math.random() * 18;
        }
    }
}

function createRainSystem() {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 120;
        pos[i * 3 + 1] = Math.random() * 50;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rainParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x88ccff, size: 0.18, transparent: true, opacity: 0.0 }));
    scene.add(rainParticles);
}

function updateRainSystem() {
    if (!rainParticles || currentEnv !== 'storm') return;
    const pos = rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] -= 0.8;
        pos[i * 3 + 2] += 0.2;
        if (pos[i * 3 + 1] < 0) {
            pos[i * 3 + 1] = 50;
            pos[i * 3] = (Math.random() - 0.5) * 120;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
        }
    }
    rainParticles.geometry.attributes.position.needsUpdate = true;
}

function setPortalEnv(envType, btnElement) {
    initAmbientAudio();
    playSound('click');
    document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    currentEnv = envType;
    updateAmbienceForEnvironment(envType);
    updateReflectiveTapeMaterials(envType);

    if (envType === 'day') document.body.classList.add('day-mode');
    else document.body.classList.remove('day-mode');

    if (!scene || !water) return;

    if (envType === 'day') {
        scene.background.setHex(0x38bdf8);
        scene.fog.color.setHex(0xa5f3fc);
        scene.fog.density = 0.003;
        if (sunMesh) sunMesh.visible = true;
        if (moonMesh) moonMesh.visible = false;
        if (hemiLight) { hemiLight.color.setHex(0xffffff); hemiLight.groundColor.setHex(0x0284c7); hemiLight.intensity = 1.8; }
        if (sunLight) { sunLight.color.setHex(0xfffbe1); sunLight.intensity = 3.0; sunLight.position.set(40, 50, 30); }
        water.material.uniforms['distortionScale'].value = 4.0;
        water.material.uniforms['waterColor'].value.setHex(0x002b36);
        if (rainParticles) rainParticles.material.opacity = 0.0;
        logInstructorEvent('Environment applied: DAYLIGHT CLEAR');
    } else if (envType === 'night') {
        scene.background.setHex(0x010308);
        scene.fog.color.setHex(0x010308);
        scene.fog.density = 0.012;
        if (sunMesh) sunMesh.visible = false;
        if (moonMesh) moonMesh.visible = true;
        if (hemiLight) { hemiLight.color.setHex(0x0a192f); hemiLight.groundColor.setHex(0x000000); hemiLight.intensity = 0.4; }
        if (sunLight) { sunLight.color.setHex(0x38bdf8); sunLight.intensity = 0.3; sunLight.position.set(-10, 25, -20); }
        water.material.uniforms['distortionScale'].value = 2.0;
        water.material.uniforms['waterColor'].value.setHex(0x010814);
        if (rainParticles) rainParticles.material.opacity = 0.0;
        logInstructorEvent('Environment applied: EMERGENCY NIGHT');
    } else if (envType === 'storm') {
        scene.background.setHex(0x02050c);
        scene.fog.color.setHex(0x02050c);
        scene.fog.density = 0.028;
        if (sunMesh) sunMesh.visible = false;
        if (moonMesh) moonMesh.visible = false;
        if (hemiLight) { hemiLight.color.setHex(0x1e293b); hemiLight.groundColor.setHex(0x020617); hemiLight.intensity = 0.8; }
        if (sunLight) { sunLight.color.setHex(0x64748b); sunLight.intensity = 0.8; sunLight.position.set(10, 20, 10); }
        water.material.uniforms['distortionScale'].value = 16.0;
        water.material.uniforms['waterColor'].value.setHex(0x020c1b);
        if (rainParticles) rainParticles.material.opacity = 0.8;
        logInstructorEvent('Environment applied: HEAVY STORM CONDITIONS');
    }
}

function launchModule(selectedMode) {
    initAmbientAudio();
    playSound('click');
    const portal = document.getElementById('portal-landing-page');
    if (portal) {
        portal.classList.add('hidden-portal');
        portal.style.display = 'none';
    }
    renderModeUI(selectedMode);
}

function returnToPortal() {
    playSound('click');
    const portal = document.getElementById('portal-landing-page');
    if (portal) {
        portal.style.display = 'flex';
        setTimeout(() => portal.classList.remove('hidden-portal'), 10);
    }
    logInstructorEvent('Returned to Main Portal.');
}

function runSimPreloader() {
    let pct = 0;
    const fill = document.getElementById('load-progress-fill');
    const txtPct = document.getElementById('load-percent-text');
    const txtStat = document.getElementById('load-status-text');

    const timer = setInterval(() => {
        pct += Math.floor(Math.random() * 15) + 5;
        if (pct >= 100) {
            pct = 100;
            clearInterval(timer);
            if (fill) fill.style.width = '100%';
            if (txtPct) txtPct.innerText = '100%';
            if (txtStat) txtStat.innerText = 'WebGL Scene Ready!';
        } else {
            if (fill) fill.style.width = `${pct}%`;
            if (txtPct) txtPct.innerText = `${pct}%`;
        }
    }, 100);
}

function setCameraPreset(view) {
    playSound('click');
    if (!camera || !controls) return;
    let targetPos = { x: 22, y: 14, z: 18 };
    let targetLook = { x: 0, y: 5, z: 0.0 };

    if (view === 'deck') { targetPos = { x: 0, y: 10.5, z: 12 }; targetLook = { x: 0, y: 7.5, z: 0.0 }; }
    else if (view === 'outboard') { targetPos = { x: 24, y: 6, z: 3.0 }; targetLook = { x: 5, y: 4, z: 0.0 }; }
    else if (view === 'boat') { targetPos = { x: 10, y: 9.5, z: 4.0 }; targetLook = { x: 5.2, y: 7.8, z: 0.0 }; }
    else if (view === 'bridge') { targetPos = { x: -14, y: 16, z: -25 }; targetLook = { x: -3, y: 10, z: -15 }; }

    document.querySelectorAll('.camera-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.camera-btn[onclick*="'${view}'"]`);
    if (activeBtn) activeBtn.classList.add('active');

    animateCameraTo(targetPos, targetLook);
}

function animateCameraTo(targetPos, targetLook) {
    const startPos = { ...camera.position };
    const startLook = { ...controls.target };
    let t = 0;
    function animCam() {
        t += 0.05;
        camera.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, t);
        camera.position.y = THREE.MathUtils.lerp(startPos.y, targetPos.y, t);
        camera.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, t);

        controls.target.x = THREE.MathUtils.lerp(startLook.x, targetLook.x, t);
        controls.target.y = THREE.MathUtils.lerp(startLook.y, targetLook.y, t);
        controls.target.z = THREE.MathUtils.lerp(startLook.z, targetLook.z, t);

        controls.update();
        if (t < 1.0) requestAnimationFrame(animCam);
    }
    animCam();
}

function setChecklistZone(zoneKey) {
    playSound('click');
    AppState.activeZone = zoneKey;
    const zone = CHECKLIST_STRUCTURE[zoneKey];
    if (zone && zone.camPos && zone.camLook) {
        animateCameraTo(zone.camPos, zone.camLook);
    }
    renderModeUI('inspection');
    logInstructorEvent(`Walkaround focus set to: ${zone.title}`);
}

function setChecklistItemStatus(itemId, status) {
    playSound('click');
    AppState.checklistStatus[itemId] = status;
    renderModeUI('inspection');
    logInstructorEvent(`Inspection Item [${itemId}] marked as ${status}`);
}

function launchQuizModule() {
    playSound('click');
    AppState.quizIndex = 0;
    AppState.score = 0;
    AppState.quizAnswered = false;
    renderQuizFocusOverlay();
    logInstructorEvent("Launched Dedicated Full-Screen SOLAS Quiz Module");
}

function closeQuizModule() {
    playSound('click');
    const overlay = document.getElementById('quiz-focus-overlay');
    if (overlay) overlay.style.display = 'none';
    renderModeUI('explore');
}

function handleQuizAnswer(selectedIndex) {
    if (AppState.quizAnswered) return;
    AppState.quizAnswered = true;

    const q = QUIZ_QUESTIONS[AppState.quizIndex];
    const isCorrect = selectedIndex === q.ans;

    if (isCorrect) {
        AppState.score++;
        playSound('click');
    } else {
        playSound('alarm');
    }

    const options = document.querySelectorAll('.quiz-option-btn');
    options.forEach((btn, idx) => {
        if (idx === q.ans) btn.classList.add('correct');
        else if (idx === selectedIndex) btn.classList.add('incorrect');
    });

    const expBox = document.getElementById('quiz-explanation');
    if (expBox) {
        expBox.style.display = 'block';
        expBox.innerHTML = `<strong>${isCorrect ? '✅ Correct' : '❌ Incorrect'}:</strong> ${q.exp}`;
    }

    const nextBtn = document.getElementById('quiz-next-btn');
    if (nextBtn) nextBtn.style.display = 'block';
}

function nextQuizQuestion() {
    playSound('click');
    AppState.quizIndex++;
    AppState.quizAnswered = false;
    if (AppState.quizIndex >= QUIZ_QUESTIONS.length) {
        renderQuizResults();
    } else {
        renderQuizFocusOverlay();
    }
}

function renderQuizFocusOverlay() {
    let overlay = document.getElementById('quiz-focus-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'quiz-focus-overlay';
        overlay.className = 'quiz-overlay';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    const q = QUIZ_QUESTIONS[AppState.quizIndex];
    overlay.innerHTML = `
        <div class="quiz-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="category-tag">SOLAS CHAPTER III EXAMINATION</span>
                <button class="camera-btn" onclick="closeQuizModule()">✕ Exit Quiz</button>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
                <span>Question ${AppState.quizIndex + 1} of ${QUIZ_QUESTIONS.length}</span>
                <span>Current Score: ${AppState.score}/${QUIZ_QUESTIONS.length}</span>
            </div>
            <h2 style="font-size:1.15rem; color:#fff; font-weight:700;">${q.q}</h2>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${q.options.map((opt, i) => `
                    <button class="quiz-option-btn" onclick="handleQuizAnswer(${i})">${String.fromCharCode(65 + i)}. ${opt}</button>
                `).join('')}
            </div>
            <div id="quiz-explanation" style="display:none; padding:12px; background:rgba(255,255,255,0.06); border-radius:10px; font-size:0.85rem; color:#fff;"></div>
            <button id="quiz-next-btn" class="action-btn" style="display:none;" onclick="nextQuizQuestion()">Continue to Next Question ➔</button>
        </div>
    `;
}

function renderQuizResults() {
    const overlay = document.getElementById('quiz-focus-overlay');
    if (!overlay) return;
    const passed = AppState.score >= Math.ceil(QUIZ_QUESTIONS.length * 0.7);
    overlay.innerHTML = `
        <div class="quiz-card" style="text-align:center;">
            <h2 style="font-size:1.8rem; color:#fff;">${passed ? '🎉 Evaluation Passed!' : '⚠️ Review Required'}</h2>
            <p style="font-size:1rem; color:var(--text-secondary); margin:12px 0;">You scored <strong>${AppState.score} / ${QUIZ_QUESTIONS.length}</strong> (${Math.round((AppState.score / QUIZ_QUESTIONS.length) * 100)}%)</p>
            <p style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin-bottom:20px;">
                ${passed ? 'Demonstrated strong proficiency in SOLAS Chapter III launch protocols.' : 'Failed to reach passing grade (70%). Review SOLAS checklists and try again.'}
            </p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button class="action-btn" onclick="launchQuizModule()">Retake Examination</button>
                <button class="action-btn" style="background:rgba(255,255,255,0.12) !important;" onclick="closeQuizModule()">Return to 3D Simulator</button>
            </div>
        </div>
    `;
}

function init3D() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0xa5f3fc, 0.003);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1500);
    camera.position.set(22, 14, 18);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x0284c7, 1.8);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfffbe1, 3.0);
    sunLight.position.set(40, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    oceanRimLight = new THREE.DirectionalLight(0x00f2fe, 1.0);
    oceanRimLight.position.set(-25, 10, -15);
    scene.add(oceanRimLight);

    deckFillLight = new THREE.DirectionalLight(0xffd166, 0.8);
    deckFillLight.position.set(-12, 15, 12);
    scene.add(deckFillLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 5, 0.0);
    controls.maxPolarAngle = Math.PI / 2 + 0.05;

    setupFlashlightSystem();
    createRealisticWater();
    createMotherShipDeck();
    createSteelWireRopes();
    createWaterSplashParticles();
    createRainSystem();
    createCelestialAndCloudSystems();

    const loader = new THREE.GLTFLoader();

    loader.load('assets/davit.glb', (gltf) => {
        davitModel = gltf.scene;
        davitModel.position.set(3.5, 7.55, 0.0); 
        fwdSheaveCube = davitModel.getObjectByName("Cylinder019");
        aftSheaveCube = davitModel.getObjectByName("Cylinder018");
        davitModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true; child.receiveShadow = true;
                if (child.name.includes("Reflective_Tape")) reflectiveMaterials.push(child.material);
                clickableMeshes.push(child);
            }
        });
        if (shipGroup) shipGroup.add(davitModel); else scene.add(davitModel);
    }, undefined, () => {
        davitModel = createFallbackDavitMesh();
        davitModel.position.set(3.5, 7.55, 0.0);
        if (shipGroup) shipGroup.add(davitModel); else scene.add(davitModel);
    });

    loader.load('assets/boat.glb', (gltf) => {
        boatModel = gltf.scene;
        boatModel.position.set(BOAT_CONFIG.stowed.x, BOAT_CONFIG.stowed.y, BOAT_CONFIG.stowed.z);
        boatModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true; child.receiveShadow = true;
                if (child.name.includes("Reflective_Tape")) reflectiveMaterials.push(child.material);
                clickableMeshes.push(child);
            }
        });
        scene.add(boatModel);
    }, undefined, () => {
        boatModel = createFallbackBoatMesh();
        boatModel.position.set(BOAT_CONFIG.stowed.x, BOAT_CONFIG.stowed.y, BOAT_CONFIG.stowed.z);
        scene.add(boatModel);
    });

    setupRaycaster();
    setupEventListeners();
    setPortalEnv('day', null);
    animate();
    runSimPreloader();
}

// ==========================================================================
// SHIP-SHAPED HULL + SUPERSTRUCTURE (LOFTED HULL, RAKED BOW, TRANSOM STERN)
// ==========================================================================

const SHIP = { x0: -2.0, B: 6.4, zStern: -36.0, zBowMax: 39.2, keelY: -3.4, deckY: 7.5 };
let radarMesh = null;

// How much the keel line lifts toward bow and stern
function keelRise(z) {
    return 3.2 * Math.pow(Math.max(0, (z - 6) / 30), 2) +
           1.4 * Math.pow(Math.max(0, (-z - 18) / 18), 2);
}

// Half-breadth of the hull at station z and height y
function hullHalfBreadth(z, y) {
    const H = SHIP.deckY - SHIP.keelY;
    const h = THREE.MathUtils.clamp((y - SHIP.keelY) / H, 0, 1);
    const yy = y - SHIP.keelY - keelRise(z);
    if (yy <= 0) return 0;

    // Rounded bilge
    const R = 3.0;
    const sec = yy < R ? Math.sqrt(1 - Math.pow(1 - yy / R, 2)) : 1;

    let w = 1;
    if (z > 14) {
        // Bow: pointed low down, flared and raked higher up
        const zEnd = 36 + 3 * h;
        const u = Math.min(1, (z - 14) / (zEnd - 14));
        const p = 0.55 + 1.0 * (1 - h);
        w = Math.pow(Math.max(0, 1 - u * u), p);
    } else if (z < -22) {
        // Cruiser stern with transom
        const u = Math.min(1, (-z - 22) / 14);
        w = 1 - 0.42 * u * u;
    }
    return SHIP.B * w * sec;
}

function buildHullBand(yb0, yb1, mat, nh = 10) {
    const nz = 90;
    const rowLen = nh + 1;
    const positions = [];
    const indices = [];
    const capLeft = [];
    const capRight = [];

    [-1, 1].forEach(side => {
        const base = positions.length / 3;
        for (let i = 0; i <= nz; i++) {
            const z = SHIP.zStern + (SHIP.zBowMax - SHIP.zStern) * (i / nz);
            const y0 = Math.max(yb0, SHIP.keelY + keelRise(z));
            const y1 = Math.max(yb1, y0);
            for (let k = 0; k <= nh; k++) {
                const y = y0 + (y1 - y0) * (k / nh);
                const hb = hullHalfBreadth(z, y);
                positions.push(SHIP.x0 + side * hb, y, z);
                if (i === 0) (side < 0 ? capLeft : capRight).push([SHIP.x0 + side * hb, y]);
            }
        }
        for (let i = 0; i < nz; i++) {
            for (let k = 0; k < nh; k++) {
                const a = base + i * rowLen + k, b = a + 1, c = a + rowLen, d = c + 1;
                indices.push(a, b, c, b, d, c);
            }
        }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    shipGroup.add(mesh);

    // Transom plate at the stern
    const pts = capLeft.map(p => new THREE.Vector2(p[0], p[1]));
    for (let k = capRight.length - 1; k >= 1; k--) pts.push(new THREE.Vector2(capRight[k][0], capRight[k][1]));
    const capGeo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    capGeo.translate(0, 0, SHIP.zStern);
    const cap = new THREE.Mesh(capGeo, mat);
    cap.castShadow = true;
    shipGroup.add(cap);
}

// Two matching polylines -> a flat ribbon surface
function ribbon(A, B, mat) {
    const pos = [], idx = [];
    for (let i = 0; i < A.length; i++) pos.push(A[i].x, A[i].y, A[i].z, B[i].x, B[i].y, B[i].z);
    for (let i = 0; i < A.length - 1; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    shipGroup.add(m);
    return m;
}

function cylBetween(p1, p2, r, mat, seg = 8) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.copy(p1).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    return m;
}

// Extrude a side-profile [z, y] across the ship's width (gives raked fronts)
function addProfileBlock(profile, width, cx, mat) {
    const shape = new THREE.Shape();
    profile.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    geo.translate(width / 2, 0, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.x = cx;
    m.castShadow = true;
    m.receiveShadow = true;
    shipGroup.add(m);
    return m;
}

function addBox(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    shipGroup.add(m);
    return m;
}

function createMotherShipDeck() {
    shipGroup = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const x0 = SHIP.x0, dY = SHIP.deckY;

    // ---------- Materials ----------
    const hullNavyMat = new THREE.MeshStandardMaterial({ color: 0x16284a, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide });
    const hullRedMat = new THREE.MeshStandardMaterial({ color: 0x8b1e14, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
    const boottopMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.75, metalness: 0.2, side: THREE.DoubleSide });
    const bulwarkCapMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.4, side: THREE.DoubleSide });
    const superMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.25 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const whiteSteelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b2a3a, emissive: 0x0088aa, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.6 });
    const railingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 });
    const safetyOrangeMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.3, metalness: 0.2 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.5 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0x9f1d12, roughness: 0.45, metalness: 0.3 });
    const funnelTopMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.5, metalness: 0.4 });

    // ---------- HULL (lofted) ----------
    buildHullBand(SHIP.keelY, -0.2, hullRedMat, 8);   // anti-fouling red
    buildHullBand(-0.2, 0.5, boottopMat, 2);          // black boot-top
    buildHullBand(0.5, dY, hullNavyMat, 10);          // navy topsides

    // ---------- MAIN DECK (follows hull outline) ----------
    {
        const L = [], R = [];
        const nz = 90;
        for (let i = 0; i <= nz; i++) {
            const z = SHIP.zStern + (SHIP.zBowMax - SHIP.zStern) * (i / nz);
            const hb = hullHalfBreadth(z, dY);
            L.push(V(x0 - hb, dY + 0.06, z));
            R.push(V(x0 + hb, dY + 0.06, z));
        }
        ribbon(L, R, deckMat);
    }

    // ---------- BULWARKS (bow & stern) ----------
    function addBulwark(z0, z1) {
        const step = 0.75;
        const zs = [];
        for (let z = z0; z < z1; z += step) zs.push(z);
        zs.push(z1);
        [-1, 1].forEach(side => {
            const bottom = [], top = [], capIn = [];
            zs.forEach(z => {
                const hb = Math.max(0, hullHalfBreadth(z, dY) - 0.04);
                bottom.push(V(x0 + side * hb, dY, z));
                top.push(V(x0 + side * hb, dY + 1.2, z));
                capIn.push(V(x0 + side * Math.max(0, hb - 0.28), dY + 1.2, z));
            });
            ribbon(bottom, top, hullNavyMat);
            ribbon(top, capIn, bulwarkCapMat);
        });
    }
    addBulwark(14.0, SHIP.zBowMax);
    addBulwark(SHIP.zStern, -28.5);
    {
        // Transom bulwark
        const hb = hullHalfBreadth(SHIP.zStern, dY) - 0.04;
        ribbon(
            [V(x0 - hb, dY, SHIP.zStern), V(x0 + hb, dY, SHIP.zStern)],
            [V(x0 - hb, dY + 1.2, SHIP.zStern), V(x0 + hb, dY + 1.2, SHIP.zStern)],
            hullNavyMat
        );
    }

    // ---------- DAVIT PLATFORM + SUPPORT GUSSETS (port side, midship) ----------
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 14.0), deckMat);
    platform.position.set(3.5, 7.36, 0.0);
    platform.receiveShadow = true;
    shipGroup.add(platform);

    for (let z = -6.0; z <= 6.0; z += 3.0) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.3), darkSteelMat);
        g.position.set(4.85, 6.1, z);
        g.rotation.z = -0.35;
        shipGroup.add(g);
    }

    // ---------- FORWARD: WINDLASS, MAST, JACKSTAFF ----------
    const windlass = new THREE.Group();
    const wBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 2.4), darkSteelMat);
    const wDrum1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 16), brassMat);
    wDrum1.rotation.z = Math.PI / 2;
    wDrum1.position.set(-0.8, 0.6, 0);
    const wDrum2 = wDrum1.clone();
    wDrum2.position.set(0.8, 0.6, 0);
    windlass.add(wBase, wDrum1, wDrum2);
    windlass.position.set(x0, 7.9, 33.0);
    shipGroup.add(windlass);

    shipGroup.add(cylBetween(V(x0, 7.6, 29.5), V(x0, 14.0, 29.5), 0.14, railingMat));   // foremast
    shipGroup.add(cylBetween(V(x0 - 1.0, 12.5, 29.5), V(x0 + 1.0, 12.5, 29.5), 0.06, railingMat));
    shipGroup.add(cylBetween(V(x0, 8.7, 37.2), V(x0, 10.4, 38.2), 0.05, railingMat)); // jackstaff

    // ---------- CARGO HATCHES + CONTAINERS ----------
    const palette = [0xb91c1c, 0x1d4ed8, 0x15803d, 0xea580c, 0x92400e, 0x475569, 0xca8a04, 0x0e7490];
    const boxMats = palette.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.35 }));
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    [12.0, 20.0, 28.0].forEach(z => {
        const coaming = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.0, 6.8), darkSteelMat);
        coaming.position.set(x0 - 0.2, 8.0, z);
        coaming.castShadow = true;
        const cover = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.3, 6.4), hullNavyMat);
        cover.position.set(x0 - 0.2, 8.6, z);
        shipGroup.add(coaming, cover);

        if (z > 12.5) {
            [-2.45, 0, 2.45].forEach(dx => {
                const tiers = rnd() > 0.35 ? 2 : 1;
                for (let t = 0; t < tiers; t++) {
                    const c = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.6, 6.0), boxMats[Math.floor(rnd() * boxMats.length)]);
                    c.position.set(x0 - 0.2 + dx, 8.75 + 1.3 + t * 2.6, z);
                    c.castShadow = true;
                    c.receiveShadow = true;
                    shipGroup.add(c);
                }
            });
        }
    });

    // ---------- CARGO CRANES ----------
    [16.0, 24.0].forEach(z => {
        shipGroup.add(cylBetween(V(x0, 7.6, z), V(x0, 14.5, z), 0.5, whiteSteelMat, 12));
        addBox(1.3, 1.4, 1.8, x0, 15.0, z, whiteSteelMat);
        const tip = V(x0, 19.5, z + 7.5);
        shipGroup.add(cylBetween(V(x0, 15.4, z + 0.5), tip, 0.16, whiteSteelMat));
        shipGroup.add(cylBetween(tip, V(x0, 16.0, z + 7.5), 0.03, darkSteelMat, 4)); // hoist wire
        shipGroup.add(cylBetween(V(x0, 16.9, z), tip, 0.03, darkSteelMat, 4));       // topping stay
    });

    // ---------- ACCOMMODATION BLOCK (raked fronts, tiered) ----------
    addProfileBlock([[-27.5, 7.6], [-8.5, 7.6], [-9.6, 12.0], [-27.5, 12.0]], 10.4, x0, superMat);   // Tier 1
    addProfileBlock([[-26.5, 12.0], [-10.6, 12.0], [-11.4, 15.6], [-26.5, 15.6]], 9.6, x0, superMat); // Tier 2
    addProfileBlock([[-25.0, 15.6], [-11.0, 15.6], [-9.9, 18.9], [-25.0, 18.9]], 9.2, x0, superMat);  // Bridge (forward-leaning)

    // Bridge wings (overhang the hull sides)
    addBox(13.8, 0.3, 3.0, x0, 16.3, -12.6, superMat);
    addBox(13.8, 0.9, 0.08, x0, 16.8, -11.1, railingMat);
    addBox(0.08, 0.9, 3.0, x0 + 6.9, 16.8, -12.6, railingMat);
    addBox(0.08, 0.9, 3.0, x0 - 6.9, 16.8, -12.6, railingMat);

    // Bridge windows: sloped front + side strips
    const frontWin = addBox(8.6, 1.5, 0.1, x0, 17.9, -10.2, glassMat);
    frontWin.rotation.x = 0.32;
    [-1, 1].forEach(s => {
        addBox(0.06, 1.4, 12.0, x0 + s * 4.63, 17.9, -18.0, glassMat);
        // Tier 2 windows
        for (let z = -25; z <= -12.5; z += 1.9) addBox(0.06, 0.8, 1.0, x0 + s * 4.83, 14.0, z, glassMat);
        // Tier 1 portholes
        for (let z = -26; z <= -11; z += 2.4) {
            const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 14), glassMat);
            ph.rotation.z = Math.PI / 2;
            ph.position.set(x0 + s * 5.22, 10.2, z);
            shipGroup.add(ph);
        }
        // Watertight doors
        addBox(0.1, 2.2, 1.2, x0 + s * 5.22, 8.8, -13.0, doorMat);
    });

        // Navigation lights (red = port = +X side, green = starboard)
    const portNavLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    portNavLight.position.set(x0 + 6.8, 17.3, -13.6);
    const stbdNavLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0x20ff40 }));
    stbdNavLight.position.set(x0 - 6.8, 17.3, -13.6);
    shipGroup.add(portNavLight, stbdNavLight);

    // ---------- FUNNEL (raked, with black top) ----------
    const funnel = new THREE.Group();
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 5.5, 24), funnelMat);
    stack.scale.z = 1.6;
    stack.position.y = 2.75;
    stack.castShadow = true;
    const stackTop = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 1.0, 24), funnelTopMat);
    stackTop.scale.z = 1.6;
    stackTop.position.y = 5.2;
    const bandWhite = new THREE.Mesh(new THREE.CylinderGeometry(1.64, 1.72, 0.7, 24), whiteSteelMat);
    bandWhite.scale.z = 1.6;
    bandWhite.position.y = 3.2;
    funnel.add(stack, stackTop, bandWhite);
    funnel.position.set(x0, 18.9, -21.5);
    funnel.rotation.x = -0.1;
    shipGroup.add(funnel);

    // ---------- MAST + RADAR ----------
    shipGroup.add(cylBetween(V(x0, 18.9, -13.8), V(x0, 25.5, -13.8), 0.14, railingMat));
    shipGroup.add(cylBetween(V(x0 - 1.8, 23.2, -13.8), V(x0 + 1.8, 23.2, -13.8), 0.07, railingMat));
    radarMesh = addBox(0.3, 0.3, 3.2, x0, 26.0, -13.8, whiteSteelMat);
    shipGroup.add(cylBetween(V(x0 + 2.5, 18.9, -22.0), V(x0 + 2.5, 24.0, -22.0), 0.06, railingMat)); // antenna

    // ---------- RAILINGS (midships) ----------
    function addRail(side, z0, z1) {
        const x = x0 + side * (SHIP.B - 0.25);
        [9.0, 8.25].forEach(y => shipGroup.add(cylBetween(V(x, y, z0), V(x, y, z1), 0.04, railingMat)));
        for (let z = z0; z <= z1 + 0.01; z += 2.75) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), railingMat);
            p.position.set(x, 8.3, z);
            shipGroup.add(p);
        }
    }
    addRail(-1, -28.5, 13.5);
    addRail(1, -28.5, -4.5);   // davit embarkation gap left open
    addRail(1, 4.5, 13.5);

    // ---------- MOORING BOLLARDS ----------
    [-33, -20, -8, 8, 19, 32].forEach(z => {
        [-1, 1].forEach(side => {
            if (side > 0 && z > -4.6 && z < 4.6) return;
            const hb = hullHalfBreadth(z, dY);
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.4), darkSteelMat);
            const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 12), darkSteelMat);
            const p2 = p1.clone();
            p1.position.set(0, 0.3, -0.36);
            p2.position.set(0, 0.3, 0.36);
            g.add(base, p1, p2);
            g.position.set(x0 + side * (hb - 0.8), 7.65, z);
            shipGroup.add(g);
        });
    });

    // ---------- LIFEBUOYS ----------
    [-26, -18, -9, 8, 12].forEach(z => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.14, 10, 24), safetyOrangeMat);
        ring.position.set(x0 + SHIP.B - 0.3, 8.3, z);
        ring.rotation.y = Math.PI / 2;
        shipGroup.add(ring);
    });

    // Stern ensign staff
    shipGroup.add(cylBetween(V(x0, 8.7, -35.0), V(x0, 11.0, -35.4), 0.05, railingMat));

    scene.add(shipGroup);
}

function createFallbackBoatMesh() {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.3, metalness: 0.2 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4 });
    const reflectiveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.8 });
    reflectiveMaterials.push(reflectiveMat);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 5.2), hullMat);
    hull.name = "Body";
    group.add(hull);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 3.8), canopyMat);
    top.position.set(0, 0.8, 0);
    group.add(top);

    for (let zOffset of [-1.8, 0.0, 1.8]) {
        const tape = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.15), reflectiveMat);
        tape.position.set(0, 0.8, zOffset);
        tape.name = "Reflective_Tape";
        group.add(tape);
    }

    const domeGeo = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.5,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
    });
    boatBeaconMesh = new THREE.Mesh(domeGeo, domeMat);
    boatBeaconMesh.position.set(0, 1.22, 0.5);
    boatBeaconMesh.name = "Lifeboat_Beacon_Light";
    group.add(boatBeaconMesh);

    boatBeaconLight = new THREE.PointLight(0xffffff, 3.5, 15, 1.5);
    boatBeaconLight.position.set(0, 1.3, 0.5);
    group.add(boatBeaconLight);

    group.traverse(child => { if(child.isMesh) clickableMeshes.push(child); });
    return group;
}

function createFallbackDavitMesh() {
    const group = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xdce4ec, roughness: 0.3, metalness: 0.8 });

    const fwdArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 0.3), steelMat);
    fwdArm.position.set(0, 1.8, 2.25);
    fwdArm.name = "Cylinder019";
    group.add(fwdArm);

    const aftArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 0.3), steelMat);
    aftArm.position.set(0, 1.8, -2.25);
    aftArm.name = "Cylinder018";
    group.add(aftArm);

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.8), steelMat);
    crossBar.position.set(0, 3.5, 0);
    group.add(crossBar);

    group.traverse(child => { if(child.isMesh) clickableMeshes.push(child); });
    return group;
}

function createSteelWireRopes() {
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, metalness: 0.95, roughness: 0.25 });
    const ropeGeo = new THREE.CylinderGeometry(ROPE_CONFIG.radius, ROPE_CONFIG.radius, 1, 16);
    ropeGeo.translate(0, -0.5, 0);

    fwdRopeMesh = new THREE.Mesh(ropeGeo, cableMat);
    aftRopeMesh = new THREE.Mesh(ropeGeo, cableMat);
    fwdRopeMesh.name = "Wire_Falls";
    aftRopeMesh.name = "Wire_Falls";

    fwdRopeMesh.castShadow = true;
    aftRopeMesh.castShadow = true;

    clickableMeshes.push(fwdRopeMesh, aftRopeMesh);

    scene.add(fwdRopeMesh);
    scene.add(aftRopeMesh);
}

function updateWireRopes(elapsedTime, currentBoatWorldPos) {
    if (!fwdRopeMesh || !aftRopeMesh) return;

    let topPntFwd = new THREE.Vector3();
    let topPntAft = new THREE.Vector3();

    if (fwdSheaveCube && aftSheaveCube) {
        fwdSheaveCube.getWorldPosition(topPntFwd);
        aftSheaveCube.getWorldPosition(topPntAft);
    } else {
        topPntFwd.set(ROPE_CONFIG.davitSheaveX, ROPE_CONFIG.davitSheaveY, BOAT_CONFIG.stowed.z + ROPE_CONFIG.fwdZOffset);
        topPntAft.set(ROPE_CONFIG.davitSheaveX, ROPE_CONFIG.davitSheaveY, BOAT_CONFIG.stowed.z + ROPE_CONFIG.aftZOffset);
        if (shipGroup) {
            topPntFwd.applyMatrix4(shipGroup.matrixWorld);
            topPntAft.applyMatrix4(shipGroup.matrixWorld);
        }
    }

    const vibration = isLowering && !isWaterborne ? Math.sin(elapsedTime * 40.0) * 0.008 : 0;

    let btmPntFwd = new THREE.Vector3(
        currentBoatWorldPos.x + vibration, 
        currentBoatWorldPos.y + ROPE_CONFIG.hookHeightOffset, 
        currentBoatWorldPos.z + ROPE_CONFIG.fwdZOffset
    );

    let btmPntAft = new THREE.Vector3(
        currentBoatWorldPos.x + vibration, 
        currentBoatWorldPos.y + ROPE_CONFIG.hookHeightOffset, 
        currentBoatWorldPos.z + ROPE_CONFIG.aftZOffset
    );

    if (AppState.hooksReleased) {
        if (hookRetractProgress < 1.0) hookRetractProgress += 0.02;
        btmPntFwd.lerpVectors(btmPntFwd, topPntFwd, hookRetractProgress);
        btmPntAft.lerpVectors(btmPntAft, topPntAft, hookRetractProgress);
    }

    connectRopeEndpoints(fwdRopeMesh, topPntFwd, btmPntFwd);
    connectRopeEndpoints(aftRopeMesh, topPntAft, btmPntAft);
}

function connectRopeEndpoints(cylinder, topPoint, bottomPoint) {
    cylinder.position.copy(topPoint);
    const dir = new THREE.Vector3().subVectors(bottomPoint, topPoint);
    cylinder.scale.set(1, dir.length(), 1);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
}

function createRealisticWater() {
    water = new THREE.Water(new THREE.PlaneGeometry(1500, 1500), {
        textureWidth: 512, textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(150, 150); }),
        sunDirection: new THREE.Vector3(1, 1, 1).normalize(),
        sunColor: 0xffffff, waterColor: 0x002b36, distortionScale: 4.0, side: THREE.DoubleSide
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.7;
    scene.add(water);
}

function createWaterSplashParticles() {
    const pCount = 180;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
        pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.08 + Math.random() * 0.12;
        particleVelocities.push({
            x: Math.cos(angle) * speed,
            y: 0.12 + Math.random() * 0.18,
            z: Math.sin(angle) * speed
        });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    splashParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x00f2fe, size: 0.22, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending }));
    scene.add(splashParticles);

    const foamGeo = new THREE.RingGeometry(0.1, 0.4, 32);
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide });
    foamRingMesh = new THREE.Mesh(foamGeo, foamMat);
    foamRingMesh.rotation.x = -Math.PI / 2;
    foamRingMesh.position.set(BOAT_CONFIG.waterborne.x, -0.68, BOAT_CONFIG.waterborne.z);
    scene.add(foamRingMesh);
}

function triggerSplashEffect(targetWorldPos) {
    splashActive = true;
    splashTime = 0;
    playSound('splash');

    splashParticles.position.set(targetWorldPos.x, -0.7, targetWorldPos.z);
    const pos = splashParticles.geometry.attributes.position.array;

    for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.6;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    splashParticles.geometry.attributes.position.needsUpdate = true;
    splashParticles.material.opacity = 1.0;

    foamRingMesh.position.set(targetWorldPos.x, -0.68, targetWorldPos.z);
    foamRingMesh.scale.set(1, 1, 1);
    foamRingMesh.material.opacity = 0.8;
}

function updateSplashParticles() {
    if (!splashActive) return;

    splashTime += 0.016;
    const pos = splashParticles.geometry.attributes.position.array;

    for (let i = 0; i < pos.length / 3; i++) {
        const vel = particleVelocities[i];
        pos[i * 3] += vel.x;
        pos[i * 3 + 1] += vel.y;
        pos[i * 3 + 2] += vel.z;
        vel.y -= 0.008;
    }

    splashParticles.geometry.attributes.position.needsUpdate = true;
    splashParticles.material.opacity = Math.max(0, 1.0 - (splashTime / 0.8));

    const foamScale = 1 + splashTime * 12;
    foamRingMesh.scale.set(foamScale, foamScale, 1);
    foamRingMesh.material.opacity = Math.max(0, 0.8 - (splashTime / 1.0));

    if (splashTime >= 1.0) {
        splashActive = false;
        splashParticles.material.opacity = 0;
        foamRingMesh.material.opacity = 0;
    }
}

function setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
        if (event.target.closest('.ui-card') || event.target.closest('.top-bar') || event.target.closest('.camera-dock') || event.target.closest('.portal-overlay') || event.target.closest('.quiz-overlay')) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableMeshes, true);
        if (intersects.length > 0) highlightComponent(intersects[0].object);
    });
}

function highlightComponent(mesh) {
    if (selectedMesh) selectedMesh.material = originalMaterial;
    selectedMesh = mesh;
    originalMaterial = mesh.material;
    const highlightMaterial = mesh.material.clone();
    if (highlightMaterial.emissive) { highlightMaterial.emissive.setHex(0x00f2fe); highlightMaterial.emissiveIntensity = 0.6; }
    else { highlightMaterial.color.setHex(0x00f2fe); }
    mesh.material = highlightMaterial;
}

function resetSimulationState() {
    isLowering = false;
    isWaterborne = false;
    launchVelocity = 0;
    impactBuoyancyVel = 0;
    hookRetractProgress = 0;
    boatPos = { ...BOAT_CONFIG.stowed };

    AppState.launchStep = 0;
    AppState.engineStarted = false;
    AppState.hooksReleased = false;

    if (boatModel) {
        boatModel.position.set(BOAT_CONFIG.stowed.x, BOAT_CONFIG.stowed.y, BOAT_CONFIG.stowed.z);
        boatModel.rotation.set(0, 0, 0);
    }

    logInstructorEvent("Simulation reset to initial stowed state.");
    renderModeUI(AppState.currentMode);
}

function advanceLaunchStage(stepDelta) {
    playSound('click');
    AppState.launchStep = Math.max(0, Math.min(LAUNCH_STEPS.length - 1, AppState.launchStep + stepDelta));

    if (AppState.launchStep === 2 && !AppState.engineStarted) toggleLifeboatEngine();
    else if (AppState.launchStep === 3 && !isLowering) toggleWinchBrake();
    else if (AppState.launchStep === 5 && isWaterborne && !AppState.hooksReleased) toggleOffLoadHooks();

    renderModeUI('launch');
    logInstructorEvent(`Advanced to Launch Stage ${AppState.launchStep + 1}: ${LAUNCH_STEPS[AppState.launchStep].title}`);
}

function toggleWinchBrake() {
    playSound('winch');
    isLowering = !isLowering;
    logInstructorEvent("Davit Winch Brake Lever " + (isLowering ? "RELEASED (Rapid Gravity Drop Active)" : "ENGAGED (Brake Locked)"));
    renderModeUI(AppState.currentMode);
}

function toggleLifeboatEngine() {
    AppState.engineStarted = !AppState.engineStarted;
    playSound('engine');
    logInstructorEvent("Lifeboat Diesel Engine " + (AppState.engineStarted ? "IGNITION STARTED" : "SHUTDOWN"));
    renderModeUI(AppState.currentMode);
}

function toggleOffLoadHooks() {
    if (!isWaterborne && !AppState.hooksReleased) {
        playSound('alarm');
        logInstructorEvent("WARNING: Hydrostatic Interlock BLOCKED release while suspended above water!");
        alert("SAFETY INTERLOCK: Off-load hooks cannot be released until lifeboat is fully waterborne!");
        return;
    }

    AppState.hooksReleased = !AppState.hooksReleased;
    playSound('brake');

    if (AppState.hooksReleased) logInstructorEvent("Off-load hooks RELEASED! Wire falls winching back to davit head.");
    else { hookRetractProgress = 0; logInstructorEvent("Hooks RE-ENGAGED to falls."); }

    renderModeUI(AppState.currentMode);
}

function startEmergencyScenario(type) {
    if (!EMERGENCY_DATA[type]) return;
    if (AppState.scenarioTimerId) clearInterval(AppState.scenarioTimerId);

    AppState.emergencyScenario = type;
    AppState.scenarioStep = 0;
    AppState.scenarioTimeLeft = 30;

    playSound('alarm');
    logInstructorEvent(`EMERGENCY SCENARIO STARTED: ${EMERGENCY_DATA[type].title}`);

    AppState.scenarioTimerId = setInterval(() => {
        AppState.scenarioTimeLeft--;
        const timerEl = document.getElementById('scen-timer-val');
        if (timerEl) timerEl.innerText = `${AppState.scenarioTimeLeft}s`;

        if (AppState.scenarioTimeLeft <= 0) endEmergencyScenario(false, "TIME EXPIRED: Failed to execute response within SOLAS safety window.");
    }, 1000);

    renderModeUI('emergency');
}

function advanceScenarioStep() {
    playSound('click');
    const scenario = EMERGENCY_DATA[AppState.emergencyScenario];
    if (!scenario) return;

    AppState.scenarioStep++;

    if (AppState.scenarioStep >= scenario.steps.length) {
        endEmergencyScenario(true, "SCENARIO PASSED! Outstanding emergency response execution under SOLAS protocols.");
    } else {
        logInstructorEvent(`Scenario Step ${AppState.scenarioStep} Executed. Moving to Step ${AppState.scenarioStep + 1}.`);
        renderModeUI('emergency');
    }
}

function endEmergencyScenario(success, message) {
    if (AppState.scenarioTimerId) {
        clearInterval(AppState.scenarioTimerId);
        AppState.scenarioTimerId = null;
    }

    playSound(success ? 'click' : 'alarm');
    logInstructorEvent(message);

    AppState.emergencyScenario = null;
    AppState.scenarioStep = 0;
    AppState.scenarioTimeLeft = 0;

    alert(message);
    renderModeUI('emergency');
}

function renderModeUI(mode) {
    AppState.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const area = document.getElementById('mode-interactive-area');
    if (!area) return;

    if (mode === 'quiz') {
        launchQuizModule();
        return;
    }

    if (mode === 'explore') {
        area.innerHTML = `
            <div class="ui-card">
                <h3>🔍 Free Inspection Mode</h3>
                <p>Click on any 3D model component to review SOLAS technical specifications and maintenance directives.</p>
                ${(isLowering || isWaterborne || AppState.hooksReleased) ? `
                    <button class="action-btn" style="margin-top:10px; background:linear-gradient(135deg, #0284c7, #0369a1) !important;" onclick="resetSimulationState()">
                        🔄 RESET SIMULATION TO STOWED
                    </button>
                ` : ''}
            </div>
        `;
    } else if (mode === 'inspection') {
        const zone = CHECKLIST_STRUCTURE[AppState.activeZone];
        area.innerHTML = `
            <div class="ui-card">
                <h3>📋 Walkaround Checklist</h3>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                    ${Object.keys(CHECKLIST_STRUCTURE).map(k => `
                        <button class="camera-btn ${AppState.activeZone === k ? 'active' : ''}" onclick="setChecklistZone('${k}')">
                            ${CHECKLIST_STRUCTURE[k].title.split(':')[0]}
                        </button>
                    `).join('')}
                </div>
                <p style="font-weight:700; color:var(--accent-orange); margin-bottom:8px;">${zone.title}</p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${zone.items.map(item => {
                        const status = AppState.checklistStatus[item.id] || 'PENDING';
                        return `
                            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:12px; border:1px solid var(--border-color);">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="font-size:0.82rem;">${item.name}</strong>
                                    <span style="font-size:0.7rem; font-weight:700; color:${status==='PASS'?'var(--emerald-success)':status==='FAIL'?'var(--rose-danger)':'var(--amber-gold)'}">${status}</span>
                                </div>
                                <p style="font-size:0.75rem; margin:4px 0;">${item.detail}</p>
                                <div style="display:flex; gap:6px; margin-top:6px;">
                                    <button class="camera-btn" style="padding:4px 8px; font-size:0.7rem;" onclick="setChecklistItemStatus('${item.id}', 'PASS')">PASS</button>
                                    <button class="camera-btn" style="padding:4px 8px; font-size:0.7rem;" onclick="setChecklistItemStatus('${item.id}', 'FAIL')">FAIL</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (mode === 'launch') {
        const step = LAUNCH_STEPS[AppState.launchStep];
        area.innerHTML = `
            <div class="ui-card">
                <h3>⚙️ Launch & Lowering Console</h3>
                <p><strong>Stage ${step.step} of 6:</strong> ${step.title}</p>
                <p style="font-size:0.8rem; margin-bottom:12px;">${step.desc}</p>

                <div style="display:flex; gap:6px; margin-bottom:10px;">
                    <button class="action-btn" style="padding:6px 10px; font-size:0.75rem;" onclick="advanceLaunchStage(-1)" ${AppState.launchStep === 0 ? 'disabled' : ''}>◀ Prev Stage</button>
                    <button class="action-btn" style="padding:6px 10px; font-size:0.75rem; background:var(--accent-blue) !important;" onclick="advanceLaunchStage(1)" ${AppState.launchStep === LAUNCH_STEPS.length - 1 ? 'disabled' : ''}>Next Stage ▶</button>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="action-btn" onclick="toggleWinchBrake()">
                        ${isLowering ? "🔒 ENGAGE WINCH BRAKE" : "🔓 RELEASE WINCH BRAKE"}
                    </button>

                    <button class="action-btn" style="background:${AppState.engineStarted ? 'var(--emerald-success)' : 'rgba(255,255,255,0.18)'} !important;" onclick="toggleLifeboatEngine()">
                        🔑 ENGINE: ${AppState.engineStarted ? "RUNNING" : "START ENGINE"}
                    </button>

                    <button class="action-btn" style="background:${AppState.hooksReleased ? 'var(--accent-cyan)' : 'linear-gradient(135deg, #d97706, #b45309)'} !important;" onclick="toggleOffLoadHooks()">
                        ⚓ HOOKS: ${AppState.hooksReleased ? "RELEASED" : "LOCKED"}
                    </button>

                    <button class="action-btn" style="background:rgba(255,255,255,0.12) !important; font-size:0.75rem;" onclick="resetSimulationState()">
                        🔄 RESET LAUNCH STATE
                    </button>
                </div>
            </div>
        `;
    } else if (mode === 'emergency') {
        if (!AppState.emergencyScenario) {
            area.innerHTML = `
                <div class="ui-card">
                    <h3>⚠️ Crisis Simulator</h3>
                    <p style="margin-bottom:10px;">Select a scenario to test emergency response under time pressure:</p>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="action-btn" style="background: linear-gradient(135deg, #e11d48, #9f1239) !important;" onclick="startEmergencyScenario('power_loss')">
                            🚨 Power Loss during Lowering
                        </button>
                        <button class="action-btn" style="background: linear-gradient(135deg, #d97706, #b45309) !important;" onclick="startEmergencyScenario('cable_jam')">
                            ⚠️ Cable Jam & Asymmetric List
                        </button>
                        <button class="action-btn" style="background: linear-gradient(135deg, #0284c7, #0369a1) !important;" onclick="startEmergencyScenario('rough_seas')">
                            🌊 High Seas & Wave Impact
                        </button>
                    </div>
                </div>
            `;
        } else {
            const scenData = EMERGENCY_DATA[AppState.emergencyScenario];
            const currentInstruction = scenData.steps[AppState.scenarioStep];
            const totalSteps = scenData.steps.length;

            area.innerHTML = `
                <div class="ui-card">
                    <h3>⚠️ ACTIVE EMERGENCY</h3>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="category-tag" style="border-color:var(--rose-danger); color:var(--rose-danger);">${scenData.title.toUpperCase()}</span>
                        <span style="font-family:monospace; font-size:1.1rem; font-weight:800; color:var(--amber-gold);" id="scen-timer-val">${AppState.scenarioTimeLeft}s</span>
                    </div>

                    <p style="font-weight:700; color:#fff; margin-bottom:4px;">Step ${AppState.scenarioStep + 1} of ${totalSteps} Required Action:</p>
                    <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:12px;">
                        ${currentInstruction}
                    </p>

                    <button class="action-btn" style="background:var(--rose-danger) !important;" onclick="advanceScenarioStep()">
                        EXECUTE EMERGENCY ACTION ➔
                    </button>
                </div>
            `;
        }
    }
}

function updateTelemetryUI() {
    const speedEl = document.getElementById('tel-speed');
    const ropeEl = document.getElementById('tel-rope');
    const distEl = document.getElementById('tel-dist');
    const brakeEl = document.getElementById('tel-brake');
    const engineEl = document.getElementById('tel-engine');
    const hooksEl = document.getElementById('tel-hooks');

    if (!speedEl) return;

    const currentSpeedMs = (launchVelocity * 10).toFixed(2);
    const unspooledMeters = (BOAT_CONFIG.stowed.y - boatPos.y).toFixed(2);
    const clearanceMeters = Math.max(0, boatPos.y - (-0.7)).toFixed(2);

    speedEl.innerText = `${currentSpeedMs} m/s`;
    ropeEl.innerText = `${unspooledMeters} m`;
    distEl.innerText = `${clearanceMeters} m`;

    if (isWaterborne) {
        brakeEl.innerText = "WATERBORNE";
        brakeEl.style.color = "var(--accent-cyan)";
    } else if (isLowering) {
        brakeEl.innerText = "RELEASED";
        brakeEl.style.color = "var(--accent-orange)";
    } else {
        brakeEl.innerText = "LOCKED";
        brakeEl.style.color = "var(--amber-gold)";
    }

    if (engineEl) {
        engineEl.innerText = AppState.engineStarted ? "RUNNING" : "OFF";
        engineEl.style.color = AppState.engineStarted ? "var(--emerald-success)" : "var(--rose-danger)";
    }

    if (hooksEl) {
        hooksEl.innerText = AppState.hooksReleased ? "RELEASED" : "LOCKED";
        hooksEl.style.color = AppState.hooksReleased ? "var(--accent-cyan)" : "var(--amber-gold)";
    }
}

function setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            playSound('click');
            renderModeUI(btn.dataset.mode);
        });
    });

    window.addEventListener('click', () => {
        if (!audioCtx) initAmbientAudio();
    }, { once: true });
}

function animate(time) {
    requestAnimationFrame(animate);

    const elapsedTime = time * 0.001 || 0;

    if (isLowering || isWaterborne) {
        shipSpeed = Math.max(0.005, shipSpeed * 0.992);
    } else {
        shipSpeed = THREE.MathUtils.lerp(shipSpeed, maxShipSpeed, 0.02);
    }

    if (water) water.material.uniforms['time'].value += shipSpeed;

    let shipRoll = 0, shipPitch = 0, shipHeave = 0;
    if (shipGroup) {
        const m = window.SEA ? SEA.motion(elapsedTime) : { roll: 0, pitch: 0, heave: 0 };
        shipRoll = m.roll; shipPitch = m.pitch; shipHeave = m.heave;

        shipGroup.rotation.z = shipRoll;
        shipGroup.rotation.x = shipPitch;
        shipGroup.position.y = shipHeave;
        shipGroup.updateMatrixWorld(true);
    }

    if (cloudsGroup) {
        cloudsGroup.position.z -= 0.04;
        if (cloudsGroup.position.z < -200) cloudsGroup.position.z = 200;
    }

    updateAerodynamicWindLines();
    if (radarMesh) radarMesh.rotation.y += 0.04;
    updateSplashParticles();
    updateRainSystem();

    if (boatBeaconLight && boatBeaconMesh) {
        const strobe = (Math.sin(elapsedTime * 6.0) + 1.0) * 0.5;
        boatBeaconLight.intensity = 1.0 + strobe * 4.0;
        boatBeaconMesh.material.emissiveIntensity = 1.0 + strobe * 3.0;
    }

    const engineVibe = AppState.engineStarted ? Math.sin(elapsedTime * 65.0) * 0.004 : 0;
    let computedBoatWorldPos = new THREE.Vector3();

    if (boatModel) {
        if (isLowering && !isWaterborne) {
            launchVelocity += GRAVITY_ACCEL;
            launchVelocity *= WINCH_DRAG;
            launchVelocity = Math.min(launchVelocity, TERMINAL_VELOCITY);

            boatPos.y -= launchVelocity;

            const dropRatio = Math.min(1.0, (BOAT_CONFIG.stowed.y - boatPos.y) / (BOAT_CONFIG.stowed.y - BOAT_CONFIG.waterborne.y));
            boatPos.x = THREE.MathUtils.lerp(BOAT_CONFIG.stowed.x, BOAT_CONFIG.waterborne.x, dropRatio);

            const swayAmt = Math.sin(elapsedTime * 8.0) * (0.02 * (1.0 - dropRatio));

            const localBoatPos = new THREE.Vector3(boatPos.x, boatPos.y + engineVibe, boatPos.z);
            computedBoatWorldPos.copy(localBoatPos);
            if (shipGroup) computedBoatWorldPos.applyMatrix4(shipGroup.matrixWorld);

            boatModel.position.copy(computedBoatWorldPos);
            boatModel.rotation.set(shipPitch, 0, shipRoll + swayAmt);

            if (boatPos.y <= BOAT_CONFIG.waterborne.y) {
                isWaterborne = true;
                impactBuoyancyVel = launchVelocity * 0.4;
                triggerSplashEffect(computedBoatWorldPos);
                logInstructorEvent('Lifeboat entered waterline: Impact splash generated & off-load release unlocked.');
            }
        } else if (isWaterborne) {
            const bm = window.SEA ? SEA.boatMotion(elapsedTime) : { y: 0, roll: 0, pitch: 0 };
            if (impactBuoyancyVel > 0.001) {
                boatPos.y -= impactBuoyancyVel;
                impactBuoyancyVel *= 0.85;
            } else {
                boatPos.y = BOAT_CONFIG.waterborne.y + bm.y;
            }

            computedBoatWorldPos.set(
                BOAT_CONFIG.waterborne.x,
                boatPos.y + engineVibe,
                BOAT_CONFIG.waterborne.z
            );

            boatModel.position.copy(computedBoatWorldPos);
            boatModel.rotation.z = bm.roll;
            boatModel.rotation.x = bm.pitch;
        } else {
            const localBoatPos = new THREE.Vector3(boatPos.x, boatPos.y + engineVibe, boatPos.z);
            computedBoatWorldPos.copy(localBoatPos);
            if (shipGroup) computedBoatWorldPos.applyMatrix4(shipGroup.matrixWorld);

            boatModel.position.copy(computedBoatWorldPos);
            boatModel.rotation.set(shipPitch, 0, shipRoll);
        }

        updateWireRopes(elapsedTime, computedBoatWorldPos);
    }

    updateTelemetryUI();

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    if (!container || !renderer || !camera) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

document.addEventListener('DOMContentLoaded', () => {
    init3D();
    renderModeUI('explore');
});