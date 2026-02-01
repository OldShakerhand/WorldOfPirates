/**
 * Wreck.js - Represents a sunken ship with loot
 */

const GameConfig = require('../config/GameConfig');

class Wreck {
    constructor(id, x, y, ownerId, cargo = {}) {
        this.id = id;
        this.type = 'WRECK';
        this.x = x;
        this.y = y;
        this.rotation = Math.random() * Math.PI * 2; // Random rotation for visuals

        this.spawnTime = Date.now();
        this.despawnTime = this.spawnTime + (GameConfig.WRECKS.DURATION_SECONDS * 1000);

        this.ownerId = ownerId; // Player who sunk the ship (gets first dibs)
        this.ownerLootExpireTime = this.spawnTime + (GameConfig.WRECKS.OWNER_LOOT_DURATION * 1000);

        this.toRemove = false;

        // Generate loot
        this.loot = this.generateLoot(cargo);
    }

    generateLoot(sourceCargo) {
        const loot = {
            gold: Math.floor(Math.random() * (GameConfig.WRECKS.BASE_GOLD_MAX - GameConfig.WRECKS.BASE_GOLD_MIN + 1)) + GameConfig.WRECKS.BASE_GOLD_MIN,
            cargo: {}
        };

        // Always add some wood and cloth (from ship materials)
        loot.cargo.WOOD = Math.floor(Math.random() * 3) + GameConfig.WRECKS.MIN_WOOD;
        loot.cargo.CLOTH = Math.floor(Math.random() * 2) + GameConfig.WRECKS.MIN_CLOTH;

        // Salvage percentage of existing cargo
        if (sourceCargo && sourceCargo.goods) {
            for (const [goodId, amount] of Object.entries(sourceCargo.goods)) {
                const salvagedAmount = Math.floor(amount * GameConfig.WRECKS.CARGO_SALVAGE_PERCENT);
                if (salvagedAmount > 0) {
                    loot.cargo[goodId] = (loot.cargo[goodId] || 0) + salvagedAmount;
                }
            }
        }

        return loot;
    }

    update() {
        if (Date.now() >= this.despawnTime) {
            this.toRemove = true;
        }
    }

    canLoot(playerId) {
        // If owner loot time hasn't expired, only owner can loot
        if (Date.now() < this.ownerLootExpireTime) {
            if (playerId !== this.ownerId) {
                return false;
            }
        }
        return true;
    }

    serialize() {
        return {
            id: this.id,
            type: 'WRECK',
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            isOwnerLoot: Date.now() < this.ownerLootExpireTime,
            ownerId: this.ownerId
        };
    }
}

module.exports = Wreck;
