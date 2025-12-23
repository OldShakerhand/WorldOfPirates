const Projectile = require('./Projectile');

class World {
    constructor() {
        this.width = 2000; // Example world size
        this.height = 2000;
        this.entities = {}; // Map of ID -> Entity
        this.projectiles = []; // Array of active projectiles
        this.projectileIdCounter = 0;
    }

    update(deltaTime) {
        // Update Entities
        for (const id in this.entities) {
            this.entities[id].update(deltaTime);
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
                    if (dist < 20) { // Simple hit radius
                        entity.takeDamage(proj.damage);
                        proj.toRemove = true; // Destroy projectile on hit
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
        // Serialize the world state for the client
        const state = {
            players: {},
            projectiles: this.projectiles.map(p => p.serialize())
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
