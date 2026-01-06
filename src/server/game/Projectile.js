const CombatConfig = require('./CombatConfig');

/**
 * DESIGN CONTRACT: Arcade Projectile Physics
 * - Projectile direction set ONCE at creation, NEVER modified
 * - Constant speed in straight line (world coordinates)
 * - NO velocity inheritance from ship
 * - NO compensation or correction logic
 * - Ship and projectile FULLY DECOUPLED after firing
 * - Z-axis parabola is VISUAL ONLY, does not affect trajectory or collision
 * 
 * This implements Sid Meier's Pirates!-style arcade firing:
 * - Projectiles always fire exactly perpendicular to ship heading
 * - Player intent is clear and predictable
 * - No hidden physics affecting aim
 */

class Projectile {
    constructor(id, ownerId, x, y, rotation, speed) {
        this.id = id;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.startX = x; // Track starting position for distance calculation
        this.startY = y;
        this.z = CombatConfig.PROJECTILE_INITIAL_Z;
        this.rotation = rotation;
        this.speed = speed || CombatConfig.PROJECTILE_SPEED;
        this.radius = CombatConfig.PROJECTILE_BALL_RADIUS * CombatConfig.PROJECTILE_COLLISION_MULTIPLIER;
        this.damage = CombatConfig.PROJECTILE_DAMAGE;
        this.maxDistance = CombatConfig.PROJECTILE_MAX_DISTANCE;
        this.toRemove = false;

        // DESIGN CONTRACT: Gravity calculation for perfect parabolic arc
        // GOAL: Projectile reaches water (z=0) exactly at maxDistance
        // PHYSICS: Using kinematic equations for projectile motion
        // 
        // Given:
        // - initialZ: starting height above water
        // - initialZSpeed: initial upward velocity
        // - maxDistance: horizontal distance to travel
        // - speed: horizontal velocity (constant)
        // 
        // Calculate time to reach maxDistance:
        //   time = maxDistance / speed
        // 
        // Calculate gravity needed for z to reach 0 at that time:
        //   z(t) = initialZ + initialZSpeed*t - 0.5*gravity*t²
        //   0 = initialZ + initialZSpeed*t - 0.5*gravity*t²
        //   gravity = 2*(initialZ + initialZSpeed*t) / t²
        //
        // This ensures the projectile ALWAYS hits water at maxDistance
        const initialZ = CombatConfig.PROJECTILE_INITIAL_Z;
        const initialZSpeed = CombatConfig.PROJECTILE_INITIAL_Z_SPEED || 10;
        const timeToMaxDistance = this.maxDistance / this.speed;

        this.zSpeed = initialZSpeed;
        this.gravity = (2 * (initialZ + initialZSpeed * timeToMaxDistance)) / (timeToMaxDistance * timeToMaxDistance);

        // Log calculated gravity for debugging/tuning
        // console.log(`Projectile gravity calculated: ${this.gravity.toFixed(2)} (maxDist: ${this.maxDistance}, speed: ${this.speed})`);
    }

    update(deltaTime) {
        // Check distance traveled
        const distanceTraveled = Math.hypot(this.x - this.startX, this.y - this.startY);
        if (distanceTraveled >= this.maxDistance) {
            this.toRemove = true;
            return;
        }

        // Move horizontally
        this.x += Math.cos(this.rotation) * this.speed * deltaTime;
        this.y += Math.sin(this.rotation) * this.speed * deltaTime;

        // Move vertically (Gravity)
        this.zSpeed -= this.gravity * deltaTime;
        this.z += this.zSpeed * deltaTime;

        // Water impact
        if (this.z <= 0) {
            this.toRemove = true; // Splashed into water
            // TODO: Create splash event/effect?
        }
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            z: this.z
        };
    }
}

module.exports = Projectile;
