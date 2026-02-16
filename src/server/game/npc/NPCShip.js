const Ship = require('../entities/Ship');
const GameConfig = require('../config/GameConfig');
const { GAME, PHYSICS, COMBAT, NAVIGATION } = GameConfig;
const { getRole, getRandomShipClass, NPCCombatOverlay } = require('./NPCBehavior');

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
        this.fireRate = this.role.combatCapable ? COMBAT.CANNON_FIRE_RATE : 999999;

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
        this.combatDistance = COMBAT.PROJECTILE_MAX_DISTANCE * 0.8;  // 80% of max range
        this.combatSide = NPCCombatOverlay.Config.DEFAULT_COMBAT_SIDE;  // 'PORT' or 'STARBOARD'

        // Intent system (Phase 3.5: Consolidation)
        this.intent = this.role.defaultIntent;  // Current objective (TRAVEL, ENGAGE, EVADE, WAIT)
        this.intentData = {};                   // Intent-specific data (e.g., targetId, evadeFrom)

        // Combat overlay (Phase 3.5: Combat as capability)
        this.combat = new NPCCombatOverlay(this);

        // Activate combat for aggressive roles (pirates)
        if (this.role.combatAggressive) {
            // Pirates start with combat active, will set target in selectCombatTarget
            this.combat.active = true;
        }

        // Damage tracking (Phase 3.5: Retaliation)
        this.lastAttacker = null;      // ID of entity that last damaged this NPC
        this.lastAttackTime = 0;       // Timestamp of last attack
        this.lastLoggedHealth = null;  // Last health value we logged (for reducing spam)

        // Escort mission support (Phase 4: Escort improvements)
        this.speedMultiplier = 1.0;    // Speed adjustment for escort missions
        this.spawnX = x;               // Original spawn position (for mission progress)
        this.spawnY = y;               // Original spawn position (for mission progress)
    }

    get flagship() {
        if (this.isRaft) return null;
        return this.fleet[this.flagshipIndex];
    }

    get maxSpeed() {
        if (this.isRaft) return PHYSICS.RAFT_SPEED;
        return this.flagship.shipClass.maxSpeed;
    }

    get turnSpeed() {
        if (this.isRaft) return PHYSICS.RAFT_TURN_SPEED;
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
                this.executeEvade(world);
                break;
            case 'DESPAWNING':
                // No inputs needed
                break;

            case 'ARRIVED':
                // NPC has arrived at destination, do nothing (about to despawn)
                // Just lower sails and wait for despawn
                if (this.sailState > 0) {
                    this.inputs.sailDown = true;
                }
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
        if (distToPosition > NPCCombatOverlay.Config.POSITION_THRESHOLD) {
            // Far from position - move toward it
            const dx = combatPos.x - this.x;
            const dy = combatPos.y - this.y;
            this.desiredHeading = Math.atan2(dy, dx) + Math.PI / 2;
        } else {
            // Near position - rotate for broadside
            this.desiredHeading = this.computeDesiredCombatHeading(target);
        }

        // 3. Update navigation (obstacle avoidance)
        if (this.navUpdateCounter++ >= NAVIGATION.NAV_UPDATE_INTERVAL) {
            this.navUpdateCounter = 0;
            this.updateNavigation(world);
        }

        // 4. Steer toward currentHeading
        // Steering
        let angleDiff = this.currentHeading - this.rotation;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        const TURN_THRESHOLD = 0.1;
        if (angleDiff > TURN_THRESHOLD) {
            this.inputs.right = true;
        } else if (angleDiff < -TURN_THRESHOLD) {
            this.inputs.left = true;
        }

        // Sail management: Pursuit vs Combat positioning
        // - Far from target (pursuing): Full sails to catch up
        // - Near target (combat positioning): Half sails for maneuvering
        const PURSUIT_DISTANCE = NPCCombatOverlay.Config.COMBAT_DISTANCE * 1.5; // 1.5x combat distance
        const targetSailState = distToPosition > PURSUIT_DISTANCE ? 2 : 1; // Full sails if pursuing, half if positioning

        if (this.sailState < targetSailState) {
            this.inputs.sailUp = true;
        } else if (this.sailState > targetSailState) {
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
        if (this.navUpdateCounter++ >= NAVIGATION.NAV_UPDATE_INTERVAL) {
            this.navUpdateCounter = 0;
            this.updateNavigation(world);
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

        // Sail management
        // TRAVEL intent = determined movement to destination (full sails)
        // This allows speedMultiplier to work from maximum base speed
        if (this.sailState < 2) {
            this.inputs.sailUp = true;
        } else if (this.sailState > 2) {
            this.inputs.sailDown = true;
        }

        // Defensive combat (Phase 3.5: Damage-based retaliation)
        if (this.role.combatCapable && !this.role.combatAggressive) {
            // Update combat overlay state
            this.combat.update(world);

            // If not currently in combat, check if we were recently attacked
            if (!this.combat.active && this.lastAttacker) {
                const now = Date.now() / 1000;
                const RETALIATION_WINDOW = 30; // Retaliate within 30 seconds of being attacked
                const timeSinceAttack = now - this.lastAttackTime;

                // Only retaliate if attack was recent
                if (timeSinceAttack < RETALIATION_WINDOW) {
                    const attacker = world.entities[this.lastAttacker];

                    // Validate attacker still exists and is valid target
                    if (attacker && !attacker.inHarbor && !attacker.isRaft) {
                        // Activate defensive combat (return fire without pursuing)
                        const wasActivated = this.combat.activate(this.lastAttacker, true); // true = defensive mode
                        if (wasActivated) {
                            console.log(`[NPC] ${this.id} retaliating against ${this.lastAttacker}`);
                            // Clear lastAttacker so we don't keep re-activating
                            this.lastAttacker = null;
                        }
                    } else {
                        // Attacker is gone, clear last attacker
                        this.lastAttacker = null;
                    }
                } else {
                    this.lastAttacker = null;
                }
            }

            // If in defensive combat, attempt to fire back
            if (this.combat.active) {
                const target = world.entities[this.combat.target];
                if (target) {
                    this.attemptCombatFire(world, target);
                }
            }
        }

        // Check if reached harbor
        const distance = Math.hypot(dx, dy);
        if (distance < GAME.HARBOR_INTERACTION_RADIUS * 2) {
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
     * Execute EVADE intent (flee behavior)
     * Used when NPCs are damaged below flee threshold
     */
    executeEvade(world) {
        const EVADE_DURATION = 30; // Flee for 30 seconds
        const SAFE_DISTANCE = 600; // Consider safe when this far from threat

        // Check if evade timeout or safe
        const now = Date.now() / 1000;
        const evadeDuration = now - this.intentData.evadeStartTime;

        // Calculate distance to threat
        let distanceToThreat = Infinity;
        if (this.intentData.evadeFrom) {
            const threat = world.entities[this.intentData.evadeFrom];
            if (threat) {
                distanceToThreat = Math.hypot(threat.x - this.x, threat.y - this.y);
            }
        }

        // Check if safe to return to default intent
        if (evadeDuration > EVADE_DURATION || distanceToThreat > SAFE_DISTANCE) {
            console.log(`[NPC] ${this.id} safe, returning to ${this.role.defaultIntent}`);
            this.intent = this.role.defaultIntent;
            this.intentData = {};
            return;
        }

        // Flee away from threat
        if (this.intentData.evadeFrom) {
            const threat = world.entities[this.intentData.evadeFrom];
            if (threat) {
                // Calculate direction away from threat
                const dx = this.x - threat.x;
                const dy = this.y - threat.y;
                this.desiredHeading = Math.atan2(dy, dx) + Math.PI / 2;
            }
        }

        // Update navigation (obstacle avoidance)
        if (this.navUpdateCounter++ >= NAVIGATION.NAV_UPDATE_INTERVAL) {
            this.navUpdateCounter = 0;
            this.updateNavigation(world);
        }

        // Steer toward desired heading
        const angleDiff = this.currentHeading - this.desiredHeading;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        if (Math.abs(normalizedDiff) > 0.1) {
            if (normalizedDiff > 0) {
                this.inputs.right = true;
            } else {
                this.inputs.left = true;
            }
        }

        // Full sails to flee quickly
        if (this.sailState < 2) {
            this.inputs.sailUp = true;
        }
    }

    /**
     * Update Navigation - Predictive obstacle avoidance
     * Checks for obstacles ahead and adjusts currentHeading accordingly
     */
    /**
     * Update Navigation - Predictive obstacle avoidance
     * Checks for obstacles ahead and adjusts currentHeading accordingly
     */
    updateNavigation(world) {
        const lookAhead = NAVIGATION.LOOK_AHEAD_TILES * GAME.TILE_SIZE;
        const worldMap = world.worldMap;

        // Check both current and desired headings
        // Now checks for BOTH land (via worldMap) and ships (via world.entities)
        const currentIsClear = this.isHeadingClear(this.currentHeading, lookAhead, world);
        const desiredIsClear = this.isHeadingClear(this.desiredHeading, lookAhead, world);

        if (currentIsClear && desiredIsClear) {
            // Both paths clear - gradually converge to desired heading
            this.currentHeading = this.smoothInterpolate(
                this.currentHeading,
                this.desiredHeading,
                NAVIGATION.NPC_TURN_SMOOTHING * (1 / 60)
            );

            if (NAVIGATION.DEBUG_NAVIGATION) {
                console.log(`[NAV] ${this.id} | Both clear, converging to desired`);
            }
        } else if (!currentIsClear && desiredIsClear) {
            // Current blocked, desired clear - re-acquire direct path
            this.currentHeading = this.smoothInterpolate(
                this.currentHeading,
                this.desiredHeading,
                NAVIGATION.NPC_TURN_SMOOTHING * (1 / 60)
            );

            if (NAVIGATION.DEBUG_NAVIGATION) {
                console.log(`[NAV] ${this.id} | Re-acquiring direct path`);
            }
        } else if (!currentIsClear) {
            // Current path blocked - find alternative
            const alternative = this.findClearHeading(world, lookAhead);
            if (alternative !== null) {
                this.currentHeading = alternative;

                if (NAVIGATION.DEBUG_NAVIGATION) {
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
     * Check if a heading is clear of obstacles (Land AND Ships)
     * @param {number} heading - Heading to test (radians)
     * @param {number} lookAheadDistance - Distance to look ahead (pixels)
     * @param {World} world - World instance for entity & map access
     * @returns {boolean} True if path is clear
     */
    isHeadingClear(heading, lookAheadDistance, world) {
        const samples = Math.ceil(lookAheadDistance / GAME.TILE_SIZE);
        const worldMap = world.worldMap;

        // 1. Check Land Obstacles along the ray
        for (let i = 1; i <= samples; i++) {
            const dist = i * GAME.TILE_SIZE;
            const x = this.x + Math.cos(heading - Math.PI / 2) * dist;
            const y = this.y + Math.sin(heading - Math.PI / 2) * dist;

            if (worldMap.isLand(x, y)) {
                return false; // Land Detected
            }
        }

        // 2. Check Ship Obstacles (Simple Bounding Circle Check)
        // Check a point halfway along the lookAhead ray for nearby ships
        const checkDist = lookAheadDistance * 0.5;
        const checkX = this.x + Math.cos(heading - Math.PI / 2) * checkDist;
        const checkY = this.y + Math.sin(heading - Math.PI / 2) * checkDist;

        // Radius to check for other ships (LookAhead/2 radius covers the path roughly)
        // Optimization: Don't iterate all entities if possible, but for <50 ships it's fine
        const detectionRadius = lookAheadDistance * 0.6;

        for (const id in world.entities) {
            const entity = world.entities[id];

            // Skip self and non-ships (e.g. projectiles if stored in entities, though they aren't)
            if (entity.id === this.id) continue;
            if (entity.type !== 'PLAYER' && entity.type !== 'NPC') continue;
            if (entity.isRaft) continue; // Ignore rafts for navigation (can sail through/push)

            const dx = entity.x - checkX;
            const dy = entity.y - checkY;
            const distSq = dx * dx + dy * dy;

            if (distSq < detectionRadius * detectionRadius) {
                // Ship detected in path
                return false;
            }
        }

        return true; // Path is clear
    }

    /**
     * Find a clear alternative heading
     * Tests search angles and returns first clear heading that makes forward progress
     * @param {World} world - World instance
     * @param {number} lookAheadDistance - Distance to look ahead
     * @returns {number|null} Clear heading or null if none found
     */
    findClearHeading(world, lookAheadDistance) {
        for (const angle of NAVIGATION.SEARCH_ANGLES) {
            const testHeading = this.desiredHeading + angle;

            // Check if heading is clear
            if (this.isHeadingClear(testHeading, lookAheadDistance, world)) {
                // Check if still making forward progress toward target
                const progressDot = Math.cos(testHeading - this.desiredHeading);

                if (progressDot >= NAVIGATION.MIN_PROGRESS_DOT) {
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
     * If combatTarget is already set (e.g., by mission), validates it instead of searching
     */
    selectCombatTarget(world) {
        const previousTarget = this.combatTarget; // Track for logging

        // If we already have a target assigned (e.g., by escort mission), validate it
        if (this.combatTarget) {
            const currentTarget = world.entities[this.combatTarget];

            // Keep current target if it's valid (same criteria as search)
            if (currentTarget && !currentTarget.inHarbor && !currentTarget.isRaft &&
                currentTarget.flagship && !currentTarget.flagship.isSunk) {
                const dist = Math.hypot(currentTarget.x - this.x, currentTarget.y - this.y);

                // Keep target if within engagement range
                if (dist < NPCCombatOverlay.Config.MAX_ENGAGEMENT_RANGE) {
                    return; // Keep existing target
                }
            }

            // Current target invalid, clear it
            this.combatTarget = null;
        }

        // Search for nearest valid target
        let nearestPlayer = null;
        let nearestDist = Infinity;

        for (const id in world.entities) {
            const entity = world.entities[id];
            if (entity.type === 'PLAYER' || entity.type === 'NPC') {
                const dist = Math.hypot(entity.x - this.x, entity.y - this.y);

                // Check if within engagement range
                if (dist < NPCCombatOverlay.Config.MAX_ENGAGEMENT_RANGE && dist < nearestDist) {
                    // Validate target (not in harbor, not sunk)
                    if (!entity.inHarbor && !entity.isRaft && entity.flagship && !entity.flagship.isSunk) {
                        // Don't target self
                        if (entity.id !== this.id) {
                            // Don't target NPCs with the same role (prevent pirate vs pirate)
                            if (entity.type === 'PLAYER' || entity.roleName !== this.roleName) {
                                nearestDist = dist;
                                nearestPlayer = entity;
                            }
                        }
                    }
                }
            }
        }

        this.combatTarget = nearestPlayer ? nearestPlayer.id : null;

        // Only log when target changes
        if (this.combatTarget !== previousTarget) {
            console.log(`[NPC] ${this.id} target changed: ${previousTarget || 'none'} → ${this.combatTarget || 'none'} (${nearestPlayer?.type})`);
        }
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
        // Extract numeric ID for deterministic formation (npc_pirate_12 -> 12)
        const idNum = parseInt(this.id.split('_').pop()) || 0;

        // Create a spread of offsets: -0.4, 0, +0.4 radians (~23 degrees)
        // This prevents all pirates from seeking the exact same pixel
        const formationOffset = (idNum % 3 - 1) * 0.4;

        // Position perpendicular to target for broadside + formation offset
        const attackAngle = (this.combatSide === 'PORT'
            ? target.rotation + Math.PI / 2   // Attack from target's left
            : target.rotation - Math.PI / 2)  // Attack from target's right
            + formationOffset;

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
        if (dist > COMBAT.PROJECTILE_MAX_DISTANCE * 0.9) {
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
            if (now - this.lastShotTimeRight >= COMBAT.CANNON_FIRE_RATE) {
                this.inputs.shootRight = true;
                // GameLoop handles timestamp update upon actual firing

                if (NPCCombatOverlay.Config.DEBUG_COMBAT) {
                    console.log(`[COMBAT] ${this.id} firing STARBOARD at ${target.id}`);
                }
            } else if (NPCCombatOverlay.Config.DEBUG_COMBAT && Math.random() < 0.1) {
                console.log(`[COMBAT] ${this.id} Starboard cooldown (${(now - this.lastShotTimeRight).toFixed(1)}s < ${COMBAT.CANNON_FIRE_RATE})`);
            }
        }
        // Port firing check (Target must be approx -90° / -PI/2 relative to bow)
        // angleDiff is (TargetDir - ShipDir). If Target is Left, angleDiff ~= -PI/2
        else if (Math.abs(angleDiff + Math.PI / 2) < BROADSIDE_SECTOR) {
            if (now - this.lastShotTimeLeft >= COMBAT.CANNON_FIRE_RATE) {
                this.inputs.shootLeft = true;
                // GameLoop handles timestamp update upon actual firing

                if (NPCCombatOverlay.Config.DEBUG_COMBAT) {
                    console.log(`[COMBAT] ${this.id} firing PORT at ${target.id}`);
                }
            } else if (NPCCombatOverlay.Config.DEBUG_COMBAT && Math.random() < 0.1) {
                console.log(`[COMBAT] ${this.id} Port cooldown (${(now - this.lastShotTimeLeft).toFixed(1)}s < ${COMBAT.CANNON_FIRE_RATE})`);
            }
        }
        else if (NPCCombatOverlay.Config.DEBUG_COMBAT && Math.random() < 0.05) {
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

        const oldHealth = this.flagship.health;
        this.flagship.takeDamage(amount);
        const newHealth = this.flagship.health;

        // Log damage only at significant thresholds to reduce spam
        const shouldLog =
            this.lastLoggedHealth === null ||  // First hit
            newHealth === 0 ||  // Sunk
            Math.floor(newHealth / 50) < Math.floor(this.lastLoggedHealth / 50);  // Crossed a 50 HP threshold

        if (shouldLog) {
            console.log(`[NPC] ${this.id} took damage (${newHealth}/${this.flagship.maxHealth} HP)`);
            this.lastLoggedHealth = newHealth;
        }

        // Track last attacker for retaliation (Phase 3.5)
        if (damageSource) {
            this.lastAttacker = damageSource;
            this.lastAttackTime = Date.now() / 1000;
        }

        // Check if should flee (Phase 3.5: EVADE intent)
        const healthRatio = newHealth / this.flagship.maxHealth;
        if (healthRatio < this.role.fleeThreshold && this.intent !== 'EVADE') {
            // Switch to EVADE intent
            this.intent = 'EVADE';
            this.intentData = {
                evadeFrom: this.lastAttacker,  // Flee from whoever damaged us
                evadeStartTime: Date.now() / 1000
            };
            // Deactivate combat when fleeing
            this.combat.deactivate();
            console.log(`[NPC] ${this.id} fleeing (${Math.floor(healthRatio * 100)}% HP)`);
        }

        // Check if flagship sunk
        if (this.flagship.isSunk) {
            // CRITICAL: Prevent duplicate death processing
            // If already despawning, skip all death logic
            if (this.state === 'DESPAWNING') {
                return;
            }

            console.log(`[NPC] ${this.id} sunk, despawning`);

            // Grant combat reward to killer (Phase 2: Combat rewards)
            if (damageSource && this.world && this.world.rewardSystem) {
                const killer = this.world.getEntity(damageSource);
                if (killer && killer.type === 'PLAYER') {
                    // Map NPC role to reward key
                    // Map NPC role to reward key
                    const rewardKey = this.roleName === 'PIRATE'
                        ? 'COMBAT.PIRATE_SUNK'
                        : 'COMBAT.TRADER_SUNK';

                    this.world.rewardSystem.grant(
                        damageSource,
                        rewardKey,
                        { source: `NPC: ${this.role.name}` }
                    );
                }
            }

            // Notify mission manager (Phase 0: Mission scaffolding)
            if (this.world && this.world.missionManager) {
                this.world.missionManager.onNPCDefeated(this.id, damageSource);
            }

            this.state = 'DESPAWNING';

            // Create Wreck (Visual & Loot)
            if (this.world) {
                // NPCs don't have fleetCargo yet (Phase 1), so pass empty object
                // Wreck class will handle generating basic loot (wood/cloth + gold)
                this.world.createWreck(this.x, this.y, damageSource, {});
            }
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
        // Decrement state timer
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;

            // When timer expires, set ARRIVED intent
            if (this.state === 'STOPPED') {
                if (this.stateTimer <= 0) {
                    // Set ARRIVED intent (for mission tracking)
                    if (this.intent !== 'ARRIVED') {
                        this.intent = 'ARRIVED';
                        console.log(`[NPC] ${this.id} finished stop, despawning`);
                        // Give mission system 0.5 seconds to detect ARRIVED before despawning
                        this.stateTimer = 0.5;
                    } else {
                        // Already set ARRIVED, now despawn
                        this.state = 'DESPAWNING';
                    }
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
                this.sailChangeCooldown = PHYSICS.SAIL_CHANGE_COOLDOWN;
            }
            if (this.inputs.sailDown && this.sailState > 0) {
                this.sailState--;
                this.sailChangeCooldown = PHYSICS.SAIL_CHANGE_COOLDOWN;
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
                targetSpeed = this.maxSpeed * sailModifier * windStrength * windAngleModifier * this.speedMultiplier;
            } else {
                targetSpeed = this.maxSpeed * sailModifier * PHYSICS.SHALLOW_WATER_SPEED_MULTIPLIER * this.speedMultiplier;
            }
        }

        this.windEfficiency = windAngleModifier;

        // Accelerate/Decelerate (same as Player)
        const accel = this.isInDeepWater ? PHYSICS.ACCELERATION : PHYSICS.ACCELERATION * 0.5;
        const decel = this.isInDeepWater ? PHYSICS.DECELERATION : PHYSICS.DECELERATION * 1.5;

        if (this.speed < targetSpeed) {
            this.speed += accel * deltaTime;
        } else if (this.speed > targetSpeed) {
            this.speed -= decel * deltaTime;
        }

        this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));
        this.speedInKnots = Math.round(this.speed * PHYSICS.SPEED_TO_KNOTS_MULTIPLIER);

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
        if (this.x < 0) this.x += GAME.WORLD_WIDTH;
        if (this.x > GAME.WORLD_WIDTH) this.x -= GAME.WORLD_WIDTH;
        if (this.y < 0) this.y += GAME.WORLD_HEIGHT;
        if (this.y > GAME.WORLD_HEIGHT) this.y -= GAME.WORLD_HEIGHT;
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
            maxSpeedInKnots: Math.round(this.maxSpeed * PHYSICS.SPEED_TO_KNOTS_MULTIPLIER),
            windEfficiency: this.windEfficiency || 0,
            isInDeepWater: this.isInDeepWater,
            shipClassName: this.isRaft ? 'Raft' : this.flagship.shipClass.name,
            isRaft: this.isRaft,
            hasShield: false, // NPCs don't have shields
            fleetSize: this.fleet.length,
            navigationSkill: 1,
            nearHarbor: this.nearHarbor,
            reloadLeft: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeLeft)),
            reloadRight: Math.max(0, this.fireRate - ((Date.now() / 1000) - this.lastShotTimeRight)),
            maxReload: this.fireRate
        };
    }
}

module.exports = NPCShip;
