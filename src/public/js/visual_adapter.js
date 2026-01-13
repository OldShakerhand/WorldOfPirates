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
            this.renderShallowWaterGradients(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight);
        }

        // Render coastlines (Phase 2)
        if (this.showCoastlines) {
            this.renderCoastlines(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight);
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
                    tileSize,
                    tileSize
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
        const radius = tileSize * 0.5;  // 50% of tile size for visible silhouette change

        // Calculate visible tile range
        const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
        const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.ceil((cameraX + viewportWidth) / tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.ceil((cameraY + viewportHeight) / tileSize));

        // Helper: Check if tile is land
        const isLand = (x, y) => this.getTerrain(tilemap, x, y) === this.TERRAIN.LAND;

        // Helper: Check if tile is water or shallow
        const isWater = (x, y) => {
            const terrain = this.getTerrain(tilemap, x, y);
            return terrain === this.TERRAIN.WATER || terrain === this.TERRAIN.SHALLOW;
        };

        // Use normal drawing to paint water over land
        ctx.globalCompositeOperation = 'source-over';

        // Check each visible tile
        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const terrain = this.getTerrain(tilemap, tileX, tileY);
                let overlayColor = null;
                let isSurroundingType = null;

                // Case 1: LAND surrounded by WATER/SHALLOW -> Paint SHALLOW
                if (terrain === this.TERRAIN.LAND) {
                    overlayColor = this.colors.SHALLOW;
                    isSurroundingType = (tx, ty) => {
                        const t = this.getTerrain(tilemap, tx, ty);
                        return t === this.TERRAIN.WATER || t === this.TERRAIN.SHALLOW;
                    };
                }
                // Case 2: SHALLOW surrounded by DEEP WATER -> Paint DEEP WATER
                else if (terrain === this.TERRAIN.SHALLOW) {
                    overlayColor = this.colors.WATER;
                    isSurroundingType = (tx, ty) => {
                        const t = this.getTerrain(tilemap, tx, ty);
                        return t === this.TERRAIN.WATER;
                    };
                }
                // Skip if not a target tile type
                else {
                    continue;
                }

                // Set color
                ctx.fillStyle = overlayColor;

                const worldX = tileX * tileSize;
                const worldY = tileY * tileSize;

                // Get neighbors using the correct predicate
                const north = isSurroundingType(tileX, tileY - 1);
                const south = isSurroundingType(tileX, tileY + 1);
                const east = isSurroundingType(tileX + 1, tileY);
                const west = isSurroundingType(tileX - 1, tileY);

                const nw = isSurroundingType(tileX - 1, tileY - 1);
                const ne = isSurroundingType(tileX + 1, tileY - 1);
                const sw = isSurroundingType(tileX - 1, tileY + 1);
                const se = isSurroundingType(tileX + 1, tileY + 1);

                // NW Outer Corner (Top-Left)
                if (north && west && nw) {
                    ctx.beginPath();
                    ctx.moveTo(worldX, worldY + radius);      // Left edge
                    ctx.lineTo(worldX, worldY);               // Corner
                    ctx.lineTo(worldX + radius, worldY);      // Top edge
                    ctx.arc(worldX + radius, worldY + radius, radius, -Math.PI / 2, -Math.PI, true);
                    ctx.closePath();
                    ctx.fill();
                }

                // NE Outer Corner (Top-Right)
                if (north && east && ne) {
                    ctx.beginPath();
                    ctx.moveTo(worldX + tileSize - radius, worldY); // Top edge
                    ctx.lineTo(worldX + tileSize, worldY);          // Corner
                    ctx.lineTo(worldX + tileSize, worldY + radius); // Right edge
                    ctx.arc(worldX + tileSize - radius, worldY + radius, radius, 0, -Math.PI / 2, true);
                    ctx.closePath();
                    ctx.fill();
                }

                // SW Outer Corner (Bottom-Left)
                if (south && west && sw) {
                    ctx.beginPath();
                    ctx.moveTo(worldX, worldY + tileSize - radius); // Left edge
                    ctx.lineTo(worldX, worldY + tileSize);          // Corner
                    ctx.lineTo(worldX + radius, worldY + tileSize); // Bottom edge
                    ctx.arc(worldX + radius, worldY + tileSize - radius, radius, Math.PI / 2, Math.PI, false);
                    ctx.closePath();
                    ctx.fill();
                }

                // SE Outer Corner (Bottom-Right)
                if (south && east && se) {
                    ctx.beginPath();
                    ctx.moveTo(worldX + tileSize - radius, worldY + tileSize); // Bottom edge
                    ctx.lineTo(worldX + tileSize, worldY + tileSize);          // Corner
                    ctx.lineTo(worldX + tileSize, worldY + tileSize - radius); // Right edge
                    ctx.arc(worldX + tileSize - radius, worldY + tileSize - radius, radius, 0, Math.PI / 2, false);
                    ctx.closePath();
                    ctx.fill();
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
