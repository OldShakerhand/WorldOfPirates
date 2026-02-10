const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameLoop = require('./game/GameLoop');
const ChangelogParser = require('./utils/ChangelogParser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Changelog Parser
const changelogParser = new ChangelogParser(path.join(__dirname, '../../docs/meta/CHANGELOG.md'));
const latestChangelog = changelogParser.getLatest();

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 20; // Server capacity limit

// Player tracking
let playerCount = 0;

// Ban system
// To ban a player, add their IP address to this set
// Example: bannedIPs.add('123.45.67.89');
const bannedIPs = new Set([
    // Add banned IPs here, one per line
    // '123.45.67.89',
]);

// Chat system
const playerChatCooldowns = new Map(); // Track last message time per player

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Game Loop
const gameLoop = new GameLoop(io);
gameLoop.start();

io.on('connection', (socket) => {
    // Get client IP address (handle reverse proxy on Render.com)
    // X-Forwarded-For header contains the real client IP when behind a proxy
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : socket.handshake.address;

    console.log(`Socket connected: ${socket.id} from IP: ${clientIP}, waiting for player name...`);

    // Send latest changelog data to client
    if (latestChangelog) {
        socket.emit('changelogData', latestChangelog);
    }

    // Check if IP is banned
    if (bannedIPs.has(clientIP)) {
        console.log(`[BAN] Rejected banned IP: ${clientIP} (Socket: ${socket.id})`);
        socket.emit('banned', {
            reason: 'You have been banned from this server.'
        });
        socket.disconnect();
        return;
    }

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
            // Log IP address on successful join
            console.log(`[JOIN] Player "${playerName}" (${socket.id}) joined from IP: ${clientIP}`);
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

            // Emit leave message to all players
            const leaveMessage = {
                type: 'system',
                timestamp: Date.now(),
                text: `🚪 ${player.name} left the game`
            };
            io.emit('chatMessage', leaveMessage);
            console.log(`[Chat] ${leaveMessage.text}`);

            gameLoop.removePlayer(socket.id);

            // Clean up chat cooldown
            playerChatCooldowns.delete(socket.id);
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
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            console.warn('[DEBUG] Invalid teleport coordinates:', data);
            return;
        }

        // Clamp to world bounds
        const { GAME } = require('./game/config/GameConfig'); // Access GAME namespace
        const clampedX = Math.max(0, Math.min(x, GAME.WORLD_WIDTH));
        const clampedY = Math.max(0, Math.min(y, GAME.WORLD_HEIGHT));

        console.log(`[DEBUG] Teleporting ${player.name} to (${clampedX}, ${clampedY})`);

        player.x = clampedX;
        player.y = clampedY;
        player.velocityX = 0;
        player.velocityY = 0;
    });

    socket.on('switchFlagship', (shipClass) => {
        gameLoop.handleSwitchFlagship(socket.id, shipClass);
    });

    socket.on('upgradeShip', (shipClass) => {
        gameLoop.handleUpgradeShip(socket.id, shipClass);
    });

    // Economy: Buy goods (Phase 0)
    socket.on('buyGood', (data) => {
        gameLoop.handleBuyGood(socket.id, data.harborId, data.goodId, data.quantity);
    });

    // Economy: Sell goods (Phase 0)
    socket.on('sellGood', (data) => {
        gameLoop.handleSellGood(socket.id, data.harborId, data.goodId, data.quantity);
    });

    // Loot Wreck
    socket.on('lootWreck', (wreckId) => {
        gameLoop.handleLootWreck(socket, wreckId);
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

    // Player Chat
    socket.on('playerChat', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        // Validate message
        if (!data || !data.message || typeof data.message !== 'string') return;

        const message = data.message.trim();

        // Ignore empty messages
        if (message.length === 0) return;

        // Validate message length (max 200 characters)
        if (message.length > 200) {
            console.log(`[Chat] ${player.name}: Message too long (${message.length} chars)`);
            return;
        }

        // Spam protection: 1 message per second
        const now = Date.now();
        const lastMessageTime = playerChatCooldowns.get(socket.id) || 0;
        if (now - lastMessageTime < 1000) {
            console.log(`[Chat] ${player.name}: Spam protection triggered`);
            return;
        }
        playerChatCooldowns.set(socket.id, now);

        // Create chat message
        const chatMessage = {
            type: 'player',
            timestamp: now,
            playerName: player.name,
            text: message
        };

        // Broadcast to all players
        io.emit('chatMessage', chatMessage);

        // Log to console (visible in Render.com dashboard)
        console.log(`[Chat] ${player.name}: ${message}`);
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

    // Accept Mission (Phase 1: Harbor integration)
    socket.on('acceptMission', (data) => {
        const player = gameLoop.world.getEntity(socket.id);
        if (!player) return;

        // Validate player is docked
        if (!player.inHarbor) {
            console.log(`[Mission] ${player.name} tried to accept mission while not docked`);
            return;
        }

        // Validate no active mission
        const existingMission = gameLoop.world.missionManager.getPlayerMission(socket.id);
        if (existingMission && existingMission.state === 'ACTIVE') {
            console.log(`[Mission] ${player.name} already has active mission`);
            return;
        }

        // Create mission based on type (reuse debug logic)
        const SailToHarborMission = require('./game/missions/SailToHarborMission');
        const EscortMission = require('./game/missions/EscortMission');

        let mission = null;

        switch (data.type) {
            case 'SAIL_TO_HARBOR':
                // Use target harbor from mission data (already selected by MissionManager)
                if (data.targetHarborId && data.targetHarborName) {
                    mission = new SailToHarborMission(null, socket.id, data.targetHarborId, data.targetHarborName);
                    console.log(`[Mission] ${player.name} accepted: Sail to ${data.targetHarborName}`);
                }
                break;

            case 'ESCORT':
                // Spawn trader NPC
                const trader = gameLoop.world.npcManager.spawnTrader(player.x, player.y);

                // Use target harbor from mission data
                if (trader && data.targetHarborId && data.targetHarborName) {
                    trader.targetHarborId = data.targetHarborId;
                    mission = new EscortMission(
                        null, socket.id,
                        trader.id,
                        data.targetHarborId,
                        data.targetHarborName,
                        800
                    );
                    console.log(`[Mission] ${player.name} accepted: Escort to ${data.targetHarborName}`);
                }
                break;
        }

        if (mission) {
            gameLoop.world.missionManager.assignMission(socket.id, mission);
        }
    });

    // Cancel Mission
    socket.on('cancelMission', () => {
        gameLoop.world.missionManager.cancelMission(socket.id);
        // UI update will happen via next gamestate_update where mission is null
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
    const { GAME } = require('./game/config/GameConfig');
    availableHarbors.sort((a, b) => {
        const harborAX = a.tileX * GAME.TILE_SIZE;
        const harborAY = a.tileY * GAME.TILE_SIZE;
        const harborBX = b.tileX * GAME.TILE_SIZE;
        const harborBY = b.tileY * GAME.TILE_SIZE;

        const distA = Math.hypot(harborAX - player.x, harborAY - player.y);
        const distB = Math.hypot(harborBX - player.x, harborBY - player.y);
        return distA - distB;
    });

    // Return second closest (index 1) to avoid picking the one we're at
    // If we're not in a harbor, return closest (index 0)
    const targetHarborData = player.inHarbor ? availableHarbors[1] : availableHarbors[0];

    if (targetHarborData) {
        return {
            id: targetHarborData.id,
            name: targetHarborData.name,
            x: targetHarborData.tileX * GAME.TILE_SIZE,
            y: targetHarborData.tileY * GAME.TILE_SIZE
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
