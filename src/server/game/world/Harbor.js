const GameConfig = require('../config/GameConfig');
const { GAME } = GameConfig;

/**
 * Direction definitions for coastline detection
 * Rotation: angle to rotate sprite (opens LEFT by default)
 */
const DIRECTIONS = [
    { dx: 0, dy: -1, name: 'north', rotation: -Math.PI / 2 },  // Land north → open south
    { dx: 1, dy: 0, name: 'east', rotation: 0 },               // Land east → open west (default)
    { dx: 0, dy: 1, name: 'south', rotation: Math.PI / 2 },    // Land south → open north
    { dx: -1, dy: 0, name: 'west', rotation: Math.PI },        // Land west → open east
];

/**
 * Harbor - represents a port on an island
 * 
 * Visual placement rules:
 * - Sprite anchored at coastline edge (not center)
 * - Land overlap allowed, deep water overlap not allowed
 * - Rotation based on nearest land direction
 */
class Harbor {
    /**
     * @param {string} id - Harbor ID
     * @param {Object} island - Island stub with x, y, tileX, tileY
     * @param {string} name - Harbor name
     * @param {Object} worldMap - WorldMap instance for coastline detection (optional)
     */
    constructor(id, island, name = null, worldMap = null) {
        this.id = id;
        this.island = island;
        this.radius = GAME.HARBOR_INTERACTION_RADIUS;

        // Base position from island stub (tile center)
        this.x = island.x;
        this.y = island.y;

        // Rotation for sprite rendering
        this.rotation = 0;

        // Offset to move harbor to coastline (will be applied to x,y)
        this.visualOffsetX = 0;
        this.visualOffsetY = 0;

        // Detect coastline and compute rotation + offset
        if (worldMap && island.tileX !== undefined && island.tileY !== undefined) {
            this._computeCoastlineOrientation(island.tileX, island.tileY, worldMap);

            // Apply offset to actual position (moves both logic rectangle and sprite)
            this.x += this.visualOffsetX;
            this.y += this.visualOffsetY;
        }

        // DEBUG: Log if coordinates are NaN
        if (isNaN(this.x) || isNaN(this.y)) {
            console.error(`[HARBOR ERROR] ${name || id}: NaN coordinates! island.x=${island.x}, island.y=${island.y}`);
        }

        // Use real harbor name from CSV
        this.name = name || this.generateName();
    }

    /**
     * Find coastline and compute rotation + position offset
     * 
     * Logic:
     * - Check if harbor is on land or water
     * - If on land: search for water, move TO the water (coastline)
     * - If in water: search for land, position touching land
     * - Rotate to face away from land (opening toward water)
     */
    _computeCoastlineOrientation(tileX, tileY, worldMap) {
        const maxDist = 10;
        const currentTerrain = worldMap.getTileByGrid(tileX, tileY);
        const onLand = (currentTerrain === GAME.TERRAIN.LAND);

        let best = null;

        // Scan all 4 directions
        for (const dir of DIRECTIONS) {
            for (let d = 1; d <= maxDist; d++) {
                const checkX = tileX + dir.dx * d;
                const checkY = tileY + dir.dy * d;
                const terrain = worldMap.getTileByGrid(checkX, checkY);

                if (onLand) {
                    // Starting on land: look for water/shallow
                    if (terrain === GAME.TERRAIN.WATER || terrain === GAME.TERRAIN.SHALLOW) {
                        // Found water - this direction leads to coast
                        // Rotation: we found water in this direction, so land is OPPOSITE
                        // We want opening to face the water (this direction)
                        const oppositeRotation = (dir.rotation + Math.PI) % (2 * Math.PI);
                        if (!best || d < best.distance) {
                            best = {
                                dir,
                                distance: d,
                                rotation: oppositeRotation,
                                moveToWater: true
                            };
                        }
                        break;
                    }
                } else {
                    // Starting in water: look for land
                    if (terrain === GAME.TERRAIN.LAND) {
                        // Found land - rotate to face away from it
                        if (!best || d < best.distance) {
                            best = {
                                dir,
                                distance: d,
                                rotation: dir.rotation,
                                moveToWater: false
                            };
                        }
                        break;
                    }
                }
            }
        }

        if (!best) {
            console.warn(`[Harbor] ${this.id}: No coastline found within ${maxDist} tiles (onLand=${onLand})`);
            return;
        }

        // Set rotation
        this.rotation = best.rotation;

        // Calculate offset to move harbor to coastline
        if (best.moveToWater) {
            // Move FROM land TO water: offset in the direction we found water
            // Move (distance - 1) tiles so we're at the last land tile before water
            // Actually, move (distance) tiles to be IN the water, touching land
            const offsetTiles = best.distance;
            this.visualOffsetX = best.dir.dx * offsetTiles * GAME.TILE_SIZE;
            this.visualOffsetY = best.dir.dy * offsetTiles * GAME.TILE_SIZE;
        } else {
            // Already in water: move TOWARD land
            const offsetTiles = best.distance - 1;
            this.visualOffsetX = best.dir.dx * offsetTiles * GAME.TILE_SIZE;
            this.visualOffsetY = best.dir.dy * offsetTiles * GAME.TILE_SIZE;
        }

        console.log(`[Harbor] ${this.id}: onLand=${onLand}, coast=${best.dir.name}, dist=${best.distance}, rotation=${(this.rotation * 180 / Math.PI).toFixed(0)}°, offset=(${this.visualOffsetX}, ${this.visualOffsetY})`);
    }

    generateName() {
        const names = [
            'Port Royal', 'Tortuga', 'Nassau', 'Havana',
            'Cartagena', 'Maracaibo', 'Porto Bello', 'Santiago',
            'Vera Cruz', 'San Juan', 'Barbados', 'Jamaica',
            'Curacao', 'Trinidad', 'Martinique'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    isPlayerInRange(playerX, playerY) {
        const dist = Math.hypot(this.x - playerX, this.y - playerY);
        return dist < this.radius;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            name: this.name,
            islandId: this.island.id,
            // Visual properties for client rendering
            rotation: this.rotation,
            visualOffsetX: this.visualOffsetX,
            visualOffsetY: this.visualOffsetY
        };
    }
}

module.exports = Harbor;

