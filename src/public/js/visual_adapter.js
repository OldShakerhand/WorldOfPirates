/**
 * Visual Adapter Layer
 * 
 * Client-side visual enhancements for world rendering.
 * Provides coastline rendering and visual transitions without affecting gameplay.
 * 
 * IMPORTANT:
 * - This is PURELY VISUAL - does not affect collision, physics, or server logic
 * - Tilemap remains the single source of truth for gameplay
 * - Easy to disable with ENABLE_VISUAL_ADAPTER flag
 */

const VisualAdapter = {
    // Configuration
    enabled: true,  // Master toggle
    showCoastlines: true,  // Phase 2 feature - now enabled!
    showShallowGradients: true,  // Phase 3 feature - visual enhancements

    // Terrain colors (matching current debug rendering)
    colors: {
        WATER: '#1a4d7a',      // Deep water (dark blue)
        SHALLOW: '#5dade2',    // Shallow water (cyan)
        LAND: '#654321'        // Land (brown)
    },

    // Terrain type constants
    TERRAIN: {
        WATER: 0,
        SHALLOW: 1,
        LAND: 2
    },

    /**
     * Main render function - called from game.js render loop
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} tilemap - World tilemap data
     * @param {number} cameraX - Camera X position (world coordinates)
     * @param {number} cameraY - Camera Y position (world coordinates)
     * @param {number} viewportWidth - Viewport width in pixels
     * @param {number} viewportHeight - Viewport height in pixels
     */
    render(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight) {
        if (!this.enabled || !tilemap) return;

        // Render base terrain (always on)
        this.renderBaseTerrain(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight);

        // Render shallow water gradients (Phase 3)
        if (this.showShallowGradients) {
            // this.renderShallowWaterGradients(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight); // Disabled: Removed "light blue frames"
        }

        // Render coastlines (Phase 2)
        if (this.showCoastlines) {
            // this.renderCoastlines(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight); // Disabled: Breaks rounded illusion
            // Render corner overlays for curved illusion
            this.renderCornerOverlays(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight);
        }
    },

    /**
     * Render base terrain tiles
     * Only renders tiles visible in the current viewport for performance
     */
    renderBaseTerrain(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight) {
        const tileSize = tilemap.tileSize || 25;

        // Calculate visible tile range (viewport culling)
        const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
        const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.ceil((cameraX + viewportWidth) / tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.ceil((cameraY + viewportHeight) / tileSize));

        // Render only visible tiles
        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const terrainType = tilemap.tiles[tileY][tileX];

                // Get color for terrain type
                let color;
                switch (terrainType) {
                    case this.TERRAIN.WATER:
                        color = this.colors.WATER;
                        break;
                    case this.TERRAIN.SHALLOW:
                        color = this.colors.SHALLOW;
                        break;
                    case this.TERRAIN.LAND:
                        color = this.colors.LAND;
                        break;
                    default:
                        color = '#000000';  // Fallback for unknown terrain
                }

                // Draw tile
                ctx.fillStyle = color;
                ctx.fillRect(
                    tileX * tileSize,
                    tileY * tileSize,
                    tileSize + 1, // Overlap to prevent sub-pixel seams
                    tileSize + 1
                );
            }
        }
    },

    /**
     * Render shallow water with gradient effect
     * Creates visual transition between deep water and land
     */
    renderShallowWaterGradients(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight) {
        const tileSize = tilemap.tileSize || 25;

        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
        const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.ceil((cameraX + viewportWidth) / tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.ceil((cameraY + viewportHeight) / tileSize));

        // Check each visible tile
        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const terrain = this.getTerrain(tilemap, tileX, tileY);

                // Only enhance shallow water tiles
                if (terrain !== this.TERRAIN.SHALLOW) continue;

                const worldX = tileX * tileSize;
                const worldY = tileY * tileSize;

                // Check if this shallow water is near land (creates lighter accent)
                const hasLandNeighbor =
                    this.getTerrain(tilemap, tileX, tileY - 1) === this.TERRAIN.LAND ||
                    this.getTerrain(tilemap, tileX, tileY + 1) === this.TERRAIN.LAND ||
                    this.getTerrain(tilemap, tileX + 1, tileY) === this.TERRAIN.LAND ||
                    this.getTerrain(tilemap, tileX - 1, tileY) === this.TERRAIN.LAND;

                if (hasLandNeighbor) {
                    // Add lighter overlay to shallow water near land
                    ctx.fillStyle = 'rgba(147, 197, 253, 0.15)';  // Light blue overlay
                    ctx.fillRect(worldX, worldY, tileSize, tileSize);
                }
            }
        }
    },

    /**
     * Get terrain type at specific tile coordinates
     * Returns null if out of bounds
     */
    getTerrain(tilemap, tileX, tileY) {
        if (tileX < 0 || tileX >= tilemap.width || tileY < 0 || tileY >= tilemap.height) {
            return null;
        }
        return tilemap.tiles[tileY][tileX];
    },

    /**
     * Check if a tile has a water/shallow neighbor in a specific direction
     * Used for coastline detection
     */
    hasWaterNeighbor(tilemap, tileX, tileY, direction) {
        let neighborX = tileX;
        let neighborY = tileY;

        switch (direction) {
            case 'north': neighborY--; break;
            case 'south': neighborY++; break;
            case 'east': neighborX++; break;
            case 'west': neighborX--; break;
        }

        const neighborTerrain = this.getTerrain(tilemap, neighborX, neighborY);
        return neighborTerrain === this.TERRAIN.WATER || neighborTerrain === this.TERRAIN.SHALLOW;
    },

    /**
     * Render coastline borders
     * Draws lines where land meets water/shallow
     */
    renderCoastlines(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight) {
        const tileSize = tilemap.tileSize || 25;

        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
        const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.ceil((cameraX + viewportWidth) / tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.ceil((cameraY + viewportHeight) / tileSize));

        // Coastline style
        ctx.strokeStyle = this.colors.SHALLOW;  // Match corner overlay color
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';

        // Check each visible tile
        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const terrain = this.getTerrain(tilemap, tileX, tileY);

                // Only draw coastlines for land tiles
                if (terrain !== this.TERRAIN.LAND) continue;

                const worldX = tileX * tileSize;
                const worldY = tileY * tileSize;

                // Check each direction and draw border if water is adjacent
                if (this.hasWaterNeighbor(tilemap, tileX, tileY, 'north')) {
                    ctx.beginPath();
                    ctx.moveTo(worldX, worldY);
                    ctx.lineTo(worldX + tileSize, worldY);
                    ctx.stroke();
                }

                if (this.hasWaterNeighbor(tilemap, tileX, tileY, 'south')) {
                    ctx.beginPath();
                    ctx.moveTo(worldX, worldY + tileSize);
                    ctx.lineTo(worldX + tileSize, worldY + tileSize);
                    ctx.stroke();
                }

                if (this.hasWaterNeighbor(tilemap, tileX, tileY, 'east')) {
                    ctx.beginPath();
                    ctx.moveTo(worldX + tileSize, worldY);
                    ctx.lineTo(worldX + tileSize, worldY + tileSize);
                    ctx.stroke();
                }

                if (this.hasWaterNeighbor(tilemap, tileX, tileY, 'west')) {
                    ctx.beginPath();
                    ctx.moveTo(worldX, worldY);
                    ctx.lineTo(worldX, worldY + tileSize);
                    ctx.stroke();
                }
            }
        }
    },

    /**
     * Render corner overlays to create illusion of curved coastlines
     * Detects land tiles with water on TWO ADJACENT sides and rounds the outer corner
     */
    renderCornerOverlays(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight) {
        const tileSize = tilemap.tileSize || 25;
        const radius = tileSize * 0.5;

        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
        const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.ceil((cameraX + viewportWidth) / tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.ceil((cameraY + viewportHeight) / tileSize));

        // Use normal drawing to paint over corners
        ctx.globalCompositeOperation = 'source-over';

        // Pre-allocate helper closure to get terrain safely
        const getT = (tx, ty) => {
            if (tx < 0 || tx >= tilemap.width || ty < 0 || ty >= tilemap.height) return null;
            return tilemap.tiles[ty][tx];
        };

        // Drawing helpers for the 4 corners
        // Added stroke to seal pixel gaps (seams)
        const drawNW = (wx, wy) => {
            ctx.beginPath();
            ctx.moveTo(wx, wy + radius);
            ctx.lineTo(wx, wy); // Corner
            ctx.lineTo(wx + radius, wy);
            ctx.arc(wx + radius, wy + radius, radius, -Math.PI / 2, -Math.PI, true);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
        };
        const drawNE = (wx, wy) => {
            ctx.beginPath();
            ctx.moveTo(wx + tileSize - radius, wy);
            ctx.lineTo(wx + tileSize, wy); // Corner
            ctx.lineTo(wx + tileSize, wy + radius);
            ctx.arc(wx + tileSize - radius, wy + radius, radius, 0, -Math.PI / 2, true);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
        };
        const drawSW = (wx, wy) => {
            ctx.beginPath();
            ctx.moveTo(wx, wy + tileSize - radius);
            ctx.lineTo(wx, wy + tileSize); // Corner
            ctx.lineTo(wx + radius, wy + tileSize);
            ctx.arc(wx + radius, wy + tileSize - radius, radius, Math.PI / 2, Math.PI, false);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
        };
        const drawSE = (wx, wy) => {
            ctx.beginPath();
            ctx.moveTo(wx + tileSize - radius, wy + tileSize);
            ctx.lineTo(wx + tileSize, wy + tileSize); // Corner
            ctx.lineTo(wx + tileSize, wy + tileSize - radius);
            ctx.arc(wx + tileSize - radius, wy + tileSize - radius, radius, 0, Math.PI / 2, false);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const terrain = tilemap.tiles[tileY][tileX];

                // Cache neighbors
                const n = getT(tileX, tileY - 1);
                const s = getT(tileX, tileY + 1);
                const e = getT(tileX + 1, tileY);
                const w = getT(tileX - 1, tileY);
                const nw = getT(tileX - 1, tileY - 1);
                const ne = getT(tileX + 1, tileY - 1);
                const sw = getT(tileX - 1, tileY + 1);
                const se = getT(tileX + 1, tileY + 1);

                const worldX = tileX * tileSize;
                const worldY = tileY * tileSize;

                // --- CASE 1: LAND TILE (Round against Water) ---
                if (terrain === this.TERRAIN.LAND) {
                    ctx.fillStyle = this.colors.SHALLOW; // Paint with Shallow Water
                    const isWater = t => t === this.TERRAIN.WATER || t === this.TERRAIN.SHALLOW;

                    if (isWater(n) && isWater(w) && isWater(nw)) drawNW(worldX, worldY);
                    if (isWater(n) && isWater(e) && isWater(ne)) drawNE(worldX, worldY);
                    if (isWater(s) && isWater(w) && isWater(sw)) drawSW(worldX, worldY);
                    if (isWater(s) && isWater(e) && isWater(se)) drawSE(worldX, worldY);
                }

                // --- CASE 2 & 3: SHALLOW WATER TILE ---
                else if (terrain === this.TERRAIN.SHALLOW) {

                    // Sub-case A: Round against Deep Water (Convex Shallow)
                    // Check if corner is surrounded by Deep Water
                    ctx.fillStyle = this.colors.WATER; // Paint with Deep Water
                    const isDeep = t => t === this.TERRAIN.WATER;

                    if (isDeep(n) && isDeep(w) && isDeep(nw)) drawNW(worldX, worldY);
                    if (isDeep(n) && isDeep(e) && isDeep(ne)) drawNE(worldX, worldY);
                    if (isDeep(s) && isDeep(w) && isDeep(sw)) drawSW(worldX, worldY);
                    if (isDeep(s) && isDeep(e) && isDeep(se)) drawSE(worldX, worldY);

                    // Sub-case B: Round against Land (Inner Land Corner)
                    // Check if neighbor is Land (Concave/Inner Coastline)
                    ctx.fillStyle = this.colors.LAND; // Paint with Land
                    const isLand = t => t === this.TERRAIN.LAND;

                    if (isLand(n) && isLand(w) && isLand(nw)) drawNW(worldX, worldY);
                    if (isLand(n) && isLand(e) && isLand(ne)) drawNE(worldX, worldY);
                    if (isLand(s) && isLand(w) && isLand(sw)) drawSW(worldX, worldY);
                    if (isLand(s) && isLand(e) && isLand(se)) drawSE(worldX, worldY);
                }

                // --- CASE 4: DEEP WATER TILE (Inner Shallow Corner) ---
                else if (terrain === this.TERRAIN.WATER) {
                    // Check if neighbor is Shallow (Concave/Inner Shallow)
                    ctx.fillStyle = this.colors.SHALLOW; // Paint with Shallow Water
                    const isShallow = t => t === this.TERRAIN.SHALLOW;

                    if (isShallow(n) && isShallow(w) && isShallow(nw)) drawNW(worldX, worldY);
                    if (isShallow(n) && isShallow(e) && isShallow(ne)) drawNE(worldX, worldY);
                    if (isShallow(s) && isShallow(w) && isShallow(sw)) drawSW(worldX, worldY);
                    if (isShallow(s) && isShallow(e) && isShallow(se)) drawSE(worldX, worldY);
                }
            }
        }

        // Reset composite operation to normal
        ctx.globalCompositeOperation = 'source-over';
    },

    /**
     * Toggle visual adapter on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        console.log(`[Visual Adapter] ${this.enabled ? 'Enabled' : 'Disabled'}`);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.VisualAdapter = VisualAdapter;
}
