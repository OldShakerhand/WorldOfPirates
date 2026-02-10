// Socket connection (will be initialized after name is set)
let socket = null;

// Store static map data (received once on connection)
let mapData = null;
let currentChangelogData = null;

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

        // Handle ban
        socket.on('banned', (data) => {
            showError(data.reason);
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

            // Update Mission UI
            if (window.updateMissionUI) {
                window.updateMissionUI(state.players[socket.id]);
            }
        }
    });

    // Harbor UI events
    socket.on('harborData', (harborData) => {
        showHarborUI(harborData);
    });

    socket.on('harborClosed', () => {
        hideHarborUI();
    });

    // Mission complete event
    socket.on('missionComplete', (data) => {
        showMissionComplete(data.gold, data.xp);
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

    // Chat input handling
    setupChatInput();


    // Changelog data from server
    socket.on('changelogData', (data) => {
        currentChangelogData = data;
        checkAndShowChangelog(data);
    });

    // Transaction results (loot notifications, trade results, etc.)
    let transactionStatusTimeout = null; // Track timeout to clear it

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
            // Clear any existing timeout to prevent old messages from reappearing
            if (transactionStatusTimeout) {
                clearTimeout(transactionStatusTimeout);
            }

            // Immediately update with new message
            statusEl.textContent = result.message;
            statusEl.style.color = result.success ? '#2ecc71' : '#e74c3c';

            // Clear after 3 seconds
            transactionStatusTimeout = setTimeout(() => {
                statusEl.textContent = '';
                transactionStatusTimeout = null;
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

// Chat input setup
let chatInputActive = false;

function setupChatInput() {
    const chatInputContainer = document.getElementById('chatInputContainer');
    const chatInput = document.getElementById('chatInput');

    if (!chatInputContainer || !chatInput) return;

    // Handle Enter key globally
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in other inputs
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'chatInput') return;
        if (document.activeElement.tagName === 'TEXTAREA') return;

        if (e.key === 'Enter') {
            if (!chatInputActive) {
                // Open chat input
                chatInputContainer.style.display = 'block';
                chatInput.focus();
                chatInputActive = true;
                e.preventDefault();
            } else {
                // Send message
                const message = chatInput.value.trim();
                if (message.length > 0) {
                    socket.emit('playerChat', { message });
                    chatInput.value = '';
                }
                // Close chat input
                chatInputContainer.style.display = 'none';
                chatInput.blur();
                chatInputActive = false;
                e.preventDefault();
            }
        }

        // Handle Escape key to close chat
        if (e.key === 'Escape' && chatInputActive) {
            chatInputContainer.style.display = 'none';
            chatInput.value = '';
            chatInput.blur();
            chatInputActive = false;
            e.preventDefault();
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
    // Disable game controls while chat is active
    if (chatInputActive) return;

    switch (e.key.toLowerCase()) {
        case 'w': keys.sailUp = true; break;
        case 's': keys.sailDown = true; break;
        case 'a': keys.turnLeft = true; break;
        case 'd': keys.turnRight = true; break;
        case 'q': keys.shootLeft = true; break;
        case 'e': keys.shootRight = true; break;
        case 'f':
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
let lastSellAllTime = 0;
const SELL_ALL_COOLDOWN = 500; // 500ms cooldown

function sellAll(goodId) {
    if (!window.gameState || !window.myPlayerId) return;

    // Debounce to prevent double-clicks
    const now = Date.now();
    if (now - lastSellAllTime < SELL_ALL_COOLDOWN) {
        console.log('[Trade] Sell All cooldown active, ignoring click');
        return;
    }
    lastSellAllTime = now;

    // Just send intent (-1 for All)
    // Server validation handles inventory check
    sellGood(goodId, -1);
}

window.buyAll = buyAll;
window.sellAll = sellAll;

// Mission Logic
function cancelMission() {
    if (!socket) return;
    if (confirm("Are you sure you want to cancel the current mission?")) {
        socket.emit('cancelMission');
        console.log('[Mission] Requested cancellation');
    }
}
window.cancelMission = cancelMission;

function updateMissionUI(player) {
    const missionUI = document.getElementById('missionUI');
    const missionType = document.getElementById('missionType');
    const missionDesc = document.getElementById('missionDescription');

    if (!player || !player.mission) {
        if (missionUI.style.display !== 'none') {
            missionUI.style.display = 'none';
        }
        return;
    }

    // Show UI
    if (missionUI.style.display === 'none') {
        missionUI.style.display = 'block';
    }

    // Update text
    missionType.textContent = player.mission.type.replace(/_/g, ' ');

    // Add distance and direction if target position exists
    let description = player.mission.description;
    if (player.mission.targetPosition) {
        const dx = player.mission.targetPosition.x - player.x;
        const dy = player.mission.targetPosition.y - player.y;
        const distancePixels = Math.hypot(dx, dy);
        const distanceKm = (distancePixels / 1000).toFixed(1); // Approximate km conversion

        // Calculate direction (8-point compass)
        const angle = Math.atan2(dy, dx);
        const degrees = (angle * 180 / Math.PI + 360) % 360;
        let direction = '';
        if (degrees >= 337.5 || degrees < 22.5) direction = 'E';
        else if (degrees >= 22.5 && degrees < 67.5) direction = 'SE';
        else if (degrees >= 67.5 && degrees < 112.5) direction = 'S';
        else if (degrees >= 112.5 && degrees < 157.5) direction = 'SW';
        else if (degrees >= 157.5 && degrees < 202.5) direction = 'W';
        else if (degrees >= 202.5 && degrees < 247.5) direction = 'NW';
        else if (degrees >= 247.5 && degrees < 292.5) direction = 'N';
        else if (degrees >= 292.5 && degrees < 337.5) direction = 'NE';

        description += ` – ${distanceKm} km ${direction}`;
    }

    missionDesc.textContent = description;
}
window.updateMissionUI = updateMissionUI;

// Accept mission from harbor (Phase 1: Governor)
function acceptMission(missionData) {
    if (!socket) return;
    console.log(`[Mission] Accepting mission: ${missionData.type}`);

    // Show immediate feedback in harbor UI
    const missionList = document.getElementById('missionList');
    if (missionList) {
        missionList.innerHTML = `
            <div style="padding: 15px; background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; border-radius: 3px; text-align: center;">
                <p style="color: #2ecc71; font-weight: bold; margin: 0 0 5px 0;">✓ Mission Accepted!</p>
                <p style="color: #ccc; font-size: 12px; margin: 0 0 10px 0;">${missionData.name}</p>
                <p style="color: #888; font-size: 11px; margin: 0;">Press F to leave harbor and begin your mission</p>
            </div>
        `;
    }

    // Send to server
    socket.emit('acceptMission', missionData);
}
window.acceptMission = acceptMission;



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

// Show mission complete overlay
function showMissionComplete(gold, xp) {
    const overlay = document.getElementById('missionCompleteOverlay');
    const rewardText = document.getElementById('missionRewardText');

    // Update reward text
    rewardText.textContent = `Reward: ${gold} Gold, ${xp} XP`;

    // Show overlay
    overlay.style.display = 'flex';

    // Trigger fade-in animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);

    // Auto-hide after 2.5 seconds
    setTimeout(() => {
        overlay.classList.remove('show');

        // Hide completely after fade-out
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); // Match CSS transition duration
    }, 2500);
}

// --- Changelog System ---

function checkAndShowChangelog(data) {
    const lastSeenVersion = localStorage.getItem('last_seen_version');

    // Show if version changed or never seen
    if (data.version !== lastSeenVersion) {
        showChangelog(data);
    }
}

function showChangelog(data) {
    if (!data) return;

    const overlay = document.getElementById('changelogOverlay');
    const versionTag = document.getElementById('changelogVersion');
    const body = document.getElementById('changelogBody');

    // Update content
    versionTag.textContent = `v${data.version} (${data.date})`;

    let html = '';

    // Order sections: Added, Changed, Fixed, Removed...
    const order = ['Added', 'Changed', 'Fixed', 'Removed', 'Deprecated', 'Security'];

    order.forEach(section => {
        if (data.sections[section] && data.sections[section].length > 0) {
            html += `<h3>${section}</h3>`;
            html += `<ul>`;
            data.sections[section].forEach(item => {
                // Formatting: Bold text between ** **
                let formattedItem = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                // Handle newlines for sub-items
                formattedItem = formattedItem.replace(/\n\s*-\s*/g, '<br>• ');

                html += `<li>${formattedItem}</li>`;
            });
            html += `</ul>`;
        }
    });

    body.innerHTML = html;

    // Show overlay
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

function hideChangelog() {
    const overlay = document.getElementById('changelogOverlay');
    overlay.classList.remove('show');

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);

    // Update local storage when closed
    if (currentChangelogData) {
        localStorage.setItem('last_seen_version', currentChangelogData.version);
    }
}

// Changelog Event Listeners
document.getElementById('closeChangelogBtn').addEventListener('click', hideChangelog);

// Key binding for 'N' (News/Changelog)
document.addEventListener('keydown', (e) => {
    // Only if not typing in an input
    if (document.activeElement.tagName === 'INPUT') return;

    // Use e.code for physical key location (works better across layouts)
    if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        console.log('[Client] H key pressed (code: KeyH). Toggle Changelog.');

        const overlay = document.getElementById('changelogOverlay');
        if (!overlay) {
            console.error('[Client] Changelog overlay not found in DOM!');
            return;
        }

        if (overlay.style.display === 'flex' || overlay.classList.contains('show')) {
            console.log('[Client] Hiding changelog');
            hideChangelog();
        } else if (currentChangelogData) {
            console.log('[Client] Showing changelog', currentChangelogData);
            showChangelog(currentChangelogData);
        } else {
            console.warn('[Client] No changelog data available to show. Requesting from server...');
            // Optional: requesting data if missing?
            // socket.emit('requestChangelog'); 
        }
    }
});
