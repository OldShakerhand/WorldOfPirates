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

    socket.on('switchFlagship', (shipClass) => {
        gameLoop.handleSwitchFlagship(socket.id, shipClass);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
