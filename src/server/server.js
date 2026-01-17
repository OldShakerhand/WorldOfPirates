const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameLoop = require('./game/GameLoop');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 20; // Server capacity limit

// Player tracking
let playerCount = 0;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Game Loop
const gameLoop = new GameLoop(io);
gameLoop.start();

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}, waiting for player name...`);

    // Wait for player to set their name before adding to game
    socket.on('setPlayerName', (data) => {
        // Check if server is full
        if (playerCount >= MAX_PLAYERS) {
            console.log(`Server full (${MAX_PLAYERS}/${MAX_PLAYERS}). Rejecting ${socket.id}`);
            socket.emit('server_full', {
                message: 'Server is full. Please try again later.',
                maxPlayers: MAX_PLAYERS
            });
            socket.disconnect();
            return;
        }

        const playerName = data.name || 'Anonymous';
        const customSpawn = data.spawn || null;  // Optional {x, y} for testing

        // Try to add player (includes validation)
        const success = gameLoop.addPlayer(socket, playerName, customSpawn);

        if (success) {
            playerCount++;
            console.log(`Player count: ${playerCount}/${MAX_PLAYERS}`);
        }
        // If not successful, addPlayer already handled disconnect
    });

    socket.on('disconnect', () => {
        // Only decrement if player was actually added to game
        const player = gameLoop.world.entities[socket.id];
        if (player) {
            playerCount--;
            console.log(`Player disconnected: ${socket.id} (${playerCount}/${MAX_PLAYERS})`);
            gameLoop.removePlayer(socket.id);
        } else {
            console.log(`Socket disconnected before joining: ${socket.id}`);
        }
    });

    socket.on('input', (data) => {
        gameLoop.handleInput(socket.id, data);
    });

    socket.on('enterHarbor', () => {
        gameLoop.handleEnterHarbor(socket);
    });

    socket.on('repairShip', () => {
        gameLoop.handleRepairShip(socket.id);
    });

    socket.on('closeHarbor', () => {
        gameLoop.handleCloseHarbor(socket.id);
    });

    // DEBUG: Teleport command for harbor positioning
    // ⚠️ WARNING: REMOVE THIS BEFORE PRODUCTION
    socket.on('debug_teleport', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        const { x, y } = data;

        // Validate coordinates
        if (typeof x !== 'number' || typeof y !== 'number') {
            console.warn('[DEBUG] Invalid teleport coordinates:', data);
            return;
        }

        // Clamp to world bounds
        const GameConfig = require('./game/GameConfig'); // Assuming GameConfig is available or imported
        const clampedX = Math.max(0, Math.min(x, GameConfig.WORLD_WIDTH));
        const clampedY = Math.max(0, Math.min(y, GameConfig.WORLD_HEIGHT));

        console.log(`[DEBUG] Teleporting ${player.name} to (${clampedX}, ${clampedY})`);

        player.x = clampedX;
        player.y = clampedY;
        player.velocityX = 0;
        player.velocityY = 0;
    });

    socket.on('switchFlagship', (shipClass) => {
        gameLoop.handleSwitchFlagship(socket.id, shipClass);
    });

    // NPC Spawn: N key (spawn single trader near player)
    socket.on('spawnNPC', () => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        console.log(`[NPC] ${player.name} requested NPC spawn`);
        gameLoop.world.npcManager.spawnTrader(player.x, player.y);
    });

    // DEBUG: Spawn multiple NPCs (command: /spawn_npcs N)
    socket.on('debug_spawn_npcs', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        const count = parseInt(data.count) || 1;
        const maxSpawn = 10; // Safety limit
        const actualCount = Math.min(count, maxSpawn);

        console.log(`[DEBUG] ${player.name} spawning ${actualCount} NPCs`);

        for (let i = 0; i < actualCount; i++) {
            gameLoop.world.npcManager.spawnTrader(player.x, player.y);
        }
    });

    // Combat NPC Spawn: P key (spawn single pirate near player)
    socket.on('spawnCombatNPC', () => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        console.log(`[COMBAT] ${player.name} requested pirate spawn`);
        gameLoop.world.npcManager.spawnPirate(player.x, player.y, socket.id);
    });

    // DEBUG: Spawn multiple pirates (command: /spawn_pirates N)
    socket.on('debug_spawn_pirates', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        const count = parseInt(data.count) || 1;
        const maxSpawn = 10; // Safety limit
        const actualCount = Math.min(count, maxSpawn);

        console.log(`[DEBUG] ${player.name} spawning ${actualCount} pirates`);

        for (let i = 0; i < actualCount; i++) {
            gameLoop.world.npcManager.spawnPirate(player.x, player.y, socket.id);
        }
    });

    // DEBUG: Start Mission (Phase 0: Mission scaffolding)
    socket.on('debug_start_mission', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        const SailToHarborMission = require('./game/missions/SailToHarborMission');
        const StayInAreaMission = require('./game/missions/StayInAreaMission');
        const DefeatNPCsMission = require('./game/missions/DefeatNPCsMission');

        let mission = null;

        switch (data.type) {
            case 'SAIL_TO_HARBOR':
                // Find next closest harbor (not current one)
                const targetHarbor = findNextClosestHarbor(player, gameLoop.world);
                if (targetHarbor) {
                    mission = new SailToHarborMission(null, socket.id, targetHarbor.id, targetHarbor.name);
                    console.log(`[Mission] ${player.name}: Sail to ${targetHarbor.name}`);
                }
                break;

            case 'STAY_IN_AREA':
                // Pick a nearby area (500-1000 pixels away)
                const targetArea = findNearbyArea(player);
                mission = new StayInAreaMission(
                    null, socket.id,
                    targetArea.x, targetArea.y,
                    200, // radius
                    10   // duration in seconds
                );
                console.log(`[Mission] ${player.name}: Stay in area for 10s`);
                break;

            case 'DEFEAT_NPCS':
                mission = new DefeatNPCsMission(null, socket.id, data.count || 3);
                console.log(`[Mission] ${player.name}: Defeat ${data.count || 3} NPCs`);
                break;

            case 'ESCORT':
                const EscortMission = require('./game/missions/EscortMission');

                // Check if player already has an active mission
                const existingMission = gameLoop.world.missionManager.getPlayerMission(socket.id);
                if (existingMission && existingMission.state === 'ACTIVE') {
                    console.log(`[Mission] ${player.name} already has active mission, cannot start escort`);
                    return; // Don't spawn NPC if player has active mission
                }

                // Spawn a trader NPC
                const trader = gameLoop.world.npcManager.spawnTrader(player.x, player.y);
                const escortTargetHarbor = findNextClosestHarbor(player, gameLoop.world);

                if (trader && escortTargetHarbor) {
                    // Override trader's target to mission harbor
                    trader.targetHarborId = escortTargetHarbor.id;

                    mission = new EscortMission(
                        null, socket.id,
                        trader.id,
                        escortTargetHarbor.id,
                        escortTargetHarbor.name,
                        800 // max distance
                    );
                    console.log(`[Mission] ${player.name}: Escort ${trader.id} to ${escortTargetHarbor.name}`);
                }
                break;
        }

        if (mission) {
            gameLoop.world.missionManager.assignMission(socket.id, mission);
        }
    });
});

// Helper: Find next closest harbor (skip current one)
function findNextClosestHarbor(player, world) {
    const harbors = world.harborRegistry.getAllHarbors();

    // Filter out current harbor if docked
    const availableHarbors = harbors.filter(h =>
        !player.inHarbor || h.id !== player.dockedHarborId
    );

    // Sort by distance
    availableHarbors.sort((a, b) => {
        const harborAX = a.tileX * require('./game/GameConfig').TILE_SIZE;
        const harborAY = a.tileY * require('./game/GameConfig').TILE_SIZE;
        const harborBX = b.tileX * require('./game/GameConfig').TILE_SIZE;
        const harborBY = b.tileY * require('./game/GameConfig').TILE_SIZE;

        const distA = Math.hypot(harborAX - player.x, harborAY - player.y);
        const distB = Math.hypot(harborBX - player.x, harborBY - player.y);
        return distA - distB;
    });

    // Return second closest (index 1) to avoid picking the one we're at
    // If we're not in a harbor, return closest (index 0)
    const targetHarborData = player.inHarbor ? availableHarbors[1] : availableHarbors[0];

    if (targetHarborData) {
        const GameConfig = require('./game/GameConfig');
        return {
            id: targetHarborData.id,
            name: targetHarborData.name,
            x: targetHarborData.tileX * GameConfig.TILE_SIZE,
            y: targetHarborData.tileY * GameConfig.TILE_SIZE
        };
    }

    return null;
}

// Helper: Find nearby area for testing (500-1000 pixels away)
function findNearbyArea(player) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 500 + Math.random() * 500; // 500-1000 pixels

    return {
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance
    };
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
