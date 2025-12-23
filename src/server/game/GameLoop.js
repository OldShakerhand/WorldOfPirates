const World = require('./World');
const Player = require('./Player');

class GameLoop {
    constructor(io) {
        this.io = io;
        this.world = new World();
        this.lastTime = Date.now();
        this.tickRate = 60; // 60 updates per second
        this.interval = null;
    }

    start() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000 / this.tickRate);
    }

    stop() {
        clearInterval(this.interval);
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastTime) / 1000; // in seconds
        this.lastTime = now;

        this.world.update(deltaTime);

        // Send game state to all connected clients
        this.io.emit('gamestate_update', this.world.getState());
    }

    addPlayer(socket) {
        const player = new Player(socket.id);
        this.world.addEntity(player);
    }

    removePlayer(id) {
        this.world.removeEntity(id);
    }

    handleInput(id, inputData) {
        const player = this.world.getEntity(id);
        if (player) {
            player.handleInput(inputData);

            const now = Date.now() / 1000;

            // Handle Broadside Left (Q)
            if (inputData.shootLeft) {
                if (now - player.lastShotTimeLeft >= player.fireRate) {
                    // Fire 2 cannons left relative to ship
                    // Left means rotation - 90 degrees (Math.PI/2)
                    const baseAngle = player.rotation - Math.PI / 2;
                    this.fireCannons(player.id, player.x, player.y, baseAngle);
                    player.lastShotTimeLeft = now;
                }
            }

            // Handle Broadside Right (E)
            if (inputData.shootRight) {
                if (now - player.lastShotTimeRight >= player.fireRate) {
                    // Fire 2 cannons right relative to ship
                    // Right means rotation + 90 degrees
                    const baseAngle = player.rotation + Math.PI / 2;
                    this.fireCannons(player.id, player.x, player.y, baseAngle);
                    player.lastShotTimeRight = now;
                }
            }
        }
    }

    fireCannons(ownerId, x, y, baseAngle) {
        // Fire 2 projectiles with slight spread or offset
        // For simplicity: spread angle
        const spread = 0.1; // radians

        // Cannon 1
        this.world.createProjectile(ownerId, x, y, baseAngle - spread / 2);
        // Cannon 2
        this.world.createProjectile(ownerId, x, y, baseAngle + spread / 2);
    }
}

module.exports = GameLoop;
