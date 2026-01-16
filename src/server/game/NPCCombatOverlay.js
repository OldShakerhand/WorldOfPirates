/**
 * NPCCombatOverlay.js - Combat capability overlay for NPCs
 * 
 * Combat is a CAPABILITY, not a role. It can be activated situationally
 * based on intent and role parameters.
 * 
 * This overlay:
 * - Activates/deactivates combat based on situation
 * - Supports both aggressive (pirates) and defensive (traders) modes
 * - Calls existing combat methods in NPCShip
 * - Contains combat-related configuration constants
 */

const CombatConfig = require('./CombatConfig');

/**
 * Combat configuration constants
 * Controls combat positioning, targeting, and firing behavior for NPCs.
 */
const NPCCombatConfig = {
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

    // Defensive combat range
    MAX_DEFENSIVE_RANGE: 400,  // Stop defending if attacker leaves range (pixels)

    // Positioning behavior
    POSITION_THRESHOLD: 50,  // Distance to switch from movement to rotation (pixels)

    // Safety
    MAX_LAND_PROXIMITY_COUNT: 5,  // Despawn if forced away from land this many times

    // Debug logging for combat (disable in production)
    DEBUG_COMBAT: false
};

class NPCCombatOverlay {
    constructor(npc) {
        this.npc = npc;
        this.active = false;
        this.target = null;
        this.defensiveMode = false;  // If true, don't pursue targets
    }

    /**
     * Activate combat for this NPC
     * @param {string} targetId - Entity ID to target
     * @param {boolean} defensive - If true, only return fire (don't pursue)
     * @returns {boolean} True if combat was newly activated
     */
    activate(targetId, defensive = false) {
        if (!this.npc.role.combatCapable) {
            return false;
        }

        // If already active with same target, don't re-activate
        if (this.active && this.target === targetId) {
            return false;
        }

        this.active = true;
        this.target = targetId;
        this.defensiveMode = defensive;

        // Update NPC's combat target for existing combat methods
        this.npc.combatTarget = targetId;

        return true;
    }

    /**
     * Deactivate combat
     */
    deactivate() {
        this.active = false;
        this.target = null;
        this.defensiveMode = false;
        this.npc.combatTarget = null;
    }

    /**
     * Check if combat should remain active
     * @param {Object} world - World instance
     * @returns {boolean} True if combat should stay active
     */
    shouldStayActive(world) {
        if (!this.active) return false;

        const target = world.entities[this.target];

        // Deactivate if target is gone
        if (!target) {
            return false;
        }

        // Deactivate if target entered harbor
        if (target.inHarbor) {
            return false;
        }

        // Deactivate if target is a raft (invalid target)
        if (target.isRaft) {
            return false;
        }

        // In defensive mode, deactivate if target is too far
        if (this.defensiveMode) {
            const dist = Math.hypot(target.x - this.npc.x, target.y - this.npc.y);

            if (dist > NPCCombatConfig.MAX_DEFENSIVE_RANGE) {
                return false;
            }
        }

        return true;
    }

    /**
     * Update combat overlay
     * Called each frame to manage combat state
     * @param {Object} world - World instance
     */
    update(world) {
        if (!this.active) return;

        // Check if combat should stay active
        if (!this.shouldStayActive(world)) {
            this.deactivate();
        }
    }
}

// Export both the class and config
NPCCombatOverlay.Config = NPCCombatConfig;
module.exports = NPCCombatOverlay;
