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
 Tracking

This document tracks all identified technical debt in the World of Pirates codebase. Each item includes why it's debt, what refactor would help, and when it becomes relevant.

---

## Purpose

Track magic numbers, hardcoded heuristics, and scaling issues that should be addressed before they become problems. This document serves as a roadmap for future refactoring efforts.

---

## Critical Technical Debt (High Priority)

### TECH_DEBT_003: Naive Spawn Algorithm
**File**: `GameLoop.js:175`  
**Type**: Scaling Issue  
**Why**: O(attempts * islands) complexity with no spatial partitioning  
**Refactor**: Pre-compute safe spawn zones or use spatial grid  
**When**: >10 islands or frequent respawns cause lag  
**Impact**: HIGH - affects player experience during respawn

### TECH_DEBT_010: Linear Island Collision Check
**File**: `World.js:78`  
**Type**: Scaling Issue  
**Why**: O(n) check for every ship position update (called 60 times/sec per player)  
**Refactor**: Use spatial partitioning (quadtree or grid-based lookup)  
**When**: >20 islands or >50 players cause performance issues  
**Impact**: CRITICAL - affects core game loop performance

### TECH_DEBT_011: Nested Loop Projectile Collision
**File**: `World.js:131` (needs manual addition)  
**Type**: Scaling Issue  
**Why**: O(projectiles * players) complexity every tick  
**Refactor**: Use spatial hash grid or broad-phase/narrow-phase collision  
**When**: >100 active projectiles or >30 players cause lag  
**Impact**: HIGH - combat-heavy scenarios will lag

---

## Medium Priority Technical Debt

### TECH_DEBT_001: Hardcoded Performance Monitoring Interval
**File**: `GameLoop.js:24`  
**Type**: Magic Number  
**Why**: 10-second interval may be too frequent for production  
**Refactor**: Move to `GameConfig.PERFORMANCE_LOG_INTERVAL`  
**When**: Before production deployment  
**Impact**: MEDIUM - affects log volume, not gameplay

### TECH_DEBT_002: Hardcoded Performance Threshold
**File**: `GameLoop.js:48`  
**Type**: Magic Number  
**Why**: 16.67ms threshold assumes 60 FPS requirement  
**Refactor**: Move to `GameConfig.MAX_TICK_TIME_MS` with dynamic adjustment  
**When**: If tick rate becomes configurable or variable  
**Impact**: MEDIUM - affects monitoring accuracy

### TECH_DEBT_004: Hardcoded Cannon Spread Factor
**File**: `GameLoop.js:253`  
**Type**: Magic Number  
**Why**: 0.4 spread factor doesn't allow per-ship customization  
**Refactor**: Move to `ShipClass` property (`cannonSpreadFactor`)  
**When**: When balancing different ship classes or adding new ships  
**Impact**: MEDIUM - affects combat balance and ship variety

### TECH_DEBT_009: Hardcoded Island Generation Edge Buffer
**File**: `World.js:39`  
**Type**: Magic Number  
**Why**: 200px buffer is not proportional to world size  
**Refactor**: Calculate as percentage of world size (e.g., 10%)  
**When**: When supporting different world sizes or procedural generation  
**Impact**: MEDIUM - affects map generation quality

---

## Low Priority Technical Debt

### TECH_DEBT_005: Hardcoded Sail State Modifiers
**File**: `Player.js:186`  
**Type**: Magic Number  
**Why**: 0.5 for half sails doesn't allow ship-specific tuning  
**Refactor**: Move to `ShipClass` properties or `PhysicsConfig`  
**When**: When different ship types need different sail efficiency curves  
**Impact**: LOW - nice-to-have for ship variety

### TECH_DEBT_006: Hardcoded Shallow Water Physics Multipliers
**File**: `Player.js:203`  
**Type**: Magic Number  
**Why**: 0.5 accel and 1.5 decel multipliers are arbitrary  
**Refactor**: Move to `PhysicsConfig.SHALLOW_WATER_ACCEL_MULTIPLIER` and `DECEL_MULTIPLIER`  
**When**: When adding different water depth levels or ship draft mechanics  
**Impact**: LOW - future feature enablement

### TECH_DEBT_007: Hardcoded Wind Strength Probabilities
**File**: `Wind.js:22`  
**Type**: Hardcoded Heuristic  
**Why**: 20%/40%/40% distribution is arbitrary, not data-driven  
**Refactor**: Move to `GameConfig` with configurable probability weights  
**When**: When adding weather systems or regional wind patterns  
**Impact**: LOW - affects wind variety

### TECH_DEBT_008: Hardcoded Wind Strength Modifiers
**File**: `Wind.js:29`  
**Type**: Magic Number  
**Why**: 0.6/0.8/1.0 multipliers are not balanced through playtesting  
**Refactor**: Move to `PhysicsConfig.WIND_STRENGTH_MULTIPLIERS`  
**When**: When balancing wind impact on gameplay  
**Impact**: LOW - gameplay tuning

---

## Refactoring Roadmap

### Phase 1: Performance (Before Scaling)
1. **TECH_DEBT_010**: Implement spatial partitioning for island collision
2. **TECH_DEBT_011**: Implement spatial hash for projectile collision
3. **TECH_DEBT_003**: Pre-compute safe spawn zones

**Trigger**: When approaching 20 concurrent players or 50+ projectiles

### Phase 2: Configuration (Before Content Expansion)
4. **TECH_DEBT_004**: Move cannon spread to ShipClass
5. **TECH_DEBT_009**: Make island buffer proportional to world size
6. **TECH_DEBT_005**: Make sail modifiers configurable per ship

**Trigger**: When adding new ship classes or expanding world size

### Phase 3: Gameplay Tuning (Ongoing)
7. **TECH_DEBT_007**: Make wind probabilities configurable
8. **TECH_DEBT_008**: Make wind strength modifiers configurable
9. **TECH_DEBT_006**: Make shallow water physics configurable

**Trigger**: During gameplay balancing iterations

### Phase 4: Production Readiness
10. **TECH_DEBT_001**: Make performance monitoring interval configurable
11. **TECH_DEBT_002**: Make performance thresholds dynamic

**Trigger**: Before production deployment

---

## Estimated Refactoring Effort

| Priority | Items | Estimated Hours | Dependencies |
|----------|-------|-----------------|--------------|
| Critical | 3 | 16-24h | Spatial partitioning library |
| Medium | 4 | 8-12h | Config refactoring |
| Low | 4 | 4-6h | None |
| **Total** | **11** | **28-42h** | - |

---

## Performance Scaling Thresholds

### Current Limits (Without Refactoring)
- **Players**: ~20 concurrent (limited by collision checks)
- **Projectiles**: ~100 active (limited by nested loops)
- **Islands**: ~10 (limited by linear searches)
- **Tick Time**: ~10ms average (leaves 6ms headroom for 60 FPS)

### After Phase 1 Refactoring
- **Players**: ~100 concurrent (spatial partitioning)
- **Projectiles**: ~500 active (spatial hash)
- **Islands**: ~50 (quadtree lookup)
- **Tick Time**: ~8ms average (better algorithms)

---

## Notes for Future Contributors

### When Adding New Features
- Check if feature introduces new magic numbers → add TODO comment
- Check if feature has O(n²) or worse complexity → add FIXME comment
- Update this document with new technical debt items

### Before Scaling
- Review "Critical Technical Debt" section
- Implement Phase 1 refactoring
- Load test with 2x target player count

### Before Production
- Review "Production Readiness" section
- Make all monitoring configurable
- Add feature flags for experimental features

---

*Last Updated*: 2026-01-04  
*Total Debt Items*: 11  
*Critical Items*: 3  
*Estimated Total Effort*: 28-42 hours
