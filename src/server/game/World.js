const Projectile = require('./Projectile');
const Wind = require('./Wind');

class World {
    constructor() {
        this.width = 2000;
        this.height = 2000;
        this.entities = {};
        this.projectiles = [];
        this.projectileIdCounter = 0;

        // Wind system
        this.wind = new Wind();

        // Water depth grid (simple: deep water everywhere for now, can add shallow areas later)
        this.waterDepth = this.generateWaterDepth();
    }

    generateWaterDepth() {
        // For now, all deep water. Later can add shallow zones
        // Return a function that checks if position is deep/shallow
        return {
            isDeep: (x, y) => {
                // Could add islands, coastlines later
                // For testing: add a shallow zone in center
                const centerDist = Math.hypot(x - this.width / 2, y - this.height / 2);
                return centerDist > 200; // Deep if far from center
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
        const id = `proj_${this.projectileIdCounter++}`;
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
            wind: this.wind.serialize()
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
