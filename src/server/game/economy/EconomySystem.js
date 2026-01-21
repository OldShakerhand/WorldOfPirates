const GameConfig = require('../config/GameConfig');
const { getGood } = require('../entities/Goods');

/**
 * EconomySystem - Harbor Master
 * 
 * Server-authoritative trade validation and execution.
 * 
 * DESIGN PRINCIPLE: Harbor Master mental model
 * - Player initiates trade requests
 * - EconomySystem validates and executes transactions
 * - Player does NOT contain pricing or trade logic
 * 
 * Responsibilities:
 * - Validate docking state
 * - Validate goods availability
 * - Validate prices (from harbor trade profiles)
 * - Validate fleet cargo capacity
 * - Execute atomic buy/sell transactions
 */
class EconomySystem {
    constructor(harborRegistry) {
        this.harborRegistry = harborRegistry;
    }

    /**
     * Execute a buy transaction (player buys from harbor)
     * @param {Object} player - Player entity
     * @param {string} harborId - Harbor ID
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to buy
     * @returns {Object} { success, message, goldSpent?, cargoAdded? }
     */
    buyGood(player, harborId, goodId, quantity) {
        // Validation: Player must be docked at this harbor
        if (!player.inHarbor || player.dockedHarborId !== harborId) {
            return {
                success: false,
                message: 'You must be docked at this harbor to trade.'
            };
        }

        // Validation: Good must exist
        const good = getGood(goodId);
        if (!good) {
            return {
                success: false,
                message: 'Invalid good.'
            };
        }

        // Validation: Good must be tradeable (not MISSION_ONLY)
        if (good.tags && good.tags.includes('MISSION_ONLY')) {
            return {
                success: false,
                message: 'This good is not available for trade.'
            };
        }

        // Validation: Good must support TRADE intent
        if (!good.intents.includes('TRADE')) {
            return {
                success: false,
                message: 'This good cannot be traded.'
            };
        }

        // Validation: Quantity must be positive and within limits
        if (quantity <= 0 || quantity > GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY) {
            return {
                success: false,
                message: 'Invalid quantity.'
            };
        }

        // Get harbor economy data (resolved from trade profile)
        const harborEconomy = this.harborRegistry.getHarborEconomy(harborId);
        if (!harborEconomy) {
            return {
                success: false,
                message: 'This harbor does not support trade.'
            };
        }

        // Validation: Harbor must sell this good
        const harborGood = harborEconomy.goods.find(g => g.id === goodId);
        if (!harborGood || !harborGood.buyPrice) {
            return {
                success: false,
                message: 'This harbor does not sell this good.'
            };
        }

        // Calculate cost
        const totalCost = harborGood.buyPrice * quantity;

        // Validation: Player must have enough gold
        if (player.gold < totalCost) {
            return {
                success: false,
                message: `Insufficient gold. Need ${totalCost}, have ${player.gold}.`
            };
        }

        // Validation: Fleet must have cargo space
        if (!player.fleetCargo.canFit(goodId, quantity)) {
            const spaceNeeded = good.space * quantity;
            const spaceAvailable = player.fleetCargo.getAvailableSpace();
            return {
                success: false,
                message: `Insufficient cargo space. Need ${spaceNeeded}, have ${spaceAvailable}.`
            };
        }

        // Execute transaction (atomic)
        player.removeGold(totalCost);
        player.fleetCargo.addGood(goodId, quantity);

        return {
            success: true,
            message: `Bought ${quantity} ${good.name} for ${totalCost} gold.`,
            goldSpent: totalCost,
            cargoAdded: { goodId, quantity }
        };
    }

    /**
     * Execute a sell transaction (player sells to harbor)
     * @param {Object} player - Player entity
     * @param {string} harborId - Harbor ID
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to sell
     * @returns {Object} { success, message, goldEarned?, cargoRemoved? }
     */
    sellGood(player, harborId, goodId, quantity) {
        // Validation: Player must be docked at this harbor
        if (!player.inHarbor || player.dockedHarborId !== harborId) {
            return {
                success: false,
                message: 'You must be docked at this harbor to trade.'
            };
        }

        // Validation: Good must exist
        const good = getGood(goodId);
        if (!good) {
            return {
                success: false,
                message: 'Invalid good.'
            };
        }

        // Validation: Quantity must be positive and within limits
        if (quantity <= 0 || quantity > GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY) {
            return {
                success: false,
                message: 'Invalid quantity.'
            };
        }

        // Validation: Player must have the goods
        if (player.fleetCargo.getQuantity(goodId) < quantity) {
            return {
                success: false,
                message: `You don't have enough ${good.name}.`
            };
        }

        // Get harbor economy data (resolved from trade profile)
        const harborEconomy = this.harborRegistry.getHarborEconomy(harborId);
        if (!harborEconomy) {
            return {
                success: false,
                message: 'This harbor does not support trade.'
            };
        }

        // Validation: Harbor must buy this good
        const harborGood = harborEconomy.goods.find(g => g.id === goodId);
        if (!harborGood || !harborGood.sellPrice) {
            return {
                success: false,
                message: 'This harbor does not buy this good.'
            };
        }

        // Calculate revenue
        const totalRevenue = harborGood.sellPrice * quantity;

        // Execute transaction (atomic)
        player.fleetCargo.removeGood(goodId, quantity);
        player.addGold(totalRevenue);

        return {
            success: true,
            message: `Sold ${quantity} ${good.name} for ${totalRevenue} gold.`,
            goldEarned: totalRevenue,
            cargoRemoved: { goodId, quantity }
        };
    }
}

module.exports = EconomySystem;
