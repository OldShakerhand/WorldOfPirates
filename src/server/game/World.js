const Projectile = require('./Projectile');
const Wind = require('./Wind');
const Harbor = require('./Harbor');
const GameConfig = require('./GameConfig');
const WorldMap = require('./WorldMap');
const HarborRegistry = require('./HarborRegistry');
const NPCManager = require('./NPCManager');

class World {
    constructor() {
        // Load tile-based world map (replaces procedural generation)
        this.worldMap = new WorldMap(GameConfig.WORLD_MAP_PATH);

        // Get world dimensions from tilemap
        const dimensions = this.worldMap.getWorldDimensions();
        this.width = dimensions.width;
        this.height = dimensions.height;

        this.entities = {};
        this.projectiles = [];
        this.projectileIdCounter = 0;

        // Wind system
        this.wind = new Wind();

        // Load harbor registry (replaces hardcoded positions)
        this.harborRegistry = new HarborRegistry(GameConfig.HARBORS_PATH);

        // Create Harbor instances from registry data
        this.harbors = this.harborRegistry.getAllHarbors().map(data =>
            new Harbor(data.id, this.createIslandStub(data), data.name)
        );

        // NPC Manager (Phase 1: Trader NPCs)
        this.npcManager = new NPCManager(this);

        // Mission Manager (Phase 0: Scaffolding)
        const MissionManager = require('./MissionManager');
        this.missionManager = new MissionManager(this);

        // DEBUG ONLY: Track World creation for early-session collision diagnosis
        // NO gameplay behavior change
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION) {
            console.log(`[INIT] World created | Islands: 0 (tile-based) | Harbors: ${this.harbors.length} | Timestamp: ${Date.now()}`);
        }
    }

    /**
     * Create island stub for Harbor compatibility
     * Converts tile coordinates to world coordinates
     */
    createIslandStub(harborData) {
        return {
            id: harborData.id,
            x: harborData.tileX * GameConfig.TILE_SIZE,
            y: harborData.tileY * GameConfig.TILE_SIZE,
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
                    const CombatConfig = require('./CombatConfig');
                    const dx = proj.x - entity.x;
                    const dy = proj.y - entity.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Rough bounding circle (conservative estimate)
                    const boundingRadius = Math.max(entity.flagship.shipClass.spriteWidth, entity.flagship.shipClass.spriteHeight);
                    const isNearShip = distance < boundingRadius;

                    // DEBUG ONLY: Log hitbox dimensions when projectile is near
                    if (CombatConfig.DEBUG_COLLISION && isNearShip) {
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
                    if (CombatConfig.DEBUG_COLLISION && isNearShip) {
                        console.log(`[DEBUG] Near-miss: projectile crossed ship bounding area but no hit registered`);
                    }
                }
            }

            if (proj.toRemove) {
                this.projectiles.splice(i, 1);
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
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION) {
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

    getState() {
        const state = {
            players: {},
            projectiles: this.projectiles.map(p => p.serialize()),
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
}

module.exports = World;
