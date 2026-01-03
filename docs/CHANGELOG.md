# Changelog

All notable changes to World of Pirates will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sector-based broadside detection (±60° tolerance)
- Configurable velocity compensation factor (0.0-1.0)
- Comprehensive coordinate system documentation

### Changed
- Improved broadside detection accuracy with explicit sectors
- Replaced 1.5 radian threshold with precise ±60° zones

## [0.2.0] - 2026-01-02

### Added
- **Sail State Sprites** - Fluyt now has 3 sprite variants (no sails, half sails, full sails)
- **Per-Side Cannon Positioning** - 4 independent offset properties for precise cannon placement
- **Distance-Based Projectile Range** - 400px max distance (replaced time-based lifetime)
- **Centralized Ship Properties** - Server sends ship metadata to clients on connection
- **Cannon Clustering** - Configurable spread factor (40%) concentrates cannons at midship
- **Coordinate System Documentation** - Comprehensive reference for spatial mechanics

### Changed
- **Projectile Range** - From time-based (2s lifetime) to distance-based (400px)
- **Cannon Fire Rate** - From 3s to 4s between volleys
- **Projectile Damage** - From 10 HP to 5 HP per hit
- **Projectile Speed** - From 200 to 150 pixels/second
- **Projectile Gravity** - From 60 to 50
- **Projectile Visual Size** - From 3px to 2px radius

### Fixed
- **Multiplayer Projectile Visibility** - Projectiles now render correctly for all players
- **Cannon Lateral Offset** - Fixed perpendicular direction calculation
- **Broadside Detection** - Fixed angle wrapping issues
- **Cannon Positioning Asymmetry** - Cannons now fire symmetrically from both sides

### Planned
- Player names and identification
- Kill feed / combat log
- Minimap
- Ship acquisition system
- Progression/economy system

## [0.1.0] - 2025-12-27

### Added
- **Core Multiplayer Gameplay**
  - Real-time multiplayer with Socket.IO (60 tick/s)
  - Server-authoritative game loop
  - Up to 20 concurrent players with server capacity enforcement
  
- **Ship System**
  - 10 ship classes (Raft through War Galleon)
  - Fleet management (command multiple ships)
  - Flagship switching with 3-second invulnerability shield
  - Raft fallback system when all ships are lost
  - Fleet speed penalty (5% per additional ship)

- **Combat Mechanics**
  - Dual broadside cannons (left Q, right E)
  - Physics-based projectiles with gravity and arc
  - 3-second fire rate per broadside
  - 10 damage per cannonball hit
  - Island collision damage based on impact speed

- **World & Environment**
  - Procedural island generation (7 islands per world)
  - Dynamic wind system (changes every 30-60 seconds)
  - Wind effects on ship speed (tailwind bonus, headwind penalty)
  - Shallow water zones around islands (25% speed reduction)
  - 2000×2000 unit world size

- **Harbor System**
  - Harbor docking (F key when in range)
  - Ship repair to full health
  - Free Sloop for players on rafts
  - 10-second invulnerability shield when leaving harbor

- **UI/UX**
  - HUD showing health, speed, sail state, ship class
  - Fleet information display
  - Harbor overlay UI with repair options
  - Cannon reload indicators
  - Water depth indicator
  - Shield visual indicator (icon + color)

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

- **Unreleased** - Sector-based detection and velocity compensation tuning
- **0.2.0** (2026-01-02) - Combat mechanics overhaul and sail sprites
- **0.1.0** (2025-12-27) - Initial alpha release with core gameplay

---

*This changelog will be updated with each release.*
