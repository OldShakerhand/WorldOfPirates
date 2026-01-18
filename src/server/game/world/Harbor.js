const GameConfig = require('../config/GameConfig');
const { GAME } = GameConfig;

/**
 * Harbor - represents a port on an island
 */
class Harbor {
    constructor(id, island, name = null) {
        this.id = id;
        this.island = island;
        this.radius = GAME.HARBOR_INTERACTION_RADIUS;

        // Use exact island position (island stub already at correct tile coordinates)
        // No random offset - harbor IS at the island position
        this.x = island.x;
        this.y = island.y;

        // DEBUG: Log if coordinates are NaN
        if (isNaN(this.x) || isNaN(this.y)) {
            console.error(`[HARBOR ERROR] ${name || id}: NaN coordinates! island.x=${island.x}, island.y=${island.y}, island:`, island);
        }

        // Use real harbor name from CSV (passed from HarborRegistry)
        // If no name provided, fall back to generated name (for backwards compatibility)
        this.name = name || this.generateName();
    }

    generateName() {
        const names = [
            'Port Royal', 'Tortuga', 'Nassau', 'Havana',
            'Cartagena', 'Maracaibo', 'Porto Bello', 'Santiago',
            'Vera Cruz', 'San Juan', 'Barbados', 'Jamaica',
            'Curacao', 'Trinidad', 'Martinique'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    isPlayerInRange(playerX, playerY) {
        const dist = Math.hypot(this.x - playerX, this.y - playerY);
        return dist < this.radius;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            name: this.name,
            islandId: this.island.id
        };
    }
}

module.exports = Harbor;
