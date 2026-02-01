/**
 * Harbor Visualization Tool
 * 
 * Generates high-resolution PNG images of the world map with harbor markers.
 * Used to visualize harbor distribution before/after position corrections.
 * 
 * Usage:
 *   node tools/visualize_harbors.js [--output filename.png]
 * 
 * Output:
 *   tools/output/harbors_current.png (default)
 *   or specified filename
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Configuration
const CONFIG = {
    SCALE: 2,  // 2 pixels per tile (3230×1702 → 6460×3404 image)
    COLORS: {
        WATER: '#1a4d7a',      // Dark blue
        SHALLOW: '#5dade2',    // Cyan
        LAND: '#654321',       // Brown
        HARBOR: '#FFD700'      // Yellow/Gold
    },
    HARBOR_RADIUS: 8,  // Radius of harbor marker circles (in pixels)
    TILE_SIZE: 25      // World tile size (for coordinate conversion)
};

/**
 * Load JSON file
 */
function loadJSON(filepath) {
    const fullPath = path.join(__dirname, '..', filepath);
    console.log(`Loading ${filepath}...`);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✓ Loaded ${filepath}`);
    return data;
}

/**
 * Render world map with harbor markers
 */
function renderMap(tilemap, harbors) {
    const width = tilemap.width * CONFIG.SCALE;
    const height = tilemap.height * CONFIG.SCALE;

    console.log(`\nCreating canvas: ${width}×${height} pixels`);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw terrain
    console.log('Rendering terrain...');
    for (let tileY = 0; tileY < tilemap.height; tileY++) {
        if (tileY % 200 === 0) {
            console.log(`  Progress: ${Math.round(tileY / tilemap.height * 100)}%`);
        }

        for (let tileX = 0; tileX < tilemap.width; tileX++) {
            const terrainType = tilemap.tiles[tileY][tileX];

            // Get color for terrain type
            let color;
            switch (terrainType) {
                case 0: color = CONFIG.COLORS.WATER; break;
                case 1: color = CONFIG.COLORS.SHALLOW; break;
                case 2: color = CONFIG.COLORS.LAND; break;
                default: color = '#000000';
            }

            // Draw scaled pixel
            ctx.fillStyle = color;
            ctx.fillRect(
                tileX * CONFIG.SCALE,
                tileY * CONFIG.SCALE,
                CONFIG.SCALE,
                CONFIG.SCALE
            );
        }
    }
    console.log('✓ Terrain rendered');

    // Draw harbor markers
    console.log(`\nDrawing ${harbors.length} harbor markers...`);
    ctx.fillStyle = CONFIG.COLORS.HARBOR;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    harbors.forEach((harbor, index) => {
        // Convert tile coordinates to pixel coordinates
        const pixelX = harbor.tileX * CONFIG.SCALE;
        const pixelY = harbor.tileY * CONFIG.SCALE;

        // Draw circle
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, CONFIG.HARBOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if ((index + 1) % 50 === 0) {
            console.log(`  Progress: ${index + 1}/${harbors.length}`);
        }
    });
    console.log(`✓ Drew ${harbors.length} harbors`);

    return canvas;
}

/**
 * Save canvas to PNG file
 */
function savePNG(canvas, outputPath) {
    const fullPath = path.join(__dirname, outputPath);
    const dir = path.dirname(fullPath);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`\nSaving to ${outputPath}...`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(fullPath, buffer);
    console.log(`✓ Saved: ${fullPath}`);
    console.log(`  File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Main execution
 */
function main() {
    console.log('=== Harbor Visualization Tool ===\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex !== -1 && args[outputIndex + 1]
        ? args[outputIndex + 1]
        : 'output/harbors_current.png';

    try {
        // Load data
        const tilemap = loadJSON('src/public/assets/world_map.json');
        const harbors = loadJSON('src/server/assets/harbors.json');

        console.log(`\nMap dimensions: ${tilemap.width}×${tilemap.height} tiles`);
        console.log(`Harbor count: ${harbors.length}`);

        // Render map
        const canvas = renderMap(tilemap, harbors);

        // Save PNG
        savePNG(canvas, outputFile);

        console.log('\n✅ Visualization complete!');
        console.log(`\nOutput: ${path.join(__dirname, outputFile)}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { renderMap, savePNG };
