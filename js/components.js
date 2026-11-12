const VESSEL_CONFIG = {
    name: "M/V MARITIME GUARDIAN",
    imo: "9876543",
    callSign: "3FZI8",
    capacity: 25
};

function calculateLSASupplies(capacity) {
    return {
        freshWater: (capacity * 3).toFixed(1) + " Liters (3L/person)",
        foodRations: (capacity * 10000).toLocaleString() + " kJ (10,000 kJ/person)",
        rocketParachuteFlares: "4 Units",
        handFlares: "6 Units",
        buoyantSmokeSignals: "2 Units",
        firstAidKits: "1 SOLAS Compliant Kit",
        thermalProtectiveAids: Math.max(10, Math.ceil(capacity * 0.10)) + " Units (10% capacity min)"
    };
}

const LIFEBOAT_COMPONENTS = [
    {
        id: "davit",
        name: "Davit Launch Arm",
        category: "Launching System",
        function: "Pivots outboard and lowers the lifeboat in a controlled mechanical sequence.",
        location: "Mounted to the vessel's deck structure framing the lifeboat berth.",
        importance: "Essential for gravity or hydraulic outboard deployment without power.",
        safetyNote: "Ensure locking pins are pulled prior to attempting gravity lowering."
    },
    {
        id: "falls",
        name: "Wire Falls",
        category: "Launching System",
        function: "Steel wire ropes connecting davit winches to forward and aft lifting hooks.",
        location: "Suspended vertically from davit arm sheaves down to hook release points.",
        importance: "Keeps the boat level and supports total load during lowering and hoisting.",
        safetyNote: "Inspect for broken strands, corrosion, and end-for-end renewal schedule."
    },
    {
        id: "painter",
        name: "Painter Line",
        category: "Launching System",
        function: "Secures the lifeboat alongside the ship forward of the davit while waterborne.",
        location: "Attached near the bow and secured to a strong point on the ship forward.",
        importance: "Prevents the boat from drifting away or swinging into the ship's side during lowering.",
        safetyNote: "Must remain fastened until the boat is fully waterborne and engine is running."
    },
    {
        id: "painter_release",
        name: "Painter Quick Release",
        category: "Launching System",
        function: "Quick-release toggle allowing immediate detachment of the painter from inside the craft.",
        location: "Mounted internally near the coxswain's forward visibility point.",
        importance: "Allows instant release from the vessel once the engine is engaged.",
        safetyNote: "Never release before engine start unless emergency breakaway is required."
    },
    {
        id: "release_gear",
        name: "On-Load / Off-Load Release Gear",
        category: "Launching System",
        function: "Simultaneously disengages forward and aft fall hooks.",
        location: "Controlled from the coxswain station via hydrostatic and mechanical interlocks.",
        importance: "Critical for safely releasing the craft once waterborne.",
        safetyNote: "Accidental on-load release from height is a major fatality cause; confirm hydrostatic interlock state."
    },
    {
        id: "hull",
        name: "Watertight Hull",
        category: "Structure",
        function: "Provides buoyancy, rigid structural strength, and impact resistance.",
        location: "Outer shell structure made of fire-retardant GRP (Glass Reinforced Plastic).",
        importance: "Primary protective barrier keeping occupants buoyant and shielded from sea forces.",
        safetyNote: "Inspect regularly for gelcoat cracks, impact damage, or delamination."
    },
    {
        id: "seats",
        name: "Seats / Thwarts",
        category: "Structure",
        function: "Internal seating fitted with safety harnesses for all occupants.",
        location: "Arranged symmetrically inside the hull to balance weight distribution.",
        importance: "Prevents occupant injury during water impact and rough seas.",
        safetyNote: "Occupants must secure 4-point harnesses prior to launching."
    },
    {
        id: "entry_hatch",
        name: "Entry Hatch & Doors",
        category: "Structure",
        function: "Watertight access points for embarkation and emergency escape.",
        location: "Side boarding hatches and top escape hatch on the canopy enclosure.",
        importance: "Prevents water ingress during heavy rolling or high-seas operation.",
        safetyNote: "Dog down all hatches securely before lowering into burning oil or rough water."
    },
    {
        id: "canopy",
        name: "Enclosed Canopy",
        category: "Structure",
        function: "Provides weather shielding and self-righting capability if inverted.",
        location: "Upper enclosure structure covering the top of the lifeboat hull.",
        importance: "Shields occupants from hypothermia, radiant heat, and seawater entry.",
        safetyNote: "Maintain seal integrity to preserve self-righting buoyancy characteristics."
    },
    {
        id: "drain_plug",
        name: "Automatic Drain Plug",
        category: "Structure",
        function: "Drains rainwater while stowed; seals automatically upon flotation.",
        location: "Located at the lowest point of the bilge inside the hull bottom.",
        importance: "Prevents accumulation of water on deck while stowed.",
        safetyNote: "Verify cap or automatic valve is clean and clear of debris prior to launching."
    },
    {
        id: "grab_lines",
        name: "Exterior Grab Lines / Lifeline",
        category: "Structure",
        function: "Provides handholds for survivors swimming in the water alongside.",
        location: "Looped securely along the exterior perimeter of the hull.",
        importance: "Enables survivors in the water to hold onto the craft during rescue.",
        safetyNote: "Check for rope degradation, UV damage, and secure attachment fittings."
    },
    {
        id: "engine",
        name: "Inboard Diesel Engine",
        category: "Propulsion & Steering",
        function: "Compression-ignition engine providing self-contained propulsion.",
        location: "Enclosed central engine casing towards the aft quarter.",
        importance: "Required to maintain at least 6 knots speed for 24 hours under SOLAS.",
        safetyNote: "Perform weekly 3-minute test runs; check dual battery cranking systems."
    },
    {
        id: "rudder",
        name: "Steering Rudder",
        category: "Propulsion & Steering",
        function: "Hydrodynamic control surface that directs water flow to steer the boat.",
        location: "Mounted externally at the stern behind the propeller.",
        importance: "Enables directional control away from sinking vessels and hazards.",
        safetyNote: "Check pintles, gudgeons, and linkage for mechanical binding."
    },
    {
        id: "tiller",
        name: "Emergency Tiller / Steering Control",
        category: "Propulsion & Steering",
        function: "Manual mechanical control arm connected to the rudder stock.",
        location: "Located at the coxswain station at the aft end of the enclosure.",
        importance: "Provides direct mechanical steering control or backup if wheel linkages fail.",
        safetyNote: "Ensure emergency tiller extension bar is stowed in its marked location."
    },
    {
        id: "paddles",
        name: "Auxiliary Paddles",
        category: "Propulsion & Steering",
        function: "Manual oars/paddles used for close-quarters maneuvering if engine fails.",
        location: "Stowed in brackets along the interior canopy wall.",
        importance: "Secondary propulsion backup for positioning or silent maneuvering.",
        safetyNote: "Keep crutches/rowlocks secured to the boat by lanyards."
    },
    {
        id: "compass",
        name: "Binnacle Compass",
        category: "Navigation",
        function: "Luminous, liquid-filled magnetic compass for heading reference.",
        location: "Mounted directly in front of the coxswain's helm position.",
        importance: "Allows navigation away from vessel distress positions without electronic power.",
        safetyNote: "Keep free of metallic storage or magnetic interference objects."
    },
    {
        id: "lifejackets",
        name: "SOLAS Lifejackets",
        category: "Safety & Survival",
        function: "Individual flotation devices with whistle and light.",
        location: "Stowed in designated dry storage lockers under thwarts.",
        importance: "Provides emergency buoyancy for all rated occupants.",
        safetyNote: "Quantity must match or exceed the vessel's rated capacity badge."
    },
    {
        id: "emergency_supplies",
        name: "Emergency Rations & Pyrotechnics",
        category: "Safety & Survival",
        function: "Watertight emergency food, drinking water, first aid, and signaling flares.",
        location: "Stowed in sealed watertight survival lockers.",
        importance: "Sustains life during extended sea survival scenarios.",
        safetyNote: "Quantities calculated directly using LSA Code formulas; check expiration dates."
    },
    {
        id: "sprinkler",
        name: "Water Spray Sprinkler System",
        category: "Safety & Survival",
        function: "Drives sea-water pumps to coat the exterior canopy with water spray.",
        location: "Piping network with atomizing nozzles running along the top outer canopy.",
        importance: "Shields occupants from extreme heat when escaping through burning oil fires.",
        safetyNote: "Ensure intake valve is clear and engine-driven pump is engaged prior to fire passage."
    },
    {
        id: "exterior_light",
        name: "Exterior All-Round Light",
        category: "Safety & Survival",
        function: "Automatic top-mounted flashing or steady beacon light.",
        location: "At the highest exterior point of the canopy structure.",
        importance: "Allows search and rescue vessels to spot the lifeboat in darkness.",
        safetyNote: "Check battery charge indicator and water-activation sensor contacts."
    }
];

// js/components.js - SOLAS Rescue Boat Technical Component Registry

// js/components.js - SOLAS Rescue Boat Technical Component Registry

// js/components.js - SOLAS Rescue Boat Technical Component Registry

const MODEL_MESH_COMPONENTS = {
    // Hull Body & Self-Righting Enclosure
    "Body": {
        name: "Self-Righting FRP Composite Hull Body",
        category: "Hull Structure",
        function: "The primary flame-retardant glass-reinforced plastic (GRP/FRP) shell engineered to absorb wave impacts and maintain structural integrity.",
        location: "Main Lifeboat Structure",
        importance: "Provides complete watertight integrity and positive reserve buoyancy, ensuring automatic self-righting if capsized in heavy sea states.",
        safetyNote: "Inspect outer gelcoat skin for osmotic blistering, fiberglass delamination, or structural stress fractures."
    },

    // Vessel Identification
    "Callsign": {
        name: "SOLAS Vessel Identification & Callsign",
        category: "Maritime Identification",
        function: "High-contrast lettering displaying the rescue boat's unique radio callsign, ship name, and port of registry.",
        location: "Port and Starboard Bow Canopy",
        importance: "Allows immediate visual identification by Coast Guard authorities, SAR aircraft, and nearby vessel traffic during maritime operations.",
        safetyNote: "SOLAS Reg III/9 requires vessel markings to be permanently visible and contrasting with hull paint."
    },

    // Water Spray Protection System
    "Sprinkler": {
        name: "Deluge Water Spray System",
        category: "Fire Protection",
        function: "A dedicated sea-water pump network feeding external spray nozzles to form a continuous water curtain over the hull.",
        location: "Canopy Roof Peak & Perimeter Nozzles",
        importance: "Protects occupants and structural integrity by shielding the craft against intense radiant heat when navigating through oil slicks or burning sea surfaces.",
        safetyNote: "Inspect pump intake strainers and flush spray nozzles regularly to prevent salt crystallization or blockage."
    },

    // Release Hook System
    "Release Hook": {
        name: "On/Off-Load Release Hook",
        category: "Safety & Launching",
        function: "Main structural hook mechanism connecting the rescue boat to the davit wire falls.",
        location: "Forward and Aft Lifting Points",
        importance: "Allows immediate dual-hook detachment upon water flotation or controlled emergency off-load drop.",
        safetyNote: "SOLAS Reg III/17 requires annual load testing and hydrostatic interlock verification."
    },

    // Gunwale
    "Gunwail": {
        name: "Reinforced Gunwale",
        category: "Hull Structure",
        function: "The upper edge of the rescue boat's side hull, providing structural stiffness and grab support.",
        location: "Port and Starboard Hull Rim",
        importance: "Absorbs heavy fender impacts against the shipside during embarkation and recovery in high sea swells.",
        safetyNote: "Inspect elastomer fendering strips along the gunwale for tears or structural cracking."
    },

    // Entrance Hatches & Hatch
    "Cylinder116_1": {
        name: "Watertight Boarding Hatches",
        category: "Hull Enclosure",
        function: "Primary entry and egress points for rescued survivors and operating crew.",
        location: "Canopy Roof and Stern Entrance",
        importance: "Seals the inner compartment to maintain self-righting buoyancy during heavy capsizing conditions.",
        safetyNote: "Verify rubber compression gaskets are lubricated and free of debris to prevent water ingress."
    },
    "Hatch": {
        name: "Inspection & Access Hatch",
        category: "Maintenance Point",
        function: "Provides quick access to internal bilges, fuel shutoff valves, and battery isolator switches.",
        location: "Deck Midship & Engine Housing",
        importance: "Allows crew to perform emergency engine checks and bilge pumping without compromising main cabin seal.",
        safetyNote: "Ensure dogging clamps are fully latched before lowering into active surf."
    },

    // Propeller & Propulsion
    "Propeller": {
        name: "Ducted Marine Propeller",
        category: "Propulsion System",
        function: "Converts diesel engine torque into directional thrust for maneuvering during search and rescue operations.",
        location: "Stern Below Waterline",
        importance: "Enclosed in a protective nozzle/guard to prevent injury to survivors in the water during recovery.",
        safetyNote: "Inspect prop blades for entanglements, rope burn, or pitting prior to every launch sequence."
    },

    // Exterior Lifelines
    "Lifeline": {
        name: "Buoyant Exterior Lifeline",
        category: "Rescue Gear",
        function: "Heavy-duty synthetic ropes festooned around the outer hull perimeter.",
        location: "Outer Hull Below Gunwale",
        importance: "Gives survivors floating in the sea an immediate handhold to cling onto beside the boat.",
        safetyNote: "Check loop knots and mounting eyes to ensure lines do not fray or sag below the waterline."
    },

    // SOLAS Retro-Reflective Tape
    "Reflective_Tape": {
        name: "SOLAS Grade Retro-Reflective Tape",
        category: "Visibility & Search",
        function: "High-intensity micro-prismatic tape bands designed to reflect searchlights and radar signals.",
        location: "Canopy Roof, Gunwales, and Bow Rim",
        importance: "Ensures maximum night-time radar and optical visibility during emergency nighttime SAR missions.",
        safetyNote: "Replace weathered or peeling patches to maintain compliance under SOLAS Chapter III."
    }
};