/**
 * Automatic World Map Processor (Node.js)
 * 
 * Processes a Caribbean map image to generate a clean tilemap with automatic shallow water.
 * 
 * Requirements:
 *   npm install sharp
 * 
 * Usage:
 *   node tools/process_map_node.js <input_image> <output_png> [options]
 * 
 * Options:
 *   --tile-size <number>       Tile size in pixels (default: 25)
 *   --land-threshold <number>  Brightness threshold for land (0-255, default: 128)
 *   --shallow-buffer <number>  Shallow water buffer in tiles (default: 2)
 * 
 * Example:
 *   node tools/process_map_node.js images/Wop_mapcitynames.jpg assets/map_processed.png --tile-size 25
 * 
 * Output:
 *   Clean PNG with 3 colors:
 *   - Black (0, 0, 0) = WATER
 *   - Cyan (0, 255, 255) = SHALLOW (2-tile buffer around land)
 *   - White (255, 255, 255) = LAND
 */

const fs = require('fs');
const sharp = require('sharp');

/**
 * Clean map to binary land/water
 */
function cleanMap(imageData, width, height, landThreshold = 128) {
    const landMask = new Array(height);

    for (let y = 0; y < height; y++) {
        landMask[y] = new Array(width);

        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4; // RGBA

            // Convert to grayscale (average RGB)
            const gray = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;

            // Threshold: bright = land, dark = water
            landMask[y][x] = gray > landThreshold;
        }
    }

    return landMask;
}

/**
 * Generate shallow water as buffer around land
 */
function generateShallowWater(landMask, bufferTiles = 2) {
    const height = landMask.length;
    const width = landMask[0].length;
    const terrain = new Array(height);

    // Initialize terrain array
    for (let y = 0; y < height; y++) {
        terrain[y] = new Array(width).fill(0); // 0 = WATER
    }

    // Set land
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (landMask[y][x]) {
                terrain[y][x] = 2; // LAND
            }
        }
    }

    // Generate shallow water by checking distance to land
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (terrain[y][x] === 0) { // If water
                let minDist = Infinity;

                // Check within buffer range
                for (let dy = -bufferTiles; dy <= bufferTiles; dy++) {
                    for (let dx = -bufferTiles; dx <= bufferTiles; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (landMask[ny][nx]) {
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                minDist = Math.min(minDist, dist);
                            }
                        }
                    }
                }

                if (minDist <= bufferTiles) {
                    terrain[y][x] = 1; // SHALLOW
                }
            }
        }
    }

    return terrain;
}

/**
 * Convert terrain array to RGBA buffer
 */
function terrainToImage(terrain) {
    const height = terrain.length;
    const width = terrain[0].length;
    const buffer = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const t = terrain[y][x];

            if (t === 0) {
                // WATER = black (0, 0, 0)
                buffer[idx] = 0;
                buffer[idx + 1] = 0;
                buffer[idx + 2] = 0;
                buffer[idx + 3] = 255;
            } else if (t === 1) {
                // SHALLOW = cyan (0, 255, 255)
                buffer[idx] = 0;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
                buffer[idx + 3] = 255;
            } else {
                // LAND = white (255, 255, 255)
                buffer[idx] = 255;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
                buffer[idx + 3] = 255;
            }
        }
    }

    return { buffer, width, height };
}

/**
 * Process map image
 */
async function processMap(inputPath, outputPath, options = {}) {
    const tileSize = options.tileSize || 25;
    const landThreshold = options.landThreshold || 128;
    const shallowBuffer = options.shallowBuffer || 2;

    console.log(`Reading image: ${inputPath}`);

    // Read image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    console.log(`Image size: ${metadata.width}x${metadata.height}`);

    // Get raw pixel data
    const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Clean map (binary land/water)
    console.log(`Cleaning map (land threshold: ${landThreshold})...`);
    const landMask = cleanMap(data, info.width, info.height, landThreshold);

    // Count land pixels
    let landPixels = 0;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            if (landMask[y][x]) landPixels++;
        }
    }
    const totalPixels = info.width * info.height;
    console.log(`Land: ${landPixels} pixels (${(landPixels / totalPixels * 100).toFixed(1)}%)`);

    // Generate shallow water
    console.log(`Generating shallow water (${shallowBuffer} tile buffer)...`);
    const terrain = generateShallowWater(landMask, shallowBuffer);

    // Count terrain types
    let waterCount = 0, shallowCount = 0, landCount = 0;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const t = terrain[y][x];
            if (t === 0) waterCount++;
            else if (t === 1) shallowCount++;
            else landCount++;
        }
    }

    console.log(`\nTerrain distribution:`);
    console.log(`  WATER:   ${waterCount} pixels (${(waterCount / totalPixels * 100).toFixed(1)}%)`);
    console.log(`  SHALLOW: ${shallowCount} pixels (${(shallowCount / totalPixels * 100).toFixed(1)}%)`);
    console.log(`  LAND:    ${landCount} pixels (${(landCount / totalPixels * 100).toFixed(1)}%)`);

    // Convert to image
    console.log(`\nSaving to: ${outputPath}`);
    const { buffer, width, height } = terrainToImage(terrain);

    await sharp(buffer, {
        raw: {
            width: width,
            height: height,
            channels: 4
        }
    })
        .png()
        .toFile(outputPath);

    console.log(`✓ Saved ${outputPath}`);
    console.log(`\nNext step:`);
    console.log(`  node tools/convert_map.js ${outputPath} assets/world_map.json ${tileSize}`);
}

/**
 * Main
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node process_map_node.js <input> <output> [options]');
        console.error('Options:');
        console.error('  --tile-size <number>       Tile size (default: 25)');
        console.error('  --land-threshold <number>  Land threshold 0-255 (default: 128)');
        console.error('  --shallow-buffer <number>  Shallow buffer tiles (default: 2)');
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1];

    // Parse options
    const options = {};
    for (let i = 2; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = parseInt(args[i + 1]);

        if (key === 'tile-size') options.tileSize = value;
        else if (key === 'land-threshold') options.landThreshold = value;
        else if (key === 'shallow-buffer') options.shallowBuffer = value;
    }

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    try {
        await processMap(inputPath, outputPath, options);
    } catch (error) {
        console.error(`\nError: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { processMap };
