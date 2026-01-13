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
    showCoastlines: false,  // Phase 2 feature (not yet implemented)

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

        // Future: Coastline rendering will go here (Phase 2)
        // if (this.showCoastlines) {
        //     this.renderCoastlines(ctx, tilemap, cameraX, cameraY, viewportWidth, viewportHeight);
        // }
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
