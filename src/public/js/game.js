const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function renderGame(state, myId) {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find my ship for camera tracking
    const myShip = state.players[myId];

    // Camera offset to center on player
    let cameraX = 0;
    let cameraY = 0;

    if (myShip) {
        cameraX = canvas.width / 2 - myShip.x;
        cameraY = canvas.height / 2 - myShip.y;
    }

    // Save context for UI elements that should stay fixed
    ctx.save();

    // Apply camera transform for world objects
    ctx.translate(cameraX, cameraY);

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

    // Restore context to draw UI elements at fixed positions
    ctx.restore();

    // Draw UI elements (windrose, speed) - these stay fixed on screen
    if (state.wind) {
        drawWindrose(state.wind);
    }

    if (myShip) {
        drawSpeedDisplay(myShip);
    }
}

function drawWindrose(wind) {
    const x = 60;
    const y = 60;
    const radius = 40;

    ctx.save();
    ctx.translate(x, y);

    // Background circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wind direction arrow(s)
    // wind.direction is where wind comes FROM
    // We want arrows to point where it's blowing TO (opposite direction)
    ctx.rotate(wind.direction + Math.PI);

    // Determine number of arrows based on strength
    let arrowColors = [];
    if (wind.strength === 'LOW') {
        arrowColors = ['#e74c3c']; // Red only
    } else if (wind.strength === 'NORMAL') {
        arrowColors = ['#e74c3c', '#e67e22']; // Red + Orange
    } else { // FULL
        arrowColors = ['#e74c3c', '#e67e22', '#f1c40f']; // Red + Orange + Yellow
    }

    // Draw arrows
    arrowColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        const offset = (i - (arrowColors.length - 1) / 2) * 8;
        ctx.moveTo(offset, -radius + 10);
        ctx.lineTo(offset + 5, -radius + 20);
        ctx.lineTo(offset - 5, -radius + 20);
        ctx.closePath();
        ctx.fill();
    });

    ctx.restore();
}

function drawSpeedDisplay(player) {
    const x = canvas.width - 100;
    const y = 30;

    ctx.save();
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    // Speed text
    const speedText = `${player.speedInKnots} kn`;
    ctx.strokeText(speedText, x, y);
    ctx.fillText(speedText, x, y);

    // Speed indicator light
    const lightX = x + 60;
    const lightY = y - 6;
    const lightRadius = 8;

    ctx.beginPath();
    ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);

    // Color based on conditions
    if (!player.isInDeepWater) {
        ctx.fillStyle = '#e74c3c'; // Red for shallow water
    } else {
        // Green to gray based on speed efficiency
        // This is a simplified version - could be more sophisticated
        const speedRatio = player.speedInKnots / 12; // Assuming max ~12 knots
        if (speedRatio > 0.8) {
            ctx.fillStyle = '#2ecc71'; // Light green
        } else if (speedRatio > 0.5) {
            ctx.fillStyle = '#95a5a6'; // Grey
        } else {
            ctx.fillStyle = '#7f8c8d'; // Dark grey
        }
    }

    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
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
