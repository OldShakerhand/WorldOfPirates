/**
 * Physics Configuration - Movement and physics constants
 * Centralized for consistent game feel
 */

const PhysicsConfig = {
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
};

module.exports = PhysicsConfig;
