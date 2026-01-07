const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

/**
 * DESIGN CONTRACT: Map Conversion
 * - One pixel in PNG = one tile in output
 * - Terrain classification is deterministic (same input → same output)
 * - No anti-aliasing or alpha channel
 * - Solid colors only
 * - Red channel (or grayscale) determines terrain type
 */

// Terrain types (must match server-side constants)
const TERRAIN = {
    WATER: 0,
    SHALLOW: 1,
    LAND: 2
};

/**
 * Classify pixel value to terrain type
 * @param {number} value - Pixel red channel or grayscale value (0-255)
 * @returns {number} TERRAIN enum value
 */
function classifyTerrain(value) {
    if (value < 50) return TERRAIN.WATER;      // Dark = deep water
    if (value < 200) return TERRAIN.SHALLOW;   // Medium = shallow water
    return TERRAIN.LAND;                        // Light = land
}

/**
 * Convert PNG map mask to tilemap JSON
 * @param {string} inputPath - Path to PNG file
 * @param {string} outputPath - Path to output JSON file
 * @param {number} tileSize - Pixels per tile (for world coordinate conversion)
 */
function convertMapToTilemap(inputPath, outputPath, tileSize = 10) {
    console.log(`Converting ${inputPath} to tilemap...`);
    console.log(`Tile size: ${tileSize}px`);

    // Load PNG
    const data = fs.readFileSync(inputPath);
    const png = PNG.sync.read(data);

    const width = png.width;
    const height = png.height;

    console.log(`Image dimensions: ${width}x${height}`);

    // Validate image
    if (png.color === true && png.alpha === true) {
        console.warn('WARNING: Image has alpha channel. Alpha will be ignored.');
    }

    // Convert pixels to tiles
    const tiles = [];
    const stats = { water: 0, shallow: 0, land: 0 };

    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2; // 4 bytes per pixel (RGBA)
            const r = png.data[idx];
            const g = png.data[idx + 1];
            const b = png.data[idx + 2];

            // Use red channel (or average for grayscale)
            const value = r; // Could also use: (r + g + b) / 3 for grayscale

            const terrain = classifyTerrain(value);
            row.push(terrain);

            // Update statistics
            if (terrain === TERRAIN.WATER) stats.water++;
            else if (terrain === TERRAIN.SHALLOW) stats.shallow++;
            else if (terrain === TERRAIN.LAND) stats.land++;
        }
        tiles.push(row);

        // Progress indicator
        if ((y + 1) % 10 === 0 || y === height - 1) {
            process.stdout.write(`\rProcessing row ${y + 1}/${height}...`);
        }
    }
    console.log('\n');

    // Create tilemap object
    const tilemap = {
        width,
        height,
        tileSize,
        tiles
    };

    // Write to JSON
    fs.writeFileSync(outputPath, JSON.stringify(tilemap, null, 2));

    // Print statistics
    const totalTiles = width * height;
    console.log('Conversion complete!');
    console.log(`Output: ${outputPath}`);
    console.log('\nTerrain Statistics:');
    console.log(`  Water:   ${stats.water.toLocaleString()} tiles (${(stats.water / totalTiles * 100).toFixed(1)}%)`);
    console.log(`  Shallow: ${stats.shallow.toLocaleString()} tiles (${(stats.shallow / totalTiles * 100).toFixed(1)}%)`);
    console.log(`  Land:    ${stats.land.toLocaleString()} tiles (${(stats.land / totalTiles * 100).toFixed(1)}%)`);
    console.log(`  Total:   ${totalTiles.toLocaleString()} tiles`);
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: node convert_map.js <input.png> <output.json> [tileSize]');
        console.log('');
        console.log('Example: node convert_map.js assets/map_mask.png assets/world_map.json 10');
        console.log('');
        console.log('Terrain classification (red channel):');
        console.log('  value < 50   → WATER (0)');
        console.log('  value < 200  → SHALLOW (1)');
        console.log('  else         → LAND (2)');
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1];
    const tileSize = args[2] ? parseInt(args[2], 10) : 10;

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    if (isNaN(tileSize) || tileSize <= 0) {
        console.error(`Error: Invalid tile size: ${args[2]}`);
        process.exit(1);
    }

    try {
        convertMapToTilemap(inputPath, outputPath, tileSize);
    } catch (error) {
        console.error('Error during conversion:', error.message);
        process.exit(1);
    }
}

module.exports = { convertMapToTilemap, classifyTerrain, TERRAIN };
