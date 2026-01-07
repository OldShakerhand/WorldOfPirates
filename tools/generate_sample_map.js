const fs = require('fs');
const PNG = require('pngjs').PNG;

/**
 * Generate a simple test map for World of Pirates
 * Creates a 100x100 map with:
 * - Water (deep) in most areas
 * - Land islands
 * - Shallow water around islands
 */

const WIDTH = 100;
const HEIGHT = 100;

// Create PNG
const png = new PNG({ width: WIDTH, height: HEIGHT });

// Terrain values (grayscale)
const WATER_VALUE = 0;      // Black
const SHALLOW_VALUE = 128;  // Gray
const LAND_VALUE = 255;     // White

// Helper: Set pixel value (grayscale)
function setPixel(x, y, value) {
    const idx = (WIDTH * y + x) << 2;
    png.data[idx] = value;     // R
    png.data[idx + 1] = value; // G
    png.data[idx + 2] = value; // B
    png.data[idx + 3] = 255;   // A (fully opaque)
}

// Helper: Check distance from point
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Fill with water by default
for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        setPixel(x, y, WATER_VALUE);
    }
}

// Define islands (x, y, radius)
const islands = [
    { x: 20, y: 20, radius: 6 },
    { x: 80, y: 20, radius: 8 },
    { x: 20, y: 80, radius: 7 },
    { x: 80, y: 80, radius: 9 },
    { x: 50, y: 50, radius: 10 },
    { x: 30, y: 60, radius: 5 },
    { x: 70, y: 40, radius: 6 }
];

// Draw islands with shallow water
for (const island of islands) {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const dist = distance(x, y, island.x, island.y);

            if (dist < island.radius) {
                // Land (island core)
                setPixel(x, y, LAND_VALUE);
            } else if (dist < island.radius + 3) {
                // Shallow water (around island)
                setPixel(x, y, SHALLOW_VALUE);
            }
        }
    }
}

// Write PNG
const buffer = PNG.sync.write(png);
fs.writeFileSync('src/server/assets/map_mask.png', buffer);

console.log('Generated src/server/assets/map_mask.png');
console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);
console.log(`Islands: ${islands.length}`);
console.log('');
console.log('Next steps:');
console.log('1. node tools/convert_map.js src/server/assets/map_mask.png src/server/assets/world_map.json 10');
console.log('2. Restart server');
