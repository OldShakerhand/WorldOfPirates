# Collision Debug Instrumentation

## Purpose

Temporary debugging instrumentation to diagnose intermittent projectile collision misses.

**CRITICAL:** No gameplay behavior has been modified. This is observation-only instrumentation.

---

## What Will Be Observed

With this instrumentation enabled, you can answer:

1. **How far does a projectile move per tick?**
   - Logged as `Projectile Δ=XX.XXpx`
   
2. **What are the ship hitbox dimensions at the moment of near-miss?**
   - Logged with hitbox width/height, rotation, positions
   
3. **Is the projectile jumping over hitboxes in a single tick?**
   - Compare `Projectile Δ` with hitbox dimensions
   
4. **What is the relative ordering of events?**
   - Logs show: projectile movement → collision check → near-miss detection

---

## How to Enable

### Server-Side Logging

**File:** `src/server/game/CombatConfig.js`

```javascript
DEBUG_COLLISION: true  // Change from false to true
```

**Restart the server** to apply changes.

---

## Debug Output Examples

### Projectile Delta Logging

```
[DEBUG] Projectile Δ=2.00px | Speed=120 | DeltaTime=0.0167
```

**Interpretation:**
- Projectile moved 2 pixels in this tick
- Speed is 120 pixels/second
- Delta time is ~16.7ms (60 FPS)

---

### Hitbox Dimensions on Proximity

```
[DEBUG] Near ship: dist=45.23px | Hitbox: 30.0x42.0 | Rotation=1.57 | Ship pos=(500.0, 300.0) | Proj prev=(480.0, 295.0) curr=(482.0, 296.0)
```

**Interpretation:**
- Projectile is 45.23px from ship center
- Ship hitbox is 30px wide × 42px tall
- Ship rotation is 1.57 radians (~90°)
- Ship is at (500, 300)
- Projectile moved from (480, 295) to (482, 296)

---

### Near-Miss Warning

```
[DEBUG] Near-miss: projectile crossed ship bounding area but no hit registered
```

**Interpretation:**
- Projectile entered the bounding circle around the ship
- But rotated rectangle collision test failed
- This could indicate:
  - Projectile passed between ticks (too fast)
  - Hitbox math issue
  - Rotation/position desync

---

## Files Modified

### Server-Side

1. **`src/server/game/CombatConfig.js`**
   - Added `DEBUG_COLLISION: false` flag

2. **`src/server/game/Projectile.js`**
   - Added `prevX`, `prevY` tracking
   - Added delta logging in `update()` method

3. **`src/server/game/World.js`**
   - Added bounding circle proximity check
   - Added hitbox dimension logging when near ship
   - Added near-miss warning logging

### Client-Side

4. **`src/public/js/game.js`**
   - Added `DEBUG_COLLISION_VISUAL: false` flag
   - (Projectile trail visualization not implemented - rendering location not found)

---

## Disabling Debug Mode

Set flags back to `false`:

```javascript
// CombatConfig.js
DEBUG_COLLISION: false

// game.js
DEBUG_COLLISION_VISUAL: false
```

Restart server to apply.

---

## Next Steps (After Diagnosis)

1. Enable `DEBUG_COLLISION: true`
2. Reproduce the intermittent collision issue
3. Examine server console logs
4. Look for patterns:
   - Large projectile deltas (>hitbox dimensions)
   - Near-miss warnings
   - Timing between ship movement and collision checks

**DO NOT attempt to fix until root cause is identified from logs.**

---

## Removal

This instrumentation is temporary. Once the issue is diagnosed and fixed:

1. Remove `DEBUG_COLLISION` flag from CombatConfig.js
2. Remove `prevX`, `prevY` tracking from Projectile.js
3. Remove debug logging from Projectile.js update()
4. Remove proximity check and logging from World.js
5. Remove `DEBUG_COLLISION_VISUAL` from game.js
