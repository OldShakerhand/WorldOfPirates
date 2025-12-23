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

            if (inputData.shoot) {
                const now = Date.now() / 1000;
                if (now - player.lastShotTime >= player.fireRate) {
                    // Fire!
                    // Broadside canyons? For now, let's just shoot forward or sideways?
                    // "Pirates!" usually has broadsides. Let's do simple forward for prototype ease, or maybe 1 left 1 right.
                    // Let's do a simple forward shot for checking mechanism first.
                    this.world.createProjectile(player.id, player.x, player.y, player.rotation);
                    player.lastShotTime = now;
                }
            }
        }
    }
}

module.exports = GameLoop;
