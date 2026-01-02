const CombatConfig = require('./CombatConfig');

class Projectile {
    constructor(id, ownerId, x, y, rotation, speed) {
        this.id = id;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.startX = x; // Track starting position for distance calculation
        this.startY = y;
        this.z = CombatConfig.PROJECTILE_INITIAL_Z;
        this.zSpeed = 10; // Initial upward velocity
        this.rotation = rotation;
        this.speed = speed || CombatConfig.PROJECTILE_SPEED;
        this.radius = CombatConfig.PROJECTILE_BALL_RADIUS * CombatConfig.PROJECTILE_COLLISION_MULTIPLIER;
        this.damage = CombatConfig.PROJECTILE_DAMAGE;
        this.maxDistance = CombatConfig.PROJECTILE_MAX_DISTANCE;
        this.toRemove = false;
        this.gravity = CombatConfig.PROJECTILE_GRAVITY;
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
