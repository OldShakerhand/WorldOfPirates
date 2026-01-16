/**
 * CombatNPCConfig - Combat NPC behavior parameters
 * 
 * Controls combat positioning, targeting, and firing behavior for hostile NPCs.
 * All distances are derived from CombatConfig to avoid magic numbers.
 */

const CombatConfig = require('./CombatConfig');

module.exports = {
    // Combat positioning (derived from projectile range)
    COMBAT_DISTANCE_FACTOR: 0.8,    // Percentage of max projectile range (80% = 200px)
    COMBAT_DISTANCE_TOLERANCE: 30,  // Acceptable variance (pixels)

    // Computed combat distance (do not modify)
    get COMBAT_DISTANCE() {
        return CombatConfig.PROJECTILE_MAX_DISTANCE * this.COMBAT_DISTANCE_FACTOR;
    },

    // Broadside preference
    DEFAULT_COMBAT_SIDE: 'PORT',    // 'PORT' or 'STARBOARD'

    // Target selection (derived from projectile range)
    MAX_ENGAGEMENT_RANGE_FACTOR: 2.0,  // Multiple of max projectile range (2x = 500px)

    get MAX_ENGAGEMENT_RANGE() {
        return CombatConfig.PROJECTILE_MAX_DISTANCE * this.MAX_ENGAGEMENT_RANGE_FACTOR;
    },

    // Positioning behavior
    POSITION_THRESHOLD: 50,  // Distance to switch from movement to rotation (pixels)

    // Safety
    MAX_LAND_PROXIMITY_COUNT: 5,  // Despawn if forced away from land this many times

    // Debug logging for combat (disable in production)
    DEBUG_COMBAT: false
};
