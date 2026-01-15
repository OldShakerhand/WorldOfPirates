const Ship = require('./Ship');
const GameConfig = require('./GameConfig');
const PhysicsConfig = require('./PhysicsConfig');
const NavigationConfig = require('./NavigationConfig');

/**
 * NPCShip - Non-player ship entity
 * 
 * DESIGN CONTRACT:
 * - Uses SAME simulation core as Player (movement, collision, physics)
 * - Computes inputs via AI instead of sockets
 * - Lives in World.entities alongside players
 * - Serializes identically to players for client rendering
 * 
 * Phase 1 Behavior:
 * - Spawn near player
 * - Sail to nearest harbor (straight line, no pathfinding)
 * - Stop briefly
 * - Despawn
 */
class NPCShip {
    constructor(id, x, y, targetHarborId, npcType = 'TRADER') {
        // Identity
        this.id = id;
        this.name = this.generateName(npcType);
        this.type = 'NPC';
        this.npcType = npcType; // 'TRADER', future: 'PATROL', 'PIRATE'

        // Spatial (same as Player)
        this.x = x;
        this.y = y;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = 0;

        // Ship (FLUYT for traders)
        this.fleet = [new Ship('FLUYT')];
        this.flagshipIndex = 0;
        this.isRaft = false;

        // Movement state (same as Player)
        this.sailState = 0; // Will be set to 1 (half sails) when sailing
        this.sailChangeCooldown = 0;
        this.speedInKnots = 0;
        this.isInDeepWater = true;
        this.windEfficiency = 0;

        // AI State Machine
        this.state = 'SAILING'; // 'SAILING', 'STOPPED', 'DESPAWNING'
        this.targetHarborId = targetHarborId;
        this.stateTimer = 0;

        // Lifecycle
        this.spawnTime = Date.now() / 1000;
        this.maxLifetime = 300; // 5 minutes max (auto-despawn safety)

        // Input state (computed by AI, not sockets)
        this.inputs = {
            left: false,
            right: false,
            sailUp: false,
            sailDown: false,
            shootLeft: false,
            shootRight: false
        };

        // Combat (disabled for Phase 1)
        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        this.fireRate = 999999; // Effectively disabled

        // Harbor state
        this.inHarbor = false;
        this.dockedHarborId = null;
        this.nearHarbor = null;

        // Shield (NPCs don't use shields in Phase 1)
        this.shieldEndTime = 0;

        // Stuck detection (prevent infinite collision spam)
        this.consecutiveCollisions = 0;
        this.maxConsecutiveCollisions = 10; // Despawn after 10 consecutive collisions

        // Navigation state (Phase 2: Predictive navigation)
        this.desiredHeading = this.rotation; // Ideal heading toward target
        this.currentHeading = this.rotation; // Actual heading (may differ due to obstacles)
        this.navUpdateCounter = 0; // Counter for navigation update interval
    }

    get flagship() {
        if (this.isRaft) return null;
        return this.fleet[this.flagshipIndex];
    }

    get maxSpeed() {
        if (this.isRaft) return PhysicsConfig.RAFT_SPEED;
        return this.flagship.shipClass.maxSpeed;
    }

    get turnSpeed() {
        if (this.isRaft) return PhysicsConfig.RAFT_TURN_SPEED;
        return this.flagship.shipClass.turnSpeed;
    }

    get health() {
        if (this.isRaft) return Infinity;
        return this.flagship.health;
    }

    get maxHealth() {
        if (this.isRaft) return Infinity;
        return this.flagship.maxHealth;
    }

    get cannonsPerSide() {
        return 0; // NPCs don't fire in Phase 1
    }

    generateName(npcType) {
        const names = {
            TRADER: ['Merchant Vessel', 'Trading Ship', 'Cargo Runner', 'Supply Ship']
        };
        const nameList = names[npcType] || ['NPC Ship'];
        return nameList[Math.floor(Math.random() * nameList.length)];
    }

    /**
     * AI Input Computation
     * Phase 2: Predictive navigation with obstacle avoidance
     */
    computeAIInputs(world) {
        // Reset inputs
        this.inputs = {
            left: false,
            right: false,
            sailUp: false,
            sailDown: false,
            shootLeft: false,
            shootRight: false
        };

        if (this.state === 'SAILING') {
            // Find target harbor
            const targetHarbor = world.harbors.find(h => h.id === this.targetHarborId);
            if (!targetHarbor) {
                console.warn(`[NPC] ${this.id} has invalid target harbor: ${this.targetHarborId}`);
                this.state = 'DESPAWNING';
                return;
            }

            // 1. Compute desired heading (ideal path to target)
            const dx = targetHarbor.x - this.x;
            const dy = targetHarbor.y - this.y;
            this.desiredHeading = Math.atan2(dy, dx) + Math.PI / 2; // Convert to ship rotation convention

            // 2. Update navigation (check for obstacles and adjust currentHeading)
            if (this.navUpdateCounter++ >= NavigationConfig.NAV_UPDATE_INTERVAL) {
                this.navUpdateCounter = 0;
                this.updateNavigation(world.worldMap);
            }

            // 3. Steer toward currentHeading (not desiredHeading)
            let angleDiff = this.currentHeading - this.rotation;
            // Normalize to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Steering logic
            const TURN_THRESHOLD = 0.1; // radians (~6 degrees)
            if (angleDiff > TURN_THRESHOLD) {
                this.inputs.right = true;
            } else if (angleDiff < -TURN_THRESHOLD) {
                this.inputs.left = true;
            }

            // Sail management (use half sails)
            if (this.sailState < 1) {
                this.inputs.sailUp = true;
            } else if (this.sailState > 1) {
                this.inputs.sailDown = true;
            }

            // Check if reached harbor
            const distance = Math.hypot(dx, dy);
            if (distance < GameConfig.HARBOR_INTERACTION_RADIUS * 2) {
                this.state = 'STOPPED';
                this.stateTimer = 5.0; // Stop for 5 seconds
                console.log(`[NPC] ${this.id} arrived at ${targetHarbor.name}`);
            }
        }
        else if (this.state === 'STOPPED') {
            // Lower sails
            if (this.sailState > 0) {
                this.inputs.sailDown = true;
            }
        }
        // DESPAWNING state: no inputs needed
    }

    /**
     * Update Navigation - Predictive obstacle avoidance
     * Checks for obstacles ahead and adjusts currentHeading accordingly
     */
    updateNavigation(worldMap) {
        const lookAhead = NavigationConfig.LOOK_AHEAD_TILES * GameConfig.TILE_SIZE;

        // Check both current and desired headings
        const currentIsClear = this.isHeadingClear(this.currentHeading, lookAhead, worldMap);
        const desiredIsClear = this.isHeadingClear(this.desiredHeading, lookAhead, worldMap);

        if (currentIsClear && desiredIsClear) {
            // Both paths clear - gradually converge to desired heading
            this.currentHeading = this.smoothInterpolate(
                this.currentHeading,
                this.desiredHeading,
                NavigationConfig.NPC_TURN_SMOOTHING * (1 / 60)
            );

            if (NavigationConfig.DEBUG_NAVIGATION) {
                console.log(`[NAV] ${this.id} | Both clear, converging to desired`);
            }
        } else if (!currentIsClear && desiredIsClear) {
            // Current blocked, desired clear - re-acquire direct path
            this.currentHeading = this.smoothInterpolate(
                this.currentHeading,
                this.desiredHeading,
                NavigationConfig.NPC_TURN_SMOOTHING * (1 / 60)
            );

            if (NavigationConfig.DEBUG_NAVIGATION) {
                console.log(`[NAV] ${this.id} | Re-acquiring direct path`);
            }
        } else if (!currentIsClear) {
            // Current path blocked - find alternative
            const alternative = this.findClearHeading(worldMap, lookAhead);
            if (alternative !== null) {
                this.currentHeading = alternative;

                if (NavigationConfig.DEBUG_NAVIGATION) {
                    const altDeg = (alternative * 180 / Math.PI).toFixed(0);
                    console.log(`[NAV] ${this.id} | Avoiding obstacle, new heading: ${altDeg}°`);
                }
            } else {
                // No clear path found - turn perpendicular and mark as stuck
                this.currentHeading = this.desiredHeading + Math.PI / 2;
                this.consecutiveCollisions++;

                console.log(`[NPC] ${this.id} | No clear path found, turning perpendicular`);
            }
        }
        // else: current clear, desired blocked - keep currentHeading (hysteresis)
    }

    /**
     * Check if a heading is clear of obstacles
     * @param {number} heading - Heading to test (radians)
     * @param {number} lookAheadDistance - Distance to look ahead (pixels)
     * @param {WorldMap} worldMap - World map for collision detection
     * @returns {boolean} True if path is clear
     */
    isHeadingClear(heading, lookAheadDistance, worldMap) {
        const samples = Math.ceil(lookAheadDistance / GameConfig.TILE_SIZE);

        for (let i = 1; i <= samples; i++) {
            const dist = i * GameConfig.TILE_SIZE;
            // Convert heading to world coordinates (heading - PI/2 for ship convention)
            const x = this.x + Math.cos(heading - Math.PI / 2) * dist;
            const y = this.y + Math.sin(heading - Math.PI / 2) * dist;

            if (worldMap.isLand(x, y)) {
                return false; // Obstacle detected
            }
        }

        return true; // Path is clear
    }

    /**
     * Find a clear alternative heading
     * Tests search angles and returns first clear heading that makes forward progress
     * @param {WorldMap} worldMap - World map for collision detection
     * @param {number} lookAheadDistance - Distance to look ahead
     * @returns {number|null} Clear heading or null if none found
     */
    findClearHeading(worldMap, lookAheadDistance) {
        for (const angle of NavigationConfig.SEARCH_ANGLES) {
            const testHeading = this.desiredHeading + angle;

            // Check if heading is clear
            if (this.isHeadingClear(testHeading, lookAheadDistance, worldMap)) {
                // Check if still making forward progress toward target
                const progressDot = Math.cos(testHeading - this.desiredHeading);

                if (progressDot >= NavigationConfig.MIN_PROGRESS_DOT) {
                    return testHeading; // Found a good alternative
                }
            }
        }

        return null; // No clear heading found
    }

    /**
     * Smooth angular interpolation
     * Gradually turns from current to target heading
     * @param {number} current - Current heading (radians)
     * @param {number} target - Target heading (radians)
     * @param {number} maxTurnRate - Maximum turn rate (radians per tick)
     * @returns {number} New heading
     */
    smoothInterpolate(current, target, maxTurnRate) {
        let diff = target - current;

        // Normalize to [-PI, PI]
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;

        // Clamp to max turn rate
        const turn = Math.max(-maxTurnRate, Math.min(maxTurnRate, diff));

        return current + turn;
    }

    /**
     * Take damage from projectiles
     * Simplified version of Player.takeDamage (no shields, no rafts, no kill messages)
     */
    takeDamage(amount, damageSource = null) {
        if (this.isRaft) return; // Safety check (NPCs don't become rafts in Phase 1)

        this.flagship.takeDamage(amount);
        console.log(`[NPC] ${this.id} took ${amount} damage (${this.flagship.health}/${this.flagship.maxHealth} HP)`);

        // Check if flagship sunk
        if (this.flagship.isSunk) {
            console.log(`[NPC] ${this.id} sunk, despawning`);
            this.state = 'DESPAWNING';
        }
    }

    /**
     * Update NPC state machine and AI
     * Called BEFORE Player.update() to compute inputs
     */
    updateAI(deltaTime, world) {
        // Check lifetime (safety despawn)
        const age = (Date.now() / 1000) - this.spawnTime;
        if (age > this.maxLifetime) {
            console.log(`[NPC] ${this.id} exceeded max lifetime, despawning`);
            this.state = 'DESPAWNING';
            return;
        }

        // Update state timer
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;
            if (this.stateTimer <= 0) {
                // Transition from STOPPED to DESPAWNING
                if (this.state === 'STOPPED') {
                    this.state = 'DESPAWNING';
                    console.log(`[NPC] ${this.id} finished stop, despawning`);
                }
            }
        }

        // Compute AI inputs based on current state
        this.computeAIInputs(world);
    }

    /**
     * Movement/Physics Update
     * REUSES Player.update() logic exactly
     * This is the SAME simulation core
     */
    update(deltaTime, wind, worldMap) {
        // Skip movement if docked (not used in Phase 1, but kept for consistency)
        if (this.inHarbor) {
            return;
        }

        // Check terrain
        this.isInDeepWater = worldMap.isWater(this.x, this.y);

        // Sail Management (same as Player)
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

        // Speed Physics with Wind (same as Player)
        let targetSpeed = 0;
        let windAngleModifier = 0;

        if (this.sailState > 0) {
            const sailModifier = this.sailState === 1 ? 0.5 : 1.0;

            if (this.isInDeepWater) {
                const windStrength = wind.getStrengthModifier();
                windAngleModifier = wind.getAngleModifier(this.rotation, this.sailState);
                targetSpeed = this.maxSpeed * sailModifier * windStrength * windAngleModifier;
            } else {
                targetSpeed = this.maxSpeed * sailModifier * PhysicsConfig.SHALLOW_WATER_SPEED_MULTIPLIER;
            }
        }

        this.windEfficiency = windAngleModifier;

        // Accelerate/Decelerate (same as Player)
        const accel = this.isInDeepWater ? PhysicsConfig.ACCELERATION : PhysicsConfig.ACCELERATION * 0.5;
        const decel = this.isInDeepWater ? PhysicsConfig.DECELERATION : PhysicsConfig.DECELERATION * 1.5;

        if (this.speed < targetSpeed) {
            this.speed += accel * deltaTime;
        } else if (this.speed > targetSpeed) {
            this.speed -= decel * deltaTime;
        }

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.speedInKnots = Math.round(this.speed * PhysicsConfig.SPEED_TO_KNOTS_MULTIPLIER);

        // Turning (same as Player)
        if (this.inputs.left) {
            this.rotation -= this.turnSpeed * deltaTime;
        }
        if (this.inputs.right) {
            this.rotation += this.turnSpeed * deltaTime;
        }

        // Apply velocity (same as Player)
        const shipHeadingRad = this.rotation - Math.PI / 2;
        const newX = this.x + Math.cos(shipHeadingRad) * this.speed * deltaTime;
        const newY = this.y + Math.sin(shipHeadingRad) * this.speed * deltaTime;

        // Check land collision (same as Player)
        let canMove = true;
        if (worldMap.isLand(newX, newY)) {
            canMove = false;
            this.speed = 0; // NPCs don't take collision damage in Phase 1

            // Stuck detection: count consecutive collisions
            this.consecutiveCollisions++;

            // Only log first collision to avoid spam
            if (this.consecutiveCollisions === 1) {
                console.log(`[NPC] ${this.id} collided with land`);
            }

            // If stuck for too long, despawn
            if (this.consecutiveCollisions >= this.maxConsecutiveCollisions) {
                console.log(`[NPC] ${this.id} stuck on land (${this.consecutiveCollisions} collisions), despawning`);
                this.state = 'DESPAWNING';
            }
        } else {
            // Reset collision counter when moving freely
            this.consecutiveCollisions = 0;
        }

        // Only move if no collision
        if (canMove) {
            this.x = newX;
            this.y = newY;
        }

        // Wrap around world (same as Player)
        if (this.x < 0) this.x += GameConfig.WORLD_WIDTH;
        if (this.x > GameConfig.WORLD_WIDTH) this.x -= GameConfig.WORLD_WIDTH;
        if (this.y < 0) this.y += GameConfig.WORLD_HEIGHT;
        if (this.y > GameConfig.WORLD_HEIGHT) this.y -= GameConfig.WORLD_HEIGHT;
    }

    /**
     * Serialize for client
     * IDENTICAL format to Player for zero client changes
     */
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
            hasShield: false, // NPCs don't have shields
            fleetSize: this.fleet.length,
            navigationSkill: 1,
            nearHarbor: this.nearHarbor,
            reloadLeft: 999, // Not used
            reloadRight: 999,
            maxReload: 999
        };
    }
}

module.exports = NPCShip;
