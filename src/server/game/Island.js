/**
 * Island - represents landmass with surrounding shallow water
 */
class Island {
    constructor(id, x, y, radius) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.shallowWaterRadius = radius + 80; // Shallow water extends 80 units beyond island
    }

    /**
     * Check if a point (ship) is colliding with the island
     */
    isColliding(shipX, shipY, shipRadius = 15) {
        const dist = Math.hypot(this.x - shipX, this.y - shipY);
        return dist < (this.radius + shipRadius);
    }

    /**
     * Check if a point (ship) is in shallow water around the island
     */
    isInShallowWater(shipX, shipY) {
        const dist = Math.hypot(this.x - shipX, this.y - shipY);
        return dist < this.shallowWaterRadius && dist >= this.radius;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            shallowWaterRadius: this.shallowWaterRadius
        };
    }
}

module.exports = Island;
