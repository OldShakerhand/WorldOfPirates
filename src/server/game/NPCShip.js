const Ship = require('./Ship');
const GameConfig = require('./GameConfig');
const PhysicsConfig = require('./PhysicsConfig');
const NavigationConfig = require('./NavigationConfig');
const CombatConfig = require('./CombatConfig');
const CombatNPCConfig = require('./CombatNPCConfig');
const { getRole, getRandomShipClass } = require('./NPCRole');
const CombatOverlay = require('./CombatOverlay');

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
    constructor(id, x, y, targetHarborId, role = 'TRADER') {
        // Role system (Phase 3.5)
        this.roleName = role;              // String for serialization
        this.role = getRole(role);         // Role configuration object

        // Identity
        this.id = id;
        this.name = this.generateName(role);
        this.type = 'NPC';

        // Spatial (same as Player)
        this.x = x;
        this.y = y;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = 0;

        // Ship (selected from role's ship classes)
        const shipClass = getRandomShipClass(role);
        this.fleet = [new Ship(shipClass)];
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

        // Combat (role-based initialization)
        this.lastShotTimeLeft = 0;
        this.lastShotTimeRight = 0;
        // fireRate set by role (pirates get combat rate, traders get defensive rate)
        this.fireRate = this.role.combatCapable ? CombatConfig.CANNON_FIRE_RATE : 999999;

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

        // Combat state (Phase Combat-NPC 1A: Combat NPCs)
        this.combatTarget = null;  // Player entity ID or null
        this.combatDistance = CombatConfig.PROJECTILE_MAX_DISTANCE * 0.8;  // 80% of max range
        this.combatSide = CombatNPCConfig.DEFAULT_COMBAT_SIDE;  // 'PORT' or 'STARBOARD'

        // Intent system (Phase 3.5: Consolidation)
        this.intent = this.role.defaultIntent;  // Current objective (TRAVEL, ENGAGE, EVADE, WAIT)
        this.intentData = {};                   // Intent-specific data (e.g., targetId, evadeFrom)

        // Combat overlay (Phase 3.5: Combat as capability)
        this.combat = new CombatOverlay(this);

        // Activate combat for aggressive roles (pirates)
        if (this.role.combatAggressive) {
            // Pirates start with combat active, will set target in selectCombatTarget
            this.combat.active = true;
        }

        // Damage tracking (Phase 3.5: Retaliation)
        this.lastAttacker = null;      // ID of entity that last damaged this NPC
        this.lastAttackTime = 0;       // Timestamp of last attack
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
        if (this.isRaft) return 0;
        return this.flagship.shipClass.cannonsPerSide;
    }

    generateName(role) {
        const names = {
            TRADER: ['Merchant Vessel', 'Trading Ship', 'Cargo Runner', 'Supply Ship'],
            PIRATE: ['Pirate Scourge', 'Black Revenge', 'Sea Wolf', 'Crimson Tide', 'Dark Fortune'],
            PATROL: ['HMS Guardian', 'Royal Defender', 'Vigilant', 'Protector', 'Sentinel']
        };
        const nameList = names[role] || ['NPC Ship'];
        return nameList[Math.floor(Math.random() * nameList.length)];
    }

    /**
     * AI Input Computation
     * Phase 2: Predictive navigation with obstacle avoidance
     * Phase Combat-NPC 1A: Combat behavior for pirates
     * Phase 3.5: Intent-based behavior selection
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

        // Intent-based behavior selection
        switch (this.intent) {
            case 'ENGAGE':
                this.executeEngage(world);
                break;
            case 'TRAVEL':
                this.executeTravel(world);
                break;
            case 'WAIT':
                this.executeWait();
                break;
            case 'EVADE':
                // TODO: Implement in Phase 3
                this.executeTravel(world); // Fallback to travel for now
                break;
            case 'DESPAWNING':
                // No inputs needed
                break;
            default:
                console.warn(`[NPC] ${this.id} has unknown intent: ${this.intent}`);
        }
    }

    /**
     * Execute ENGAGE intent (combat behavior)
     * Used by pirates to pursue and attack targets
     */
    executeEngage(world) {
        // Update combat overlay (validate target, deactivate if needed)
        this.combat.update(world);

        // 1. Select combat target
        this.selectCombatTarget(world);

        if (!this.combatTarget) {
            // No target - switch to despawning
            this.intent = 'DESPAWNING';
            this.state = 'DESPAWNING';
            return;
        }

        const target = world.entities[this.combatTarget];
        if (!target) {
            // Target disappeared
            this.combatTarget = null;
            this.intent = 'DESPAWNING';
            this.state = 'DESPAWNING';
            return;
        }

        // 2. Compute combat position and heading
        const combatPos = this.computeCombatPosition(target);
        const distToPosition = Math.hypot(combatPos.x - this.x, combatPos.y - this.y);

        // Blend movement toward position with rotation for broadside
        if (distToPosition > CombatNPCConfig.POSITION_THRESHOLD) {
            // Far from position - move toward it
            const dx = combatPos.x - this.x;
            const dy = combatPos.y - this.y;
            this.desiredHeading = Math.atan2(dy, dx) + Math.PI / 2;
        } else {
            // Near position - rotate for broadside
            this.desiredHeading = this.computeDesiredCombatHeading(target);
        }

        // 3. Update navigation (obstacle avoidance)
        if (this.navUpdateCounter++ >= NavigationConfig.NAV_UPDATE_INTERVAL) {
            this.navUpdateCounter = 0;
            this.updateNavigation(world.worldMap);
        }

        // 4. Steer toward currentHeading
        let angleDiff = this.currentHeading - this.rotation;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const TURN_THRESHOLD = 0.1; // radians (~6 degrees)
        if (angleDiff > TURN_THRESHOLD) {
            this.inputs.right = true;
        } else if (angleDiff < -TURN_THRESHOLD) {
            this.inputs.left = true;
        }

        // 5. Sail management (use half sails)
        if (this.sailState < 1) {
            this.inputs.sailUp = true;
        } else if (this.sailState > 1) {
            this.inputs.sailDown = true;
        }

        // 6. Attempt to fire cannons
        this.attemptCombatFire(world, target);
    }

    /**
     * Execute TRAVEL intent (navigation behavior)
     * Used by traders and patrols to navigate to destinations
     */
    executeTravel(world) {
        // Find target harbor
        const targetHarbor = world.harbors.find(h => h.id === this.targetHarborId);
        if (!targetHarbor) {
            console.warn(`[NPC] ${this.id} has invalid target harbor: ${this.targetHarborId}`);
            this.intent = 'DESPAWNING';
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

        // Defensive combat (Phase 3.5: Damage-based retaliation)
        if (this.role.combatCapable && !this.role.combatAggressive) {
            // Update combat overlay state
            this.combat.update(world);

            console.log(`[NPC-DEBUG] ${this.id} TRAVEL defensive combat check - combatActive: ${this.combat.active}, lastAttacker: ${this.lastAttacker}`);

            // If not currently in combat, check if we were recently attacked
            if (!this.combat.active && this.lastAttacker) {
                const now = Date.now() / 1000;
                const RETALIATION_WINDOW = 30; // Retaliate within 30 seconds of being attacked
                const timeSinceAttack = now - this.lastAttackTime;

                console.log(`[NPC-DEBUG] ${this.id} checking retaliation - timeSinceAttack: ${timeSinceAttack.toFixed(1)}s, window: ${RETALIATION_WINDOW}s`);

                // Only retaliate if attack was recent
                if (timeSinceAttack < RETALIATION_WINDOW) {
                    const attacker = world.entities[this.lastAttacker];

                    console.log(`[NPC-DEBUG] ${this.id} attacker ${this.lastAttacker} exists: ${!!attacker}`);

                    // Validate attacker still exists and is valid target
                    if (attacker && !attacker.inHarbor && !attacker.isRaft) {
                        console.log(`[NPC-DEBUG] ${this.id} ACTIVATING defensive combat against ${this.lastAttacker}`);
                        // Activate defensive combat (return fire without pursuing)
                        const activated = this.combat.activate(this.lastAttacker, true); // true = defensive mode
                        console.log(`[NPC-DEBUG] ${this.id} combat.activate returned: ${activated}, combat.active: ${this.combat.active}`);
                    } else {
                        console.log(`[NPC-DEBUG] ${this.id} attacker invalid (inHarbor: ${attacker?.inHarbor}, isRaft: ${attacker?.isRaft}), clearing`);
                        // Attacker is gone, clear last attacker
                        this.lastAttacker = null;
                    }
                } else {
                    console.log(`[NPC-DEBUG] ${this.id} attack too old, clearing lastAttacker`);
                    this.lastAttacker = null;
                }
            }

            // If in defensive combat, attempt to fire back
            if (this.combat.active) {
                console.log(`[NPC-DEBUG] ${this.id} in combat, target: ${this.combat.target}`);
                const target = world.entities[this.combat.target];
                if (target) {
                    this.attemptCombatFire(world, target);
                } else {
                    console.log(`[NPC-DEBUG] ${this.id} WARNING: combat target ${this.combat.target} not found in world`);
                }
            }
        }

        // Check if reached harbor
        const distance = Math.hypot(dx, dy);
        if (distance < GameConfig.HARBOR_INTERACTION_RADIUS * 2) {
            this.intent = 'WAIT';
            this.state = 'STOPPED';
            this.stateTimer = 5.0; // Stop for 5 seconds
            console.log(`[NPC] ${this.id} arrived at ${targetHarbor.name}`);
        }
    }

    /**
     * Execute WAIT intent (stopped behavior)
     * Used when NPCs are waiting at harbors or waypoints
     */
    executeWait() {
        // Lower sails
        if (this.sailState > 0) {
            this.inputs.sailDown = true;
        }
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
     * Combat: Select Combat Target
     * Finds nearest player within engagement range
     */
    selectCombatTarget(world) {
        let nearestPlayer = null;
        let nearestDist = Infinity;

        for (const id in world.entities) {
            const entity = world.entities[id];
            if (entity.type === 'PLAYER') {
                const dist = Math.hypot(entity.x - this.x, entity.y - this.y);

                // Check if within engagement range
                if (dist < CombatNPCConfig.MAX_ENGAGEMENT_RANGE && dist < nearestDist) {
                    // Validate target (not in harbor, not sunk)
                    if (!entity.inHarbor && !entity.isRaft && entity.flagship && !entity.flagship.isSunk) {
                        nearestDist = dist;
                        nearestPlayer = entity;
                    }
                }
            }
        }

        this.combatTarget = nearestPlayer ? nearestPlayer.id : null;
    }

    /**
     * Detect Nearby Threat (Phase 3.5: Defensive Combat)
     * Finds nearest hostile entity within defensive range
     * Used by traders to detect when they're being attacked
     */
    detectNearbyThreat(world) {
        const THREAT_DETECTION_RANGE = 300; // Detect threats within 300px

        let nearestThreat = null;
        let nearestDist = Infinity;

        for (const id in world.entities) {
            const entity = world.entities[id];

            // Only detect hostile NPCs (pirates), not players
            // Players are not considered threats for defensive combat
            const isHostile = (entity.type === 'NPC' && entity.roleName === 'PIRATE');

            if (isHostile) {
                const dist = Math.hypot(entity.x - this.x, entity.y - this.y);

                // Check if within threat detection range
                if (dist < THREAT_DETECTION_RANGE && dist < nearestDist) {
                    // Validate threat (not in harbor, not sunk)
                    if (!entity.inHarbor && !entity.isRaft && entity.flagship && !entity.flagship.isSunk) {
                        nearestDist = dist;
                        nearestThreat = entity;
                    }
                }
            }
        }

        return nearestThreat;
    }

    /**
     * Combat: Compute Combat Position
     * Returns desired position for broadside attack
     */
    computeCombatPosition(target) {
        // Position perpendicular to target for broadside
        const attackAngle = this.combatSide === 'PORT'
            ? target.rotation + Math.PI / 2   // Attack from target's left
            : target.rotation - Math.PI / 2;  // Attack from target's right

        // Compute position at combatDistance from target
        const goalX = target.x + Math.cos(attackAngle - Math.PI / 2) * this.combatDistance;
        const goalY = target.y + Math.sin(attackAngle - Math.PI / 2) * this.combatDistance;

        return { x: goalX, y: goalY };
    }

    /**
     * Combat: Compute Desired Combat Heading
     * Returns heading for broadside positioning
     */
    computeDesiredCombatHeading(target) {
        // Vector from NPC to target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const angleToTarget = Math.atan2(dy, dx) + Math.PI / 2;

        // Desired heading: perpendicular to target vector for broadside
        const desiredHeading = this.combatSide === 'PORT'
            ? angleToTarget + Math.PI / 2  // Face left of target vector
            : angleToTarget - Math.PI / 2; // Face right of target vector

        return desiredHeading;
    }

    /**
     * Combat: Attempt to Fire Cannons
     * Fires broadsides if target is in range and arc
     */
    attemptCombatFire(world, target) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // Check range (Limit to 90% of max range to ensure better hit probability)
        if (dist > CombatConfig.PROJECTILE_MAX_DISTANCE * 0.9) {
            return; // Out of effective range
        }

        // Check which broadside can fire
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x) + Math.PI / 2;
        let angleDiff = angleToTarget - this.rotation;

        // Normalize to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const BROADSIDE_SECTOR = Math.PI / 18; // ±10° tolerance around 90° for firing (very strict)
        const now = Date.now() / 1000;

        // Starboard firing check (Target must be approx +90° / +PI/2 relative to bow)
        // angleDiff is (TargetDir - ShipDir). If Target is Right, angleDiff ~= PI/2
        if (Math.abs(angleDiff - Math.PI / 2) < BROADSIDE_SECTOR) {
            if (now - this.lastShotTimeRight >= CombatConfig.CANNON_FIRE_RATE) {
                this.inputs.shootRight = true;
                // GameLoop handles timestamp update upon actual firing

                if (CombatNPCConfig.DEBUG_COMBAT) {
                    console.log(`[COMBAT] ${this.id} firing STARBOARD at ${target.id}`);
                }
            } else if (CombatNPCConfig.DEBUG_COMBAT && Math.random() < 0.1) {
                console.log(`[COMBAT] ${this.id} Starboard cooldown (${(now - this.lastShotTimeRight).toFixed(1)}s < ${CombatConfig.CANNON_FIRE_RATE})`);
            }
        }
        // Port firing check (Target must be approx -90° / -PI/2 relative to bow)
        // angleDiff is (TargetDir - ShipDir). If Target is Left, angleDiff ~= -PI/2
        else if (Math.abs(angleDiff + Math.PI / 2) < BROADSIDE_SECTOR) {
            if (now - this.lastShotTimeLeft >= CombatConfig.CANNON_FIRE_RATE) {
                this.inputs.shootLeft = true;
                // GameLoop handles timestamp update upon actual firing

                if (CombatNPCConfig.DEBUG_COMBAT) {
                    console.log(`[COMBAT] ${this.id} firing PORT at ${target.id}`);
                }
            } else if (CombatNPCConfig.DEBUG_COMBAT && Math.random() < 0.1) {
                console.log(`[COMBAT] ${this.id} Port cooldown (${(now - this.lastShotTimeLeft).toFixed(1)}s < ${CombatConfig.CANNON_FIRE_RATE})`);
            }
        }
        else if (CombatNPCConfig.DEBUG_COMBAT && Math.random() < 0.05) {
            // Log angle mismatch occasionally (5% chance per tick to avoid spam)
            const deg = angleDiff * 180 / Math.PI;
            console.log(`[COMBAT] ${this.id} NO SHOT - Angle: ${deg.toFixed(0)}° (Need ~90° or ~-90°)`);
        }
    }

    /**
     * Take damage from projectiles
     * Simplified version of Player.takeDamage (no shields, no rafts, no kill messages)
     */
    takeDamage(amount, damageSource = null) {
        if (this.isRaft) return; // Safety check (NPCs don't become rafts in Phase 1)

        this.flagship.takeDamage(amount);
        console.log(`[NPC] ${this.id} took ${amount} damage (${this.flagship.health}/${this.flagship.maxHealth} HP)`);

        // Track last attacker for retaliation (Phase 3.5)
        if (damageSource) {
            this.lastAttacker = damageSource;
            this.lastAttackTime = Date.now() / 1000;
        }

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
