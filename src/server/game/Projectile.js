class Projectile {
    constructor(id, ownerId, x, y, rotation) {
        this.id = id;
        this.ownerId = ownerId; // Who shot this?
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.speed = 300;
        this.radius = 3;
        this.damage = 25;
        this.lifeTime = 2.0; // Seconds until it disappears
        this.timeAlive = 0;
        this.toRemove = false;
    }

    update(deltaTime) {
        this.timeAlive += deltaTime;
        if (this.timeAlive >= this.lifeTime) {
            this.toRemove = true;
            return;
        }

        this.x += Math.cos(this.rotation) * this.speed * deltaTime;
        this.y += Math.sin(this.rotation) * this.speed * deltaTime;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        };
    }
}

module.exports = Projectile;
