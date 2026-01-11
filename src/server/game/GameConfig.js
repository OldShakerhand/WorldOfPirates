/**
 * Game Configuration - Core game constants
 * Centralized to prevent inconsistencies across files
 */

const GameConfig = {
    // World dimensions (Gulf of Mexico + Caribbean: 6460×3403 tiles @ 25px)
    WORLD_WIDTH: 161500,  // 6460 tiles × 25px
    WORLD_HEIGHT: 85075,  // 3403 tiles × 25px

    // Canvas/Display
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,

    // Game loop
    TICK_RATE: 60, // Updates per second

    // World Map (tile-based, replaces procedural generation)
    WORLD_MAP_PATH: './src/server/assets/world_map.json',
    TILE_SIZE: 25,  // Pixels per tile (production map)

    // Harbors (loaded from JSON, replaces hardcoded positions)
    HARBORS_PATH: './assets/harbors.json',

    // Terrain types (must match WorldMap.js and convert_map.js)
    TERRAIN: {
        WATER: 0,    // Deep water, full speed
        SHALLOW: 1,  // Shallow water, reduced speed
        LAND: 2      // Impassable, collision damage
    },

    // Harbor
    HARBOR_INTERACTION_RADIUS: 30,
    HARBOR_SPAWN_DISTANCE: 50, // Distance from harbor when leaving

    // Player spawn (Caribbean map: 25,600×13,475 pixels)
    // Spawn in center area to avoid map edges
    PLAYER_SPAWN_MIN: 10000,    // Start at 10,000 pixels (center-left)
    PLAYER_SPAWN_RANGE: 5000    // 5,000 pixel range (10k-15k area)
};

module.exports = GameConfig;
