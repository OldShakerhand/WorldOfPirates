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
