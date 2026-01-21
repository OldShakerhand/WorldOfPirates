const { getGood } = require('./Goods');

/**
 * FleetCargo - Fleet-level cargo management
 * 
 * DESIGN PRINCIPLE: Cargo is stored at the fleet level, not per-ship.
 * - Total capacity = sum of all ships' cargoHold values
 * - Goods are stored as fleet-level inventory
 * - Flagship switching does NOT affect cargo capacity
 * 
 * Phase 0 constraints:
 * - No per-ship cargo distribution
 * - No speed penalties for cargo weight
 * - Only aggregate fleet capacity
 */
class FleetCargo {
    constructor(fleet) {
        this.fleet = fleet;
        this.goods = {};  // { goodId: quantity }
    }

    /**
     * Get total fleet cargo capacity
     * @returns {number} Total cargo capacity (sum of all ships' cargoHold)
     */
    getTotalCapacity() {
        return this.fleet.reduce((sum, ship) =>
            sum + ship.shipClass.cargoHold, 0);
    }

    /**
     * Get current cargo space used
     * @returns {number} Total space used by all goods
     */
    getUsedSpace() {
        let used = 0;
        for (const [goodId, quantity] of Object.entries(this.goods)) {
            const good = getGood(goodId);
            if (good) {
                used += good.space * quantity;
            }
        }
        return used;
    }

    /**
     * Get available cargo space
     * @returns {number} Available space (may be negative if over capacity)
     */
    getAvailableSpace() {
        return this.getTotalCapacity() - this.getUsedSpace();
    }

    /**
     * Check if cargo can fit
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to add
     * @returns {boolean} True if cargo can fit
     */
    canFit(goodId, quantity) {
        const good = getGood(goodId);
        if (!good) return false;

        const spaceNeeded = good.space * quantity;
        return this.getAvailableSpace() >= spaceNeeded;
    }

    /**
     * Add goods to cargo
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to add
     * @returns {boolean} True if successful, false if insufficient space
     */
    addGood(goodId, quantity) {
        if (!this.canFit(goodId, quantity)) return false;

        this.goods[goodId] = (this.goods[goodId] || 0) + quantity;
        return true;
    }

    /**
     * Remove goods from cargo
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to remove
     * @returns {boolean} True if successful, false if insufficient quantity
     */
    removeGood(goodId, quantity) {
        const current = this.goods[goodId] || 0;
        if (current < quantity) return false;

        this.goods[goodId] = current - quantity;
        if (this.goods[goodId] === 0) {
            delete this.goods[goodId];
        }
        return true;
    }

    /**
     * Get cargo quantity for a good
     * @param {string} goodId - Good ID
     * @returns {number} Quantity in cargo (0 if not present)
     */
    getQuantity(goodId) {
        return this.goods[goodId] || 0;
    }

    /**
     * Serialize for client
     * @returns {Object} Cargo state for client
     */
    serialize() {
        return {
            goods: this.goods,
            total: this.getTotalCapacity(),
            used: this.getUsedSpace(),
            available: this.getAvailableSpace()
        };
    }
}

module.exports = FleetCargo;
