/**
 * Combat Configuration - All combat-related constants
 * Centralized for easy game balancing
 */

const CombatConfig = {
    // Fire rates
    CANNON_FIRE_RATE: 4.0,// Seconds between shots
    CANNON_SPREAD: 0.05,// Radians between dual cannons

    // Damage
    PROJECTILE_DAMAGE: 10,
    COLLISION_DAMAGE_THRESHOLD: 20,// Speed threshold for collision damage
    COLLISION_DAMAGE_MULTIPLIER: 0.2,// Damage = (speed - threshold) * multiplier

    // Shield/Invulnerability
    FLAGSHIP_SWITCH_SHIELD_DURATION: 10,// Seconds after losing flagship
    HARBOR_EXIT_SHIELD_DURATION: 10,// Seconds after leaving harbor (no firing allowed)

    // Projectile physics
    PROJECTILE_SPEED: 120,
    PROJECTILE_MAX_DISTANCE: 250, // Pixels (explicit range)
    PROJECTILE_INITIAL_Z: 15,      // Starting height above water
    PROJECTILE_INITIAL_Z_SPEED: 10, // Initial upward velocity
    // NOTE: Gravity is calculated dynamically in Projectile.js to ensure
    // projectile reaches water exactly at PROJECTILE_MAX_DISTANCE

    // Visual
    PROJECTILE_BALL_RADIUS: 2, // Visual size of the cannonball
    PROJECTILE_SHADOW_RADIUS: 1, // Visual size of the shadow
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
};

module.exports = CombatConfig;
