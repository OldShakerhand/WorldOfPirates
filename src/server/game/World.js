const Projectile = require('./Projectile');
const Wind = require('./Wind');
const Island = require('./Island');
const Harbor = require('./Harbor');
const GameConfig = require('./GameConfig');

class World {
    constructor() {
        this.width = GameConfig.WORLD_WIDTH;
        this.height = GameConfig.WORLD_HEIGHT;
        this.entities = {};
        this.projectiles = [];
        this.projectileIdCounter = 0;

        // Wind system
        this.wind = new Wind();

        // Generate islands
        this.islands = this.generateIslands();

        // Generate harbors
        this.harbors = this.generateHarbors();

        // Water depth based on islands
        this.waterDepth = this.generateWaterDepth();

        // DEBUG ONLY: Track World creation for early-session collision diagnosis
        // NO gameplay behavior change
        const CombatConfig = require('./CombatConfig');
        if (CombatConfig.DEBUG_INITIALIZATION) {
            console.log(`[INIT] World created | Islands: ${this.islands.length} | Harbors: ${this.harbors.length} | Timestamp: ${Date.now()}`);
        }
    }

    generateIslands() {
        const islands = [];
        const islandCount = GameConfig.ISLAND_COUNT;

        for (let i = 0; i < islandCount; i++) {
            let x, y, radius;
            let validPosition = false;

            // Try to find a position that doesn't overlap with existing islands
            let attempts = 0;
            while (!validPosition && attempts < GameConfig.ISLAND_GENERATION_ATTEMPTS) {
                // FIXME: Hardcoded edge buffer for island generation (TECH_DEBT_009)
                // WHY: 200px buffer is magic number, not proportional to world size
                // REFACTOR: Calculate as percentage of world size (e.g., 10%)
                // WHEN: When supporting different world sizes or procedural generation
                x = 200 + Math.random() * (this.width - 400); // Keep away from edges
                y = 200 + Math.random() * (this.height - 400);
                radius = GameConfig.ISLAND_MIN_RADIUS + Math.random() * (GameConfig.ISLAND_MAX_RADIUS - GameConfig.ISLAND_MIN_RADIUS);

                // Check distance from other islands
                validPosition = true;
                for (const island of islands) {
                    const dist = Math.hypot(x - island.x, y - island.y);
                    const minDist = radius + island.radius + GameConfig.ISLAND_MIN_SPACING; // Minimum spacing
                    if (dist < minDist) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }

            if (validPosition) {
                islands.push(new Island(`island_${i}`, x, y, radius));
            }
        }

        console.log(`Generated ${islands.length} islands`);
        return islands;
    }

    generateHarbors() {
        const harbors = [];
        for (let i = 0; i < this.islands.length; i++) {
            const island = this.islands[i];
            const harbor = new Harbor(`harbor_${i}`, island);
            harbors.push(harbor);
        }
        console.log(`Generated ${harbors.length} harbors`);
        return harbors;
    }

    generateWaterDepth() {
        return {
            isDeep: (x, y) => {
                // FIXME: Linear island collision check doesn't scale (TECH_DEBT_010)
                // WHY: O(n) check for every ship position update
                // REFACTOR: Use spatial partitioning (quadtree or grid)
                // WHEN: >20 islands or >50 players cause performance issues
                // Check if position is in shallow water around any island
                for (const island of this.islands) {
                    if (island.isInShallowWater(x, y)) {
                        return false; // In shallow water
                    }
                }
                return true; // Deep water
            },

            checkIslandCollisions: (x, y, shipRadius = 15) => {
                // Check collision with any island
                for (const island of this.islands) {
                    if (island.isColliding(x, y, shipRadius)) {
                        return { collision: true, island };
                    }
                }
                return { collision: false };
            },

            checkHarborProximity: (x, y) => {
                // Check if player is near any harbor
                for (const harbor of this.harbors) {
                    if (harbor.isPlayerInRange(x, y)) {
                        return harbor.id;
                    }
                }
                return null;
            }
        };
    }

    update(deltaTime) {
        // Update Wind
        this.wind.update(deltaTime);

        // Update Entities
        for (const id in this.entities) {
            this.entities[id].update(deltaTime, this.wind, this.waterDepth);
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
            islands: this.islands.map(i => i.serialize()),
            harbors: this.harbors.map(h => h.serialize())
        };
    }
}

module.exports = World;
