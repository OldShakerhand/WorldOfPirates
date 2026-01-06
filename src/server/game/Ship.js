/**
 * Ship - represents a single ship in a player's fleet
 */
class Ship {
    constructor(shipClassName, isNew = true) {
        const { getShipClass } = require('./ShipClass');
        this.shipClass = getShipClass(shipClassName);
        this.health = this.shipClass.health;
        this.maxHealth = this.shipClass.health;
        this.crew = 100; // Base crew size (can be enhanced later)
        this.isSunk = false;

        // For later: cargo, upgrades, etc.
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isSunk = true;
        }
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
            crew: this.crew,
            isSunk: this.isSunk
        };
    }
}

module.exports = Ship;
