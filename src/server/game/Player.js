const Ship = require('./Ship');
const NavigationSkill = require('./NavigationSkill');
const GameConfig = require('./GameConfig');
const PhysicsConfig = require('./PhysicsConfig');
const CombatConfig = require('./CombatConfig');

class Player {
    constructor(id, name = 'Anonymous', startingShipClass = 'FLUYT') {
        // Identity
        this.id = id;  // Socket ID (temporary session identifier)
        this.name = name;  // Display name

        // Future: Add these when implementing persistence
        // this.accountId = null;     // Database user ID (permanent)
        // this.sessionToken = null;  // JWT authentication token
        // this.lastSaveTime = null;  // For auto-save functionality

        this.type = 'PLAYER';
        this.x = GameConfig.PLAYER_SPAWN_MIN + Math.random() * GameConfig.PLAYER_SPAWN_RANGE;
        this.y = GameConfig.PLAYER_SPAWN_MIN + Math.random() * GameConfig.PLAYER_SPAWN_RANGE;

        // DESIGN CONTRACT: Rotation convention
        // - 0 radians = north (up, -Y direction)
        // - Increases clockwise (standard nautical heading)
        // - Range: [-PI, +PI] after normalization
        // DO NOT CHANGE: Entire coordinate system depends on this convention
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = 0;

        // Navigation & Fleet
        this.navigationSkill = 1; // Starting navigation skill
        this.fleet = [new Ship(startingShipClass)]; // Start with one ship
        this.flagshipIndex = 0; // Active ship index
        this.isRaft = false; // True when all ships lost

        // Shield (temporary invulnerability after flagship loss)
        this.shieldEndTime = 0; // Timestamp when shield expires

        // Harbor state
        this.inHarbor = false; // True when docked
        this.dockedHarborId = null; // Which harbor

        // Boarding proximity timer
        this.boardingTarget = null; // { playerId, startTime }

        // Movement State
        this.sailState = 0; // 0 = Stop, 1 = Half, 2 = Full
        this.sailChangeCooldown = 0;

        // Combat stats from flagship
        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        this.fireRate = CombatConfig.CANNON_FIRE_RATE;

        // Speed tracking
        this.speedInKnots = 0;
        // Raft properties (if all ships lost)
        this.raftSpeed = PhysicsConfig.RAFT_SPEED;
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
        if (this.isRaft) {
            return this.raftSpeed; // 1.5x Sloop speed
        }
        return this.flagship.shipClass.maxSpeed;
    }

    get turnSpeed() {
        if (this.isRaft) return PhysicsConfig.RAFT_TURN_SPEED;
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
        const penalty = 1.0 - ((this.fleet.length - 1) * PhysicsConfig.FLEET_SPEED_PENALTY_PER_SHIP);
        return Math.max(PhysicsConfig.MAX_FLEET_SPEED_PENALTY, penalty);
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
        console.log(`Player "${this.name}" (${this.id}) flagship sunk!`);

        // Remove sunk ship from fleet
        this.fleet.splice(this.flagshipIndex, 1);

        if (this.fleet.length > 0) {
            // Switch to next ship
            this.flagshipIndex = 0;

            // Apply shield after flagship switch
            this.shieldEndTime = (Date.now() / 1000) + CombatConfig.FLAGSHIP_SWITCH_SHIELD_DURATION;

            console.log(`Player "${this.name}" (${this.id}) switching to ${this.flagship.shipClass.name} with shield`);
        } else {
            // No ships left - become raft
            this.isRaft = true;
            this.speed = 0; // Reset speed
            console.log(`Player "${this.name}" (${this.id}) is now on a raft`);
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
                this.sailChangeCooldown = PhysicsConfig.SAIL_CHANGE_COOLDOWN;
            }
            if (this.inputs.sailDown && this.sailState > 0) {
                this.sailState--;
                this.sailChangeCooldown = PhysicsConfig.SAIL_CHANGE_COOLDOWN;
            }
        }

        // Speed Physics with Wind
        let targetSpeed = 0;
        let windAngleModifier = 0; // Track for UI display

        if (this.sailState > 0) {
            // TODO: Make sail state modifiers configurable (TECH_DEBT_005)
            // WHY: Hardcoded 0.5 for half sails doesn't allow ship-specific tuning
            // REFACTOR: Move to ShipClass properties or PhysicsConfig
            // WHEN: When different ship types need different sail efficiency curves
            const sailModifier = this.sailState === 1 ? 0.5 : 1.0;

            if (this.isInDeepWater) {
                const windStrength = wind.getStrengthModifier();
                // TODO: Consider renaming getAngleModifier to getWindEfficiencyModifier for clarity
                windAngleModifier = wind.getAngleModifier(this.rotation, this.sailState);
                targetSpeed = this.maxSpeed * sailModifier * windStrength * windAngleModifier;
            } else {
                // Shallow water: speed reduction based on config
                targetSpeed = this.maxSpeed * sailModifier * PhysicsConfig.SHALLOW_WATER_SPEED_MULTIPLIER;
            }
        }

        // Store for serialization
        this.windEfficiency = windAngleModifier;

        // Accelerate/Decelerate
        // TODO: Make shallow water physics multipliers configurable (TECH_DEBT_006)
        // WHY: Hardcoded 0.5 accel and 1.5 decel in shallow water are magic numbers
        // REFACTOR: Move to PhysicsConfig.SHALLOW_WATER_ACCEL_MULTIPLIER
        // WHEN: When adding different water depth levels or ship draft mechanics
        const accel = this.isInDeepWater ? PhysicsConfig.ACCELERATION : PhysicsConfig.ACCELERATION * 0.5;
        const decel = this.isInDeepWater ? PhysicsConfig.DECELERATION : PhysicsConfig.DECELERATION * 1.5;

        if (this.speed < targetSpeed) {
            this.speed += accel * deltaTime;
        } else if (this.speed > targetSpeed) {
            this.speed -= decel * deltaTime;
        }

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.speedInKnots = Math.round(this.speed * PhysicsConfig.SPEED_TO_KNOTS_MULTIPLIER);

        // Turning
        if (this.inputs.left) {
            this.rotation -= this.turnSpeed * deltaTime;
        }
        if (this.inputs.right) {
            this.rotation += this.turnSpeed * deltaTime;
        }

        // Apply velocity
        // COORDINATE SYSTEM: 0 radians = north/up, rotation increases clockwise
        // Ship sprites are drawn pointing up at 0 rotation
        // To move forward (in the direction the ship faces), we need to convert:
        //   - rotation 0 (north) should move in -Y direction (up on canvas)
        //   - rotation PI/2 (east) should move in +X direction (right on canvas)
        // The -PI/2 offset transforms our north-up rotation into standard canvas angles
        // where 0 radians points right (+X direction)
        // TODO: Consider renaming 'rotation' to 'shipHeadingRad' for clarity (high-risk: public API)

        // DESIGN CONTRACT: Movement calculation
        // - Forward movement MUST use (rotation - PI/2) transform
        // - This aligns north-up rotation (0 rad) with canvas -Y direction
        // DO NOT CHANGE: Changing this breaks all ship movement and sprite alignment
        const shipHeadingRad = this.rotation - Math.PI / 2;
        const newX = this.x + Math.cos(shipHeadingRad) * this.speed * deltaTime;
        const newY = this.y + Math.sin(shipHeadingRad) * this.speed * deltaTime;

        // Check island collisions
        let canMove = true;
        if (waterDepth.checkIslandCollisions) {
            const collisionResult = waterDepth.checkIslandCollisions(newX, newY);
            if (collisionResult.collision) {
                canMove = false;

                // Apply collision damage based on speed
                if (this.speed > CombatConfig.COLLISION_DAMAGE_THRESHOLD) {
                    const damage = (this.speed - CombatConfig.COLLISION_DAMAGE_THRESHOLD) * CombatConfig.COLLISION_DAMAGE_MULTIPLIER;
                    this.takeDamage(damage);
                    console.log(`Ship "${this.name}" (${this.id}) hit island at speed ${this.speed.toFixed(0)}, damage: ${damage.toFixed(1)}`);
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
        if (this.x < 0) this.x += GameConfig.WORLD_WIDTH;
        if (this.x > GameConfig.WORLD_WIDTH) this.x -= GameConfig.WORLD_WIDTH;
        if (this.y < 0) this.y += GameConfig.WORLD_HEIGHT;
        if (this.y > GameConfig.WORLD_HEIGHT) this.y -= GameConfig.WORLD_HEIGHT;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            health: this.health,
            maxHealth: this.maxHealth,
            sailState: this.sailState,
            speedInKnots: this.speedInKnots,
            maxSpeedInKnots: Math.round(this.maxSpeed * PhysicsConfig.SPEED_TO_KNOTS_MULTIPLIER),
            windEfficiency: this.windEfficiency || 0,
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
