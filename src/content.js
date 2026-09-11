// ONE source of truth (plan §2). index.html, the in-browser terminal and the
// ANSI /txt pages are all rendered from this object. Never hand-edit a copy.
//
// Honesty rule (plan C8): no invented certifications, clients, or numbers.
// Anything Lukas must confirm is marked TODO:LUKAS and rendered as such.
export const SITE = {
  org: {
    name: "GamerNation Inc.",
    tag: "drones · websites · ground-control software",
    jurisdiction: "Federal corporation, Canada",
    // TODO:LUKAS — real contact mailbox. Until it contains an "@" the site
    // renders a TODO marker instead of a live mailto: link.
    email: "TODO:LUKAS",
    domain: "gamernation.ca",
    node: "rpi"
  },

  hero: {
    boot: "> we build the drone, the software, and the page you found this on."
  },

  // "Calvin S" style box-drawing wordmark, 41 columns wide (fits 72-col txt).
  banner: [
    "╔═╗ ╔═╗ ╔╦╗ ╔═╗ ╦═╗ ╔╗╔ ╔═╗ ╔╦╗ ╦ ╔═╗ ╔╗╔",
    "║ ╦ ╠═╣ ║║║ ║╣  ╠╦╝ ║║║ ╠═╣  ║  ║ ║ ║ ║║║",
    "╚═╝ ╩ ╩ ╩ ╩ ╚═╝ ╩╚═ ╝╚╝ ╩ ╩  ╩  ╩ ╚═╝ ╝╚╝",
    "                                     INC."
  ],

  modules: [
    {
      id: "air", num: "01", chan: "AIR", model: "quad",
      title: "Drones & drone services",
      lede: "Purpose-built small UAS — designed, built, flown, and taught, end to end.",
      rows: [
        { k: "BUILD", v: "Airframe design, fabrication, integration, and bring-up of purpose-built small UAS." },
        { k: "FLY", v: "Survey and inspection flights flown to a plan, with data delivered — not just imagery dumped." },
        { k: "TRAIN", v: "Three tiers — Basic, Advanced, and Complex — the last built around a 4-inch, single-cell (1S) recon platform for emergency services. Certification and flight-review wording: TODO:LUKAS." }
      ],
      alt: "Rotating isometric render of a four-arm quadcopter drone",
      fallback: "[ MODEL: QUAD — 4-arm multirotor schematic. Enable JS to see it rotate. ]"
    },
    {
      id: "net", num: "02", chan: "NET", model: "crt",
      title: "Websites & social for small businesses",
      lede: "Hand-built sites that load on bad rural connections and cheap phones — this very page is the demo, running on a single-board computer.",
      rows: [
        { k: "SITES", v: "Small, fast, hand-built pages. No bloated themes, no third-party trackers, no surprise invoices for plugins." },
        { k: "SOCIAL", v: "Ongoing social updates handled on a schedule, so a small operator isn't drafting posts at 11pm." },
        { k: "HOST", v: "Set up to run cheap and keep running — the same way this site runs on a Raspberry Pi." }
      ],
      alt: "Rotating isometric render of a CRT monitor and keyboard",
      fallback: "[ MODEL: CRT — terminal workstation schematic. Enable JS to see it rotate. ]"
    },
    {
      id: "ctrl", num: "03", chan: "CTRL", model: "rack",
      title: "Custom drone software",
      lede: "Ground-station and fleet-management software written to fit an operator's actual workflow — not someone else's dashboard.",
      rows: [
        { k: "PLAN", v: "Mission planning built around how your crews actually fly." },
        { k: "WATCH", v: "Live asset monitoring and telemetry capture at the ground station." },
        { k: "KEEP", v: "Post-flight data handling — capture, organize, and hand back the record that matters." }
      ],
      alt: "Rotating isometric render of a ground-station case with antenna mast",
      fallback: "[ MODEL: RACK — ground-station schematic. Enable JS to see it rotate. ]"
    },
    {
      id: "arch", num: "04", chan: "ARCH", model: "crate",
      title: "Container architecture",
      lede: "Retrofitted shipping containers as off-grid cabins, shops, and camps — one box or a whole compound. The configurator on the ARCH page lets you swap interior modules, pick an exterior, and stack units into radical layouts.",
      rows: [
        { k: "BOX", v: "ISO high-cube containers, 20' and 40'. Insulated, wired, plumbed, and fitted out as a one-bedroom cabin or a pure-function work unit." },
        { k: "FIT", v: "Interior packed like a submarine: every bay is a swappable module — berth, galley, workbench, micro-farm, power station, ops desk, wet room, lockers." },
        { k: "JOIN", v: "Corner castings are rated for stacking at sea, so units join side-by-side, end-to-end, and vertically: courtyards, stacked lofts, a stepped pyramid, or a walled compound." },
        { k: "OPEN", v: "Interactive 3D configurator: /architecture.html" }
      ],
      link: { href: "architecture.html", label: "[ OPEN CONFIGURATOR ]" },
      alt: "Rotating isometric render of a shipping container fitted with a solar array and a stove flue",
      fallback: "[ MODEL: CRATE — container cabin schematic. Enable JS to see it rotate. ]"
    }
  ],

  // ── MOD.04 configurator copy (architecture.html + txt/arch.txt) ──────
  // Dimensions are standard ISO figures. Everything else is a design
  // example, not a quotation — the notes below say so on the page.
  arch: {
    title: "Container architecture",
    tag: "off-grid cabins · shops · camps — built from shipping containers",
    lede: "One retrofitted shipping container in a dense mixed-wood forest: a light steam/solar-punk one-bedroom stonework cabin-shop, off grid. Swap the interior modules, change the exterior, then join and stack units into something much bigger.",
    how: [
      "Drag the render to orbit. Scroll or use the zoom keys. CUTAWAY removes the roof and the walls facing you so the interior is always visible.",
      "Each bay of a container holds one module. Pick a unit, then set its bays — every combination is valid; the manifest below updates as you go.",
      "The frame is the frame: nothing here needs a structural change to the box except the buried option, which does (see the notes)."
    ],
    layouts: [
      { id: "s20", name: "SINGLE 20'", blurb: "One 20-foot high-cube. Four bays, a door end, a deck. The base one-bedroom cabin or a single work unit." },
      { id: "s40", name: "SINGLE 40'", blurb: "One 40-foot high-cube. Eight bays — room for a bedroom, galley, wet room, and a full workshop in one line." },
      { id: "twin", name: "TWIN 20'", blurb: "Two 20-foot units side by side with the shared wall opened up: a 4.9 m wide room, eight bays." },
      { id: "stack", name: "STACKED LOFT", blurb: "Two 40-foot units on the ground, a third on top with a roof deck beside it. Sixteen bays down, eight up." },
      { id: "court", name: "ROMAN COURT", blurb: "Two 40-foot and two 20-foot units around a central courtyard — an atrium with a planted impluvium in the middle. Twenty-four bays." },
      { id: "pyramid", name: "PYRAMID HOUSE", blurb: "Seventeen 20-foot units in four stepped tiers, each tier's roof a terraced garden with solar. A ziggurat in the woods." },
      { id: "compound", name: "WALLED COMPOUND", blurb: "A perimeter wall of 40-foot units stacked two high, a four-high turret at each corner, and a central eight-storey tower with an observation deck." }
    ],
    exteriors: [
      { id: "bare", name: "BARE STEEL", blurb: "Weathering (corten-style) steel left as delivered. Cheapest shell; all insulation goes inside, which costs floor width." },
      { id: "coated", name: "COATED", blurb: "Elastomeric / ceramic-loaded coating over the corrugation. Reflective, sealed, repaintable. Insulation still inside." },
      { id: "stone", name: "STONEWORK", blurb: "Stone veneer on a ventilated rail over external insulation. The cabin look: thermal mass, fireproof, quiet." },
      { id: "foam", name: "SPRAY FOAM", blurb: "Closed-cell spray foam applied outside the box, then clad. Continuous insulation, no thermal bridges, full interior width kept." },
      { id: "buried", name: "BURIED / BERMED", blurb: "Earth-sheltered: the box sits in a cut with a sod roof and a stone-faced entry. Very stable temperatures. Needs waterproofing, drainage, and reinforcement — see notes." }
    ],
    grades: [
      { id: "util", name: "UTILITARIAN", blurb: "Pure function: insulated shell, skid frame with forklift pockets, steel steps, small windows, original doors, generator-ready. Remote drill operations, survey camps, sites." },
      { id: "prem", name: "PREMIUM (YACHT)", blurb: "Yacht-grade joinery: teak deck and rail, glazed end wall, brass and copper fittings, planters, stone plinth. The civilian cabin." }
    ],
    lights: [
      { id: "day", name: "DAY" },
      { id: "dusk", name: "DUSK" }
    ],
    modules: [
      { id: "bed", name: "BERTH", blurb: "Full berth over drawer storage, lockers above, reading light, curtain rail. The one bedroom." },
      { id: "galley", name: "GALLEY", blurb: "Counter, sink, induction hob, fridge drawer, overhead lockers. Compact as a boat galley." },
      { id: "head", name: "WET ROOM", blurb: "Shower pan, composting toilet, basin, roof vent. Frosted partition." },
      { id: "store", name: "LOCKER WALL", blurb: "Floor-to-ceiling submarine lockers with recessed latches. Where everything lives." },
      { id: "bench", name: "WORKBENCH", blurb: "Hardwood bench, vise, pegboard wall, tool shelf, task light. The shop." },
      { id: "farm", name: "MICRO-FARM", blurb: "Three-tier hydroponic racks under grow lights. Greens and herbs year-round; a roof light over the bay outside." },
      { id: "power", name: "POWER STATION", blurb: "Battery rack, inverter, charge controller, breaker panel. Feeds the roof solar and the turbine mast." },
      { id: "water", name: "WATER PLANT", blurb: "Twin tanks, filter stack, pump, copper runs. Fed from the roof gutter and rain barrel." },
      { id: "comms", name: "OPS DESK", blurb: "Two screens, radio stack, map board, antenna feed. The ground station — drone operations run from here." },
      { id: "drone", name: "DRONE BAY", blurb: "Charging shelves for small UAS, battery bank, spares wall. Fleet ready." },
      { id: "stove", name: "STOVE", blurb: "Small wood stove with a copper flue through the roof, log store, warming bench. The steam-punk heart." },
      { id: "air", name: "AIRLOCK", blurb: "Inner door and mudroom: bench, boot rack, drying hooks, grated floor. For cold sites and dirty work." },
      { id: "open", name: "OPEN FLOOR", blurb: "Nothing fitted. Flex space, a table, or room for a module you have not chosen yet." }
    ],
    presets: [
      { id: "cabin", name: "FOREST CABIN", layout: "s20", ext: "stone", grade: "prem", light: "dusk", bays: ["stove", "galley", "bed", "head"] },
      { id: "shop", name: "CABIN-SHOP", layout: "s40", ext: "stone", grade: "prem", light: "day", bays: ["bench", "bench", "drone", "power", "galley", "head", "bed", "farm"] },
      { id: "drill", name: "DRILL CAMP", layout: "twin", ext: "foam", grade: "util", light: "day", bays: ["air", "store", "bed", "bed", "power", "water", "galley", "head"] },
      { id: "ops", name: "OPS POST", layout: "s20", ext: "buried", grade: "util", light: "dusk", bays: ["air", "comms", "drone", "power"] },
      { id: "homestead", name: "HOMESTEAD", layout: "court", ext: "coated", grade: "prem", light: "day", bays: ["farm", "farm", "water", "power"] }
    ],
    notes: [
      "Dimensions are standard ISO: 20' = 6.06 × 2.44 m, 40' = 12.19 × 2.44 m, high-cube 2.90 m tall. Bay counts, areas, and the manifest are computed from those figures.",
      "Stacking: ISO corner castings and posts carry the loads at sea, so intact boxes stack corner-on-corner. Every opening cut into a wall reduces that; the tall layouts here are design examples, and any real build gets an engineer.",
      "Buried / bermed: container walls are not designed for lateral soil load. An earth-sheltered unit needs a retaining structure, membrane waterproofing, and drainage. It is the one option that changes the box.",
      "This page is a configurator, not a quotation. Costs, delivery, and site work depend on the ground you are standing on."
    ]
  }
};
