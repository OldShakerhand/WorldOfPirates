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
            // Simple 3D effect: Y position - Z position
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
            ctx.fill();

            // Ball
            ctx.fillStyle = 'black';
            ctx.beginPath();
            const visualY = proj.y - (proj.z || 0);
            ctx.arc(proj.x, visualY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawShip(player, isMe) {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Draw Health Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(-15, -30, 30, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(-15, -30, 30 * (player.health / player.maxHealth), 4);

    if (isMe) {
        // Draw Sail State text
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        let sailText = "STOP";
        if (player.sailState === 1) sailText = "HALF";
        if (player.sailState === 2) sailText = "FULL";
        ctx.fillText(sailText, 0, -35);

        // Draw Reload Bars
        // Left
        const leftPct = (player.reloadLeft || 0) / (player.maxReload || 1);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-25, -5, 4, 10 * (1 - leftPct)); // Vertical bar on left side

        // Right
        const rightPct = (player.reloadRight || 0) / (player.maxReload || 1);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(21, -5, 4, 10 * (1 - rightPct)); // Vertical bar on right side
    }

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
