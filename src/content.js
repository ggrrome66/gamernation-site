// ONE source of truth (plan §2). index.html, the in-browser terminal and the
// ANSI /txt pages are all rendered from this object. Never hand-edit a copy.
//
// Honesty rule (plan C8): no invented certifications, clients, or numbers.
// Anything Lukas must confirm is marked TODO:LUKAS and rendered as such.
export const SITE = {
  org: {
    name: "GamerNation Inc.",
    tag: "drones · training · websites · ground-control software",
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
        { k: "TRAIN", v: "Live flight tiers (Basic / Advanced / Complex) on a 4-inch, single-cell (1S) recon platform for emergency services — certification wording TODO:LUKAS. Software survey trainer: see MOD.02 TRAIN." }
      ],
      alt: "Rotating isometric render of a four-arm quadcopter drone",
      fallback: "[ MODEL: QUAD — 4-arm multirotor schematic. Enable JS to see it rotate. ]"
    },
    {
      id: "train", num: "02", chan: "TRAIN", model: "sim",
      title: "Drone survey training sim",
      lede: "Long-distance survey flying for field operators — weather, traffic, wildlife, and the checks before and after you leave the ground. In development.",
      rows: [
        { k: "CORE", v: "Realism-first sim for long-range survey work: plan the flight, fly the corridor, bring the data home." },
        { k: "DRILL", v: "Weather systems, air traffic, wildlife avoidance (birds, bears), plus preflight and postflight inspection until they stick." },
        { k: "PLAY", v: "Optional arcade layers for cloud avoidance and ID tasks; Minecraft-like familiarity so crews learn fast. Windows PC first. Steam / direct / agency path: TODO:LUKAS." }
      ],
      alt: "Rotating isometric render of a survey-sim console with map screen, sticks, and a trainee drone",
      fallback: "[ MODEL: SIM — survey training console schematic. Enable JS to see it rotate. ]"
    },
    {
      id: "net", num: "03", chan: "NET", model: "crt",
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
      id: "ctrl", num: "04", chan: "CTRL", model: "rack",
      title: "Custom drone software",
      lede: "Ground-station and fleet-management software written to fit an operator's actual workflow — not someone else's dashboard.",
      rows: [
        { k: "PLAN", v: "Mission planning built around how your crews actually fly." },
        { k: "WATCH", v: "Live asset monitoring and telemetry capture at the ground station." },
        { k: "KEEP", v: "Post-flight data handling — capture, organize, and hand back the record that matters." }
      ],
      alt: "Rotating isometric render of a ground-station case with antenna mast",
      fallback: "[ MODEL: RACK — ground-station schematic. Enable JS to see it rotate. ]"
    }
  ]
};
