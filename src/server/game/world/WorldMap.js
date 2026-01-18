const fs = require('fs');
const path = require('path');

/**
 * DESIGN CONTRACT: WORLD MAP
 * 
 * Server Authority:
 * - World map is tile-based and server-authoritative
 * - One pixel in source image equals one tile
 * - Tiles define gameplay rules, NOT visuals
 * - Visual layers are derived, never authoritative
 * - No gameplay logic depends on client rendering
 * 
 * Determinism:
 * - Same tilemap JSON always produces same behavior
 * - Tile lookups are pure functions (no side effects)
 * - Map is immutable after server startup
 * - Debuggable: can inspect exact tile at any coordinate
 * 
 * Coordinate System:
 * - World coordinates: continuous floats (ship positions)
 * - Tile coordinates: discrete integers (grid cells)
 * - Conversion: tileX = floor(worldX / tileSize)
 * - Origin: (0, 0) is top-left corner
 * 
 * Terrain Types:
 * - WATER (0): Deep water, full speed, no collision
 * - SHALLOW (1): Shallow water, reduced speed, no collision
 * - LAND (2): Impassable, causes collision damage
 * 
 * Shallow Water Semantics:
 * - Shallow water is AUTHORED in the map image
 * - It is NOT derived procedurally from land proximity
 * - It is a first-class gameplay concept
 * 
 * Bounds Handling:
 * - Out-of-bounds coordinates are treated as LAND
 * - This prevents ships from escaping the map
 */

const TERRAIN = {
    WATER: 0,
    SHALLOW: 1,
    LAND: 2
};

class WorldMap {
    /**
     * Create a WorldMap from tilemap JSON file
     * @param {string} jsonPath - Path to world_map.json
     */
    constructor(jsonPath) {
        console.log(`Loading world map from ${jsonPath}...`);

        // Load and parse JSON
        const data = fs.readFileSync(jsonPath, 'utf8');
        const tilemap = JSON.parse(data);

        // Validate structure
        if (!tilemap.width || !tilemap.height || !tilemap.tileSize || !tilemap.tiles) {
            throw new Error('Invalid tilemap format: missing required fields');
        }

        if (!Array.isArray(tilemap.tiles) || tilemap.tiles.length !== tilemap.height) {
            throw new Error(`Invalid tilemap: expected ${tilemap.height} rows, got ${tilemap.tiles.length}`);
        }

        // Store immutable data
        this.width = tilemap.width;
        this.height = tilemap.height;
        this.tileSize = tilemap.tileSize;
        this.tiles = tilemap.tiles;

        console.log(`World map loaded: ${this.width}x${this.height} tiles (tile size: ${this.tileSize}px)`);

        // Calculate statistics
        let waterCount = 0, shallowCount = 0, landCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const terrain = this.tiles[y][x];
                if (terrain === TERRAIN.WATER) waterCount++;
                else if (terrain === TERRAIN.SHALLOW) shallowCount++;
                else if (terrain === TERRAIN.LAND) landCount++;
            }
        }

        const total = this.width * this.height;
        console.log(`Terrain: ${waterCount} water (${(waterCount / total * 100).toFixed(1)}%), ${shallowCount} shallow (${(shallowCount / total * 100).toFixed(1)}%), ${landCount} land (${(landCount / total * 100).toFixed(1)}%)`);
    }

    /**
     * Convert world coordinates to tile coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{tileX: number, tileY: number}}
     */
    worldToTile(worldX, worldY) {
        return {
            tileX: Math.floor(worldX / this.tileSize),
            tileY: Math.floor(worldY / this.tileSize)
        };
    }

    /**
     * Convert tile coordinates to world coordinates (center of tile)
     * @param {number} tileX - Tile X coordinate
     * @param {number} tileY - Tile Y coordinate
     * @returns {{worldX: number, worldY: number}}
     */
    tileToWorld(tileX, tileY) {
        return {
            worldX: (tileX + 0.5) * this.tileSize,
            worldY: (tileY + 0.5) * this.tileSize
        };
    }

    /**
     * Get terrain type at tile coordinates
     * Out-of-bounds returns LAND (prevents escaping map)
     * @param {number} tileX - Tile X coordinate
     * @param {number} tileY - Tile Y coordinate
     * @returns {number} TERRAIN enum value
     */
    getTileByGrid(tileX, tileY) {
        // Bounds check: out-of-bounds is LAND
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return TERRAIN.LAND;
        }

        return this.tiles[tileY][tileX];
    }

    /**
     * Get terrain type at world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {number} TERRAIN enum value
     */
    getTile(worldX, worldY) {
        const { tileX, tileY } = this.worldToTile(worldX, worldY);
        return this.getTileByGrid(tileX, tileY);
    }

    /**
     * Check if world coordinates are water (deep)
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean}
     */
    isWater(worldX, worldY) {
        return this.getTile(worldX, worldY) === TERRAIN.WATER;
    }

    /**
     * Check if world coordinates are shallow water
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean}
     */
    isShallow(worldX, worldY) {
        return this.getTile(worldX, worldY) === TERRAIN.SHALLOW;
    }

    /**
     * Check if world coordinates are land
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean}
     */
    isLand(worldX, worldY) {
        return this.getTile(worldX, worldY) === TERRAIN.LAND;
    }

    /**
     * Check if world coordinates are passable (water or shallow)
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean}
     */
    isPassable(worldX, worldY) {
        const terrain = this.getTile(worldX, worldY);
        return terrain === TERRAIN.WATER || terrain === TERRAIN.SHALLOW;
    }

    /**
     * Get map dimensions in world coordinates
     * @returns {{width: number, height: number}}
     */
    getWorldDimensions() {
        return {
            width: this.width * this.tileSize,
            height: this.height * this.tileSize
        };
    }
}

module.exports = WorldMap;
module.exports.TERRAIN = TERRAIN;
