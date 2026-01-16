/**
 * Game Configuration - Core game constants
 * Centralized to prevent inconsistencies across files
 */

const GameConfig = {
    // World dimensions (Gulf of Mexico + Caribbean: 3230×1701 tiles @ 25px - 50% scale)
    WORLD_WIDTH: 80750,   // 3230 tiles × 25px
    WORLD_HEIGHT: 42525,  // 1701 tiles × 25px

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
    // Harbor - Adjusted for 3x larger visual docks (60x120px)
    HARBOR_INTERACTION_RADIUS: 80, // Was 30. Visual extends 60px from center.
    HARBOR_SPAWN_DISTANCE: 150, // Was 50. Must be outside visual bounds.

    // Player spawn (Nassau area - Bahamas, many nearby harbors)
    PLAYER_SPAWN_MIN: 80000,      // Center X: Nassau area (tileX ~3466 * 25 = 86,650)
    PLAYER_SPAWN_RANGE: 5000,     // Spawn within 5000 pixels of center
};

module.exports = GameConfig;
