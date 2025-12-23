class Player {
    constructor(id) {
        this.id = id;
        this.type = 'PLAYER';
        this.x = 100;
        this.y = 100;
        this.rotation = 0; // in radians
        this.speed = 0;
        this.maxSpeed = 100;
        this.turnSpeed = 1.0; // Slower turn speed for realism

        // Movement State
        this.sailState = 0; // 0 = Stop, 1 = Half, 2 = Full
        this.sailChangeCooldown = 0; // debounce for W/S keys

        // Combat stats
        this.health = 100;
        this.maxHealth = 100;

        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        this.fireRate = 2.0; // Slow reload for cannons (2 seconds)

        // Input state
        this.inputs = {
            left: false,
            right: false,
            sailUp: false,
            sailDown: false,
            shootLeft: false,
            shootRight: false
        };
    }

    handleInput(data) {
        this.inputs = data;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    update(deltaTime) {
        // Sail Management
        // Simple debounce: we only change state if key is pressed and we haven't recently?
        // Actually since we receive stream of "isPressed", we need to detect edges or just use a timer.
        // Let's use a simple timer for input debounce if holding key, or just check "wasPressed" tracking.
        // For simplicity: W increases target, S decreases. But we need to ensure one keypress = one step.
        // We can do this by tracking "prevInputs" or just simple cooldown.
        this.sailChangeCooldown -= deltaTime;

        if (this.sailChangeCooldown <= 0) {
            if (this.inputs.sailUp && this.sailState < 2) {
                this.sailState++;
                this.sailChangeCooldown = 0.5; // Half second delay before next change
            }
            if (this.inputs.sailDown && this.sailState > 0) {
                this.sailState--;
                this.sailChangeCooldown = 0.5;
            }
        }

        // Speed Physics
        let targetSpeed = 0;
        if (this.sailState === 1) targetSpeed = this.maxSpeed * 0.5;
        if (this.sailState === 2) targetSpeed = this.maxSpeed;

        // Accelerate/Decelerate towards targetSpeed
        if (this.speed < targetSpeed) {
            this.speed += 20 * deltaTime; // Acceleration
        } else if (this.speed > targetSpeed) {
            this.speed -= 10 * deltaTime; // Deceleration/Drag
        }

        // Turning
        if (this.inputs.left) {
            this.rotation -= this.turnSpeed * deltaTime;
        }
        if (this.inputs.right) {
            this.rotation += this.turnSpeed * deltaTime;
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
            maxHealth: this.maxHealth,
            sailState: this.sailState,
            reloadLeft: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeLeft)),
            reloadRight: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeRight)),
            maxReload: this.fireRate
        };
    }
}

module.exports = Player;
