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

## [Unreleased]

### Added

### Changed

### Fixed

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
  - Harbor docking (H key when in range)
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
