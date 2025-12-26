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
     * @param {number} sailState - 0=Stop, 1=Half, 2=Full
     * @returns {number} Speed modifier (0 to 1)
     */
    getAngleModifier(shipRotation, sailState) {
        // Calculate angle difference between ship and wind
        // Wind.direction is where wind comes FROM
        // We want max speed when ship points AWAY from wind source (with the wind)
        // Ship rotation and wind.direction are both in radians

        let angleDiff = this.direction - shipRotation; // REVERSED: wind direction minus ship

        // Normalize to -π to π
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const absAngle = Math.abs(angleDiff);
        const deg25 = Math.PI * 25 / 180; // 25 degrees in radians
        const deg90 = Math.PI / 2; // 90 degrees

        // Tailwind: Wind from behind (±25° from 180°)
        // absAngle near π means ship is pointing away from wind source = good
        if (absAngle > Math.PI - deg25) {
            return 1.0; // 100% speed - optimal
        }

        // Wide tailwind zone: 155° to 130°
        else if (absAngle > Math.PI - deg25 - (Math.PI * 25 / 180)) {
            return 0.75; // 75% speed (25% reduction)
        }

        // Beam reach and approaching headwind: 90° to 130°
        else if (absAngle > deg90) {
            // Sailing against wind (more than 90° off)
            if (sailState === 2) {
                return 0.50; // Full sails: 50% speed
            } else {
                return 0.65; // Half sails: 65% speed
            }
        }

        // Close to headwind but not dead zone: 25° to 90°
        else if (absAngle > deg25) {
            const ratio = (absAngle - deg25) / (deg90 - deg25);
            if (sailState === 2) {
                return 0.30 + (0.20 * ratio); // 30% to 50% for full sails
            } else {
                return 0.45 + (0.20 * ratio); // 45% to 65% for half sails
            }
        }

        // Dead zone: ±25° directly into wind
        else {
            return 0.10; // Near zero speed
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
