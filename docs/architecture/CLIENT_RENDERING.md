# Client-Side Rendering Systems

## Overview

World of Pirates uses client-side visual enhancement systems to improve player experience without affecting gameplay mechanics or server authority. These systems are purely cosmetic and do not influence collision detection, physics, or any server-authoritative logic.

**Key Principles:**
- **Visual Only**: No gameplay impact
- **Server Authority**: Server remains 100% authoritative for all game logic
- **Performance**: Optimized for smooth 60fps rendering
- **Graceful Degradation**: Missing assets or disabled features don't break the game

---

## VisualAdapter

### Purpose
The VisualAdapter renders the world tilemap visually on the client, providing terrain context (land, shallow water, deep water) without affecting server-side collision detection or movement.

### Implementation

**Location**: `src/public/js/visual_adapter.js`

**How It Works**:
1. Client fetches `world_map.json` (tilemap data) at startup
2. VisualAdapter renders tiles based on camera position each frame
3. Tiles are drawn *before* game objects (islands, harbors, ships)
4. Server continues to use its own authoritative tilemap for all gameplay logic

**Integration** (`game.js`):
```javascript
if (worldTilemap && typeof VisualAdapter !== 'undefined') {
    const worldCameraX = -cameraX;
    const worldCameraY = -cameraY;
    VisualAdapter.render(ctx, worldTilemap, worldCameraX, worldCameraY, 
                        canvas.width, canvas.height);
}
```

**Configuration**:
- Tilemap: `src/public/assets/world_map.json`
- Tile size: 25×25 pixels (50% scale from original 50px tiles)
- World dimensions: 80,750×42,525 pixels (3,230×1,701 tiles)

### Debug Mode
Set `DEBUG_RENDER_TILEMAP = true` in `game.js` to enable debug grid overlay.

---

## WakeRenderer

### Purpose
Provides visual movement cues by rendering a procedural water trail behind moving ships. Helps players perceive direction and speed without relying on UI elements.

### Implementation

**Location**: `src/public/js/WakeRenderer.js`

**Architecture**:
- **Particle System**: Manages array of wake particles
- **Procedural Generation**: Spawns circles that fade and expand over time
- **Hull-Width Scaling**: Wake width dynamically matches each ship's hull (not full sprite width including sails)

### Particle Mechanics

**Spawning**:
- Triggered when `ship.speedInKnots > 2`
- Spawn rate: 30% probability per frame (reduces "propeller" look)
- Position: Calculated at ship stern using rotation and `spriteHeight`

**Particle Properties**:
```javascript
{
    x, y: World coordinates (stays in place as ship moves)
    radius: Based on hull width (hullWidth * 0.4)
    alpha: 0.15-0.25 (soft, subtle)
    maxAge: 1-2 seconds
    expansionRate: 4 + (speed * 0.5) // Faster ships = more turbulent wake
}
```

**Update Loop**:
- Particles age and fade linearly: `alpha = startAlpha * (1 - age/maxAge)`
- Particles expand: `radius += expansionRate * deltaTime`
- Particles removed when `age >= maxAge`

### Hull-Width Scaling

Each ship has a `hitboxWidthFactor` that represents the hull width relative to sprite width:

| Ship | Sprite Width | Hitbox Factor | Hull Width |
|------|--------------|---------------|------------|
| Raft | 180px | 0.13 | 23px |
| Sloop | 92px | 0.24 | 22px |
| Barque | 116px | 0.25 | 29px |
| Fluyt | 116px | 0.38 | 44px |
| Merchant | 120px | 0.33 | 40px |
| Frigate | 140px | 0.41 | 57px |
| Spanish Galleon | 160px | 0.32 | 51px |
| War Galleon | 180px | 0.45 | 81px |

Wake particles spawn within `hullWidth * 0.8` lateral offset, ensuring they don't extend beyond the visible hull.

### Integration

**Initialization** (`game.js`):
```javascript
const wakeRenderer = new WakeRenderer();
```

**Render Loop** (`game.js:renderGame()`):
```javascript
// Update particles
wakeRenderer.update(0.016); // ~60fps

// Draw wake (before ships)
wakeRenderer.draw(ctx);

// Spawn particles for moving ships
for (const id in state.players) {
    const player = state.players[id];
    wakeRenderer.spawnFor(player, getShipProperties(player.shipClassName), 0.016);
}
```

### Performance

- **Particle Cap**: 500 particles maximum
- **Culling**: Particles auto-removed after maxAge
- **Rendering**: Simple `ctx.arc()` calls, batched per frame
- **Typical Load**: ~50-100 active particles with multiple ships

### Tuning Parameters

Located in `WakeRenderer.js:spawnFor()`:

```javascript
const speedThreshold = 2;        // Minimum knots to spawn
const spawnProbability = 0.3;    // 30% spawn rate
const lateralSpread = 0.8;       // 80% of hull width
const radiusScale = 0.4;         // Particle size relative to hull
const startAlpha = 0.15-0.25;    // Transparency range
const maxAge = 1.0-2.0;          // Lifetime in seconds
```

---

## Ship Properties Synchronization

Client-side `SHIP_PROPERTIES` in `game.js` must match server-side `ShipClass.js` for correct visual alignment:

```javascript
let SHIP_PROPERTIES = {
    'Sloop': { 
        spriteWidth: 92, 
        spriteHeight: 92, 
        spriteRotation: 0, 
        hitboxWidthFactor: 0.24 
    },
    // ... etc
};
```

These properties are used by:
- `drawShip()` for sprite rendering
- `WakeRenderer` for stern position and hull-width calculations
- Debug hitbox visualization

---

## References

- **WakeRenderer**: [WakeRenderer.js](file:///c:/Development/WorldOfPirates/src/public/js/WakeRenderer.js)
- **VisualAdapter**: [visual_adapter.js](file:///c:/Development/WorldOfPirates/src/public/js/visual_adapter.js)
- **Integration**: [game.js](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Ship Stats**: [ShipClass.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/ShipClass.js)
