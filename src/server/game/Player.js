class Player {
    constructor(id) {
        this.id = id;
        this.type = 'PLAYER';
        this.x = 100;
        this.y = 100;
        this.rotation = 0; // in radians
        this.speed = 0;
        this.maxSpeed = 100;
        this.turnSpeed = 2.0;

        // Combat stats
        this.health = 100;
        this.maxHealth = 100;
        this.lastShotTime = 0;
        this.fireRate = 0.5; // Seconds between shots

        // Input state
        this.inputs = {
            forward: false,
            left: false,
            right: false,
            shoot: false
        };
    }

    handleInput(data) {
        // data: { forward: boolean, left: boolean, right: boolean, shoot: boolean }
        this.inputs = data;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        // Could trigger death logic here
    }

    update(deltaTime) {
        if (this.inputs.left) {
            this.rotation -= this.turnSpeed * deltaTime;
        }
        if (this.inputs.right) {
            this.rotation += this.turnSpeed * deltaTime;
        }
        if (this.inputs.forward) {
            this.speed = Math.min(this.speed + 10 * deltaTime, this.maxSpeed); // Acceleration
        } else {
            this.speed = Math.max(0, this.speed - 30 * deltaTime); // Drag/Deceleration
        }

        // Apply velocity
        this.x += Math.cos(this.rotation) * this.speed * deltaTime;
        this.y += Math.sin(this.rotation) * this.speed * deltaTime;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            health: this.health,
            maxHealth: this.maxHealth
        };
    }
}

module.exports = Player;
