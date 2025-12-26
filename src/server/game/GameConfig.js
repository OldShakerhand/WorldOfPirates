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

    // Island generation
    ISLAND_COUNT: 7,
    ISLAND_MIN_RADIUS: 60,
    ISLAND_MAX_RADIUS: 150,
    ISLAND_MIN_SPACING: 100,
    ISLAND_GENERATION_ATTEMPTS: 50,
    ISLAND_SHALLOW_WATER_EXTENSION: 80, // Units beyond island radius

    // Harbor
    HARBOR_INTERACTION_RADIUS: 30,
    HARBOR_SPAWN_DISTANCE: 50, // Distance from harbor when leaving

    // Player spawn
    PLAYER_SPAWN_MIN: 100,
    PLAYER_SPAWN_RANGE: 200
};

module.exports = GameConfig;
