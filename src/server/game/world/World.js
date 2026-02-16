const Projectile = require('../entities/Projectile');
const Wreck = require('../entities/Wreck');
const Wind = require('../entities/Wind');
const Harbor = require('./Harbor');
const GameConfig = require('../config/GameConfig');
const { GAME, COMBAT } = GameConfig;
const WorldMap = require('./WorldMap');
const HarborRegistry = require('./HarborRegistry');
const NPCManager = require('../npc/NPCManager');
const RewardSystem = require('../progression/RewardSystem');

class World {
    constructor() {
        // Load tile-based world map (replaces procedural generation)
        this.worldMap = new WorldMap(GAME.WORLD_MAP_PATH);

        // Get world dimensions from tilemap
        const dimensions = this.worldMap.getWorldDimensions();
        this.width = dimensions.width;
        this.height = dimensions.height;

        this.entities = {};
        this.projectiles = [];
        this.projectileIdCounter = 0;

        // Wrecks
        this.wrecks = []; // transient list of Wreck objects
        this.wreckIdCounter = 0;

        // Wind system
        this.wind = new Wind();

        // Load harbor registry (replaces hardcoded positions)
        // Phase 0: Economy - also loads trade profiles
        this.harborRegistry = new HarborRegistry(
            GAME.HARBORS_PATH,
            GAME.HARBOR_TRADE_PROFILES_PATH
        );

        // Create Harbor instances from registry data
        // Pass exitDirection for orientation (stored data, no runtime detection needed)
        this.harbors = this.harborRegistry.getAllHarbors().map(data =>
            new Harbor(data.id, this.createIslandStub(data), data.name, this.worldMap, data.exitDirection)
        );

        // NPC Manager (Phase 1: Trader NPCs)
        this.npcManager = new NPCManager(this);

        // Reward System (Phase 2: Centralized rewards)
        this.rewardSystem = new RewardSystem(this);

        // Mission Manager (Phase 0: Scaffolding)
        const MissionManager = require('../missions/MissionManager');
        this.missionManager = new MissionManager(this);

        // DEBUG ONLY: Track World creation for early-session collision diagnosis
        // NO gameplay behavior change
        if (COMBAT.DEBUG_INITIALIZATION) {
            console.log(`[INIT] World created | Islands: 0 (tile-based) | Harbors: ${this.harbors.length} | Timestamp: ${Date.now()}`);
        }
    }

    createWreck(x, y, ownerId, cargo) {
        const id = `wreck_${this.wreckIdCounter++}`;
        const wreck = new Wreck(id, x, y, ownerId, cargo);
        this.wrecks.push(wreck);
        console.log(`[World] Spawned wreck ${id} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        return wreck;
    }

    /**
     * Create island stub for Harbor compatibility
     * Converts tile coordinates to world coordinates
     * Includes tile coordinates for coastline detection
     */
    createIslandStub(harborData) {
        return {
            id: harborData.id,
            x: harborData.tileX * GAME.TILE_SIZE,
            y: harborData.tileY * GAME.TILE_SIZE,
            tileX: harborData.tileX,
            tileY: harborData.tileY,
            radius: 50
        };
    }

    update(deltaTime) {
        // Update Wind
        this.wind.update(deltaTime);

        // Update NPC AI (BEFORE entity movement)
        // NPCs compute inputs, then use same update() as players
        this.npcManager.update(deltaTime);

        // Update Missions (AFTER NPC AI, BEFORE entity movement)
        this.missionManager.update(deltaTime);

        // Update Entities (Players + NPCs use SAME simulation core)
        for (const id in this.entities) {
            this.entities[id].update(deltaTime, this.wind, this.worldMap);
        }

        // Resolve Ship-to-Ship Collisions (SAT-based separation)
        this.resolveShipCollisions();

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(deltaTime);

            // Collision Detection with Rotated Rectangles
            for (const id in this.entities) {
                const entity = this.entities[id];
                // Check both PLAYER and NPC entities (same combat mechanics)
                const isShipEntity = (entity.type === 'PLAYER' || entity.type === 'NPC');
                const isNotOwner = entity.id !== proj.ownerId;

                if (isShipEntity && isNotOwner) {
                    // Skip rafts (invulnerable)
                    if (entity.isRaft) continue;

                    // DEBUG ONLY: Bounding circle precheck for proximity detection
                    // Used to detect near-misses and log hitbox dimensions
                    // NO gameplay behavior change - this is observation only
                    const dx = proj.x - entity.x;
                    const dy = proj.y - entity.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Rough bounding circle (conservative estimate)
                    const boundingRadius = Math.max(entity.flagship.shipClass.spriteWidth, entity.flagship.shipClass.spriteHeight);
                    const isNearShip = distance < boundingRadius;

                    // DEBUG ONLY: Log hitbox dimensions when projectile is near
                    if (COMBAT.DEBUG_COLLISION && isNearShip) {
                        const hitbox = entity.flagship.getHitbox();
                        console.log(`[DEBUG] Near ship: dist=${distance.toFixed(2)}px | Hitbox: ${hitbox.width.toFixed(1)}x${hitbox.height.toFixed(1)} | Rotation=${entity.rotation.toFixed(2)} | Ship pos=(${entity.x.toFixed(1)}, ${entity.y.toFixed(1)}) | Proj prev=(${proj.prevX.toFixed(1)}, ${proj.prevY.toFixed(1)}) curr=(${proj.x.toFixed(1)}, ${proj.y.toFixed(1)})`);
                    }

                    // Test rotated rectangle collision
                    if (this.testRotatedRectCollision(entity, proj)) {
                        // Pass owner ID as damage source for retaliation tracking
                        entity.takeDamage(proj.damage, proj.ownerId);
                        proj.toRemove = true;
                        break;
                    }

                    // DEBUG ONLY: Log near-miss if projectile passed through bounding area
                    if (COMBAT.DEBUG_COLLISION && isNearShip) {
                        console.log(`[DEBUG] Near-miss: projectile crossed ship bounding area but no hit registered`);
                    }
                }
            }

            if (proj.toRemove) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update Wrecks
        for (let i = this.wrecks.length - 1; i >= 0; i--) {
            const wreck = this.wrecks[i];
            wreck.update();
            if (wreck.toRemove) {
                console.log(`[World] Wreck ${wreck.id} despawned`);
                this.wrecks.splice(i, 1);
            }
        }
    }

    /**
     * Test collision between projectile and ship using rotated rectangle
     * 
     * DESIGN CONTRACT: Rotation coordinate system
     * - 0 radians = ship facing north (up, -Y direction)
     * - Rotation increases clockwise
     * - Transform projectile to ship-local space by rotating by -ship.rotation
     * 
     * Algorithm:
     * 1. Translate projectile position relative to ship center
     * 2. Rotate projectile by -ship.rotation to align with ship's axes
     * 3. Test if rotated point is inside axis-aligned rectangle
     * 
     * @param {Player} ship - The ship entity
     * @param {Projectile} projectile - The projectile to test
     * @returns {boolean} - True if collision detected
     */
    testRotatedRectCollision(ship, projectile) {
        // Get hitbox dimensions from ship
        const hitbox = ship.flagship.getHitbox();
        const halfWidth = hitbox.width / 2;
        const halfHeight = hitbox.height / 2;

        // Step 1: Translate projectile to ship-relative coordinates
        const dx = projectile.x - ship.x;
        const dy = projectile.y - ship.y;

        // Step 2: Rotate projectile into ship's local coordinate system
        // Rotate by -ship.rotation to counter the ship's rotation
        // This makes the ship appear axis-aligned in local space
        const cosAngle = Math.cos(-ship.rotation);
        const sinAngle = Math.sin(-ship.rotation);

        const localX = dx * cosAngle - dy * sinAngle;
        const localY = dx * sinAngle + dy * cosAngle;

        // Step 3: Test against axis-aligned rectangle
        // In local space, ship is centered at (0,0) and axis-aligned
        // Simple rectangle containment test
        return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
    }

    createProjectile(ownerId, x, y, rotation) {
        const id = `proj_${this.projectileIdCounter++} `;
        const projectile = new Projectile(id, ownerId, x, y, rotation);
        this.projectiles.push(projectile);
    }

    addEntity(entity) {
        this.entities[entity.id] = entity;

        // DEBUG ONLY: Track entity registration for early-session collision diagnosis
        // NO gameplay behavior change
        if (COMBAT.DEBUG_INITIALIZATION) {
            const totalEntities = Object.keys(this.entities).length;
            console.log(`[INIT] Entity added to world | Type: ${entity.type} | ID: ${entity.id} | Total entities: ${totalEntities}`);
        }
    }

    removeEntity(id) {
        delete this.entities[id];
    }

    getEntity(id) {
        return this.entities[id];
    }

    getWreck(id) {
        return this.wrecks.find(w => w.id === id);
    }

    removeWreck(id) {
        const index = this.wrecks.findIndex(w => w.id === id);
        if (index !== -1) {
            this.wrecks.splice(index, 1);
        }
    }

    getState() {
        const state = {
            players: {},
            projectiles: this.projectiles.map(p => p.serialize()),
            wrecks: this.wrecks.map(w => w.serialize()),
            wind: this.wind.serialize()
        };
        for (const id in this.entities) {
            // Include both PLAYER and NPC entities
            // NPCs serialize identically to players for client rendering
            if (this.entities[id].type === 'PLAYER' || this.entities[id].type === 'NPC') {
                state.players[id] = this.entities[id].serialize();

                // Add mission data for players only (Phase 0: Mission scaffolding)
                if (this.entities[id].type === 'PLAYER') {
                    state.players[id].mission = this.missionManager.serializeForPlayer(id);
                }
            }
        }
        return state;
    }

    getMapData() {
        return {
            width: this.width,
            height: this.height,
            // Islands removed - now using tile-based world map
            harbors: this.harbors.map(h => h.serialize())
        };
    }

    /**
     * Resolve collisions between ships using Separating Axis Theorem (SAT)
     * Pushes overlapping ships apart gently without physics simulation
     */
    resolveShipCollisions() {
        const entityIds = Object.keys(this.entities);
        const ships = [];

        // Filter valid ships (Player or NPC)
        for (const id of entityIds) {
            const ent = this.entities[id];
            // Check type and ensure flagship exists and is alive
            if ((ent.type === 'PLAYER' || ent.type === 'NPC') &&
                !ent.isSunk && ent.flagship && ent.flagship.health > 0) {
                ships.push(ent);
            }
        }

        // Check every unique pair
        for (let i = 0; i < ships.length; i++) {
            for (let j = i + 1; j < ships.length; j++) {
                const shipA = ships[i];
                const shipB = ships[j];

                // Skip if either is a Raft (rafts don't collide with ships)
                if (shipA.isRaft || shipB.isRaft) continue;

                // Broad Phase: Circle check
                const dimA = Math.max(shipA.flagship.shipClass.spriteWidth, shipA.flagship.shipClass.spriteHeight);
                const dimB = Math.max(shipB.flagship.shipClass.spriteWidth, shipB.flagship.shipClass.spriteHeight);
                const radiussum = (dimA + dimB) * 0.6;

                const dx = shipB.x - shipA.x;
                const dy = shipB.y - shipA.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < radiussum * radiussum) {
                    // Narrow Phase: SAT
                    this.solveSAT(shipA, shipB);
                }
            }
        }
    }

    /**
     * Solve OBB collision between two ships and apply separation
     */
    solveSAT(shipA, shipB) {
        const hitboxA = shipA.flagship.getHitbox();
        const hitboxB = shipB.flagship.getHitbox();

        const cornersA = this.getRotatedCorners(shipA.x, shipA.y, hitboxA.width, hitboxA.height, shipA.rotation);
        const cornersB = this.getRotatedCorners(shipB.x, shipB.y, hitboxB.width, hitboxB.height, shipB.rotation);

        const axes = [
            ...this.getAxes(cornersA),
            ...this.getAxes(cornersB)
        ];

        let minOverlap = Infinity;
        let smallestAxis = null;

        for (const axis of axes) {
            const rangeA = this.projectPolygon(cornersA, axis);
            const rangeB = this.projectPolygon(cornersB, axis);

            if (!this.overlap(rangeA, rangeB)) {
                return; // Separating axis found
            } else {
                const o = this.getOverlapAmount(rangeA, rangeB);
                if (o < minOverlap) {
                    minOverlap = o;
                    smallestAxis = axis;
                }
            }
        }

        // Collision detected, apply MTV
        if (smallestAxis && minOverlap > 0) {
            const centerDx = shipB.x - shipA.x;
            const centerDy = shipB.y - shipA.y;
            const dot = smallestAxis.x * centerDx + smallestAxis.y * centerDy;

            if (dot < 0) {
                smallestAxis.x = -smallestAxis.x;
                smallestAxis.y = -smallestAxis.y;
            }

            // Apply gentle separation (reduced from 0.5 to 0.2 for heavier feel)
            // Ideally we want ships to stop rather than slide
            const correctionFactor = 0.2;
            const pushX = smallestAxis.x * minOverlap * correctionFactor;
            const pushY = smallestAxis.y * minOverlap * correctionFactor;

            const aMovable = !shipA.dockedHarborId;
            const bMovable = !shipB.dockedHarborId;

            if (aMovable && bMovable) {
                shipA.x -= pushX * 0.5;
                shipA.y -= pushY * 0.5;
                shipB.x += pushX * 0.5;
                shipB.y += pushY * 0.5;

                // Apply speed penalty (Impact friction) - DIRECTIONAL
                // Only lose speed if you are "facing" the collision (Rammer)
                // If you are hit from behind/side (Victim), you keep your speed

                // Helper: Check if ship is facing the other ship (Front 120 degree arc)
                const isFacing = (source, target) => {
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const angleToTarget = Math.atan2(dy, dx);
                    let angleDiff = angleToTarget - source.rotation;

                    // Normalize to -PI to +PI
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                    // Check if within +/- 60 degrees (1.05 radians)
                    return Math.abs(angleDiff) < 1.05;
                };

                const aFacingB = isFacing(shipA, shipB);
                const bFacingA = isFacing(shipB, shipA);

                // Lose 5% of current speed ONLY if facing the collision
                if (shipA.speed > 0 && aFacingB) shipA.speed *= 0.95;
                if (shipB.speed > 0 && bFacingA) shipB.speed *= 0.95;

            } else if (aMovable) {
                shipA.x -= pushX;
                shipA.y -= pushY;
                // Wall collision (island/docked ship) - always penalize as we hit something static
                if (shipA.speed > 0) shipA.speed *= 0.95;
            } else if (bMovable) {
                shipB.x += pushX;
                shipB.y += pushY;
                // Wall collision - always penalize
                if (shipB.speed > 0) shipB.speed *= 0.95;
            }
        }
    }

    getRotatedCorners(cx, cy, w, h, rotation) {
        const hw = w / 2;
        const hh = h / 2;
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        return corners.map(p => ({
            x: cx + (p.x * cos - p.y * sin),
            y: cy + (p.x * sin + p.y * cos)
        }));
    }

    getAxes(corners) {
        const axes = [];
        for (let i = 0; i < corners.length; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % corners.length];
            const edgeX = p2.x - p1.x;
            const edgeY = p2.y - p1.y;
            const normal = { x: -edgeY, y: edgeX };
            const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            if (len > 0) axes.push({ x: normal.x / len, y: normal.y / len });
        }
        return axes;
    }

    projectPolygon(corners, axis) {
        let min = Infinity;
        let max = -Infinity;
        for (const p of corners) {
            const dot = p.x * axis.x + p.y * axis.y;
            if (dot < min) min = dot;
            if (dot > max) max = dot;
        }
        return { min, max };
    }

    overlap(rangeA, rangeB) {
        return !(rangeA.max < rangeB.min || rangeB.max < rangeA.min);
    }

    getOverlapAmount(rangeA, rangeB) {
        return Math.min(rangeA.max, rangeB.max) - Math.max(rangeA.min, rangeB.min);
    }
}

module.exports = World;
