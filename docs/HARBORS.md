# Harbor System Documentation

## Overview

The harbor system provides server-authoritative harbor data with clean separation from terrain logic.

**Key Principle:** WorldMap handles terrain, HarborRegistry handles harbor metadata.

---

## Architecture

### WorldMap (Terrain Only)
- **Responsibility:** Tile-based terrain queries (water/shallow/land)
- **File:** `src/server/game/WorldMap.js`
- **Data:** `src/server/assets/world_map.json`
- **API:** `getTile()`, `isWater()`, `isShallow()`, `isLand()`

### HarborRegistry (Harbor Metadata)
- **Responsibility:** Harbor data storage and queries
- **File:** `src/server/game/HarborRegistry.js`
- **Data:** `assets/harbors.json`
- **API:** `getAllHarbors()`, `getHarborById()`, `getNearestHarbor()`, `getHarborsByNation()`

### No Cross-Dependencies
- WorldMap does NOT reference HarborRegistry
- HarborRegistry does NOT reference WorldMap
- Integration happens in `World.js`

---

## Harbor Data Schema

### JSON Structure

```json
{
  "id": "port_royal",
  "name": "Port Royal",
  "tileX": 302,
  "tileY": 187,
  "lat": 17.93,
  "lon": -76.84,
  "nation": "england",
  "defenses": "fort_2",
  "services": {
    "bank": true,
    "shipyardMax": "fluyt",
    "jobShipType": "merchant"
  }
}
```

### Field Reference

**Core Fields:**
- `id` (string): Unique identifier (lowercase, underscores)
- `name` (string): Display name
- `tileX` (number): Tile X coordinate
- `tileY` (number): Tile Y coordinate

**Metadata (preserved for future use):**
- `lat` (number): Latitude in decimal degrees
- `lon` (number): Longitude in decimal degrees
- `nation` (string): Owning nation (`england`, `spain`, `holland`, `france`, `pirates`)
- `defenses` (string): Defense level (`none`, `fort`, `fort_2`, `walls`)

**Services (data-only, not yet implemented):**
- `bank` (boolean): Bank available
- `shipyardMax` (string): Maximum ship class available for purchase
- `jobShipType` (string): Ship class for job missions

---

## Coordinate System

### Tile Coordinates (Primary)
Harbors are stored in **tile coordinates** (tileX, tileY).

**Conversion to world coordinates:**
```javascript
const worldX = tileX * GameConfig.TILE_SIZE;
const worldY = tileY * GameConfig.TILE_SIZE;
```

**Current tile size:** 10px (test map)  
**Production tile size:** 25px (planned)

### Geographic Coordinates (Metadata)
Lat/lon coordinates are preserved for reference but not used in gameplay.

**Geographic bounds (Caribbean):**
- North: 28.5°N (Bahamas)
- South: 5.0°N (Panama)
- West: 85.0°W (Central America)
- East: 60.0°W (Lesser Antilles)

---

## Import Tool Usage

### Command

```bash
node tools/import_harbors.js <input.csv> <output.json>
```

### Example

```bash
node tools/import_harbors.js "images/WOP - Harbors.csv" assets/harbors.json
```

### CSV Format

**Required columns (comma-separated):**
1. City Name
2. Coordinates (e.g., `28.35°N, 77.35°W`)
3. Type (always "City")
4. Original Nation
5. Defenses
6. Bank? (Yes/No)
7. Shipyard max
8. Job Ship Type

### Output

- Imports all valid harbors
- Translates lat/lon → tileX/tileY
- Validates harbor positions
- Logs warnings (not errors) for:
  - Harbors outside geographic bounds
  - Harbors closer than 5 tiles
  - Duplicate harbor IDs

---

## HarborRegistry API

### Constructor

```javascript
const registry = new HarborRegistry('./assets/harbors.json');
```

### Methods

**Get all harbors:**
```javascript
const harbors = registry.getAllHarbors();
// Returns: Array of all harbor objects
```

**Get harbor by ID:**
```javascript
const harbor = registry.getHarborById('port_royal');
// Returns: Harbor object or null
```

**Get nearest harbor:**
```javascript
const playerTileX = Math.floor(playerX / GameConfig.TILE_SIZE);
const playerTileY = Math.floor(playerY / GameConfig.TILE_SIZE);

const nearest = registry.getNearestHarbor(playerTileX, playerTileY, 3);
// Returns: Nearest harbor within 3 tiles or null
```

**Get harbors by nation:**
```javascript
const englishHarbors = registry.getHarborsByNation('england');
// Returns: Array of harbors belonging to England
```

---

## Integration Example

### World.js

```javascript
const HarborRegistry = require('./HarborRegistry');

class World {
    constructor() {
        // Load terrain
        this.worldMap = new WorldMap(GameConfig.WORLD_MAP_PATH);
        
        // Load harbors
        this.harborRegistry = new HarborRegistry(GameConfig.HARBORS_PATH);
        
        // Create Harbor instances
        this.harbors = this.harborRegistry.getAllHarbors().map(data => 
            new Harbor(data.id, this.createIslandStub(data))
        );
    }
    
    createIslandStub(harborData) {
        return {
            id: harborData.id,
            x: harborData.tileX * GameConfig.TILE_SIZE,
            y: harborData.tileY * GameConfig.TILE_SIZE,
            radius: 50
        };
    }
}
```

---

## Future Features

### Bank System (Data Ready)
- `services.bank` field indicates bank availability
- Will enable deposit/withdraw gold transactions
- Currently unused, preserved for future implementation

### Shipyard Upgrades (Data Ready)
- `services.shipyardMax` limits ship purchases
- Will restrict available ships by harbor
- Currently unused, preserved for future implementation

### Job Missions (Data Ready)
- `services.jobShipType` defines mission ship type
- Will enable harbor-specific missions
- Currently unused, preserved for future implementation

### Faction Territories (Data Ready)
- `nation` field defines harbor ownership
- Will enable faction-based gameplay
- Currently unused, preserved for future implementation

---

## Maintenance

### Adding New Harbors

1. Add row to CSV file
2. Re-run import tool
3. Restart server

### Updating Harbor Data

1. Edit CSV file
2. Re-run import tool
3. Restart server

### Changing Geographic Bounds

Edit `tools/import_harbors.js`:
```javascript
const BOUNDS = {
    north: 28.5,
    south: 5.0,
    west: -85.0,
    east: -60.0
};
```

### Changing World Dimensions

Edit `tools/import_harbors.js`:
```javascript
const WORLD = {
    widthTiles: 400,
    heightTiles: 376,
    tileSize: 25
};
```

---

## Troubleshooting

### Server fails to start

**Error:** `Harbor data not found: ./assets/harbors.json`

**Solution:** Run import tool to generate `harbors.json`

### Harbors not appearing in-game

**Check:**
1. Server logs show `[HarborRegistry] Loaded X harbors`
2. Harbor positions are on shallow water (use tilemap debug visualization)
3. `GameConfig.TILE_SIZE` matches world map tile size

### Import tool errors

**"Invalid CSV line":** Check CSV format (comma-separated, 8 columns)  
**"Invalid coordinate format":** Check lat/lon format (`28.35°N, 77.35°W`)  
**"Outside bounds":** Harbor is outside Caribbean geographic bounds (warning, not error)

---

## Files

- `src/server/game/HarborRegistry.js` - Harbor registry module
- `tools/import_harbors.js` - CSV → JSON import tool
- `assets/harbors.json` - Harbor data (104 harbors)
- `docs/HARBORS.md` - This documentation
