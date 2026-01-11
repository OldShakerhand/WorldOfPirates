/**
 * Simple Map Processor - Color-based land detection
 *
 * For clean maps with gray land and blue water
 */

const sharp = require('sharp');
const fs = require('fs');

// Configuration
const SHALLOW_WATER_DISTANCE = 5; // Pixels of shallow water around land (increased from 2)

async function processMap(inputPath, outputPath) {
    console.log(`Reading: ${inputPath}`);

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log(`Size: ${metadata.width}x${metadata.height}`);

    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    // Detect land (gray pixels)
    console.log('Detecting land (gray) vs water (blue)...');
    const landMask = [];
    for (let y = 0; y < height; y++) {
        landMask[y] = [];
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Gray: R ≈ G ≈ B
            // Blue: B >> R and B >> G
            const isGray = Math.abs(r - g) < 40 && Math.abs(g - b) < 40;
            const isBlue = b > r + 30 && b > g + 30;

            landMask[y][x] = isGray && !isBlue;
        }
    }

    // Count land
    let landCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (landMask[y][x]) landCount++;
        }
    }
    console.log(`Land: ${landCount} pixels (${(landCount / (width * height) * 100).toFixed(1)}%)`);

    // Generate shallow water
    console.log(`Generating shallow water (${SHALLOW_WATER_DISTANCE} pixel buffer)...`);
    const terrain = [];
    for (let y = 0; y < height; y++) {
        terrain[y] = new Array(width).fill(0); // WATER
    }

    // Set land
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (landMask[y][x]) terrain[y][x] = 2; // LAND
        }
    }

    // Generate shallow water
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (terrain[y][x] === 0) {
                let minDist = Infinity;

                for (let dy = -SHALLOW_WATER_DISTANCE; dy <= SHALLOW_WATER_DISTANCE; dy++) {
                    for (let dx = -SHALLOW_WATER_DISTANCE; dx <= SHALLOW_WATER_DISTANCE; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (ny >= 0 && ny < height && nx >= 0 && nx < width && landMask[ny][nx]) {
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            minDist = Math.min(minDist, dist);
                        }
                    }
                }

                if (minDist <= SHALLOW_WATER_DISTANCE) terrain[y][x] = 1; // SHALLOW
            }
        }
    }

    // Count terrain
    let waterCount = 0, shallowCount = 0;
    landCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (terrain[y][x] === 0) waterCount++;
            else if (terrain[y][x] === 1) shallowCount++;
            else landCount++;
        }
    }

    const total = width * height;
    console.log(`\nTerrain:`);
    console.log(`  WATER:   ${waterCount} (${(waterCount / total * 100).toFixed(1)}%)`);
    console.log(`  SHALLOW: ${shallowCount} (${(shallowCount / total * 100).toFixed(1)}%)`);
    console.log(`  LAND:    ${landCount} (${(landCount / total * 100).toFixed(1)}%)`);

    // Convert to image
    const buffer = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const t = terrain[y][x];

            if (t === 0) {
                // WATER = black
                buffer[idx] = 0;
                buffer[idx + 1] = 0;
                buffer[idx + 2] = 0;
            } else if (t === 1) {
                // SHALLOW = cyan
                buffer[idx] = 0;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
            } else {
                // LAND = white
                buffer[idx] = 255;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
            }
            buffer[idx + 3] = 255; // Alpha
        }
    }

    console.log(`\nSaving: ${outputPath}`);
    await sharp(buffer, {
        raw: { width, height, channels: 4 }
    }).png().toFile(outputPath);

    console.log('✓ Done!');
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node process_map_simple.js <input> <output> [shallow-buffer]');
    process.exit(1);
}

processMap(args[0], args[1], parseInt(args[2]) || 2).catch(console.error);
