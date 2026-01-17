# Ship Assets & Configuration Reference

## Purpose

This document defines ship classes, their statistics, asset requirements, and visual rendering details. Use this when:
- Creating new ship sprites or sail state variants
- Debugging sprite loading issues
- Understanding ship progression and balance
- Verifying hitbox alignment

## Ship Classes

### Current Ship Roster

| Ship | Size | Cannons/Side | Max Speed | Health | Cost |
|------|------|--------------|-----------|--------|------|
| **Raft** | 180×180px | 0 | 14 kn | 50 | 0 |
| **Sloop** | 92×92px | 2 | 9.2 kn | 100 | 500 |
| **Barque** | 116×116px | 3 | 8.7 kn | 150 | 1,000 |
| **Fluyt** | 116×116px | 4 | 7.7 kn | 200 | 1,500 |
| **Merchant** | 120×120px | 5 | 7.2 kn | 250 | 2,000 |
| **Frigate** | 140×140px | 6 | 8.4 kn | 300 | 3,000 |
| **Spanish Galleon** | 160×160px | 8 | 6.4 kn | 400 | 5,000 |
| **War Galleon** | 180×180px | 12 | 5.4 kn | 500 | 8,000 |

**Design Philosophy**:
- **Size Progression**: Logical visual scaling from 92px (Sloop) to 180px (War Galleon)
- **Speed vs Power**: Smaller ships are faster; larger ships have more firepower
- **Raft**: Special case - scaled to 180px for visibility despite being smallest ship

### Hitbox Configuration

Hitboxes are tuned to match the **hull width** (excluding sails) for accurate collision detection:

| Ship | Hitbox Width Factor | Actual Hull Width |
|------|---------------------|-------------------|
| Raft | 0.13 | 23px |
| Sloop | 0.24 | 22px |
| Barque | 0.25 | 29px |
| Fluyt | 0.38 | 44px |
| Merchant | 0.33 | 40px |
| Frigate | 0.41 | 57px |
| Spanish Galleon | 0.32 | 51px |
| War Galleon | 0.45 | 81px |

**Note**: Hitbox factors are also used by [WakeRenderer](../architecture/CLIENT_RENDERING.md#wakerenderer) to scale wake width to hull dimensions.

---

## Sail State System

### Overview

Each ship supports 3 dynamic sail states that change the sprite based on player input:
- **State 0**: No sails (stopped)
- **State 1**: Half sails (medium speed)
- **State 2**: Full sails (maximum speed)

### Asset Requirements

**File Format**: PNG with transparency  
**Naming Pattern**: `{ship_name}_{state}.png` where state is 0, 1, or 2  
**Fallback Sprite**: `{ship_name}.png` must always exist as base sprite  
**Orientation**: All sprites point UP (north) at 0 rotation  
**Location**: `src/public/assets/ships/`

### Implementation Behavior

- Missing sail state variants **never** cause errors or crashes
- Game gracefully falls back to base sprite if variant unavailable
- Sail state changes are immediate (no animation transitions)
- All ships use same 3-state system

### Code References

- **Sprite Loading**: [`game.js:preloadShipSprites()`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Sprite Selection**: [`game.js:drawShip()`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Ship Stats**: [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js)

---

## Asset Checklist

### Raft ✅ (Complete)
- [x] `raft_0.png` - No sails
- [x] `raft_1.png` - Half sails
- [x] `raft_2.png` - Full sails
- [x] `raft.png` - Base sprite (fallback)

### Sloop ✅ (Complete)
- [x] `sloop_0.png` - No sails
- [x] `sloop_1.png` - Half sails
- [x] `sloop_2.png` - Full sails
- [x] `sloop.png` - Base sprite (fallback)

### Barque (Pending)
- [ ] `barque_0.png` - No sails
- [ ] `barque_1.png` - Half sails
- [ ] `barque_2.png` - Full sails
- [x] `barque.png` - Base sprite (currently used as fallback)

### Fluyt ✅ (Complete)
- [x] `fluyt_0.png` - No sails
- [x] `fluyt_1.png` - Half sails
- [x] `fluyt_2.png` - Full sails
- [x] `fluyt.png` - Base sprite (fallback)

### Merchant (Pending)
- [ ] `merchant_0.png` - No sails
- [ ] `merchant_1.png` - Half sails
- [ ] `merchant_2.png` - Full sails
- [x] `merchant.png` - Base sprite (currently used as fallback)

### Frigate (Pending)
- [ ] `frigate_0.png` - No sails
- [ ] `frigate_1.png` - Half sails
- [ ] `frigate_2.png` - Full sails
- [x] `frigate.png` - Base sprite (currently used as fallback)

### Spanish Galleon (Pending)
- [ ] `spanish_galleon_0.png` - No sails
- [ ] `spanish_galleon_1.png` - Half sails
- [ ] `spanish_galleon_2.png` - Full sails
- [x] `spanish_galleon.png` - Base sprite (currently used as fallback)

### War Galleon (Pending)
- [ ] `war_galleon_0.png` - No sails
- [ ] `war_galleon_1.png` - Half sails
- [ ] `war_galleon_2.png` - Full sails
- [x] `war_galleon.png` - Base sprite (currently used as fallback)

---

## Visual Effects

### Wake Rendering

Ships generate a procedural water trail when moving (speed > 2 knots). The wake:
- Spawns at the ship's stern
- Scales width to match hull dimensions (not full sprite width)
- Fades and expands over 1-2 seconds
- Is purely visual (no gameplay impact)

See [CLIENT_RENDERING.md](../architecture/CLIENT_RENDERING.md#wakerenderer) for technical details.

---

## Adding New Assets

To add sail state variants for any ship:

1. Create 3 PNG files with naming convention: `{ship_name}_{state}.png`
2. Place them in `src/public/assets/ships/`
3. Reload the game - variants will be used automatically!

---

## Testing

To verify sail state variants are working:

1. Switch to the ship in a harbor
2. Leave harbor and press W/S to change sail states
3. Observe the ship sprite changing between the 3 variants
4. If variants aren't available, the base sprite will be shown (no visual change)

To verify hitboxes:

1. Set `DEBUG_HITBOXES = true` in `game.js`
2. Red rectangles will overlay ships showing collision boundaries
3. Verify hitbox aligns with hull (not sails)

---

*Update this checklist as new ship sprites are created.*
