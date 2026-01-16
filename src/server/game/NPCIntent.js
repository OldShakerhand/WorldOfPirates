/**
 * NPCIntent.js - Intent constants for NPCs
 * 
 * Intent describes WHY an NPC is acting, not HOW.
 * It's the current objective that drives behavior selection.
 */

const NPCIntent = {
    TRAVEL: 'TRAVEL',         // Navigate to destination (traders, patrols)
    ENGAGE: 'ENGAGE',         // Pursue and attack target (pirates)
    EVADE: 'EVADE',           // Flee from threat (damaged NPCs)
    WAIT: 'WAIT',             // Stopped at harbor/waypoint
    DESPAWNING: 'DESPAWNING'  // Cleanup
};

module.exports = NPCIntent;
