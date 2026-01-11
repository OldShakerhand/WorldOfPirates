/* 
 * DEBUG HARBOR TELEPORTATION SYSTEM
 * 
 * ⚠️ WARNING: THIS IS A DEBUG FEATURE FOR DEVELOPMENT ONLY
 * ⚠️ MUST BE DISABLED BEFORE PRODUCTION RELEASE
 * 
 * Purpose: Quick-travel to harbors for positioning verification
 * Toggle: Press 'T' key (H is used for entering harbors)
 */

// DEBUG: Flag to enable/disable harbor teleport (SET TO FALSE FOR PRODUCTION)
const DEBUG_HARBOR_TELEPORT_ENABLED = true;

let harborTeleportVisible = false;
let harborVerificationState = {}; // Track which harbors have been verified

// Load verification state from localStorage
function loadHarborVerificationState() {
    const saved = localStorage.getItem('harborVerificationState');
    if (saved) {
        try {
            harborVerificationState = JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to load harbor verification state:', e);
            harborVerificationState = {};
        }
    }
}

// Save verification state to localStorage
function saveHarborVerificationState() {
    localStorage.setItem('harborVerificationState', JSON.stringify(harborVerificationState));
}

// Create harbor teleport overlay
function createHarborTeleportOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'harborTeleportOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        z-index: 10000;
        display: none;
        overflow-y: auto;
        font-family: Arial, sans-serif;
    `;

    overlay.innerHTML = `
        <div style="max-width: 800px; margin: 20px auto; padding: 20px;">
            <div style="background: #ff4444; padding: 10px; margin-bottom: 20px; border-radius: 5px; text-align: center; font-weight: bold;">
                ⚠️ DEBUG FEATURE - DISABLE BEFORE PRODUCTION ⚠️
            </div>
            
            <h2 style="margin: 0 0 10px 0;">Harbor Quick-Travel (Press T to close)</h2>
            
            <div style="margin-bottom: 20px;">
                <input type="text" id="harborSearch" placeholder="Search harbors..." 
                    style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #444; background: #222; color: white; border-radius: 5px;">
            </div>
            
            <div style="background: #1a1a1a; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <strong>Your Position:</strong> <span id="playerPosition">Loading...</span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Harbors:</strong> <span id="harborCount">0</span> total | 
                <span id="verifiedCount">0</span> verified
            </div>
            
            <div id="harborList" style="background: #1a1a1a; padding: 10px; border-radius: 5px; max-height: 500px; overflow-y: auto;">
                Loading harbors...
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Search functionality
    document.getElementById('harborSearch').addEventListener('input', (e) => {
        filterHarborList(e.target.value.toLowerCase());
    });

    return overlay;
}

// Populate harbor list
function populateHarborList(harbors, playerX, playerY) {
    const listDiv = document.getElementById('harborList');
    if (!listDiv) return;

    const searchInput = document.getElementById('harborSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    // Sort harbors by name
    const sortedHarbors = [...harbors].sort((a, b) => a.name.localeCompare(b.name));

    let html = '';
    let verifiedCount = 0;

    for (const harbor of sortedHarbors) {
        const harborX = harbor.x;
        const harborY = harbor.y;
        const distance = Math.round(Math.hypot(harborX - playerX, harborY - playerY));
        const isVerified = harborVerificationState[harbor.id] || false;

        if (isVerified) verifiedCount++;

        // Filter by search term
        if (searchTerm && !harbor.name.toLowerCase().includes(searchTerm)) {
            continue;
        }

        const checkboxId = `verify_${harbor.id}`;

        html += `
            <div style="padding: 10px; margin: 5px 0; background: #2a2a2a; border-radius: 3px; display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="${checkboxId}" ${isVerified ? 'checked' : ''}
                    onchange="toggleHarborVerification('${harbor.id}', this.checked)"
                    style="width: 20px; height: 20px; cursor: pointer;">
                <div style="flex: 1; cursor: pointer;" onclick="teleportToHarbor('${harbor.id}')">
                    <strong>${harbor.name}</strong><br>
                    <small style="color: #aaa;">
                        (${harborX}, ${harborY}) - ${distance}px away
                    </small>
                </div>
            </div>
        `;
    }

    listDiv.innerHTML = html || '<div style="padding: 20px; text-align: center; color: #888;">No harbors found</div>';

    // Update counts
    const countDiv = document.getElementById('harborCount');
    const verifiedDiv = document.getElementById('verifiedCount');
    if (countDiv) countDiv.textContent = harbors.length;
    if (verifiedDiv) verifiedDiv.textContent = verifiedCount;
}

// Filter harbor list by search term
function filterHarborList(searchTerm) {
    if (!window.mapData || !window.mapData.harbors) return;

    // Try to get player position from client.js global state
    let playerX = 0, playerY = 0;

    // Access the state from client.js (it's passed to renderGame)
    if (typeof getMyShipPosition === 'function') {
        const pos = getMyShipPosition();
        if (pos) {
            playerX = pos.x;
            playerY = pos.y;
        }
    }

    populateHarborList(window.mapData.harbors, playerX, playerY);
}

// Toggle harbor verification
function toggleHarborVerification(harborId, verified) {
    harborVerificationState[harborId] = verified;
    saveHarborVerificationState();

    // Update verified count
    const verifiedCount = Object.values(harborVerificationState).filter(v => v).length;
    document.getElementById('verifiedCount').textContent = verifiedCount;
}

// Teleport to harbor
function teleportToHarbor(harborId) {
    if (!window.mapData || !window.mapData.harbors) return;

    const harbor = window.mapData.harbors.find(h => h.id === harborId);
    if (!harbor) {
        console.error('Harbor not found:', harborId);
        return;
    }

    console.log(`[DEBUG] Teleporting to ${harbor.name} at (${harbor.x}, ${harbor.y})`);

    // Send teleport command to server
    socket.emit('debug_teleport', {
        x: harbor.x,
        y: harbor.y
    });

    // Close overlay
    toggleHarborTeleportOverlay();
}

// Toggle harbor teleport overlay
function toggleHarborTeleportOverlay() {
    if (!DEBUG_HARBOR_TELEPORT_ENABLED) {
        console.warn('Harbor teleport is disabled');
        return;
    }

    const overlay = document.getElementById('harborTeleportOverlay') || createHarborTeleportOverlay();

    harborTeleportVisible = !harborTeleportVisible;
    overlay.style.display = harborTeleportVisible ? 'block' : 'none';

    if (harborTeleportVisible) {
        // Wait a bit for map data to be available
        setTimeout(() => {
            if (window.mapData && window.mapData.harbors) {
                // Try to get player position
                let playerX = 0, playerY = 0;

                console.log('[DEBUG] gameState:', window.gameState);
                console.log('[DEBUG] myPlayerId:', window.myPlayerId);

                // Access from global if available
                if (typeof getMyShipPosition === 'function') {
                    const pos = getMyShipPosition();
                    console.log('[DEBUG] getMyShipPosition returned:', pos);
                    if (pos) {
                        playerX = pos.x;
                        playerY = pos.y;
                    }
                }

                // Fallback: try to get directly from gameState
                if (playerX === 0 && playerY === 0 && window.gameState && window.myPlayerId) {
                    const players = Object.values(window.gameState.players || {});
                    const myShip = players.find(p => p.id === window.myPlayerId);
                    if (myShip) {
                        playerX = myShip.x;
                        playerY = myShip.y;
                        console.log('[DEBUG] Got position from direct gameState access:', playerX, playerY);
                    }
                }

                const posDiv = document.getElementById('playerPosition');
                if (posDiv) {
                    if (playerX === 0 && playerY === 0) {
                        posDiv.textContent = 'Position not available yet';
                        posDiv.style.color = '#ff8888';
                    } else {
                        posDiv.textContent = `(${Math.round(playerX)}, ${Math.round(playerY)})`;
                        posDiv.style.color = 'white';
                    }
                }

                // Populate harbor list
                populateHarborList(window.mapData.harbors, playerX, playerY);
            } else {
                console.warn('[DEBUG] Map data not available yet');
                const listDiv = document.getElementById('harborList');
                if (listDiv) {
                    listDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff4444;">Map data not loaded yet. Please wait a moment and try again.</div>';
                }
            }
        }, 100);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!DEBUG_HARBOR_TELEPORT_ENABLED) return;

    loadHarborVerificationState();

    // Add T key listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T') {
            // Don't trigger if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            toggleHarborTeleportOverlay();
        }
    });

    console.log('[DEBUG] Harbor teleport system enabled. Press T to open.');
});
