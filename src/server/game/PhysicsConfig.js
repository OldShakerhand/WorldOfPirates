/**
 * Physics Configuration - Movement and physics constants
 * Centralized for consistent game feel
 */

const PhysicsConfig = {
    // Acceleration/Deceleration
    ACCELERATION: 0.5,
    DECELERATION: 0.3,

    // Sail change
    SAIL_CHANGE_COOLDOWN: 1.0, // Seconds

    // Speed modifiers
    SHALLOW_WATER_SPEED_MULTIPLIER: 0.75, // 25% reduction

    // Raft (fallback ship)
    RAFT_SPEED: 75, // 1.5x Sloop base speed (50)
    RAFT_TURN_SPEED: 1.5,

    // Fleet penalties
    FLEET_SPEED_PENALTY_PER_SHIP: 0.05, // 5% per additional ship
    MAX_FLEET_SPEED_PENALTY: 0.50, // Maximum 50% penalty

    // Wind
    WIND_CHANGE_INTERVAL_MIN: 30, // Seconds
    WIND_CHANGE_INTERVAL_MAX: 60, // Seconds
    WIND_CHANGE_RATE: 0.5, // Radians per second

    // Ship collision
    SHIP_COLLISION_RADIUS: 15,

    // Knots conversion
    SPEED_TO_KNOTS_MULTIPLIER: 0.5
};

module.exports = PhysicsConfig;
