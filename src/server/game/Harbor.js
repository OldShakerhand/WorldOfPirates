/**
 * Harbor - represents a port on an island
 */
class Harbor {
    constructor(id, island) {
        this.id = id;
        this.island = island;
        this.radius = 30; // Interaction zone radius

        // Place harbor on island perimeter (random angle)
        const angle = Math.random() * Math.PI * 2;
        const distance = island.radius + 15; // Just outside island edge
        this.x = island.x + Math.cos(angle) * distance;
        this.y = island.y + Math.sin(angle) * distance;

        // Harbor name (placeholder - will add Caribbean names later)
        this.name = this.generateName();
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
