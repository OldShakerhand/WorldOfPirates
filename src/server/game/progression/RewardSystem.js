/**
 * RewardSystem.js - Centralized reward application
 * 
 * RESPONSIBILITY: Apply rewards to players
 * - Looks up reward values from RewardConfig
 * - Applies gold/XP to player
 * - Logs reward events
 * - Server-authoritative
 * 
 * FUTURE: Can track reward history, apply multipliers, etc.
 */

const { getReward } = require('./RewardConfig');

class RewardSystem {
    constructor(world) {
        this.world = world;

        // FUTURE: Reward history tracking
        // this.rewardHistory = new Map(); // playerId -> [rewards]
    }

    /**
     * Grant reward to player
     * @param {string} playerId - Player ID
     * @param {string} rewardKey - Reward key (e.g., "MISSION.ESCORT")
     * @param {Object} context - Optional context for logging
     */
    grant(playerId, rewardKey, context = {}) {
        const player = this.world.getEntity(playerId);
        if (!player) {
            console.warn(`[RewardSystem] Cannot grant reward: player ${playerId} not found`);
            return;
        }

        const reward = getReward(rewardKey);
        if (!reward) {
            console.error(`[RewardSystem] Cannot grant reward: unknown key ${rewardKey}`);
            return;
        }

        // Apply gold
        if (reward.gold > 0) {
            player.addGold(reward.gold);

            // Notify client of gold update
            if (player.io) {
                // Update state
                player.io.to(player.id).emit('playerStateUpdate', {
                    gold: player.gold
                });

                // Show notification
                player.io.to(player.id).emit('transactionResult', {
                    success: true,
                    message: `Mission Reward: ${reward.gold} gold!`
                });
            }
        }

        // Apply XP
        if (reward.xp > 0) {
            player.addXP(reward.xp);
        }

        // Log reward event
        const contextStr = context.source ? ` (${context.source})` : '';
        console.log(`[RewardSystem] ${player.name} earned ${rewardKey}${contextStr}: ${reward.gold}g, ${reward.xp} XP`);

        // FUTURE: Track reward history
        // if (!this.rewardHistory.has(playerId)) {
        //     this.rewardHistory.set(playerId, []);
        // }
        // this.rewardHistory.get(playerId).push({
        //     key: rewardKey,
        //     timestamp: Date.now(),
        //     context
        // });
    }

    /**
     * Grant multiple rewards at once
     * @param {string} playerId - Player ID
     * @param {string[]} rewardKeys - Array of reward keys
     * @param {Object} context - Optional context
     */
    grantMultiple(playerId, rewardKeys, context = {}) {
        for (const key of rewardKeys) {
            this.grant(playerId, key, context);
        }
    }

    // FUTURE: Multiplier system
    // applyMultiplier(playerId, multiplier) { ... }

    // FUTURE: Reward preview (for UI)
    // getRewardPreview(rewardKey) { ... }
}

module.exports = RewardSystem;
