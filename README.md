# DRONE LONG-LINER

A single-file browser game simulating real-world drone survey and long-line payload operations. Built with Three.js r128 and Cannon.js 0.6.2, no build tools or server required — open `DroneLongLiner.html` directly in any modern browser.

---

## Game Modes

### Survey Grid Mode

The drone must fly a lawnmower-pattern grid over a defined survey zone. Each pass scores points based on how closely the drone tracks the ideal line at the target altitude. This mirrors how real survey drones must maintain precise lateral and altitude accuracy to produce usable data.

**How scoring works:**

Each frame, the drone's XZ position is projected onto the current survey line axis. Lateral deviation is the perpendicular distance from that ideal line. Altitude deviation is the absolute difference from the target AGL. Frame score is:

```
score = max(0, 1 - (lateralDev / maxLat) - (altDev / maxAltDev))
```

When a line is completed (t ≥ 0.98 or within 8 units of the end point), that line is committed. If accuracy ≥ 70%, the streak counter increments; otherwise it resets to zero.

**Streak multiplier:**

| Streak | Multiplier |
|--------|-----------|
| 0      | ×1        |
| 1–2    | ×1.5      |
| 3–4    | ×2        |
| 5–7    | ×3        |
| 8+     | ×5        |

Multiplier is capped per difficulty (`multCap`). EASY caps at ×3; all others cap at ×5.

**Survey difficulty:**

| Level  | Wind | Turbulence | Zone Obstacles | Line Spacing | Target Alt | Speed |
|--------|------|------------|----------------|--------------|------------|-------|
| EASY   | 0    | 0          | 0              | 25 m         | 15 m       | 14    |
| MEDIUM | 2.5  | 0.5        | 3              | 20 m         | 15 m       | 12    |
| HARD   | 5    | 1.2        | 8              | 15 m         | 12 m       | 10    |
| EXPERT | 9    | 2.0        | 15             | 10 m         | 10 m       | 8     |

---

### Long-Line Payload Mode

The drone carries a 60 m weighted long-line (24 segments × 2.5 m) with a 20 kg payload attached at the end. The objective is to keep the payload close to the ground (low AGL) and stable (low swing amplitude) while navigating around powerlines and wind turbines over a 3-minute mission.

This mode simulates real drone long-line operations used in mustering, search & rescue, and construction supply — where payload proximity and stability are the primary performance metrics.

**How scoring works:**

- **Proximity bonus** — earned continuously while the payload is below 12 m AGL. Score rate = `(12 - payloadAGL) / 12 * 8 pts/sec`
- **Smoothness bonus** — earned based on low swing amplitude. Swing distance (XZ offset of payload vs drone) is tracked via an exponential moving average (`swingRMS`). Score rate = `max(0, 1 - swingRMS/30) * 2 pts/sec`
- **Penalties** — damage to drone or payload HP from collisions; cable snap ends the run in EXPERT mode

**Long-line difficulty:**

| Level        | Drone HP  | Payload HP | Wind | Turbulence | Instant Fail |
|--------------|-----------|------------|------|------------|--------------|
| BEGINNER     | 100       | 100        | 1.5  | 0.3        | No           |
| INTERMEDIATE | 75        | 60         | 3.5  | 0.8        | No           |
| ADVANCED     | 50        | 30         | 7    | 1.6        | No           |
| EXPERT       | —         | —          | 12   | 3.0        | Yes (any contact) |

In EXPERT mode, `dHP` and `pHP` are set to `Infinity` and the `instant:true` flag causes any collision to immediately end the round.

---

## Technical Architecture

### Single-File Design

All HTML, CSS, JavaScript, and game logic live in one file with zero dependencies beyond two CDN scripts. This enables direct file-system delivery — no server, no build pipeline, no bundler. CDN links:

- Three.js r128: `cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
- Cannon.js 0.6.2: `cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js`

### Physics Architecture

**Drone physics (Cannon.js):**  
The drone has a single Cannon.js `Body` with `mass:1`, `linearDamping:0.75`, and `angularDamping:0.999`. Gravity is counteracted by explicitly applying an upward force each frame (`9.82 * mass`) rather than disabling gravity, so the drone behaves like a real multirotor that must actively fight gravity. Player inputs set target velocities; actual velocity lerps toward the target each frame for smooth, responsive handling.

**Cable physics (Verlet / Position-Based Dynamics):**  
Cannon.js bodies are not used for cable segments — that would require 24 constrained rigid bodies with joints, which is expensive and unstable. Instead, pure Verlet integration with iterative distance constraints is used:

1. For each point (except point 0, which is pinned to the drone), compute velocity as `(currentPos - previousPos) * damping`
2. Apply gravity as `9.82 * dt²` in the Y axis
3. Apply wind force scaled by segment position (more effect at the bottom)
4. Enforce distance constraints: for each adjacent pair, compute the stretch and apply a 50/50 correction (100% to the child for the first segment since parent is pinned)
5. Clamp all points above ground (`y ≥ 0.3`)
6. Repeat constraint loop `LL_ITERS=18` times per frame for stability

The top point (index 0) is re-pinned to the drone attachment position at the start of every constraint iteration — this propagates motion from the drone down through the cable accurately.

**Tension → drone force:**  
After the cable settles, the tension in the first segment is computed:

```
stretch = max(0, distance(point0, point1) - segmentLength)
tension = (payloadMass * 9.82 * 0.65) + (stretch * 700)
```

This force is then applied to the drone body via `applyForce()`, creating realistic payload drag. The `0.65` factor accounts for the fact that a hanging cable distributes load — not the full weight acts as a point pull. If tension exceeds `LL_SNAP_N` (12,000 N), the cable snaps.

**Cable geometry (zero GC pressure):**  
A `Float32Array` of `(LL_SEGS+1) * 3` floats is pre-allocated at cable init and set as a `BufferAttribute`. Each frame the array is updated in-place and `needsUpdate=true` is set. No new arrays or objects are created per frame, keeping the garbage collector idle during gameplay.

### Collision Detection

**Drone vs obstacles (Cannon.js):**  
Trees, rocks, poles, and powerline pylons all have Cannon.js bodies. Collision is detected via the `'collide'` event listener on the drone body. A 250 ms invincibility window prevents multiple damage events from a single collision.

**Cable and payload vs powerlines (manual AABB + segment distance):**  
Powerline wires have no Cannon.js bodies — the sag curve would require many bodies and joints. Instead, every wire segment is stored as a `{ax,ay,az,bx,by,bz,r}` entry. Each frame, every 3rd cable point and the payload are tested against all powerline segments using point-to-segment distance:

```
t = clamp(dot(AP, AB) / dot(AB, AB), 0, 1)
closestPoint = A + t * AB
distance = |P - closestPoint|
```

**Payload and cable vs wind turbine blades (angular sweep):**  
Turbine blades rotate in the XY plane at the hub's world Z position. Rather than using Cannon.js for rotating bodies (which would require per-frame body updates), blade collision is checked geometrically:

1. Check if the test point's Z coordinate is within `±2.8 m` of the hub plane
2. Check if XY distance from hub center is within blade reach (`1.2 m` to `bladeR + 1.5 m`)
3. For each of the 3 blades, compute the angular difference between the point and the blade's current angle (tracked via accumulated rotation, not Three.js quaternion)
4. If angular difference < 0.22 radians, collision

The angular check radius of 0.22 rad (~12.6°) is tuned to match the visual blade width.

### Wind Simulation

Wind is simulated as a time-varying 2D force in the XZ plane:

```javascript
windX = windStrength * sin(simTime * 0.35 + windAngle) * dt²
windZ = windStrength * 0.55 * cos(simTime * 0.28 + windAngle * 0.7) * dt²
windAngle += dt * 0.1 * turbulence
```

In Survey mode this force is applied directly to the drone body. In Long-Line mode it is applied per cable segment with a linear weight factor (`i / LL_SEGS`) — wind has more effect on the lower segments and payload than on the attachment point near the drone.

### Camera

The camera follows the drone with position lerp (`dt*3` factor) and always looks at the drone group. The target position is offset behind and above the drone in the drone's local yaw direction, so the camera automatically sweeps around as the drone turns. During damage events, a random per-frame offset is added to the target position for the duration of `shakeTimer` (0.32 s), producing a screen shake effect without any additional state.

### HUD

**Survey mode HUD:**
- Top bar: score, current line / total lines, health bar + percentage
- Second row: current altitude, streak multiplier, speed (m/s)
- Line progress bar: shows t-value progress along the current survey line
- Deviation widget: circular crosshair in bottom-right showing lateral (X) and altitude (Y) deviation from ideal. Dot colour is green (on target), yellow (warning), red (off track)
- Ghost drone: wireframe box showing the ideal position on the survey line

**Long-line mode HUD:**
- Top bar: score, proximity %, payload AGL (large display), time remaining, drone altitude
- Second row: drone HP bar, payload HP bar, tension bar (with colour coding from cyan → yellow → red), wind direction arrow + speed
- Payload widget: circular crosshair in bottom-left showing XZ offset of payload relative to drone

### Game Flow

```
START SCREEN → [mode + difficulty selection] → START MISSION
  → 3-2-1-GO! countdown (COUNTDOWN state)
  → PLAYING state (physics + scoring active)
  → ESC → PAUSED state (physics frozen, particles continue)
  → End condition → END SCREEN (grade, score, breakdown table)
  → TRY AGAIN → back to PLAYING | CHANGE MODE → back to START SCREEN
```

Best scores are stored in `localStorage` with key `droneLineSim_best_<MODE>_<DIFF>`.

### Scene Layout

**Survey course:**  
38 pine trees and 22 rocks scattered outside the 200×200 m survey zone. 4 poles with catenary wire connections. Inside the zone: 0–15 obstacles depending on difficulty. Survey lines run east–west in alternating directions (lawnmower pattern).

**Long-line course:**  
- 5 powerlines with parabolic wire sag at heights 14–26 m, spanning the arena in different orientations
- 3 wind turbines at varied heights (26–38 m tower) and random rpm (8–18 rpm), positioned away from each other to allow routing options
- 18 trees/rocks for visual context

The powerline at 14 m height is intentionally the most challenging — a 60 m cable hanging from 45 m altitude will easily reach down to that height, requiring the pilot to navigate the payload horizontally around it.

---

## Controls

| Key | Action |
|-----|--------|
| W / S | Forward / Backward |
| A / D | Strafe Left / Right |
| Q / E | Yaw Left / Right |
| ↑ / ↓ | Ascend / Descend |
| Shift | Speed boost (×1.5) |
| ESC | Pause / Resume |

---

## File Structure

The entire game is `DroneLongLiner.html`. Internal sections:

| Section | Lines (approx) |
|---------|----------------|
| HTML + CSS | 1–240 |
| Constants & config | 241–279 |
| State variables | 280–320 |
| Three.js + Cannon.js setup | 321–350 |
| Scene & drone build | 351–395 |
| Obstacle helpers (trees, rocks, poles, wires) | 396–454 |
| Survey obstacle + grid generation | 455–505 |
| Cable init + Verlet step | 506–593 |
| Longline obstacle builders (pylons, powerlines, turbines) | 594–674 |
| Collision helpers (ptSegDist, checkPLHit, checkTurbineHit) | 675–712 |
| Controls + physics update | 713–790 |
| Collision handler + particles | 791–810 |
| Survey scoring + streak | 811–856 |
| Longline scoring + damage | 857–939 |
| HUD update | 940–978 |
| Camera update | 979–990 |
| Game flow (countdown, start, end, pause) | 991–1100 |
| Cleanup + animation loop | 1101–1140 |
| Event listeners + init | 1141–1186 |

---

## Design Decisions & Trade-offs

**Why Verlet rope instead of Cannon.js constraints?**  
Cannon.js hinge/point constraints between 24 bodies would require careful tuning of joint stiffness, solver iterations, and damping to prevent numerical explosions — especially with a 20 kg mass at the end and external wind forces. Verlet PBD is unconditionally stable for distance constraints, predictable to tune, and runs in a tight loop with no object allocation. The trade-off is that it ignores rotational inertia of segments, but for a visual game simulation this is acceptable.

**Why manual collision for cable/payload instead of Cannon.js?**  
Adding 25 Cannon.js bodies (24 cable + 1 payload) that update every frame would significantly increase physics step cost and introduce solver instability at segment junctions. Manual geometric checks against stored line segments are O(n) per check, run outside the physics world, and are easy to tune with simple radius parameters.

**Why accumulated angle tracking for turbine collision?**  
Reading `hub.rotation.z` from Three.js after repeated increments introduces floating-point modular wrap issues. Tracking `t.angle` as a continuously incrementing float and doing modular arithmetic only at collision check time is numerically cleaner and avoids edge cases at the 0/2π boundary.

**Why no ES modules or bundler?**  
The project spec requires direct browser delivery from the filesystem (`file://` protocol). ES module imports are blocked by CORS on `file://` in most browsers. A single `var`-scoped global script in one HTML file is the most portable approach and keeps deployment friction at zero.
