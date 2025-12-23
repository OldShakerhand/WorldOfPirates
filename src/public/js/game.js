const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function renderGame(state, myId) {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw players
    for (const id in state.players) {
        const player = state.players[id];
        drawShip(player, id === myId);
    }

    // Draw projectiles
    if (state.projectiles) {
        ctx.fillStyle = 'black';
        for (const proj of state.projectiles) {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawShip(player, isMe) {
    ctx.save();
    ctx.translate(player.x, player.y);
    // Draw Health Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(-15, -20, 30, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(-15, -20, 30 * (player.health / player.maxHealth), 4);

    ctx.rotate(player.rotation);

    // Draw simplified ship (triangle)
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-10, 7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -7);
    ctx.closePath();

    ctx.fillStyle = isMe ? '#f1c40f' : '#ecf0f1'; // Gold for self, white for others
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}
