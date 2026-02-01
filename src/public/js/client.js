// Socket connection (will be initialized after name is set)
let socket = null;

// Store static map data (received once on connection)
let mapData = null;

// Chat messages (kill feed)
// ChatMessage: { type: 'system', timestamp: number, text: string }
// - Append-only: messages are never edited or deleted
// - Client stores last 10 messages for display
let chatMessages = [];

// Game state (updated every frame from server)
// GameState: { players: {id: Player}, projectiles: [Projectile] }
window.gameState = { players: {}, projectiles: [] };  // Make globally accessible for debug tools
window.myPlayerId = null;  // Make globally accessible for debug tools

// Sound Manager
const soundManager = new SoundManager();
window.soundManager = soundManager; // Make globally accessible

// Previous player state for detecting changes
let previousPlayerState = null;
let previousNPCStates = {};

// Track projectiles for impact detection
let previousProjectiles = [];

// Notification system for loot/transactions
window.currentNotification = null; // { message: string, timestamp: number, success: boolean }

// DEBUG: Helper function for debug tools to get player position
function getMyShipPosition() {
    if (!window.gameState || !window.myPlayerId) return null;
    const players = Object.values(window.gameState.players || {});
    const myShip = players.find(p => p.id === window.myPlayerId);
    return myShip ? { x: myShip.x, y: myShip.y } : null;
}

// Name input handling
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('playerNameInput');
    const setSailBtn = document.getElementById('setSailBtn');
    const nameError = document.getElementById('nameError');
    const nameOverlay = document.getElementById('nameInputOverlay');

    // Try to load saved name from localStorage
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        nameInput.value = savedName;
    }

    // Focus on input
    nameInput.focus();

    // Handle Enter key
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setSailBtn.click();
        }
    });

    // Handle Set Sail button
    setSailBtn.addEventListener('click', () => {
        const playerName = nameInput.value.trim();

        // Client-side validation
        if (playerName.length < 3 || playerName.length > 20) {
            showError('Name must be 3-20 characters long');
            return;
        }

        if (!/^[a-zA-Z0-9 ]+$/.test(playerName)) {
            showError('Name can only contain letters, numbers, and spaces');
            return;
        }

        // Save to localStorage for convenience
        localStorage.setItem('playerName', playerName);

        // Disable button while connecting
        setSailBtn.disabled = true;
        setSailBtn.textContent = 'Connecting...';

        // Initialize socket connection
        socket = io();

        // Get custom spawn coordinates if provided
        const spawnX = document.getElementById('spawnX').value;
        const spawnY = document.getElementById('spawnY').value;

        let customSpawn = null;
        if (spawnX && spawnY) {
            customSpawn = {
                x: parseInt(spawnX),
                y: parseInt(spawnY)
            };
            console.log('[DEBUG] Custom spawn requested:', customSpawn);
        }

        // Send player name to server (with optional spawn)
        socket.emit('setPlayerName', {
            name: playerName,
            spawn: customSpawn
        });

        // Handle successful connection
        socket.on('map_data', (data) => {
            mapData = data;  // Keep local variable for backward compatibility
            window.mapData = data;  // Also set globally for harbor rendering
            console.log('Received map data:', data);
            console.log('Harbors count:', data.harbors ? data.harbors.length : 0);

            // Initialize sound system (requires user interaction)
            soundManager.init();
            console.log('[Sound] Sound system initialized');

            // Hide name overlay and show game
            nameOverlay.style.display = 'none';
        });

        // Handle name rejection
        socket.on('nameRejected', (data) => {
            showError(data.reason);
            setSailBtn.disabled = false;
            setSailBtn.textContent = 'Set Sail! 🏴‍☠️';
            socket.disconnect();
            socket = null;
        });

        // Handle server full
        socket.on('server_full', (data) => {
            showError(data.message);
            setSailBtn.disabled = false;
            setSailBtn.textContent = 'Set Sail! 🏴‍☠️';
            socket.disconnect();
            socket = null;
        });

        // Setup game event listeners
        setupGameListeners();
    });

    function showError(message) {
        nameError.textContent = message;
        nameError.style.display = 'block';
        setTimeout(() => {
            nameError.style.display = 'none';
        }, 5000);
    }
});

function setupGameListeners() {
    if (!socket) return;

    // Game State handling
    socket.on('gamestate_update', (state) => {
        // Store state globally for debug tools
        window.gameState = state;
        window.myPlayerId = socket.id;

        // Pass both map data and dynamic state to the renderer
        if (mapData) {
            renderGame(state, mapData, socket.id);

            // Update debug minimap (if enabled)
            if (typeof updateMinimap !== 'undefined' && worldTilemap) {
                const myShip = state.players[socket.id];
                updateMinimap(worldTilemap, mapData, myShip);
            }

            // Update sound system
            updateSoundSystem(state);
        }
    });

    // Harbor UI events
    socket.on('harborData', (harborData) => {
        showHarborUI(harborData);
    });

    socket.on('harborClosed', () => {
        hideHarborUI();
    });

    // Ship metadata from server (single source of truth)
    socket.on('shipMetadata', (metadata) => {
        // Merge server metadata with client SHIP_PROPERTIES
        Object.assign(SHIP_PROPERTIES, metadata);
        console.log('Loaded ship metadata from server:', metadata);
    });

    // Combat config from server (visual settings)
    socket.on('combatConfig', (config) => {
        // Store combat visuals globally
        window.COMBAT_CONFIG = config;
        console.log('Loaded combat config from server:', config);
    });

    // Chat messages (kill feed) - event-based, not in game state
    socket.on('chatMessage', (message) => {
        // Add new message to array
        chatMessages.push(message);

        // Keep only last 10 messages
        if (chatMessages.length > 10) {
            chatMessages = chatMessages.slice(-10);
        }

        // Update chat feed UI
        renderChatFeed(chatMessages);
    });

    // Transaction results (loot notifications, trade results, etc.)
    socket.on('transactionResult', (result) => {
        // Display on-screen notification
        const timestamp = Date.now();
        window.currentNotification = {
            message: result.message,
            timestamp: timestamp,
            success: result.success
        };

        // Auto-clear after 4 seconds
        setTimeout(() => {
            if (window.currentNotification && window.currentNotification.timestamp === timestamp) {
                window.currentNotification = null;
            }
        }, 4000);

        // Also update harbor trade UI if present (for trade transactions)
        const statusEl = document.getElementById('transactionStatus');
        if (statusEl) {
            statusEl.textContent = result.message;
            statusEl.style.color = result.success ? '#2ecc71' : '#e74c3c';

            // Clear after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        }
    });

    // Economy: Player state update (Phase 0)
    socket.on('playerStateUpdate', (state) => {
        // Update cargo display
        if (state.cargo) {
            const cargoList = document.getElementById('cargoList');
            const cargoCapacity = document.getElementById('cargoCapacity');

            if (cargoList && cargoCapacity) {
                // Re-render cargo
                if (state.cargo.goods && Object.keys(state.cargo.goods).length > 0) {
                    let cargoHTML = '';
                    for (const [goodId, quantity] of Object.entries(state.cargo.goods)) {
                        cargoHTML += `<div class="cargo-item">${goodId}: ${quantity}</div>`;
                    }
                    cargoList.innerHTML = cargoHTML;
                } else {
                    cargoList.innerHTML = '<div class="cargo-item" style="color: #888;">Empty</div>';
                }

                cargoCapacity.textContent = `Capacity: ${state.cargo.used}/${state.cargo.total} (${state.cargo.available} available)`;
            }
        }

        // Update gold display
        if (state.gold !== undefined) {
            const playerResourcesEl = document.getElementById('playerResources');
            const player = window.gameState.players[socket.id];
            if (player && playerResourcesEl) {
                player.gold = state.gold; // Update local state
                playerResourcesEl.textContent = `Gold: ${state.gold} | Level: ${player.level || 1}`;
            }
        }

        // Re-enable/disable sell buttons based on cargo
        if (state.cargo && state.cargo.goods) {

            // Loop through all goods in the cargo (and potentially others if we had a full list)
            // Ideally we iterate over all DOM elements for goods
            const allSellButtons = document.querySelectorAll('.trade-btn.sell, .trade-btn.sell-all');

            allSellButtons.forEach(btn => {
                // Extract goodId from onclick attribute: sellGood('GOOD_ID') or sellAll('GOOD_ID')
                const match = btn.getAttribute('onclick').match(/sell(?:Good|All)\('(.+?)'\)/);
                if (match && match[1]) {
                    const goodId = match[1];
                    const qty = state.cargo.goods[goodId] || 0;
                    btn.disabled = (qty === 0);
                }
            });
        }
    });
}

// Input handling
const keys = {
    turnLeft: false, // A
    turnRight: false, // D
    sailUp: false, // W
    sailDown: false, // S
    shootLeft: false, // Q
    shootRight: false // E
};

document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.sailUp = true; break;
        case 's': keys.sailDown = true; break;
        case 'a': keys.turnLeft = true; break;
        case 'd': keys.turnRight = true; break;
        case 'q': keys.shootLeft = true; break;
        case 'e': keys.shootRight = true; break;
        case 'h':
            socket.emit('enterHarbor');
            break;
        case 'n':
            // Spawn NPC trader near player
            socket.emit('spawnNPC');
            console.log('[NPC] Requested NPC spawn');
            break;
        case 'p':
            // Spawn combat NPC (pirate) near player
            socket.emit('spawnCombatNPC');
            console.log('[COMBAT] Requested pirate spawn');
            break;
        case '1':
            // Mission: Sail to Harbor
            socket.emit('debug_start_mission', { type: 'SAIL_TO_HARBOR' });
            console.log('[Mission] Starting: Sail to Harbor');
            break;
        case '2':
            // Mission: Stay in Area
            socket.emit('debug_start_mission', { type: 'STAY_IN_AREA' });
            console.log('[Mission] Starting: Stay in Area');
            break;
        case '3':
            // Mission: Defeat NPCs
            socket.emit('debug_start_mission', { type: 'DEFEAT_NPCS', count: 3 });
            console.log('[Mission] Starting: Defeat 3 NPCs');
            break;
        case '4':
            // Mission: Escort Trader
            socket.emit('debug_start_mission', { type: 'ESCORT' });
            console.log('[Mission] Starting: Escort Trader');
            break;
        case 'm':
            // Cycle minimap zoom
            if (typeof cycleMinimapZoom !== 'undefined') {
                cycleMinimapZoom();
            }
            break;
        case 'u':
            // Toggle mute
            const muted = soundManager.toggleMute();
            console.log('[Sound] Muted:', muted);
            break;
    }
    sendInput();
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.sailUp = false; break;
        case 's': keys.sailDown = false; break;
        case 'a': keys.turnLeft = false; break;
        case 'd': keys.turnRight = false; break;
        case 'q': keys.shootLeft = false; break;
        case 'e': keys.shootRight = false; break;
    }
    sendInput();
});

function sendInput() {
    if (!socket) return; // Don't send input before connected

    socket.emit('input', {
        left: keys.turnLeft,
        right: keys.turnRight,
        sailUp: keys.sailUp,
        sailDown: keys.sailDown,
        shootLeft: keys.shootLeft,
        shootRight: keys.shootRight
    });
}

// Harbor UI functions (called from HTML buttons)
function repairShip() {
    socket.emit('repairShip');
}

function closeHarbor() {
    socket.emit('closeHarbor');
    hideHarborUI();
}

function switchFlagship() {
    const shipSelector = document.getElementById('shipSelector');
    const selectedShip = shipSelector.value;
    socket.emit('switchFlagship', selectedShip);
}

// Ship upgrade function (Phase 1: Progression)
function upgradeShip() {
    const upgradeSelector = document.getElementById('upgradeShipSelector');
    const selectedShip = upgradeSelector.value;
    const upgradeStatus = document.getElementById('upgradeStatus');

    // Get player data from game state
    const player = window.gameState.players[socket.id];
    if (!player) return;

    // Ship costs and requirements (must match ShipClass.js)
    const shipCosts = {
        SLOOP: { gold: 500, level: 1 },
        BARQUE: { gold: 1000, level: 2 },
        FLUYT: { gold: 1500, level: 3 },
        MERCHANT: { gold: 2000, level: 4 },
        FRIGATE: { gold: 3000, level: 5 },
        SPANISH_GALLEON: { gold: 5000, level: 7 },
        WAR_GALLEON: { gold: 8000, level: 10 }
    };

    const cost = shipCosts[selectedShip];
    if (!cost) {
        upgradeStatus.textContent = 'Invalid ship selection';
        return;
    }

    // Client-side validation (server will validate again)
    if (player.gold < cost.gold || player.level < cost.level) {
        upgradeStatus.textContent = `Insufficient resources! Need ${cost.gold} gold and level ${cost.level}`;
        setTimeout(() => { upgradeStatus.textContent = ''; }, 3000);
        return;
    }

    // Clear status and send request
    upgradeStatus.textContent = '';
    socket.emit('upgradeShip', selectedShip);
}

// Trade functions (Phase 0: Economy)
// Trade functions (Phase 0: Economy)
function buyGood(goodId, quantityOverride) {
    if (!window.currentHarborId) {
        console.error('[Trade] No harbor ID available');
        return;
    }

    let quantity;
    if (quantityOverride !== undefined) {
        quantity = quantityOverride;
    } else {
        const quantityInput = document.getElementById(`qty-${goodId}`);
        quantity = parseInt(quantityInput.value) || 1;
    }

    const qtyDisplay = quantity === -1 ? "ALL" : quantity;
    console.log(`[Trade] Buying ${qtyDisplay}x ${goodId} at ${window.currentHarborId}`);

    socket.emit('buyGood', {
        harborId: window.currentHarborId,
        goodId: goodId,
        quantity: quantity
    });
}

function sellGood(goodId, quantityOverride) {
    if (!window.currentHarborId) {
        console.error('[Trade] No harbor ID available');
        return;
    }

    let quantity;
    if (quantityOverride !== undefined) {
        quantity = quantityOverride;
    } else {
        const quantityInput = document.getElementById(`qty-${goodId}`);
        quantity = parseInt(quantityInput.value) || 1;
    }

    const qtyDisplay = quantity === -1 ? "ALL" : quantity;
    console.log(`[Trade] Selling ${qtyDisplay}x ${goodId} at ${window.currentHarborId}`);

    socket.emit('sellGood', {
        harborId: window.currentHarborId,
        goodId: goodId,
        quantity: quantity
    });
}

// Make functions global for HTML onclick
window.repairShip = repairShip;
window.closeHarbor = closeHarbor;
window.switchFlagship = switchFlagship;
window.upgradeShip = upgradeShip;
window.buyGood = buyGood;
window.sellGood = sellGood;

// Buy Max Logic
function buyAll(goodId, price) {
    if (!window.gameState || !window.myPlayerId) return;

    // Just send intent (-1 for Max)
    // Server validation handles affordability and space
    buyGood(goodId, -1);
}

// Sell All Logic
function sellAll(goodId) {
    if (!window.gameState || !window.myPlayerId) return;

    // Just send intent (-1 for All)
    // Server validation handles inventory check
    sellGood(goodId, -1);
}

window.buyAll = buyAll;
window.sellAll = sellAll;


/**
 * Update sound system based on game state
 * Detects sail changes, cannon fires, and projectile impacts
 */
function updateSoundSystem(state) {
    if (!socket || !state.players) return;

    const myId = socket.id;
    const myShip = state.players[myId];
    if (!myShip) return;

    // Update ambient sounds based on wind
    if (state.wind) {
        soundManager.updateAmbient(state.wind, 1 / 60); // Assume 60 FPS
    }

    // --- 1. HANDLE MY OWN SHIP (Detailed sounds including sails) ---
    if (previousPlayerState) {
        // Sail state changes
        const prevSailState = previousPlayerState.sailState;
        const currentSailState = myShip.sailState;

        if (prevSailState !== currentSailState) {
            if (currentSailState > prevSailState) {
                soundManager.playSailDeploy();
            } else {
                soundManager.playSailRemove();
            }
        }
    }

    // --- 2. HANDLE ALL SHIPS (Combat sounds: Cannons) ---
    // Includes my ship and nearby NPCs/Players
    Object.keys(state.players).forEach(id => {
        const ship = state.players[id];
        const isMe = (id === myId);

        // Get previous state for this ship
        // For me, use previousPlayerState. For others, use previousNPCStates
        const prevState = isMe ? previousPlayerState : previousNPCStates[id];

        if (prevState) {
            // Check distance for NPCs to avoid playing sounds for far away ships
            // My ship is always distance 0 from camera center (conceptually)
            let distance = 0;
            let screenX = 0.5;
            let volume = 1.0;

            if (!isMe) {
                distance = Math.hypot(ship.x - myShip.x, ship.y - myShip.y);
                const maxAudibleDist = 1500;
                if (distance > maxAudibleDist) return; // Too far to hear

                // Calculate volume (linear falloff)
                volume = Math.max(0, 1 - (distance / maxAudibleDist));

                // Calculate screen X (0.0 to 1.0)
                // World x difference relative to camera
                const dx = ship.x - myShip.x;
                screenX = 0.5 + (dx / canvas.width);
            } else {
                // For my ship, full volume, explicit panning handled below
                volume = 1.0;
                screenX = 0.5;
            }

            // Detect Left Cannon Fire
            const prevReloadLeft = prevState.reloadLeft || 0;
            const currentReloadLeft = ship.reloadLeft || 0;
            // Timer jumped up -> Fired
            if (currentReloadLeft > prevReloadLeft && currentReloadLeft > 3) {
                const panX = isMe ? 0.3 : screenX; // My left cannon is to the left
                soundManager.playCannonFire('left', panX, volume);
            }

            // Detect Right Cannon Fire
            const prevReloadRight = prevState.reloadRight || 0;
            const currentReloadRight = ship.reloadRight || 0;
            if (currentReloadRight > prevReloadRight && currentReloadRight > 3) {
                const panX = isMe ? 0.7 : screenX; // My right cannon is to the right
                soundManager.playCannonFire('right', panX, volume);
            }
        }
    });

    // Detect projectile impacts
    detectProjectileImpacts(state, myShip);

    // --- 3. STORE STATES FOR NEXT FRAME ---

    // Store my state
    previousPlayerState = {
        sailState: myShip.sailState,
        reloadLeft: myShip.reloadLeft,
        reloadRight: myShip.reloadRight
    };

    // Store NPC states
    // We rebuild this every frame to avoid keeping stale data for disconnected ships
    const newNPCStates = {};
    Object.keys(state.players).forEach(id => {
        if (id === myId) return;
        const ship = state.players[id];
        newNPCStates[id] = {
            reloadLeft: ship.reloadLeft,
            reloadRight: ship.reloadRight
        };
    });
    previousNPCStates = newNPCStates;
}

/**
 * Detect projectile impacts by tracking projectile lifecycle
 */
function detectProjectileImpacts(state, myShip) {
    if (!state.projectiles) return;

    const currentProjectiles = state.projectiles;

    // Find projectiles that disappeared (hit something or expired)
    previousProjectiles.forEach(prevProj => {
        const stillExists = currentProjectiles.find(p =>
            Math.abs(p.x - prevProj.x) < 5 &&
            Math.abs(p.y - prevProj.y) < 5
        );

        if (!stillExists) {
            // Projectile disappeared - check if it hit a ship
            let hitShip = false;

            // Check all players for hits
            for (const id in state.players) {
                const player = state.players[id];
                const dist = Math.hypot(player.x - prevProj.x, player.y - prevProj.y);

                if (dist < 30) { // Within ship hitbox range
                    hitShip = true;
                    break;
                }
            }

            // Calculate screen position for panning
            const screenX = myShip ? (prevProj.x - myShip.x + canvas.width / 2) / canvas.width : 0.5;

            if (hitShip) {
                soundManager.playWoodImpact(screenX);
            } else {
                soundManager.playWaterSplash(screenX);
                // Trigger visual splash
                if (window.splashRenderer) {
                    window.splashRenderer.triggerSplash(prevProj.x, prevProj.y);
                }
            }
        }
    });

    // Store current projectiles for next frame
    previousProjectiles = currentProjectiles.map(p => ({ x: p.x, y: p.y }));
}

// Wreck Loot Interaction
document.addEventListener('keydown', (e) => {
    // Only handle 'F' key
    if (e.key.toLowerCase() !== 'f') return;

    // Ignore if typing in an input
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (!window.gameState || !window.gameState.wrecks || !window.myPlayerId) return;

    const myShip = window.gameState.players[window.myPlayerId];
    if (!myShip) return;

    // Find nearest wreck
    let nearestWreck = null;
    let minDist = Infinity;

    window.gameState.wrecks.forEach(wreck => {
        const dist = Math.hypot(wreck.x - myShip.x, wreck.y - myShip.y);
        if (dist < minDist) {
            minDist = dist;
            nearestWreck = wreck;
        }
    });

    // Check if within range (150px - match visual/server logic)
    if (nearestWreck && minDist < 150) {
        // Optimistic check for ownership (server validates authoritatively)
        if (nearestWreck.isOwnerLoot && nearestWreck.ownerId !== window.myPlayerId) {
            // Optional: visual feedback handled by game.js text
        }

        console.log(`[Interaction] Requesting loot for wreck ${nearestWreck.id}`);
        socket.emit('lootWreck', nearestWreck.id);
        // Server authoritatively prevents double-looting by removing wreck before granting loot
    }
});
