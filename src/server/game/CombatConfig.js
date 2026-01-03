/**
 * Combat Configuration - All combat-related constants
 * Centralized for easy game balancing
 */

const CombatConfig = {
    // Fire rates
    CANNON_FIRE_RATE: 4.0,// Seconds between shots
    CANNON_SPREAD: 0.05,// Radians between dual cannons

    // Damage
    PROJECTILE_DAMAGE: 5,
    COLLISION_DAMAGE_THRESHOLD: 20,// Speed threshold for collision damage
    COLLISION_DAMAGE_MULTIPLIER: 0.2,// Damage = (speed - threshold) * multiplier

    // Shield/Invulnerability
    FLAGSHIP_SWITCH_SHIELD_DURATION: 10,// Seconds after losing flagship
    HARBOR_EXIT_SHIELD_DURATION: 10,// Seconds after leaving harbor

    // Projectile physics
    PROJECTILE_SPEED: 150,
    PROJECTILE_MAX_DISTANCE: 400, // Pixels (explicit range)
    PROJECTILE_GRAVITY: 50,
    PROJECTILE_INITIAL_Z: 20,

    // Arcade-style firing
    VELOCITY_COMPENSATION_FACTOR: 0.7, // 0.0 = no compensation, 1.0 = full compensation

    // Visual
    PROJECTILE_BALL_RADIUS: 2, // Visual size of the cannonball
    PROJECTILE_SHADOW_RADIUS: 1, // Visual size of the shadow
    PROJECTILE_COLLISION_MULTIPLIER: 1.2 // Collision radius = ball radius * multiplier
};

module.exports = CombatConfig;
