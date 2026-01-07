const Projectile = require('./Projectile');
const Wind = require('./Wind');
const Harbor = require('./Harbor');
const GameConfig = require('./GameConfig');
const WorldMap = require('./WorldMap');

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

        // Generate harbors (TODO: will be replaced with tile-based placement)
        this.harbors = this.generateHarbors();

        // DEBUG ONLY: Track World creation for early-session collision diagnosis
        // NO gameplay behavior change
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION) {
            console.log(`[INIT] World created | Islands: 0 (tile-based) | Harbors: ${this.harbors.length} | Timestamp: ${Date.now()}`);
        }
    }

    generateHarbors() {
        // TODO: Replace with harbor data from world_map.json (coordinates + names)
        // TEMPORARY: Hardcoded positions on land for testing
        // These positions are manually placed on islands in the 100x100 test map

        const harbors = [];

        // Hardcoded harbor positions (world coordinates) on shallow water
        // Format: {x, y} in world coordinates (tile * tileSize)
        // Positioned on shallow water (cyan) so ships can dock
        // Based on visual coordinates from test map
        const harborPositions = [
            { x: 115, y: 75 },    // Santiago - top-left island
            { x: 195, y: 645 },   // Martinique - bottom-left island
            { x: 305, y: 490 },   // Cartagena - left side of center island
            { x: 755, y: 195 },   // Porto Bello - top-right island
            { x: 755, y: 685 },   // San Juan - bottom-right island
        ];

        for (let i = 0; i < harborPositions.length; i++) {
            const pos = harborPositions[i];

            // Verify position is valid (not deep water is fine, harbors can be on shallow/land edge)
            const terrain = this.worldMap.getTile(pos.x, pos.y);
            const TERRAIN = require('./GameConfig').TERRAIN;

            console.log(`Harbor ${i} at (${pos.x}, ${pos.y}): terrain = ${terrain} (0=WATER, 1=SHALLOW, 2=LAND)`);

            // Accept any terrain - harbors work anywhere for now (will be refined later)
            const islandStub = {
                id: `island_${i}`,
                x: pos.x,
                y: pos.y,
                radius: 50
            };
            const harbor = new Harbor(`harbor_${i}`, islandStub);
            harbors.push(harbor);
        }

        console.log(`Generated ${harbors.length} harbors (hardcoded positions, temporary)`);
        return harbors;
    }

    update(deltaTime) {
        // Update Wind
        this.wind.update(deltaTime);

        // Update Entities
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
                if (entity.type === 'PLAYER' && entity.id !== proj.ownerId) {
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
                        // Pass damage source for kill attribution
                        const damageSource = {
                            type: 'player',
                            playerId: proj.ownerId,
                            timestamp: Date.now()
                        };
                        entity.takeDamage(proj.damage, damageSource);
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
            if (this.entities[id].type === 'PLAYER') {
                state.players[id] = this.entities[id].serialize();
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
