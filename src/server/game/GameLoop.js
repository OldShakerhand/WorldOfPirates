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
    }

    start() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000 / this.tickRate);

        // Start performance monitoring (log every 10 seconds)
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

        const player = new Player(socket.id, playerName);

        // Find a safe spawn position (not inside islands)
        const safePosition = this.findSafeSpawnPosition();
        player.x = safePosition.x;
        player.y = safePosition.y;

        this.world.addEntity(player);

        // Send static map data to the new player (only once)
        socket.emit('map_data', this.world.getMapData());

        console.log(`Player "${playerName}" (${socket.id}) joined the game`);
        return true;
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
                    // Fire left broadside - perpendicular to port side
                    // Compensate for ship velocity for arcade-style firing
                    const baseAngle = player.rotation + Math.PI;
                    const compensatedAngle = this.compensateForShipVelocity(player, baseAngle);
                    this.fireCannons(player, compensatedAngle);
                    player.lastShotTimeLeft = now;
                }
            }

            // Handle Broadside Right (E) - Rafts cannot fire
            if (inputData.shootRight && !player.isRaft) {
                if (now - player.lastShotTimeRight >= player.fireRate) {
                    // Fire right broadside - perpendicular to starboard side
                    // Compensate for ship velocity for arcade-style firing
                    const baseAngle = player.rotation;
                    const compensatedAngle = this.compensateForShipVelocity(player, baseAngle);
                    this.fireCannons(player, compensatedAngle);
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
        const spacing = shipLength / (cannonCount + 1);

        // Determine if firing left or right based on baseAngle
        // Left broadside: baseAngle = rotation + PI
        // Right broadside: baseAngle = rotation
        const isLeftBroadside = Math.abs(baseAngle - (player.rotation + Math.PI)) < 0.1;
        const lateralDirection = isLeftBroadside ? 1 : -1; // Left = positive, Right = negative

        for (let i = 0; i < cannonCount; i++) {
            // Position along ship's longitudinal axis (bow to stern)
            // Distribute evenly: first cannon at spacing, last at shipLength - spacing
            const longitudinalOffset = (i + 1) * spacing - (shipLength / 2);

            // Lateral offset (distance from centerline to cannon port)
            const lateralOffset = (shipWidth / 2) * lateralDirection;

            // Calculate world position using ship rotation
            // Longitudinal: along ship's forward direction (rotation - PI/2 for north-up)
            // Lateral: perpendicular to ship's forward direction
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

    compensateForShipVelocity(player, desiredAngle) {
        // Calculate ship's velocity vector
        const movementAngle = player.rotation - Math.PI / 2;
        const shipVx = Math.cos(movementAngle) * player.speed;
        const shipVy = Math.sin(movementAngle) * player.speed;

        // Get projectile speed from config
        const projSpeed = CombatConfig.PROJECTILE_SPEED;

        // Calculate desired projectile velocity (perpendicular to ship)
        const desiredVx = Math.cos(desiredAngle) * projSpeed;
        const desiredVy = Math.sin(desiredAngle) * projSpeed;

        // Add ship velocity to projectile velocity for arcade-style firing
        const compensatedVx = desiredVx + shipVx;
        const compensatedVy = desiredVy + shipVy;

        // Calculate the angle for this compensated velocity
        return Math.atan2(compensatedVy, compensatedVx);
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
