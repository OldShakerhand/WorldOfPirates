const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Debug flag for hitbox visualization (set to true to see hitboxes)
const DEBUG_HITBOXES = true;

// DEBUG ONLY: Collision diagnostics visualization
// Set to true to see projectile trails (previous → current position)
// This is temporary instrumentation to diagnose intermittent collision misses
// NO gameplay behavior is modified when enabled
const DEBUG_COLLISION_VISUAL = false;

// DEBUG ONLY: Tilemap visualization
// Set to true to render server-authoritative tilemap for testing/debugging
// This is TEMPORARY and NOT a gameplay feature - purely for visual feedback during development
// Server remains 100% authoritative, this is informational only
// IMPORTANT: Easy to disable - set to false when not needed
const DEBUG_RENDER_TILEMAP = true;

// Visual Constants - centralized styling
const COLORS = {
    OCEAN_DEEP: '#3498db',
    OCEAN_SHALLOW: '#5dade2',
    SHIELD_GOLD: '#FFD700',
    SHIELD_GLOW: '#FFF700',
    PLAYER_SHIP: '#f1c40f',
    OTHER_SHIP: '#ecf0f1',
    HEALTH_BAR_BG: 'red',
    HEALTH_BAR_FG: '#2ecc71'
};

const SHIELD_CONFIG = {
    RADIUS: 25,
    GLOW_RADIUS: 28,
    LINE_WIDTH: 4,
    GLOW_WIDTH: 2,
    ALPHA: 0.8,
    GLOW_ALPHA: 0.5
};

// Ship sprite loading
const shipImages = {};
const SHIP_SPRITE_MAP = {
    'Sloop': 'sloop',
    'Pinnace': 'pinnace',
    'Barque': 'barque',
    'Fluyt': 'fluyt', // Base name for Fluyt (will load 3 variants)
    'Merchant': 'merchant',
    'Frigate': 'frigate',
    'Fast Galleon': 'fast_galleon',
    'Spanish Galleon': 'spanish_galleon',
    'War Galleon': 'war_galleon'
};

// Preload ship sprites
function preloadShipSprites() {
    Object.entries(SHIP_SPRITE_MAP).forEach(([shipName, spriteKey]) => {
        // Load 3 sail state variants for all ships (0 = no sails, 1 = half sails, 2 = full sails)
        // If the variant files don't exist, they'll fail to load but won't break the game
        shipImages[`${shipName}_0`] = new Image();
        shipImages[`${shipName}_0`].src = `/assets/ships/${spriteKey}_0.png`;

        shipImages[`${shipName}_1`] = new Image();
        shipImages[`${shipName}_1`].src = `/assets/ships/${spriteKey}_1.png`;

        shipImages[`${shipName}_2`] = new Image();
        shipImages[`${shipName}_2`].src = `/assets/ships/${spriteKey}_2.png`;

        // Also load the base sprite as fallback (for ships without sail variants yet)
        const img = new Image();
        img.src = `/assets/ships/${spriteKey}.png`;
        shipImages[shipName] = img;
    });
}

// Call preload immediately
preloadShipSprites();

// Ship class properties - loaded from server via shipMetadata event
let SHIP_PROPERTIES = {
    // Default fallback for Raft (not in SHIP_CLASSES)
    'Raft': { spriteWidth: 20, spriteHeight: 30, spriteRotation: 0 }
};

function getShipProperties(shipClassName) {
    return SHIP_PROPERTIES[shipClassName] || SHIP_PROPERTIES['Raft'];
}

// World dimensions (Gulf of Mexico + Caribbean: 6460×3403 tiles @ 25px = 161,500×85,075 pixels)
const WORLD_WIDTH = 161500;
const WORLD_HEIGHT = 85075;

// Set canvas resolution to 1024x768
canvas.width = 1024;
canvas.height = 768;

// DEBUG ONLY: Load tilemap for visualization
// This is TEMPORARY and does NOT affect server authority
// Server remains 100% authoritative for all gameplay logic
let worldTilemap = null;
if (typeof DEBUG_RENDER_TILEMAP !== 'undefined' && DEBUG_RENDER_TILEMAP) {
    fetch('/assets/world_map.json')
        .then(response => response.json())
        .then(data => {
            worldTilemap = data;
            console.log('[DEBUG] Tilemap loaded for visualization:', data.width, 'x', data.height, 'tiles');
        })
        .catch(err => console.warn('[DEBUG] Could not load tilemap for visualization:', err));
}

function renderGame(state, mapData, myId) {
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

    // Use map data for world dimensions
    const worldWidth = mapData.width;
    const worldHeight = mapData.height;

    // DEBUG ONLY: Render tilemap visualization
    // This is TEMPORARY - purely for testing server-authoritative terrain
    // NO gameplay logic depends on this rendering
    if (DEBUG_RENDER_TILEMAP && worldTilemap && typeof drawTilemapDebug !== 'undefined') {
        drawTilemapDebug(worldTilemap, ctx, canvas);
    }

    // Draw islands and shallow water with world wrapping
    if (mapData.islands) {
        for (const island of mapData.islands) {
            // Calculate wrapping threshold based on viewport size and island size
            // An island should wrap if it could be visible from the other side
            const wrapThreshold = Math.max(canvas.width / 2, canvas.height / 2) + island.shallowWaterRadius;

            // Draw at actual position
            drawIslandWithShallowWater(island);

            // Draw wrapped versions if island is near world edges
            const islandCopy = { ...island };

            // Horizontal wrapping
            if (island.x < wrapThreshold) {
                // Island near left edge, draw copy on right
                islandCopy.x = island.x + worldWidth;
                islandCopy.y = island.y;
                drawIslandWithShallowWater(islandCopy);
            } else if (island.x > worldWidth - wrapThreshold) {
                // Island near right edge, draw copy on left
                islandCopy.x = island.x - worldWidth;
                islandCopy.y = island.y;
                drawIslandWithShallowWater(islandCopy);
            }

            // Vertical wrapping
            if (island.y < wrapThreshold) {
                // Island near top edge, draw copy on bottom
                islandCopy.x = island.x;
                islandCopy.y = island.y + worldHeight;
                drawIslandWithShallowWater(islandCopy);
            } else if (island.y > worldHeight - wrapThreshold) {
                // Island near bottom edge, draw copy on top
                islandCopy.x = island.x;
                islandCopy.y = island.y - worldHeight;
                drawIslandWithShallowWater(islandCopy);
            }

            // Corner wrapping (if island is near both edges)
            if (island.x < wrapThreshold && island.y < wrapThreshold) {
                islandCopy.x = island.x + worldWidth;
                islandCopy.y = island.y + worldHeight;
                drawIslandWithShallowWater(islandCopy);
            } else if (island.x > worldWidth - wrapThreshold && island.y < wrapThreshold) {
                islandCopy.x = island.x - worldWidth;
                islandCopy.y = island.y + worldHeight;
                drawIslandWithShallowWater(islandCopy);
            } else if (island.x < wrapThreshold && island.y > worldHeight - wrapThreshold) {
                islandCopy.x = island.x + worldWidth;
                islandCopy.y = island.y - worldHeight;
                drawIslandWithShallowWater(islandCopy);
            } else if (island.x > worldWidth - wrapThreshold && island.y > worldHeight - wrapThreshold) {
                islandCopy.x = island.x - worldWidth;
                islandCopy.y = island.y - worldHeight;
                drawIslandWithShallowWater(islandCopy);
            }
        }
    }

    // Draw harbors with world wrapping
    if (mapData.harbors) {
        for (const harbor of mapData.harbors) {
            // Draw at actual position
            drawHarbor(harbor);

            // Draw wrapped versions
            const harborCopy = { ...harbor };

            // Horizontal wrapping
            if (harbor.x < canvas.width / 2) {
                harborCopy.x = harbor.x + worldWidth;
                drawHarbor(harborCopy);
            } else if (harbor.x > worldWidth - canvas.width / 2) {
                harborCopy.x = harbor.x - worldWidth;
                drawHarbor(harborCopy);
            }

            // Vertical wrapping
            harborCopy.x = harbor.x;
            if (harbor.y < canvas.height / 2) {
                harborCopy.y = harbor.y + worldHeight;
                drawHarbor(harborCopy);
            } else if (harbor.y > worldHeight - canvas.height / 2) {
                harborCopy.y = harbor.y - worldHeight;
                drawHarbor(harborCopy);
            }
        }
    }

    // Draw players with world wrapping
    for (const id in state.players) {
        const player = state.players[id];

        // Draw ship at its actual position
        drawShip(player, id === myId);

        // Also draw wrapped versions if near world edges
        // This ensures ships are visible when they wrap around
        const playerCopy = { ...player };

        // Check if we need to draw wrapped versions
        // Horizontal wrapping
        if (player.x < canvas.width / 2) {
            playerCopy.x = player.x + worldWidth;
            drawShip(playerCopy, id === myId);
        } else if (player.x > worldWidth - canvas.width / 2) {
            playerCopy.x = player.x - worldWidth;
            drawShip(playerCopy, id === myId);
        }

        // Vertical wrapping
        playerCopy.x = player.x; // Reset x
        if (player.y < canvas.height / 2) {
            playerCopy.y = player.y + worldHeight;
            drawShip(playerCopy, id === myId);
        } else if (player.y > worldHeight - canvas.height / 2) {
            playerCopy.y = player.y - worldHeight;
            drawShip(playerCopy, id === myId);
        }

        // Corner wrapping (diagonal)
        if ((player.x < canvas.width / 2) && (player.y < canvas.height / 2)) {
            playerCopy.x = player.x + worldWidth;
            playerCopy.y = player.y + worldHeight;
            drawShip(playerCopy, id === myId);
        } else if ((player.x > worldWidth - canvas.width / 2) && (player.y < canvas.height / 2)) {
            playerCopy.x = player.x - worldWidth;
            playerCopy.y = player.y + worldHeight;
            drawShip(playerCopy, id === myId);
        } else if ((player.x < canvas.width / 2) && (player.y > worldHeight - canvas.height / 2)) {
            playerCopy.x = player.x + worldWidth;
            playerCopy.y = player.y - worldHeight;
            drawShip(playerCopy, id === myId);
        } else if ((player.x > worldWidth - canvas.width / 2) && (player.y > worldHeight - canvas.height / 2)) {
            playerCopy.x = player.x - worldWidth;
            playerCopy.y = player.y - worldHeight;
            drawShip(playerCopy, id === myId);
        }
    }

    // Draw projectiles (BEFORE restore so camera transform is applied!)
    if (state.projectiles) {
        // Get config values with fallbacks
        const ballRadius = window.COMBAT_CONFIG?.projectileBallRadius || 3;
        const shadowRadius = window.COMBAT_CONFIG?.projectileShadowRadius || 2;

        ctx.fillStyle = 'black';
        for (const proj of state.projectiles) {
            ctx.beginPath();
            // Simple 3D effect: Y position - Z position
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.arc(proj.x, proj.y, shadowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ball
            ctx.fillStyle = 'black';
            ctx.beginPath();
            const visualY = proj.y - (proj.z || 0);
            ctx.arc(proj.x, visualY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Restore context to draw UI elements at fixed positions
    ctx.restore();

    // DEBUG: Draw ship coordinates in upper right corner
    if (myShip && DEBUG_RENDER_TILEMAP) {
        ctx.save();
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;

        const coordText = `X: ${Math.round(myShip.x)} Y: ${Math.round(myShip.y)}`;
        ctx.strokeText(coordText, canvas.width - 10, 50);
        ctx.fillText(coordText, canvas.width - 10, 50);
        ctx.restore();
    }

    // Draw UI elements (windrose, speed) - these stay fixed on screen
    if (state.wind) {
        drawWindrose(state.wind);
    }

    if (myShip) {
        drawSpeedDisplay(myShip);
        drawFleetUI(myShip);

        // Show harbor prompt if near a harbor
        if (myShip.nearHarbor) {
            ctx.save();
            ctx.font = '16px Arial';
            ctx.fillStyle = 'yellow';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            const text = 'Press H to enter harbor';
            ctx.strokeText(text, canvas.width / 2, canvas.height - 50);
            ctx.fillText(text, canvas.width / 2, canvas.height - 50);
            ctx.restore();
        }
    }
}

function drawIslandWithShallowWater(island) {
    ctx.save();

    // Draw shallow water zone (warmer blue)
    ctx.fillStyle = '#5dade2'; // Light/warm blue
    ctx.beginPath();
    ctx.arc(island.x, island.y, island.shallowWaterRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw island land (brown/tan)
    ctx.fillStyle = '#8B7355'; // Sandy brown
    ctx.beginPath();
    ctx.arc(island.x, island.y, island.radius, 0, Math.PI * 2);
    ctx.fill();

    // Add some texture/detail to island
    ctx.strokeStyle = '#6B5345'; // Darker brown outline
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function drawHarbor(harbor) {
    ctx.save();

    // Draw dock/pier (simple rectangle)
    ctx.fillStyle = '#808080'; // TEMPORARY: Grey for better visualization during testing
    ctx.fillRect(harbor.x - 10, harbor.y - 20, 20, 40);

    // Draw outline
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(harbor.x - 10, harbor.y - 20, 20, 40);

    // Draw harbor name (small text)
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(harbor.name, harbor.x, harbor.y - 25);

    ctx.restore();
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

function drawFleetUI(player) {
    const x = 60;
    const y = 130; // Below windrose

    ctx.save();
    ctx.font = '14px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    // Fleet size
    const fleetText = `Fleet: ${player.fleetSize}`;
    ctx.strokeText(fleetText, x - 30, y);
    ctx.fillText(fleetText, x - 30, y);

    // Ship class
    const shipText = player.isRaft ? 'RAFT' : player.shipClassName;
    ctx.strokeText(shipText, x - 30, y + 20);
    ctx.fillText(shipText, x - 30, y + 20);

    // Shield indicator
    if (player.hasShield) {
        ctx.fillStyle = COLORS.SHIELD_GOLD;
        ctx.fillText('🛡️ SHIELD', x - 30, y + 40);
    }

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

    // Color based on wind efficiency
    if (!player.isInDeepWater) {
        ctx.fillStyle = '#e74c3c'; // Red for shallow water
    } else if (player.sailState === 0) {
        ctx.fillStyle = '#7f8c8d'; // Dark grey when stopped
    } else {
        // Wind efficiency indicator (based on wind angle modifier)
        // NOTE: These thresholds must match PhysicsConfig.WIND_EFFICIENCY_* values
        const efficiency = player.windEfficiency || 0;
        if (efficiency >= 1.0) { // WIND_EFFICIENCY_EXCELLENT
            ctx.fillStyle = '#2ecc71'; // Bright green - excellent (100%)
        } else if (efficiency >= 0.85) { // WIND_EFFICIENCY_GOOD
            ctx.fillStyle = '#f1c40f'; // Yellow - good (85%)
        } else if (efficiency >= 0.65) { // WIND_EFFICIENCY_MODERATE
            ctx.fillStyle = '#f39c12'; // Orange - moderate (65%)
        } else { // WIND_EFFICIENCY_POOR (0.40)
            ctx.fillStyle = '#e74c3c'; // Red - poor (40%)
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

    // FIRST: Draw ship sprite (behind everything)
    ctx.save();
    ctx.rotate(player.rotation);

    // Get the appropriate sprite for this ship
    let sprite;
    const sailState = player.sailState || 0;

    // Try to load sail state variant first
    const variantSprite = shipImages[`${player.shipClassName}_${sailState}`];

    // Use variant if it exists and is loaded, otherwise fall back to base sprite
    if (variantSprite && variantSprite.complete && variantSprite.naturalWidth > 0) {
        sprite = variantSprite;
    } else {
        // Fallback to base sprite (for ships without sail variants yet)
        sprite = shipImages[player.shipClassName];
    }

    if (sprite && sprite.complete) {
        const shipProps = getShipProperties(player.shipClassName);

        if (shipProps.spriteRotation !== 0) {
            ctx.rotate(shipProps.spriteRotation);
        }

        ctx.drawImage(
            sprite,
            -shipProps.spriteWidth / 2,
            -shipProps.spriteHeight / 2,
            shipProps.spriteWidth,
            shipProps.spriteHeight
        );
    } else {
        ctx.rotate(-Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-10, 7);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -7);
        ctx.closePath();

        ctx.fillStyle = isMe ? '#f1c40f' : '#ecf0f1';
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();

    // SECOND: Draw UI elements (on top)
    ctx.fillStyle = 'red';
    ctx.fillRect(-15, -30, 30, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(-15, -30, 30 * (player.health / player.maxHealth), 4);

    if (isMe) {
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        let sailText = "STOP";
        if (player.sailState === 1) sailText = "HALF";
        if (player.sailState === 2) sailText = "FULL";
        const shieldIcon = player.hasShield ? ' ' : '';
        ctx.fillText(sailText + shieldIcon, 0, -35);

        const leftPct = (player.reloadLeft || 0) / (player.maxReload || 1);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-25, -5, 4, 10 * (1 - leftPct));

        const rightPct = (player.reloadRight || 0) / (player.maxReload || 1);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(21, -5, 4, 10 * (1 - rightPct));
    }

    ctx.restore();

    // Draw shield AFTER restore so it's not rotated
    if (player.hasShield) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.beginPath();
        ctx.arc(0, 0, SHIELD_CONFIG.RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.SHIELD_GOLD;
        ctx.lineWidth = SHIELD_CONFIG.LINE_WIDTH;
        ctx.globalAlpha = SHIELD_CONFIG.ALPHA;
        ctx.stroke();
        // Add inner glow
        ctx.strokeStyle = COLORS.SHIELD_GLOW;
        ctx.lineWidth = SHIELD_CONFIG.GLOW_WIDTH;
        ctx.globalAlpha = SHIELD_CONFIG.GLOW_ALPHA;
        ctx.beginPath();
        ctx.arc(0, 0, SHIELD_CONFIG.GLOW_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Debug: Draw hitbox (enable with DEBUG_HITBOXES flag)
    if (DEBUG_HITBOXES && !player.isRaft) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.rotation);

        // Calculate hitbox dimensions using ship's configured factors
        const shipProps = getShipProperties(player.shipClassName);
        const hitboxWidth = shipProps.spriteWidth * (shipProps.hitboxWidthFactor || 0.8);
        const hitboxHeight = shipProps.spriteHeight * (shipProps.hitboxHeightFactor || 0.8);

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(
            -hitboxWidth / 2,
            -hitboxHeight / 2,
            hitboxWidth,
            hitboxHeight
        );

        ctx.restore();
    }

    // Draw player name above ship (after shield so it's always visible)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isMe ? '#FFD700' : '#FFFFFF'; // Gold for own name, white for others
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    // Draw name above sail state text (sail state is at -35, so name goes at -48)
    const nameText = player.name || 'Anonymous';
    ctx.strokeText(nameText, 0, -48);
    ctx.fillText(nameText, 0, -48);
    ctx.restore();
}

// Harbor UI Functions
function showHarborUI(harborData) {
    const harborUI = document.getElementById('harborUI');
    const harborTitle = document.getElementById('harborTitle');
    const fleetList = document.getElementById('fleetList');

    harborTitle.textContent = `🏴‍☠️ ${harborData.harborName}`;

    // Display fleet
    let fleetHTML = '';
    harborData.fleet.forEach((ship, index) => {
        const isFlagship = index === 0;
        const health = Math.round(ship.health);
        const maxHealth = Math.round(ship.maxHealth);
        fleetHTML += `
            <div style="padding: 5px; ${isFlagship ? 'font-weight: bold;' : ''}">
                ${isFlagship ? '⚓ ' : '• '}${ship.shipClass} - HP: ${health}/${maxHealth}
            </div>
        `;
    });

    fleetList.innerHTML = fleetHTML;

    // Show/hide repair button based on damage
    const repairBtn = document.getElementById('repairBtn');
    if (harborData.fleet[0].health < harborData.fleet[0].maxHealth) {
        repairBtn.style.display = 'block';
        const repairCost = Math.round(harborData.fleet[0].maxHealth - harborData.fleet[0].health);
        repairBtn.textContent = `Repair Flagship (${repairCost} HP)`;
    } else {
        repairBtn.style.display = 'none';
    }

    harborUI.style.display = 'flex';
}

function hideHarborUI() {
    document.getElementById('harborUI').style.display = 'none';
}

// Chat Feed Rendering
function renderChatFeed(messages) {
    const chatMessagesDiv = document.getElementById('chatMessages');

    // Clear existing messages
    chatMessagesDiv.innerHTML = '';

    // Render each message
    messages.forEach(message => {
        const messageDiv = document.createElement('div');

        // Apply styling based on message type
        if (message.type === 'system') {
            messageDiv.className = 'chat-message-system';
        }
        // Future: add 'chat-message-player' class for player messages

        messageDiv.textContent = message.text;
        chatMessagesDiv.appendChild(messageDiv);
    });

    // Auto-scroll to bottom (show latest messages)
    chatMessagesDiv.parentElement.scrollTop = chatMessagesDiv.parentElement.scrollHeight;
}

