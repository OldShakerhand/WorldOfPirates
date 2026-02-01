# Ship Wrecks System

## Purpose

This document describes the ship wreck system, which spawns lootable wrecks when ships are destroyed. Wrecks provide a reward mechanism for combat and add visual persistence to battles.

## Overview

When a ship is sunk (player or NPC), a wreck spawns at the ship's final position. Wrecks contain loot (gold and cargo) that can be collected by nearby players using the F key. Wrecks despawn after a configurable duration.

## Core Mechanics

### Wreck Spawning

**Trigger:** Ship destruction (flagship sunk)
- **Player Ships:** Spawn wreck with cargo from player's fleet
- **NPC Ships:** Spawn wreck with procedurally generated loot

**Wreck Properties:**
- Position: Ship's final (x, y) coordinates
- Rotation: Ship's final rotation angle
- Owner: Player ID of the killer (for loot locking)
- Loot: Gold and cargo contents
- Spawn Time: Server timestamp for despawn calculation

### Loot Generation

#### NPC Wrecks
Loot is procedurally generated based on `GameConfig.WRECK`:

```javascript
{
    DURATION: 300,              // 5 minutes until despawn
    OWNER_LOOT_DURATION: 30,    // 30 seconds exclusive to killer
    BASE_GOLD: 150,             // Base gold reward
    MIN_WOOD: 3,                // Minimum wood
    MIN_CLOTH: 2,               // Minimum cloth
    CARGO_SALVAGE_PERCENT: 0.5, // 50% of cargo salvaged
    PRICE_VARIATION: 0.2        // ±20% randomization
}
```

**Generation Logic:**
1. **Gold:** `BASE_GOLD ± (BASE_GOLD * PRICE_VARIATION)`
2. **Wood:** Random between `MIN_WOOD` and `MIN_WOOD * 2`
3. **Cloth:** Random between `MIN_CLOTH` and `MIN_CLOTH * 2`

#### Player Wrecks
- **Gold:** 0 (players don't drop gold)
- **Cargo:** Percentage of player's fleet cargo based on `CARGO_SALVAGE_PERCENT`

### Loot Locking

**Owner Loot Period:** First 30 seconds (configurable)
- Only the killer can loot during this period
- Other players see "Locked (Owner Only)" message
- Prevents loot stealing immediately after combat

**Public Loot Period:** After owner period expires
- Any player can loot the wreck
- First player to press F collects all loot

### Looting Interaction

**Requirements:**
- Player must be within 150px of wreck
- Press F key to loot

**Server Validation:**
1. Distance check (must be close)
2. Ownership check (if still in owner period)
3. Wreck existence (prevents double-looting via race conditions)

**Loot Distribution:**
- Gold added to player's gold balance
- Cargo added to player's fleet cargo (if space available)
- Notification displayed showing what was looted

**Server-Authoritative:**
- Wreck removed **before** granting loot
- Prevents race conditions from multiple loot requests
- Only one player can loot each wreck

### Wreck Despawn

**Automatic Despawn:**
- After `WRECK.DURATION` seconds (300s = 5 minutes)
- Checked every server tick
- Wreck removed from world

**Manual Despawn:**
- When looted by a player
- Immediate removal after loot is granted

## Client-Side Rendering

### Visual Representation

**Sprite:** `/assets/wreck.png`
- Size: 100x100 pixels
- Rotation: Matches ship's final rotation
- Z-Order: Rendered **before** ships (wrecks appear underneath)

### UI Elements

**Proximity Label:**
When player is within 150px:
- **Unlocked:** "Press F to Loot" (white text)
- **Locked:** "Locked (Owner Only)" (grey text)

**Loot Notification:**
On successful loot:
- Green box at top of screen
- Message format: `Looted: 150 gold, 5 wood, 3 cloth`
- Fades out after 3-4 seconds
- Red box for errors (too far, locked, etc.)

## Implementation Files

### Server-Side
- **`src/server/game/entities/Wreck.js`** - Wreck class definition
- **`src/server/game/world/World.js`** - Wreck spawning and management
- **`src/server/game/GameLoop.js`** - Loot handling (`handleLootWreck`)
- **`src/server/game/config/GameConfig.js`** - Wreck configuration
- **`src/server/game/npc/NPCShip.js`** - NPC death triggers wreck spawn

### Client-Side
- **`src/public/js/game.js`** - Wreck rendering and notification display
- **`src/public/js/client.js`** - F key listener and loot request
- **`src/public/assets/wreck.png`** - Wreck sprite

## Configuration

All wreck parameters are defined in `GameConfig.WRECK`:

```javascript
WRECK: {
    DURATION: 300,              // Seconds until despawn
    OWNER_LOOT_DURATION: 30,    // Seconds of exclusive loot
    BASE_GOLD: 150,             // Base gold amount
    MIN_WOOD: 3,                // Minimum wood
    MIN_CLOTH: 2,               // Minimum cloth
    CARGO_SALVAGE_PERCENT: 0.5, // Cargo salvage rate
    PRICE_VARIATION: 0.2        // Price randomization
}
```

## Combat Reward Integration

**Immediate Rewards (on kill):**
- XP: 25 (from `RewardConfig.COMBAT.PIRATE_SUNK`)
- Gold: 0 (removed - now comes from wreck loot)

**Delayed Rewards (from wreck):**
- Gold: ~150 (varies by ±20%)
- Cargo: Wood and cloth

**Design Rationale:**
- Separates instant gratification (XP) from tactical reward (loot)
- Requires winner to return to battlefield for loot
- Creates risk/reward decision (loot now or continue fighting)
- Prevents instant gold inflation

## Edge Cases

### Duplicate Death Prevention
**Problem:** NPC `takeDamage()` called multiple times on dead NPCs
**Solution:** State guard in `NPCShip.takeDamage()`:
```javascript
if (this.state === 'DESPAWNING') return;
```
Prevents duplicate wreck spawns and reward grants.

### Double-Looting Prevention
**Problem:** Multiple F-key presses before server updates game state
**Solution:** Server removes wreck **before** granting loot:
```javascript
const loot = wreck.loot;
this.world.removeWreck(wreckId);  // Remove first
// Then grant loot
```
Second request fails `!wreck` check immediately.

### Cargo Overflow
**Problem:** Player's cargo hold is full
**Behavior:** 
- Gold is always granted
- Cargo that doesn't fit is lost
- Notification shows: `Looted: 150 gold (Cargo full!)`

## Future Enhancements

- [ ] **Wreck Decay Animation** - Visual deterioration over time
- [ ] **Partial Looting** - Allow multiple players to loot portions
- [ ] **Wreck Types** - Different sprites based on ship class
- [ ] **Floating Debris** - Smaller loot items around wreck
- [ ] **Salvage Missions** - Timed missions to collect multiple wrecks
- [ ] **Wreck Markers** - Minimap icons for nearby wrecks

## Testing Notes

**Default Player Ship:** Changed to Frigate for combat testing
**NPC Spawn:** Pirates spawn near players for testing wreck system
**Loot Verification:** Check server console for loot grant messages

---

*Last Updated: 2026-02-01*
