const World = require('./world/World');
const Player = require('./entities/Player');
const GameConfig = require('./config/GameConfig');
const { GAME, COMBAT } = GameConfig;
const { NPCCombatOverlay } = require('./npc/NPCBehavior');
const EconomySystem = require('./economy/EconomySystem');

class GameLoop {
    constructor(io) {
        this.io = io;
        this.world = new World();
        this.lastTime = Date.now();
        this.tickRate = GAME.TICK_RATE;
        this.interval = null;

        // Performance monitoring
        this.tickTimes = [];
        this.monitoringInterval = null;

        // DEBUG ONLY: Track first-time events for early-session collision diagnosis
        // NO gameplay behavior change
        this.firstTickLogged = false;
        this.firstProjectileLogged = false;

        // Economy system (Phase 0: Harbor Master)
        this.economySystem = new EconomySystem(this.world.harborRegistry);
    }

    start() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000 / this.tickRate);

        // Start performance monitoring (log every 10 seconds)
        // TODO: Make monitoring interval configurable (TECH_DEBT_001)
        // WHY: Hardcoded 10s interval may be too frequent for production
        // REFACTOR: Move to GameConfig.PERFORMANCE_LOG_INTERVAL
        // WHEN: Before production deployment
        this.monitoringInterval = setInterval(() => {
            this.logPerformance();
        }, 10000);
    }

    stop() {
        clearInterval(this.interval);
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    logPerformance() {
        if (this.tickTimes.length === 0) return;

        const avgTick = this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length;
        const maxTick = Math.max(...this.tickTimes);

        // Count NPCs and Players separately
        let playerCount = 0;
        let npcCount = 0;
        for (const id in this.world.entities) {
            const entity = this.world.entities[id];
            if (entity.type === 'PLAYER') {
                playerCount++;
            } else if (entity.type === 'NPC') {
                npcCount++;
            }
        }
        const projectileCount = this.world.projectiles.length;

        console.log(`[Performance] Avg tick: ${avgTick.toFixed(2)}ms | Max: ${maxTick.toFixed(2)}ms | Players: ${playerCount} | NPCs: ${npcCount} | Projectiles: ${projectileCount}`);

        // Warn if performance is degrading
        // TODO: Make performance threshold configurable (TECH_DEBT_002)
        // WHY: Hardcoded 16.67ms threshold assumes 60 FPS requirement
        // REFACTOR: Move to GameConfig.MAX_TICK_TIME_MS with dynamic adjustment
        // WHEN: If tick rate becomes configurable or variable
        if (avgTick > 16.67) {
            console.warn(`⚠️  WARNING: Average tick time (${avgTick.toFixed(2)}ms) exceeds 60 FPS target (16.67ms)`);
        }

        this.tickTimes = []; // Reset for next interval
    }

    stop() {
        clearInterval(this.interval);
    }

    update() {
        const tickStart = Date.now();
        const now = tickStart;
        const deltaTime = (now - this.lastTime) / 1000; // in seconds
        this.lastTime = now;

        // DEBUG ONLY: Track first tick for early-session collision diagnosis
        // NO gameplay behavior change
        if (COMBAT.DEBUG_INITIALIZATION && !this.firstTickLogged) {
            const entityCount = Object.keys(this.world.entities).length;
            const projectileCount = this.world.projectiles.length;
            console.log(`[INIT] First tick executed | DeltaTime: ${deltaTime.toFixed(4)} | Entities: ${entityCount} | Projectiles: ${projectileCount}`);
            this.firstTickLogged = true;
        }

        this.world.update(deltaTime);

        // Process NPC firing inputs (NPCs set inputs, but need GameLoop to fire)
        for (const id in this.world.entities) {
            const entity = this.world.entities[id];
            if (entity.type === 'NPC' && !entity.isRaft) {
                const now = Date.now() / 1000;

                // Handle NPC Left Broadside (Port) - Shields prevent firing
                if (entity.inputs.shootLeft && !entity.hasShield) {
                    if (now - entity.lastShotTimeLeft >= entity.fireRate) {
                        if (NPCCombatOverlay.Config.DEBUG_COMBAT) console.log(`[GAMELOOP] NPC firing LEFT (Port) for ${id}`);

                        const baseAngle = entity.rotation + Math.PI;
                        this.fireCannons(entity, baseAngle);
                        entity.lastShotTimeLeft = now;
                    }
                }

                // Handle NPC Right Broadside (Starboard) - Shields prevent firing
                if (entity.inputs.shootRight && !entity.hasShield) {
                    if (now - entity.lastShotTimeRight >= entity.fireRate) {
                        if (NPCCombatOverlay.Config.DEBUG_COMBAT) console.log(`[GAMELOOP] NPC firing RIGHT (Starboard) for ${id}`);

                        const baseAngle = entity.rotation;
                        this.fireCannons(entity, baseAngle);
                        entity.lastShotTimeRight = now;
                    }
                }
            }
        }

        // Send game state to all connected clients
        this.io.emit('gamestate_update', this.world.getState());

        // Track tick performance
        const tickDuration = Date.now() - tickStart;
        this.tickTimes.push(tickDuration);
    }

    addPlayer(socket, playerName = 'Anonymous', customSpawn = null) {
        // Validate player name
        if (!this.isValidPlayerName(playerName)) {
            console.log(`Rejected invalid name from ${socket.id}: "${playerName}"`);
            socket.emit('nameRejected', { reason: 'Invalid name. Use 3-20 characters (letters, numbers, spaces only).' });
            socket.disconnect();
            return false;
        }

        // Check for duplicate names
        if (this.isNameTaken(playerName)) {
            console.log(`Rejected duplicate name from ${socket.id}: "${playerName}"`);
            socket.emit('nameRejected', { reason: 'Name already in use. Please choose another name.' });
            socket.disconnect();
            return false;
        }

        // Pass io and world references for kill message emission
        const player = new Player(socket.id, playerName, 'FLUYT', this.io, this.world);

        // DEBUG ONLY: Track player join for early-session collision diagnosis
        // NO gameplay behavior change
        if (COMBAT.DEBUG_INITIALIZATION) {
            const entityCount = Object.keys(this.world.entities).length;
            console.log(`[INIT] Player joined | ID: ${socket.id} | Name: ${playerName} | Entities in world: ${entityCount}`);
        }

        // Use custom spawn if provided (for testing), otherwise find safe position
        let spawnPosition;
        if (customSpawn && customSpawn.x !== undefined && customSpawn.y !== undefined) {
            spawnPosition = customSpawn;
            console.log(`[DEBUG] Custom spawn for ${playerName}: (${customSpawn.x}, ${customSpawn.y})`);
        } else {
            spawnPosition = this.findSafeSpawnPosition();
        }

        player.x = spawnPosition.x;
        player.y = spawnPosition.y;

        this.world.addEntity(player);

        // Send static map data to the new player (only once)
        socket.emit('map_data', this.world.getMapData());

        // Send ship metadata to the new player (only once)
        this.sendShipMetadata(socket);

        console.log(`Player "${playerName}" (${socket.id}) joined the game`);
        return true;
    }

    sendShipMetadata(socket) {
        const { SHIP_CLASSES } = require('./entities/ShipClass');

        // Extract only visual properties needed by client
        const shipMetadata = {};
        for (const [key, shipClass] of Object.entries(SHIP_CLASSES)) {
            shipMetadata[shipClass.name] = {
                spriteWidth: shipClass.spriteWidth,
                spriteHeight: shipClass.spriteHeight,
                spriteRotation: shipClass.spriteRotation,
                spriteFile: shipClass.spriteFile,
                hitboxWidthFactor: shipClass.hitboxWidthFactor,
                hitboxHeightFactor: shipClass.hitboxHeightFactor
            };
        }

        socket.emit('shipMetadata', shipMetadata);

        // Send combat config for visual rendering
        this.sendCombatConfig(socket);
    }

    sendCombatConfig(socket) {
        // Extract only visual properties needed by client
        const combatVisuals = {
            projectileBallRadius: COMBAT.PROJECTILE_BALL_RADIUS,
            projectileShadowRadius: COMBAT.PROJECTILE_SHADOW_RADIUS
        };

        socket.emit('combatConfig', combatVisuals);
    }

    isValidPlayerName(name) {
        if (!name || typeof name !== 'string') return false;

        // Trim whitespace for validation
        const trimmed = name.trim();

        // Check length (3-20 characters)
        if (trimmed.length < 3 || trimmed.length > 20) return false;

        // Check characters (alphanumeric + spaces only)
        if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) return false;

        return true;
    }

    isNameTaken(name) {
        const normalizedName = name.toLowerCase().trim();

        for (const id in this.world.entities) {
            const entity = this.world.entities[id];
            if (entity.type === 'PLAYER') {
                const entityName = entity.name.toLowerCase().trim();
                if (entityName === normalizedName) {
                    return true;
                }
            }
        }

        return false;
    }

    findSafeSpawnPosition() {
        const maxAttempts = 50;

        // Nassau area spawn (Bahamas - many nearby harbors)
        // Nassau corrected coordinates: tile (1661, 420) = world (41525, 10500)
        const spawnCenterX = 41525;
        const spawnCenterY = 10500;
        const spawnRange = 500;  // 500 pixel radius to find water near Nassau

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = spawnCenterX + (Math.random() - 0.5) * spawnRange * 2;
            const y = spawnCenterY + (Math.random() - 0.5) * spawnRange * 2;

            // Check if position is safe (tile-based: must be water, not land or shallow)
            const isWater = this.world.worldMap.isWater(x, y);

            if (isWater) {
                return { x, y };
            }
        }

        // Fallback: return a position anyway (shouldn't happen with proper spawn area)
        console.warn('Could not find safe spawn position after 50 attempts, using fallback');
        return {
            x: spawnCenterX,
            y: spawnCenterY
        };
    }

    removePlayer(id) {
        this.world.removeEntity(id);
    }

    handleInput(id, inputData) {
        const player = this.world.getEntity(id);
        if (player) {
            player.handleInput(inputData);

            const now = Date.now() / 1000;

            // Handle Broadside Left (Q) - Rafts cannot fire, shields prevent firing
            if (inputData.shootLeft && !player.isRaft && !player.hasActiveShield()) {
                if (now - player.lastShotTimeLeft >= player.fireRate) {
                    // DESIGN CONTRACT: Arcade cannon firing
                    // - Projectiles fire exactly perpendicular to ship heading
                    // - NO velocity compensation or physics inheritance
                    // - Direction determined ONCE at fire time, never modified
                    // - Port broadside fires at rotation + PI (180° from heading)
                    const baseAngle = player.rotation + Math.PI;
                    this.fireCannons(player, baseAngle);
                    player.lastShotTimeLeft = now;
                }
            }

            // Handle Broadside Right (E) - Rafts cannot fire, shields prevent firing
            if (inputData.shootRight && !player.isRaft && !player.hasActiveShield()) {
                if (now - player.lastShotTimeRight >= player.fireRate) {
                    // DESIGN CONTRACT: Arcade cannon firing
                    // - Projectiles fire exactly perpendicular to ship heading
                    // - NO velocity compensation or physics inheritance
                    // - Direction determined ONCE at fire time, never modified
                    // - Starboard broadside fires at rotation (same as heading)
                    const baseAngle = player.rotation;
                    this.fireCannons(player, baseAngle);
                    player.lastShotTimeRight = now;
                }
            }
        }
    }

    fireCannons(player, baseAngle) {
        const cannonCount = player.cannonsPerSide;

        if (cannonCount === 0) {
            if (NPCCombatOverlay.Config.DEBUG_COMBAT) console.warn(`[GAMELOOP] ${player.id} tried to fire but has 0 cannons!`);
            return; // No cannons (shouldn't happen, but safety check)
        }

        // Get ship class for dimensions
        const shipClass = player.flagship.shipClass;
        const shipLength = shipClass.spriteHeight; // Length along ship's axis
        const shipWidth = shipClass.spriteWidth;

        // Calculate spacing between cannons along the ship's length
        const spacing = shipLength / cannonCount;
        // TODO: Make cannon spread factor configurable per ship class (TECH_DEBT_004)
        // WHY: Hardcoded 0.4 doesn't allow per-ship customization
        // REFACTOR: Move to ShipClass property (cannonSpreadFactor)
        // WHEN: When balancing different ship classes or adding new ships
        const cannonSpreadFactor = 0.4; // Compress cannons toward middle (0.5 = half the ship length)

        // BROADSIDE DETECTION: Determine which side is firing based on projectile angle
        // GAMEPLAY RULE: Q key fires left (port), E key fires right (starboard)
        // ANGLE MAPPING:
        //   - Q key (left): baseAngle = rotation + PI (180° from ship's heading)
        //   - E key (right): baseAngle = rotation (same as ship's heading)
        // CHALLENGE: Angles wrap around at ±PI, so simple comparison fails
        // SOLUTION: Normalize angle difference to [-PI, +PI] range
        const normalizeAngle = (angle) => {
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            return angle;
        };

        // TODO: Rename angleDiff to relativeBearingRad for clarity (deferred: used extensively below)
        const angleDiff = normalizeAngle(baseAngle - player.rotation);

        // SECTOR-BASED BROADSIDE DETECTION
        // ARCADE FIRING MODEL: Projectiles fire exactly perpendicular to ship
        // SECTOR DESIGN:
        //   - Right broadside (E key): angleDiff near 0 (within ±45°)
        //   - Left broadside (Q key): angleDiff near ±PI (within ±45° of 180°)
        // TOLERANCE: ±45° (PI/4) prevents forward/aft firing
        // See docs/COORDINATE_SYSTEM.md for coordinate system details

        // DESIGN CONTRACT: Broadside sector tolerance
        // - MUST be ±45° (PI/4) for arcade firing model
        // - Prevents accidental forward/backward firing
        // DO NOT CHANGE: Smaller tolerance may reject valid perpendicular shots
        const BROADSIDE_SECTOR = Math.PI / 4; // 45° tolerance (±0.785 radians)

        let isRightBroadside = false;
        let isLeftBroadside = false;

        if (Math.abs(angleDiff) < BROADSIDE_SECTOR) {
            // Right broadside (E key) - firing to starboard
            // angleDiff is close to 0, meaning firing in same direction as ship heading
            isRightBroadside = true;
        } else if (Math.abs(Math.abs(angleDiff) - Math.PI) < BROADSIDE_SECTOR) {
            // Left broadside (Q key) - firing to port
            // angleDiff is close to ±PI (180°), meaning firing opposite to ship heading
            isLeftBroadside = true;
        } else {
            // Invalid firing angle (shouldn't happen with current controls)
            console.warn(`Invalid broadside angle: ${(angleDiff * 180 / Math.PI).toFixed(1)}°`);
            return; // Don't fire if angle is invalid
        }

        for (let i = 0; i < cannonCount; i++) {
            // CANNON DISTRIBUTION: Position cannons along ship's length (bow to stern)
            // CLUSTERING: cannonIndex centers cannons around 0 (midship)
            //   - For 4 cannons: indices are -1.5, -0.5, +0.5, +1.5
            //   - Multiplied by spacing and spread factor to cluster at midship
            // SPREAD FACTOR: 0.4 means cannons occupy 40% of ship length (concentrated)
            const cannonIndex = i - (cannonCount - 1) / 2;
            const baseLongitudinalOffset = cannonIndex * spacing * cannonSpreadFactor;

            // PER-SIDE ADJUSTMENT: Allow different bow/stern positioning for port vs starboard
            // NAMING QUIRK: isLeftBroadside is TRUE when firing RIGHT (E key) due to detection logic
            // This swap ensures correct offset is applied to each physical side of the ship
            const longitudinalAdjustment = isLeftBroadside
                ? (shipClass.cannonLongitudinalOffsetStarboard || 0)
                : (shipClass.cannonLongitudinalOffsetPort || 0);

            const longitudinalOffset = baseLongitudinalOffset + longitudinalAdjustment;

            // LATERAL OFFSET: Position cannons on port (left) or starboard (right) side
            // SHIP-RELATIVE COORDINATES:
            //   - Positive lateral = outward from ship centerline
            //   - Negative lateral = inward toward centerline
            // SIDE SELECTION: isLeftBroadside naming is inverted due to detection logic
            //   - TRUE (E key/right fire) → starboard side → negative offset
            //   - FALSE (Q key/left fire) → port side → positive offset
            const baseLateralOffset = isLeftBroadside ? -(shipWidth / 2) : (shipWidth / 2);

            // PER-SIDE ADJUSTMENT: Fine-tune lateral position for each side independently
            // Allows asymmetric cannon placement if needed for specific ship designs
            const lateralAdjustment = isLeftBroadside
                ? (shipClass.cannonLateralOffsetStarboard || 0)
                : (shipClass.cannonLateralOffsetPort || 0);
            const lateralOffset = baseLateralOffset + lateralAdjustment;



            // COORDINATE TRANSFORMATION: Convert ship-relative offsets to world coordinates
            // SHIP-RELATIVE AXES:
            //   - Longitudinal: along ship's length (bow to stern)
            //   - Lateral: across ship's width (port to starboard)
            // WORLD COORDINATE SYSTEM:
            //   - 0 radians = north/up, rotation increases clockwise
            //   - Ship sprite points up at 0 rotation
            // ROTATION TRANSFORMATIONS:
            //   - Longitudinal uses (rotation - PI/2) to align with ship's forward direction
            //     * At rotation=0 (north), forward is -Y (up), so we need -PI/2 offset
            //     * At rotation=PI/2 (east), forward is +X (right)
            //   - Lateral uses (rotation) directly for perpendicular direction
            //     * At rotation=0, perpendicular is +X (right for starboard, left for port)
            //     * At rotation=PI/2, perpendicular is +Y (down for starboard, up for port)

            // DESIGN CONTRACT: Cannon position transforms
            // - Longitudinal MUST use (rotation - PI/2) for forward/aft
            // - Lateral MUST use (rotation) for port/starboard
            // DO NOT CHANGE: These transforms align ship-relative coords with world coords
            const cannonX = player.x +
                Math.cos(player.rotation - Math.PI / 2) * longitudinalOffset +
                Math.cos(player.rotation) * lateralOffset;

            const cannonY = player.y +
                Math.sin(player.rotation - Math.PI / 2) * longitudinalOffset +
                Math.sin(player.rotation) * lateralOffset;



            // Fire projectile straight out from cannon (perpendicular to ship)
            this.world.createProjectile(player.id, cannonX, cannonY, baseAngle);
        }
    }

    handleEnterHarbor(socket) {
        const player = this.world.getEntity(socket.id);
        if (!player || !player.nearHarbor) return;

        // Get harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (!harbor) return;

        // Dock the ship (stop movement)
        player.inHarbor = true;
        player.dockedHarborId = harbor.id;
        player.speed = 0;
        player.sailState = 0;

        // Grant invulnerability shield while docked (infinite duration)
        // This prevents attacks while player is in harbor menu
        player.shieldEndTime = Infinity;
        console.log(`Player ${player.id} docked at ${harbor.name} with shield`);

        // Check if player is on raft - auto-convert to Sloop
        if (player.isRaft) {
            const Ship = require('./entities/Ship');
            player.fleet = [new Ship('SLOOP')];
            player.flagshipIndex = 0;
            player.isRaft = false;
            console.log(`Player ${player.id} received a new Sloop at ${harbor.name}`);
        }

        // Send harbor data to client (Phase 0: Economy)
        // Get economy data (may be null if harbor doesn't support trade)
        const economy = this.world.harborRegistry.getHarborEconomy(harbor.id);

        const harborData = {
            harborId: harbor.id,  // Add harbor ID for trade requests
            harborName: harbor.name,
            fleet: player.fleet.map(ship => ship.serialize()),
            economy: economy,  // null if no trade available
            cargo: player.fleetCargo.serialize()
        };
        socket.emit('harborData', harborData);
    }

    handleRepairShip(playerId) {
        const player = this.world.getEntity(playerId);
        if (!player || player.isRaft) return;

        // Repair flagship to full health
        player.flagship.health = player.flagship.maxHealth;
        console.log(`Player ${playerId} repaired flagship`);

        // Send updated harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (harbor) {
            const harborData = {
                harborId: harbor.id,
                harborName: harbor.name,
                fleet: player.fleet.map(ship => ship.serialize())
            };
            this.io.to(playerId).emit('harborData', harborData);
        }
    }

    handleSwitchFlagship(playerId, shipClass) {
        const player = this.world.getEntity(playerId);
        if (!player || !player.inHarbor) return;

        const Ship = require('./entities/Ship');

        // Create new ship with selected class
        const newShip = new Ship(shipClass);

        // Replace flagship (index 0) with new ship
        player.fleet[0] = newShip;
        player.flagshipIndex = 0;

        console.log(`Player ${playerId} switched flagship to ${shipClass}`);

        // Send updated harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (harbor) {
            const harborData = {
                harborName: harbor.name,
                fleet: player.fleet.map(ship => ship.serialize())
            };
            this.io.to(playerId).emit('harborData', harborData);
        }
    }

    handleCloseHarbor(playerId) {
        const player = this.world.getEntity(playerId);
        if (!player) return;

        // Undock and respawn ship outside harbor
        if (player.inHarbor && player.dockedHarborId) {
            const harbor = this.world.harbors.find(h => h.id === player.dockedHarborId);
            if (harbor && harbor.island) {
                // Spawn player at fixed offset from harbor (east side)
                // Harbor is now at exact tile position, no random offset
                player.x = harbor.x + GAME.HARBOR_SPAWN_DISTANCE;
                player.y = harbor.y;

                // Grant 10-second shield when leaving harbor (no firing allowed)
                player.shieldEndTime = Date.now() / 1000 + COMBAT.HARBOR_EXIT_SHIELD_DURATION;

                console.log(`Player ${playerId} left ${harbor.name} with 10s shield (no firing)`);
            }

            player.inHarbor = false;
            player.dockedHarborId = null;
        }
    }

    /**
     * Handle ship upgrade in harbor (Phase 1: Progression)
     * Server-authoritative: validates gold, level, and harbor requirements
     */
    handleUpgradeShip(socketId, targetShipClass) {
        const player = this.world.getEntity(socketId);
        if (!player) return;

        // Validation: Must be in harbor
        if (!player.inHarbor) {
            console.log(`[Harbor] ${player.name}: Cannot upgrade ship (not in harbor)`);
            return;
        }

        // Get ship class definition
        const { getShipClass } = require('./entities/ShipClass');
        const shipClass = getShipClass(targetShipClass);
        if (!shipClass) {
            console.log(`[Harbor] ${player.name}: Invalid ship class ${targetShipClass}`);
            return;
        }

        // Validation: Check affordability (gold + level)
        if (!player.canAffordShip(shipClass)) {
            const cost = shipClass.goldCost || 0;
            const levelReq = shipClass.levelRequirement || 1;
            console.log(`[Harbor] ${player.name}: Cannot afford ${shipClass.name} (need ${cost} gold, level ${levelReq})`);
            return;
        }

        // Deduct cost
        player.gold -= shipClass.goldCost;

        // Replace flagship (simple swap, no resale)
        const Ship = require('./entities/Ship');
        player.fleet = [new Ship(targetShipClass)];
        player.flagshipIndex = 0;

        console.log(`[Harbor] ${player.name}: Upgraded to ${shipClass.name} for ${shipClass.goldCost} gold (${player.gold} remaining)`);

        // Send updated harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (harbor) {
            const harborData = {
                harborId: harbor.id,
                harborName: harbor.name,
                fleet: player.fleet.map(ship => ship.serialize())
            };
            this.io.to(socketId).emit('harborData', harborData);
        }
    }

    /**
     * Handle buy good transaction (Phase 0: Economy)
     * @param {string} socketId - Player socket ID
     * @param {string} harborId - Harbor ID
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to buy
     */
    handleBuyGood(socketId, harborId, goodId, quantity) {
        const player = this.world.getEntity(socketId);
        if (!player) return;

        const result = this.economySystem.buyGood(player, harborId, goodId, quantity);

        // Emit result to client
        this.io.to(socketId).emit('transactionResult', result);

        // If successful, emit updated player state
        if (result.success) {
            this.io.to(socketId).emit('playerStateUpdate', {
                gold: player.gold,
                cargo: player.fleetCargo.serialize()
            });
        }
    }

    /**
     * Handle sell good transaction (Phase 0: Economy)
     * @param {string} socketId - Player socket ID
     * @param {string} harborId - Harbor ID
     * @param {string} goodId - Good ID
     * @param {number} quantity - Quantity to sell
     */
    handleSellGood(socketId, harborId, goodId, quantity) {
        const player = this.world.getEntity(socketId);
        if (!player) return;

        const result = this.economySystem.sellGood(player, harborId, goodId, quantity);

        // Emit result to client
        this.io.to(socketId).emit('transactionResult', result);

        // If successful, emit updated player state
        if (result.success) {
            this.io.to(socketId).emit('playerStateUpdate', {
                gold: player.gold,
                cargo: player.fleetCargo.serialize()
            });
        }
    }
}

module.exports = GameLoop;
