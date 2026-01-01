/**
 * Wind System
 * Manages global wind direction and strength that affects all ships
 */
const PhysicsConfig = require('./PhysicsConfig');

class Wind {
    constructor() {
        this.direction = Math.random() * Math.PI * 2; // 0 to 2π radians
        this.strength = this.randomStrength();
        this.changeTimer = 0;
        this.changeInterval = PhysicsConfig.WIND_CHANGE_INTERVAL_MIN +
            Math.random() * (PhysicsConfig.WIND_CHANGE_INTERVAL_MAX - PhysicsConfig.WIND_CHANGE_INTERVAL_MIN);
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
            this.direction += (Math.random() - 0.5) * PhysicsConfig.WIND_CHANGE_RATE;
            this.strength = this.randomStrength();
            this.changeTimer = 0;
            this.changeInterval = PhysicsConfig.WIND_CHANGE_INTERVAL_MIN +
                Math.random() * (PhysicsConfig.WIND_CHANGE_INTERVAL_MAX - PhysicsConfig.WIND_CHANGE_INTERVAL_MIN);

            console.log(`Wind changed: ${this.strength} at ${(this.direction * 180 / Math.PI).toFixed(0)}°`);
        }
    }

    /**
     * Calculate speed modifier based on angle between ship heading and wind
     * GAMEPLAY-BALANCED VERSION - Uses PhysicsConfig for easy tuning
     * @param {number} shipRotation - Ship's heading in radians
     * @param {number} sailState - 0=Stop, 1=Half, 2=Full
     * @returns {number} Speed modifier (0 to 1)
     */
    getAngleModifier(shipRotation, sailState) {
        // Calculate angle difference between ship and wind
        // Wind.direction is where wind comes FROM
        // We want max speed when ship points AWAY from wind source (with the wind)

        let angleDiff = this.direction - shipRotation;

        // Normalize to -π to π
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const absAngle = Math.abs(angleDiff);

        // Angle thresholds from PhysicsConfig (convert degrees to radians)
        const poorMax = PhysicsConfig.WIND_ANGLE_POOR_MAX * Math.PI / 180;
        const moderateMax = PhysicsConfig.WIND_ANGLE_MODERATE_MAX * Math.PI / 180;
        const goodMax = PhysicsConfig.WIND_ANGLE_GOOD_MAX * Math.PI / 180;

        // POOR: Headwind - sailing into the wind
        if (absAngle < poorMax) {
            return PhysicsConfig.WIND_EFFICIENCY_POOR;
        }

        // MODERATE: Close reach
        else if (absAngle < moderateMax) {
            return PhysicsConfig.WIND_EFFICIENCY_MODERATE;
        }

        // GOOD: Broad reach
        else if (absAngle < goodMax) {
            return PhysicsConfig.WIND_EFFICIENCY_GOOD;
        }

        // EXCELLENT: Tailwind
        else {
            return PhysicsConfig.WIND_EFFICIENCY_EXCELLENT;
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
