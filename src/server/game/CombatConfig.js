/**
 * Combat Configuration - All combat-related constants
 * Centralized for easy game balancing
 */

const CombatConfig = {
    // Fire rates
    CANNON_FIRE_RATE: 2.0, // Seconds between shots
    CANNON_SPREAD: 0.1, // Radians between dual cannons

    // Damage
    PROJECTILE_DAMAGE: 10,
    COLLISION_DAMAGE_THRESHOLD: 20, // Speed threshold for collision damage
    COLLISION_DAMAGE_MULTIPLIER: 0.5, // Damage = (speed - threshold) * multiplier

    // Shield/Invulnerability
    FLAGSHIP_SWITCH_SHIELD_DURATION: 3, // Seconds after losing flagship
    HARBOR_EXIT_SHIELD_DURATION: 6, // Seconds after leaving harbor

    // Projectile physics
    PROJECTILE_SPEED: 200,
    PROJECTILE_LIFETIME: 5, // Seconds
    PROJECTILE_GRAVITY: 50,
    PROJECTILE_INITIAL_Z: 20,

    // Visual
    PROJECTILE_RADIUS: 3,
    PROJECTILE_SHADOW_RADIUS: 2
};

module.exports = CombatConfig;
