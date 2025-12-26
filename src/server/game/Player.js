const Ship = require('./Ship');
const { getMaxFleetSize } = require('./NavigationSkill');

class Player {
    constructor(id, startingShipClass = 'SLOOP') {
        this.id = id;
        this.type = 'PLAYER';
        this.x = 100 + Math.random() * 200;
        this.y = 100 + Math.random() * 200;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = 0;

        // Navigation & Fleet
        this.navigationSkill = 1; // Starting navigation skill
        this.fleet = [new Ship(startingShipClass)]; // Start with one ship
        this.flagshipIndex = 0; // Active ship index
        this.isRaft = false; // True when all ships lost

        // Shield (temporary invulnerability after flagship loss)
        this.shieldEndTime = 0; // Timestamp when shield expires

        // Boarding proximity timer
        this.boardingTarget = null; // { playerId, startTime }

        // Movement State
        this.sailState = 0; // 0 = Stop, 1 = Half, 2 = Full
        this.sailChangeCooldown = 0;

        // Combat stats from flagship
        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        this.fireRate = 2.0;

        // Speed tracking
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

    get flagship() {
        if (this.isRaft) return null;
        return this.fleet[this.flagshipIndex];
    }

    get maxSpeed() {
        if (this.isRaft) return 30; // Raft is very slow
        // Apply fleet penalty: heavier ships slow you down
        const fleetPenalty = this.getFleetSpeedPenalty();
        return this.flagship.shipClass.maxSpeed * fleetPenalty;
    }

    get turnSpeed() {
        if (this.isRaft) return 1.5;
        return this.flagship.shipClass.turnSpeed;
    }

    get health() {
        if (this.isRaft) return Infinity; // Raft is invulnerable
        return this.flagship.health;
    }

    get maxHealth() {
        if (this.isRaft) return Infinity;
        return this.flagship.maxHealth;
    }

    get cannonsPerSide() {
        if (this.isRaft) return 0;
        return this.flagship.shipClass.cannonsPerSide;
    }

    getFleetSpeedPenalty() {
        // More ships = slower (simple version)
        // Each additional ship adds 5% penalty
        const penalty = 1.0 - ((this.fleet.length - 1) * 0.05);
        return Math.max(0.5, penalty); // Max 50% penalty
    }

    handleInput(data) {
        this.inputs = data;
    }

    takeDamage(amount) {
        if (this.isRaft || this.hasActiveShield()) {
            return; // Invulnerable
        }

        this.flagship.takeDamage(amount);

        // Check if flagship sunk
        if (this.flagship.isSunk) {
            this.onFlagshipSunk();
        }
    }

    hasActiveShield() {
        return Date.now() / 1000 < this.shieldEndTime;
    }

    onFlagshipSunk() {
        console.log(`Player ${this.id} flagship sunk!`);

        // Remove sunk ship from fleet
        this.fleet.splice(this.flagshipIndex, 1);

        if (this.fleet.length > 0) {
            // Switch to next ship
            this.flagshipIndex = 0;

            // Apply 3-second shield
            this.shieldEndTime = (Date.now() / 1000) + 3.0;

            console.log(`Player ${this.id} switching to ${this.flagship.shipClass.name} with shield`);
        } else {
            // No ships left - become raft
            this.isRaft = true;
            this.speed = 0; // Reset speed
            console.log(`Player ${this.id} is now on a raft`);
        }
    }

    update(deltaTime, wind, waterDepth) {
        // Skip movement if docked in harbor
        if (this.inHarbor) {
            return;
        }

        // Check water depth
        this.isInDeepWater = waterDepth.isDeep(this.x, this.y);

        // Check harbor proximity
        this.nearHarbor = null;
        if (waterDepth.checkHarborProximity) {
            this.nearHarbor = waterDepth.checkHarborProximity(this.x, this.y);
        }

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
            const sailModifier = this.sailState === 1 ? 0.5 : 1.0;

            if (this.isInDeepWater) {
                const windStrength = wind.getStrengthModifier();
                const windAngle = wind.getAngleModifier(this.rotation, this.sailState);
                targetSpeed = this.maxSpeed * sailModifier * windStrength * windAngle;
            } else {
                // Shallow water: 25% speed reduction (move at 75% speed)
                targetSpeed = this.maxSpeed * sailModifier * 0.75;
            }
        }

        // Accelerate/Decelerate
        const accel = this.isInDeepWater ? 20 : 10;
        const decel = this.isInDeepWater ? 10 : 15;

        if (this.speed < targetSpeed) {
            this.speed += accel * deltaTime;
        } else if (this.speed > targetSpeed) {
            this.speed -= decel * deltaTime;
        }

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.speedInKnots = Math.round(this.speed * 0.1);

        // Turning
        if (this.inputs.left) {
            this.rotation -= this.turnSpeed * deltaTime;
        }
        if (this.inputs.right) {
            this.rotation += this.turnSpeed * deltaTime;
        }

        // Apply velocity
        // Visual ship is rotated by -PI/2, so movement should also be -PI/2
        const movementAngle = this.rotation - Math.PI / 2;
        const newX = this.x + Math.cos(movementAngle) * this.speed * deltaTime;
        const newY = this.y + Math.sin(movementAngle) * this.speed * deltaTime;

        // Check island collisions
        let canMove = true;
        if (waterDepth.checkIslandCollisions) {
            const collisionResult = waterDepth.checkIslandCollisions(newX, newY);
            if (collisionResult.collision) {
                canMove = false;

                // Apply collision damage based on speed
                if (this.speed > 20) {
                    const damage = (this.speed - 20) * 0.5;
                    this.takeDamage(damage);
                    console.log(`Ship ${this.id} hit island at speed ${this.speed.toFixed(0)}, damage: ${damage.toFixed(1)}`);
                }

                // Stop the ship
                this.speed = 0;
            }
        }

        // Only move if no collision
        if (canMove) {
            this.x = newX;
            this.y = newY;
        }

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
            shipClassName: this.isRaft ? 'Raft' : this.flagship.shipClass.name,
            isRaft: this.isRaft,
            hasShield: this.hasActiveShield(),
            fleetSize: this.fleet.length,
            navigationSkill: this.navigationSkill,
            nearHarbor: this.nearHarbor,
            reloadLeft: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeLeft)),
            reloadRight: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeRight)),
            maxReload: this.fireRate
        };
    }
}

module.exports = Player;
