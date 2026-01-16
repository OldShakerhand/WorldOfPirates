# NPC Ships Documentation

## Overview

NPC (Non-Player Character) ships are autonomous vessels that populate the game world, making it feel alive and dynamic. They serve as the foundation for future AI, economy, faction, and combat systems.

## Current Implementation (Phase 1) ✅

### What's Working

**Core Architecture:**
- NPCs use the **same simulation core** as players (movement, collision, physics)
- NPCs compute inputs via AI instead of sockets
- Zero client-side changes required (NPCs serialize identically to players)

**Behavior:**
- **Spawn**: Press `N` key to spawn a trader NPC near your position
- **Navigation**: NPCs sail in a straight line to the nearest harbor
- **Arrival**: NPCs stop at harbor for 5 seconds
- **Despawn**: NPCs automatically despawn after stopping

**Combat Integration:**
- NPCs take damage from projectiles
- NPCs have health (230 HP for Fluyt traders)
- NPCs sink and despawn when destroyed
- Same hitbox collision detection as players

**Safety Features:**
- Stuck detection: NPCs despawn after 10 consecutive land collisions
- Lifetime limit: NPCs auto-despawn after 5 minutes (safety)
- Collision spam prevention: Only logs first collision

### Technical Details

**State Machine:**
```
SAILING → STOPPED → DESPAWNING
```

**Files:**
- `src/server/game/NPCShip.js` - NPC entity class with AI logic
- `src/server/game/NPCManager.js` - Lifecycle management
- `src/server/game/World.js` - Integration point

**Spawn Commands:**
- `N` key - Spawn single NPC
- Console: `socket.emit('debug_spawn_npcs', { count: 5 })` - Spawn multiple

**Ship Class:**
- Phase 1 uses **Fluyt** (trading vessel)
- 230 HP, moderate speed
- Half sails (50% speed) for navigation

### Known Limitations

**No Pathfinding:**
- NPCs navigate in straight lines
- NPCs may collide with land (intentional for Phase 1)
- Stuck NPCs despawn automatically

**No AI Complexity:**
- NPCs don't avoid obstacles
- NPCs don't react to players or other NPCs
- NPCs don't engage in combat (defensive only)

**No Persistence:**
- NPCs don't survive server restart
- No NPC state saving

---

## Future Roadmap

### Phase 2: Intelligent Navigation ✅

**Pathfinding:**
- Look-ahead collision detection (7 tiles ahead)
- Alternative heading search (±15° to ±180°)
- Dynamic route adjustment without global pathfinding

**Collision Avoidance:**
- Detects obstacles 7 tiles ahead
- Tests alternative headings to find clear paths
- Allows turning away from target if needed (up to 180°)

**Re-Acquisition:**
- Continuously checks when direct path becomes clear
- Smooth return to desired heading (hysteresis prevents flips)
- Gradual convergence when both paths clear

**Performance:**
- ~90% success rate navigating around obstacles
- Responsive turning (1.5 rad/s, ~86°/sec)
- Stuck detection remains as fallback (~10% edge cases)

**Status:** Complete (2026-01-15)

---

### Phase 3: Combat NPCs ✅ (Partial - Pirates Complete)

**Status:** Combat NPCs (Pirates) fully implemented (2026-01-15)

#### What's Working

**Combat NPC Type: Pirates**
- Hostile NPCs that actively engage players
- Spawn on demand with `P` key for testing
- Use same ship classes as players (currently spawn as Sloops)
- Full combat AI with target selection and positioning

**Combat Behavior:**
- **Target Selection**: Finds nearest player within 500px engagement range
- **Combat Positioning**: Maintains 200px distance (80% of max projectile range)
- **Broadside Firing**: Fires when target is ±10° from perpendicular (very precise)
- **Firing Range**: Only fires within 90% of max projectile range for accuracy
- **Fire Rate**: 4-second cooldown between volleys (same as players)

**Technical Implementation:**
- `CombatNPCConfig.js` - Combat parameters (derived from projectile range)
- Combat methods in `NPCShip.js`:
  - `selectCombatTarget()` - Target acquisition
  - `computeCombatPosition()` - Broadside positioning
  - `computeDesiredCombatHeading()` - Heading calculation
  - `attemptCombatFire()` - Firing logic with arc validation
- Integration with `GameLoop.js` for projectile spawning
- Uses same `fireCannons()` method as players

**Bugs Fixed During Implementation:**
- Fixed `cannonsPerSide` getter (was returning 0)
- Fixed firing arc logic (was checking front instead of sides)
- Fixed cooldown timing (GameLoop now manages timestamps)
- Fixed `fireRate` initialization in `NPCManager`
- Tuned broadside sector to ±10° for realistic naval combat

**Performance:**
- Pirates successfully engage and sink players
- Precise broadside positioning requires tactical maneuvering
- ~0.3ms tick time impact per pirate NPC

#### Not Yet Implemented

**Faction System:**
- Friendly NPCs (merchants, allies) - Planned
- Neutral NPCs (independent traders) - Planned
- Faction flags/colors - Planned

**Advanced Combat Behaviors:**
- NPCs flee when damaged - Planned
- NPCs escort friendly ships - Planned
- Formation combat - Planned

**Visual Indicators:**
- Hostile/friendly markers - Planned
- Aggression states - Planned

**Estimated Effort for Remaining Phase 3:** 2-3 days

---

### Phase 4: Economy & Trading 🔄

**Cargo System:**
- NPCs carry goods between harbors
- Trade routes (e.g., Nassau → Havana → Port Royal)
- Supply and demand mechanics

**Economic Impact:**
- Harbor prices affected by NPC trade
- Players can intercept cargo ships
- Piracy affects trade routes

**NPC Types:**
- Merchant convoys (valuable cargo)
- Supply ships (harbor restocking)
- Treasure ships (rare, heavily guarded)

**Estimated Effort:** 4-5 days

---

### Phase 5: Advanced AI & World Events 🔄

**Dynamic Spawning:**
- NPCs spawn based on harbor activity
- Trade route density
- Faction territory control

**World Events:**
- Pirate raids on harbors
- Naval battles between factions
- Convoy escorts (player missions)

**AI Improvements:**
- Formation sailing
- Tactical maneuvering
- Adaptive difficulty

**Estimated Effort:** 5-7 days

---

### Phase 6: Persistence & Scalability 🔄

**Database Integration:**
- NPC state saved to database
- NPCs persist across server restarts
- Long-term trade route tracking

**Performance Optimization:**
- Spatial indexing for collision detection
- Chunked pathfinding
- NPC culling (despawn far from players)

**Estimated Effort:** 3-4 days

---

## Design Principles

### 1. Shared Simulation Core
NPCs **must** use the same physics, collision, and combat systems as players. This ensures:
- Consistent gameplay
- No parallel systems to maintain
- Predictable behavior

### 2. Server Authority
All NPC logic runs on the server. Clients only render what the server tells them.

### 3. Extensibility
Phase 1 is deliberately simple to establish a solid foundation. Each phase builds on the previous without breaking existing functionality.

### 4. Performance First
NPCs should not degrade server performance. Target: <1ms per NPC per frame.

---

## Testing NPCs

### Spawn a Merchant NPC
1. Join the game
2. Press `N` key
3. Watch NPC sail to nearest harbor

### Spawn a Pirate NPC (Combat)
1. Join the game
2. Press `P` key
3. Pirate will spawn and engage you in combat
4. Observe broadside positioning and firing

### Spawn Multiple NPCs
1. Open browser console (F12)
2. Type: `socket.emit('debug_spawn_npcs', { count: 5 })` for merchants
3. Type: `socket.emit('debug_spawn_pirates', { count: 3 })` for pirates
4. Press Enter

### Test Combat (As Attacker)
1. Spawn a merchant NPC with `N`
2. Fire cannons at it (`Q` or `E` keys)
3. Watch health decrease in server console
4. NPC sinks at 0 HP

### Test Combat (As Defender)
1. Spawn a pirate NPC with `P`
2. Stay still or move slowly
3. Observe pirate maneuvering for broadside position
4. Watch for incoming cannon fire
5. Try to evade or return fire

### Test Stuck Detection
1. Spawn NPC near land
2. If NPC hits land, it will despawn after 10 collisions
3. Check server console for: `[NPC] npc_trader_X stuck on land, despawning`

---

## Performance Metrics

**Current (Phase 1):**
- ~0.3ms average tick time with 3 NPCs
- Negligible impact on 60 FPS server loop
- Scales linearly (tested up to 10 NPCs)

**Target (Phase 6):**
- Support 50+ NPCs simultaneously
- <5ms total NPC processing per frame
- Spatial indexing for O(log n) collision checks

---

## FAQ

**Q: Can NPCs attack players?**  
A: Yes! Pirate NPCs (Phase 3) actively engage players with broadside cannon fire. Spawn with `P` key.

**Q: How do pirate NPCs fight?**  
A: Pirates use realistic naval combat tactics - they position themselves perpendicular to you for broadside shots, only firing when properly aligned (±10°). They maintain optimal range and have the same fire rate as players.

**Q: Do NPCs affect the economy?**  
A: Not yet. Phase 4 will introduce cargo and trade routes.

**Q: Can I control an NPC?**  
A: No. NPCs are fully autonomous. Players control their own ships.

**Q: Will NPCs persist after server restart?**  
A: Not currently. Phase 6 will add database persistence.

**Q: How many NPCs can the server handle?**  
A: Currently tested up to 10. Target is 50+ with optimizations in Phase 6.

**Q: Can pirates navigate around islands?**  
A: Yes! Pirates use Phase 2 predictive navigation to avoid obstacles while pursuing targets.

---

## Contributing

When adding NPC features:

1. **Maintain Shared Simulation**: NPCs must use `Player.update()` logic
2. **Server-Side Only**: No client-side NPC logic
3. **Test Performance**: Measure tick time impact
4. **Document Behavior**: Update this file with new features

---

## Version History

- **v3.0** (2026-01-15): Phase 3 - Combat NPCs (Pirates)
  - Pirate NPCs with full combat AI
  - Target selection and engagement
  - Broadside positioning and firing
  - Precise firing arc (±10°)
  - Integration with GameLoop firing system
  - Spawn with `P` key

- **v2.0** (2026-01-15): Phase 2 - Intelligent Navigation
  - Look-ahead collision detection
  - Alternative heading search
  - Dynamic obstacle avoidance
  - ~90% success rate navigating complex terrain

- **v1.0** (2026-01-14): Phase 1 - Basic NPCs
  - Basic navigation
  - Combat damage (defensive only)
  - Stuck detection
