const { getShipClass } = require('./ShipClass');

class Player {
    constructor(id, shipClassName = 'SLOOP') {
        this.id = id;
        this.type = 'PLAYER';
        this.x = 100 + Math.random() * 200;
        this.y = 100 + Math.random() * 200;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = 0;

        // Ship class
        this.shipClass = getShipClass(shipClassName);
        this.maxSpeed = this.shipClass.maxSpeed;
        this.turnSpeed = this.shipClass.turnSpeed;

        // Movement State
        this.sailState = 0; // 0 = Stop, 1 = Half, 2 = Full
        this.sailChangeCooldown = 0;

        // Combat stats
        this.health = this.shipClass.health;
        this.maxHealth = this.shipClass.health;

        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        this.fireRate = 2.0;

        // Speed tracking for display
        this.speedInKnots = 0;
        this.isInDeepWater = true;

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

    update(deltaTime, wind, waterDepth) {
        // Check water depth
        this.isInDeepWater = waterDepth.isDeep(this.x, this.y);

        // Sail Management
        this.sailChangeCooldown -= deltaTime;

        if (this.sailChangeCooldown <= 0) {
            if (this.inputs.sailUp && this.sailState < 2) {
                this.sailState++;
                this.sailChangeCooldown = 0.5;
            }
            if (this.inputs.sailDown && this.sailState > 0) {
                this.sailState--;
                this.sailChangeCooldown = 0.5;
            }
        }

        // Speed Physics with Wind
        let targetSpeed = 0;

        if (this.sailState > 0) {
            // Base speed from sail state
            const sailModifier = this.sailState === 1 ? 0.5 : 1.0;

            if (this.isInDeepWater) {
                // Wind affects speed in deep water
                const windStrength = wind.getStrengthModifier();
                const windAngle = wind.getAngleModifier(this.rotation, this.sailState);
                targetSpeed = this.maxSpeed * sailModifier * windStrength * windAngle;
            } else {
                // Shallow water: constant slow speed, no wind effect
                targetSpeed = this.maxSpeed * sailModifier * 0.3;
            }
        }

        // Accelerate/Decelerate towards targetSpeed
        const accel = this.isInDeepWater ? 20 : 10;
        const decel = this.isInDeepWater ? 10 : 15;

        if (this.speed < targetSpeed) {
            this.speed += accel * deltaTime;
        } else if (this.speed > targetSpeed) {
            this.speed -= decel * deltaTime;
        }

        // Clamp speed
        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));

        // Convert to knots for display (arbitrary conversion)
        this.speedInKnots = Math.round(this.speed * 0.1);

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

        // Wrap around world
        if (this.x < 0) this.x += 2000;
        if (this.x > 2000) this.x -= 2000;
        if (this.y < 0) this.y += 2000;
        if (this.y > 2000) this.y -= 2000;
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
            speedInKnots: this.speedInKnots,
            isInDeepWater: this.isInDeepWater,
            shipClassName: this.shipClass.name,
            reloadLeft: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeLeft)),
            reloadRight: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeRight)),
            maxReload: this.fireRate
        };
    }
}

module.exports = Player;
