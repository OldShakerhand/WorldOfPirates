const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameLoop = require('./game/GameLoop');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Game Loop
const gameLoop = new GameLoop(io);
gameLoop.start();

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    gameLoop.addPlayer(socket);

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        gameLoop.removePlayer(socket.id);
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
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
