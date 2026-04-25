# Changelog

## Purpose

This document tracks all notable changes to World of Pirates across versions. It follows [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/). Use this to understand what changed between versions and when features were added, modified, or fixed.

## Key Concepts

- **Semantic Versioning**: MAJOR.MINOR.PATCH (e.g., 0.2.0)
  - MAJOR: Breaking changes or major feature overhauls
  - MINOR: New features, backward-compatible
  - PATCH: Bug fixes, backward-compatible
- **Change Categories**: Added, Changed, Fixed, Removed, Deprecated
- **Unreleased Section**: Tracks changes not yet in a tagged release

## Canonical Assumptions

### Version Numbering Rules
- **Pre-1.0**: Development phase, breaking changes allowed
- **0.x.0**: Minor version bumps for feature additions
- **0.0.x**: Patch version bumps for bug fixes only
- **Unreleased**: Always at top, tracks current development

### Change Documentation Standards
- Every user-facing change must be documented
- Include code references for significant changes
- Group related changes under same version
- Use past tense for completed changes

---

## [0.6.2] - 2026-04-25

### ⚔️ Tactical Naval Combat Update
- Naval fights now have more tactical depth: you can damage sails to slow enemies, switch ammunition types mid-battle, and better judge when a ship is vulnerable to pursuit or boarding.

### Added
- Added sail integrity and crew loss as ship damage layers on top of hull damage.
- Added ammo switching between standard shot and chain shot with a reload penalty when changing ammunition.
- Added new HUD feedback for current ammo and visible sail damage on ships in combat.

### Changed
- Damaged sails now reduce a ship's speed and acceleration, making crippled ships easier to chase down.
- Chain shot now focuses on disabling enemy sails without being quite as overwhelming as before.
- Enemy and player ships now show separate hull and sail status bars for faster combat reads.

### Fixed
- Fixed ammo switching incorrectly playing cannon fire sounds without an actual shot.
- Fixed cases where a sunk player flagship could fail to leave behind a wreck when another ship remained in the fleet.

---

## [0.6.1] - 2026-04-18

### 🌊 Living World Scalability Refactor
- Refactored NPC traffic system to support multiplayer scalability and reduce CPU cost.
- The system now separates high-frequency simulation from low-frequency traffic management.

### Key Changes
- **Spatial Partitioning**: Introduced grid-based spatial partitioning (~2000 units).
- Materialization queries only nearby ships instead of scanning all.
- **Result**: Reduced per-player computation from O(players × ships) to near O(players + ships).

### Shared NPC Materialization
- Each StrategicShip now maps to a single active NPCShip.
- Added ActiveNPC registry that tracks entityId and visible players.
- NPCs are no longer duplicated per player.
- **Result**: Stable NPC counts in multiplayer scenarios.

### Decoupled Loops & Strategic Updates
- Materialization no longer runs every frame (now fixed at ~200–500 ms).
- StrategicShips now update at ~1 Hz with movement based on time delta.
- **Result**: Lower CPU usage and efficient large-scale simulation with no visible impact on gameplay.

### Architectural Impact
- The system now cleanly separates Strategic, Tactical, and Materialization layers.
- **Outcome**: Multiplayer scaling significantly improved, and NPC traffic remains visually consistent.
- **Note**: This lays the foundation for convoy systems and pirate encounters without requiring further core changes.

---

## [0.6.0] - 2026-04-18

### 🚢 Living Seas Update
- **Living World Traffic**: The sea now feels busier thanks to a new lightweight traffic system that keeps ships moving without burdening the server.
- **Ships Appear Already Sailing**: NPC ships now show up naturally on travel lanes instead of popping in at harbors or clustering on waypoint nodes.
- **Denser Nearby Activity**: Quiet waters now get extra local traffic so players are less likely to sail through empty stretches.
- **Regional Ship Variety**: Different parts of the Caribbean now feel more distinct, with their own ship mixes, pirate presence, and ship names.
- **More Memorable Names**: Generic labels like "Merchant Vessel" have been replaced with more flavorful region-based ship names.

### Added
- Added a living world traffic layer that keeps merchant and pirate ships moving between harbors in the background.
- Added local ambient traffic near players so the sea stays lively even when long-distance traffic is sparse.
- Added regional ship flavor, including different ship types, pirate frequency, and naming styles depending on where you sail.
- Added test coverage for route progress, ship materialization, local traffic density, and regional variation.

### Changed
- Changed NPC traffic spawning so ships can enter the world already underway, making encounters feel smoother and more believable.
- Changed local traffic behavior so nearby ships are more likely to cross your path or approach from different directions instead of simply sailing away with you.
- Changed long-range traffic generation so some sea lanes now include pirate ships as part of the world’s background activity.
- Changed route progress handling so ships move along each route segment properly, which improves how traffic appears in motion.

### Fixed
- Fixed local traffic ships despawning immediately when using short precomputed routes.
- Fixed nearby local ships disappearing too aggressively while still close to players or shortly after combat.
- Added temporary debug logging for local traffic despawns so suspicious removals are easier to diagnose during testing.

## [0.5.1] - 2026-03-15

### Added
- Added extra automated coverage for server loop stability, harbor synchronization, and player session flow.

### Changed
- Improved server startup safety so duplicate loop starts do not create overlapping timers.
- Clarified the current automated test command in the README.

### Fixed
- Fixed game loop shutdown cleanup so background timers are fully cleared.
- Fixed harbor exit fallback logic so valid zero-direction values are preserved.
- Improved shutdown handling so the server stops the game loop cleanly before exit.


## [0.5.0] - 2026-03-07

### 🧭 Navigation & AI Overhaul
- **Static Waypoint Graph**: Completely discarded the massive procedural 70+ node pathfinding network. Replaced it natively with a sparse, human-readable 28-node graph (48 edges) manually outlining major Caribbean sea corridors.
- **Dijkstra-Filtered Corridors**: The new static graph actively filters out any manually drawn connection that does not yield a >15% travel distance improvement, leaving only robust sea highways.
- **Spawn-to-Route Interception**: NPCs spawning mid-ocean no longer clumsily sail backward to find an explicit "anchored node". They orthogonally project their coordinates onto the first edge of their A* path, run a rigorous `isLineOfSightClear` check via `worldMap.isPassable(x, y)`, and dynamically merge linearly into the trade lane.
- **Startup Protection Validation**: `WaypointGraph` now strictly samples `isPassable` every 50 world-units across all active edges inside `verifyEdges(worldMap)`. The server correctly throws a fatal boot error to halt execution if any custom node modifications collide with `LAND`.
- **Performance**: A* distance searches on the explicit 28 nodes drop overhead computations far under `< 0.1ms`.

---

## [0.4.7] - 2026-02-17

### ⚖️ Gameplay Tuning
- **Collision Physics Refinement**:
    - **Ramming Penalty**: Increased speed penalty for the aggressor from 5% to **95%**. Hitting another ship now stops you almost instantly, preventing "bulldozing".
    - **Angle Detection**: Refined "Facing" logic to use a **~70° cone** (1.2 rads). This ensures that valid T-Bone collisions (90°) do not incorrectly penalize the victim ship.
    - **Bug Fix**: Fixed a coordinate system mismatch (PI/2 offset) that caused rear-end collisions to be miscalculated.

## [0.4.6] - 2026-02-16

### ⚖️ Gameplay Tuning
- **Collision Physics**: Reduced collision speed penalty from 50% to **5%**. Ships now slide against each other with friction rather than coming to a dead stop.
- **NPC Formation**: Pirates now use formation offsets during combat to fan out (~23° spread) instead of stacking on top of each other.
- **Pirate AI**: Fixed a bug where Pirates ignored their avoidance logic during combat. They now correctly steer around obstacles while pursuing targets.

### 🐛 Bug Fixes
- **Cargo Capacity**: Fixed a critical bug where players would lose their cargo capacity (0t) after recovering from a raft or upgrading their ship.

## [0.4.5] - 2026-02-14

### 📱 Mobile Controls
- **Touch Overlay**: Added virtual joystick (Left) and action pad (Right) for mobile devices.
- **Interact Button**: New 'Anchor' button for docking and looting.
- **Viewport Stabilization**: Added logic to handle mobile browser address bars and notches.
- **Orientation Lock**: Added "Rotate Device" warning for portrait mode.

## [0.4.4] - 2026-02-14

### 🖥️ UI Improvements
- **Dynamic Viewport**: Game canvas now resizes dynamically to fill the entire browser window (Removed fixed 1024x768 resolution).
- **Responsive UI**: HUD elements (Speed, Notifications, Chat) anchor correctly to screen edges on all resolutions.
- **Minimap**: Optimized minimap rendering to persist across window resizes without flickering.

### Fixed
- **Minimap Black Screen**: Fixed an issue where resizing the window would clear the minimap content.

## [0.4.3] - 2026-02-14

### 🖥️ UI Improvements
- **Mission Display**: Moved the "Active Mission" window into the game view (overlay) and reduced its width to 50% for better visibility.
- **Chat Integration**: 
  - Chat Log and Input are now anchored to the game window (Bottom-Right).
  - Added **`C`** key toggle to hide/show chat.
- **Controls Legend**: 
  - Legend is now hidden by default. Added **`H`** key toggle.
  - Rebound Changelog check to **`L`**.
  - Added a persistent "Controls Hint" in the bottom-left corner.

## [0.4.2] - 2026-02-12

### 🚀 Highlights
- **"Pirate Hunt" Mission Overhaul**: The "Defeat NPCs" mission is now a proper hunt! Sail to a specific deep-water location 1-2km away to find your targets.
- **Smarter Spawns**: Enemies now spawn exclusively in deep water with a safe buffer from land, ensuring clean naval battles.
- **Mission Stability**: Fixed issues with mission acceptance and persistence during harbor operations.

### Changed
- **Kill Mission Logic**: Refactored `DefeatNPCsMission` to use a two-phase system (Departure -> Combat).
  - Target location generated 1000-2000px away.
  - Pirates spawn only when player reaches the hunting ground.
  - Target pirates fight to the death (no fleeing).
- **Spawn System**: Added `NPCManager.findDeepWaterSpawn()` to prioritize open ocean for mission targets.
- **Harbor Data Sync**: Centralized harbor data emission to ensure mission list persists after repairs or ship switching.

### Fixed
- **Mission Acceptance**: Fixed bug where "Pirate Hunt" missions were ignored by the server upon acceptance.
- **UI Persistence**: Fixed bug where missions disappeared from the board after interacting with shipyard services.
- **Escort Mission**: Fixed potential cancellation issues during harbor exit.

## [0.4.1] - 2026-02-11

### 🚀 Highlights
- **Two-Phase Escort Missions**: Escort missions now use a sophisticated two-phase system! First, sail to a rendezvous point (DEPARTURE phase), then protect the trader as they travel to their destination (ESCORT phase). This creates more engaging gameplay and prevents spawn issues.
- **Improved NPC Spawn Validation**: All NPCs now spawn in validated water positions using intelligent spiral search, preventing land spawns and stuck NPCs.
- **Fixed Pirate Targeting**: Pirates in escort missions now correctly attack the trader NPC instead of the player, making escort missions properly challenging.

### Added
- **DEPARTURE Phase**: New initial mission phase where player leaves harbor and reaches a rendezvous point
  - Spawn point calculated 600px from harbor toward destination (when docked) or 300px from player (debug mode)
  - Spawn point validated to ensure it's in navigable water
  - Trader spawns only after player reaches rendezvous
- **Spawn Validation System** (`NPCManager.findSafeSpawnPosition`): 8-direction spiral search to find valid water spawn positions
  - Searches up to 200px radius in 25px increments
  - Prevents NPCs spawning on land or in collision zones
  - Used for both trader and pirate spawns

### Changed
- **Escort Mission Architecture**: Complete rewrite of `EscortMission.js` with state machine
  - Phase management: `DEPARTURE` → `ESCORT`
  - Conditional spawn distance based on mission trigger (harbor vs debug)
  - Rendezvous point validation before proceeding to escort phase
- **Pirate Spawn Logic**: Removed random offset from `NPCManager.spawnPirate()`, now uses validated coordinates from caller
- **Target Selection**: Enhanced `NPCShip.selectCombatTarget()` to validate pre-assigned targets with same criteria as search
  - Added flagship validation for pre-assigned targets
  - Reduced debug logging to only show when targets change

### Fixed
- **Double NPC Spawn**: Removed immediate trader spawn from `server.js` acceptMission handler
- **NaN Spawn Coordinates**: Added zero-distance validation when target harbor equals origin harbor
- **Pirates Attacking Player**: Pirates now correctly maintain their pre-assigned escort NPC target
- **Debug Escort Mission**: Fixed `findNextClosestHarbor()` to always skip nearest harbor, ensuring different origin/target
- **Land Spawns**: Pirates no longer spawn on land during escort missions

### Technical Details
- Modified files: `EscortMission.js`, `NPCManager.js`, `NPCShip.js`, `server.js`
- New helper: `NPCManager.findSafeSpawnPosition()`
- Escort mission now properly manages NPC lifecycle through phase transitions


## [0.4.0] - 2026-02-11

### 🚀 Highlights
- **Immersive Harbor Experience**: The harbor menu has been reimagined! Instead of a simple list, you now visit specific locations: the Governor's Mansion, Merchant's Market, and Shipyard.
- **Harbor Occupants List**: You can now see a list of other captains currently docked in the same harbor.
- **Improved Docking**: Ships now properly disappear from the world map when docked, reducing clutter and improving immersion.

### 🔧 Tech & Polish
- **Socket Rooms**: Refactored harbor synchronization to use robust socket rooms, ensuring reliable updates for all players.
- **Visuals**: New split-view layout for the Harbor interface.

---

## [0.3.1] - 2026-02-11

### 🚀 Highlights
- **In-Game "What's New" Overlay**: Stay up to date without leaving the game! Press **'H'** on the login screen to see recent changes.
- **Mission Experience Overhaul**: Missions are now fully integrated into the Harbor UI.
- **Global Chat**: New chat system with IP-based moderation.
- **Improved Harbors**: overhauled positioning, 8-direction support, and smarter centering in shallow water.

### ⚔️ Gameplay & Balance
- **Unified Interaction**: Docker at harbors and loot wrecks using a single key: **'F'**.
- **Starter Ship**: New players now begin their journey in a **Fluyt** (better cargo capacity).
- **Harbor Logic**: Improved spawn logic when exiting harbors to prevent getting stuck in land.
- **Mission Rewards**: Missions now grant Gold and XP upon completion.
- **Mission Markers**: Added visual markers to world and minimap for easier navigation.

### 🎨 Visuals & Immersion
- **Harbor Aesthetics**: Harbors now render closer to land with better coastline alignment.
- **Mission Overlay**: New gold-bordered notification validation when completing tasks.
- **Navigation Aids**: Dynamic distance and direction indicators guide you to mission targets.

### 🔧 Fixes & Polish
- **Harbor Placement**: Resolved issues where some harbors (e.g., Nassau) appeared slightly offshore.
- **Overlay Stacking**: Fixed UI elements randomly overlapping game canvas.
- **Reward Notifications**: Fixed duplicate "Mission Reward" messages.
- **Chat**: Cleaned up unused logger code and clarified player limits in documentation.
- **Security**: Fixed IP detection for users behind Render.com proxies.

---

## [0.3.0] - 2026-01-18

### Added
- **Rotated Rectangular Hitboxes** - Sprite-based collision detection for accurate hit detection
  - Replaced circular hitboxes with rotated rectangles matching ship sprite dimensions
  - Hitbox dimensions derived from sprite size using configurable factors (default 0.8)
  - Ship-local space transformation for rotation-aware collision detection
  - Debug rendering option to visualize hitboxes (DEBUG_HITBOXES flag)
  - See: [`World.js:testRotatedRectCollision()`](file:///c:/Development/WorldOfPirates/src/server/game/World.js), [`Ship.js:getHitbox()`](file:///c:/Development/WorldOfPirates/src/server/game/Ship.js)
- **Kill Feed** - Server-authoritative system chat displaying ship destruction events
  - Event-based socket messages (not in game state)
  - Damage source tracking for accurate kill attribution
  - Bottom-right chat panel showing last 10 messages
  - See: [`Player.js:onFlagshipSunk()`](file:///c:/Development/WorldOfPirates/src/server/game/Player.js)
- Sector-based broadside detection (±60° tolerance)
- Configurable velocity compensation factor (0.0-1.0)
- Comprehensive coordinate system documentation
- Explanatory code comments for all mathematical transformations

### Changed
- **Server Codebase Refactoring** - Complete reorganization of server files for better maintainability
  - Consolidated configuration into `src/server/game/config/GameConfig.js`
  - Centralized NPC behavior in `src/server/game/npc/NPCBehavior.js`
  - Structured folders: `entities/`, `world/`, `npc/`, `missions/`, `progression/`
- **Documentation Updates** - Updated all architecture docs to reflect new file structure
- **Collision Detection** - From circular to rotated rectangular hitboxes
  - More accurate collision detection matching visual sprite boundaries
  - Per-ship hitbox tuning via width/height factors
- Improved broadside detection accuracy with explicit sectors
- Replaced 1.5 radian threshold with precise ±60° zones

### Fixed
- **Mission Crash** - Resolved `GameConfig` import error in `server.js` helper function
- **Teleport Debug Crash** - Fixed `NaN` coordinate error by adding validation and correcting config access
- **Spawn Helper** - Updated `spawn_helper.html` to use `fetch` instead of `require` for browser compatibility
- **Reward System** - Fixed case-sensitivity bug (`PIRATE` vs `Pirate`) in reward logic

---

## [0.2.0] - 2026-01-02

### Added
- **Sail State Sprites** - Fluyt now has 3 sprite variants (no sails, half sails, full sails)
  - See: [`game.js:preloadShipSprites()`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Per-Side Cannon Positioning** - 4 independent offset properties for precise cannon placement
  - See: [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js)
- **Distance-Based Projectile Range** - 400px max distance (replaced time-based lifetime)
  - See: [`Projectile.js`](file:///c:/Development/WorldOfPirates/src/server/game/Projectile.js)
- **Centralized Ship Properties** - Server sends ship metadata to clients on connection
  - See: [`GameLoop.js:sendShipMetadata()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
- **Cannon Clustering** - Configurable spread factor (40%) concentrates cannons at midship
  - See: [`GameLoop.js:fireCannons()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
- **Coordinate System Documentation** - Comprehensive reference for spatial mechanics
  - See: [`docs/architecture/COORDINATE_SYSTEM.md`](../architecture/COORDINATE_SYSTEM.md)

### Changed
- **Projectile Range** - From time-based (2s lifetime) to distance-based (400px)
- **Cannon Fire Rate** - From 3s to 4s between volleys
  - See: [`CombatConfig.js:CANNON_FIRE_RATE`](file:///c:/Development/WorldOfPirates/src/server/game/CombatConfig.js)
- **Projectile Damage** - From 10 HP to 5 HP per hit
  - See: [`CombatConfig.js:PROJECTILE_DAMAGE`](file:///c:/Development/WorldOfPirates/src/server/game/CombatConfig.js)
- **Projectile Speed** - From 200 to 150 pixels/second
- **Projectile Gravity** - From 60 to 50
- **Projectile Visual Size** - From 3px to 2px radius

### Fixed
- **Multiplayer Projectile Visibility** - Projectiles now render correctly for all players
  - Fixed by moving rendering before `ctx.restore()` in [`game.js`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Cannon Lateral Offset** - Fixed perpendicular direction calculation
  - Changed from `rotation + PI/2` to `rotation` in [`GameLoop.js`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
- **Broadside Detection** - Fixed angle wrapping issues
  - Added angle normalization in [`GameLoop.js:fireCannons()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
- **Cannon Positioning Asymmetry** - Cannons now fire symmetrically from both sides
  - Fixed port/starboard offset application logic

---

## [0.1.0] - 2025-12-27

> [!NOTE]
> **Historical Record**: This version documents the original procedural world system and 10 ship classes. 
> These have since been replaced with a tile-based Caribbean map and 8 ship classes (see later versions).

### Added
- **Core Multiplayer Gameplay**
  - Real-time multiplayer with Socket.IO (60 tick/s)
  - Server-authoritative game loop
  - Up to 20 concurrent players with server capacity enforcement
  - See: [`server.js`](file:///c:/Development/WorldOfPirates/src/server/server.js), [`GameLoop.js`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
  
- **Ship System**
  - 10 ship classes (Raft through War Galleon)
  - Fleet management (command multiple ships)
  - Flagship switching with 3-second invulnerability shield
  - Raft fallback system when all ships are lost
  - Fleet speed penalty (5% per additional ship)
  - See: [`Player.js`](file:///c:/Development/WorldOfPirates/src/server/game/Player.js), [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js)

- **Combat Mechanics**
  - Dual broadside cannons (left Q, right E)
  - Physics-based projectiles with gravity and arc
  - 3-second fire rate per broadside
  - 10 damage per cannonball hit
  - Island collision damage based on impact speed
  - See: [`GameLoop.js:fireCannons()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js), [`Projectile.js`](file:///c:/Development/WorldOfPirates/src/server/game/Projectile.js)

- **World & Environment**
  - Procedural island generation (7 islands per world)
  - Dynamic wind system (changes every 30-60 seconds)
  - Wind effects on ship speed (tailwind bonus, headwind penalty)
  - Shallow water zones around islands (25% speed reduction)
  - 2000×2000 unit world size
  - See: [`World.js`](file:///c:/Development/WorldOfPirates/src/server/game/World.js), [`Wind.js`](file:///c:/Development/WorldOfPirates/src/server/game/Wind.js), [`Island.js`](file:///c:/Development/WorldOfPirates/src/server/game/Island.js)

- **Harbor System**
  - Harbor docking (F key when in range)
  - Ship repair to full health
  - Free Sloop for players on rafts
  - 10-second invulnerability shield when leaving harbor
  - See: [`Harbor.js`](file:///c:/Development/WorldOfPirates/src/server/game/Harbor.js)

- **UI/UX**
  - HUD showing health, speed, sail state, ship class
  - Fleet information display
  - Harbor overlay UI with repair options
  - Cannon reload indicators
  - Water depth indicator
  - Shield visual indicator (icon + color)
  - See: [`game.js`](file:///c:/Development/WorldOfPirates/src/public/js/game.js), [`index.html`](file:///c:/Development/WorldOfPirates/src/public/index.html)

- **Server Features**
  - 20-player capacity limit
  - Performance monitoring (tick time tracking)
  - Server full handling with graceful rejection
  - Console logging for debugging

- **Code Quality**
  - Centralized configuration (GameConfig, CombatConfig, PhysicsConfig)
  - Modular architecture (separated concerns)
  - No magic numbers (all constants in config files)

### Technical
- Node.js backend with Express
- Socket.IO for real-time communication
- HTML5 Canvas rendering
- Vanilla JavaScript (no frameworks)
- 60 Hz server tick rate
- Server-authoritative architecture

---

## Version History

- **Unreleased** - Rotated hitboxes, kill feed system, sector-based detection, and velocity compensation tuning
- **0.2.0** (2026-01-02) - Combat mechanics overhaul and sail sprites
- **0.1.0** (2025-12-27) - Initial alpha release with core gameplay

---

*This changelog will be updated with each release.*
