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
                // Rafts cannot fire cannons
                if (player.isRaft) continue;

                if (now - player.lastShotTimeLeft >= player.fireRate) {
                    // Fire left broadside - rotation + PI points left
                    const baseAngle = player.rotation + Math.PI;
                    this.fireCannons(player.id, player.x, player.y, baseAngle);
                    player.lastShotTimeLeft = now;
                }
            }

            // Handle Broadside Right (E)
            if (inputData.shootRight) {
                // Rafts cannot fire cannons
                if (player.isRaft) continue;

                if (now - player.lastShotTimeRight >= player.fireRate) {
                    // Fire right broadside - rotation points right
                    const baseAngle = player.rotation;
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

    handleEnterHarbor(socket) {
        const player = this.world.getEntity(socket.id);
        if (!player || !player.nearHarbor) return;

        // Get harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (!harbor) return;

        // Dock the ship (stop movement)
        player.inHarbor = true;
        player.dockedHarborId = harbor.id;
        player.speed = 0;
        player.sailState = 0;

        // Check if player is on raft - auto-convert to Sloop
        if (player.isRaft) {
            const Ship = require('./Ship');
            player.fleet = [new Ship('SLOOP')];
            player.flagshipIndex = 0;
            player.isRaft = false;
            console.log(`Player ${player.id} received a new Sloop at ${harbor.name}`);
        }

        // Send harbor data to client
        const harborData = {
            harborName: harbor.name,
            fleet: player.fleet.map(ship => ship.serialize())
        };
        socket.emit('harborData', harborData);
    }

    handleRepairShip(playerId) {
        const player = this.world.getEntity(playerId);
        if (!player || player.isRaft) return;

        // Repair flagship to full health
        player.flagship.health = player.flagship.maxHealth;
        console.log(`Player ${playerId} repaired flagship`);

        // Send updated harbor data
        const harbor = this.world.harbors.find(h => h.id === player.nearHarbor);
        if (harbor) {
            const harborData = {
                harborName: harbor.name,
                fleet: player.fleet.map(ship => ship.serialize())
            };
            this.io.to(playerId).emit('harborData', harborData);
        }
    }

    handleCloseHarbor(playerId) {
        const player = this.world.getEntity(playerId);
        if (!player) return;

        // Undock and respawn ship outside harbor
        if (player.inHarbor && player.dockedHarborId) {
            const harbor = this.world.harbors.find(h => h.id === player.dockedHarborId);
            if (harbor) {
                // Calculate position outside harbor (opposite side from island)
                const island = this.world.islands.find(i => i.id === harbor.island.id);
                if (island) {
                    // Vector from island to harbor
                    const dx = harbor.x - island.x;
                    const dy = harbor.y - island.y;
                    const dist = Math.hypot(dx, dy);

                    // Place ship 50 units beyond harbor
                    const spawnDist = dist + 50;
                    player.x = island.x + (dx / dist) * spawnDist;
                    player.y = island.y + (dy / dist) * spawnDist;

                    console.log(`Player ${playerId} left ${harbor.name}`);
                }
            }

            player.inHarbor = false;
            player.dockedHarborId = null;
        }
    }
}

module.exports = GameLoop;
