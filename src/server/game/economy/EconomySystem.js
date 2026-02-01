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

        // Validation: Quantity must be positive and within limits (unless -1 for "Buy Max")
        let finalQuantity = quantity;

        if (quantity === -1) {
            // "Buy Max" Logic
            const harborEconomy = this.harborRegistry.getHarborEconomy(harborId);
            if (!harborEconomy) return { success: false, message: 'Harbor has no economy.' };

            const harborGood = harborEconomy.goods.find(g => g.id === goodId);
            if (!harborGood || !harborGood.buyPrice) return { success: false, message: 'Good not sold here.' };

            // 1. Calculate max affordable
            const maxAffordable = Math.floor(player.gold / harborGood.buyPrice);

            // 2. Calculate max cargo space
            // We need to know specific space per unit. Look up good config.
            const good = getGood(goodId);
            const spacePerUnit = good.space || 1;
            const spaceAvailable = player.fleetCargo.getAvailableSpace();
            const maxStorable = Math.floor(spaceAvailable / spacePerUnit);

            // 3. Apply transaction limit
            const limit = GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY;

            finalQuantity = Math.min(maxAffordable, maxStorable, limit); // Cap at 100 for now

            if (finalQuantity <= 0) {
                return {
                    success: false,
                    message: maxAffordable === 0 ? 'Not enough gold.' : 'Not enough cargo space.'
                };
            }
        } else if (quantity <= 0 || quantity > GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY) {
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
        const totalCost = harborGood.buyPrice * finalQuantity;

        // Validation: Player must have enough gold
        if (player.gold < totalCost) {
            return {
                success: false,
                message: `Insufficient gold. Need ${totalCost}, have ${player.gold}.`
            };
        }

        // Validation: Fleet must have cargo space
        if (!player.fleetCargo.canFit(goodId, finalQuantity)) {
            const spaceNeeded = good.space * finalQuantity;
            const spaceAvailable = player.fleetCargo.getAvailableSpace();
            return {
                success: false,
                message: `Insufficient cargo space. Need ${spaceNeeded}, have ${spaceAvailable}.`
            };
        }

        // Execute transaction (atomic)
        player.removeGold(totalCost);
        player.fleetCargo.addGood(goodId, finalQuantity);

        return {
            success: true,
            message: `Bought ${finalQuantity} ${good.name} for ${totalCost} gold.`,
            goldSpent: totalCost,
            cargoAdded: { goodId, quantity: finalQuantity }
        };
    }

    /**
     * Execute a sell transaction (player sells to harbor)
     * @param {Object} player - Player entity
     * @param {string} harborId - Harbor ID
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to sell (or -1 for Sell All)
     * @returns {Object} { success, message, goldEarned?, cargoRemoved? }
     */
    sellGood(player, harborId, goodId, quantity) {
        console.log(`[EconomySystem] sellGood called - Player: ${player.id}, Good: ${goodId}, Quantity: ${quantity}`);
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
            console.log(`[EconomySystem] Invalid good: ${goodId}`);
            return {
                success: false,
                message: 'Invalid good.'
            };
        }

        // Determine quantity
        let finalQuantity = quantity;

        if (quantity === -1) {
            // "Sell All" Logic
            const currentStock = player.fleetCargo.getQuantity(goodId);
            const limit = GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY;

            finalQuantity = Math.min(currentStock, limit);
            console.log(`[EconomySystem] Sell All - Current stock: ${currentStock}, Final quantity: ${finalQuantity}`);

            if (finalQuantity <= 0) {
                console.log(`[EconomySystem] No stock to sell for ${goodId}`);
                return {
                    success: false,
                    message: "You don't have any of this good."
                };
            }
        } else if (quantity <= 0 || quantity > GameConfig.ECONOMY.MAX_TRANSACTION_QUANTITY) {
            console.log(`[EconomySystem] Invalid quantity: ${quantity}`);
            return {
                success: false,
                message: 'Invalid quantity.'
            };
        }

        // Validation: Player must have the goods
        if (player.fleetCargo.getQuantity(goodId) < finalQuantity) {
            console.log(`[EconomySystem] Insufficient stock - Has: ${player.fleetCargo.getQuantity(goodId)}, Needs: ${finalQuantity}`);
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
        const totalRevenue = harborGood.sellPrice * finalQuantity;

        // Execute transaction (atomic)
        player.fleetCargo.removeGood(goodId, finalQuantity);
        player.addGold(totalRevenue);

        return {
            success: true,
            message: `Sold ${finalQuantity} ${good.name} for ${totalRevenue} gold.`,
            goldEarned: totalRevenue,
            cargoRemoved: { goodId, quantity: finalQuantity }
        };
    }
}

module.exports = EconomySystem;
