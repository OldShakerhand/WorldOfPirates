/**
 * GameConfig.js - Centralized game configuration
 * 
 * CONSOLIDATION: Merged from 4 separate config files
 * - GameConfig.js (core game settings)
 * - PhysicsConfig.js (movement and physics)
 * - CombatConfig.js (combat mechanics)
 * - NavigationConfig.js (NPC navigation)
 * 
 * Benefits of consolidation:
 * - All game balance in ONE place
 * - AI can see all config simultaneously
 * - Easy to identify cross-system dependencies
 * - Single file to review for balance changes
 */

const GameConfig = {
    // ========================================
    // GAME: Core game constants
    // ========================================
    GAME: {
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
        HARBORS_PATH: './src/server/assets/harbors.json',
        HARBOR_TRADE_PROFILES_PATH: './src/server/assets/harbor_trade_profiles.json',

        // Terrain types (must match WorldMap.js and convert_map.js)
        TERRAIN: {
            WATER: 0,    // Deep water, full speed
            SHALLOW: 1,  // Shallow water, reduced speed
            LAND: 2      // Impassable, collision damage
        },

        // Island
        ISLAND_SHALLOW_WATER_EXTENSION: 50, // Radius extension for shallow water

        // Harbor - Adjusted for 3x larger visual docks (60x120px)
        HARBOR_INTERACTION_RADIUS: 80, // Was 30. Visual extends 60px from center.
        HARBOR_SPAWN_DISTANCE: 120, // Distance North of harbor to spawn when exiting (toward water)

        // Player spawn (Nassau area - Bahamas, many nearby harbors)
        PLAYER_SPAWN_MIN: 80000,      // Center X: Nassau area (tileX ~3466 * 25 = 86,650)
        PLAYER_SPAWN_RANGE: 5000,     // Spawn within 5000 pixels of center
    },

    // ========================================
    // PHYSICS: Movement and physics constants
    // ========================================
    PHYSICS: {
        // Acceleration/Deceleration (units per second per second)
        ACCELERATION: 20, // Deep water acceleration
        DECELERATION: 10, // Deep water deceleration

        // Sail change
        SAIL_CHANGE_COOLDOWN: 0.5, // Seconds

        // Speed modifiers
        SHALLOW_WATER_SPEED_MULTIPLIER: 0.75, // 25% reduction

        // Raft turn speed (maxSpeed comes from ShipClass.RAFT)
        RAFT_TURN_SPEED: 1.5,

        // Fleet penalties
        FLEET_SPEED_PENALTY_PER_SHIP: 0.05, // 5% per additional ship
        MAX_FLEET_SPEED_PENALTY: 0.50, // Maximum 50% penalty

        // Wind
        WIND_CHANGE_INTERVAL_MIN: 30, // Seconds
        WIND_CHANGE_INTERVAL_MAX: 60, // Seconds
        WIND_CHANGE_RATE: 0.5, // Radians per second

        // Wind angle zones (in degrees) and efficiency multipliers
        WIND_ANGLE_POOR_MAX: 60,        // 0-60° = headwind
        WIND_ANGLE_MODERATE_MAX: 100,   // 60-100° = beam reach
        WIND_ANGLE_GOOD_MAX: 140,       // 100-140° = broad reach
        // 140-180° = tailwind (implicit)

        WIND_EFFICIENCY_POOR: 0.40,      // 40% speed
        WIND_EFFICIENCY_MODERATE: 0.65,  // 65% speed
        WIND_EFFICIENCY_GOOD: 0.85,      // 85% speed
        WIND_EFFICIENCY_EXCELLENT: 1.0,  // 100% speed

        // Ship collision
        SHIP_COLLISION_RADIUS: 15,

        // Knots conversion
        SPEED_TO_KNOTS_MULTIPLIER: 0.1
    },

    // ========================================
    // COMBAT: Combat-related constants
    // ========================================
    COMBAT: {
        // Fire rates
        CANNON_FIRE_RATE: 4.0,  // Seconds between shots
        CANNON_SPREAD: 0.05,    // Radians between dual cannons

        // Damage
        PROJECTILE_DAMAGE: 10,
        COLLISION_DAMAGE_THRESHOLD: 20,    // Speed threshold for collision damage
        COLLISION_DAMAGE_MULTIPLIER: 0.2,  // Damage = (speed - threshold) * multiplier

        // Shield/Invulnerability
        FLAGSHIP_SWITCH_SHIELD_DURATION: 10,  // Seconds after losing flagship
        HARBOR_EXIT_SHIELD_DURATION: 10,      // Seconds after leaving harbor (no firing allowed)

        // Projectile physics
        PROJECTILE_SPEED: 120,
        PROJECTILE_MAX_DISTANCE: 250,      // Pixels (explicit range)
        PROJECTILE_INITIAL_Z: 15,          // Starting height above water
        PROJECTILE_INITIAL_Z_SPEED: 10,    // Initial upward velocity
        // NOTE: Gravity is calculated dynamically in Projectile.js to ensure
        // projectile reaches water exactly at PROJECTILE_MAX_DISTANCE

        // Visual
        PROJECTILE_BALL_RADIUS: 2,           // Visual size of the cannonball
        PROJECTILE_SHADOW_RADIUS: 1,         // Visual size of the shadow
        PROJECTILE_COLLISION_MULTIPLIER: 1.2, // Collision radius = ball radius * multiplier

        // DEBUG ONLY: Collision diagnostics
        // Set to true to enable detailed collision logging
        // This is temporary instrumentation to diagnose intermittent collision misses
        // NO gameplay behavior is modified when enabled
        DEBUG_COLLISION: false,

        // DEBUG ONLY: Initialization & lifecycle diagnostics
        // Set to true to track World creation, player joins, entity registration, first ticks
        // Used to diagnose rare early-session collision failures
        // NO gameplay behavior is modified when enabled
        DEBUG_INITIALIZATION: false
    },

    // ========================================
    // NAVIGATION: NPC navigation and obstacle avoidance
    // ========================================
    NAVIGATION: {
        // Look-ahead distance for collision detection (in tiles)
        // NPCs sample this many tiles ahead to predict obstacles
        // Larger values = earlier detection, more CPU cost
        LOOK_AHEAD_TILES: 7,

        // Alternative heading search angles (radians)
        // When obstacle detected, test these angles relative to desired heading
        // Order matters: first clear heading is selected
        // Expanded to +/- 180 degrees to allow turning away from target if needed
        SEARCH_ANGLES: [
            15, -15, 30, -30, 45, -45,
            60, -60, 75, -75, 90, -90,
            105, -105, 120, -120, 135, -135,
            150, -150, 165, -165, 180
        ].map(deg => deg * Math.PI / 180),

        // Smooth turn rate (radians per second)
        // Controls how quickly currentHeading interpolates toward target
        // Increased to 1.5 (~86 deg/s) for snappier response
        NPC_TURN_SMOOTHING: 1.5, // ~86 degrees per second

        // How often to update navigation (in ticks)
        // 1 = every tick (most responsive)
        // Higher values reduce CPU cost but may miss obstacles
        NAV_UPDATE_INTERVAL: 1,

        // Minimum forward progress threshold (dot product)
        // Alternative headings must make at least this much progress toward target
        // -1.0 = allow any direction (including backwards)
        // 0.0 = perpendicular allowed, 1.0 = only forward
        // Currently set to -1.0 to allow NPCs to take longer routes around obstacles
        MIN_PROGRESS_DOT: -1.0,

        // Debug logging for navigation (disable in production)
        DEBUG_NAVIGATION: false
    },

    // ========================================
    // ECONOMY: Trading and cargo system
    // ========================================
    ECONOMY: {
        // Transaction limits
        MAX_TRANSACTION_QUANTITY: 100,  // Prevent exploits

        // Base Prices (Standard value of goods)
        // Used to derive regional prices based on supply/demand tiers
        BASE_PRICES: {
            FOOD: 5,
            WOOD: 10,
            CLOTH: 15,
            SUGAR: 30,
            RUM: 50,
            TOBACCO: 80,
            CONTRABAND: 200
        },

        // Trade Tiers (Supply/Demand multipliers)
        // Applied to Base Price to determine the Harbor's Buy Price (Player buys from harbor)
        TRADE_TIERS: {
            EXPORT: 0.6,    // High supply, cheap to buy
            STANDARD: 1.0,  // Normal supply, standard price
            IMPORT: 1.4     // High demand, expensive to buy
        },

        // Harbor Margins
        // Determines sell price relative to buy price (Player sells to harbor)
        // Sell Price = Buy Price * MARGIN
        // Ensures player always loses money if buying and selling in same harbor
        HARBOR_SELL_MARGIN: 0.75,

        // Local Price Variation
        // Deterministic variation per harbor to add flavor
        // Applied after all other calculations
        PRICE_VARIATION: 0.05 // ±5%
    },

    // ========================================
    // WRECKS: Ship wreck system
    // ========================================
    WRECKS: {
        DURATION_SECONDS: 120,    // Wrecks disappear after 2 minutes
        OWNER_LOOT_DURATION: 30,  // Only killer can loot for first 30s
        BASE_GOLD_MIN: 10,        // Minimum gold from wreck
        BASE_GOLD_MAX: 50,        // Maximum gold from wreck
        CARGO_SALVAGE_PERCENT: 0.3, // 30% of cargo is recoverable
        MIN_CLOTH: 1,             // Always drop at least 1 cloth (sails)
        MIN_WOOD: 2               // Always drop at least 2 wood (hull)
    }
};

module.exports = GameConfig;
