class Projectile {
    constructor(id, ownerId, x, y, rotation, speed) {
        this.id = id;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.z = 10; // Start height (e.g. deck height)
        this.zSpeed = 10; // Initial upward velocity
        this.rotation = rotation;
        this.speed = speed || 300;
        this.radius = 3;
        this.damage = 25;
        this.lifeTime = 3.0;
        this.timeAlive = 0;
        this.toRemove = false;
        this.gravity = 20; // Gravity pulling down
    }

    update(deltaTime) {
        this.timeAlive += deltaTime;
        if (this.timeAlive >= this.lifeTime) {
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
