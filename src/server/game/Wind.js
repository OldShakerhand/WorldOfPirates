/**
 * Wind System
 * Manages global wind direction and strength that affects all ships
 */
class Wind {
    constructor() {
        this.direction = Math.random() * Math.PI * 2; // 0 to 2π radians
        this.strength = this.randomStrength();
        this.changeTimer = 0;
        this.changeInterval = 30 + Math.random() * 30; // 30-60 seconds
    }

    randomStrength() {
        const rand = Math.random();
        if (rand < 0.2) return 'LOW';      // 20% chance
        if (rand < 0.6) return 'NORMAL';   // 40% chance
        return 'FULL';                      // 40% chance
    }

    getStrengthModifier() {
        switch (this.strength) {
            case 'LOW': return 0.6;
            case 'NORMAL': return 0.8;
            case 'FULL': return 1.0;
            default: return 0.8;
        }
    }

    update(deltaTime) {
        this.changeTimer += deltaTime;

        if (this.changeTimer >= this.changeInterval) {
            // Change wind gradually
            this.direction += (Math.random() - 0.5) * 0.5; // Small angle change
            this.strength = this.randomStrength();
            this.changeTimer = 0;
            this.changeInterval = 30 + Math.random() * 30;

            console.log(`Wind changed: ${this.strength} at ${(this.direction * 180 / Math.PI).toFixed(0)}°`);
        }
    }

    /**
     * Calculate speed modifier based on angle between ship heading and wind
     * @param {number} shipRotation - Ship's heading in radians
     * @param {number} shipClass - Ship class (1-10 for Raft to War Galleon)
     * @returns {number} Speed modifier (0 to 1)
     */
    getAngleModifier(shipRotation, shipClass) {
        // Calculate angle difference between ship and wind
        let angleDiff = shipRotation - this.direction;

        // Normalize to -π to π
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const absAngle = Math.abs(angleDiff);

        // Wind from behind (tailwind): Best speed
        if (absAngle > Math.PI * 0.85) {
            return 1.0;
        }
        // Beam reach (side wind): Good speed
        else if (absAngle > Math.PI * 0.6) {
            return 0.85;
        }
        // Close haul (45-60°): Moderate speed
        else if (absAngle > Math.PI * 0.4) {
            // Higher ship classes (4-9) do better here
            return shipClass >= 4 ? 0.65 : 0.55;
        }
        // Close to headwind: Poor speed
        else if (absAngle > Math.PI * 0.2) {
            return shipClass >= 4 ? 0.4 : 0.3;
        }
        // Dead into wind: Very poor, losing speed
        else {
            return shipClass >= 4 ? 0.25 : 0.15;
        }
    }

    serialize() {
        return {
            direction: this.direction,
            strength: this.strength
        };
    }
}

module.exports = Wind;
