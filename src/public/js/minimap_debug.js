/**
 * DEBUG MINIMAP
 * 
 * PURE DEBUG TOOL - NOT A GAMEPLAY FEATURE
 * 
 * Purpose:
 * - Visualize entire world map at small scale
 * - Show terrain types from tilemap data
 * - Display player position and harbor markers
 * 
 * Constraints:
 * - NO interaction (no zoom, no scrolling, no clicking)
 * - NO gameplay impact
 * - Easy to disable/remove
 * 
 * To disable: Set DEBUG_MINIMAP = false
 * To remove: Delete this file, remove <script> tag from index.html, remove CSS from style.css
 */

// Debug flag - set to false to disable minimap
const DEBUG_MINIMAP = true;

// Minimap configuration
const MINIMAP_CONFIG = {
    // World dimensions: 3230×1702 tiles (aspect ratio ~1.9:1)
    // Keep height fixed, calculate width to maintain aspect ratio
    HEIGHT: 256,
    WIDTH: null,  // Calculated based on tilemap aspect ratio
    TILE_SIZE: 25,  // Must match GameConfig.TILE_SIZE

    // Terrain colors (debug-only, simple solid colors)
    COLORS: {
        WATER: '#1a4d7a',      // Dark blue
        SHALLOW: '#5dade2',    // Cyan
        LAND: '#654321',       // Brown
        PLAYER: '#FF0000',     // Red
        HARBOR: '#FFD700'      // Yellow/Gold
    },

    // Marker sizes
    PLAYER_RADIUS: 3,
    HARBOR_SIZE: 4,

    // Zoom levels
    ZOOM_LEVELS: [
        { name: 'Whole Map', factor: 1 },   // 0 - entire world
        { name: 'Region', factor: 3 },      // 1 - regional view (1/3 of world)
        { name: 'Local', factor: 6 }        // 2 - local area (1/6 of world)
    ]
};

// Zoom state
let currentZoom = 2; // Default to Local (10x) for better context

// Minimap canvas element
let minimapCanvas = null;
let minimapCtx = null;

// Offscreen canvas for terrain caching (render once, reuse every frame)
let terrainCanvas = null;
let terrainCtx = null;
let terrainRendered = false;

/**
 * Initialize minimap canvas
 * Creates canvas element and appends to game container
 * Width is calculated based on world aspect ratio
 */
function initMinimap() {
    if (!DEBUG_MINIMAP) return;

    // Create visible minimap canvas
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.id = 'minimapCanvas';

    // Width will be set when we know the tilemap dimensions
    // For now, use height as default
    minimapCanvas.width = MINIMAP_CONFIG.HEIGHT;
    minimapCanvas.height = MINIMAP_CONFIG.HEIGHT;

    // Append to game container (not body) so it's positioned relative to canvas
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.appendChild(minimapCanvas);
    } else {
        document.body.appendChild(minimapCanvas);
        console.warn('[DEBUG MINIMAP] game-container not found, appending to body');
    }

    // Get context
    minimapCtx = minimapCanvas.getContext('2d');

    // Create offscreen canvas for terrain caching (will be resized when tilemap loads)
    terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = MINIMAP_CONFIG.HEIGHT;
    terrainCanvas.height = MINIMAP_CONFIG.HEIGHT;
    terrainCtx = terrainCanvas.getContext('2d');

    console.log('[DEBUG MINIMAP] Initialized minimap with terrain caching');
}

/**
 * Update minimap rendering
 * Called every frame from gamestate_update handler
 * 
 * @param {Object} worldTilemap - Tilemap data from world_map.json
 * @param {Object} mapData - Static map data (harbors, dimensions)
 * @param {Object} myShip - Local player ship data (position)
 */
function updateMinimap(worldTilemap, mapData, myShip) {
    if (!DEBUG_MINIMAP || !minimapCanvas || !minimapCtx) return;
    if (!worldTilemap || !mapData) return;

    // Calculate correct width based on tilemap aspect ratio (first time only)
    if (!MINIMAP_CONFIG.WIDTH && worldTilemap.width && worldTilemap.height) {
        const aspectRatio = worldTilemap.width / worldTilemap.height;
        MINIMAP_CONFIG.WIDTH = Math.round(MINIMAP_CONFIG.HEIGHT * aspectRatio);

        // Resize both canvases to correct dimensions
        minimapCanvas.width = MINIMAP_CONFIG.WIDTH;
        minimapCanvas.height = MINIMAP_CONFIG.HEIGHT;
        terrainCanvas.width = MINIMAP_CONFIG.WIDTH;
        terrainCanvas.height = MINIMAP_CONFIG.HEIGHT;

        console.log(`[DEBUG MINIMAP] Resized to ${MINIMAP_CONFIG.WIDTH}×${MINIMAP_CONFIG.HEIGHT} (aspect ratio ${aspectRatio.toFixed(2)}:1)`);
    }

    // Render terrain to offscreen canvas ONCE (expensive operation)
    if (!terrainRendered && terrainCtx && MINIMAP_CONFIG.WIDTH) {
        renderTerrain(worldTilemap);
        terrainRendered = true;
        console.log('[DEBUG MINIMAP] Terrain cached to offscreen canvas');
    }

    // Clear main canvas
    minimapCtx.fillStyle = '#000000';
    minimapCtx.fillRect(0, 0, MINIMAP_CONFIG.WIDTH, MINIMAP_CONFIG.HEIGHT);

    // Render terrain based on zoom level
    if (terrainRendered) {
        const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];

        if (currentZoom === 0) {
            // Zoom 0: Draw entire cached terrain (whole map)
            minimapCtx.drawImage(terrainCanvas, 0, 0);
        } else {
            // Zoom 1-2: Crop and scale cached terrain centered on player
            if (myShip) {
                const worldWidth = worldTilemap.width * MINIMAP_CONFIG.TILE_SIZE;
                const worldHeight = worldTilemap.height * MINIMAP_CONFIG.TILE_SIZE;

                // Calculate crop dimensions (in cached terrain canvas coordinates)
                const cropWidth = MINIMAP_CONFIG.WIDTH / zoomLevel.factor;
                const cropHeight = MINIMAP_CONFIG.HEIGHT / zoomLevel.factor;

                // Calculate player position in cached terrain canvas coordinates
                const playerMinimapX = (myShip.x / worldWidth) * MINIMAP_CONFIG.WIDTH;
                const playerMinimapY = (myShip.y / worldHeight) * MINIMAP_CONFIG.HEIGHT;

                // Calculate crop position (centered on player)
                let cropX = playerMinimapX - cropWidth / 2;
                let cropY = playerMinimapY - cropHeight / 2;

                // Clamp crop to canvas bounds
                cropX = Math.max(0, Math.min(cropX, MINIMAP_CONFIG.WIDTH - cropWidth));
                cropY = Math.max(0, Math.min(cropY, MINIMAP_CONFIG.HEIGHT - cropHeight));

                // Draw cropped and scaled terrain
                minimapCtx.drawImage(
                    terrainCanvas,
                    cropX, cropY, cropWidth, cropHeight,  // source crop
                    0, 0, MINIMAP_CONFIG.WIDTH, MINIMAP_CONFIG.HEIGHT  // dest (full minimap)
                );
            } else {
                // No player position, just draw whole map
                minimapCtx.drawImage(terrainCanvas, 0, 0);
            }
        }
    }

    // Render harbor markers on top (scaled for zoom)
    if (mapData.harbors) {
        renderHarbors(mapData.harbors, worldTilemap.width, worldTilemap.height, myShip);
    }

    // Render player marker on top (always centered at higher zooms)
    if (myShip) {
        renderPlayer(myShip, worldTilemap.width, worldTilemap.height);

        // Render mission target marker if active mission with target position
        if (myShip.mission && myShip.mission.targetPosition && myShip.mission.state === 'ACTIVE') {
            renderMissionTarget(myShip.mission, worldTilemap.width, worldTilemap.height, myShip);
        }

        // Render mission area marker if active Stay in Area mission
        if (myShip.mission && myShip.mission.type === 'STAY_IN_AREA' && myShip.mission.state === 'ACTIVE') {
            renderMissionArea(myShip.mission, worldTilemap.width, worldTilemap.height, myShip);
        }
    }

    // Draw zoom level indicator
    drawZoomIndicator();
}

/**
 * Render terrain from tilemap data to offscreen canvas
 * Called ONCE when tilemap is loaded, then cached
 * 
 * @param {Object} worldTilemap - Tilemap data {width, height, tiles[]}
 */
function renderTerrain(worldTilemap) {
    const tilemapWidth = worldTilemap.width;
    const tilemapHeight = worldTilemap.height;
    const tiles = worldTilemap.tiles;  // FIXED: Use 'tiles' property, not 'data'

    // Calculate scale factors (tile → minimap)
    const scaleX = MINIMAP_CONFIG.WIDTH / tilemapWidth;
    const scaleY = MINIMAP_CONFIG.HEIGHT / tilemapHeight;

    // Iterate through tilemap and draw each tile as a pixel to OFFSCREEN canvas
    for (let tileY = 0; tileY < tilemapHeight; tileY++) {
        for (let tileX = 0; tileX < tilemapWidth; tileX++) {
            // FIXED: tiles is a 2D array (array of rows), not a flat 1D array
            const terrainType = tiles[tileY][tileX];

            // Get color for terrain type
            let color;
            switch (terrainType) {
                case 0: color = MINIMAP_CONFIG.COLORS.WATER; break;
                case 1: color = MINIMAP_CONFIG.COLORS.SHALLOW; break;
                case 2: color = MINIMAP_CONFIG.COLORS.LAND; break;
                default: color = '#000000'; // Unknown terrain = black
            }

            // Calculate minimap position
            const minimapX = Math.floor(tileX * scaleX);
            const minimapY = Math.floor(tileY * scaleY);

            // Draw pixel to OFFSCREEN canvas (cached)
            terrainCtx.fillStyle = color;
            terrainCtx.fillRect(minimapX, minimapY, Math.ceil(scaleX), Math.ceil(scaleY));
        }
    }
}

/**
 * Render harbor markers
 * 
 * @param {Array} harbors - Array of harbor objects {x, y, name}
 * @param {number} tilemapWidth - Tilemap width in tiles
 * @param {number} tilemapHeight - Tilemap height in tiles
 * @param {Object} myShip - Player ship (for zoom centering)
 */
function renderHarbors(harbors, tilemapWidth, tilemapHeight, myShip) {
    const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];

    harbors.forEach(harbor => {
        // World → Tile
        const tileX = Math.floor(harbor.x / MINIMAP_CONFIG.TILE_SIZE);
        const tileY = Math.floor(harbor.y / MINIMAP_CONFIG.TILE_SIZE);

        // Tile → Minimap (normalized 0-1)
        const normalizedX = tileX / tilemapWidth;
        const normalizedY = tileY / tilemapHeight;

        let minimapX, minimapY;

        if (currentZoom === 0) {
            // Zoom 0: Direct mapping
            minimapX = normalizedX * MINIMAP_CONFIG.WIDTH;
            minimapY = normalizedY * MINIMAP_CONFIG.HEIGHT;
        } else if (myShip) {
            // Zoom 1-2: Calculate position relative to player-centered view
            const worldWidth = tilemapWidth * MINIMAP_CONFIG.TILE_SIZE;
            const worldHeight = tilemapHeight * MINIMAP_CONFIG.TILE_SIZE;

            const playerNormalizedX = myShip.x / worldWidth;
            const playerNormalizedY = myShip.y / worldHeight;

            // Calculate harbor position relative to player
            const relativeX = (normalizedX - playerNormalizedX) * zoomLevel.factor;
            const relativeY = (normalizedY - playerNormalizedY) * zoomLevel.factor;

            // Map to minimap coordinates (centered on player)
            minimapX = (0.5 + relativeX) * MINIMAP_CONFIG.WIDTH;
            minimapY = (0.5 + relativeY) * MINIMAP_CONFIG.HEIGHT;

            // Skip if outside visible area
            if (minimapX < -10 || minimapX > MINIMAP_CONFIG.WIDTH + 10 ||
                minimapY < -10 || minimapY > MINIMAP_CONFIG.HEIGHT + 10) {
                return;
            }
        } else {
            return; // No player position, skip
        }

        // Draw yellow square
        minimapCtx.fillStyle = MINIMAP_CONFIG.COLORS.HARBOR;
        minimapCtx.fillRect(
            minimapX - MINIMAP_CONFIG.HARBOR_SIZE / 2,
            minimapY - MINIMAP_CONFIG.HARBOR_SIZE / 2,
            MINIMAP_CONFIG.HARBOR_SIZE,
            MINIMAP_CONFIG.HARBOR_SIZE
        );
    });
}

/**
 * Render player position marker
 * 
 * @param {Object} myShip - Player ship data {x, y}
 * @param {number} tilemapWidth - Tilemap width in tiles
 * @param {number} tilemapHeight - Tilemap height in tiles
 */
function renderPlayer(myShip, tilemapWidth, tilemapHeight) {
    let minimapX, minimapY;

    if (currentZoom === 0) {
        // Zoom 0: Calculate actual position on whole map
        const tileX = Math.floor(myShip.x / MINIMAP_CONFIG.TILE_SIZE);
        const tileY = Math.floor(myShip.y / MINIMAP_CONFIG.TILE_SIZE);
        minimapX = (tileX / tilemapWidth) * MINIMAP_CONFIG.WIDTH;
        minimapY = (tileY / tilemapHeight) * MINIMAP_CONFIG.HEIGHT;
    } else {
        // Zoom 1-2: Player is always centered
        minimapX = MINIMAP_CONFIG.WIDTH / 2;
        minimapY = MINIMAP_CONFIG.HEIGHT / 2;
    }

    // Draw red circle
    minimapCtx.fillStyle = MINIMAP_CONFIG.COLORS.PLAYER;
    minimapCtx.beginPath();
    minimapCtx.arc(minimapX, minimapY, MINIMAP_CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
    minimapCtx.fill();
}

/**
 * Render mission target marker (for missions with targetPosition)
 * 
 * @param {Object} mission - Mission data {targetPosition: {x, y}}
 * @param {number} tilemapWidth - Tilemap width in tiles
 * @param {number} tilemapHeight - Tilemap height in tiles
 * @param {Object} myShip - Player ship (for zoom centering)
 */
function renderMissionTarget(mission, tilemapWidth, tilemapHeight, myShip) {
    if (!mission.targetPosition) return;

    const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];
    const worldWidth = tilemapWidth * MINIMAP_CONFIG.TILE_SIZE;
    const worldHeight = tilemapHeight * MINIMAP_CONFIG.TILE_SIZE;

    // Calculate mission target position
    const normalizedX = mission.targetPosition.x / worldWidth;
    const normalizedY = mission.targetPosition.y / worldHeight;

    let minimapX, minimapY;

    if (currentZoom === 0) {
        // Zoom 0: Direct mapping
        minimapX = normalizedX * MINIMAP_CONFIG.WIDTH;
        minimapY = normalizedY * MINIMAP_CONFIG.HEIGHT;
    } else {
        // Zoom 1-2: Calculate position relative to player-centered view
        const playerNormalizedX = myShip.x / worldWidth;
        const playerNormalizedY = myShip.y / worldHeight;

        // Calculate mission target position relative to player
        const relativeX = (normalizedX - playerNormalizedX) * zoomLevel.factor;
        const relativeY = (normalizedY - playerNormalizedY) * zoomLevel.factor;

        // Map to minimap coordinates (centered on player)
        minimapX = (0.5 + relativeX) * MINIMAP_CONFIG.WIDTH;
        minimapY = (0.5 + relativeY) * MINIMAP_CONFIG.HEIGHT;

        // Skip if outside visible area
        if (minimapX < -10 || minimapX > MINIMAP_CONFIG.WIDTH + 10 ||
            minimapY < -10 || minimapY > MINIMAP_CONFIG.HEIGHT + 10) {
            return;
        }
    }

    // Draw gold star/diamond for mission target
    minimapCtx.save();
    minimapCtx.fillStyle = '#FFD700';
    minimapCtx.strokeStyle = '#FFA500';
    minimapCtx.lineWidth = 1;

    // Draw diamond shape
    minimapCtx.beginPath();
    minimapCtx.moveTo(minimapX, minimapY - 6);      // Top
    minimapCtx.lineTo(minimapX + 4, minimapY);      // Right
    minimapCtx.lineTo(minimapX, minimapY + 6);      // Bottom
    minimapCtx.lineTo(minimapX - 4, minimapY);      // Left
    minimapCtx.closePath();
    minimapCtx.fill();
    minimapCtx.stroke();

    minimapCtx.restore();
}

/**
 * Render mission area marker (for Stay in Area mission)
 * 
 * @param {Object} mission - Mission data {targetX, targetY, radius}
 * @param {number} tilemapWidth - Tilemap width in tiles
 * @param {number} tilemapHeight - Tilemap height in tiles
 * @param {Object} myShip - Player ship (for zoom centering)
 */
function renderMissionArea(mission, tilemapWidth, tilemapHeight, myShip) {
    if (!mission.targetX || !mission.targetY || !mission.radius) return;

    const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];
    const worldWidth = tilemapWidth * MINIMAP_CONFIG.TILE_SIZE;
    const worldHeight = tilemapHeight * MINIMAP_CONFIG.TILE_SIZE;

    // Calculate mission area position
    const normalizedX = mission.targetX / worldWidth;
    const normalizedY = mission.targetY / worldHeight;

    let minimapX, minimapY, minimapRadius;

    if (currentZoom === 0) {
        // Zoom 0: Direct mapping
        minimapX = normalizedX * MINIMAP_CONFIG.WIDTH;
        minimapY = normalizedY * MINIMAP_CONFIG.HEIGHT;
        minimapRadius = (mission.radius / worldWidth) * MINIMAP_CONFIG.WIDTH;
    } else {
        // Zoom 1-2: Calculate position relative to player-centered view
        const playerNormalizedX = myShip.x / worldWidth;
        const playerNormalizedY = myShip.y / worldHeight;

        // Calculate mission area position relative to player
        const relativeX = (normalizedX - playerNormalizedX) * zoomLevel.factor;
        const relativeY = (normalizedY - playerNormalizedY) * zoomLevel.factor;

        // Map to minimap coordinates (centered on player)
        minimapX = (0.5 + relativeX) * MINIMAP_CONFIG.WIDTH;
        minimapY = (0.5 + relativeY) * MINIMAP_CONFIG.HEIGHT;
        minimapRadius = (mission.radius / worldWidth) * MINIMAP_CONFIG.WIDTH * zoomLevel.factor;
    }

    // Draw mission area circle (golden, semi-transparent)
    minimapCtx.save();
    minimapCtx.strokeStyle = '#FFD700';
    minimapCtx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    minimapCtx.lineWidth = 2;
    minimapCtx.setLineDash([5, 3]); // Dashed line
    minimapCtx.beginPath();
    minimapCtx.arc(minimapX, minimapY, minimapRadius, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.stroke();
    minimapCtx.setLineDash([]); // Reset dash
    minimapCtx.restore();
}

/**
 * Cycle through zoom levels
 * Called by M keybind
 */
function cycleMinimapZoom() {
    if (!DEBUG_MINIMAP) return;

    currentZoom = (currentZoom + 1) % MINIMAP_CONFIG.ZOOM_LEVELS.length;
    const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];
    console.log(`[DEBUG MINIMAP] Zoom level: ${zoomLevel.name} (${zoomLevel.factor}x)`);
}

/**
 * Draw zoom level indicator on minimap
 */
function drawZoomIndicator() {
    if (!minimapCtx) return;

    const zoomLevel = MINIMAP_CONFIG.ZOOM_LEVELS[currentZoom];
    const text = `Zoom: ${zoomLevel.name}`;

    // Measure text to get proper width
    minimapCtx.font = 'bold 14px Arial';
    const textMetrics = minimapCtx.measureText(text);
    const textWidth = textMetrics.width;

    // Draw semi-transparent background with padding
    const padding = 8;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 24;

    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    minimapCtx.fillRect(5, 5, boxWidth, boxHeight);

    // Draw border
    minimapCtx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(5, 5, boxWidth, boxHeight);

    // Draw zoom level text with shadow for better readability
    minimapCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    minimapCtx.shadowBlur = 2;
    minimapCtx.shadowOffsetX = 1;
    minimapCtx.shadowOffsetY = 1;

    minimapCtx.fillStyle = '#FFD700';
    minimapCtx.font = 'bold 14px Arial';
    minimapCtx.textAlign = 'left';
    minimapCtx.textBaseline = 'middle';
    minimapCtx.fillText(text, 5 + padding, 5 + boxHeight / 2);

    // Reset shadow
    minimapCtx.shadowColor = 'transparent';
    minimapCtx.shadowBlur = 0;
    minimapCtx.shadowOffsetX = 0;
    minimapCtx.shadowOffsetY = 0;
}

// Initialize minimap when DOM is ready
if (DEBUG_MINIMAP) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMinimap);
    } else {
        initMinimap();
    }
}
