const Projectile = require('./Projectile');
const Wind = require('./Wind');
const Island = require('./Island');
const Harbor = require('./Harbor');

class World {
    constructor() {
        this.width = 2000;
        this.height = 2000;
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
    }

    generateIslands() {
        const islands = [];
        const islandCount = 7; // 7 islands

        for (let i = 0; i < islandCount; i++) {
            let x, y, radius;
            let validPosition = false;

            // Try to find a position that doesn't overlap with existing islands
            let attempts = 0;
            while (!validPosition && attempts < 50) {
                x = 200 + Math.random() * (this.width - 400); // Keep away from edges
                y = 200 + Math.random() * (this.height - 400);
                radius = 60 + Math.random() * 90; // 60-150 radius

                // Check distance from other islands
                validPosition = true;
                for (const island of islands) {
                    const dist = Math.hypot(x - island.x, y - island.y);
                    const minDist = radius + island.radius + 100; // Minimum spacing
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

            // Collision Detection
            for (const id in this.entities) {
                const entity = this.entities[id];
                if (entity.type === 'PLAYER' && entity.id !== proj.ownerId) {
                    const dist = Math.hypot(entity.x - proj.x, entity.y - proj.y);
                    if (dist < 20) {
                        entity.takeDamage(proj.damage);
                        proj.toRemove = true;
                        break;
                    }
                }
            }

            if (proj.toRemove) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    createProjectile(ownerId, x, y, rotation) {
        const id = `proj_${this.projectileIdCounter++} `;
        const projectile = new Projectile(id, ownerId, x, y, rotation);
        this.projectiles.push(projectile);
    }

    addEntity(entity) {
        this.entities[entity.id] = entity;
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
            wind: this.wind.serialize(),
            islands: this.islands.map(i => i.serialize()),
            harbors: this.harbors.map(h => h.serialize())
        };
        for (const id in this.entities) {
            if (this.entities[id].type === 'PLAYER') {
                state.players[id] = this.entities[id].serialize();
            }
        }
        return state;
    }
}

module.exports = World;
