const World = require('./World');
const Player = require('./Player');
const GameConfig = require('./GameConfig');
const CombatConfig = require('./CombatConfig');

class GameLoop {
    constructor(io) {
        this.io = io;
        this.world = new World();
        this.lastTime = Date.now();
        this.tickRate = GameConfig.TICK_RATE;
        this.interval = null;

        // Performance monitoring
        this.tickTimes = [];
        this.monitoringInterval = null;

        // DEBUG ONLY: Track first-time events for early-session collision diagnosis
        // NO gameplay behavior change
        this.firstTickLogged = false;
        this.firstProjectileLogged = false;
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
        const playerCount = Object.keys(this.world.entities).length;
        const projectileCount = this.world.projectiles.length;

        console.log(`[Performance] Avg tick: ${avgTick.toFixed(2)}ms | Max: ${maxTick.toFixed(2)}ms | Players: ${playerCount} | Projectiles: ${projectileCount}`);

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
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION && !this.firstTickLogged) {
            const entityCount = Object.keys(this.world.entities).length;
            const projectileCount = this.world.projectiles.length;
            console.log(`[INIT] First tick executed | DeltaTime: ${deltaTime.toFixed(4)} | Entities: ${entityCount} | Projectiles: ${projectileCount}`);
            this.firstTickLogged = true;
        }

        this.world.update(deltaTime);

        // Send game state to all connected clients
        this.io.emit('gamestate_update', this.world.getState());

        // Track tick performance
        const tickDuration = Date.now() - tickStart;
        this.tickTimes.push(tickDuration);
    }

    addPlayer(socket, playerName = 'Anonymous') {
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
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION) {
            const entityCount = Object.keys(this.world.entities).length;
            console.log(`[INIT] Player joined | ID: ${socket.id} | Name: ${playerName} | Entities in world: ${entityCount}`);
        }

        // Find a safe spawn position (not inside islands)
        const safePosition = this.findSafeSpawnPosition();
        player.x = safePosition.x;
        player.y = safePosition.y;

        this.world.addEntity(player);

        // Send static map data to the new player (only once)
        socket.emit('map_data', this.world.getMapData());

        // Send ship metadata to the new player (only once)
        this.sendShipMetadata(socket);

        console.log(`Player "${playerName}" (${socket.id}) joined the game`);
        return true;
    }

    sendShipMetadata(socket) {
        const { SHIP_CLASSES } = require('./ShipClass');

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
        const CombatConfig = require('./CombatConfig');

        // Extract only visual properties needed by client
        const combatVisuals = {
            projectileBallRadius: CombatConfig.PROJECTILE_BALL_RADIUS,
            projectileShadowRadius: CombatConfig.PROJECTILE_SHADOW_RADIUS
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
        const spawnMin = GameConfig.PLAYER_SPAWN_MIN;
        const spawnRange = GameConfig.PLAYER_SPAWN_RANGE;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = spawnMin + Math.random() * spawnRange;
            const y = spawnMin + Math.random() * spawnRange;

            // Check if position is safe (not in island or shallow water)
            const collision = this.world.waterDepth.checkIslandCollisions(x, y, 20); // 20 = ship radius buffer
            const isDeep = this.world.waterDepth.isDeep(x, y);

            if (!collision.collision && isDeep) {
                return { x, y };
            }
        }

        // Fallback: return a position anyway (shouldn't happen with proper spawn area)
        console.warn('Could not find safe spawn position after 50 attempts, using fallback');
        return {
            x: spawnMin + spawnRange / 2,
            y: spawnMin + spawnRange / 2
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

            // Handle Broadside Left (Q) - Rafts cannot fire
            if (inputData.shootLeft && !player.isRaft) {
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

            // Handle Broadside Right (E) - Rafts cannot fire
            if (inputData.shootRight && !player.isRaft) {
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

        if (cannonCount === 0) return; // No cannons (shouldn't happen, but safety check)

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

        // Check if player is on raft - auto-convert to Sloop
        if (player.isRaft) {
            const Ship = require('./Ship');
            player.fleet = [new Ship('SLOOP')];
            player.flagshipIndex = 0;
            player.isRaft = false;
            console.log(`Player ${player.id} received a new Sloop at ${harbor.name}`);
        }

        // Send harbor data to client
        const harborData = {
            harborName: harbor.name,
            fleet: player.fleet.map(ship => ship.serialize())
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
                harborName: harbor.name,
                fleet: player.fleet.map(ship => ship.serialize())
            };
            this.io.to(playerId).emit('harborData', harborData);
        }
    }

    handleSwitchFlagship(playerId, shipClass) {
        const player = this.world.getEntity(playerId);
        if (!player || !player.inHarbor) return;

        const Ship = require('./Ship');

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
            if (harbor) {
                // Calculate position outside harbor (opposite side from island)
                const island = this.world.islands.find(i => i.id === harbor.island.id);
                if (island) {
                    // Vector from island to harbor
                    const dx = harbor.x - island.x;
                    const dy = harbor.y - island.y;
                    const dist = Math.hypot(dx, dy);

                    // Place ship 50 units beyond harbor
                    const spawnDist = dist + GameConfig.HARBOR_SPAWN_DISTANCE;
                    player.x = island.x + (dx / dist) * spawnDist;
                    player.y = island.y + (dy / dist) * spawnDist;

                    // Grant 6-second shield when leaving harbor
                    player.shieldEndTime = Date.now() / 1000 + CombatConfig.HARBOR_EXIT_SHIELD_DURATION;

                    console.log(`Player ${playerId} left ${harbor.name} with 6s shield`);
                }
            }

            player.inHarbor = false;
            player.dockedHarborId = null;
        }
    }
}

module.exports = GameLoop;
