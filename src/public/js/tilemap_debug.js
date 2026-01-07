/**
 * DEBUG ONLY: Draw tilemap as colored rectangles
 * This is TEMPORARY visualization - NOT a gameplay feature
 * Server remains 100% authoritative, this is informational only
 * 
 * @param {Object} tilemap - Tilemap data {width, height, tileSize, tiles}
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function drawTilemapDebug(tilemap, ctx, canvas) {
    const TERRAIN = {
        WATER: 0,
        SHALLOW: 1,
        LAND: 2
    };

    const TILE_COLORS = {
        [TERRAIN.WATER]: '#1a5490',      // Dark blue (water)
        [TERRAIN.SHALLOW]: '#5dade2',    // Cyan/light blue (shallow)
        [TERRAIN.LAND]: '#8B4513'        // Brown (land)
    };

    const tileSize = tilemap.tileSize;

    // Get current transform to calculate visible area
    const transform = ctx.getTransform();

    // Calculate visible tile range based on camera position
    // Note: transform.e and transform.f are the translation values
    const startTileX = Math.max(0, Math.floor(-transform.e / tileSize));
    const endTileX = Math.min(tilemap.width, Math.ceil((canvas.width - transform.e) / tileSize));
    const startTileY = Math.max(0, Math.floor(-transform.f / tileSize));
    const endTileY = Math.min(tilemap.height, Math.ceil((canvas.height - transform.f) / tileSize));

    // Draw tiles as simple rectangles
    for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
            const terrain = tilemap.tiles[y][x];
            const color = TILE_COLORS[terrain];

            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
}
