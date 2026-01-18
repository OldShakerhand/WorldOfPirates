/**
 * RewardConfig.js - Centralized reward definitions
 * 
 * DESIGN PRINCIPLE: Single source of truth for all rewards
 * - Semantic keys (not magic numbers)
 * - Easy to balance and tweak
 * - Extensible for future reward types
 * 
 * FUTURE: Can be migrated to JSON/database for live balancing
 */

const REWARDS = {
    // Mission Rewards
    MISSION: {
        SAIL_TO_HARBOR: {
            gold: 100,
            xp: 50,
            description: 'Simple delivery mission'
        },
        STAY_IN_AREA: {
            gold: 150,
            xp: 75,
            description: 'Patrol/guard mission'
        },
        DEFEAT_NPCS: {
            gold: 200,
            xp: 100,
            description: 'Combat mission'
        },
        ESCORT: {
            gold: 300,
            xp: 150,
            description: 'Complex escort mission'
        }
    },

    // Combat Rewards (immediate on kill)
    COMBAT: {
        PIRATE_SUNK: {
            gold: 50,
            xp: 25,
            description: 'Defeated hostile pirate'
        },
        TRADER_SUNK: {
            gold: 0,
            xp: 0,
            description: 'Sank peaceful trader (no reward, future reputation penalty)'
            // FUTURE: Add reputation penalty when reputation system is implemented
        }
        // FUTURE: Different pirate tiers, boss ships, faction-specific rewards
    }

    // FUTURE: Event rewards
    // EVENT: {
    //     HARBOR_DISCOVERED: { gold: 0, xp: 10 },
    //     LONG_VOYAGE: { gold: 0, xp: 5 }
    // }

    // FUTURE: Achievement rewards
    // ACHIEVEMENT: {
    //     FIRST_KILL: { gold: 100, xp: 50 }
    // }
};

/**
 * Get reward definition by key
 * @param {string} rewardKey - Dot-notation key (e.g., "MISSION.ESCORT")
 * @returns {Object|null} Reward definition or null if not found
 */
function getReward(rewardKey) {
    const parts = rewardKey.split('.');
    let current = REWARDS;

    for (const part of parts) {
        if (!current[part]) {
            console.warn(`[RewardConfig] Unknown reward key: ${rewardKey}`);
            return null;
        }
        current = current[part];
    }

    return current;
}

/**
 * Validate reward key exists
 * @param {string} rewardKey - Key to validate
 * @returns {boolean} True if key exists
 */
function hasReward(rewardKey) {
    return getReward(rewardKey) !== null;
}

module.exports = {
    REWARDS,
    getReward,
    hasReward
};
