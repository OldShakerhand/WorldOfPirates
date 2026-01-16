/**
 * CombatOverlay.js - Combat capability overlay for NPCs
 * 
 * Combat is a CAPABILITY, not a role. It can be activated situationally
 * based on intent and role parameters.
 * 
 * This overlay:
 * - Activates/deactivates combat based on situation
 * - Supports both aggressive (pirates) and defensive (traders) modes
 * - Calls existing combat methods in NPCShip
 */

class CombatOverlay {
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
     * @returns {boolean} True if combat was activated
     */
    activate(targetId, defensive = false) {
        if (!this.npc.role.combatCapable) {
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
            const MAX_DEFENSIVE_RANGE = 400; // Stop defending if attacker leaves range

            if (dist > MAX_DEFENSIVE_RANGE) {
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

module.exports = CombatOverlay;
