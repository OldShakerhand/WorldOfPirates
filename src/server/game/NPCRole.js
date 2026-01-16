/**
 * NPCRole.js - Role definitions for NPCs
 * 
 * Roles are parameter sets that define NPC identity and behavior tendencies.
 * They are NOT separate code paths - all NPCs use the same systems.
 * 
 * Role defines:
 * - Ship class preferences
 * - Behavioral parameters (aggression, flee threshold)
 * - Default intent
 * - Combat capability flags
 */

const NPCRoles = {
    TRADER: {
        name: 'Trader',
        description: 'Peaceful merchant traveling between harbors',

        // Ship preferences (TODO: Add MERCHANT when assets available)
        shipClasses: ['FLUYT'],

        // Behavior parameters
        defaultIntent: 'TRAVEL',
        combatCapable: true,       // Can defend themselves
        combatAggressive: false,   // Won't pursue targets
        fleeThreshold: 0.5,        // Flee at 50% HP
        engagementRange: 0,        // Don't initiate combat

        // Visual (future)
        namePrefix: '',
        flagColor: null
    },

    PIRATE: {
        name: 'Pirate',
        description: 'Hostile NPC that actively engages players',

        // Ship preferences (TODO: Add SLOOP, BARQUE, FRIGATE when assets available)
        shipClasses: ['FLUYT'],

        // Behavior parameters
        defaultIntent: 'ENGAGE',
        combatCapable: true,
        combatAggressive: true,    // Always hostile
        fleeThreshold: 0.2,        // Flee at 20% HP
        engagementRange: 500,      // Existing combat range

        // Visual (future)
        namePrefix: '☠️ ',
        flagColor: '#8B0000'       // Dark red
    },

    PATROL: {
        name: 'Patrol',
        description: 'Defensive NPC that guards trade routes',

        // Ship preferences (TODO: Add FRIGATE, WAR_GALLEON when assets available)
        shipClasses: ['FLUYT'],

        // Behavior parameters
        defaultIntent: 'TRAVEL',
        combatCapable: true,
        combatAggressive: false,   // Defensive only
        fleeThreshold: 0.3,        // Flee at 30% HP
        engagementRange: 0,        // Don't initiate combat

        // Visual (future)
        namePrefix: '⚓ ',
        flagColor: '#000080'       // Navy blue
    }
};

/**
 * Get role configuration by name
 * @param {string} roleName - Role name (TRADER, PIRATE, PATROL)
 * @returns {Object} Role configuration
 */
function getRole(roleName) {
    const role = NPCRoles[roleName];
    if (!role) {
        console.warn(`[NPCRole] Invalid role: ${roleName}, defaulting to TRADER`);
        return NPCRoles.TRADER;
    }
    return role;
}

/**
 * Get random ship class for a role
 * @param {string} roleName - Role name
 * @returns {string} Ship class name
 */
function getRandomShipClass(roleName) {
    const role = getRole(roleName);
    const classes = role.shipClasses;
    return classes[Math.floor(Math.random() * classes.length)];
}

module.exports = {
    NPCRoles,
    getRole,
    getRandomShipClass
};
