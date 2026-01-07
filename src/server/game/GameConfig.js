/**
 * Game Configuration - Core game constants
 * Centralized to prevent inconsistencies across files
 */

const GameConfig = {
    // World dimensions
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 2000,

    // Canvas/Display
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,

    // Game loop
    TICK_RATE: 60, // Updates per second

    // World Map (tile-based, replaces procedural generation)
    WORLD_MAP_PATH: './src/server/assets/world_map.json',

    // Terrain types (must match WorldMap.js and convert_map.js)
    TERRAIN: {
        WATER: 0,    // Deep water, full speed
        SHALLOW: 1,  // Shallow water, reduced speed
        LAND: 2      // Impassable, collision damage
    },

    // Harbor
    HARBOR_INTERACTION_RADIUS: 30,
    HARBOR_SPAWN_DISTANCE: 50, // Distance from harbor when leaving

    // Player spawn
    PLAYER_SPAWN_MIN: 100,
    PLAYER_SPAWN_RANGE: 200
};

module.exports = GameConfig;
