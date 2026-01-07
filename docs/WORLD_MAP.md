# World Map System

## Purpose

The World Map system provides a server-authoritative, tile-based terrain representation that replaces procedural island generation. This system defines gameplay rules for water, shallow water, and land terrain.

---

## Design Contract

### DESIGN CONTRACT: WORLD MAP

**Server Authority:**
- World map is tile-based and server-authoritative
- One pixel in source image equals one tile
- Tiles define gameplay rules, NOT visuals
- Visual layers (sprites, effects) are derived, never authoritative
- No gameplay logic depends on client rendering

**Determinism:**
- Same tilemap JSON always produces same behavior
- Tile lookups are pure functions (no side effects)
- Map is immutable after server startup
- Debuggable: can inspect exact tile at any coordinate

**Coordinate System:**
- World coordinates: continuous floats (ship positions)
- Tile coordinates: discrete integers (grid cells)
- Conversion: `tileX = floor(worldX / tileSize)`
- Origin: (0, 0) is top-left corner

**Terrain Types:**
- `WATER (0)`: Deep water, full speed, no collision
- `SHALLOW (1)`: Shallow water, reduced speed, no collision
- `LAND (2)`: Impassable, causes collision damage

**Shallow Water Semantics:**
- Shallow water is AUTHORED in the map image
- It is NOT derived procedurally from land proximity
- It is a first-class gameplay concept
- Players experience reduced speed in shallow water

**Out-of-Bounds Handling:**
- **DESIGN CONTRACT:** Any world coordinate outside tilemap bounds MUST be treated as LAND
- Out-of-bounds is always impassable
- This applies to:
  - Collision detection
  - Movement checks  
  - Terrain queries
- **Rationale:**
  - Prevents ships from leaving the designed world
  - Avoids undefined behavior at map edges
  - Keeps server logic simple and deterministic
  - Matches "invisible land wall" semantics
- **Implementation:**
  - `WorldMap.getTileByGrid(x, y)` returns `TERRAIN.LAND` for out-of-bounds
  - All helper methods (`isWater`, `isShallow`, `isPassable`) rely on this
  - No coordinate clamping
  - No coordinate wrapping
  - No warnings logged (expected behavior)
- **Result:** The map has implicit solid borders without adding explicit tiles

---

## Terrain Semantics

### Water (Deep)
- **Value:** 0
- **Gameplay:** Ships move at full speed
- **Collision:** None
- **Visual:** Deep blue ocean

### Shallow Water
- **Value:** 1
- **Gameplay:** Ships move at reduced speed (see `PhysicsConfig.SHALLOW_WATER_SPEED_MULTIPLIER`)
- **Collision:** None (passable but slower)
- **Visual:** Light blue/cyan water
- **Design:** Manually authored in map image, typically near coastlines

### Land
- **Value:** 2
- **Gameplay:** Impassable
- **Collision:** Causes damage based on ship speed
- **Visual:** Brown/green islands
- **Design:** Manually authored in map image

---

## Coordinate Systems

### World Coordinates
- **Type:** Continuous floats
- **Usage:** Ship positions, projectile positions
- **Example:** `(523.7, 891.2)`
- **Range:** `0` to `width * tileSize`, `0` to `height * tileSize`

### Tile Coordinates
- **Type:** Discrete integers
- **Usage:** Tilemap array indices
- **Example:** `(52, 89)` for tile size 10
- **Range:** `0` to `width-1`, `0` to `height-1`

### Conversion

**World → Tile:**
```javascript
tileX = Math.floor(worldX / tileSize);
tileY = Math.floor(worldY / tileSize);
```

**Tile → World (center of tile):**
```javascript
worldX = (tileX + 0.5) * tileSize;
worldY = (tileY + 0.5) * tileSize;
```

---

## Creating a New Map

### 1. Create Map Mask Image

**Requirements:**
- Format: PNG
- No anti-aliasing
- Solid colors only
- One pixel = one tile

**Color Encoding (Red Channel):**
- `value < 50` → WATER (dark colors)
- `value < 200` → SHALLOW (medium colors)
- `else` → LAND (light colors)

**Recommended Tools:**
- GIMP, Photoshop, Paint.NET
- Use pencil/hard brush (no anti-aliasing)
- Work in grayscale or use red channel

**Example Palette:**
- Water: RGB(0, 0, 0) - Black
- Shallow: RGB(128, 128, 128) - Gray
- Land: RGB(255, 255, 255) - White

### 2. Run Conversion Script

```bash
node tools/convert_map.js assets/map_mask.png assets/world_map.json 10
```

**Arguments:**
1. Input PNG path
2. Output JSON path
3. Tile size in pixels (default: 10)

**Output:**
- `world_map.json` file
- Console statistics (% water, shallow, land)

### 3. Restart Server

The server loads `world_map.json` at startup. Changes require a restart.

---

## API Reference

### WorldMap Class

**Constructor:**
```javascript
const worldMap = new WorldMap('./assets/world_map.json');
```

**Coordinate Conversion:**
```javascript
worldMap.worldToTile(worldX, worldY) → {tileX, tileY}
worldMap.tileToWorld(tileX, tileY) → {worldX, worldY}
```

**Terrain Queries:**
```javascript
worldMap.getTile(worldX, worldY) → TERRAIN enum (0, 1, or 2)
worldMap.getTileByGrid(tileX, tileY) → TERRAIN enum

worldMap.isWater(worldX, worldY) → boolean
worldMap.isShallow(worldX, worldY) → boolean
worldMap.isLand(worldX, worldY) → boolean
worldMap.isPassable(worldX, worldY) → boolean (water or shallow)
```

**Metadata:**
```javascript
worldMap.getWorldDimensions() → {width, height} (in world coordinates)
```

---

## Integration Guide

### Ship Movement

Ships check terrain to determine speed and collision:

```javascript
// In Player.update()
if (worldMap.isShallow(this.x, this.y)) {
    speedMultiplier *= PhysicsConfig.SHALLOW_WATER_SPEED_MULTIPLIER;
}

if (worldMap.isLand(newX, newY)) {
    // Collision! Apply damage and stop ship
}
```

### Spawn Position Validation

```javascript
// In GameLoop.findSafeSpawnPosition()
if (worldMap.isWater(x, y)) {
    return { x, y }; // Safe spawn (deep water only)
}
```

---

## Troubleshooting

### Map Not Loading

**Error:** `Cannot find module './assets/world_map.json'`

**Solution:**
1. Verify `assets/world_map.json` exists
2. Check `GameConfig.WORLD_MAP_PATH` is correct
3. Run conversion script if JSON is missing

### Incorrect Terrain at Coordinates

**Problem:** Ship collides with "empty" water

**Diagnosis:**
1. Check tile at position: `worldMap.getTile(x, y)`
2. Verify coordinate conversion: `worldMap.worldToTile(x, y)`
3. Inspect `world_map.json` tiles array manually

**Common Causes:**
- Tile size mismatch (JSON vs GameConfig)
- Coordinate system confusion (world vs tile)
- Anti-aliasing in source image

### Performance Concerns

**Q:** Is tile lookup slow?

**A:** No. Tile lookups are O(1) array access. Much faster than procedural island distance calculations.

**Q:** Does the tilemap use too much memory?

**A:** For a 1000×1000 map, tilemap is ~1MB. Negligible for modern systems.

---

## Future Extensions

### Fog of War
Each player can have a `discoveredTiles[y][x]` boolean array tracking explored areas.

### Harbor Placement
Harbors can be placed on specific land/shallow tiles with metadata.

### Faction Territories
Tiles can have optional `factionId` property for territorial waters.

### AI Pathfinding
AI ships can use A* pathfinding on water tiles for navigation.

### Regional Logic
Define mission regions as tile rectangles or polygons.

---

## File Structure

```
WorldOfPirates/
├── assets/
│   ├── map_mask.png          (hand-drawn map image)
│   └── world_map.json         (generated tilemap)
├── tools/
│   └── convert_map.js         (PNG → JSON conversion)
├── src/server/game/
│   ├── WorldMap.js            (tilemap loader & API)
│   ├── GameConfig.js          (TERRAIN constants)
│   ├── World.js               (integrates WorldMap)
│   └── Player.js              (uses WorldMap for terrain)
└── docs/
    └── WORLD_MAP.md           (this file)
```

---

## Migration from Procedural Generation

**Breaking Change:** This system completely replaces procedural island generation.

**Removed:**
- `World.generateIslands()`
- `World.generateWaterDepth()`
- `Island` class usage for collision
- `waterDepth.isDeep()`, `waterDepth.checkIslandCollisions()`

**Replaced With:**
- `WorldMap.isWater()`, `WorldMap.isShallow()`, `WorldMap.isLand()`
- Tile-based collision detection
- Authored shallow water (not inferred from island proximity)

---

## Design Rationale

### Why Tile-Based?

1. **Deterministic:** Same map always produces same gameplay
2. **Debuggable:** Can inspect exact terrain at any coordinate
3. **Performant:** O(1) lookups vs O(n) island distance checks
4. **Extensible:** Easy to add fog of war, regions, factions
5. **Authored:** Designers have precise control over world layout

### Why Image → Tilemap?

1. **Visual Editing:** Designers can draw maps in familiar tools (GIMP, Photoshop)
2. **Rapid Iteration:** Edit image, run script, restart server
3. **Version Control:** PNG and JSON are both git-friendly
4. **No Code Changes:** Map updates don't require code changes

### Why Server-Authoritative?

1. **Anti-Cheat:** Clients can't modify terrain
2. **Consistency:** All players see same world
3. **Simplicity:** Single source of truth
4. **Future-Proof:** Supports fog of war, persistent world

---

## Changelog

**2026-01-07:** Initial tile-based world map system
- Replaced procedural island generation
- Implemented WorldMap module
- Created conversion script
- Updated Player and World integration
