# Debug System

## Purpose

Comprehensive debugging instrumentation for diagnosing gameplay issues. All debug features are observation-only and have **NO gameplay behavior changes**.

---

## Debug Flags

All debug flags are located in `src/server/game/CombatConfig.js` and disabled by default.

```javascript
DEBUG_COLLISION: false,        // Projectile movement and collision diagnostics
DEBUG_INITIALIZATION: false    // World/player initialization and lifecycle tracking
```

**To enable:** Set flag to `true` and restart server.

---

## 1. Collision Debugging

### Known Issue: Early-Session Collision Failure (Rare, Unresolved)

**Observation:**
Shortly after server restarts, projectiles occasionally pass through ships as if no collision targets exist.

**Characteristics:**
- Seems to occur in the first few minutes after server start
- Not consistently reproducible
- Has resolved itself after a short period (still unwanted behaviour!)
- Potentially related to initialization order or early state transitions

**Current Status:**
- **UNRESOLVED** - Root cause not yet identified
- Suspected areas: World initialization, entity registration, early tick timing

**What We Know:**
- Collision detection code is correct (works reliably after initial period)
- Issue is timing/state-related, not logic-related
- May involve race conditions or incomplete initialization

**What We Don't Know:**
- Exact trigger conditions
- Which initialization step is incomplete
- Whether it's server-side or client-side desync

### Enable: DEBUG_COLLISION

**What This Tracks:**
1. Projectile movement delta per tick
2. Ship hitbox dimensions when projectile is nearby
3. Near-miss warnings when projectile crosses bounding area without hit

**Debug Output Examples:**

```
[DEBUG] Projectile Δ=2.00px | Speed=120 | DeltaTime=0.0167
[DEBUG] Near ship: dist=45.23px | Hitbox: 30.0x42.0 | Rotation=1.57 | Ship pos=(500.0, 300.0) | Proj prev=(480.0, 295.0) curr=(482.0, 296.0)
[DEBUG] Near-miss: projectile crossed ship bounding area but no hit registered
```

**Questions This Answers:**
- How far does a projectile move per tick?
- Is the projectile jumping over hitboxes in a single tick?
- What are the ship hitbox dimensions at the moment of near-miss?
- What is the relative ordering of projectile movement and collision checks?

---

## 2. Initialization Debugging

### Enable: DEBUG_INITIALIZATION

**What This Tracks:**
1. World creation (islands, harbors generated)
2. Player join sequence (order and timing)
3. Entity registration (when entities added to world.entities)
4. First tick (confirms game loop is running)
5. First projectile creation (when combat system becomes active)

**Debug Output Examples:**

```
[INIT] World created | Islands: 7 | Harbors: 7 | Timestamp: 1704636000000
[INIT] Player joined | ID: abc123 | Name: BlackBeard | Entities in world: 0
[INIT] Entity added to world | Type: PLAYER | ID: abc123 | Total entities: 1
[INIT] First tick executed | DeltaTime: 0.0167 | Entities: 2 | Projectiles: 0
[INIT] First projectile created | Owner: abc123 | Position: (500.0, 300.0) | Entities in world: 2
```

**Questions This Answers:**
- Are entities registered before projectiles are created?
- Is the game loop running when players join?
- Are there race conditions in initialization?
- How many entities exist during early combat?

**Use This When:**
- Collision failures occur shortly after server restart
- Issue resolves itself after a few minutes
- Standard collision debugging shows no projectile/hitbox issues

---

## Combined Debugging Strategy

For early-session collision failures, enable **BOTH** flags:

```javascript
DEBUG_COLLISION: true,        // Track projectile movement and near-misses
DEBUG_INITIALIZATION: true    // Track initialization sequence
```

**Workflow:**
1. Enable both flags in `CombatConfig.js`
2. Restart server
3. Reproduce early-session collision issue
4. Examine console logs for `[INIT]` and `[DEBUG]` messages
5. Cross-reference timestamps to identify state issues

**Look for patterns:**
- Missing entity registrations
- Projectiles created before entities exist
- Unusual timing gaps
- Unexpected event ordering
- Large projectile deltas (>hitbox dimensions)

---

## Files Modified

### Server-Side

1. **`src/server/game/CombatConfig.js`**
   - `DEBUG_COLLISION: false` flag
   - `DEBUG_INITIALIZATION: false` flag

2. **`src/server/game/Projectile.js`**
   - `prevX`, `prevY` position tracking
   - Delta logging in `update()` method

3. **`src/server/game/World.js`**
   - World creation debug log
   - Entity registration debug log
   - Bounding circle proximity check
   - Hitbox dimension logging when near ship
   - Near-miss warning logging

4. **`src/server/game/GameLoop.js`**
   - `firstTickLogged` and `firstProjectileLogged` flags
   - Player join debug log
   - First tick debug log
   - First projectile debug log

### Client-Side

5. **`src/public/js/game.js`**
   - `DEBUG_COLLISION_VISUAL: false` flag (for future use)

---

## Reference State

### Known-Good Commit

**Commit:** `2f5807a` - "feat: add collision debug instrumentation for intermittent miss diagnosis"

**Date:** 2026-01-07

**Description:** This commit represents the last known-good state before the debug system was implemented. Collision detection works reliably in this version. Use as baseline for comparison when debugging initialization issues or future collision problems.

**What This Commit Includes:**
- Arcade cannon firing (perpendicular to ship, no velocity compensation)
- Dynamic gravity calculation for projectiles
- Rotated rectangular hitboxes
- Game events refinement (ship_sunk, player_rafted)
- Kill attribution system
- All core combat mechanics functioning correctly

**How to Use:**
1. Checkout this commit: `git checkout 2f5807a`
2. Run server and test collision detection
3. Compare behavior with current implementation
4. Look for differences in initialization order or collision logic

**Note:** If the early-session collision issue persists after this commit, the problem likely existed before the debug system was added. Check earlier commits in the game events or arcade firing implementations.

---

## Disabling Debug Mode

Set all flags back to `false`:

```javascript
// CombatConfig.js
DEBUG_COLLISION: false,
DEBUG_INITIALIZATION: false
```

Restart server to apply.

---

## Removal

This instrumentation is temporary. Once issues are diagnosed and fixed:

1. Remove debug flags from CombatConfig.js
2. Remove `prevX`, `prevY` tracking from Projectile.js
3. Remove debug logging from Projectile.js update()
4. Remove proximity check and logging from World.js
5. Remove initialization logs from GameLoop.js and World.js
6. Remove `firstTickLogged` and `firstProjectileLogged` flags
7. Remove `DEBUG_COLLISION_VISUAL` from game.js
