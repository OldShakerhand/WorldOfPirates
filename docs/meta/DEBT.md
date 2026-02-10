# Technical Debt

## Global State Management

### `window.gameState` and `window.myPlayerId` (client.js)
- **Issue:** Game state stored in global `window` object to share between files
- **Why:** Debug harbor teleport system needs access to player position from separate file
- **Debt:** Pollutes global scope, breaks encapsulation, not scalable
- **When to fix:** Before production - implement proper module system or state management
- **How to fix:** 
  1. Use ES6 modules with exports/imports
  2. Or implement event-based state subscription pattern
  3. Or use a lightweight state management library
- **Impact:** Low (debug-only feature), but sets bad precedent
- **Related:** `harbor_teleport_debug.js` (entire file is debug-only, will be removed)

---

## Purpose

Track magic numbers, hardcoded heuristics, and scaling issues that should be addressed before they become problems. This document serves as a roadmap for future refactoring efforts.

---

## Critical Technical Debt (High Priority)

### TECH_DEBT_013: Lack of Persistence
**Type**: Architecture  
**Why**: All player progress (ships, gold, stats) is lost when the server restarts.  
**Refactor**: Integrate a database (SQLite/PostgreSQL/MongoDB) to store player data.  
**When**: IMMEDIATE - Core requirement for progression gameplay.  
**Impact**: CRITICAL - Players lose all progress daily (Render.com restarts).

### TECH_DEBT_016: No Authentication System
**Type**: Security  
**Why**: Players identify only by name. Anyone can claim any name.  
**Refactor**: Implement user accounts with password hashing (bcrypt) and session tokens (JWT).  
**When**: Before public release.  
**Impact**: HIGH - Identity theft, impossible to ban users effectively.

### TECH_DEBT_011: Nested Loop Projectile Collision
**File**: `World.js:131` (approx)  
**Type**: Scaling Issue  
**Why**: O(projectiles * players) complexity every tick.  
**Refactor**: Use spatial hash grid or broad-phase/narrow-phase collision.  
**When**: >100 active projectiles or >30 players cause lag.  
**Impact**: HIGH - Combat-heavy scenarios will cause server lag.

---

## Medium Priority Technical Debt

### TECH_DEBT_015: Weak Moderation Tools (IP Ban Only)
**File**: `server.js`  
**Type**: Limitation  
**Why**: Bans are stored in memory (lost on restart) and rely on IP addresses (easily bypassed).  
**Refactor**: Move bans to database, implement account-based banning.  
**When**: When player base grows or griefing becomes an issue.  
**Impact**: MEDIUM - Hard to manage toxicity.

### TECH_DEBT_014: Unused Dead Code (`ChatLogger.js`)
**File**: `src/server/utils/ChatLogger.js`  
**Type**: Cleanliness  
**Why**: Replaced by console logging for Render.com compatibility, but file remains.  
**Refactor**: Delete the file and cleanup any lingering references.  
**When**: Next cleanup cycle.  
**Impact**: LOW - Just clutter.

### TECH_DEBT_004: Hardcoded Cannon Spread Factor
**File**: `GameLoop.js`  
**Type**: Magic Number  
**Why**: 0.4 spread factor doesn't allow per-ship customization.  
**Refactor**: Move to `ShipClass` property (`cannonSpreadFactor`).  
**When**: When balancing different ship classes.  
**Impact**: MEDIUM - Affects combat balance.

### TECH_DEBT_012: Harbor Coordinate System Inconsistency
**File**: `game.js`, `GameLoop.js`  
**Type**: Architecture Issue  
**Why**: Y-axis inverted between sprite rendering (-Y = South) and world positioning (-Y = North) due to rotation transform.  
**Refactor**: Standardize on world coordinates everywhere.  
**When**: Before adding more complex harbor features.  
**Impact**: MEDIUM - Affects maintainability.

---

## Low Priority Technical Debt

### TECH_DEBT_005: Hardcoded Sail State Modifiers
**File**: `Player.js`  
**Type**: Magic Number  
**Why**: 0.5 for half sails doesn't allow ship-specific tuning.  
**Refactor**: Move to `ShipClass` properties or `PhysicsConfig`.  
**When**: When different ship types need different sail efficiency curves.  
**Impact**: LOW - Fine-tuning only.

### TECH_DEBT_006: Hardcoded Harbor Visual Config
**File**: `game.js`  
**Type**: Configuration  
**Why**: Visual offsets (-100px) and scale (0.35) are hardcoded.  
**Refactor**: Move to `ClientConfig.js` or `HarborConfig.js`.  
**Impact**: LOW - Visual only.

### TECH_DEBT_007/008: Hardcoded Wind Math
**File**: `Wind.js`  
**Type**: Magic Number  
**Why**: Probabilities and multipliers are hardcoded.  
**Refactor**: Move to `GameConfig` / `PhysicsConfig`.  
**When**: When implementing weather systems.  
**Impact**: LOW.

---

## Refactoring Roadmap

### Phase 1: Foundation (Current Focus)
1. **TECH_DEBT_013**: Database Integration (Persistence)
2. **TECH_DEBT_016**: Authentication & Accounts
3. **TECH_DEBT_014**: Cleanup Dead Code

### Phase 2: Scalability (When >20 Players)
4. **TECH_DEBT_011**: Spatial Partitioning for Projectiles
5. **TECH_DEBT_010** (Retired but keep in mind): Spatial Partitioning for optimized Island collisions (if map grows)

### Phase 3: Configuration & Tuning
6. **TECH_DEBT_004**: Ship-specific cannon spread
7. **TECH_DEBT_005/007/008**: Externalize Physics/Wind constants

---

## Notes for Future Contributors

### When Adding New Features
- Check if feature introduces new magic numbers → add TODO comment
- Check if feature has O(n²) or worse complexity → add FIXME comment

### Before Scaling
- Implement Phase 2 refactoring (Spatial Partitioning) if profiler shows physics bottlenecks.

---

*Last Updated*: 2026-02-10
*Total Debt Items*: 10
*Critical Items*: 3
