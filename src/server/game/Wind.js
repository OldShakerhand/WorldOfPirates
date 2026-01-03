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
        // WIND MECHANICS: Calculate speed modifier based on sailing angle relative to wind
        // COORDINATE SYSTEM ALIGNMENT:
        //   - wind.direction = angle wind is blowing FROM (in radians, 0 = north)
        //   - shipRotation = ship's heading (in radians, 0 = north, clockwise positive)
        // GAMEPLAY GOAL: Reward sailing with the wind, penalize sailing against it

        // Calculate angle difference between wind source and ship heading
        // POSITIVE angleDiff: Ship is heading clockwise from wind source
        // NEGATIVE angleDiff: Ship is heading counterclockwise from wind source
        // OPTIMAL: angleDiff near ±PI (180°) means sailing WITH the wind (tailwind)
        // WORST: angleDiff near 0 means sailing INTO the wind (headwind)
        let angleDiff = this.direction - shipRotation;

        // Normalize angle difference to [-PI, +PI] range
        // WHY: Angles wrap around at ±PI, so we need to handle cases like:
        //   - Wind at 0° (north), ship at 350° (10° west of north)
        //   - Raw diff = -350°, normalized = +10° (correct small difference)
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Use absolute angle for symmetric wind effects (port/starboard tacks are equivalent)
        const absAngle = Math.abs(angleDiff);

        // Convert angle thresholds from config (degrees) to radians for comparison
        const poorMax = PhysicsConfig.WIND_ANGLE_POOR_MAX * Math.PI / 180;
        const moderateMax = PhysicsConfig.WIND_ANGLE_MODERATE_MAX * Math.PI / 180;
        const goodMax = PhysicsConfig.WIND_ANGLE_GOOD_MAX * Math.PI / 180;

        // WIND EFFICIENCY ZONES (based on absAngle from wind source):
        // POOR (0-60°): Headwind - sailing into the wind
        //   - Historically impossible for square-rigged ships
        //   - Game allows it with severe penalty for accessibility
        if (absAngle < poorMax) {
            return PhysicsConfig.WIND_EFFICIENCY_POOR;
        }

        // MODERATE (60-90°): Close reach - perpendicular to wind
        //   - Challenging but manageable sailing angle
        else if (absAngle < moderateMax) {
            return PhysicsConfig.WIND_EFFICIENCY_MODERATE;
        }

        // GOOD (90-150°): Broad reach - favorable sailing angle
        //   - Sweet spot for most sailing ships
        else if (absAngle < goodMax) {
            return PhysicsConfig.WIND_EFFICIENCY_GOOD;
        }

        // EXCELLENT (150-180°): Tailwind - wind directly behind
        //   - Maximum speed, easiest sailing
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
