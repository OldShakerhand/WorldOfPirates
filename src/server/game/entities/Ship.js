/**
 * Ship - represents a single ship in a player's fleet
 */
class Ship {
    constructor(shipClassName, isNew = true) {
        const GameConfig = require('../config/GameConfig');
        const { COMBAT } = GameConfig;
        const { getShipClass } = require('./ShipClass');
        this.shipClass = getShipClass(shipClassName);
        this.health = this.shipClass.health;
        this.maxHealth = this.shipClass.health;
        this.sailIntegrity = 100;
        this.crew = this.shipClass.defaultCrew || 20;
        this.ammoType = COMBAT.AMMO_TYPES.CANNON_SHOT;
        this.isSunk = false;

        // For later: cargo, upgrades, etc.
    }

    get hullHP() {
        return this.health;
    }

    get crewCount() {
        return this.crew;
    }

    get maxCrewCount() {
        return this.shipClass.defaultCrew || 20;
    }

    getSailSpeedMultiplier() {
        return 0.5 + (this.sailIntegrity / 100) * 0.5;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isSunk = true;
        }
    }

    takeSplitDamage(amount, damageProfile, options = {}) {
        const { applyCrewDamage = true } = options;

        if (!damageProfile) {
            this.takeDamage(amount);
            return {
                hullDamage: amount,
                sailDamage: 0,
                crewDamage: 0
            };
        }

        const hullDamage = amount * damageProfile.hull;
        const sailDamage = amount * damageProfile.sail;
        const crewDamage = Math.round(amount * damageProfile.crew);

        this.takeDamage(hullDamage);
        this.sailIntegrity = Math.max(0, this.sailIntegrity - sailDamage);
        if (applyCrewDamage) {
            this.crew = Math.max(0, this.crew - crewDamage);
        }

        return {
            hullDamage,
            sailDamage,
            crewDamage
        };
    }

    repair(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    /**
     * Get hitbox dimensions for collision detection
     * DESIGN CONTRACT: Hitbox derived from sprite dimensions
     * - width = spriteWidth * hitboxWidthFactor
     * - height = spriteHeight * hitboxHeightFactor
     * @returns {{width: number, height: number}}
     */
    getHitbox() {
        return {
            width: this.shipClass.spriteWidth * this.shipClass.hitboxWidthFactor,
            height: this.shipClass.spriteHeight * this.shipClass.hitboxHeightFactor
        };
    }

    serialize() {
        return {
            shipClass: this.shipClass.name,
            health: this.health,
            maxHealth: this.maxHealth,
            hullHP: this.hullHP,
            sailIntegrity: this.sailIntegrity,
            crew: this.crew,
            crewCount: this.crewCount,
            isSunk: this.isSunk
        };
    }
}

module.exports = Ship;
